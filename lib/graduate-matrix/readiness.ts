import type {
  BaselineTask,
  BaselineTaskDefinition,
  BaselineTaskId,
  BaselineTaskStatus,
  IsoDate,
  PrimaryOutcome,
} from "../../types/graduate-matrix";
import { BASELINE_TASK_DEFINITIONS } from "./data/baseline-tasks";

export interface CandidateReadinessInput {
  firstName: string;
  surname: string;
  schemeStartDate: IsoDate | null;
  mentorName: string;
  lineManagerName: string;
  reviewerName: string;
  primaryOutcome: PrimaryOutcome | null;
}

export type BaselineTaskStateInput = Pick<BaselineTask, "id" | "status">;

export interface BaselineTaskReadiness {
  definition: BaselineTaskDefinition;
  status: BaselineTaskStatus;
  met: boolean;
}

export interface BaselineReadinessSummary {
  tasks: readonly BaselineTaskReadiness[];
  missingMandatoryTaskIds: readonly BaselineTaskId[];
  completeOrWaived: number;
  totalRequired: number;
  ready: boolean;
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

export function isAutomaticBaselineTaskComplete(
  taskId: BaselineTaskId,
  candidate: CandidateReadinessInput,
): boolean {
  switch (taskId) {
    case "candidate-profile":
      return (
        hasText(candidate.firstName) &&
        hasText(candidate.surname) &&
        Boolean(candidate.schemeStartDate)
      );
    case "registration-route":
      return candidate.primaryOutcome !== null;
    case "mentor-confirmed":
      return Boolean(candidate.mentorName);
    case "manager-reviewer-confirmed":
      return Boolean(candidate.reviewerName || candidate.lineManagerName);
    default:
      return false;
  }
}

export function getBaselineTaskStatus(
  definition: BaselineTaskDefinition,
  candidate: CandidateReadinessInput,
  storedTask?: BaselineTaskStateInput,
): BaselineTaskStatus {
  if (
    definition.completionMode === "automatic" &&
    isAutomaticBaselineTaskComplete(definition.id, candidate)
  ) {
    return "complete";
  }

  if (storedTask?.status === "waived") {
    return "waived";
  }

  if (
    definition.completionMode === "mentor" &&
    storedTask?.status === "complete"
  ) {
    return "complete";
  }

  return "not-complete";
}

export function isBaselineTaskMet(status: BaselineTaskStatus): boolean {
  return status === "complete" || status === "waived";
}

export function getBaselineReadiness(
  candidate: CandidateReadinessInput,
  storedTasks: Readonly<
    Partial<Record<BaselineTaskId, BaselineTaskStateInput>>
  > = {},
): BaselineReadinessSummary {
  const tasks = BASELINE_TASK_DEFINITIONS.map((definition) => {
    const status = getBaselineTaskStatus(
      definition,
      candidate,
      storedTasks[definition.id],
    );

    return {
      definition,
      status,
      met: isBaselineTaskMet(status),
    };
  });
  const requiredTasks = tasks.filter(({ definition }) => definition.mandatory);
  const missingMandatoryTaskIds = requiredTasks
    .filter(({ met }) => !met)
    .map(({ definition }) => definition.id);

  return {
    tasks,
    missingMandatoryTaskIds,
    completeOrWaived:
      requiredTasks.length - missingMandatoryTaskIds.length,
    totalRequired: requiredTasks.length,
    ready: missingMandatoryTaskIds.length === 0,
  };
}

export function isCandidateReadyForFormalTraining(
  candidate: CandidateReadinessInput,
  storedTasks: Readonly<
    Partial<Record<BaselineTaskId, BaselineTaskStateInput>>
  > = {},
): boolean {
  return getBaselineReadiness(candidate, storedTasks).ready;
}
