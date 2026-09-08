import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * Official election results, entered by a group admin. Stored per-group so each
 * group controls its own result entry and question resolution.
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
    /** party key -> actual seats. */
    seats: { type: Map, of: Number, default: {} },
    /**
     * question qid -> correct answer. Only needs manual entries for questions
     * without an autoResolve rule; auto ones are computed at scoring time.
     */
    answers: { type: Map, of: Schema.Types.Mixed, default: {} },
    enteredBy: { type: String, default: "" },
  },
  { timestamps: true },
);

export type OfficialResultDoc = InferSchemaType<typeof OfficialResultSchema>;

export const OfficialResult =
  (models.OfficialResult as mongoose.Model<OfficialResultDoc>) ||
  model<OfficialResultDoc>("OfficialResult", OfficialResultSchema);
