import type {
  CompetencyId,
  EvidenceCompetencyLink,
  EvidenceEntry,
  EvidenceId,
  EvidenceVerificationEvent,
  EvidenceVerificationStatus,
  IsoDate,
} from "../../types/graduate-matrix";
import { COMPETENCY_DEFINITIONS } from "./data/competencies";

const ACTIVE_EVIDENCE_LINK_TYPES = new Set(["primary", "accepted"]);

export interface CompetencyEvidenceSummary {
  competencyId: CompetencyId;
  evidenceIds: readonly EvidenceId[];
  total: number;
  verified: number;
  unverified: number;
  reverificationRequired: number;
  awaitingReview: number;
}

export interface FrameworkEvidenceSummary {
  activeCompetencyCount: number;
  totalEvidenceCount: number;
  totalLinkedEvidenceCount: number;
  verifiedEvidenceCount: number;
  unverifiedEvidenceCount: number;
  reverificationRequiredCount: number;
  competenciesWithEvidence: number;
  competenciesWithoutEvidence: number;
  competencyCoveragePercentage: number;
  byCompetency: Readonly<Record<CompetencyId, CompetencyEvidenceSummary>>;
}

export interface CurrentSchemeYearEvidenceSummary {
  schemeYear: number;
  evidence: FrameworkEvidenceSummary;
}

function isEffectiveCompetencyLink(
  link: EvidenceCompetencyLink,
  includeSuggested: boolean,
): boolean {
  return includeSuggested || ACTIVE_EVIDENCE_LINK_TYPES.has(link.linkType);
}

export function getEvidenceLinksForCompetency(
  competencyId: CompetencyId,
  links: readonly EvidenceCompetencyLink[],
  includeSuggested = false,
): EvidenceCompetencyLink[] {
  return links.filter(
    (link) =>
      link.competencyId === competencyId &&
      isEffectiveCompetencyLink(link, includeSuggested),
  );
}

export function getCompetencyLinksForEvidence(
  evidenceId: EvidenceId,
  links: readonly EvidenceCompetencyLink[],
  includeSuggested = false,
): EvidenceCompetencyLink[] {
  return links.filter(
    (link) =>
      link.evidenceId === evidenceId &&
      isEffectiveCompetencyLink(link, includeSuggested),
  );
}

export function getLinkedEvidenceIdsForCompetency(
  competencyId: CompetencyId,
  links: readonly EvidenceCompetencyLink[],
  includeSuggested = false,
): EvidenceId[] {
  return Array.from(
    new Set(
      getEvidenceLinksForCompetency(
        competencyId,
        links,
        includeSuggested,
      ).map((link) => link.evidenceId),
    ),
  );
}

export function getCompetencyIdsForEvidence(
  evidenceId: EvidenceId,
  links: readonly EvidenceCompetencyLink[],
  includeSuggested = false,
): CompetencyId[] {
  return Array.from(
    new Set(
      getCompetencyLinksForEvidence(
        evidenceId,
        links,
        includeSuggested,
      ).map((link) => link.competencyId),
    ),
  );
}

export function getEvidenceForCompetency(
  competencyId: CompetencyId,
  evidence: readonly EvidenceEntry[],
  links: readonly EvidenceCompetencyLink[],
): EvidenceEntry[] {
  const linkedEvidenceIds = new Set(
    getLinkedEvidenceIdsForCompetency(competencyId, links),
  );

  return evidence.filter((entry) => linkedEvidenceIds.has(entry.id));
}

export function isEvidenceLinkedToMultipleCompetencies(
  evidenceId: EvidenceId,
  links: readonly EvidenceCompetencyLink[],
): boolean {
  return getCompetencyIdsForEvidence(evidenceId, links).length > 1;
}

export function getVerificationEventsForEvidence(
  evidenceId: EvidenceId,
  events: readonly EvidenceVerificationEvent[],
): EvidenceVerificationEvent[] {
  return events.filter((event) => event.evidenceId === evidenceId);
}

export function getLatestEvidenceVerificationEvent(
  evidenceId: EvidenceId,
  events: readonly EvidenceVerificationEvent[],
): EvidenceVerificationEvent | null {
  return getVerificationEventsForEvidence(evidenceId, events).reduce<
    EvidenceVerificationEvent | null
  >((latest, event) => {
    if (latest === null) return event;
    if (event.occurredAt > latest.occurredAt) return event;
    return latest;
  }, null);
}

export function getCurrentEvidenceVerificationStatus(
  evidence: EvidenceEntry,
  events: readonly EvidenceVerificationEvent[],
): EvidenceVerificationStatus {
  const latestEvent = getLatestEvidenceVerificationEvent(evidence.id, events);
  if (latestEvent === null) return evidence.verificationStatus;

  switch (latestEvent.type) {
    case "verified":
      return "verified";
    case "reverification-required":
      return "reverification-required";
    case "verification-revoked":
      return "unverified";
  }
}

export function isEvidenceVerified(
  evidence: EvidenceEntry,
  events: readonly EvidenceVerificationEvent[],
): boolean {
  return getCurrentEvidenceVerificationStatus(evidence, events) === "verified";
}

