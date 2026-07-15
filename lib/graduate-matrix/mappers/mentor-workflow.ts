import type { MentorWorkflowRows } from "@/lib/graduate-matrix/repositories/mentor-workflow";
import type {
  CompetencyCycleReview,
  CompetencyLevel,
  MentorAssessment,
  MentorAssessmentStatus,
  ProgressionRecommendation,
} from "@/types/graduate-matrix";

const LEVELS: readonly CompetencyLevel[] = ["L1", "L2", "L3", "L4", "L5"];
const STATUSES: readonly MentorAssessmentStatus[] = ["not-reviewed", "more-evidence", "demonstrated"];
const RECOMMENDATIONS: readonly ProgressionRecommendation[] = ["not-set", "maintain-level", "progress-discussion"];

export interface MentorWorkflowCompetency {
  candidateCompetencyId: string;
  competencyId: string;
  activeCycleId: string | null;
  activeLevel: CompetencyLevel | null;
  activeStatus: string | null;
  cycleIdsByLevel: Partial<Record<CompetencyLevel, string>>;
  activeActions: { id: string; title: string; dueDate: string | null }[];
  assessments: MentorAssessment[];
  reviews: CompetencyCycleReview[];
}

export interface MentorWorkflowView {
  competencies: MentorWorkflowCompetency[];
  mentors: { userId: string; name: string }[];
  managers: { userId: string; name: string }[];
}

function oneOf<T extends string>(value: string, values: readonly T[]): value is T {
  return values.some((item) => item === value);
}

export function mapMentorWorkflow(candidateId: string, rows: MentorWorkflowRows): MentorWorkflowView | null {
  const cycles = new Map(rows.cycles.map((cycle) => [cycle.id, cycle]));
  const result: MentorWorkflowCompetency[] = [];

  if (
    rows.cycles.some((cycle) => !rows.competencies.some((competency) => competency.id === cycle.candidate_competency_id)) ||
    rows.actions.some((action) => action.candidate_id !== candidateId) ||
    rows.relationships.some((relationship) => relationship.candidate_id !== candidateId)
  ) return null;

  for (const competency of rows.competencies) {
    if (competency.candidate_id !== candidateId) return null;
    const ownedCycles = rows.cycles.filter((cycle) => cycle.candidate_competency_id === competency.id);
    const active = competency.active_cycle_id ? cycles.get(competency.active_cycle_id) : null;
    if (competency.active_cycle_id && !active) return null;
    if (active && !oneOf(active.level, LEVELS)) return null;

    const assessments: MentorAssessment[] = [];
    for (const assessment of rows.assessments.filter((item) => item.candidate_competency_id === competency.id)) {
      const assessmentCycle = cycles.get(assessment.cycle_id);
      if (assessment.candidate_id !== candidateId || !oneOf(assessment.status, STATUSES) || !oneOf(assessment.recommendation, RECOMMENDATIONS) || assessmentCycle?.candidate_competency_id !== competency.id) return null;
      assessments.push({
        id: assessment.id, candidateId, competencyId: competency.competency_definition_id,
        cycleId: assessment.cycle_id, status: assessment.status,
        recommendation: assessment.recommendation, nextAction: assessment.next_action,
        assessedAt: assessment.assessed_at, assessedBy: assessment.assessed_by_display_name,
        createdAt: assessment.created_at, updatedAt: assessment.updated_at,
      });
    }

    const reviews: CompetencyCycleReview[] = [];
    for (const review of rows.reviews.filter((item) => item.candidate_competency_id === competency.id)) {
      const reviewCycle = cycles.get(review.cycle_id);
      if (review.candidate_id !== candidateId || !oneOf(review.status, STATUSES) || !oneOf(review.recommendation, RECOMMENDATIONS) || reviewCycle?.candidate_competency_id !== competency.id) return null;
      reviews.push({
        id: review.id, candidateId, competencyId: competency.competency_definition_id,
        cycleId: review.cycle_id, status: review.status, recommendation: review.recommendation,
        nextAction: review.next_action, reviewedAt: review.reviewed_at,
        reviewedBy: review.reviewed_by_display_name, createdAt: review.created_at,
      });
    }

    const cycleIdsByLevel: Partial<Record<CompetencyLevel, string>> = {};
    for (const cycle of ownedCycles) if (oneOf(cycle.level, LEVELS)) cycleIdsByLevel[cycle.level] = cycle.id;
    result.push({
      candidateCompetencyId: competency.id,
      competencyId: competency.competency_definition_id,
      activeCycleId: competency.active_cycle_id,
      activeLevel: active && oneOf(active.level, LEVELS) ? active.level : null,
      activeStatus: active?.status ?? null,
      cycleIdsByLevel,
      activeActions: rows.actions.filter((action) => action.cycle_id === competency.active_cycle_id && action.archived_at === null && !["completed", "closed"].includes(action.status)).map((action) => ({ id: action.id, title: action.title, dueDate: action.due_date })),
      assessments,
      reviews,
    });
  }

  const people = (type: "mentor" | "manager") => rows.relationships
    .filter((relationship) => relationship.relationship_type === type && relationship.user_id)
    .map((relationship) => ({ userId: relationship.user_id as string, name: relationship.display_name }));
  return { competencies: result, mentors: people("mentor"), managers: people("manager") };
}
