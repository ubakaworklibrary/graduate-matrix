import type {
  CompetencyCycle,
  CompetencyCycleId,
  CompetencyLevel,
  CompetencyRecord,
  IsoDate,
} from "../../types/graduate-matrix";

const COMPETENCY_LEVEL_VALUES: Record<CompetencyLevel, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
  L4: 4,
  L5: 5,
};

export interface CompetencyProgressSummary {
  currentLevel: CompetencyLevel | null;
  targetLevel: CompetencyLevel | null;
  levelDifference: number | null;
  gapMonths: number | null;
  atOrAboveTarget: boolean | null;
}

export function getActiveCompetencyCycle(
  record: CompetencyRecord,
  cycles: Readonly<Record<CompetencyCycleId, CompetencyCycle>>,
): CompetencyCycle | null {
  if (record.activeCycleId === null) return null;

  const cycle = cycles[record.activeCycleId];
  if (!cycle) return null;
  if (cycle.competencyId !== record.competencyId) return null;
  if (cycle.candidateId !== record.candidateId) return null;

  return cycle;
}

export function hasActiveCompetencyCycle(
  record: CompetencyRecord,
  cycles: Readonly<Record<CompetencyCycleId, CompetencyCycle>>,
): boolean {
  return getActiveCompetencyCycle(record, cycles) !== null;
}

export function getCurrentCompetencyLevel(
  record: CompetencyRecord,
  cycles: Readonly<Record<CompetencyCycleId, CompetencyCycle>>,
): CompetencyLevel | null {
  return getActiveCompetencyCycle(record, cycles)?.level ?? null;
}

export function getCompetencyTargetLevel(
  record: CompetencyRecord,
  baselineTarget: CompetencyLevel | null,
): CompetencyLevel | null {
  return record.targetLevelOverride ?? baselineTarget;
}

export function compareCompetencyLevels(
  currentLevel: CompetencyLevel,
  targetLevel: CompetencyLevel,
): number {
  return (
    COMPETENCY_LEVEL_VALUES[currentLevel] -
    COMPETENCY_LEVEL_VALUES[targetLevel]
  );
}

export function getCompetencyProgressSummary(
  currentLevel: CompetencyLevel | null,
  targetLevel: CompetencyLevel | null,
  schemeStartDate: IsoDate | null,
): CompetencyProgressSummary {
  if (currentLevel === null || targetLevel === null) {
    return {
      currentLevel,
      targetLevel,
      levelDifference: null,
      gapMonths: null,
      atOrAboveTarget: null,
    };
  }

  const levelDifference = compareCompetencyLevels(currentLevel, targetLevel);

  return {
    currentLevel,
    targetLevel,
    levelDifference,
    gapMonths: schemeStartDate ? levelDifference * 12 : null,
    atOrAboveTarget: levelDifference >= 0,
  };
}