export function getCompetencyEvidenceSummary(
  competencyId: CompetencyId,
  evidence: readonly EvidenceEntry[],
  links: readonly EvidenceCompetencyLink[],
  verificationEvents: readonly EvidenceVerificationEvent[],
): CompetencyEvidenceSummary {
  const linkedEvidence = getEvidenceForCompetency(
    competencyId,
    evidence,
    links,
  );
  const statuses = linkedEvidence.map((entry) =>
    getCurrentEvidenceVerificationStatus(entry, verificationEvents),
  );
  const verified = statuses.filter((status) => status === "verified").length;
  const reverificationRequired = statuses.filter(
    (status) => status === "reverification-required",
  ).length;
  const unverified = statuses.filter(
    (status) => status === "unverified",
  ).length;

  return {
    competencyId,
    evidenceIds: linkedEvidence.map((entry) => entry.id),
    total: linkedEvidence.length,
    verified,
    unverified,
    reverificationRequired,
    awaitingReview: linkedEvidence.length - verified,
  };
}

export function getFrameworkEvidenceSummary(
  evidence: readonly EvidenceEntry[],
  links: readonly EvidenceCompetencyLink[],
  verificationEvents: readonly EvidenceVerificationEvent[],
): FrameworkEvidenceSummary {
  const activeCompetencyIds = COMPETENCY_DEFINITIONS.map(
    (definition) => definition.id,
  );
  const activeCompetencyIdSet = new Set<CompetencyId>(activeCompetencyIds);
  const byCompetency: Record<CompetencyId, CompetencyEvidenceSummary> = {};

  activeCompetencyIds.forEach((competencyId) => {
    byCompetency[competencyId] = getCompetencyEvidenceSummary(
      competencyId,
      evidence,
      links,
      verificationEvents,
    );
  });

  const competenciesWithEvidence = activeCompetencyIds.filter(
    (competencyId) => byCompetency[competencyId].total > 0,
  ).length;
  const linkedEvidenceIds = new Set(
    links
      .filter(
        (link) =>
          activeCompetencyIdSet.has(link.competencyId) &&
          isEffectiveCompetencyLink(link, false),
      )
      .map((link) => link.evidenceId),
  );
  const linkedEvidence = evidence.filter((entry) =>
    linkedEvidenceIds.has(entry.id),
  );
  const statuses = linkedEvidence.map((entry) =>
    getCurrentEvidenceVerificationStatus(entry, verificationEvents),
  );
  const verifiedEvidenceCount = statuses.filter(
    (status) => status === "verified",
  ).length;
  const reverificationRequiredCount = statuses.filter(
    (status) => status === "reverification-required",
  ).length;

  return {
    activeCompetencyCount: activeCompetencyIds.length,
    totalEvidenceCount: evidence.length,
    totalLinkedEvidenceCount: linkedEvidence.length,
    verifiedEvidenceCount,
    unverifiedEvidenceCount: statuses.filter(
      (status) => status === "unverified",
    ).length,
    reverificationRequiredCount,
    competenciesWithEvidence,
    competenciesWithoutEvidence:
      activeCompetencyIds.length - competenciesWithEvidence,
    competencyCoveragePercentage:
      activeCompetencyIds.length === 0
        ? 0
        : Math.round(
            (competenciesWithEvidence / activeCompetencyIds.length) * 100,
          ),
    byCompetency,
  };
}

export function getCurrentSchemeYear(
  schemeStartDate: IsoDate | null,
  today: Date,
): number {
  if (!schemeStartDate) return 1;

  const start = new Date(schemeStartDate);
  if (Number.isNaN(start.getTime())) return 1;

  const months =
    (today.getFullYear() - start.getFullYear()) * 12 +
    (today.getMonth() - start.getMonth());

  return Math.max(1, Math.min(5, Math.floor(months / 12) + 1));
}

export function getEvidenceForSchemeYear(
  evidence: readonly EvidenceEntry[],
  schemeStartDate: IsoDate | null,
  schemeYear: number,
): EvidenceEntry[] {
  if (!schemeStartDate) return [...evidence];

  const start = new Date(schemeStartDate);
  if (Number.isNaN(start.getTime())) return [...evidence];

  const from = new Date(start);
  from.setFullYear(start.getFullYear() + Math.max(0, schemeYear - 1));
  const to = new Date(start);
  to.setFullYear(start.getFullYear() + Math.max(1, schemeYear));

  return evidence.filter((entry) => {
    const entryDate = new Date(entry.date || entry.createdAt || entry.updatedAt);
    if (Number.isNaN(entryDate.getTime())) return true;
    return entryDate >= from && entryDate < to;
  });
}

export function getCurrentSchemeYearEvidenceSummary(
  evidence: readonly EvidenceEntry[],
  links: readonly EvidenceCompetencyLink[],
  verificationEvents: readonly EvidenceVerificationEvent[],
  schemeStartDate: IsoDate | null,
  today: Date,
): CurrentSchemeYearEvidenceSummary {
  const schemeYear = getCurrentSchemeYear(schemeStartDate, today);
  const currentYearEvidence = getEvidenceForSchemeYear(
    evidence,
    schemeStartDate,
    schemeYear,
  );

  return {
    schemeYear,
    evidence: getFrameworkEvidenceSummary(
      currentYearEvidence,
      links,
      verificationEvents,
    ),
  };
}
