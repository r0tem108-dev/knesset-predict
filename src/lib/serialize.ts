import type {
  ElectionT,
  PartyT,
  GroupT,
  GroupStatus,
  ParticipantT,
  PredictionT,
  QuestionT,
  WildQuestionT,
} from "./types";

type AnyDoc = Record<string, unknown>;

export function mapToObj<V = unknown>(m: unknown): Record<string, V> {
  if (!m) return {};
  if (m instanceof Map) return Object.fromEntries(m) as Record<string, V>;
  if (typeof m === "object") return { ...(m as Record<string, V>) };
  return {};
}

const iso = (d: unknown): string =>
  d instanceof Date ? d.toISOString() : d ? new Date(d as string).toISOString() : "";

const isoOrNull = (d: unknown): string | null => (d ? iso(d) : null);

export function serializeElection(e: AnyDoc): ElectionT {
  return {
    id: String(e._id),
    slug: e.slug as string,
    name: e.name as string,
    nameHe: e.nameHe as string,
    electionDay: iso(e.electionDay),
    listSubmissionDate: isoOrNull(e.listSubmissionDate),
    totalSeats: (e.totalSeats as number) ?? 120,
    thresholdPercent: (e.thresholdPercent as number) ?? 3.25,
    thresholdSeats: (e.thresholdSeats as number) ?? 4,
    coalitionWindowDays: (e.coalitionWindowDays as number) ?? 45,
    blocs: ((e.blocs as AnyDoc[]) ?? []).map((b) => ({
      key: b.key as string,
      label: b.label as string,
      labelHe: b.labelHe as string,
    })),
  };
}

export function serializeParty(p: AnyDoc): PartyT {
  return {
    id: String(p._id),
    key: p.key as string,
    name: p.name as string,
    nameHe: p.nameHe as string,
    commonNameHe: (p.commonNameHe as string) ?? "",
    ballotLetters: (p.ballotLetters as string) ?? (p.abbr as string) ?? "",
    leaderHe: (p.leaderHe as string) ?? "",
    color: (p.color as string) ?? "#64748b",
    logoUrl: (p.logoUrl as string) ?? "",
    bloc: (p.bloc as string) ?? "",
    status: ((p.status as PartyT["status"]) ?? "active"),
    order: (p.order as number) ?? 0,
  };
}

export function serializeQuestion(q: AnyDoc): QuestionT {
  return {
    qid: q.qid as string,
    type: q.type as QuestionT["type"],
    text: q.text as string,
    textHe: q.textHe as string,
    options: ((q.options as AnyDoc[]) ?? []).map((o) => ({
      value: o.value as string,
      label: o.label as string,
    })),
    points: (q.points as number) ?? 0,
    autoResolve: (q.autoResolve as QuestionT["autoResolve"]) ?? "",
    kind: (q.kind as QuestionT["kind"]) ?? "",
    enabled: (q.enabled as boolean) ?? true,
    order: (q.order as number) ?? 0,
  };
}

function serializeWild(w: AnyDoc | undefined): WildQuestionT {
  const x = w ?? {};
  return {
    enabled: Boolean(x.enabled),
    text: (x.text as string) ?? "",
    textHe: (x.textHe as string) ?? "",
    options: ((x.options as AnyDoc[]) ?? []).map((o) => ({
      value: o.value as string,
      label: o.label as string,
    })),
    points: (x.points as number) ?? 15,
  };
}

export function serializeGroup(g: AnyDoc): GroupT {
  const now = Date.now();
  const deadline = new Date(g.predictionDeadline as string).getTime();
  const locked = Boolean(g.lockedAt) || now >= deadline;
  const s = (g.settings as AnyDoc) ?? {};
  const sc = (g.scoring as AnyDoc) ?? {};

  const status: GroupStatus = g.resultsFinalizedAt
    ? "final"
    : g.resultsPublishedAt
      ? "provisional"
      : locked
        ? "locked"
        : "open";

  return {
    id: String(g._id),
    code: g.code as string,
    name: g.name as string,
    creatorName: g.creatorName as string,
    hasPassword: Boolean(g.passwordHash),
    predictionDeadline: iso(g.predictionDeadline),
    lockedAt: isoOrNull(g.lockedAt),
    locked,
    status,
    resultsPublishedAt: isoOrNull(g.resultsPublishedAt),
    resultsFinalizedAt: isoOrNull(g.resultsFinalizedAt),
    settings: {
      showPredictions:
        s.showPredictions !== undefined
          ? s.showPredictions !== false
          : s.revealPredictionsAfterLock !== false,
    },
    scoring: {
      seatMethod: (sc.seatMethod as "tiered" | "linear") ?? "tiered",
      tiers: ((sc.tiers as AnyDoc[]) ?? []).map((t) => ({
        maxError: t.maxError as number,
        points: t.points as number,
      })),
      linearBase: (sc.linearBase as number) ?? 10,
      linearSlope: (sc.linearSlope as number) ?? 2,
      exactBonus: (sc.exactBonus as number) ?? 0,
      thresholdEnterPoints: (sc.thresholdEnterPoints as number) ?? 2,
      thresholdFailPoints: (sc.thresholdFailPoints as number) ?? 2,
      failedListSeatPenaltyPerSeat: (sc.failedListSeatPenaltyPerSeat as number) ?? 1,
      confidencePickBonus: (sc.confidencePickBonus as number) ?? 10,
    },
    questions: ((g.questions as AnyDoc[]) ?? [])
      .map(serializeQuestion)
      .sort((a, b) => a.order - b.order),
    wildQuestion: serializeWild(g.wildQuestion as AnyDoc),
    createdAt: iso(g.createdAt),
  };
}

export function serializeParticipant(p: AnyDoc): ParticipantT {
  return {
    id: String(p._id),
    displayName: p.displayName as string,
    isAdmin: Boolean(p.isAdmin),
    joinedAt: iso(p.createdAt),
  };
}

export function serializePrediction(p: AnyDoc | null, participantId: string): PredictionT {
  const cp = (p?.confidencePick as AnyDoc) ?? {};
  if (!p) {
    return {
      participantId,
      seats: {},
      answers: {},
      confidencePick: { partyKey: "", seats: 0 },
      wildAnswer: null,
      submitted: false,
      submittedAt: null,
      firstSubmittedAt: null,
      updatedAt: null,
      revision: 0,
      changeCount: 0,
    };
  }
  return {
    participantId: String(p.participantId),
    seats: mapToObj<number>(p.seats),
    answers: mapToObj<string | number | boolean>(p.answers),
    confidencePick: {
      partyKey: (cp.partyKey as string) ?? "",
      seats: (cp.seats as number) ?? 0,
    },
    wildAnswer: (p.wildAnswer as string | number | boolean | null) ?? null,
    submitted: Boolean(p.submitted),
    submittedAt: isoOrNull(p.submittedAt),
    firstSubmittedAt: isoOrNull(p.firstSubmittedAt),
    updatedAt: isoOrNull(p.updatedAt),
    revision: (p.revision as number) ?? 0,
    changeCount: Math.max(0, ((p.submitCount as number) ?? 0) - 1),
  };
}
