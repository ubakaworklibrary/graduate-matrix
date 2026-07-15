import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export type EvidenceEntryRow = Tables["evidence_entries"]["Row"];
export type EvidenceCompetencyLinkRow =
  Tables["evidence_competency_links"]["Row"];
export type EvidenceActionLinkRow = Tables["evidence_action_links"]["Row"];
export type EvidenceVerificationEventRow =
  Tables["evidence_verification_events"]["Row"];
export type DevelopmentActionRow = Tables["development_actions"]["Row"];
export type PortfolioCandidateCompetencyRow =
  Tables["candidate_competencies"]["Row"];
export type PortfolioCompetencyCycleRow = Tables["competency_cycles"]["Row"];

export interface CandidatePortfolioRows {
  evidence: EvidenceEntryRow[];
  competencyLinks: EvidenceCompetencyLinkRow[];
  actions: DevelopmentActionRow[];
  actionLinks: EvidenceActionLinkRow[];
  verificationEvents: EvidenceVerificationEventRow[];
  candidateCompetencies: PortfolioCandidateCompetencyRow[];
  competencyCycles: PortfolioCompetencyCycleRow[];
}

export type CandidatePortfolioResult =
  | { status: "loaded"; rows: CandidatePortfolioRows }
  | { status: "error" };

function reportPortfolioQueryError(
  area: string,
  error: { code?: string } | null,
) {
  console.error(`Graduate Matrix Portfolio query failed: ${area}`, {
    code: error?.code ?? "unknown",
  });
}

export async function loadCandidatePortfolio(
  serverResolvedCandidateId: string,
): Promise<CandidatePortfolioResult> {
  const supabase = await createClient();
  const [evidenceResult, actionsResult, competenciesResult] = await Promise.all([
    supabase
      .from("evidence_entries")
      .select("*")
      .eq("candidate_id", serverResolvedCandidateId)
      .order("evidence_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("development_actions")
      .select("*")
      .eq("candidate_id", serverResolvedCandidateId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("candidate_competencies")
      .select("*")
      .eq("candidate_id", serverResolvedCandidateId),
  ]);

  if (evidenceResult.error || actionsResult.error || competenciesResult.error) {
    reportPortfolioQueryError(
      "primary records",
      evidenceResult.error ?? actionsResult.error ?? competenciesResult.error,
    );
    return { status: "error" };
  }

  const evidenceIds = evidenceResult.data.map(({ id }) => id);
  const competencyRecordIds = competenciesResult.data.map(({ id }) => id);

  const [competencyLinksResult, actionLinksResult, verificationEventsResult] =
    evidenceIds.length === 0
      ? [
          { data: [] as EvidenceCompetencyLinkRow[], error: null },
          { data: [] as EvidenceActionLinkRow[], error: null },
          { data: [] as EvidenceVerificationEventRow[], error: null },
        ]
      : await Promise.all([
          supabase
            .from("evidence_competency_links")
            .select("*")
            .in("evidence_id", evidenceIds)
            .order("created_at")
            .order("id"),
          supabase
            .from("evidence_action_links")
            .select("*")
            .in("evidence_id", evidenceIds)
            .order("created_at")
            .order("id"),
          supabase
            .from("evidence_verification_events")
            .select("*")
            .in("evidence_id", evidenceIds)
            .order("occurred_at", { ascending: false })
            .order("created_at", { ascending: false })
            .order("id", { ascending: false }),
        ]);

  const cyclesResult =
    competencyRecordIds.length === 0
      ? { data: [] as PortfolioCompetencyCycleRow[], error: null }
      : await supabase
          .from("competency_cycles")
          .select("*")
          .in("candidate_competency_id", competencyRecordIds);

  const supportingError =
    competencyLinksResult.error ??
    actionLinksResult.error ??
    verificationEventsResult.error ??
    cyclesResult.error;

  if (supportingError) {
    reportPortfolioQueryError("relationships", supportingError);
    return { status: "error" };
  }

  return {
    status: "loaded",
    rows: {
      evidence: evidenceResult.data,
      competencyLinks: competencyLinksResult.data ?? [],
      actions: actionsResult.data,
      actionLinks: actionLinksResult.data ?? [],
      verificationEvents: verificationEventsResult.data ?? [],
      candidateCompetencies: competenciesResult.data,
      competencyCycles: cyclesResult.data ?? [],
    },
  };
}
