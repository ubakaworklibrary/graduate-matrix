import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export type BaselineTaskDefinitionRow =
  Tables["baseline_task_definitions"]["Row"];
export type CandidateBaselineSetupRow =
  Tables["candidate_baseline_setups"]["Row"];
export type CandidateBaselineTaskRow =
  Tables["candidate_baseline_tasks"]["Row"];

export interface CandidateBaselineRows {
  definitions: BaselineTaskDefinitionRow[];
  setup: CandidateBaselineSetupRow | null;
  tasks: CandidateBaselineTaskRow[];
}

export type CandidateBaselineResult =
  | { status: "loaded"; rows: CandidateBaselineRows }
  | { status: "error" };

export async function loadCandidateBaseline(
  serverResolvedCandidateId: string,
): Promise<CandidateBaselineResult> {
  const supabase = await createClient();
  const [definitionsResult, setupResult] = await Promise.all([
    supabase
      .from("baseline_task_definitions")
      .select("*")
      .eq("is_active", true)
      .order("source_order"),
    supabase
      .from("candidate_baseline_setups")
      .select("*")
      .eq("candidate_id", serverResolvedCandidateId)
      .maybeSingle(),
  ]);

  if (definitionsResult.error || setupResult.error) {
    return { status: "error" };
  }

  if (!setupResult.data) {
    return {
      status: "loaded",
      rows: {
        definitions: definitionsResult.data,
        setup: null,
        tasks: [],
      },
    };
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("candidate_baseline_tasks")
    .select("*")
    .eq("candidate_id", serverResolvedCandidateId);

  if (tasksError) {
    return { status: "error" };
  }

  return {
    status: "loaded",
    rows: {
      definitions: definitionsResult.data,
      setup: setupResult.data,
      tasks,
    },
  };
}
