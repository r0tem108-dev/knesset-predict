import "server-only";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import { ensureSeeded, DEFAULT_ELECTION_SLUG } from "./seedData";
import { Election } from "@/models/Election";
import { Party } from "@/models/Party";
import { Group } from "@/models/Group";
import { Participant } from "@/models/Participant";
import { Prediction } from "@/models/Prediction";
import { PredictionVersion } from "@/models/PredictionVersion";
import { OfficialResult } from "@/models/OfficialResult";
import { newGroupCode, newToken } from "./codes";
import { defaultQuestions } from "./questionTemplates";
import {
  serializeElection,
  serializeParty,
  serializeGroup,
  serializeParticipant,
  serializePrediction,
  mapToObj,
} from "./serialize";
import type {
  ElectionT,
  PartyT,
  GroupT,
  ParticipantT,
  PredictionT,
  ViewerT,
  LeaderRowT,
  ComparisonRowT,
  GroupForecastT,
} from "./types";
import {
  scoreParticipant,
  resolveAutoAnswer,
  type PartyLite,
  type QuestionLite,
  type ScoringConfig,
} from "./scoring";
import { getParticipantToken, getAdminToken } from "./session";

export class AppError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

async function ready() {
  await connectDB();
  await ensureSeeded();
}

const toPartyLites = (parties: PartyT[]): PartyLite[] =>
  parties.map((p) => ({
    key: p.key,
    name: p.name,
    nameHe: p.nameHe,
    color: p.color,
    bloc: p.bloc,
  }));

const toQuestionLites = (group: GroupT): QuestionLite[] =>
  group.questions.map((q) => ({
    qid: q.qid,
    type: q.type,
    text: q.text,
    textHe: q.textHe,
    points: q.points,
    autoResolve: q.autoResolve,
    kind: q.kind,
    enabled: q.enabled,
  }));

/* --------------------------------------------------------------- election -- */

export interface ElectionBundle {
  election: ElectionT;
  /** active lists only, ordered */
  parties: PartyT[];
  /** every list including withdrawn / disqualified (admin views) */
  allParties: PartyT[];
}

export async function getDefaultElection(): Promise<ElectionBundle> {
  await ready();
  const election = await Election.findOne({ slug: DEFAULT_ELECTION_SLUG }).lean();
  if (!election) throw new AppError("Default election not found", 500);
  const all = await Party.find({ electionId: election._id }).sort({ order: 1 }).lean();
  const allParties = all.map(serializeParty);
  return {
    election: serializeElection(election),
    parties: allParties.filter((p) => p.status === "active"),
    allParties,
  };
}

/* ------------------------------------------------------------------ group -- */

export interface CreateGroupInput {
  name: string;
  creatorName: string;
  password?: string;
  predictionDeadline?: string;
  revealPredictionsAfterLock?: boolean;
}

export interface CreateGroupResult {
  group: GroupT;
  adminToken: string;
  participantToken: string;
}

export async function createGroup(input: CreateGroupInput): Promise<CreateGroupResult> {
  await ready();
  const name = input.name?.trim();
  const creatorName = input.creatorName?.trim();
  if (!name) throw new AppError("Group name is required");
  if (!creatorName) throw new AppError("Your name is required");

  const { election } = await getDefaultElection();
  const deadline = input.predictionDeadline
    ? new Date(input.predictionDeadline)
    : new Date(new Date(election.electionDay).getTime() - 12 * 60 * 60 * 1000);
  if (Number.isNaN(deadline.getTime())) throw new AppError("Invalid prediction deadline");

  const adminToken = newToken();
  const participantToken = newToken();

  let group = null;
  for (let i = 0; i < 5 && !group; i++) {
    try {
      group = await Group.create({
        electionId: election.id,
        code: newGroupCode(),
        name,
        creatorName,
        passwordHash: input.password ? await bcrypt.hash(input.password, 10) : "",
        adminToken,
        predictionDeadline: deadline,
        settings: {
          revealPredictionsAfterLock: input.revealPredictionsAfterLock !== false,
        },
        questions: defaultQuestions(election.blocs),
      });
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) continue;
      throw err;
    }
  }
  if (!group) throw new AppError("Could not allocate a group code, try again", 500);

  const participant = await Participant.create({
    groupId: group._id,
    displayName: creatorName,
    token: participantToken,
    isAdmin: true,
  });
  await Prediction.create({ groupId: group._id, participantId: participant._id });

  return { group: serializeGroup(group.toObject()), adminToken, participantToken };
}

