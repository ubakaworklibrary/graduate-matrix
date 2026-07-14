import type {
  CompetencyId,
  CpdCategory,
  CpdCompetencyLink,
  CpdEntry,
  CpdEntryId,
  EvidenceCompetencyLink,
  EvidenceEntry,
} from "../../types/graduate-matrix";
import { COMPETENCY_DEFINITIONS } from "./data/competencies";

export interface CpdCategorySummary {
  entries: number;
  hours: number;
}

export interface CpdSummary {
  totalEntries: number;
  totalHours: number;
  signedOffHours: number;
  pendingSignoffHours: number;
  byCategory: Record<CpdCategory, CpdCategorySummary>;
}

export interface CpdTargetSummary {
  targetHours: number;
  actualHours: number;
  percentage: number;
  remainingHours: number;
  targetMet: boolean;
}

function emptyCategorySummary(): Record<CpdCategory, CpdCategorySummary> {
  return {
    T: { entries: 0, hours: 0 },
    M: { entries: 0, hours: 0 },
    P: { entries: 0, hours: 0 },
    E: { entries: 0, hours: 0 },
    uncategorized: { entries: 0, hours: 0 },
  };
}

function isCpdCategory(value: string): value is CpdCategory {
  return ["T", "M", "P", "E", "uncategorized"].includes(value);
}

function getSourceHours(hours: number): number {
  return hours || 0;
}

function suggestCpdCategoryFromCompetencyReference(
  reference: string,
): CpdCategory | null {
  if (["A1", "A2", "B1", "B2", "B3"].includes(reference)) return "T";
  if (["C1", "C2", "C3", "C4"].includes(reference)) return "M";
  if (["D1", "D2", "D3", "E4"].includes(reference)) return "P";
  if (["E1", "E2", "E3", "E5"].includes(reference)) return "E";
  return null;
}

function getEvidenceCpdCategory(
  entry: EvidenceEntry,
  links: readonly EvidenceCompetencyLink[],
): CpdCategory {
  if (entry.cpd !== null && isCpdCategory(entry.cpd.category)) {
    return entry.cpd.category;
  }
  if (entry.cpd?.category === "—") return "uncategorized";

  const entryLinks = links.filter(
    (link) =>
      link.evidenceId === entry.id && link.linkType !== "suggested",
  );
  const competencyLink =
    entryLinks.find((link) => link.linkType === "primary") ?? entryLinks[0];
  if (!competencyLink) return "uncategorized";

  const definition = COMPETENCY_DEFINITIONS.find(
    (item) => item.id === competencyLink.competencyId,
  );
  if (!definition) return "uncategorized";

  return (
    suggestCpdCategoryFromCompetencyReference(definition.reference) ??
    "uncategorized"
  );
}

function addCpdActivity(
  summary: CpdSummary,
  hours: number,
  category: CpdCategory,
  signedOff: boolean,
): void {
  const sourceHours = getSourceHours(hours);
  summary.totalEntries += 1;
  summary.totalHours += sourceHours;
  summary.byCategory[category].entries += 1;
  summary.byCategory[category].hours += sourceHours;

  if (signedOff) summary.signedOffHours += sourceHours;
  else summary.pendingSignoffHours += sourceHours;
}

export function getCpdLinksForEntry(
  cpdEntryId: CpdEntryId,
  links: readonly CpdCompetencyLink[],
  includeSuggested = true,
): CpdCompetencyLink[] {
  return links.filter(
    (link) =>
      link.cpdEntryId === cpdEntryId &&
      (includeSuggested || link.linkType === "accepted"),
  );
}

export function getCpdLinksForCompetency(
  competencyId: CompetencyId,
  links: readonly CpdCompetencyLink[],
  includeSuggested = true,
): CpdCompetencyLink[] {
  return links.filter(
    (link) =>
      link.competencyId === competencyId &&
      (includeSuggested || link.linkType === "accepted"),
  );
}

export function getCompetencyIdsForCpdEntry(
  cpdEntryId: CpdEntryId,
  links: readonly CpdCompetencyLink[],
  includeSuggested = true,
): CompetencyId[] {
  return Array.from(
    new Set(
      getCpdLinksForEntry(cpdEntryId, links, includeSuggested).map(
        (link) => link.competencyId,
      ),
    ),
  );
}

export function getCpdEntryIdsForCompetency(
  competencyId: CompetencyId,
  links: readonly CpdCompetencyLink[],
  includeSuggested = true,
): CpdEntryId[] {
  return Array.from(
    new Set(
      getCpdLinksForCompetency(competencyId, links, includeSuggested).map(
        (link) => link.cpdEntryId,
      ),
    ),
  );
}

export function getCpdEntriesForCompetency(
  competencyId: CompetencyId,
  entries: readonly CpdEntry[],
  links: readonly CpdCompetencyLink[],
  includeSuggested = true,
): CpdEntry[] {
  const entryIds = new Set(
    getCpdEntryIdsForCompetency(
      competencyId,
      links,
      includeSuggested,
    ),
  );

  return entries
    .filter((entry) => entryIds.has(entry.id))
    .sort((first, second) => second.date.localeCompare(first.date));
}

