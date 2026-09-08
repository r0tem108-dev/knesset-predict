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
     *   partyCount            -> number of parties at/above the threshold
     *   anyPartyBelowThreshold-> boolean: did a party that ran fail the threshold
     */
    autoResolve: {
      type: String,
      enum: ["largestParty", "blocWinner", "partyCount", "anyPartyBelowThreshold", ""],
      default: "",
    },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
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
    /** Extra points added for every exactly-correct party. */
    exactBonus: { type: Number, default: 0 },
    /** Points per party whose "passed threshold?" status is predicted correctly. */
    thresholdPoints: { type: Number, default: 0 },
  },
  { _id: false },
);

const GroupSettingsSchema = new Schema(
  {
    /** Participants can see each other's predictions before the deadline. */
    revealPredictionsBeforeLock: { type: Boolean, default: false },
    /** Participants can see each other's predictions after lock. */
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
    /** Set once an admin has entered official results and scores are live. */
    resultsPublishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export type GroupDoc = InferSchemaType<typeof GroupSchema>;

export const Group =
  (models.Group as mongoose.Model<GroupDoc>) || model<GroupDoc>("Group", GroupSchema);
