import type {
  CompetencyCycle,
  CompetencyCycleId,
  CompetencyId,
  CompetencyLevel,
  CompetencyRecord,
  CycleStatus,
} from "@/types/graduate-matrix";
import { COMPETENCY_DEFINITIONS } from "@/lib/graduate-matrix/data/competencies";
import type { CandidateCompetencyRows } from "@/lib/graduate-matrix/repositories/candidate-competencies";

const LEVELS: readonly CompetencyLevel[] = ["L1", "L2", "L3", "L4", "L5"];
const CYCLE_STATUSES: readonly CycleStatus[] = [
  "locked",
  "open",
  "paused",
  "completed",
  "archived",
];

export interface MappedCandidateCompetencies {
  records: Record<CompetencyId, CompetencyRecord>;
  cycles: Record<CompetencyCycleId, CompetencyCycle>;
}

export type CandidateCompetencyMappingResult =
  | { status: "mapped"; data: MappedCandidateCompetencies }
  | { status: "integrity-error" };

function isOneOf<Value extends string>(
  value: string,
  allowedValues: readonly Value[],
): value is Value {
  return allowedValues.some((allowedValue) => allowedValue === value);
}

export function mapCandidateCompetencies(
  rows: CandidateCompetencyRows,
): CandidateCompetencyMappingResult {
  const canonicalDefinitions = new Map<
    string,
    { definition: (typeof COMPETENCY_DEFINITIONS)[number]; sourceOrder: number }
  >(
    COMPETENCY_DEFINITIONS.map((definition, index) => [
      definition.id,
      { definition, sourceOrder: index + 1 },
    ]),
  );
  const databaseDefinitions = new Map(
    rows.definitions.map((definition) => [definition.id, definition]),
  );

  if (
    databaseDefinitions.size !== canonicalDefinitions.size ||
    [...canonicalDefinitions].some(([id, canonical]) => {
      const database = databaseDefinitions.get(id);
      return (
        !database ||
        database.reference !== canonical.definition.reference ||
        database.source_order !== canonical.sourceOrder
      );
    })
  ) {
    return { status: "integrity-error" };
  }

  const competencyRowsById = new Map(
    rows.competencies.map((competency) => [competency.id, competency]),
  );
  const competencyDefinitionIds = new Set<string>();
  const targetLevelOverrides = new Map<string, CompetencyLevel | null>();

  for (const competency of rows.competencies) {
    if (
      !canonicalDefinitions.has(competency.competency_definition_id) ||
      competencyDefinitionIds.has(competency.competency_definition_id) ||
      (competency.target_level_override !== null &&
        !isOneOf(competency.target_level_override, LEVELS))
    ) {
      return { status: "integrity-error" };
    }

    competencyDefinitionIds.add(competency.competency_definition_id);
    targetLevelOverrides.set(
      competency.id,
      competency.target_level_override,
    );
  }

  const cycleRowsById = new Map(rows.cycles.map((cycle) => [cycle.id, cycle]));
  const cycles: Record<CompetencyCycleId, CompetencyCycle> = {};

  for (const cycle of rows.cycles) {
    const owner = competencyRowsById.get(cycle.candidate_competency_id);

    if (
      !owner ||
      !isOneOf(cycle.level, LEVELS) ||
      !isOneOf(cycle.status, CYCLE_STATUSES)
    ) {
      return { status: "integrity-error" };
    }

    cycles[cycle.id] = {
      id: cycle.id,
      candidateId: owner.candidate_id,
      competencyId: owner.competency_definition_id,
      level: cycle.level,
      status: cycle.status,
      openedAt: cycle.opened_at,
      openedBy: cycle.opened_by_display_name,
      completedAt: cycle.completed_at,
      completedBy: cycle.completed_by_display_name,
      completionReason: cycle.completion_reason,
      createdAt: cycle.created_at,
      updatedAt: cycle.updated_at,
    };
  }

  const records: Record<CompetencyId, CompetencyRecord> = {};

  for (const competency of rows.competencies) {
    if (competency.active_cycle_id !== null) {
      const activeCycle = cycleRowsById.get(competency.active_cycle_id);

      if (
        !activeCycle ||
        activeCycle.candidate_competency_id !== competency.id
      ) {
        return { status: "integrity-error" };
      }
    }

    records[competency.competency_definition_id] = {
      candidateId: competency.candidate_id,
      competencyId: competency.competency_definition_id,
      activeCycleId: competency.active_cycle_id,
      targetLevelOverride: targetLevelOverrides.get(competency.id) ?? null,
      createdAt: competency.created_at,
      updatedAt: competency.updated_at,
    };
  }

  return { status: "mapped", data: { records, cycles } };
}
