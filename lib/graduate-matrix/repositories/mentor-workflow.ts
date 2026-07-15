import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export interface MentorWorkflowRows {
  competencies: Tables["candidate_competencies"]["Row"][];
  cycles: Tables["competency_cycles"]["Row"][];
  assessments: Tables["mentor_assessments"]["Row"][];
  reviews: Tables["competency_cycle_reviews"]["Row"][];
  actions: Tables["development_actions"]["Row"][];
  relationships: Tables["candidate_relationships"]["Row"][];
}

export async function loadMentorWorkflow(candidateId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const [competencies, assessments, reviews, actions, relationships] =
    await Promise.all([
      supabase.from("candidate_competencies").select("*").eq("candidate_id", candidateId),
      supabase.from("mentor_assessments").select("*").eq("candidate_id", candidateId).order("updated_at", { ascending: false }).order("id", { ascending: false }),
      supabase.from("competency_cycle_reviews").select("*").eq("candidate_id", candidateId).order("created_at", { ascending: false }),
      supabase.from("development_actions").select("*").eq("candidate_id", candidateId),
      supabase.from("candidate_relationships").select("*").eq("candidate_id", candidateId).lte("starts_at", now).or(`ends_at.is.null,ends_at.gte.${now}`),
    ]);

  const error = competencies.error ?? assessments.error ?? reviews.error ?? actions.error ?? relationships.error;
  if (error) return { status: "error" as const };
  const competencyIds = (competencies.data ?? []).map(({ id }) => id);
  const cycles = competencyIds.length
    ? await supabase.from("competency_cycles").select("*").in("candidate_competency_id", competencyIds).order("created_at")
    : { data: [], error: null };
  if (cycles.error) return { status: "error" as const };

  return {
    status: "loaded" as const,
    rows: {
      competencies: competencies.data ?? [],
      cycles: cycles.data ?? [],
      assessments: assessments.data ?? [],
      reviews: reviews.data ?? [],
      actions: actions.data ?? [],
      relationships: relationships.data ?? [],
    } satisfies MentorWorkflowRows,
  };
}
