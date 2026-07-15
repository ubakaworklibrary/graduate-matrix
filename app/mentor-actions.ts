"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { COMPETENCY_DEFINITIONS } from "@/lib/graduate-matrix/data/competencies";
import { loadCandidateAccessContext } from "@/lib/graduate-matrix/repositories/candidate-access";
import { createClient } from "@/lib/supabase/server";

const assessmentStatuses = new Set(["not-reviewed", "more-evidence", "demonstrated"]);
const recommendations = new Set(["not-set", "maintain-level", "progress-discussion"]);
const levels = ["L1", "L2", "L3", "L4", "L5"] as const;

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item.trim() : "";
}

function finish(candidateId: string, outcome: "success" | "error", message: string): never {
  revalidatePath("/");
  redirect(`/?candidate=${encodeURIComponent(candidateId)}&workflow=${outcome}&message=${encodeURIComponent(message)}`);
}

async function authorize(formData: FormData) {
  const candidateId = value(formData, "candidateId");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !candidateId) return null;
  const access = await loadCandidateAccessContext(user.id, candidateId);
  if (!access || access.selectedCandidateId !== candidateId || !access.canProgressSelectedCandidate) return null;
  const { data: profile } = await supabase.from("user_profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  if (!profile?.display_name.trim()) return null;
  return { candidateId, userId: user.id, displayName: profile.display_name, supabase };
}

async function ownedActiveCompetency(
  auth: NonNullable<Awaited<ReturnType<typeof authorize>>>,
  formData: FormData,
) {
  const id = value(formData, "candidateCompetencyId");
  const expectedCycleId = value(formData, "expectedCycleId");
  if (!id || !expectedCycleId) return null;
  const { data } = await auth.supabase
    .from("candidate_competencies")
    .select("id, candidate_id, active_cycle_id, competency_definition_id")
    .eq("id", id)
    .eq("candidate_id", auth.candidateId)
    .maybeSingle();
  if (!data?.active_cycle_id || data.active_cycle_id !== expectedCycleId) return null;
  return data;
}

export async function saveMentorAssessment(formData: FormData) {
  const auth = await authorize(formData);
  if (!auth) return finish(value(formData, "candidateId"), "error", "Candidate access is no longer authorized.");
  const competency = await ownedActiveCompetency(auth, formData);
  const status = value(formData, "status");
  const recommendation = value(formData, "recommendation");
  if (!competency?.active_cycle_id || !assessmentStatuses.has(status) || !recommendations.has(recommendation)) {
    return finish(auth.candidateId, "error", "The assessment input or active cycle is invalid.");
  }
  const assessmentId = value(formData, "assessmentId");
  const record = {
    candidate_id: auth.candidateId,
    candidate_competency_id: competency.id,
    cycle_id: competency.active_cycle_id,
    status,
    recommendation,
    next_action: value(formData, "nextAction"),
    assessed_at: new Date().toISOString(),
    assessed_by_user_id: auth.userId,
    assessed_by_display_name: auth.displayName,
  };
  const { data: latestAssessment, error: latestAssessmentError } = await auth.supabase
    .from("mentor_assessments")
    .select("id")
    .eq("candidate_id", auth.candidateId)
    .eq("candidate_competency_id", competency.id)
    .eq("cycle_id", competency.active_cycle_id)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (
    latestAssessmentError ||
    (assessmentId && latestAssessment?.id !== assessmentId) ||
    (!assessmentId && latestAssessment)
  ) {
    return finish(auth.candidateId, "error", "The current assessment changed. Refresh before saving.");
  }
  const result = assessmentId
    ? await auth.supabase.from("mentor_assessments").update(record).eq("id", assessmentId).eq("candidate_id", auth.candidateId).eq("candidate_competency_id", competency.id).eq("cycle_id", competency.active_cycle_id).select("id").maybeSingle()
    : await auth.supabase.from("mentor_assessments").insert(record).select("id").single();
  if (result.error || !result.data) return finish(auth.candidateId, "error", "The assessment could not be saved.");
  return finish(auth.candidateId, "success", assessmentId ? "Assessment updated." : "Assessment recorded.");
}

export async function addCompetencyCycleReview(formData: FormData) {
  const auth = await authorize(formData);
  if (!auth) return finish(value(formData, "candidateId"), "error", "Candidate access is no longer authorized.");
  const competency = await ownedActiveCompetency(auth, formData);
  const status = value(formData, "status");
  const recommendation = value(formData, "recommendation");
  if (!competency?.active_cycle_id || !assessmentStatuses.has(status) || !recommendations.has(recommendation)) {
    return finish(auth.candidateId, "error", "The cycle review input is invalid.");
  }
  const { error } = await auth.supabase.from("competency_cycle_reviews").insert({
    candidate_id: auth.candidateId,
    candidate_competency_id: competency.id,
    cycle_id: competency.active_cycle_id,
    status,
    recommendation,
    next_action: value(formData, "nextAction") || null,
    reviewed_at: new Date().toISOString(),
    reviewed_by_user_id: auth.userId,
    reviewed_by_display_name: auth.displayName,
  });
  return error
    ? finish(auth.candidateId, "error", "The cycle review could not be recorded.")
    : finish(auth.candidateId, "success", "Cycle review recorded.");
}

