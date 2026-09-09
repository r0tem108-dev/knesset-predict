/** Plain, JSON-safe shapes passed from server code to client components. */

export interface BlocT {
  key: string;
  label: string;
  labelHe: string;
}

export interface ElectionT {
  id: string;
  slug: string;
  name: string;
  nameHe: string;
  electionDay: string; // ISO
  listSubmissionDate: string | null;
  totalSeats: number;
  thresholdPercent: number;
  thresholdSeats: number;
  coalitionWindowDays: number;
  blocs: BlocT[];
}

export interface PartyT {
  id: string;
  key: string;
  name: string;
  nameHe: string;
  commonNameHe: string;
  ballotLetters: string;
  leaderHe: string;
  color: string;
  logoUrl: string;
  bloc: string;
  status: "active" | "withdrawn" | "disqualified";
  order: number;
}

export interface QuestionT {
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

export interface WildQuestionT {
  enabled: boolean;
  text: string;
  textHe: string;
  options: { value: string; label: string }[];
  points: number;
}

export interface ScoreTierT {
  maxError: number;
  points: number;
}

export interface ScoringT {
  seatMethod: "tiered" | "linear";
  tiers: ScoreTierT[];
  linearBase: number;
  linearSlope: number;
  exactBonus: number;
  thresholdEnterPoints: number;
  thresholdFailPoints: number;
  failedListSeatPenaltyPerSeat: number;
  confidencePickBonus: number;
}

export interface GroupSettingsT {
  /** show members the live predictions / comparison / forecast / insights */
  showPredictions: boolean;
}

export type GroupStatus = "open" | "locked" | "provisional" | "final";

export interface GroupT {
  id: string;
  code: string;
  name: string;
  creatorName: string;
  hasPassword: boolean;
  predictionDeadline: string; // ISO
  lockedAt: string | null;
  locked: boolean;
  status: GroupStatus;
  resultsPublishedAt: string | null;
  resultsFinalizedAt: string | null;
  settings: GroupSettingsT;
  scoring: ScoringT;
  questions: QuestionT[];
  wildQuestion: WildQuestionT;
  createdAt: string;
}

export interface ParticipantT {
  id: string;
  displayName: string;
  isAdmin: boolean;
  joinedAt: string;
}

export interface ConfidencePickT {
  partyKey: string;
  seats: number;
}

export interface PredictionT {
  participantId: string;
  seats: Record<string, number>;
  answers: Record<string, string | number | boolean>;
  confidencePick: ConfidencePickT;
  wildAnswer: string | number | boolean | null;
  submitted: boolean;
  submittedAt: string | null;
  firstSubmittedAt: string | null;
  updatedAt: string | null;
  revision: number;
  changeCount: number;
}

export interface ViewerT {
  participant: ParticipantT | null;
  isAdmin: boolean;
}

export interface LeaderRowT {
  rank: number;
  participantId: string;
  displayName: string;
  total: number;
  seatScore: number;
  bonusScore: number;
  confidencePickAwarded: number;
  totalSeatError: number;
  avgError: number;
  exactCount: number;
  offByOneCount: number;
  thresholdCorrectCount: number;
  turnoutDelta: number | null;
  worstError: number;
  worstPartyKey: string;
  /** award flags */
  isFirst: boolean;
  isOracle: boolean;
  isBullseye: boolean;
  isClosestKnesset: boolean;
  isThresholdMaster: boolean;
  isContrarianGenius: boolean;
  isBiggestMiss: boolean;
}

export interface ComparisonRowT {
  participantId: string;
  displayName: string;
  seats: Record<string, number>;
  answers: Record<string, string | number | boolean>;
  confidencePick: ConfidencePickT;
  wildAnswer: string | number | boolean | null;
  totalSeats: number;
  lastUpdatedAt: string | null;
  firstSubmittedAt: string | null;
  changeCount: number;
}

export interface GroupForecastT {
  /** party key -> consensus seats (integers summing to totalSeats) */
  seats: Record<string, number>;
  /** party key -> raw average before rounding */
  averages: Record<string, number>;
}

export interface GroupInsightT {
  emoji: string;
  title: string;
  text: string;
}

export interface ActivityItemT {
  participantId: string;
  displayName: string;
  kind: "first" | "update" | "multi";
  count: number;
  at: string;
}

export interface DashParticipantT extends ParticipantT {
  hasSubmitted: boolean;
  changeCount: number;
  revision: number;
  lastUpdatedAt: string | null;
  firstSubmittedAt: string | null;
}
