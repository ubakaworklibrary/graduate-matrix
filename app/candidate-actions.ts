"use server";

import { revalidatePath } from "next/cache";
import { loadCandidateAccessContext } from "@/lib/graduate-matrix/repositories/candidate-access";
import { createClient } from "@/lib/supabase/server";
import {
  CIBSE_MEMBERSHIP_OPTIONS,
  ENGINEERING_REGISTRATION_OPTIONS,
  IET_MEMBERSHIP_OPTIONS,
  LCC_STRAND_OPTIONS,
  PRIMARY_OUTCOME_OPTIONS,
  PROFESSIONAL_BODY_OPTIONS,
  SPECIALIST_ROUTE_OPTIONS,
} from "@/lib/graduate-matrix/data/pathways";

const DISCIPLINES = ["Mechanical & Public Health", "Electrical", "Sustainability"] as const;
const OFFICES = ["London", "Oxford"] as const;
const MENTORS = ["Chris Hughes", "Henry Metcalfe", "James Hazell", "Ubaka Attah", "Tomas Keating", "Adeel Ahmed"] as const;
const MANAGERS = ["Matthew Edwards", "Jeremy Denton", "Ubaka Attah", "Dushyant Kanik"] as const;
const TARGETED_IN_YEARS = ["1", "2", "3", "4", "5"] as const;

// The generated RPC Args type omits the nullable union for these two
// parameters, but the pathway "clear" operation contract requires literal
// SQL NULL (the RPC rejects a clear that carries a non-null selection).
const NULL_PATHWAY_SELECTION = null as unknown as string;

export type CandidateAutosaveResult =
  | { status: "success" }
  | { status: "error"; message: string };

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item.trim() : "";
}

function fail(message: string): CandidateAutosaveResult {
  return { status: "error", message };
}

const allowed = <T extends { value: string }>(options: readonly T[], selected: string) =>
  options.some((option) => option.value === selected);
const validOptional = (selected: string, options: readonly string[]) => !selected || options.includes(selected);

/**
 * Autosaves the Candidate form. Called on debounced field change, not on a
 * submit click — it persists in the background and returns a result for an
 * inline status indicator instead of redirecting.
 */
