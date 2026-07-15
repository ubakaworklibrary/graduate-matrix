import { createClient } from "@/lib/supabase/server";

export interface AccessibleCandidate {
  id: string;
  name: string;
  canProgress: boolean;
}

export interface CandidateAccessContext {
  candidates: AccessibleCandidate[];
  selectedCandidateId: string | null;
  canProgressSelectedCandidate: boolean;
}

export async function loadCandidateAccessContext(
  authenticatedUserId: string,
  requestedCandidateId?: string,
): Promise<CandidateAccessContext | null> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [candidatesResult, membershipsResult, relationshipsResult] =
    await Promise.all([
      supabase
        .from("candidates")
        .select("id, first_name, surname, organization_id, user_id")
        .is("archived_at", null)
        .order("surname")
        .order("first_name"),
      supabase
        .from("organization_memberships")
        .select("organization_id, membership_role")
        .eq("user_id", authenticatedUserId)
        .is("archived_at", null),
      supabase
        .from("candidate_relationships")
        .select("candidate_id, relationship_type")
        .eq("user_id", authenticatedUserId)
        .lte("starts_at", now)
        .or(`ends_at.is.null,ends_at.gte.${now}`),
    ]);

  if (
    candidatesResult.error ||
    membershipsResult.error ||
    relationshipsResult.error
  ) {
    return null;
  }

  const adminOrganizations = new Set(
    membershipsResult.data
      .filter(({ membership_role }) => membership_role === "organization-admin")
      .map(({ organization_id }) => organization_id),
  );
  const mentorCandidates = new Set(
    relationshipsResult.data
      .filter(({ relationship_type }) => relationship_type === "mentor")
      .map(({ candidate_id }) => candidate_id),
  );
  const candidates = candidatesResult.data.map((candidate) => ({
    id: candidate.id,
    name: `${candidate.first_name} ${candidate.surname}`,
    canProgress:
      adminOrganizations.has(candidate.organization_id) ||
      mentorCandidates.has(candidate.id),
    ownCandidate: candidate.user_id === authenticatedUserId,
  }));
  const requested = candidates.find(({ id }) => id === requestedCandidateId);
  const selected =
    requested ?? candidates.find(({ ownCandidate }) => ownCandidate) ?? candidates[0];

  return {
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      canProgress: candidate.canProgress,
    })),
    selectedCandidateId: selected?.id ?? null,
    canProgressSelectedCandidate: selected?.canProgress ?? false,
  };
}
