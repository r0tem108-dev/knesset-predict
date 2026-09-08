import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Official election results, entered by a group admin. One doc per group.
 *
 * `stage` moves provisional -> final:
 *   provisional : Election-Night numbers; leaderboard shows "if these were final…"
 *   final       : locked-in official results; final leaderboard + awards
 */
const OfficialResultSchema = new Schema(
  {
    groupId: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      required: true,
      unique: true,
      index: true,
    },
    stage: { type: String, enum: ["provisional", "final"], default: "provisional" },
    /** party key -> actual seats. */
    seats: { type: Map, of: Number, default: {} },
    /**
     * question qid -> correct answer. Only needs manual entries for questions
     * without an autoResolve rule; auto ones are computed at scoring time.
     */
    answers: { type: Map, of: Schema.Types.Mixed, default: {} },
    /** Correct answer to the Wild Prediction question. */
    wildAnswer: { type: Schema.Types.Mixed, default: null },
    /** National voter turnout %, used for the turnout tie-breaker. */
    turnoutPercent: { type: Number, default: null },
    enteredBy: { type: String, default: "" },
    /** Bumped on every Election-Night update so callers can tell it changed. */
    revision: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type OfficialResultDoc = InferSchemaType<typeof OfficialResultSchema>;

export const OfficialResult =
  (models.OfficialResult as mongoose.Model<OfficialResultDoc>) ||
  model<OfficialResultDoc>("OfficialResult", OfficialResultSchema);
