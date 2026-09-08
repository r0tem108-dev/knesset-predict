import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const BlocSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    labelHe: { type: String, required: true },
  },
  { _id: false },
);

const ElectionSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameHe: { type: String, required: true },
    /** Official election day. Used for the public countdown. */
    electionDay: { type: Date, required: true },
    /** Deadline for submitting candidate lists to the Central Elections Committee. */
    listSubmissionDate: { type: Date, default: null },
    totalSeats: { type: Number, default: 120 },
    /** National electoral threshold, percent of valid votes. */
    thresholdPercent: { type: Number, default: 3.25 },
    /** Rough seat-equivalent of the threshold, used to derive "passed threshold". */
    thresholdSeats: { type: Number, default: 4 },
    /** Window (days) for the "was a coalition formed?" question. */
    coalitionWindowDays: { type: Number, default: 45 },
    blocs: { type: [BlocSchema], default: [] },
  },
  { timestamps: true },
);

export type ElectionDoc = InferSchemaType<typeof ElectionSchema>;

export const Election =
  (models.Election as mongoose.Model<ElectionDoc>) ||
  model<ElectionDoc>("Election", ElectionSchema);
