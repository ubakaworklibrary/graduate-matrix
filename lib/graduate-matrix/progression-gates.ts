import type {
  CompetencyCycle,
  CompetencyCycleId,
  CompetencyLevel,
  CompetencyRecord,
  DevelopmentActionId,
  IsoDate,
  IsoDateTime,
  MentorAssessment,
  WorkflowRole,
} from "../../types/graduate-matrix";
import type { BaselineReadinessSummary } from "./readiness";

export type ProgressionBlockerCode =
  | "baseline-not-ready"
  | "initial-level-must-be-l1"
  | "active-cycle-already-exists"
  | "active-cycle-missing"
  | "active-cycle-not-open"
  | "assessment-missing"
  | "assessment-not-demonstrated"
  | "progression-discussion-not-recommended"
  | "mentor-completion-date-required"
  | "mentor-completer-required"
  | "manager-sign-off-date-required"
  | "manager-signatory-required"
  | "manager-sign-off-confirmation-required"
  | "decision-reason-required"
  | "evidence-basis-required"
  | "carry-forward-due-date-required"
  | "reset-cycle-not-found"
  | "reset-cycle-not-paused"
  | "reset-cycle-must-be-above-active"
  | "recovery-reason-too-short"
  | "evidence-retention-confirmation-required"
  | "action-archive-confirmation-required"
  | "evidence-move-confirmation-required";

export interface ProgressionBlocker {
  code: ProgressionBlockerCode;
  actionId?: DevelopmentActionId;
}

export interface ProgressionGateResult {
  allowed: boolean;
  blockers: readonly ProgressionBlocker[];
}

/**
 * The source requires these workflow values at completion time, but the
 * canonical completion event does not retain the confirmation or evidence
 * basis fields. They remain explicit gate inputs rather than domain aliases.
 */
export interface CompletionApprovalInput {
  mentorCompletedAt: IsoDateTime | null;
  mentorCompletedBy: string;
  managerSignedOffAt: IsoDateTime | null;
  managerSignedOffBy: string;
  managerSignoffConfirmed: boolean;
  reason: string;
  evidenceBasis: string;
}

export interface CarryForwardSelectionInput {
  actionId: DevelopmentActionId;
  selected: boolean;
  newDueDate: IsoDate | null;
}

export interface InitialCycleGateInput {
  readiness: Pick<BaselineReadinessSummary, "ready">;
  level: CompetencyLevel;
  record: CompetencyRecord;
  cycles: readonly CompetencyCycle[];
}

export interface CycleCompletionGateInput {
  record: CompetencyRecord;
  cycles: readonly CompetencyCycle[];
  assessment: MentorAssessment | null;
  approval: CompletionApprovalInput;
  carryForwardSelections?: readonly CarryForwardSelectionInput[];
}

export type PausedCycleEvidenceMode = "move-active" | "keep-paused";

export interface PausedCycleResetGateInput {
  record: CompetencyRecord;
  cycles: readonly CompetencyCycle[];
  cycleId: CompetencyCycleId;
  reason: string;
  evidenceMode: PausedCycleEvidenceMode;
  hasEvidence: boolean;
  hasActions: boolean;
  evidenceRetentionConfirmed: boolean;
  actionArchiveConfirmed: boolean;
  evidenceMoveConfirmed: boolean;
}

export interface ProgressionWorkflowPermissions {
  canStartInitialCycle: boolean;
  canCompleteCycle: boolean;
  canSelectEarlierCycle: boolean;
  canResetActiveCycle: boolean;
  canResetPausedCycle: boolean;
}

