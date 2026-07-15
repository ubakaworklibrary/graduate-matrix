import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Tables = Database["public"]["Tables"];

export type CandidateReviewRow = Tables["candidate_reviews"]["Row"];
export type CandidateMeetingRow = Tables["meetings"]["Row"];

export interface CandidateMeetingLogRows {
  reviews: CandidateReviewRow[];
  meetings: CandidateMeetingRow[];
}

export type CandidateMeetingLogResult =
  | { status: "loaded"; rows: CandidateMeetingLogRows }
  | { status: "error" };

export async function loadCandidateMeetingLog(
  serverResolvedCandidateId: string,
): Promise<CandidateMeetingLogResult> {
  const supabase = await createClient();
  const [reviewsResult, meetingsResult] = await Promise.all([
    supabase
      .from("candidate_reviews")
      .select("*")
      .eq("candidate_id", serverResolvedCandidateId)
      .order("reviewed_on", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
    supabase
      .from("meetings")
      .select("*")
      .eq("candidate_id", serverResolvedCandidateId)
      .order("meeting_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false }),
  ]);

  if (reviewsResult.error || meetingsResult.error) {
    console.error("Graduate Matrix Meeting Log query failed.", {
      code: reviewsResult.error?.code ?? meetingsResult.error?.code ?? "unknown",
    });
    return { status: "error" };
  }

  return {
    status: "loaded",
    rows: {
      reviews: reviewsResult.data,
      meetings: meetingsResult.data,
    },
  };
}
