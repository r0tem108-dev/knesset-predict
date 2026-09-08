import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * An electoral list ("party") belonging to a specific Election. Never hard-coded
 * elsewhere — all party data lives here so a group admin can correct it (names,
 * ballot letters, colours, status) and future elections just add new rows.
 */
const PartySchema = new Schema(
  {
    electionId: { type: Schema.Types.ObjectId, ref: "Election", required: true, index: true },
    /** Stable identifier used as the key in prediction/result seat maps. */
    key: { type: String, required: true },
    /** Official submitted list name. */
    name: { type: String, required: true },
    nameHe: { type: String, required: true },
    /** Short / common name people actually use. */
    commonName: { type: String, default: "" },
    commonNameHe: { type: String, default: "" },
    /** Ballot letters (אותיות הפתק) — often only known after lists are submitted. */
    ballotLetters: { type: String, default: "" },
    /** Party leader / list head. */
    leader: { type: String, default: "" },
    leaderHe: { type: String, default: "" },
    /** Hex colour used across the UI (chips, bars, Knesset chart). */
    color: { type: String, default: "#64748b" },
    logoUrl: { type: String, default: "" },
    /** Bloc key, matching one of Election.blocs[].key (or "" if unaligned). */
    bloc: { type: String, default: "" },
    /** active = on the ballot; withdrawn / disqualified = not competing. */
    status: {
      type: String,
      enum: ["active", "withdrawn", "disqualified"],
      default: "active",
    },
    /** Display order in the prediction form. */
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

PartySchema.index({ electionId: 1, key: 1 }, { unique: true });

export type PartyDoc = InferSchemaType<typeof PartySchema>;

export const Party =
  (models.Party as mongoose.Model<PartyDoc>) || model<PartyDoc>("Party", PartySchema);
