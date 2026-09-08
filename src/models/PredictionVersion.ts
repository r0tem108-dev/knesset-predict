import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * An immutable snapshot of a participant's prediction, written every time they
 * save (draft or submit) before the deadline. Lets the app later show "your
 * prediction changed 3 times" and compare early vs final maps.
 */
const PredictionVersionSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    participantId: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
      index: true,
    },
    revision: { type: Number, required: true },
    seats: { type: Map, of: Number, default: {} },
    answers: { type: Map, of: Schema.Types.Mixed, default: {} },
    confidencePick: {
      type: new Schema(
        { partyKey: String, seats: Number },
        { _id: false },
      ),
      default: () => ({}),
    },
    wildAnswer: { type: Schema.Types.Mixed, default: null },
    submitted: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

PredictionVersionSchema.index({ groupId: 1, participantId: 1, revision: 1 }, { unique: true });

export type PredictionVersionDoc = InferSchemaType<typeof PredictionVersionSchema>;

export const PredictionVersion =
  (models.PredictionVersion as mongoose.Model<PredictionVersionDoc>) ||
  model<PredictionVersionDoc>("PredictionVersion", PredictionVersionSchema);
