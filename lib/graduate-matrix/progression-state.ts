import type {
  CompetencyCycle,
  CompetencyCycleId,
  CompetencyLevel,
  CompetencyRecord,
  CycleCompletedEvent,
  CycleOpenedEvent,
  CyclePausedEvent,
  CycleReopenedEvent,
  CycleResetEvent,
  IsoDateTime,
  ProgressionEvent,
  ProgressionEventId,
} from "../../types/graduate-matrix";

const LEVELS: readonly CompetencyLevel[] = ["L1", "L2", "L3", "L4", "L5"];

export type ProgressionTransitionError =
  | "active-cycle-already-exists"
  | "active-cycle-missing"
  | "active-cycle-not-open"
  | "cycle-already-exists"
  | "cycle-not-found"
  | "cycle-does-not-belong-to-record"
  | "cycle-not-paused"
  | "destination-cycle-id-required"
  | "destination-cycle-id-in-use"
  | "destination-cycle-not-allowed"
  | "earlier-level-required"
  | "pause-event-id-required"
  | "transition-event-id-collision"
  | "represented-cycle-id-required"
  | "represented-cycle-level-mismatch"
  | "paused-cycle-must-be-above-active";

export interface ResetLockedCycleState {
  cycleId: CompetencyCycleId;
  sourceState: "reset";
  canonicalStatus: "locked";
}

export interface ProgressionTransitionSuccess {
  ok: true;
  record: CompetencyRecord;
  cycles: readonly CompetencyCycle[];
  events: readonly ProgressionEvent[];
  resetLockedCycles: readonly ResetLockedCycleState[];
}

export interface ProgressionTransitionFailure {
  ok: false;
  error: ProgressionTransitionError;
}

export type ProgressionTransitionResult =
  | ProgressionTransitionSuccess
  | ProgressionTransitionFailure;

interface TransitionContext {
  eventId: ProgressionEventId;
  occurredAt: IsoDateTime;
  performedBy: string;
}

export interface OpenCycleInput extends TransitionContext {
  cycleId: CompetencyCycleId;
  level: CompetencyLevel;
  reason: string | null;
}

export interface CompleteCycleInput extends TransitionContext {
  destinationCycleId: CompetencyCycleId | null;
  mentorApprovedAt: IsoDateTime;
  mentorApprovedBy: string;
  managerSignedOffAt: IsoDateTime;
  managerSignedOffBy: string;
  managerSignoffConfirmed: boolean;
  reason: string | null;
  evidenceBasis: string;
}

export interface ReopenEarlierCycleInput extends TransitionContext {
  cycleId: CompetencyCycleId;
  level: CompetencyLevel;
  reason: string;
  representedCycleIdsByLevel: Readonly<
    Partial<Record<CompetencyLevel, CompetencyCycleId>>
  >;
  resetRepresentedCycleIds: readonly CompetencyCycleId[];
  pauseEventIds: Readonly<Partial<Record<CompetencyCycleId, ProgressionEventId>>>;
}

export interface ResetActiveCycleInput extends TransitionContext {
  replacementCycleId: CompetencyCycleId;
  openedEventId: ProgressionEventId;
  reason: string;
}

export interface ResetPausedCycleInput extends TransitionContext {
  cycleId: CompetencyCycleId;
  reason: string;
}

function failure(error: ProgressionTransitionError): ProgressionTransitionFailure {
  return { ok: false, error };
}

function levelIndex(level: CompetencyLevel): number {
  return LEVELS.indexOf(level);
}

function nextLevel(level: CompetencyLevel): CompetencyLevel | null {
  return LEVELS[levelIndex(level) + 1] ?? null;
}

function belongsToRecord(
  record: CompetencyRecord,
  cycle: CompetencyCycle,
): boolean {
  return (
    cycle.candidateId === record.candidateId &&
    cycle.competencyId === record.competencyId
  );
}

function findActiveCycle(
  record: CompetencyRecord,
  cycles: readonly CompetencyCycle[],
): CompetencyCycle | null {
  if (record.activeCycleId === null) return null;
  return cycles.find((cycle) => cycle.id === record.activeCycleId) ?? null;
}

function replaceCycle(
  cycles: readonly CompetencyCycle[],
  replacement: CompetencyCycle,
): CompetencyCycle[] {
  return cycles.map((cycle) =>
    cycle.id === replacement.id ? replacement : cycle,
  );
}

