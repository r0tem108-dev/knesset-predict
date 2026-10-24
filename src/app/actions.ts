"use server";

import { revalidatePath } from "next/cache";
import {
  createGroup,
  joinGroup,
  savePrediction,
  lockGroup,
  updateGroupSettings,
  updateQuestions,
  updateWildQuestion,
  updateScoring,
  updateParties,
  saveResults,
  renameParticipant,
  adminRenameParticipant,
  adminDeleteParticipant,
  adminResetPin,
  cleanupBelowThresholdPredictions,
  type BelowThresholdCleanupItem,
  AppError,
  type CreateGroupInput,
  type SavePredictionInput,
  type QuestionInput,
  type PartyInput,
  type ResultsInput,
} from "@/lib/data";
import { setAdminToken, setParticipantToken } from "@/lib/session";
import type { ScoringConfig } from "@/lib/scoring";

export interface ActionResult<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

function fail(err: unknown): ActionResult<never> {
  if (err instanceof AppError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "משהו השתבש. נסו שוב." };
}

function revalidateGroup(code: string) {
  revalidatePath(`/g/${code}`);
  revalidatePath(`/g/${code}/predict`);
  revalidatePath(`/g/${code}/admin`);
  revalidatePath(`/g/${code}/compare`);
}

export async function createGroupAction(
  input: CreateGroupInput,
): Promise<ActionResult<{ code: string }>> {
  try {
    const { group, adminToken, participantToken } = await createGroup(input);
    await setAdminToken(group.code, adminToken);
    await setParticipantToken(group.code, participantToken);
    return { ok: true, data: { code: group.code } };
  } catch (err) {
    return fail(err);
  }
}

export async function joinGroupAction(input: {
  code: string;
  displayName: string;
  pin: string;
  password?: string;
}): Promise<ActionResult<{ code: string; returning: boolean }>> {
  try {
    const { participantToken, returning, adminToken } = await joinGroup(
      input.code,
      input.displayName,
      input.pin,
      input.password,
    );
    await setParticipantToken(input.code.toUpperCase(), participantToken);
    if (adminToken) await setAdminToken(input.code.toUpperCase(), adminToken);
    return { ok: true, data: { code: input.code.toUpperCase(), returning } };
  } catch (err) {
    return fail(err);
  }
}

export async function adminResetPinAction(
  code: string,
  participantId: string,
  newPin: string,
): Promise<ActionResult> {
  try {
    await adminResetPin(code, participantId, newPin);
    revalidateGroup(code);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function renameAction(
  code: string,
  newName: string,
): Promise<ActionResult> {
  try {
    const p = await renameParticipant(code, newName);
    revalidateGroup(code);
    return { ok: true, data: p };
  } catch (err) {
    return fail(err);
  }
}

export async function adminRenameAction(
  code: string,
  participantId: string,
  newName: string,
): Promise<ActionResult> {
  try {
    const p = await adminRenameParticipant(code, participantId, newName);
    revalidateGroup(code);
    return { ok: true, data: p };
  } catch (err) {
    return fail(err);
  }
}

export async function adminDeleteParticipantAction(
  code: string,
  participantId: string,
): Promise<ActionResult> {
  try {
    await adminDeleteParticipant(code, participantId);
    revalidateGroup(code);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function cleanupBelowThresholdAction(
  code: string,
): Promise<ActionResult<BelowThresholdCleanupItem[]>> {
  try {
    const affected = await cleanupBelowThresholdPredictions(code);
    revalidateGroup(code);
    return { ok: true, data: affected };
  } catch (err) {
    return fail(err);
  }
}

export async function savePredictionAction(
  code: string,
  input: SavePredictionInput,
): Promise<ActionResult> {
  try {
    const prediction = await savePrediction(code, input);
    revalidateGroup(code);
    return { ok: true, data: prediction };
  } catch (err) {
    return fail(err);
  }
}

export async function lockGroupAction(code: string, lock: boolean): Promise<ActionResult> {
  try {
    const group = await lockGroup(code, lock);
    revalidateGroup(code);
    return { ok: true, data: group };
  } catch (err) {
    return fail(err);
  }
}

export async function updateGroupSettingsAction(
  code: string,
  input: { predictionDeadline?: string; showPredictions?: boolean },
): Promise<ActionResult> {
  try {
    const group = await updateGroupSettings(code, input);
    revalidateGroup(code);
    return { ok: true, data: group };
  } catch (err) {
    return fail(err);
  }
}

export async function updateQuestionsAction(
  code: string,
  questions: QuestionInput[],
): Promise<ActionResult> {
  try {
    const group = await updateQuestions(code, questions);
    revalidateGroup(code);
    return { ok: true, data: group };
  } catch (err) {
    return fail(err);
  }
}

export async function updateWildQuestionAction(
  code: string,
  wild: {
    enabled: boolean;
    textHe: string;
    options: { value: string; label: string }[];
    points: number;
  },
): Promise<ActionResult> {
  try {
    const group = await updateWildQuestion(code, wild);
    revalidateGroup(code);
    return { ok: true, data: group };
  } catch (err) {
    return fail(err);
  }
}

export async function updateScoringAction(
  code: string,
  scoring: Partial<ScoringConfig>,
): Promise<ActionResult> {
  try {
    const group = await updateScoring(code, scoring);
    revalidateGroup(code);
    return { ok: true, data: group };
  } catch (err) {
    return fail(err);
  }
}

export async function updatePartiesAction(
  code: string,
  parties: PartyInput[],
): Promise<ActionResult> {
  try {
    const updated = await updateParties(code, parties);
    revalidateGroup(code);
    return { ok: true, data: updated };
  } catch (err) {
    return fail(err);
  }
}

export async function saveResultsAction(
  code: string,
  input: ResultsInput,
): Promise<ActionResult> {
  try {
    const group = await saveResults(code, input);
    revalidateGroup(code);
    return { ok: true, data: group };
  } catch (err) {
    return fail(err);
  }
}
