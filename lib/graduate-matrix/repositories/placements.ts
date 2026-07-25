import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export type PlacementTaskDefinitionRow =
  Tables["placement_task_definitions"]["Row"];
export type CandidatePlacementWorkspaceRow =
  Tables["candidate_placement_workspaces"]["Row"];
export type CandidatePlacementTaskRow =
  Tables["candidate_placement_tasks"]["Row"];
export type CandidatePlacementTaskVerificationEventRow =
  Tables["candidate_placement_task_verification_events"]["Row"];

export interface CandidatePlacementsRows {
  definitions: PlacementTaskDefinitionRow[];
  workspaces: CandidatePlacementWorkspaceRow[];
  tasks: CandidatePlacementTaskRow[];
  events: CandidatePlacementTaskVerificationEventRow[];
}

export type CandidatePlacementsResult =
  | { status: "loaded"; rows: CandidatePlacementsRows; isOwnCandidate: boolean }
  | { status: "error" };

function reportPlacementsQueryError(area: string, error: { code?: string } | null) {
  console.error(`Graduate Matrix Placements query failed: ${area}`, {
    code: error?.code ?? "unknown",
  });
}

/**
 * Loads the complete Placements dataset for one candidate in a fixed, small
 * number of batched queries (never one query per task or per workspace):
 * active task definitions, the candidate's workspaces, tasks for those
 * workspaces, then verification events for those tasks — each step only
 * runs when the previous step returned rows to look up.
 */
export async function loadCandidatePlacements(
  candidateId: string,
  authenticatedUserId: string,
): Promise<CandidatePlacementsResult> {
  const supabase = await createClient();

  const [definitionsResult, workspacesResult, candidateResult] = await Promise.all([
    supabase
      .from("placement_task_definitions")
      .select("*")
      .eq("is_active", true)
      .order("discipline")
      .order("source_order"),
    supabase
      .from("candidate_placement_workspaces")
      .select("*")
      .eq("candidate_id", candidateId),
    supabase
      .from("candidates")
      .select("user_id")
      .eq("id", candidateId)
      .maybeSingle(),
  ]);

  if (definitionsResult.error || workspacesResult.error || candidateResult.error) {
    reportPlacementsQueryError(
      "primary records",
      definitionsResult.error ?? workspacesResult.error ?? candidateResult.error,
    );
    return { status: "error" };
  }

  const workspaceIds = workspacesResult.data.map(({ id }) => id);
  const tasksResult =
    workspaceIds.length === 0
      ? { data: [] as CandidatePlacementTaskRow[], error: null }
      : await supabase
          .from("candidate_placement_tasks")
          .select("*")
          .in("candidate_placement_workspace_id", workspaceIds);

  if (tasksResult.error) {
    reportPlacementsQueryError("tasks", tasksResult.error);
    return { status: "error" };
  }

  const taskIds = tasksResult.data.map(({ id }) => id);
  const eventsResult =
    taskIds.length === 0
      ? { data: [] as CandidatePlacementTaskVerificationEventRow[], error: null }
      : await supabase
          .from("candidate_placement_task_verification_events")
          .select("*")
          .in("candidate_placement_task_id", taskIds)
          .order("occurred_at", { ascending: false })
          .order("created_at", { ascending: false })
          .order("id", { ascending: false });

  if (eventsResult.error) {
    reportPlacementsQueryError("verification events", eventsResult.error);
    return { status: "error" };
  }

  return {
    status: "loaded",
    rows: {
      definitions: definitionsResult.data,
      workspaces: workspacesResult.data,
      tasks: tasksResult.data,
      events: eventsResult.data ?? [],
    },
    isOwnCandidate: candidateResult.data?.user_id === authenticatedUserId,
  };
}
