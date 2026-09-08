"use server";

import { revalidatePath } from "next/cache";
import {
  createGroup,
  joinGroup,
  savePrediction,
  lockGroup,
  updateQuestions,
  updateScoring,
  saveResults,
  AppError,
  type CreateGroupInput,
  type SavePredictionInput,
  type QuestionInput,
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
  return { ok: false, error: "Something went wrong. Please try again." };
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
  password?: string;
}): Promise<ActionResult<{ code: string }>> {
  try {
    const { participantToken } = await joinGroup(
      input.code,
      input.displayName,
      input.password,
    );
    await setParticipantToken(input.code.toUpperCase(), participantToken);
    return { ok: true, data: { code: input.code.toUpperCase() } };
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
    revalidatePath(`/g/${code}`);
    return { ok: true, data: prediction };
  } catch (err) {
    return fail(err);
  }
}

export async function lockGroupAction(code: string, lock: boolean): Promise<ActionResult> {
  try {
    const group = await lockGroup(code, lock);
    revalidatePath(`/g/${code}`);
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
    revalidatePath(`/g/${code}`);
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
    revalidatePath(`/g/${code}`);
    return { ok: true, data: group };
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
    revalidatePath(`/g/${code}`);
    return { ok: true, data: group };
  } catch (err) {
    return fail(err);
  }
}