async function loadGroup(code: string) {
  await ready();
  const group = await Group.findOne({ code: code.toUpperCase().trim() });
  if (!group) throw new AppError("Group not found", 404);
  return group;
}

export async function getGroup(code: string): Promise<GroupT> {
  const group = await loadGroup(code);
  return serializeGroup(group.toObject());
}

/* ------------------------------------------------------------------- join -- */

export interface JoinResult {
  participant: ParticipantT;
  participantToken: string;
  alreadyMember: boolean;
}

export async function joinGroup(
  code: string,
  displayName: string,
  password?: string,
): Promise<JoinResult> {
  const group = await loadGroup(code);

  const existingToken = await getParticipantToken(group.code);
  if (existingToken) {
    const existing = await Participant.findOne({ groupId: group._id, token: existingToken });
    if (existing) {
      return {
        participant: serializeParticipant(existing.toObject()),
        participantToken: existingToken,
        alreadyMember: true,
      };
    }
  }

  if (group.passwordHash) {
    const ok = password ? await bcrypt.compare(password, group.passwordHash) : false;
    if (!ok) throw new AppError("Incorrect group password", 401);
  }

  const name = displayName?.trim();
  if (!name) throw new AppError("Display name is required");

  const clash = await Participant.findOne({ groupId: group._id, displayName: name });
  if (clash) throw new AppError("That display name is already taken in this group", 409);

  const token = newToken();
  const participant = await Participant.create({
    groupId: group._id,
    displayName: name,
    token,
    isAdmin: false,
  });
  await Prediction.create({ groupId: group._id, participantId: participant._id });

  return {
    participant: serializeParticipant(participant.toObject()),
    participantToken: token,
    alreadyMember: false,
  };
}

/* ----------------------------------------------------------------- viewer -- */

export async function getViewer(code: string): Promise<ViewerT> {
  const group = await loadGroup(code);
  const token = await getParticipantToken(group.code);
  const adminToken = await getAdminToken(group.code);
  const isAdmin = Boolean(adminToken) && adminToken === group.adminToken;

  let participant: ParticipantT | null = null;
  if (token) {
    const p = await Participant.findOne({ groupId: group._id, token });
    if (p) participant = serializeParticipant(p.toObject());
  }
  return { participant, isAdmin: isAdmin || Boolean(participant?.isAdmin) };
}

async function requireAdmin(code: string) {
  const group = await loadGroup(code);
  const adminToken = await getAdminToken(group.code);
  if (!adminToken || adminToken !== group.adminToken) {
    throw new AppError("Admin access required", 403);
  }
  return group;
}

async function requireParticipant(code: string) {
  const group = await loadGroup(code);
  const token = await getParticipantToken(group.code);
  if (!token) throw new AppError("Join the group first", 401);
  const participant = await Participant.findOne({ groupId: group._id, token });
  if (!participant) throw new AppError("Join the group first", 401);
  return { group, participant };
}

/* ------------------------------------------------------------- prediction -- */

export async function getMyPrediction(code: string): Promise<PredictionT | null> {
  const group = await loadGroup(code);
  const token = await getParticipantToken(group.code);
  if (!token) return null;
  const participant = await Participant.findOne({ groupId: group._id, token });
  if (!participant) return null;
  const pred = await Prediction.findOne({
    groupId: group._id,
    participantId: participant._id,
  }).lean();
  return serializePrediction(pred, String(participant._id));
}

export interface SavePredictionInput {
  seats: Record<string, number>;
  answers: Record<string, string | number | boolean>;
  confidencePick?: { partyKey: string; seats: number };
  wildAnswer?: string | number | boolean | null;
  submit: boolean;
}

