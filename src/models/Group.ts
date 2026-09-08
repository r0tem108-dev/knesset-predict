import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * A bonus / side question attached to a group. Admins can add, remove, edit,
 * reorder and re-point these before the deadline.
 */
export const QuestionSchema = new Schema(
  {
    /** Stable id used as the key in prediction/result answer maps. */
    qid: { type: String, required: true },
    type: {
      type: String,
      enum: ["party", "choice", "boolean", "number"],
      required: true,
    },
    text: { type: String, required: true },
    textHe: { type: String, required: true },
    /** For "choice" questions. For "party" questions options are the ballot parties. */
    options: {
      type: [{ value: String, label: String }],
      default: [],
    },
    points: { type: Number, default: 5 },
    /**
     * If set, the correct answer is derived automatically from the official
     * seat results instead of being entered by hand.
     *   largestParty          -> party key with the most seats
     *   blocWinner            -> bloc key with the most combined seats
     *   partyCount            -> number of lists that entered the Knesset
     *   anyPartyBelowThreshold-> boolean: did a list that ran fail the threshold
     */
    autoResolve: {
      type: String,
      enum: ["largestParty", "blocWinner", "partyCount", "anyPartyBelowThreshold", ""],
      default: "",
    },
    /** "turnout" questions are treated as the tie-breaker (closest wins ties). */
    kind: { type: String, enum: ["", "turnout"], default: "" },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

/**
 * The "Wild Prediction" — one free-form question the admin writes, with custom
 * answer options, resolved by hand after the election.
 */
const WildQuestionSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    text: { type: String, default: "" },
    textHe: { type: String, default: "" },
    options: { type: [{ value: String, label: String }], default: [] },
    points: { type: Number, default: 15 },
  },
  { _id: false },
);

const ScoreTierSchema = new Schema(
  { maxError: { type: Number, required: true }, points: { type: Number, required: true } },
  { _id: false },
);

const ScoringConfigSchema = new Schema(
  {
    /** Strategy id, resolved in src/lib/scoring.ts */
    seatMethod: { type: String, enum: ["tiered", "linear"], default: "tiered" },
    /** For "tiered": ordered best-first. Off-by-N uses the first tier with maxError >= N. */
    tiers: {
      type: [ScoreTierSchema],
      default: [
        { maxError: 0, points: 10 },
        { maxError: 1, points: 7 },
        { maxError: 2, points: 5 },
        { maxError: 3, points: 3 },
        { maxError: 4, points: 1 },
      ],
    },
    /** For "linear": points = max(0, base - slope * error). */
    linearBase: { type: Number, default: 10 },
    linearSlope: { type: Number, default: 2 },
    /** Extra points added for every exactly-correct list that entered the Knesset. */
    exactBonus: { type: Number, default: 0 },
    /** Bonus for correctly predicting a list DOES cross the threshold. */
    thresholdEnterPoints: { type: Number, default: 2 },
    /** Bonus for correctly predicting a list does NOT cross the threshold. */
    thresholdFailPoints: { type: Number, default: 2 },
    /**
     * Penalty per seat assigned to a list that ultimately got 0. Predicting 1
     * seat for a party that fails costs 1x; predicting 7 costs 7x. Applied only
     * when the list actually failed the threshold.
     */
    failedListSeatPenaltyPerSeat: { type: Number, default: 1 },
    /** Bonus if the Confidence Pick seat prediction is exactly right. */
    confidencePickBonus: { type: Number, default: 10 },
  },
  { _id: false },
);

const GroupSettingsSchema = new Schema(
  {
    /**
     * Show everyone's predictions after lock (Reveal Mode). Predictions are
     * ALWAYS hidden before lock — that is not configurable.
     */
    revealPredictionsAfterLock: { type: Boolean, default: true },
  },
  { _id: false },
);

const GroupSchema = new Schema(
  {
    electionId: { type: Schema.Types.ObjectId, ref: "Election", required: true, index: true },
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    creatorName: { type: String, required: true },
    passwordHash: { type: String, default: "" },
    /** Secret handed to the creator; grants admin actions on the group. */
    adminToken: { type: String, required: true },
    predictionDeadline: { type: Date, required: true },
    /** Admin can lock early; otherwise lock is implied once the deadline passes. */
    lockedAt: { type: Date, default: null },
    settings: { type: GroupSettingsSchema, default: () => ({}) },
    scoring: { type: ScoringConfigSchema, default: () => ({}) },
    questions: { type: [QuestionSchema], default: [] },
    wildQuestion: { type: WildQuestionSchema, default: () => ({}) },
    /** Set once an admin publishes results (provisional or final) and scores go live. */
    resultsPublishedAt: { type: Date, default: null },
    /** Set once the admin marks the official results FINAL. */
    resultsFinalizedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type GroupDoc = InferSchemaType<typeof GroupSchema>;

export const Group =
  (models.Group as mongoose.Model<GroupDoc>) || model<GroupDoc>("Group", GroupSchema);
