import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const ConfidencePickSchema = new Schema(
  {
    /** party key the participant is most confident about */
    partyKey: { type: String, default: "" },
    /** the exact seat count they're betting on (their own prediction for it) */
    seats: { type: Number, default: 0 },
  },
  { _id: false },
);

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
    /** The one prediction the participant is most confident about. */
    confidencePick: { type: ConfidencePickSchema, default: () => ({}) },
    /** Answer to the group's Wild Prediction question. */
    wildAnswer: { type: Schema.Types.Mixed, default: null },
    /** False while a draft, true once the participant submitted a valid (=120) prediction. */
    submitted: { type: Boolean, default: false },
    submittedAt: { type: Date, default: null },
    /** How many times the prediction was saved (see PredictionVersion for the log). */
    revision: { type: Number, default: 0 },
  },
  { timestamps: true },
);

PredictionSchema.index({ groupId: 1, participantId: 1 }, { unique: true });

export type PredictionDoc = InferSchemaType<typeof PredictionSchema>;

export const Prediction =
  (models.Prediction as mongoose.Model<PredictionDoc>) ||
  model<PredictionDoc>("Prediction", PredictionSchema);