function success(
  record: CompetencyRecord,
  cycles: readonly CompetencyCycle[],
  events: readonly ProgressionEvent[],
  resetLockedCycles: readonly ResetLockedCycleState[] = [],
): ProgressionTransitionSuccess {
  return { ok: true, record, cycles, events, resetLockedCycles };
}

/** Opens an explicitly supplied cycle; the initial L1 business gate is separate. */
export function openCycle(
  record: CompetencyRecord,
  cycles: readonly CompetencyCycle[],
  input: OpenCycleInput,
): ProgressionTransitionResult {
  if (record.activeCycleId !== null) return failure("active-cycle-already-exists");
  if (cycles.some((cycle) => cycle.id === input.cycleId)) {
    return failure("cycle-already-exists");
  }

  const cycle: CompetencyCycle = {
    id: input.cycleId,
    candidateId: record.candidateId,
    competencyId: record.competencyId,
    level: input.level,
    status: "open",
    openedAt: input.occurredAt,
    openedBy: input.performedBy,
    completedAt: null,
    completedBy: null,
    completionReason: "",
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
  };
  const event: CycleOpenedEvent = {
    id: input.eventId,
    type: "cycle-opened",
    candidateId: record.candidateId,
    competencyId: record.competencyId,
    cycleId: cycle.id,
    occurredAt: input.occurredAt,
    performedBy: input.performedBy,
    level: input.level,
    previousCycleId: null,
    reason: input.reason,
  };

  return success(
    { ...record, activeCycleId: cycle.id, updatedAt: input.occurredAt },
    [...cycles, cycle],
    [event],
  );
}

/**
 * Completes the open cycle. L1-L4 completion opens the next level immediately;
 * L5 remains the authoritative completed cycle and opens no further cycle.
 */
export function completeActiveCycle(
  record: CompetencyRecord,
  cycles: readonly CompetencyCycle[],
  input: CompleteCycleInput,
): ProgressionTransitionResult {
  const active = findActiveCycle(record, cycles);
  if (active === null) return failure("active-cycle-missing");
  if (!belongsToRecord(record, active)) {
    return failure("cycle-does-not-belong-to-record");
  }
  if (active.status !== "open") return failure("active-cycle-not-open");

  const destinationLevel = nextLevel(active.level);
  if (destinationLevel !== null && input.destinationCycleId === null) {
    return failure("destination-cycle-id-required");
  }
  if (destinationLevel === null && input.destinationCycleId !== null) {
    return failure("destination-cycle-not-allowed");
  }
  if (
    input.destinationCycleId !== null &&
    cycles.some((cycle) => cycle.id === input.destinationCycleId)
  ) {
    return failure("destination-cycle-id-in-use");
  }

  const completed: CompetencyCycle = {
    ...active,
    status: "completed",
    completedAt: input.mentorApprovedAt,
    completedBy: input.mentorApprovedBy,
    completionReason: input.reason ?? "",
    updatedAt: input.occurredAt,
  };
  let nextCycles = replaceCycle(cycles, completed);
  let destination: CompetencyCycle | null = null;

  if (destinationLevel !== null && input.destinationCycleId !== null) {
    destination = {
      id: input.destinationCycleId,
      candidateId: record.candidateId,
      competencyId: record.competencyId,
      level: destinationLevel,
      status: "open",
      openedAt: input.occurredAt,
      openedBy: input.mentorApprovedBy,
      completedAt: null,
      completedBy: null,
      completionReason: "",
      createdAt: input.occurredAt,
      updatedAt: input.occurredAt,
    };
    nextCycles = [...nextCycles, destination];
  }

  const event: CycleCompletedEvent = {
    id: input.eventId,
    type: "cycle-completed",
    candidateId: record.candidateId,
    competencyId: record.competencyId,
    cycleId: active.id,
    occurredAt: input.occurredAt,
    performedBy: input.performedBy,
    fromLevel: active.level,
    toLevel: destination?.level ?? null,
    destinationCycleId: destination?.id ?? null,
    mentorApprovedAt: input.mentorApprovedAt,
    mentorApprovedBy: input.mentorApprovedBy,
    managerSignedOffAt: input.managerSignedOffAt,
    managerSignedOffBy: input.managerSignedOffBy,
    managerSignoffConfirmed: input.managerSignoffConfirmed,
    approvalAuthority: "mentor-and-manager",
    reason: input.reason,
    evidenceBasis: input.evidenceBasis,
  };

  return success(
    {
      ...record,
      activeCycleId: destination?.id ?? completed.id,
      updatedAt: input.occurredAt,
    },
    nextCycles,
    [event],
  );
}

