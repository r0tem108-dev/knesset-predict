/**
 * Scoring engine — designed for an Israeli-election seat-prediction game.
 *
 * Pure functions, no DB / framework imports, so it is unit-testable and reusable
 * across future elections. Everything tunable lives in `ScoringConfig`.
 *
 * Concepts:
 *  - "entered the Knesset" == actual seats > 0 (a list either got seats or 0).
 *  - "predicted to enter"  == predicted seats > 0 (0 ⇒ you predicted it fails).
 *
 * Per list the participant can earn:
 *  - seat-accuracy points (tiered by |error|) — only for lists that entered
 *  - a threshold bonus for correctly calling enter / fail
 *  - a penalty for piling seats onto a list that ultimately failed
 * Plus: bonus questions, the Wild Prediction, and the Confidence Pick.
 *
 * The single entry point callers need is `scoreParticipant`.
 */

export type SeatMap = Record<string, number>;
export type AnswerMap = Record<string, string | number | boolean | null | undefined>;

export interface ScoreTier {
  maxError: number;
  points: number;
}

export interface ScoringConfig {
  seatMethod: "tiered" | "linear";
  tiers: ScoreTier[];
  linearBase: number;
  linearSlope: number;
  exactBonus: number;
  thresholdEnterPoints: number;
  thresholdFailPoints: number;
  failedListSeatPenaltyPerSeat: number;
  confidencePickBonus: number;
}

export interface PartyLite {
  key: string;
  name: string;
  nameHe: string;
  color: string;
  bloc: string;
}

export interface QuestionLite {
  qid: string;
  type: "party" | "choice" | "boolean" | "number";
  text: string;
  textHe: string;
  points: number;
  autoResolve: "" | "largestParty" | "blocWinner" | "partyCount" | "anyPartyBelowThreshold";
  kind?: "" | "turnout";
  enabled: boolean;
}

export interface ConfidencePick {
  partyKey: string;
  seats: number;
}

/* ------------------------------------------------------------------ seats -- */

export function seatPointsForError(error: number, config: ScoringConfig): number {
  if (config.seatMethod === "linear") {
    return Math.max(0, config.linearBase - config.linearSlope * error);
  }
  const sorted = [...config.tiers].sort((a, b) => a.maxError - b.maxError);
  for (const tier of sorted) {
    if (error <= tier.maxError) return tier.points;
  }
  return 0;
}

export interface PartyBreakdownRow {
  key: string;
  predicted: number;
  actual: number;
  error: number;
  exact: boolean;
  /** seat-accuracy points (0 if the list did not enter) */
  seatPoints: number;
  predictedEnter: boolean;
  actualEnter: boolean;
  thresholdCorrect: boolean;
  /** +enter / +fail bonus, or negative failed-list penalty */
  thresholdPoints: number;
}

export interface SeatScoreResult {
  rows: PartyBreakdownRow[];
  /** Σ seat-accuracy points */
  seatAccuracyPoints: number;
  /** Σ threshold bonuses − Σ failed-list penalties */
  thresholdPoints: number;
  /** exactBonus × (exact predictions for lists that entered) */
  exactBonusAwarded: number;
  /** Σ |predicted − actual| across every list — the headline "closest map" metric */
  totalSeatError: number;
  avgError: number;
  exactCount: number;
  offByOneCount: number;
  thresholdCorrectCount: number;
}

