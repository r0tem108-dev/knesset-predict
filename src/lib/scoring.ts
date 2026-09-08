/**
 * Scoring engine.
 *
 * Deliberately kept as pure functions with no DB / framework imports so that:
 *  - it is trivially unit-testable,
 *  - alternative scoring strategies can be added without touching callers,
 *  - a future multi-election version can reuse it unchanged.
 *
 * The only entry point callers need is `scoreParticipant`.
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
  thresholdPoints: number;
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
  enabled: boolean;
}

/* ------------------------------------------------------------------ seats -- */

export function seatPointsForError(error: number, config: ScoringConfig): number {
  if (config.seatMethod === "linear") {
    return Math.max(0, config.linearBase - config.linearSlope * error);
  }
  // tiered: first tier (best-first) whose maxError covers this error
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
  points: number;
  /** predicted this party would clear the threshold */
  predictedPass: boolean;
  actualPass: boolean;
  thresholdCorrect: boolean;
}

export interface SeatScoreResult {
  rows: PartyBreakdownRow[];
  seatScore: number;
  exactBonusAwarded: number;
  thresholdScore: number;
  exactCount: number;
  avgError: number;
  totalAbsError: number;
}

export function scoreSeats(
  parties: PartyLite[],
  predicted: SeatMap,
  actual: SeatMap,
  config: ScoringConfig,
  thresholdSeats: number,
): SeatScoreResult {
  const rows: PartyBreakdownRow[] = parties.map((p) => {
    const pred = Number(predicted[p.key] ?? 0);
    const act = Number(actual[p.key] ?? 0);
    const error = Math.abs(pred - act);
    const exact = pred === act;
    const predictedPass = pred >= thresholdSeats;
    const actualPass = act >= thresholdSeats;
    return {
      key: p.key,
      predicted: pred,
      actual: act,
      error,
      exact,
      points: seatPointsForError(error, config),
      predictedPass,
      actualPass,
      thresholdCorrect: predictedPass === actualPass,
    };
  });

  const seatScore = round2(rows.reduce((s, r) => s + r.points, 0));
  const exactCount = rows.filter((r) => r.exact).length;
  const exactBonusAwarded = round2(exactCount * config.exactBonus);
  const thresholdScore = round2(
    rows.filter((r) => r.thresholdCorrect).length * config.thresholdPoints,
  );
  const totalAbsError = rows.reduce((s, r) => s + r.error, 0);
  const avgError = rows.length ? round2(totalAbsError / rows.length) : 0;

  return { rows, seatScore, exactBonusAwarded, thresholdScore, exactCount, avgError, totalAbsError };
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
      return parties.filter((p) => Number(actual[p.key] ?? 0) >= thresholdSeats).length;
    case "anyPartyBelowThreshold":
      return parties.some((p) => {
        const s = Number(actual[p.key] ?? 0);
        return s > 0 && s < thresholdSeats;
      });
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
}

export interface QuestionScoreResult {
  rows: QuestionBreakdownRow[];
  bonusScore: number;
}

function answersEqual(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return false;
  if (typeof a === "boolean" || typeof b === "boolean") {
    return toBool(a) === toBool(b);
  }
  if (typeof a === "number" || typeof b === "number") {
    return Number(a) === Number(b);
  }
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
  for (const q of questions) {
    if (!q.enabled) continue;
    const correct = q.autoResolve
      ? resolveAutoAnswer(q, parties, actualSeats, thresholdSeats, blocs)
      : (actualAnswers[q.qid] ?? null);
    const predicted = predictedAnswers[q.qid] ?? null;
    const isCorrect = answersEqual(predicted, correct);
    rows.push({
      qid: q.qid,
      predicted: predicted as QuestionBreakdownRow["predicted"],
      correct: correct as QuestionBreakdownRow["correct"],
      points: q.points,
      awarded: isCorrect ? q.points : 0,
    });
  }
  return { rows, bonusScore: round2(rows.reduce((s, r) => s + r.awarded, 0)) };
}

/* ------------------------------------------------------------- aggregate -- */

export interface ParticipantScore {
  seats: SeatScoreResult;
  questions: QuestionScoreResult;
  seatScore: number;
  bonusScore: number;
  total: number;
  avgError: number;
  exactCount: number;
}

export function scoreParticipant(args: {
  parties: PartyLite[];
  questions: QuestionLite[];
  blocs: { key: string }[];
  config: ScoringConfig;
  thresholdSeats: number;
  predictedSeats: SeatMap;
  predictedAnswers: AnswerMap;
  actualSeats: SeatMap;
  actualAnswers: AnswerMap;
}): ParticipantScore {
  const seats = scoreSeats(
    args.parties,
    args.predictedSeats,
    args.actualSeats,
    args.config,
    args.thresholdSeats,
  );
  const questions = scoreQuestions(
    args.questions,
    args.parties,
    args.predictedAnswers,
    args.actualAnswers,
    args.actualSeats,
    args.thresholdSeats,
    args.blocs,
  );
  const seatScore = round2(seats.seatScore + seats.exactBonusAwarded + seats.thresholdScore);
  const bonusScore = questions.bonusScore;
  return {
    seats,
    questions,
    seatScore,
    bonusScore,
    total: round2(seatScore + bonusScore),
    avgError: seats.avgError,
    exactCount: seats.exactCount,
  };
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
