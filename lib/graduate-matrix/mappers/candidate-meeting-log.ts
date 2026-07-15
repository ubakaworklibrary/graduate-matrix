import type { CandidateMeetingLogRows } from "@/lib/graduate-matrix/repositories/candidate-meeting-log";
import type {
  Meeting,
  Review,
  ReviewOutcome,
} from "@/types/graduate-matrix";

const REVIEW_OUTCOMES: readonly ReviewOutcome[] = [
  "not-recorded",
  "accepted",
  "accepted-with-actions",
];

export interface MappedCandidateMeetingLog {
  reviews: Review[];
  meetings: Meeting[];
}

export type CandidateMeetingLogMappingResult =
  | { status: "mapped"; data: MappedCandidateMeetingLog }
  | { status: "integrity-error" };

function hasDuplicate(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

function isReviewOutcome(value: string): value is ReviewOutcome {
  return REVIEW_OUTCOMES.some((outcome) => outcome === value);
}

export function mapCandidateMeetingLog(
  serverResolvedCandidateId: string,
  rows: CandidateMeetingLogRows,
): CandidateMeetingLogMappingResult {
  if (
    hasDuplicate(rows.reviews.map(({ id }) => id)) ||
    hasDuplicate(rows.meetings.map(({ id }) => id))
  ) {
    return { status: "integrity-error" };
  }

  const reviews: Review[] = [];
  for (const review of rows.reviews) {
    if (
      review.candidate_id !== serverResolvedCandidateId ||
      !isReviewOutcome(review.outcome) ||
      !review.reviewed_by_display_name.trim()
    ) {
      return { status: "integrity-error" };
    }

    reviews.push({
      id: review.id,
      candidateId: review.candidate_id,
      reviewedAt: review.reviewed_on,
      reviewedBy: review.reviewed_by_display_name,
      outcome: review.outcome,
      nextReviewDate: review.next_review_date,
      notes: review.notes,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    });
  }

  const reviewIds = new Set(reviews.map(({ id }) => id));
  const meetings: Meeting[] = [];

  for (const meeting of rows.meetings) {
    if (
      meeting.candidate_id !== serverResolvedCandidateId ||
      !meeting.created_by_display_name.trim() ||
      (meeting.review_id !== null && !reviewIds.has(meeting.review_id))
    ) {
      return { status: "integrity-error" };
    }

    meetings.push({
      id: meeting.id,
      candidateId: meeting.candidate_id,
      reviewId: meeting.review_id,
      date: meeting.meeting_date,
      type: meeting.meeting_type,
      attendees: meeting.attendees,
      duration: meeting.duration,
      notes: meeting.notes,
      outcome: meeting.outcome,
      candidateComment: meeting.candidate_comment,
      createdAt: meeting.created_at,
      createdBy: meeting.created_by_display_name,
      updatedAt: meeting.updated_at,
    });
  }

  return { status: "mapped", data: { reviews, meetings } };
}
