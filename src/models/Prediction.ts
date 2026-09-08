import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const PredictionSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    participantId: {
      type: Schema.Types.ObjectId,
      ref: "Participant",
      required: true,
      index: true,
    },
    /** party key -> predicted seats. Must sum to Election.totalSeats to submit. */
    seats: { type: Map, of: Number, default: {} },
    /** question qid -> answer (string | number | boolean). */
    answers: { type: Map, of: Schema.Types.Mixed, default: {} },
    /** False while a draft, true once the participant has submitted a valid (=120) prediction. */
    submitted: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

PredictionSchema.index({ groupId: 1, participantId: 1 }, { unique: true });

export type PredictionDoc = InferSchemaType<typeof PredictionSchema>;

export const Prediction =
  (models.Prediction as mongoose.Model<PredictionDoc>) ||
  model<PredictionDoc>("Prediction", PredictionSchema);