export async function initializeCompetency(formData: FormData) {
  const auth = await authorize(formData);
  if (!auth) return finish(value(formData, "candidateId"), "error", "Candidate access is no longer authorized.");
  const definitionId = value(formData, "competencyDefinitionId");
  if (!COMPETENCY_DEFINITIONS.some(({ id }) => id === definitionId)) return finish(auth.candidateId, "error", "The competency is invalid.");
  const { error } = await auth.supabase.rpc("initialize_candidate_competency", {
    p_candidate_id: auth.candidateId,
    p_competency_definition_id: definitionId,
    p_initial_level: "L1",
    p_occurred_at: new Date().toISOString(),
    p_performed_by_display_name: auth.displayName,
    p_reason: value(formData, "reason"),
  });
  return error ? finish(auth.candidateId, "error", "Initialization was rejected.") : finish(auth.candidateId, "success", "Competency initialized at L1.");
}

export async function resetCompetencyCycle(formData: FormData) {
  const auth = await authorize(formData);
  if (!auth) return finish(value(formData, "candidateId"), "error", "Candidate access is no longer authorized.");
  const competency = await ownedActiveCompetency(auth, formData);
  if (!competency?.active_cycle_id) return finish(auth.candidateId, "error", "The active cycle changed or is missing.");
  const { error } = await auth.supabase.rpc("reset_active_competency_cycle", {
    p_candidate_competency_id: competency.id,
    p_occurred_at: new Date().toISOString(),
    p_performed_by_display_name: auth.displayName,
    p_reason: value(formData, "reason"),
  });
  return error ? finish(auth.candidateId, "error", "Cycle reset was rejected.") : finish(auth.candidateId, "success", "Active cycle reset.");
}

export async function reopenCompetencyLevel(formData: FormData) {
  const auth = await authorize(formData);
  if (!auth) return finish(value(formData, "candidateId"), "error", "Candidate access is no longer authorized.");
  const competency = await ownedActiveCompetency(auth, formData);
  const target = value(formData, "level");
  if (!competency?.active_cycle_id || !levels.includes(target as typeof levels[number])) return finish(auth.candidateId, "error", "The reopen request is invalid or stale.");
  const { data: active } = await auth.supabase.from("competency_cycles").select("level").eq("id", competency.active_cycle_id).eq("candidate_competency_id", competency.id).maybeSingle();
  const targetIndex = levels.indexOf(target as typeof levels[number]);
  const activeIndex = levels.indexOf(active?.level as typeof levels[number]);
  if (targetIndex < 0 || activeIndex <= targetIndex) return finish(auth.candidateId, "error", "Only an earlier level can be reopened.");
  const { data: cycles } = await auth.supabase.from("competency_cycles").select("id, level, created_at").eq("candidate_competency_id", competency.id).order("created_at", { ascending: false });
  const represented = levels.slice(targetIndex + 1, activeIndex + 1).map((level) => level === active?.level ? competency.active_cycle_id as string : cycles?.find((cycle) => cycle.level === level)?.id).filter((id): id is string => Boolean(id));
  if (represented.length !== activeIndex - targetIndex) return finish(auth.candidateId, "error", "Later-level cycle history is incomplete.");
  const { error } = await auth.supabase.rpc("reopen_earlier_competency_level", {
    p_candidate_competency_id: competency.id, p_level: target,
    p_represented_cycle_ids: represented, p_occurred_at: new Date().toISOString(),
    p_performed_by_display_name: auth.displayName, p_reason: value(formData, "reason"),
  });
  return error ? finish(auth.candidateId, "error", "Earlier-level reopening was rejected.") : finish(auth.candidateId, "success", `${target} reopened.`);
}

export async function completeCompetencyCycle(formData: FormData) {
  const auth = await authorize(formData);
  if (!auth) return finish(value(formData, "candidateId"), "error", "Candidate access is no longer authorized.");
  const competency = await ownedActiveCompetency(auth, formData);
  if (!competency?.active_cycle_id) return finish(auth.candidateId, "error", "The active cycle changed or is missing.");
  const assessmentId = value(formData, "assessmentId");
  const mentorId = value(formData, "mentorUserId");
  const managerId = value(formData, "managerUserId");
  const now = new Date().toISOString();
  const { data: relationships } = await auth.supabase
    .from("candidate_relationships")
    .select("user_id, display_name, relationship_type, starts_at, ends_at")
    .eq("candidate_id", auth.candidateId)
    .in("relationship_type", ["mentor", "manager"])
    .lte("starts_at", now)
    .or(`ends_at.is.null,ends_at.gte.${now}`);
  const mentor = relationships?.find((item) => item.relationship_type === "mentor" && item.user_id === mentorId);
  const manager = relationships?.find((item) => item.relationship_type === "manager" && item.user_id === managerId);
  if (!mentor?.user_id || !manager?.user_id || !assessmentId || formData.get("managerConfirmed") !== "yes") return finish(auth.candidateId, "error", "Mentor assessment and manager sign-off are required.");
  const carry = formData.getAll("carryActionId").filter((item): item is string => typeof item === "string").map((actionId) => ({ actionId, newDueDate: value(formData, `due-${actionId}`) }));
  const { error } = await auth.supabase.rpc("complete_active_competency_cycle", {
    p_candidate_competency_id: competency.id,
    p_mentor_assessment_id: assessmentId,
    p_occurred_at: now,
    p_performed_by_display_name: auth.displayName,
    p_mentor_completed_at: now,
    p_mentor_completed_by_user_id: mentor.user_id,
    p_mentor_completed_by_display_name: mentor.display_name,
    p_manager_signed_off_at: now,
    p_manager_signed_off_by_user_id: manager.user_id,
    p_manager_signed_off_by_display_name: manager.display_name,
    p_manager_signoff_confirmed: true,
    p_reason: value(formData, "reason"),
    p_evidence_basis: value(formData, "evidenceBasis"),
    p_carry_forward_selections: carry,
  });
  return error ? finish(auth.candidateId, "error", "Cycle completion was rejected; no progression was applied.") : finish(auth.candidateId, "success", "Cycle completed and the Matrix refreshed.");
}