export async function savePrediction(
  code: string,
  input: SavePredictionInput,
): Promise<PredictionT> {
  const { group, participant } = await requireParticipant(code);
  const gT = serializeGroup(group.toObject());
  if (gT.locked) throw new AppError("Predictions are locked for this group", 403);

  const { election, parties } = await getDefaultElection();
  const partyKeys = new Set(parties.map((p) => p.key));

  const seats: Record<string, number> = {};
  let total = 0;
  for (const [key, raw] of Object.entries(input.seats ?? {})) {
    if (!partyKeys.has(key)) continue;
    const v = Math.floor(Number(raw));
    if (Number.isNaN(v) || v < 0 || v > election.totalSeats) {
      throw new AppError(`Invalid seat value for ${key}`);
    }
    seats[key] = v;
    total += v;
  }

  if (input.submit && total !== election.totalSeats) {
    throw new AppError(
      `Seats must total exactly ${election.totalSeats} to submit (currently ${total})`,
    );
  }

  const answers: Record<string, string | number | boolean> = {};
  const qById = new Map(gT.questions.map((q) => [q.qid, q]));
  for (const [qid, raw] of Object.entries(input.answers ?? {})) {
    const q = qById.get(qid);
    if (!q || !q.enabled) continue;
    if (raw === "" || raw === null || raw === undefined) continue;
    if (q.type === "number") answers[qid] = Math.floor(Number(raw));
    else if (q.type === "boolean") answers[qid] = raw === true || raw === "true";
    else answers[qid] = String(raw);
  }

  // Confidence pick — must be a real party; the staked count is that party's own seats.
  let confidencePick = { partyKey: "", seats: 0 };
  if (input.confidencePick?.partyKey && partyKeys.has(input.confidencePick.partyKey)) {
    confidencePick = {
      partyKey: input.confidencePick.partyKey,
      seats: seats[input.confidencePick.partyKey] ?? 0,
    };
  }
  if (input.submit && !confidencePick.partyKey) {
    throw new AppError("Pick one prediction you're most confident about before submitting");
  }

  let wildAnswer: string | number | boolean | null = null;
  if (gT.wildQuestion.enabled && input.wildAnswer != null && input.wildAnswer !== "") {
    wildAnswer = input.wildAnswer as string | number | boolean;
  }

  const nextRevision = ((await Prediction.findOne({
    groupId: group._id,
    participantId: participant._id,
  }).select("revision"))?.revision ?? 0) + 1;

  const pred = await Prediction.findOneAndUpdate(
    { groupId: group._id, participantId: participant._id },
    {
      $set: {
        seats,
        answers,
        confidencePick,
        wildAnswer,
        submitted: input.submit,
        submittedAt: input.submit ? new Date() : null,
        revision: nextRevision,
      },
    },
    { new: true, upsert: true },
  ).lean();

  // Immutable version snapshot.
  await PredictionVersion.create({
    groupId: group._id,
    participantId: participant._id,
    revision: nextRevision,
    seats,
    answers,
    confidencePick,
    wildAnswer,
    submitted: input.submit,
  });

  return serializePrediction(pred, String(participant._id));
}

export async function getMyVersionCount(code: string): Promise<number> {
  const group = await loadGroup(code);
  const token = await getParticipantToken(group.code);
  if (!token) return 0;
  const participant = await Participant.findOne({ groupId: group._id, token });
  if (!participant) return 0;
  return PredictionVersion.countDocuments({
    groupId: group._id,
    participantId: participant._id,
  });
}

/* --------------------------------------------------------- group forecast -- */

/** Average everyone's submitted predictions, rounded (largest-remainder) to 120. */
function computeGroupForecast(
  parties: PartyT[],
  predictions: { seats: Record<string, number> }[],
  totalSeats: number,
): GroupForecastT | null {
  if (predictions.length === 0) return null;
  const averages: Record<string, number> = {};
  for (const p of parties) {
    const sum = predictions.reduce((s, pr) => s + Number(pr.seats[p.key] ?? 0), 0);
    averages[p.key] = sum / predictions.length;
  }
  // Largest-remainder apportionment to hit exactly totalSeats.
  const floors: Record<string, number> = {};
  let used = 0;
  for (const p of parties) {
    floors[p.key] = Math.floor(averages[p.key]);
    used += floors[p.key];
  }
  let remaining = totalSeats - used;
  const byRemainder = [...parties].sort(
    (a, b) => (averages[b.key] % 1) - (averages[a.key] % 1),
  );
  for (const p of byRemainder) {
    if (remaining <= 0) break;
    floors[p.key] += 1;
    remaining -= 1;
  }
  return { seats: floors, averages };
}

/* --------------------------------------------------------------- dashboard -- */