export function scoreSeats(
  parties: PartyLite[],
  predicted: SeatMap,
  actual: SeatMap,
  config: ScoringConfig,
): SeatScoreResult {
  const rows: PartyBreakdownRow[] = parties.map((p) => {
    const pred = Math.max(0, Number(predicted[p.key] ?? 0));
    const act = Math.max(0, Number(actual[p.key] ?? 0));
    const error = Math.abs(pred - act);
    const predictedEnter = pred > 0;
    const actualEnter = act > 0;
    const exact = pred === act && actualEnter;

    const seatPoints = actualEnter ? seatPointsForError(error, config) : 0;

    let thresholdPoints = 0;
    if (predictedEnter && actualEnter) thresholdPoints = config.thresholdEnterPoints;
    else if (!predictedEnter && !actualEnter) thresholdPoints = config.thresholdFailPoints;
    else if (predictedEnter && !actualEnter)
      thresholdPoints = -(pred * config.failedListSeatPenaltyPerSeat);

    return {
      key: p.key,
      predicted: pred,
      actual: act,
      error,
      exact,
      seatPoints,
      predictedEnter,
      actualEnter,
      thresholdCorrect: predictedEnter === actualEnter,
      thresholdPoints,
    };
  });

  const seatAccuracyPoints = round2(rows.reduce((s, r) => s + r.seatPoints, 0));
  const thresholdPoints = round2(rows.reduce((s, r) => s + r.thresholdPoints, 0));
  const exactCount = rows.filter((r) => r.exact).length;
  const offByOneCount = rows.filter((r) => r.actualEnter && r.error === 1).length;
  const thresholdCorrectCount = rows.filter((r) => r.thresholdCorrect).length;
  const exactBonusAwarded = round2(exactCount * config.exactBonus);
  const totalSeatError = rows.reduce((s, r) => s + r.error, 0);
  const avgError = rows.length ? round2(totalSeatError / rows.length) : 0;

  return {
    rows,
    seatAccuracyPoints,
    thresholdPoints,
    exactBonusAwarded,
    totalSeatError,
    avgError,
    exactCount,
    offByOneCount,
    thresholdCorrectCount,
  };
}

/* -------------------------------------------------------------- questions -- */

export function resolveAutoAnswer(
  q: QuestionLite,
  parties: PartyLite[],
  actual: SeatMap,
  thresholdSeats: number,
  blocs: { key: string }[],
): string | number | boolean | null {
  switch (q.autoResolve) {
    case "largestParty": {
      let best: string | null = null;
      let bestSeats = -1;
      for (const p of parties) {
        const s = Number(actual[p.key] ?? 0);
        if (s > bestSeats) {
          bestSeats = s;
          best = p.key;
        }
      }
      return best;
    }
    case "blocWinner": {
      const totals = new Map<string, number>();
      for (const b of blocs) totals.set(b.key, 0);
      for (const p of parties) {
        if (!p.bloc) continue;
        totals.set(p.bloc, (totals.get(p.bloc) ?? 0) + Number(actual[p.key] ?? 0));
      }
      let best: string | null = null;
      let bestSeats = -1;
      for (const [key, s] of totals) {
        if (s > bestSeats) {
          bestSeats = s;
          best = key;
        }
      }
      return best;
    }
    case "partyCount":
      return parties.filter((p) => Number(actual[p.key] ?? 0) > 0).length;
    case "anyPartyBelowThreshold":
      // any list that ran (predicted or listed) but got 0
      return parties.some((p) => Number(actual[p.key] ?? 0) === 0);
    default:
      return null;
  }
}

export interface QuestionBreakdownRow {
  qid: string;
  predicted: string | number | boolean | null;
  correct: string | number | boolean | null;
  points: number;
  awarded: number;
  isTurnout: boolean;
}

export interface QuestionScoreResult {
  rows: QuestionBreakdownRow[];
  bonusScore: number;
  /** |predicted − actual| turnout %, for the tie-breaker (null if not answered/known) */
  turnoutDelta: number | null;
}

function answersEqual(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (typeof a === "boolean" || typeof b === "boolean") return toBool(a) === toBool(b);
  if (typeof a === "number" || typeof b === "number") return Number(a) === Number(b);
  return String(a).trim() === String(b).trim();
}

function toBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  return ["true", "yes", "1", "כן"].includes(String(v).trim().toLowerCase());
}

