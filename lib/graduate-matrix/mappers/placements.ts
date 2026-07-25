import { getEligiblePlacementDisciplines } from "@/lib/graduate-matrix/data/placements";
import type {
  CandidatePlacementsRows,
  CandidatePlacementTaskRow,
  CandidatePlacementWorkspaceRow,
} from "@/lib/graduate-matrix/repositories/placements";
import type {
  CandidateId,
  CandidatePlacementTask,
  CandidatePlacementWorkspace,
  PlacementDiscipline,
  PlacementTaskDefinition,
  PlacementTaskProgress,
  PlacementVerificationEvent,
  PlacementVerificationEventType,
  PlacementVerificationStatus,
  PlacementWorkspaceSummary,
  PlacementsViewModel,
} from "@/types/graduate-matrix";

const DISCIPLINE_CODES: readonly PlacementDiscipline[] = [
  "mechanical-public-health",
  "electrical",
  "sustainability",
  "administration",
];
const PROGRESS_CODES: readonly PlacementTaskProgress[] = [
  "not-started",
  "in-progress",
  "complete",
];
const EVENT_TYPES: readonly PlacementVerificationEventType[] = [
  "verified",
  "changes-required",
  "reverification-required",
];

function isOneOf<Value extends string>(
  value: string,
  allowedValues: readonly Value[],
): value is Value {
  return allowedValues.some((allowedValue) => allowedValue === value);
}

function isIsoDateTime(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const daysInMonth = month >= 1 && month <= 12
    ? new Date(Date.UTC(year, month, 0)).getUTCDate()
    : 0;

  return day >= 1
    && day <= daysInMonth
    && hour <= 23
    && minute <= 59
    && second <= 59
    && Number.isFinite(Date.parse(value));
}

export interface PlacementsCapabilities {
  canAssignTasks: boolean;
  canUpdateCandidateProgress: boolean;
  canVerifyTasks: boolean;
}

export type PlacementsMappingResult =
  | { status: "loaded"; data: PlacementsViewModel }
  | { status: "integrity-error" };