export interface DashboardData {
  group: GroupT;
  election: ElectionT;
  parties: PartyT[];
  viewer: ViewerT;
  participants: (ParticipantT & { hasSubmitted: boolean; revision: number })[];
  myPrediction: PredictionT | null;
  myVersionCount: number;
  leaderboard: LeaderRowT[] | null;
  comparison: ComparisonRowT[] | null;
  groupForecast: GroupForecastT | null;
  officialSeats: Record<string, number> | null;
}

export async function getDashboard(code: string): Promise<DashboardData> {
  const group = await loadGroup(code);
  const gT = serializeGroup(group.toObject());
  const { election, parties } = await getDefaultElection();
  const viewer = await getViewer(code);

  const participantDocs = await Participant.find({ groupId: group._id })
    .sort({ createdAt: 1 })
    .lean();
  const predDocs = await Prediction.find({ groupId: group._id }).lean();
  const predByParticipant = new Map(predDocs.map((p) => [String(p.participantId), p]));

  const participants = participantDocs.map((p) => {
    const pred = predByParticipant.get(String(p._id));
    return {
      ...serializeParticipant(p),
      hasSubmitted: Boolean(pred?.submitted),
      revision: (pred?.revision as number) ?? 0,
    };
  });

  const myPrediction = await getMyPrediction(code);
  const myVersionCount = await getMyVersionCount(code);

  // Reveal Mode: predictions are visible ONLY after lock, and only if enabled.
  const revealed = gT.locked && gT.settings.revealPredictionsAfterLock;

  const submittedPreds = participantDocs
    .map((p) => predByParticipant.get(String(p._id)))
    .filter((pr): pr is NonNullable<typeof pr> => Boolean(pr?.submitted))
    .map((pr) => ({ seats: mapToObj<number>(pr.seats) }));

  let comparison: ComparisonRowT[] | null = null;
  let groupForecast: GroupForecastT | null = null;
  if (revealed) {
    comparison = participantDocs
      .filter((p) => predByParticipant.get(String(p._id))?.submitted)
      .map((p) => {
        const pred = predByParticipant.get(String(p._id))!;
        const seats = mapToObj<number>(pred.seats);
        const cp = (pred.confidencePick as Record<string, unknown>) ?? {};
        return {
          participantId: String(p._id),
          displayName: p.displayName,
          seats,
          answers: mapToObj<string | number | boolean>(pred.answers),
          confidencePick: {
            partyKey: (cp.partyKey as string) ?? "",
            seats: (cp.seats as number) ?? 0,
          },
          wildAnswer: (pred.wildAnswer as string | number | boolean | null) ?? null,
          totalSeats: Object.values(seats).reduce((a, b) => a + b, 0),
        };
      });
    groupForecast = computeGroupForecast(parties, submittedPreds, election.totalSeats);
  }

  let leaderboard: LeaderRowT[] | null = null;
  let officialSeats: Record<string, number> | null = null;
  if (gT.resultsPublishedAt) {
    const result = await computeLeaderboard(code);
    leaderboard = result.rows;
    officialSeats = result.officialSeats;
  }

  return {
    group: gT,
    election,
    parties,
    viewer,
    participants,
    myPrediction,
    myVersionCount,
    leaderboard,
    comparison,
    groupForecast,
    officialSeats,
  };
}

/* ----------------------------------------------------------------- admin --- */

export async function lockGroup(code: string, lock: boolean): Promise<GroupT> {
  const group = await requireAdmin(code);
  group.lockedAt = lock ? new Date() : null;
  await group.save();
  return serializeGroup(group.toObject());
}

export async function updateGroupSettings(
  code: string,
  input: { predictionDeadline?: string; revealPredictionsAfterLock?: boolean },
): Promise<GroupT> {
  const group = await requireAdmin(code);
  if (input.predictionDeadline) {
    const d = new Date(input.predictionDeadline);
    if (Number.isNaN(d.getTime())) throw new AppError("Invalid deadline");
    group.predictionDeadline = d;
  }
  if (typeof input.revealPredictionsAfterLock === "boolean") {
    group.set("settings.revealPredictionsAfterLock", input.revealPredictionsAfterLock);
  }
  await group.save();
  return serializeGroup(group.toObject());
}

