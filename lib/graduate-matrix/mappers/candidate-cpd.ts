import { COMPETENCY_DEFINITIONS } from "@/lib/graduate-matrix/data/competencies";
import type { CandidateCpdRows } from "@/lib/graduate-matrix/repositories/candidate-cpd";
import type {
  AttachmentMetadata,
  CpdCategory,
  CpdCompetencyLink,
  CpdCompetencyLinkType,
  CpdEntry,
} from "@/types/graduate-matrix";

const CPD_CATEGORIES: readonly CpdCategory[] = [
  "T",
  "M",
  "P",
  "E",
  "uncategorized",
];
const CPD_LINK_TYPES: readonly CpdCompetencyLinkType[] = [
  "accepted",
  "suggested",
];

export interface MappedCandidateCpd {
  entries: CpdEntry[];
  competencyLinks: CpdCompetencyLink[];
}

export type CandidateCpdMappingResult =
  | { status: "mapped"; data: MappedCandidateCpd }
  | { status: "integrity-error" };

function isOneOf<Value extends string>(
  value: string,
  allowedValues: readonly Value[],
): value is Value {
  return allowedValues.some((allowedValue) => allowedValue === value);
}

function hasDuplicate(values: readonly string[]) {
  return new Set(values).size !== values.length;
}

export function mapCandidateCpd(
  serverResolvedCandidateId: string,
  rows: CandidateCpdRows,
): CandidateCpdMappingResult {
  if (
    hasDuplicate(rows.entries.map(({ id }) => id)) ||
    hasDuplicate(rows.competencyLinks.map(({ id }) => id)) ||
    hasDuplicate(rows.attachments.map(({ id }) => id)) ||
    hasDuplicate(rows.candidateCompetencies.map(({ id }) => id))
  ) {
    return { status: "integrity-error" };
  }

  const canonicalCompetencyIds = new Set<string>(
    COMPETENCY_DEFINITIONS.map(({ id }) => id),
  );
  const candidateCompetencyIds = new Set<string>();

  for (const competency of rows.candidateCompetencies) {
    if (
      competency.candidate_id !== serverResolvedCandidateId ||
      !canonicalCompetencyIds.has(competency.competency_definition_id) ||
      candidateCompetencyIds.has(competency.competency_definition_id)
    ) {
      return { status: "integrity-error" };
    }
    candidateCompetencyIds.add(competency.competency_definition_id);
  }

  const entryIds = new Set(rows.entries.map(({ id }) => id));
  const attachmentsByEntry = new Map<string, AttachmentMetadata[]>();
  const attachmentStoragePairs = new Set<string>();

  for (const attachment of rows.attachments) {
    const storagePair = `${attachment.cpd_entry_id}:${attachment.storage_key}`;
    if (
      !entryIds.has(attachment.cpd_entry_id) ||
      !attachment.storage_key.trim() ||
      !attachment.display_filename.trim() ||
      attachmentStoragePairs.has(storagePair)
    ) {
      return { status: "integrity-error" };
    }
    attachmentStoragePairs.add(storagePair);
    const mapped = attachmentsByEntry.get(attachment.cpd_entry_id) ?? [];
    mapped.push({
      name: attachment.display_filename,
      addedAt: attachment.added_at,
    });
    attachmentsByEntry.set(attachment.cpd_entry_id, mapped);
  }

  const entries: CpdEntry[] = [];
  for (const entry of rows.entries) {
    if (
      entry.candidate_id !== serverResolvedCandidateId ||
      !Number.isFinite(entry.hours) ||
      !isOneOf(entry.category, CPD_CATEGORIES) ||
      (entry.signed_off_at === null &&
        (entry.signed_off_by_user_id !== null ||
          entry.signed_off_by_display_name !== null)) ||
      (entry.signed_off_at !== null &&
        !entry.signed_off_by_display_name?.trim())
    ) {
      return { status: "integrity-error" };
    }

    entries.push({
      id: entry.id,
      candidateId: entry.candidate_id,
      date: entry.cpd_date,
      title: entry.title,
      hours: entry.hours,
      category: entry.category,
      description: entry.description,
      outcome: entry.outcome,
      attachments: attachmentsByEntry.get(entry.id) ?? [],
      signedOffAt: entry.signed_off_at,
      signedOffBy: entry.signed_off_by_display_name,
      createdAt: entry.created_at,
      updatedAt: entry.updated_at,
    });
  }

  const competencyLinks: CpdCompetencyLink[] = [];
  const linkPairs = new Set<string>();

  for (const link of rows.competencyLinks) {
    const pair = `${link.cpd_entry_id}:${link.competency_definition_id}`;
    if (
      !entryIds.has(link.cpd_entry_id) ||
      !candidateCompetencyIds.has(link.competency_definition_id) ||
      !isOneOf(link.link_type, CPD_LINK_TYPES) ||
      linkPairs.has(pair) ||
      (link.link_type === "suggested" &&
        (link.accepted_at !== null ||
          link.accepted_by_user_id !== null ||
          link.accepted_by_display_name !== null)) ||
      (link.link_type === "accepted" &&
        (link.accepted_at === null || !link.accepted_by_display_name?.trim()))
    ) {
      return { status: "integrity-error" };
    }
    linkPairs.add(pair);
    competencyLinks.push({
      id: link.id,
      cpdEntryId: link.cpd_entry_id,
      competencyId: link.competency_definition_id,
      linkType: link.link_type,
      acceptedAt: link.accepted_at,
      acceptedBy: link.accepted_by_display_name,
      createdAt: link.created_at,
    });
  }

  return { status: "mapped", data: { entries, competencyLinks } };
}
