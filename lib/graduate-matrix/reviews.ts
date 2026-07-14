import type {
  CandidateId,
  CompetencyCycleId,
  CompetencyCycleReview,
  CompetencyId,
  MentorAssessment,
  MentorAssessmentStatus,
  Review,
  ReviewOutcome,
} from "../../types/graduate-matrix";

export interface MentorAssessmentSummary {
  total: number;
  assessedCompetencies: number;
  unassessedCompetencies: number;
  byStatus: Record<MentorAssessmentStatus, number>;
}

export interface CompetencyCycleReviewSummary {
  total: number;
  byStatus: Record<MentorAssessmentStatus, number>;
}

export interface GlobalReviewSummary {
  total: number;
  recorded: number;
  byOutcome: Record<ReviewOutcome, number>;
}

function compareDescending(
  firstTimestamp: string,
  secondTimestamp: string,
): number {
  return secondTimestamp.localeCompare(firstTimestamp);
}

export function getMentorAssessmentsForCandidate(
  candidateId: CandidateId,
  assessments: readonly MentorAssessment[],
): MentorAssessment[] {
  return assessments.filter(
    (assessment) => assessment.candidateId === candidateId,
  );
}

export function getMentorAssessmentsForCompetency(
  competencyId: CompetencyId,
  assessments: readonly MentorAssessment[],
): MentorAssessment[] {
  return assessments.filter(
    (assessment) => assessment.competencyId === competencyId,
  );
}

export function orderMentorAssessmentsNewestFirst(
  assessments: readonly MentorAssessment[],
): MentorAssessment[] {
  return [...assessments].sort((first, second) =>
    compareDescending(
      first.assessedAt ?? first.updatedAt,
      second.assessedAt ?? second.updatedAt,
    ),
  );
}

export function getLatestMentorAssessment(
  assessments: readonly MentorAssessment[],
): MentorAssessment | null {
  return orderMentorAssessmentsNewestFirst(assessments)[0] ?? null;
}

export function hasRecordedMentorAssessment(
  assessments: readonly MentorAssessment[],
): boolean {
  return assessments.some((assessment) => assessment.assessedAt !== null);
}

export function getMentorAssessmentSummary(
  competencyIds: readonly CompetencyId[],
  assessments: readonly MentorAssessment[],
): MentorAssessmentSummary {
  const assessedCompetencyIds = new Set(
    assessments
      .filter((assessment) => assessment.assessedAt !== null)
      .map((assessment) => assessment.competencyId),
  );
  const byStatus: Record<MentorAssessmentStatus, number> = {
    "not-reviewed": 0,
    "more-evidence": 0,
    demonstrated: 0,
  };

  assessments.forEach((assessment) => {
    byStatus[assessment.status] += 1;
  });

  const assessedCompetencies = competencyIds.filter((competencyId) =>
    assessedCompetencyIds.has(competencyId),
  ).length;

  return {
    total: assessments.length,
    assessedCompetencies,
    unassessedCompetencies: competencyIds.length - assessedCompetencies,
    byStatus,
  };
}

export function getReviewsForCompetencyCycle(
  cycleId: CompetencyCycleId,
  reviews: readonly CompetencyCycleReview[],
): CompetencyCycleReview[] {
  return reviews.filter((review) => review.cycleId === cycleId);
}

export function getCompetencyCycleReviewsForCandidate(
  candidateId: CandidateId,
  reviews: readonly CompetencyCycleReview[],
): CompetencyCycleReview[] {
  return orderCompetencyCycleReviewsNewestFirst(
    reviews.filter((review) => review.candidateId === candidateId),
  );
}

export function hasRecordedCompetencyCycleReview(
  cycleId: CompetencyCycleId,
  reviews: readonly CompetencyCycleReview[],
): boolean {
  return reviews.some((review) => review.cycleId === cycleId);
}

export function getReviewsForCompetency(
  competencyId: CompetencyId,
  reviews: readonly CompetencyCycleReview[],
): CompetencyCycleReview[] {
  return reviews.filter((review) => review.competencyId === competencyId);
}

export function orderCompetencyCycleReviewsNewestFirst(
  reviews: readonly CompetencyCycleReview[],
): CompetencyCycleReview[] {
  return [...reviews].sort((first, second) =>
    compareDescending(
      first.createdAt,
      second.createdAt,
    ),
  );
}

export function getLatestCompetencyCycleReview(
  reviews: readonly CompetencyCycleReview[],
): CompetencyCycleReview | null {
  return orderCompetencyCycleReviewsNewestFirst(reviews)[0] ?? null;
}

export function getCompetencyCycleReviewSummary(
  reviews: readonly CompetencyCycleReview[],
): CompetencyCycleReviewSummary {
  const byStatus: Record<MentorAssessmentStatus, number> = {
    "not-reviewed": 0,
    "more-evidence": 0,
    demonstrated: 0,
  };

  reviews.forEach((review) => {
    byStatus[review.status] += 1;
  });

  return { total: reviews.length, byStatus };
}

export function getGlobalReviewsForCandidate(
  candidateId: CandidateId,
  reviews: readonly Review[],
): Review[] {
  return reviews.filter((review) => review.candidateId === candidateId);
}

export function orderGlobalReviewsNewestFirst(
  reviews: readonly Review[],
): Review[] {
  return [...reviews].sort((first, second) =>
    compareDescending(
      first.reviewedAt ?? first.createdAt,
      second.reviewedAt ?? second.createdAt,
    ),
  );
}

export function getLatestGlobalReview(
  reviews: readonly Review[],
): Review | null {
  return orderGlobalReviewsNewestFirst(reviews)[0] ?? null;
}

export function getGlobalReviewSummary(
  reviews: readonly Review[],
): GlobalReviewSummary {
  const byOutcome: Record<ReviewOutcome, number> = {
    "not-recorded": 0,
    accepted: 0,
    "accepted-with-actions": 0,
  };

  reviews.forEach((review) => {
    byOutcome[review.outcome] += 1;
  });

  return {
    total: reviews.length,
    recorded: reviews.filter((review) => review.reviewedAt !== null).length,
    byOutcome,
  };
}