export interface QuestionInput {
  qid: string;
  type: "party" | "choice" | "boolean" | "number";
  text: string;
  textHe: string;
  options: { value: string; label: string }[];
  points: number;
  autoResolve: "" | "largestParty" | "blocWinner" | "partyCount" | "anyPartyBelowThreshold";
  kind: "" | "turnout";
  enabled: boolean;
  order: number;
}

export async function updateQuestions(
  code: string,
  questions: QuestionInput[],
): Promise<GroupT> {
  const group = await requireAdmin(code);
  const gT = serializeGroup(group.toObject());
  if (gT.locked) throw new AppError("Cannot edit questions after predictions are locked", 403);
  group.set(
    "questions",
    questions.map((q, i) => ({
      qid: q.qid || `q_${Date.now()}_${i}`,
      type: q.type,
      text: q.text,
      textHe: q.textHe,
      options: q.options ?? [],
      points: Number(q.points) || 0,
      autoResolve: q.autoResolve ?? "",
      kind: q.kind ?? "",
      enabled: q.enabled !== false,
      order: q.order ?? i + 1,
    })),
  );
  await group.save();
  return serializeGroup(group.toObject());
}

export async function updateWildQuestion(
  code: string,
  wild: { enabled: boolean; textHe: string; text?: string; options: { value: string; label: string }[]; points: number },
): Promise<GroupT> {
  const group = await requireAdmin(code);
  const gT = serializeGroup(group.toObject());
  if (gT.locked && !gT.resultsPublishedAt) {
    // allow editing the correct answer path later, but not the question text after lock
  }
  if (gT.locked) throw new AppError("Cannot edit the wild question after lock", 403);
  group.set("wildQuestion", {
    enabled: Boolean(wild.enabled),
    text: wild.text ?? wild.textHe,
    textHe: wild.textHe,
    options: wild.options ?? [],
    points: Number(wild.points) || 0,
  });
  await group.save();
  return serializeGroup(group.toObject());
}

export async function updateScoring(
  code: string,
  scoring: Partial<ScoringConfig>,
): Promise<GroupT> {
  const group = await requireAdmin(code);
  group.set("scoring", { ...serializeGroup(group.toObject()).scoring, ...scoring });
  await group.save();
  return serializeGroup(group.toObject());
}

export interface PartyInput {
  key: string;
  nameHe: string;
  name?: string;
  commonNameHe?: string;
  ballotLetters?: string;
  leaderHe?: string;
  color?: string;
  bloc?: string;
  status?: "active" | "withdrawn" | "disqualified";
  order?: number;
}

export async function updateParties(code: string, parties: PartyInput[]): Promise<PartyT[]> {
  const group = await requireAdmin(code);
  const gT = serializeGroup(group.toObject());
  if (gT.locked) throw new AppError("Cannot edit lists after predictions are locked", 403);
  const election = await Election.findById(group.electionId);
  if (!election) throw new AppError("Election missing", 500);

  const existing = await Party.find({ electionId: election._id });
  const byKey = new Map(existing.map((p) => [p.key, p]));

  let order = 1;
  for (const input of parties) {
    const key = input.key?.trim();
    if (!key || !input.nameHe?.trim()) continue;
    const doc = byKey.get(key);
    const fields = {
      nameHe: input.nameHe.trim(),
      name: input.name?.trim() || input.nameHe.trim(),
      commonNameHe: input.commonNameHe ?? "",
      ballotLetters: input.ballotLetters ?? "",
      leaderHe: input.leaderHe ?? "",
      color: input.color || "#64748b",
      bloc: input.bloc ?? "",
      status: input.status ?? "active",
      order: order++,
    };
    if (doc) {
      doc.set(fields);
      await doc.save();
      byKey.delete(key);
    } else {
      await Party.create({ ...fields, electionId: election._id, key });
    }
  }
  // Any list omitted from the payload is left untouched (safer than deleting).

  const { allParties } = await getDefaultElection();
  return allParties;
}

/* ------------------------------------------------------------- results ---- */

export interface ResultsInput {
  seats: Record<string, number>;
  answers: Record<string, string | number | boolean>;
  wildAnswer?: string | number | boolean | null;
  turnoutPercent?: number | null;
  enteredBy?: string;
  /** "save" keeps a draft (not scored); "provisional" / "final" publish it */
  action: "save" | "provisional" | "final";
}

