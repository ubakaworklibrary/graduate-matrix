import type {
  BaselineSetup,
  BaselineStatus,
  BaselineTask,
  BaselineTaskId,
  BaselineTaskStatus,
} from "@/types/graduate-matrix";
import { BASELINE_TASK_DEFINITIONS } from "@/lib/graduate-matrix/data/baseline-tasks";
import type { CandidateBaselineRows } from "@/lib/graduate-matrix/repositories/candidate-baseline";

const BASELINE_STATUSES: readonly BaselineStatus[] = [
  "not-started",
  "in-progress",
  "completed",
];
const TASK_STATUSES: readonly BaselineTaskStatus[] = [
  "not-complete",
  "complete",
  "waived",
];
const CANONICAL_TASK_IDS = new Set<BaselineTaskId>(
  BASELINE_TASK_DEFINITIONS.map(({ id }) => id),
);

export type BaselineMappingResult =
  | { status: "mapped"; setup: BaselineSetup | null }
  | { status: "definition-mismatch" };

function isOneOf<Value extends string>(
  value: string,
  allowedValues: readonly Value[],
): value is Value {
  return allowedValues.some((allowedValue) => allowedValue === value);
}

export function mapCandidateBaseline(
  rows: CandidateBaselineRows,
): BaselineMappingResult {
  const databaseTaskIds = new Set(rows.definitions.map(({ id }) => id));
  const definitionsMatch =
    databaseTaskIds.size === CANONICAL_TASK_IDS.size &&
    [...CANONICAL_TASK_IDS].every((id) => databaseTaskIds.has(id));

  if (
    !definitionsMatch ||
    rows.tasks.some(
      (task) =>
        !CANONICAL_TASK_IDS.has(task.definition_id) ||
        !databaseTaskIds.has(task.definition_id),
    )
  ) {
    return { status: "definition-mismatch" };
  }

  if (rows.setup === null) {
    return { status: "mapped", setup: null };
  }

  if (
    !isOneOf(rows.setup.status, BASELINE_STATUSES) ||
    rows.tasks.some((task) => !isOneOf(task.status, TASK_STATUSES))
  ) {
    return { status: "definition-mismatch" };
  }

  const tasks: Record<BaselineTaskId, BaselineTask> = {};

  for (const task of rows.tasks) {
    if (!isOneOf(task.status, TASK_STATUSES)) {
      return { status: "definition-mismatch" };
    }

    tasks[task.definition_id] = {
      id: task.definition_id,
      status: task.status,
      note: task.note,
      completedAt: task.completed_at,
      completedBy: task.completed_by_display_name,
      updatedAt: task.updated_at,
    };
  }

  return {
    status: "mapped",
    setup: {
      candidateId: rows.setup.candidate_id,
      status: rows.setup.status,
      tasks,
      formalTrainingStartedAt: rows.setup.formal_training_started_at,
      formalTrainingStartedBy:
        rows.setup.formal_training_started_by_display_name,
      updatedAt: rows.setup.updated_at,
    },
  };
}