function result(blockers: readonly ProgressionBlocker[]): ProgressionGateResult {
  return { allowed: blockers.length === 0, blockers };
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function isIsoDate(value: IsoDate | null): boolean {
  return value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getActiveCycle(
  record: CompetencyRecord,
  cycles: readonly CompetencyCycle[],
): CompetencyCycle | null {
  if (record.activeCycleId === null) return null;

  return (
    cycles.find(
      (cycle) =>
        cycle.id === record.activeCycleId &&
        cycle.candidateId === record.candidateId &&
        cycle.competencyId === record.competencyId,
    ) ?? null
  );
}

/** Baseline readiness applies only when the mentor starts formal L1. */
export function getInitialCycleGate(
  input: InitialCycleGateInput,
): ProgressionGateResult {
  const blockers: ProgressionBlocker[] = [];

  if (!input.readiness.ready) blockers.push({ code: "baseline-not-ready" });
  if (input.level !== "L1") blockers.push({ code: "initial-level-must-be-l1" });
  if (input.record.activeCycleId !== null || getActiveCycle(input.record, input.cycles)) {
    blockers.push({ code: "active-cycle-already-exists" });
  }

  return result(blockers);
}

/**
 * Final effective completion gates. Evidence quantity/verification/coverage,
 * review records, CPD and ordinary open or overdue actions are informational.
 */
export function getCycleCompletionGate(
  input: CycleCompletionGateInput,
): ProgressionGateResult {
  const blockers: ProgressionBlocker[] = [];
  const activeCycle = getActiveCycle(input.record, input.cycles);

  if (activeCycle === null) blockers.push({ code: "active-cycle-missing" });
  else if (activeCycle.status !== "open") {
    blockers.push({ code: "active-cycle-not-open" });
  }

  const assessmentMatchesCycle =
    input.assessment !== null &&
    activeCycle !== null &&
    input.assessment.candidateId === input.record.candidateId &&
    input.assessment.competencyId === input.record.competencyId &&
    input.assessment.cycleId === activeCycle.id;

  if (!assessmentMatchesCycle) blockers.push({ code: "assessment-missing" });
  else {
    if (input.assessment?.status !== "demonstrated") {
      blockers.push({ code: "assessment-not-demonstrated" });
    }
    if (input.assessment?.recommendation !== "progress-discussion") {
      blockers.push({ code: "progression-discussion-not-recommended" });
    }
  }

  if (input.approval.mentorCompletedAt === null) {
    blockers.push({ code: "mentor-completion-date-required" });
  }
  if (!hasText(input.approval.mentorCompletedBy)) {
    blockers.push({ code: "mentor-completer-required" });
  }
  if (input.approval.managerSignedOffAt === null) {
    blockers.push({ code: "manager-sign-off-date-required" });
  }
  if (!hasText(input.approval.managerSignedOffBy)) {
    blockers.push({ code: "manager-signatory-required" });
  }
  if (!input.approval.managerSignoffConfirmed) {
    blockers.push({ code: "manager-sign-off-confirmation-required" });
  }
  if (!hasText(input.approval.reason)) {
    blockers.push({ code: "decision-reason-required" });
  }
  if (!hasText(input.approval.evidenceBasis)) {
    blockers.push({ code: "evidence-basis-required" });
  }

  for (const selection of input.carryForwardSelections ?? []) {
    if (selection.selected && !isIsoDate(selection.newDueDate)) {
      blockers.push({
        code: "carry-forward-due-date-required",
        actionId: selection.actionId,
      });
    }
  }

  return result(blockers);
}

export function getPausedCycleResetGate(
  input: PausedCycleResetGateInput,
): ProgressionGateResult {
  const blockers: ProgressionBlocker[] = [];
  const activeCycle = getActiveCycle(input.record, input.cycles);
  const resetCycle = input.cycles.find(
    (cycle) =>
      cycle.id === input.cycleId &&
      cycle.candidateId === input.record.candidateId &&
      cycle.competencyId === input.record.competencyId,
  );

  if (activeCycle === null) blockers.push({ code: "active-cycle-missing" });
  if (resetCycle === undefined) blockers.push({ code: "reset-cycle-not-found" });
  else {
    if (resetCycle.status !== "paused") {
      blockers.push({ code: "reset-cycle-not-paused" });
    }
    if (
      activeCycle !== null &&
      LEVEL_ORDER[resetCycle.level] <= LEVEL_ORDER[activeCycle.level]
    ) {
      blockers.push({ code: "reset-cycle-must-be-above-active" });
    }
  }

  if (input.reason.trim().length < 8) {
    blockers.push({ code: "recovery-reason-too-short" });
  }
  if (!input.evidenceRetentionConfirmed) {
    blockers.push({ code: "evidence-retention-confirmation-required" });
  }
  if (input.hasActions && !input.actionArchiveConfirmed) {
    blockers.push({ code: "action-archive-confirmation-required" });
  }
  if (
    input.hasEvidence &&
    input.evidenceMode === "move-active" &&
    !input.evidenceMoveConfirmed
  ) {
    blockers.push({ code: "evidence-move-confirmation-required" });
  }

  return result(blockers);
}

const LEVEL_ORDER: Record<CompetencyLevel, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  L5: 5,
};

/** Workflow-mode permissions are deliberately separate from business gates. */
export function getProgressionWorkflowPermissions(
  role: WorkflowRole,
): ProgressionWorkflowPermissions {
  const mentor = role === "mentor";

  return {
    canStartInitialCycle: mentor,
    canCompleteCycle: mentor,
    canSelectEarlierCycle: mentor,
    canResetActiveCycle: mentor,
    canResetPausedCycle: mentor,
  };
}

export function isProgressionAllowed(resultToCheck: ProgressionGateResult): boolean {
  return resultToCheck.allowed;
}