/**
 * Mirrors mentor selection of an earlier level: later opened levels are paused,
 * their history is retained, and a new cycle is opened at the selected level.
 */
export function reopenEarlierCycle(
  record: CompetencyRecord,
  cycles: readonly CompetencyCycle[],
  input: ReopenEarlierCycleInput,
): ProgressionTransitionResult {
  const active = findActiveCycle(record, cycles);
  if (active === null) return failure("active-cycle-missing");
  if (!belongsToRecord(record, active)) {
    return failure("cycle-does-not-belong-to-record");
  }
  if (active.status !== "open") return failure("active-cycle-not-open");
  if (levelIndex(input.level) >= levelIndex(active.level)) {
    return failure("earlier-level-required");
  }
  if (cycles.some((cycle) => cycle.id === input.cycleId)) {
    return failure("cycle-already-exists");
  }

  const affectedLevels = LEVELS.filter(
    (level) =>
      levelIndex(level) > levelIndex(input.level) &&
      levelIndex(level) <= levelIndex(active.level),
  );
  const cyclesToPause: CompetencyCycle[] = [];
  const resetRepresentedCycleIds = new Set(input.resetRepresentedCycleIds);

  for (const level of affectedLevels) {
    const representedCycleId = input.representedCycleIdsByLevel[level];
    if (representedCycleId === undefined) {
      return failure("represented-cycle-id-required");
    }

    const representedCycle = cycles.find(
      (cycle) => cycle.id === representedCycleId,
    );
    if (representedCycle === undefined) return failure("cycle-not-found");
    if (!belongsToRecord(record, representedCycle)) {
      return failure("cycle-does-not-belong-to-record");
    }
    if (representedCycle.level !== level) {
      return failure("represented-cycle-level-mismatch");
    }
    if (level === active.level && representedCycle.id !== active.id) {
      return failure("represented-cycle-level-mismatch");
    }

    const skipArchived = representedCycle.status === "archived";
    const skipResetLocked =
      representedCycle.status === "locked" &&
      resetRepresentedCycleIds.has(representedCycle.id);
    if (skipArchived || skipResetLocked) continue;

    cyclesToPause.push(representedCycle);
  }
  const pauseEventIds: ProgressionEventId[] = [];
  for (const cycle of cyclesToPause) {
    const pauseEventId = input.pauseEventIds[cycle.id];
    if (pauseEventId === undefined) return failure("pause-event-id-required");
    pauseEventIds.push(pauseEventId);
  }
  if (
    pauseEventIds.includes(input.eventId) ||
    new Set(pauseEventIds).size !== pauseEventIds.length
  ) {
    return failure("transition-event-id-collision");
  }

  const pausedEvents: CyclePausedEvent[] = [];
  const nextCycles = cycles.map((cycle) => {
    const shouldPause = cyclesToPause.some(
      (cycleToPause) => cycleToPause.id === cycle.id,
    );

    if (!shouldPause) return cycle;

    const eventId = input.pauseEventIds[cycle.id];
    if (eventId === undefined) return cycle;
    pausedEvents.push({
      id: eventId,
      type: "cycle-paused",
      candidateId: record.candidateId,
      competencyId: record.competencyId,
      cycleId: cycle.id,
      occurredAt: input.occurredAt,
      performedBy: input.performedBy,
      reason: input.reason,
    });

    const paused: CompetencyCycle = {
      ...cycle,
      status: "paused",
      updatedAt: input.occurredAt,
    };
    return paused;
  });

  const reopened: CompetencyCycle = {
    id: input.cycleId,
    candidateId: record.candidateId,
    competencyId: record.competencyId,
    level: input.level,
    status: "open",
    openedAt: input.occurredAt,
    openedBy: input.performedBy,
    completedAt: null,
    completedBy: null,
    completionReason: "",
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
  };
  const reopenedEvent: CycleReopenedEvent = {
    id: input.eventId,
    type: "cycle-reopened",
    candidateId: record.candidateId,
    competencyId: record.competencyId,
    cycleId: reopened.id,
    occurredAt: input.occurredAt,
    performedBy: input.performedBy,
    reason: input.reason,
  };

  return success(
    { ...record, activeCycleId: reopened.id, updatedAt: input.occurredAt },
    [...nextCycles, reopened],
    [...pausedEvents, reopenedEvent],
  );
}