export function mapCandidatePlacements(
  candidateId: CandidateId,
  candidateHomeDiscipline: string,
  rows: CandidatePlacementsRows,
  capabilities: PlacementsCapabilities,
): PlacementsMappingResult {
  const definitions: PlacementTaskDefinition[] = [];
  for (const row of rows.definitions) {
    if (!isOneOf(row.discipline, DISCIPLINE_CODES)) return { status: "integrity-error" };
    definitions.push({
      id: row.id,
      discipline: row.discipline,
      title: row.title,
      description: row.description,
      suggestedStage: row.suggested_stage,
      sourceOrder: row.source_order,
      isActive: row.is_active,
    });
  }
  definitions.sort((a, b) => a.sourceOrder - b.sourceOrder);
  const definitionById = new Map(definitions.map((definition) => [definition.id, definition]));

  // rows.events is already ordered occurred_at desc, created_at desc, id desc
  // by the repository query, so the first entry per task is deterministically
  // the latest event.
  const eventsByTask = new Map<string, PlacementVerificationEvent[]>();
  for (const row of rows.events) {
    if (!isOneOf(row.event_type, EVENT_TYPES)) return { status: "integrity-error" };
    if (!isIsoDateTime(row.occurred_at)) return { status: "integrity-error" };
    const event: PlacementVerificationEvent = {
      id: row.id,
      eventType: row.event_type,
      actorDisplayName: row.actor_display_name,
      mentorComment: row.mentor_comment,
      occurredAt: row.occurred_at,
    };
    const list = eventsByTask.get(row.candidate_placement_task_id) ?? [];
    list.push(event);
    eventsByTask.set(row.candidate_placement_task_id, list);
  }

  const taskRowsByWorkspace = new Map<string, CandidatePlacementTaskRow[]>();
  for (const row of rows.tasks) {
    const list = taskRowsByWorkspace.get(row.candidate_placement_workspace_id) ?? [];
    list.push(row);
    taskRowsByWorkspace.set(row.candidate_placement_workspace_id, list);
  }

  const workspaceRowByDiscipline = new Map<string, CandidatePlacementWorkspaceRow>();
  for (const row of rows.workspaces) {
    if (!isOneOf(row.placement_discipline, DISCIPLINE_CODES)) return { status: "integrity-error" };
    workspaceRowByDiscipline.set(row.placement_discipline, row);
  }

  const eligibleDisciplines = getEligiblePlacementDisciplines(candidateHomeDiscipline);

  if (eligibleDisciplines.length === 0) {
    return {
      status: "loaded",
      data: {
        state: "unsupported-discipline",
        candidateId,
        candidateHomeDiscipline,
        eligibleDisciplines: [],
        workspaces: [],
        ...capabilities,
      },
    };
  }

  const workspaces: CandidatePlacementWorkspace[] = [];
  for (const discipline of eligibleDisciplines) {
    const workspaceRow = workspaceRowByDiscipline.get(discipline) ?? null;
    const definitionsForDiscipline = definitions.filter(
      (definition) => definition.discipline === discipline,
    );
    const taskRows = workspaceRow ? taskRowsByWorkspace.get(workspaceRow.id) ?? [] : [];

    const assignedTasks: CandidatePlacementTask[] = [];
    const assignedDefinitionIds = new Set<string>();
    for (const taskRow of taskRows) {
      const definition = definitionById.get(taskRow.task_definition_id);
      if (!definition) return { status: "integrity-error" };
      if (!isOneOf(taskRow.candidate_progress, PROGRESS_CODES)) return { status: "integrity-error" };
      if (!isIsoDateTime(taskRow.assigned_at)) return { status: "integrity-error" };
      if (taskRow.candidate_updated_at !== null && !isIsoDateTime(taskRow.candidate_updated_at)) {
        return { status: "integrity-error" };
      }

      assignedDefinitionIds.add(taskRow.task_definition_id);
      const history = eventsByTask.get(taskRow.id) ?? [];
      const latest = history[0] ?? null;
      const currentVerificationStatus: PlacementVerificationStatus = latest
        ? latest.eventType
        : "unverified";

      assignedTasks.push({
        id: taskRow.id,
        taskDefinition: definition,
        candidateProgress: taskRow.candidate_progress,
        candidateNote: taskRow.candidate_note,
        candidateUpdatedAt: taskRow.candidate_updated_at,
        candidateUpdatedByDisplayName: taskRow.candidate_updated_by_display_name,
        assignedAt: taskRow.assigned_at,
        assignedByDisplayName: taskRow.assigned_by_display_name,
        currentVerificationStatus,
        latestVerificationEvent: latest,
        verificationHistory: history,
      });
    }
    assignedTasks.sort((a, b) =>
      a.taskDefinition.sourceOrder - b.taskDefinition.sourceOrder
      || a.taskDefinition.title.localeCompare(b.taskDefinition.title),
    );

    const availableTaskDefinitions = definitionsForDiscipline.filter(
      (definition) => !assignedDefinitionIds.has(definition.id),
    );

    const summary: PlacementWorkspaceSummary = {
      selectedTaskCount: assignedTasks.length,
      notStartedCount: assignedTasks.filter((task) => task.candidateProgress === "not-started").length,
      inProgressCount: assignedTasks.filter((task) => task.candidateProgress === "in-progress").length,
      candidateCompleteCount: assignedTasks.filter((task) => task.candidateProgress === "complete").length,
      verifiedCount: assignedTasks.filter((task) => task.currentVerificationStatus === "verified").length,
      changesRequiredCount: assignedTasks.filter((task) => task.currentVerificationStatus === "changes-required").length,
      reverificationRequiredCount: assignedTasks.filter((task) => task.currentVerificationStatus === "reverification-required").length,
    };

    workspaces.push({
      id: workspaceRow?.id ?? null,
      candidateId,
      discipline,
      assignedTasks,
      availableTaskDefinitions,
      summary,
    });
  }

  return {
    status: "loaded",
    data: {
      state: "loaded",
      candidateId,
      candidateHomeDiscipline,
      eligibleDisciplines: [...eligibleDisciplines],
      workspaces,
      ...capabilities,
    },
  };
}
