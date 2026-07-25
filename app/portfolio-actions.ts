"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { loadCandidateAccessContext } from "@/lib/graduate-matrix/repositories/candidate-access";
import { createClient } from "@/lib/supabase/server";

const verificationOutcomes = new Set(["verified", "reverification-required"]);
const levels = new Set(["L1", "L2", "L3", "L4", "L5"]);
const evidenceMethods = new Set(["carr", "star", "psar"]);
const actionOwners = new Set(["graduate", "mentor", "shared"]);
const actionPriorities = new Set(["low", "medium", "high"]);

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item.trim() : "";
}

function finish(candidateId: string, outcome: "success" | "error", message: string): never {
  revalidatePath("/");
  redirect(`/?candidate=${encodeURIComponent(candidateId)}&workflow=${outcome}&message=${encodeURIComponent(message)}`);
}

/** Mentor / org-admin gate — mirrors app/mentor-actions.ts's authorize(). */
async function authorizeMentor(formData: FormData) {
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

/** Candidate-self / org-admin gate (mirrors RLS's can_edit_candidate_evidence — self or admin, not mentor). */
async function authorizeCandidateSelf(formData: FormData) {
  const candidateId = value(formData, "candidateId");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !candidateId) return null;
  const { data: candidate } = await supabase
    .from("candidates")
    .select("id, user_id, organization_id")
    .eq("id", candidateId)
    .maybeSingle();
  if (!candidate) return null;
  let authorized = candidate.user_id === user.id;
  if (!authorized) {
    const { data: membership } = await supabase
      .from("organization_memberships")
      .select("membership_role")
      .eq("organization_id", candidate.organization_id)
      .eq("user_id", user.id)
      .is("archived_at", null)
      .maybeSingle();
    authorized = membership?.membership_role === "organization-admin";
  }
  if (!authorized) return null;
  const { data: profile } = await supabase.from("user_profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  if (!profile?.display_name.trim()) return null;
  return { candidateId, userId: user.id, displayName: profile.display_name, supabase };
}

export async function recordEvidenceVerification(formData: FormData) {
  const auth = await authorizeMentor(formData);
  if (!auth) return finish(value(formData, "candidateId"), "error", "Candidate access is no longer authorized.");
  const evidenceId = value(formData, "evidenceId");
  const outcome = value(formData, "outcome");
  if (!evidenceId || !verificationOutcomes.has(outcome)) return finish(auth.candidateId, "error", "The verification outcome is invalid.");
  const { data: evidence } = await auth.supabase.from("evidence_entries").select("id, candidate_id").eq("id", evidenceId).eq("candidate_id", auth.candidateId).maybeSingle();
  if (!evidence) return finish(auth.candidateId, "error", "The evidence entry could not be found.");
  const { error } = await auth.supabase.from("evidence_verification_events").insert({
    evidence_id: evidenceId,
    event_type: outcome,
    actor_user_id: auth.userId,
    actor_display_name: auth.displayName,
    occurred_at: new Date().toISOString(),
    reason: value(formData, "reason") || null,
  });
  return error
    ? finish(auth.candidateId, "error", "The verification could not be recorded.")
    : finish(auth.candidateId, "success", outcome === "verified" ? "Evidence verified." : "Evidence marked for re-review.");
}

export async function createDevelopmentAction(formData: FormData) {
  const auth = await authorizeMentor(formData);
  if (!auth) return finish(value(formData, "candidateId"), "error", "Candidate access is no longer authorized.");
  const candidateCompetencyId = value(formData, "candidateCompetencyId");
  const expectedCycleId = value(formData, "expectedCycleId");
  const title = value(formData, "title");
  const owner = value(formData, "owner");
  const priority = value(formData, "priority");
  const dueDate = value(formData, "dueDate") || null;
  if (!candidateCompetencyId || !expectedCycleId || !title || !actionOwners.has(owner) || !actionPriorities.has(priority)) return finish(auth.candidateId, "error", "The development action is missing required information.");
  const { data: competency } = await auth.supabase.from("candidate_competencies").select("id, active_cycle_id").eq("id", candidateCompetencyId).eq("candidate_id", auth.candidateId).maybeSingle();
  if (!competency || competency.active_cycle_id !== expectedCycleId) return finish(auth.candidateId, "error", "The active cycle changed. Refresh before adding the action.");
  const { error } = await auth.supabase.from("development_actions").insert({ candidate_id: auth.candidateId, candidate_competency_id: candidateCompetencyId, cycle_id: expectedCycleId, title, notes: value(formData, "notes"), owner, priority, status: "open", due_date: dueDate, created_by_user_id: auth.userId, created_by_display_name: auth.displayName });
  return error ? finish(auth.candidateId, "error", "The development action could not be created.") : finish(auth.candidateId, "success", "Development action added.");
}

export async function markActionComplete(formData: FormData) {
  const auth = await authorizeMentor(formData);
  if (!auth) return finish(value(formData, "candidateId"), "error", "Candidate access is no longer authorized.");
  const actionId = value(formData, "actionId");
  const now = new Date().toISOString();
  const { error } = await auth.supabase
    .from("development_actions")
    .update({ status: "completed", completed_at: now, completed_by_user_id: auth.userId, completed_by_display_name: auth.displayName })
    .eq("id", actionId)
    .eq("candidate_id", auth.candidateId);
  return error ? finish(auth.candidateId, "error", "The action could not be marked complete.") : finish(auth.candidateId, "success", "Action marked complete.");
}

export async function reopenAction(formData: FormData) {
  const auth = await authorizeMentor(formData);
  if (!auth) return finish(value(formData, "candidateId"), "error", "Candidate access is no longer authorized.");
  const actionId = value(formData, "actionId");
  const { error } = await auth.supabase
    .from("development_actions")
    .update({ status: "open", completed_at: null, completed_by_user_id: null, completed_by_display_name: null })
    .eq("id", actionId)
    .eq("candidate_id", auth.candidateId);
  return error ? finish(auth.candidateId, "error", "The action could not be reopened.") : finish(auth.candidateId, "success", "Action reopened.");
}

export async function archiveAction(formData: FormData) {
  const auth = await authorizeMentor(formData);
  if (!auth) return finish(value(formData, "candidateId"), "error", "Candidate access is no longer authorized.");
  const actionId = value(formData, "actionId");
  const reason = value(formData, "reason");
  if (!reason) return finish(auth.candidateId, "error", "An archive reason is required.");
  const { error } = await auth.supabase
    .from("development_actions")
    .update({ archived_at: new Date().toISOString(), archived_by_user_id: auth.userId, archived_by_display_name: auth.displayName, archive_reason: reason })
    .eq("id", actionId)
    .eq("candidate_id", auth.candidateId);
  return error ? finish(auth.candidateId, "error", "The action could not be deleted.") : finish(auth.candidateId, "success", "Action deleted.");
}

export async function submitEvidenceResponse(formData: FormData) {
  const auth = await authorizeCandidateSelf(formData);
  if (!auth) return finish(value(formData, "candidateId"), "error", "Candidate access is no longer authorized.");

  const actionId = value(formData, "actionId");
  const { data: action } = await auth.supabase
    .from("development_actions")
    .select("id, candidate_id, candidate_competency_id, status")
    .eq("id", actionId)
    .eq("candidate_id", auth.candidateId)
    .maybeSingle();
  if (!action) return finish(auth.candidateId, "error", "The development action could not be found.");

  const { data: candidateCompetency } = await auth.supabase
    .from("candidate_competencies")
    .select("competency_definition_id")
    .eq("id", action.candidate_competency_id)
    .maybeSingle();
  if (!candidateCompetency) return finish(auth.candidateId, "error", "The linked competency could not be found.");

  const title = value(formData, "title");
  const evidenceDate = value(formData, "date");
  const claimedLevel = value(formData, "claimedLevel");
  const method = value(formData, "method");
  const description = value(formData, "description");
  const outcome = value(formData, "outcome");
  const projectReference = value(formData, "projectReference");
  if (!title || !evidenceDate || !levels.has(claimedLevel) || !evidenceMethods.has(method) || !description) {
    return finish(auth.candidateId, "error", "The evidence response is missing required fields.");
  }

  const existingEvidenceId = value(formData, "evidenceId");
  const now = new Date().toISOString();

  if (existingEvidenceId) {
    const { data: existing } = await auth.supabase
      .from("evidence_entries")
      .select("id, candidate_id")
      .eq("id", existingEvidenceId)
      .eq("candidate_id", auth.candidateId)
      .maybeSingle();
    if (!existing) return finish(auth.candidateId, "error", "The evidence response could not be found.");
    const { error: updateError } = await auth.supabase
      .from("evidence_entries")
      .update({ title, evidence_date: evidenceDate, claimed_level: claimedLevel, method, description, outcome, project_reference: projectReference, updated_at: now })
      .eq("id", existingEvidenceId)
      .eq("candidate_id", auth.candidateId);
    if (updateError) return finish(auth.candidateId, "error", "The evidence response could not be updated.");

    if (action.status === "open" || action.status === "returned-for-revision") {
      const { error: statusError } = await auth.supabase
        .from("development_actions")
        .update({ status: "submitted", submitted_at: now, submitted_by_user_id: auth.userId, submitted_by_display_name: auth.displayName })
        .eq("id", actionId)
        .eq("candidate_id", auth.candidateId);
      if (statusError) return finish(auth.candidateId, "error", "The evidence response was saved, but resubmission failed.");
    }
    return finish(auth.candidateId, "success", "Evidence response updated.");
  }

  if (action.status !== "open" && action.status !== "returned-for-revision") {
    return finish(auth.candidateId, "error", "This action cannot accept a new evidence response.");
  }

  const { data: inserted, error: insertError } = await auth.supabase
    .from("evidence_entries")
    .insert({
      candidate_id: auth.candidateId,
      evidence_date: evidenceDate,
      claimed_level: claimedLevel,
      project_reference: projectReference,
      project_type: "",
      riba_stage: "",
      title,
      description,
      outcome,
      method,
      structured_sections: null,
      systems: [],
    })
    .select("id")
    .single();
  if (insertError || !inserted) return finish(auth.candidateId, "error", "The evidence response could not be created.");

  const { error: linkError } = await auth.supabase.from("evidence_competency_links").insert({
    evidence_id: inserted.id,
    competency_definition_id: candidateCompetency.competency_definition_id,
    link_type: "primary",
  });
  if (linkError) return finish(auth.candidateId, "error", "The evidence response could not be linked to the competency.");

  const { error: actionLinkError } = await auth.supabase.from("evidence_action_links").insert({
    evidence_id: inserted.id,
    development_action_id: actionId,
    created_by_user_id: auth.userId,
    created_by_display_name: auth.displayName,
  });
  if (actionLinkError) return finish(auth.candidateId, "error", "The evidence response could not be linked to the action.");

  const { error: statusError } = await auth.supabase
    .from("development_actions")
    .update({ status: "submitted", submitted_at: now, submitted_by_user_id: auth.userId, submitted_by_display_name: auth.displayName })
    .eq("id", actionId)
    .eq("candidate_id", auth.candidateId);
  if (statusError) return finish(auth.candidateId, "error", "The evidence response was created, but submission failed.");

  return finish(auth.candidateId, "success", "Evidence response submitted.");
}
