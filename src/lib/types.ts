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
  abbr: string;
  color: string;
  logoUrl: string;
  bloc: string;
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
  enabled: boolean;
  order: number;
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
  thresholdPoints: number;
}

export interface GroupSettingsT {
  revealPredictionsBeforeLock: boolean;
  revealPredictionsAfterLock: boolean;
}

export interface GroupT {
  id: string;
  code: string;
  name: string;
  creatorName: string;
  hasPassword: boolean;
  predictionDeadline: string; // ISO
  lockedAt: string | null;
  locked: boolean;
  resultsPublishedAt: string | null;
  settings: GroupSettingsT;
  scoring: ScoringT;
  questions: QuestionT[];
  createdAt: string;
}

export interface ParticipantT {
  id: string;
  displayName: string;
  isAdmin: boolean;
  joinedAt: string;
}

export interface PredictionT {
  participantId: string;
  seats: Record<string, number>;
  answers: Record<string, string | number | boolean>;
  submitted: boolean;
  submittedAt: string | null;
  updatedAt: string | null;
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
  avgError: number;
  exactCount: number;
  isFirst: boolean;
  isMostAccurate: boolean;
  isMostExact: boolean;
}
