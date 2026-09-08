import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const PartySchema = new Schema(
  {
    electionId: { type: Schema.Types.ObjectId, ref: "Election", required: true, index: true },
    /** Stable identifier used as the key in prediction/result seat maps. */
    key: { type: String, required: true },
    name: { type: String, required: true },
    nameHe: { type: String, required: true },
    abbr: { type: String, default: "" },
    /** Hex colour used across the UI (chips, bars, charts). */
    color: { type: String, default: "#64748b" },
    logoUrl: { type: String, default: "" },
    /** Bloc key, matching one of Election.blocs[].key (or "" if unaligned). */
    bloc: { type: String, default: "" },
    /** Display order in the prediction form. */
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

PartySchema.index({ electionId: 1, key: 1 }, { unique: true });

export type PartyDoc = InferSchemaType<typeof PartySchema>;

export const Party =
  (models.Party as mongoose.Model<PartyDoc>) || model<PartyDoc>("Party", PartySchema);