/**
 * Resets the active assessment cycle by retaining it as reset/locked history
 * and opening an explicitly identified replacement at the same level.
 */
export function resetActiveCycle(
  record: CompetencyRecord,
  cycles: readonly CompetencyCycle[],
  input: ResetActiveCycleInput,
): ProgressionTransitionResult {
  const active = findActiveCycle(record, cycles);
  if (active === null) return failure("active-cycle-missing");
  if (!belongsToRecord(record, active)) {
    return failure("cycle-does-not-belong-to-record");
  }
  if (active.status !== "open") return failure("active-cycle-not-open");
  if (input.eventId === input.openedEventId) {
    return failure("transition-event-id-collision");
  }
  if (cycles.some((cycle) => cycle.id === input.replacementCycleId)) {
    return failure("cycle-already-exists");
  }

  const resetCycle: CompetencyCycle = {
    ...active,
    status: "locked",
    updatedAt: input.occurredAt,
  };
  const replacementCycle: CompetencyCycle = {
    id: input.replacementCycleId,
    candidateId: record.candidateId,
    competencyId: record.competencyId,
    level: active.level,
    status: "open",
    openedAt: input.occurredAt,
    openedBy: input.performedBy,
    completedAt: null,
    completedBy: null,
    completionReason: "",
    createdAt: input.occurredAt,
    updatedAt: input.occurredAt,
  };
  const resetEvent: CycleResetEvent = {
    id: input.eventId,
    type: "cycle-reset",
    candidateId: record.candidateId,
    competencyId: record.competencyId,
    cycleId: active.id,
    occurredAt: input.occurredAt,
    performedBy: input.performedBy,
    reason: input.reason,
  };
  const openedEvent: CycleOpenedEvent = {
    id: input.openedEventId,
    type: "cycle-opened",
    candidateId: record.candidateId,
    competencyId: record.competencyId,
    cycleId: replacementCycle.id,
    occurredAt: input.occurredAt,
    performedBy: input.performedBy,
    level: replacementCycle.level,
    previousCycleId: active.id,
    reason: input.reason,
  };

  return success(
    {
      ...record,
      activeCycleId: replacementCycle.id,
      updatedAt: input.occurredAt,
    },
    [...replaceCycle(cycles, resetCycle), replacementCycle],
    [resetEvent, openedEvent],
    [
      {
        cycleId: resetCycle.id,
        sourceState: "reset",
        canonicalStatus: "locked",
      },
    ],
  );
}

/** A reset retains the paused cycle but returns it to the canonical locked state. */
export function resetPausedCycle(
  record: CompetencyRecord,
  cycles: readonly CompetencyCycle[],
  input: ResetPausedCycleInput,
): ProgressionTransitionResult {
  const active = findActiveCycle(record, cycles);
  if (active === null) return failure("active-cycle-missing");
  const cycle = cycles.find((candidate) => candidate.id === input.cycleId);
  if (cycle === undefined) return failure("cycle-not-found");
  if (!belongsToRecord(record, cycle)) {
    return failure("cycle-does-not-belong-to-record");
  }
  if (cycle.status !== "paused") return failure("cycle-not-paused");
  if (levelIndex(cycle.level) <= levelIndex(active.level)) {
    return failure("paused-cycle-must-be-above-active");
  }

  const reset: CompetencyCycle = {
    ...cycle,
    status: "locked",
    updatedAt: input.occurredAt,
  };
  const event: CycleResetEvent = {
    id: input.eventId,
    type: "cycle-reset",
    candidateId: record.candidateId,
    competencyId: record.competencyId,
    cycleId: cycle.id,
    occurredAt: input.occurredAt,
    performedBy: input.performedBy,
    reason: input.reason,
  };

  return success(
    { ...record, updatedAt: input.occurredAt },
    replaceCycle(cycles, reset),
    [event],
    [
      {
        cycleId: reset.id,
        sourceState: "reset",
        canonicalStatus: "locked",
      },
    ],
  );
}