export async function saveResults(code: string, input: ResultsInput): Promise<GroupT> {
  const group = await requireAdmin(code);
  const { election, parties } = await getDefaultElection();
  const partyKeys = new Set(parties.map((p) => p.key));

  const seats: Record<string, number> = {};
  for (const [key, raw] of Object.entries(input.seats ?? {})) {
    if (!partyKeys.has(key)) continue;
    const v = Math.floor(Number(raw));
    if (!Number.isNaN(v) && v >= 0) seats[key] = v;
  }

  const publishing = input.action === "provisional" || input.action === "final";
  if (input.action === "final") {
    const total = Object.values(seats).reduce((a, b) => a + b, 0);
    if (total !== election.totalSeats) {
      throw new AppError(
        `Final results must total ${election.totalSeats} (currently ${total})`,
      );
    }
  }

  const prev = await OfficialResult.findOne({ groupId: group._id });
  await OfficialResult.findOneAndUpdate(
    { groupId: group._id },
    {
      $set: {
        stage: input.action === "final" ? "final" : "provisional",
        seats,
        answers: input.answers ?? {},
        wildAnswer: input.wildAnswer ?? null,
        turnoutPercent: input.turnoutPercent ?? null,
        enteredBy: input.enteredBy ?? "",
        revision: (prev?.revision ?? 0) + 1,
      },
    },
    { upsert: true },
  );

  if (publishing && !group.resultsPublishedAt) group.resultsPublishedAt = new Date();
  if (input.action === "final") group.resultsFinalizedAt = new Date();
  if (input.action === "save" && !prev) group.resultsPublishedAt = null;
  await group.save();
  return serializeGroup(group.toObject());
}

export interface OfficialResultDraft {
  seats: Record<string, number>;
  answers: Record<string, string | number | boolean>;
  wildAnswer: string | number | boolean | null;
  turnoutPercent: number | null;
  enteredBy: string;
  stage: "provisional" | "final" | null;
  revision: number;
}

export async function getOfficialResultDraft(code: string): Promise<OfficialResultDraft> {
  const group = await requireAdmin(code);
  const result = await OfficialResult.findOne({ groupId: group._id }).lean();
  return {
    seats: mapToObj<number>(result?.seats),
    answers: mapToObj<string | number | boolean>(result?.answers),
    wildAnswer: (result?.wildAnswer as string | number | boolean | null) ?? null,
    turnoutPercent: (result?.turnoutPercent as number | null) ?? null,
    enteredBy: (result?.enteredBy as string) ?? "",
    stage: (result?.stage as "provisional" | "final") ?? null,
    revision: (result?.revision as number) ?? 0,
  };
}

/* ------------------------------------------------------------- leaderboard -- */

export interface LeaderboardResult {
  rows: LeaderRowT[];
  officialSeats: Record<string, number>;
}

