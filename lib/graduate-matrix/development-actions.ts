import type {
  CompetencyId,
  DevelopmentAction,
  DevelopmentActionId,
  EvidenceActionLink,
  EvidenceEntry,
  EvidenceId,
  IsoDate,
  StandardTaskId,
} from "../../types/graduate-matrix";
import {
  STANDARD_DEVELOPMENT_TASKS,
  type StandardDevelopmentTask,
} from "./data/standard-tasks";

export interface DevelopmentActionDerivedState {
  archived: boolean;
  completed: boolean;
  closed: boolean;
  terminal: boolean;
  active: boolean;
  overdue: boolean;
  dueSoon: boolean;
}

export interface DevelopmentActionSummary {
  total: number;
  active: number;
  completed: number;
  closed: number;
  submittedOrReturned: number;
  overdue: number;
  dueSoon: number;
  archived: number;
}

export interface CompetencyActionSummary extends DevelopmentActionSummary {
  competencyId: CompetencyId;
}

export function isDevelopmentActionArchived(
  action: DevelopmentAction,
): boolean {
  return action.archivedAt !== null;
}

export function isDevelopmentActionTerminal(
  action: DevelopmentAction,
): boolean {
  return action.status === "completed" || action.status === "closed";
}

export function isDevelopmentActionActive(
  action: DevelopmentAction,
): boolean {
  return !isDevelopmentActionArchived(action) && !isDevelopmentActionTerminal(action);
}

export function isDevelopmentActionOverdue(
  action: DevelopmentAction,
  today: IsoDate,
): boolean {
  return (
    isDevelopmentActionActive(action) &&
    action.dueDate !== null &&
    action.dueDate < today
  );
}

export function getDueSoonCutoff(today: IsoDate): IsoDate {
  const date = new Date(`${today}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + 7);
  return date.toISOString().slice(0, 10);
}

export function isDevelopmentActionDueSoon(
  action: DevelopmentAction,
  today: IsoDate,
): boolean {
  if (!isDevelopmentActionActive(action) || action.dueDate === null) {
    return false;
  }

  return action.dueDate >= today && action.dueDate <= getDueSoonCutoff(today);
}

export function getDevelopmentActionDerivedState(
  action: DevelopmentAction,
  today: IsoDate,
): DevelopmentActionDerivedState {
  const archived = isDevelopmentActionArchived(action);
  const completed = action.status === "completed";
  const closed = action.status === "closed";
  const terminal = completed || closed;
  const active = !archived && !terminal;

  return {
    archived,
    completed,
    closed,
    terminal,
    active,
    overdue: isDevelopmentActionOverdue(action, today),
    dueSoon: isDevelopmentActionDueSoon(action, today),
  };
}

export function getCurrentDevelopmentActions(
  actions: readonly DevelopmentAction[],
): DevelopmentAction[] {
  return actions.filter((action) => !isDevelopmentActionArchived(action));
}

export function getArchivedDevelopmentActions(
  actions: readonly DevelopmentAction[],
): DevelopmentAction[] {
  return actions.filter(isDevelopmentActionArchived);
}

export function getActionsForCompetency(
  competencyId: CompetencyId,
  actions: readonly DevelopmentAction[],
  includeArchived = false,
): DevelopmentAction[] {
  return actions.filter(
    (action) =>
      action.competencyId === competencyId &&
      (includeArchived || !isDevelopmentActionArchived(action)),
  );
}

export function getDevelopmentActionSummary(
  actions: readonly DevelopmentAction[],
  today: IsoDate,
): DevelopmentActionSummary {
  const currentActions = getCurrentDevelopmentActions(actions);
  const states = currentActions.map((action) =>
    getDevelopmentActionDerivedState(action, today),
  );

  return {
    total: currentActions.length,
    active: states.filter((state) => state.active).length,
    completed: states.filter((state) => state.completed).length,
    closed: states.filter((state) => state.closed).length,
    submittedOrReturned: currentActions.filter(
      (action) =>
        action.status === "submitted" ||
        action.status === "returned-for-revision",
    ).length,
    overdue: states.filter((state) => state.overdue).length,
    dueSoon: states.filter((state) => state.dueSoon).length,
    archived: actions.length - currentActions.length,
  };
}

export function getCompetencyActionSummary(
  competencyId: CompetencyId,
  actions: readonly DevelopmentAction[],
  today: IsoDate,
): CompetencyActionSummary {
  return {
    competencyId,
    ...getDevelopmentActionSummary(
      getActionsForCompetency(competencyId, actions, true),
      today,
    ),
  };
}

export function getStandardTaskTemplate(
  standardTaskId: StandardTaskId,
): StandardDevelopmentTask | null {
  return (
    STANDARD_DEVELOPMENT_TASKS.find(
      (template) => template.id === standardTaskId,
    ) ?? null
  );
}

export function getSourceStandardTaskTemplate(
  action: DevelopmentAction,
): StandardDevelopmentTask | null {
  return action.sourceStandardTaskId === null
    ? null
    : getStandardTaskTemplate(action.sourceStandardTaskId);
}

export function getEvidenceActionLinksForAction(
  actionId: DevelopmentActionId,
  links: readonly EvidenceActionLink[],
): EvidenceActionLink[] {
  return links.filter((link) => link.developmentActionId === actionId);
}

export function getEvidenceActionLinksForEvidence(
  evidenceId: EvidenceId,
  links: readonly EvidenceActionLink[],
): EvidenceActionLink[] {
  return links.filter((link) => link.evidenceId === evidenceId);
}

export function getEvidenceIdsForAction(
  actionId: DevelopmentActionId,
  links: readonly EvidenceActionLink[],
): EvidenceId[] {
  return Array.from(
    new Set(
      getEvidenceActionLinksForAction(actionId, links).map(
        (link) => link.evidenceId,
      ),
    ),
  );
}

export function getActionIdsForEvidence(
  evidenceId: EvidenceId,
  links: readonly EvidenceActionLink[],
): DevelopmentActionId[] {
  return Array.from(
    new Set(
      getEvidenceActionLinksForEvidence(evidenceId, links).map(
        (link) => link.developmentActionId,
      ),
    ),
  );
}

export function getEvidenceForAction(
  actionId: DevelopmentActionId,
  evidence: readonly EvidenceEntry[],
  links: readonly EvidenceActionLink[],
): EvidenceEntry[] {
  const evidenceIds = new Set(getEvidenceIdsForAction(actionId, links));
  return evidence.filter((entry) => evidenceIds.has(entry.id));
}

export function getActionsForEvidence(
  evidenceId: EvidenceId,
  actions: readonly DevelopmentAction[],
  links: readonly EvidenceActionLink[],
  includeArchived = false,
): DevelopmentAction[] {
  const actionIds = new Set(getActionIdsForEvidence(evidenceId, links));
  return actions.filter(
    (action) =>
      actionIds.has(action.id) &&
      (includeArchived || !isDevelopmentActionArchived(action)),
  );
}
