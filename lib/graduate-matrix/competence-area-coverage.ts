import type {
  CandidateInfo,
  CompetencyCycle,
  CompetencyCycleId,
  CompetencyDefinition,
  CompetencyId,
  CompetencyRecord,
} from "@/types/graduate-matrix";
import { competencyLevelToNumber, getCurrentCompetencyLevel } from "./competency-progress";
import { getTargetCurve, resolveCurrentCompetencyTarget } from "./progression-targets";

export type CompetenceAreaCoverageDatum = {
  area: string;
  current: number;
  target: number;
  gap: number;
  competencyCount: number;
};

type AreaAccumulator = {
  area: string;
  sumCurrent: number;
  sumTarget: number;
  competencyCount: number;
};

export function buildCompetenceAreaCoverageData(
  definitions: readonly CompetencyDefinition[],
  records: Readonly<Record<CompetencyId, CompetencyRecord>>,
  cycles: Readonly<Record<CompetencyCycleId, CompetencyCycle>>,
  candidate: Pick<CandidateInfo, "schemeStartDate" | "pathway">,
  asOf = new Date(),
  targetSchemeYear?: 1 | 2 | 3 | 4,
): CompetenceAreaCoverageDatum[] {
  const areas = new Map<string, AreaAccumulator>();

  for (const definition of definitions) {
    const area = definition.area;
    const accumulator = areas.get(area) ?? { area, sumCurrent: 0, sumTarget: 0, competencyCount: 0 };
    const record = records[definition.id];
    const currentLevel = record ? getCurrentCompetencyLevel(record, cycles) : null;
    const targetLevel = targetSchemeYear
      ? getTargetCurve(definition, candidate.pathway.engineeringRegistrationTarget)[targetSchemeYear - 1]
      : resolveCurrentCompetencyTarget(
          definition,
          record,
          candidate.pathway.engineeringRegistrationTarget,
          candidate.schemeStartDate,
          asOf,
        );
    accumulator.sumCurrent += competencyLevelToNumber(currentLevel);
    accumulator.sumTarget += competencyLevelToNumber(targetLevel);
    accumulator.competencyCount += 1;
    areas.set(area, accumulator);
  }

  return Array.from(areas.values(), ({ area, sumCurrent, sumTarget, competencyCount }) => {
    const current = sumCurrent / competencyCount;
    const target = sumTarget / competencyCount;
    return { area, current, target, gap: Math.max(0, target - current), competencyCount };
  });
}
