"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadCandidateAccessContext } from "@/lib/graduate-matrix/repositories/candidate-access";
import { PLACEMENT_DISCIPLINE_CODES } from "@/lib/graduate-matrix/data/placements";
import type { PlacementDiscipline, PlacementTaskProgress } from "@/types/graduate-matrix";

const PROGRESS_CODES: readonly PlacementTaskProgress[] = ["not-started", "in-progress", "complete"];

function value(formData: FormData, name: string): string {
  const item = formData.get(name);
  return typeof item === "string" ? item.trim() : "";
}

function isPlacementDiscipline(value: string): value is PlacementDiscipline {
  return PLACEMENT_DISCIPLINE_CODES.includes(value as PlacementDiscipline);
}

function finish(candidateId: string, placementDiscipline: string, outcome: "success" | "error", message: string): never {
  revalidatePath("/");
  const params = new URLSearchParams({
    candidate: candidateId,
    section: "Portfolio",
    portfolioTab: "placements",
    workflow: outcome,
    message,
  });
  if (placementDiscipline) params.set("placementDiscipline", placementDiscipline);
  redirect(`/?${params.toString()}`);
}

// The write RPCs raise controlled, user-safe messages by design (reviewed
// against the migration) — relaying error.message directly is intentional,
// not an oversight, and never leaks SQLSTATE or stack traces.
function rpcErrorMessage(error: { message?: string } | null, fallback: string): string {
  return error?.message?.trim() ? error.message : fallback;
}

async function authorizePlacementAccess(candidateId: string) {
  if (!candidateId) return null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const access = await loadCandidateAccessContext(user.id, candidateId);
  if (!access || access.selectedCandidateId !== candidateId) return null;
  return { supabase };
}

export async function assignPlacementTasks(formData: FormData) {
  const candidateId = value(formData, "candidateId");
  const placementDiscipline = value(formData, "placementDiscipline");
  const auth = await authorizePlacementAccess(candidateId);
  if (!auth) return finish(candidateId, placementDiscipline, "error", "Placement access is no longer authorized.");

  if (!isPlacementDiscipline(placementDiscipline)) {
    return finish(candidateId, placementDiscipline, "error", "The placement discipline is not recognised.");
  }

  const rawIds = formData.getAll("taskDefinitionIds");
  if (rawIds.length === 0 || rawIds.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    return finish(candidateId, placementDiscipline, "error", "Select at least one placement task.");
  }
  const taskDefinitionIds = rawIds as string[];
  if (new Set(taskDefinitionIds).size !== taskDefinitionIds.length) {
    return finish(candidateId, placementDiscipline, "error", "Placement task selections cannot contain duplicates.");
  }

  const { error } = await auth.supabase.rpc("assign_candidate_placement_tasks", {
    p_candidate_id: candidateId,
    p_placement_discipline: placementDiscipline,
    p_task_definition_ids: taskDefinitionIds,
  });

  return finish(
    candidateId,
    placementDiscipline,
    error ? "error" : "success",
    error ? rpcErrorMessage(error, "The placement tasks could not be assigned.") : "Placement tasks assigned.",
  );
}

export async function updatePlacementTaskProgress(formData: FormData) {
  const candidateId = value(formData, "candidateId");
  const placementDiscipline = value(formData, "placementDiscipline");
  const candidatePlacementTaskId = value(formData, "candidatePlacementTaskId");
  const auth = await authorizePlacementAccess(candidateId);
  if (!auth) return finish(candidateId, placementDiscipline, "error", "Placement access is no longer authorized.");

  if (!candidatePlacementTaskId) {
    return finish(candidateId, placementDiscipline, "error", "The placement task is missing or invalid.");
  }

  const candidateProgress = value(formData, "candidateProgress");
  if (!PROGRESS_CODES.includes(candidateProgress as PlacementTaskProgress)) {
    return finish(candidateId, placementDiscipline, "error", "The candidate placement progress value is not recognised.");
  }

  const candidateNote = value(formData, "candidateNote").slice(0, 1000);

  const { error } = await auth.supabase.rpc("update_candidate_placement_task_progress", {
    p_candidate_placement_task_id: candidatePlacementTaskId,
    p_candidate_progress: candidateProgress,
    p_candidate_note: candidateNote,
  });

  return finish(
    candidateId,
    placementDiscipline,
    error ? "error" : "success",
    error ? rpcErrorMessage(error, "The placement task progress could not be saved.") : "Placement task progress saved.",
  );
}

export async function recordPlacementTaskVerification(formData: FormData) {
  const candidateId = value(formData, "candidateId");
  const placementDiscipline = value(formData, "placementDiscipline");
  const candidatePlacementTaskId = value(formData, "candidatePlacementTaskId");
  const auth = await authorizePlacementAccess(candidateId);
  if (!auth) return finish(candidateId, placementDiscipline, "error", "Placement access is no longer authorized.");

  if (!candidatePlacementTaskId) {
    return finish(candidateId, placementDiscipline, "error", "The placement task is missing or invalid.");
  }

  const decision = value(formData, "decision");
  if (decision !== "verified" && decision !== "changes-required") {
    return finish(candidateId, placementDiscipline, "error", "The verification decision is not recognised.");
  }

  const mentorComment = value(formData, "mentorComment").slice(0, 1000);

  const { error } = await auth.supabase.rpc("record_candidate_placement_task_verification", {
    p_candidate_placement_task_id: candidatePlacementTaskId,
    p_decision: decision,
    p_mentor_comment: mentorComment,
  });

  return finish(
    candidateId,
    placementDiscipline,
    error ? "error" : "success",
    error ? rpcErrorMessage(error, "The placement verification could not be recorded.") : "Placement verification recorded.",
  );
}