export async function computeLeaderboard(code: string): Promise<LeaderboardResult> {
  const group = await loadGroup(code);
  const gT = serializeGroup(group.toObject());
  const { election, parties } = await getDefaultElection();

  const result = await OfficialResult.findOne({ groupId: group._id }).lean();
  const officialSeats = mapToObj<number>(result?.seats);
  const officialAnswers = mapToObj<string | number | boolean>(result?.answers);
  const officialWild = (result?.wildAnswer as string | number | boolean | null) ?? null;

  const partyLites = toPartyLites(parties);
  const questionLites = toQuestionLites(gT);
  const config: ScoringConfig = gT.scoring;

  const participantDocs = await Participant.find({ groupId: group._id }).lean();
  const predDocs = await Prediction.find({ groupId: group._id }).lean();
  const predByParticipant = new Map(predDocs.map((p) => [String(p.participantId), p]));

  const submittedSeatMaps = participantDocs
    .map((p) => predByParticipant.get(String(p._id)))
    .filter((pr): pr is NonNullable<typeof pr> => Boolean(pr?.submitted))
    .map((pr) => ({ seats: mapToObj<number>(pr.seats) }));
  const forecast = computeGroupForecast(parties, submittedSeatMaps, election.totalSeats);

  const scored = participantDocs.map((p) => {
    const pred = predByParticipant.get(String(p._id));
    const predictedSeats = mapToObj<number>(pred?.seats);
    const cp = (pred?.confidencePick as Record<string, unknown>) ?? {};
    const s = scoreParticipant({
      parties: partyLites,
      questions: questionLites,
      blocs: election.blocs,
      config,
      thresholdSeats: election.thresholdSeats,
      predictedSeats,
      predictedAnswers: mapToObj(pred?.answers),
      confidencePick: { partyKey: (cp.partyKey as string) ?? "", seats: (cp.seats as number) ?? 0 },
      wildPredicted: (pred?.wildAnswer as string | number | boolean | null) ?? null,
      wildPoints: gT.wildQuestion.points,
      actualSeats: officialSeats,
      actualAnswers: officialAnswers,
      actualWildAnswer: officialWild,
    });

    // worst single-party miss + consensus deviation
    let worstError = 0;
    let worstPartyKey = "";
    for (const row of s.seats.rows) {
      if (row.error > worstError) {
        worstError = row.error;
        worstPartyKey = row.key;
      }
    }
    let consensusDeviation = 0;
    if (forecast) {
      for (const party of parties) {
        consensusDeviation += Math.abs(
          Number(predictedSeats[party.key] ?? 0) - Number(forecast.seats[party.key] ?? 0),
        );
      }
    }

    return {
      participantId: String(p._id),
      displayName: p.displayName,
      submitted: Boolean(pred?.submitted),
      worstError,
      worstPartyKey,
      consensusDeviation,
      ...s,
    };
  });

  const ranked = scored
    .filter((s) => s.submitted)
    .sort(
      (a, b) =>
        b.total - a.total ||
        a.totalSeatError - b.totalSeatError ||
        (a.turnoutDelta ?? 999) - (b.turnoutDelta ?? 999),
    );

  if (ranked.length === 0) return { rows: [], officialSeats };

  const maxExact = Math.max(...ranked.map((s) => s.exactCount));
  const minTotalError = Math.min(...ranked.map((s) => s.totalSeatError));
  const maxThreshold = Math.max(...ranked.map((s) => s.thresholdCorrectCount));
  const maxWorst = Math.max(...ranked.map((s) => s.worstError));
  // Contrarian genius: top-3 finisher whose map deviated most from consensus.
  const top3 = ranked.slice(0, 3);
  const contrarian =
    top3.length > 0
      ? top3.reduce((a, b) => (b.consensusDeviation > a.consensusDeviation ? b : a))
      : null;

  const rows: LeaderRowT[] = ranked.map((s, i) => ({
    rank: i + 1,
    participantId: s.participantId,
    displayName: s.displayName,
    total: s.total,
    seatScore: s.seatScore,
    bonusScore: s.bonusScore,
    confidencePickAwarded: s.confidencePickAwarded,
    totalSeatError: s.totalSeatError,
    avgError: s.avgError,
    exactCount: s.exactCount,
    offByOneCount: s.offByOneCount,
    thresholdCorrectCount: s.thresholdCorrectCount,
    turnoutDelta: s.turnoutDelta,
    worstError: s.worstError,
    worstPartyKey: s.worstPartyKey,
    isFirst: i === 0,
    isOracle: i === 0,
    isBullseye: maxExact > 0 && s.exactCount === maxExact,
    isClosestKnesset: s.totalSeatError === minTotalError,
    isThresholdMaster: maxThreshold > 0 && s.thresholdCorrectCount === maxThreshold,
    isContrarianGenius:
      contrarian != null &&
      s.participantId === contrarian.participantId &&
      contrarian.consensusDeviation >= 12,
    isBiggestMiss: maxWorst > 0 && s.worstError === maxWorst,
  }));

  return { rows, officialSeats };
}

/** Preview of what the auto-resolved answers currently look like (admin helper). */
export async function previewAutoAnswers(
  code: string,
  seats: Record<string, number>,
): Promise<Record<string, string | number | boolean | null>> {
  const group = await loadGroup(code);
  const gT = serializeGroup(group.toObject());
  const { election, parties } = await getDefaultElection();
  const partyLites = toPartyLites(parties);
  const out: Record<string, string | number | boolean | null> = {};
  for (const q of gT.questions) {
    if (!q.autoResolve) continue;
    out[q.qid] = resolveAutoAnswer(
      { ...q } as QuestionLite,
      partyLites,
      seats,
      election.thresholdSeats,
      election.blocs,
    );
  }
  return out;
}
