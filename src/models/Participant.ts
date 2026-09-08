import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const ParticipantSchema = new Schema(
  {
    groupId: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    displayName: { type: String, required: true },
    /** Secret stored in the visitor's cookie; identifies them without an account. */
    token: { type: String, required: true, unique: true },
    /** True for the participant row that belongs to the group creator. */
    isAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
);

ParticipantSchema.index({ groupId: 1, displayName: 1 }, { unique: true });

export type ParticipantDoc = InferSchemaType<typeof ParticipantSchema>;

export const Participant =
  (models.Participant as mongoose.Model<ParticipantDoc>) ||
  model<ParticipantDoc>("Participant", ParticipantSchema);
