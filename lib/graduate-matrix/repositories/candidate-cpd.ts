import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export type CpdEntryRow = Tables["cpd_entries"]["Row"];
export type CpdCompetencyLinkRow = Tables["cpd_competency_links"]["Row"];
export type CpdAttachmentRow = Tables["cpd_attachments"]["Row"];
export type CpdCandidateCompetencyRow =
  Tables["candidate_competencies"]["Row"];

export interface CandidateCpdRows {
  entries: CpdEntryRow[];
  competencyLinks: CpdCompetencyLinkRow[];
  attachments: CpdAttachmentRow[];
  candidateCompetencies: CpdCandidateCompetencyRow[];
}

export type CandidateCpdResult =
  | { status: "loaded"; rows: CandidateCpdRows }
  | { status: "error" };

export async function loadCandidateCpd(
  serverResolvedCandidateId: string,
): Promise<CandidateCpdResult> {
  const supabase = await createClient();
  const [entriesResult, competenciesResult] = await Promise.all([
    supabase
      .from("cpd_entries")
      .select("*")
      .eq("candidate_id", serverResolvedCandidateId)
      .order("cpd_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("candidate_competencies")
      .select("*")
      .eq("candidate_id", serverResolvedCandidateId),
  ]);

  if (entriesResult.error || competenciesResult.error) {
    console.error("Graduate Matrix CPD query failed.", {
      code: entriesResult.error?.code ?? competenciesResult.error?.code ?? "unknown",
    });
    return { status: "error" };
  }

  const entryIds = entriesResult.data.map(({ id }) => id);
  const [linksResult, attachmentsResult] =
    entryIds.length === 0
      ? [
          { data: [] as CpdCompetencyLinkRow[], error: null },
          { data: [] as CpdAttachmentRow[], error: null },
        ]
      : await Promise.all([
          supabase
            .from("cpd_competency_links")
            .select("*")
            .in("cpd_entry_id", entryIds)
            .order("created_at")
            .order("id"),
          supabase
            .from("cpd_attachments")
            .select("*")
            .in("cpd_entry_id", entryIds)
            .order("added_at")
            .order("id"),
        ]);

  if (linksResult.error || attachmentsResult.error) {
    console.error("Graduate Matrix CPD relationship query failed.", {
      code: linksResult.error?.code ?? attachmentsResult.error?.code ?? "unknown",
    });
    return { status: "error" };
  }

  return {
    status: "loaded",
    rows: {
      entries: entriesResult.data,
      competencyLinks: linksResult.data ?? [],
      attachments: attachmentsResult.data ?? [],
      candidateCompetencies: competenciesResult.data,
    },
  };
}
