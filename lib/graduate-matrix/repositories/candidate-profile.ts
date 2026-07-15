import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export type CandidateRow = Tables["candidates"]["Row"];
export type CandidateRelationshipRow =
  Tables["candidate_relationships"]["Row"];
export type CandidatePathwayRow = Tables["candidate_pathways"]["Row"];
export type CandidatePathwayLccStrandRow =
  Tables["candidate_pathway_lcc_strands"]["Row"];
export type CandidatePathwaySpecialistRouteRow =
  Tables["candidate_pathway_specialist_routes"]["Row"];

export interface AuthenticatedCandidateProfileRows {
  candidate: CandidateRow;
  relationships: CandidateRelationshipRow[];
  pathway: CandidatePathwayRow | null;
  lccStrands: CandidatePathwayLccStrandRow[];
  specialistRoutes: CandidatePathwaySpecialistRouteRow[];
}

export type AuthenticatedCandidateProfileResult =
  | { status: "found"; rows: AuthenticatedCandidateProfileRows }
  | { status: "not-found" }
  | { status: "error" };

export async function loadAuthenticatedCandidateProfile(
  authenticatedUserId: string,
): Promise<AuthenticatedCandidateProfileResult> {
  const supabase = await createClient();
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("*")
    .eq("user_id", authenticatedUserId)
    .is("archived_at", null)
    .maybeSingle();

  if (candidateError) {
    return { status: "error" };
  }

  if (!candidate) {
    return { status: "not-found" };
  }

  return loadCandidateProfileById(candidate.id);
}

export async function loadCandidateProfileById(
  serverValidatedCandidateId: string,
): Promise<AuthenticatedCandidateProfileResult> {
  const supabase = await createClient();
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", serverValidatedCandidateId)
    .is("archived_at", null)
    .maybeSingle();

  if (candidateError) return { status: "error" };
  if (!candidate) return { status: "not-found" };

  const currentTime = new Date().toISOString();
  const [relationshipsResult, pathwayResult] = await Promise.all([
    supabase
      .from("candidate_relationships")
      .select("*")
      .eq("candidate_id", candidate.id)
      .in("relationship_type", ["mentor", "manager", "reviewer"])
      .lte("starts_at", currentTime)
      .is("ends_at", null),
    supabase
      .from("candidate_pathways")
      .select("*")
      .eq("candidate_id", candidate.id)
      .maybeSingle(),
  ]);

  if (relationshipsResult.error || pathwayResult.error) {
    return { status: "error" };
  }

  if (!pathwayResult.data) {
    return {
      status: "found",
      rows: {
        candidate,
        relationships: relationshipsResult.data,
        pathway: null,
        lccStrands: [],
        specialistRoutes: [],
      },
    };
  }

  const [lccStrandsResult, specialistRoutesResult] = await Promise.all([
    supabase
      .from("candidate_pathway_lcc_strands")
      .select("*")
      .eq("candidate_id", candidate.id),
    supabase
      .from("candidate_pathway_specialist_routes")
      .select("*")
      .eq("candidate_id", candidate.id),
  ]);

  if (lccStrandsResult.error || specialistRoutesResult.error) {
    return { status: "error" };
  }

  return {
    status: "found",
    rows: {
      candidate,
      relationships: relationshipsResult.data,
      pathway: pathwayResult.data,
      lccStrands: lccStrandsResult.data,
      specialistRoutes: specialistRoutesResult.data,
    },
  };
}