export async function autosaveCandidateDetails(formData: FormData): Promise<CandidateAutosaveResult> {
  const candidateId = value(formData, "candidateId");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !candidateId) return fail("Candidate access is no longer authorized.");

  const access = await loadCandidateAccessContext(user.id, candidateId);
  if (!access || access.selectedCandidateId !== candidateId) {
    return fail("Candidate access is no longer authorized.");
  }

  const saveMode = value(formData, "saveMode");
  if (saveMode !== "quick" && saveMode !== "full") {
    return fail("The candidate save mode is missing or not recognised.");
  }

  const firstName = value(formData, "firstName");
  const surname = value(formData, "surname");
  const schemeStartDate = value(formData, "schemeStartDate");
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (schemeStartDate && !datePattern.test(schemeStartDate)) {
    return fail("The scheme start date is invalid.");
  }

  if (saveMode === "quick") {
    const { error } = await supabase
      .from("candidates")
      .update({
        first_name: firstName,
        surname,
        scheme_start_date: schemeStartDate || null,
      })
      .eq("id", candidateId);

    if (error) return fail("Candidate details could not be saved.");
    revalidatePath("/");
    return { status: "success" };
  }

  // Full save: validate every submitted value before any write begins.
  const discipline = value(formData, "discipline");
  const officeLocation = value(formData, "officeLocation");
  const mentorName = value(formData, "mentorName");
  const lineManagerName = value(formData, "lineManagerName");
  const reviewerName = value(formData, "reviewerName");
  if (
    !validOptional(discipline, DISCIPLINES) ||
    !validOptional(officeLocation, OFFICES) ||
    !validOptional(mentorName, MENTORS) ||
    !validOptional(lineManagerName, MANAGERS) ||
    !validOptional(reviewerName, MANAGERS)
  ) {
    return fail("A controlled candidate setup selection is invalid.");
  }

  const targetedInYears = value(formData, "targetedInYears");
  if (targetedInYears && !TARGETED_IN_YEARS.includes(targetedInYears as typeof TARGETED_IN_YEARS[number])) {
    return fail("The targeted-in selection is not recognised.");
  }
  // The database only has a real date column here, so "targeted in Year N" is
  // stored as 1 January of (this year + N) — a plain, unlinked marker rather
  // than a calculation from any other candidate date.
  const expectedApplicationDate = targetedInYears
    ? `${new Date().getFullYear() + Number(targetedInYears)}-01-01`
    : null;

  const professionalBody = value(formData, "professionalBody");
  const primaryOutcome = value(formData, "primaryOutcome");
  const bothBlank = !professionalBody && !primaryOutcome;
  const bothPopulated = Boolean(professionalBody) && Boolean(primaryOutcome);
  if (!bothBlank && !bothPopulated) {
    return fail("Select both a professional body and a primary outcome, or clear both to remove the pathway.");
  }
  const pathwayOperation: "configure" | "clear" = bothBlank ? "clear" : "configure";

  let cibseMembershipTarget = "none";
  let ietMembershipTarget = "none";
  let engineeringRegistrationTarget = "none";
  let lccStrands: string[] = [];
  let specialistRoutes: string[] = [];

  if (pathwayOperation === "configure") {
    cibseMembershipTarget = value(formData, "cibseMembershipTarget");
    ietMembershipTarget = value(formData, "ietMembershipTarget");
    engineeringRegistrationTarget = value(formData, "engineeringRegistrationTarget");
    lccStrands = formData.getAll("lccStrands").filter((item): item is string => typeof item === "string" && allowed(LCC_STRAND_OPTIONS, item));
    specialistRoutes = formData.getAll("specialistRoutes").filter((item): item is string => typeof item === "string" && allowed(SPECIALIST_ROUTE_OPTIONS, item));

    if (
      !allowed(PROFESSIONAL_BODY_OPTIONS, professionalBody) ||
      !allowed(PRIMARY_OUTCOME_OPTIONS, primaryOutcome) ||
      !allowed(CIBSE_MEMBERSHIP_OPTIONS, cibseMembershipTarget) ||
      !allowed(IET_MEMBERSHIP_OPTIONS, ietMembershipTarget) ||
      !allowed(ENGINEERING_REGISTRATION_OPTIONS, engineeringRegistrationTarget)
    ) {
      return fail("The pathway selection is invalid.");
    }
  }

  const { error: candidateError } = await supabase
    .from("candidates")
    .update({
      first_name: firstName,
      surname,
      scheme_start_date: schemeStartDate || null,
      job_title: value(formData, "jobTitle"),
      discipline,
      employer_team: value(formData, "employerTeam"),
      office_location: officeLocation,
      expected_application_date: expectedApplicationDate,
    })
    .eq("id", candidateId);
  if (candidateError) return fail("Candidate details could not be saved.");

  const { error: pathwayError } = pathwayOperation === "configure"
    ? await supabase.rpc("save_candidate_pathway_configuration", {
        p_candidate_id: candidateId,
        p_operation: "configure",
        p_professional_body: professionalBody,
        p_primary_outcome: primaryOutcome,
        p_cibse_membership_target: cibseMembershipTarget,
        p_iet_membership_target: ietMembershipTarget,
        p_engineering_registration_target: engineeringRegistrationTarget,
        p_current_membership_status: value(formData, "currentMembershipStatus"),
        p_academic_route: value(formData, "academicRoute"),
        p_notes: value(formData, "pathwayNotes"),
        p_lcc_strands: lccStrands,
        p_specialist_routes: specialistRoutes,
      })
    : await supabase.rpc("save_candidate_pathway_configuration", {
        p_candidate_id: candidateId,
        p_operation: "clear",
        p_professional_body: NULL_PATHWAY_SELECTION,
        p_primary_outcome: NULL_PATHWAY_SELECTION,
        p_cibse_membership_target: "none",
        p_iet_membership_target: "none",
        p_engineering_registration_target: "none",
        p_current_membership_status: "",
        p_academic_route: "",
        p_notes: "",
        p_lcc_strands: [],
        p_specialist_routes: [],
      });
  if (pathwayError) return fail("Candidate details were saved, but the pathway could not be saved.");

  const { data: existingRelationships, error: relationshipReadError } = await supabase
    .from("candidate_relationships")
    .select("id, user_id, display_name, relationship_type")
    .eq("candidate_id", candidateId)
    .is("ends_at", null);
  if (relationshipReadError) return fail("Candidate details were saved, but candidate people could not be updated.");

  const people = [
    { type: "mentor", name: mentorName },
    { type: "manager", name: lineManagerName },
    { type: "reviewer", name: reviewerName },
  ] as const;
  for (const person of people) {
    const current = existingRelationships?.find((relationship) => relationship.relationship_type === person.type);
    if (current?.display_name === person.name) continue;
    if (current) {
      const { error: endError } = await supabase.from("candidate_relationships").update({ ends_at: new Date().toISOString() }).eq("id", current.id);
      if (endError) return fail("Candidate details were saved, but candidate people could not be updated.");
    }
    if (person.name) {
      const { error: insertError } = await supabase.from("candidate_relationships").insert({
        candidate_id: candidateId,
        relationship_type: person.type,
        display_name: person.name,
        user_id: null,
      });
      if (insertError) return fail("Candidate details were saved, but candidate people could not be updated.");
    }
  }

  revalidatePath("/");
  return { status: "success" };
}
