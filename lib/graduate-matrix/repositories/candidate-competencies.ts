import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export type CompetencyDefinitionRow = Tables["competency_definitions"]["Row"];
export type CandidateCompetencyRow = Tables["candidate_competencies"]["Row"];
export type CompetencyCycleRow = Tables["competency_cycles"]["Row"];

export interface CandidateCompetencyRows {
  definitions: CompetencyDefinitionRow[];
  competencies: CandidateCompetencyRow[];
  cycles: CompetencyCycleRow[];
}

export type CandidateCompetencyResult =
  | { status: "loaded"; rows: CandidateCompetencyRows }
  | { status: "error" };

export async function loadCandidateCompetencies(
  serverResolvedCandidateId: string,
): Promise<CandidateCompetencyResult> {
  const supabase = await createClient();
  const [definitionsResult, competenciesResult] = await Promise.all([
    supabase
      .from("competency_definitions")
      .select("*")
      .eq("is_active", true)
      .order("source_order"),
    supabase
      .from("candidate_competencies")
      .select("*")
      .eq("candidate_id", serverResolvedCandidateId),
  ]);

  if (definitionsResult.error || competenciesResult.error) {
    return { status: "error" };
  }

  const competencyIds = competenciesResult.data.map(({ id }) => id);

  if (competencyIds.length === 0) {
    return {
      status: "loaded",
      rows: {
        definitions: definitionsResult.data,
        competencies: [],
        cycles: [],
      },
    };
  }

  const { data: cycles, error: cyclesError } = await supabase
    .from("competency_cycles")
    .select("*")
    .in("candidate_competency_id", competencyIds)
    .order("created_at");

  if (cyclesError) {
    return { status: "error" };
  }

  return {
    status: "loaded",
    rows: {
      definitions: definitionsResult.data,
      competencies: competenciesResult.data,
      cycles,
    },
  };
}