export function getRollingTwelveMonthCpdEntries(
  entries: readonly CpdEntry[],
  today: Date,
): CpdEntry[] {
  const yearAgo = new Date(
    today.getFullYear() - 1,
    today.getMonth(),
    today.getDate(),
  );

  return entries.filter((entry) => {
    if (!entry.date) return false;
    const entryDate = new Date(entry.date);
    if (Number.isNaN(entryDate.getTime())) return true;
    return entryDate >= yearAgo;
  });
}

export function getCpdSummary(entries: readonly CpdEntry[]): CpdSummary {
  const summary: CpdSummary = {
    totalEntries: 0,
    totalHours: 0,
    signedOffHours: 0,
    pendingSignoffHours: 0,
    byCategory: emptyCategorySummary(),
  };

  entries.forEach((entry) => {
    addCpdActivity(
      summary,
      entry.hours,
      entry.category,
      entry.signedOffAt !== null,
    );
  });

  return summary;
}

export function getEvidenceCpdSummary(
  evidence: readonly EvidenceEntry[],
  evidenceCompetencyLinks: readonly EvidenceCompetencyLink[],
): CpdSummary {
  const summary = getCpdSummary([]);

  evidence.forEach((entry) => {
    if (entry.cpd === null) return;
    addCpdActivity(
      summary,
      entry.cpd.hours,
      getEvidenceCpdCategory(entry, evidenceCompetencyLinks),
      entry.cpd.signedOffAt !== null,
    );
  });

  return summary;
}

export function combineCpdSummaries(
  first: CpdSummary,
  second: CpdSummary,
): CpdSummary {
  const byCategory = emptyCategorySummary();
  const categories: readonly CpdCategory[] = [
    "T",
    "M",
    "P",
    "E",
    "uncategorized",
  ];

  categories.forEach((category) => {
    byCategory[category] = {
      entries:
        first.byCategory[category].entries +
        second.byCategory[category].entries,
      hours:
        first.byCategory[category].hours +
        second.byCategory[category].hours,
    };
  });

  return {
    totalEntries: first.totalEntries + second.totalEntries,
    totalHours: first.totalHours + second.totalHours,
    signedOffHours: first.signedOffHours + second.signedOffHours,
    pendingSignoffHours:
      first.pendingSignoffHours + second.pendingSignoffHours,
    byCategory,
  };
}

export function getCombinedCpdSummary(
  entries: readonly CpdEntry[],
  evidence: readonly EvidenceEntry[],
  evidenceCompetencyLinks: readonly EvidenceCompetencyLink[],
): CpdSummary {
  return combineCpdSummaries(
    getCpdSummary(entries),
    getEvidenceCpdSummary(evidence, evidenceCompetencyLinks),
  );
}

export function getRollingTwelveMonthCpdSummary(
  entries: readonly CpdEntry[],
  today: Date,
): CpdSummary {
  return getCpdSummary(getRollingTwelveMonthCpdEntries(entries, today));
}

export function getRollingTwelveMonthCombinedCpdSummary(
  entries: readonly CpdEntry[],
  evidence: readonly EvidenceEntry[],
  evidenceCompetencyLinks: readonly EvidenceCompetencyLink[],
  today: Date,
): CpdSummary {
  const currentEvidence = getRollingTwelveMonthCpdEntries(
    evidence.map((entry) => ({
      id: entry.id,
      candidateId: entry.candidateId,
      date: entry.date,
      title: entry.title,
      hours: entry.cpd?.hours ?? 0,
      category:
        entry.cpd !== null
          ? getEvidenceCpdCategory(entry, evidenceCompetencyLinks)
          : "uncategorized",
      description: entry.description,
      outcome: entry.outcome,
      attachments: [],
      signedOffAt: entry.cpd?.signedOffAt ?? null,
      signedOffBy: entry.cpd?.signedOffBy ?? null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })),
    today,
  );
  const currentEvidenceIds = new Set(
    currentEvidence.map((entry) => entry.id),
  );

  return getCombinedCpdSummary(
    getRollingTwelveMonthCpdEntries(entries, today),
    evidence.filter(
      (entry) => entry.cpd !== null && currentEvidenceIds.has(entry.id),
    ),
    evidenceCompetencyLinks,
  );
}

export function getCpdTargetSummary(
  actualHours: number,
  targetHours: number,
): CpdTargetSummary {
  const sourceActualHours = getSourceHours(actualHours);
  return {
    targetHours,
    actualHours: sourceActualHours,
    percentage:
      targetHours > 0
        ? Math.min(100, (sourceActualHours / targetHours) * 100)
        : 0,
    remainingHours: Math.max(0, targetHours - sourceActualHours),
    targetMet: sourceActualHours >= targetHours,
  };
}
