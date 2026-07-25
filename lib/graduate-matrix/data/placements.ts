import type { PlacementDiscipline } from "../../../types/graduate-matrix";

export const PLACEMENT_DISCIPLINE_CODES: readonly PlacementDiscipline[] = [
  "mechanical-public-health",
  "electrical",
  "sustainability",
  "administration",
];

export const PLACEMENT_DISCIPLINE_LABELS: Record<PlacementDiscipline, string> = {
  "mechanical-public-health": "Mechanical & Public Health",
  electrical: "Electrical",
  sustainability: "Sustainability",
  administration: "Administration",
};

export function getPlacementDisciplineLabel(discipline: PlacementDiscipline): string {
  return PLACEMENT_DISCIPLINE_LABELS[discipline];
}

// Mirrors private.is_candidate_placement_discipline_eligible (the database's
// own authoritative rule) so the UI never has to guess or duplicate it.
// Administration is deliberately last in every list so it renders as the
// final tab.
const HOME_DISCIPLINE_ELIGIBILITY: Record<string, readonly PlacementDiscipline[]> = {
  "Mechanical & Public Health": ["electrical", "sustainability", "administration"],
  Electrical: ["mechanical-public-health", "sustainability", "administration"],
  Sustainability: ["mechanical-public-health", "electrical", "administration"],
};

export function getEligiblePlacementDisciplines(
  candidateHomeDiscipline: string,
): readonly PlacementDiscipline[] {
  return HOME_DISCIPLINE_ELIGIBILITY[candidateHomeDiscipline] ?? [];
}