export function scoreQuestions(
  questions: QuestionLite[],
  parties: PartyLite[],
  predictedAnswers: AnswerMap,
  actualAnswers: AnswerMap,
  actualSeats: SeatMap,
  thresholdSeats: number,
  blocs: { key: string }[],
): QuestionScoreResult {
  const rows: QuestionBreakdownRow[] = [];
  let turnoutDelta: number | null = null;

  for (const q of questions) {
    if (!q.enabled) continue;
    const correct = q.autoResolve
      ? resolveAutoAnswer(q, parties, actualSeats, thresholdSeats, blocs)
      : (actualAnswers[q.qid] ?? null);
    const predicted = predictedAnswers[q.qid] ?? null;
    const isTurnout = q.kind === "turnout";

    if (isTurnout && predicted != null && correct != null) {
      turnoutDelta = Math.abs(Number(predicted) - Number(correct));
    }
    const isCorrect = answersEqual(predicted, correct);
    rows.push({
      qid: q.qid,
      predicted: predicted as QuestionBreakdownRow["predicted"],
      correct: correct as QuestionBreakdownRow["correct"],
      points: q.points,
      awarded: isCorrect ? q.points : 0,
      isTurnout,
    });
  }
  return { rows, bonusScore: round2(rows.reduce((s, r) => s + r.awarded, 0)), turnoutDelta };
}

/* ------------------------------------------------------------- aggregate -- */

export interface ParticipantScore {
  seats: SeatScoreResult;
  questions: QuestionScoreResult;
  /** seat accuracy + threshold + exact bonus + confidence pick */
  seatScore: number;
  /** bonus questions + wild prediction */
  bonusScore: number;
  confidencePickAwarded: number;
  wildAwarded: number;
  total: number;
  totalSeatError: number;
  avgError: number;
  exactCount: number;
  offByOneCount: number;
  thresholdCorrectCount: number;
  turnoutDelta: number | null;
}

export function scoreParticipant(args: {
  parties: PartyLite[];
  questions: QuestionLite[];
  blocs: { key: string }[];
  config: ScoringConfig;
  thresholdSeats: number;
  predictedSeats: SeatMap;
  predictedAnswers: AnswerMap;
  confidencePick?: ConfidencePick | null;
  wildPredicted?: string | number | boolean | null;
  wildPoints?: number;
  actualSeats: SeatMap;
  actualAnswers: AnswerMap;
  actualWildAnswer?: string | number | boolean | null;
}): ParticipantScore {
  const seats = scoreSeats(args.parties, args.predictedSeats, args.actualSeats, args.config);
  const questions = scoreQuestions(
    args.questions,
    args.parties,
    args.predictedAnswers,
    args.actualAnswers,
    args.actualSeats,
    args.thresholdSeats,
    args.blocs,
  );

  // Confidence pick: exact seat prediction for the chosen list.
  let confidencePickAwarded = 0;
  const pick = args.confidencePick;
  if (pick && pick.partyKey) {
    const pred = Number(args.predictedSeats[pick.partyKey] ?? 0);
    const act = Number(args.actualSeats[pick.partyKey] ?? 0);
    if (pred === act && Object.keys(args.actualSeats).length > 0) {
      confidencePickAwarded = args.config.confidencePickBonus;
    }
  }

  // Wild prediction.
  let wildAwarded = 0;
  if (
    args.wildPredicted != null &&
    args.actualWildAnswer != null &&
    answersEqual(args.wildPredicted, args.actualWildAnswer)
  ) {
    wildAwarded = args.wildPoints ?? 0;
  }

  const seatScore = round2(
    seats.seatAccuracyPoints +
      seats.thresholdPoints +
      seats.exactBonusAwarded +
      confidencePickAwarded,
  );
  const bonusScore = round2(questions.bonusScore + wildAwarded);

  return {
    seats,
    questions,
    seatScore,
    bonusScore,
    confidencePickAwarded,
    wildAwarded,
    total: round2(seatScore + bonusScore),
    totalSeatError: seats.totalSeatError,
    avgError: seats.avgError,
    exactCount: seats.exactCount,
    offByOneCount: seats.offByOneCount,
    thresholdCorrectCount: seats.thresholdCorrectCount,
    turnoutDelta: questions.turnoutDelta,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
