import { COMPETENCY_DEFINITIONS } from "@/lib/graduate-matrix/data/competencies";
import { STANDARD_DEVELOPMENT_TASKS } from "@/lib/graduate-matrix/data/standard-tasks";
import { getCurrentEvidenceVerificationStatus } from "@/lib/graduate-matrix/evidence";
import type { CandidatePortfolioRows } from "@/lib/graduate-matrix/repositories/candidate-portfolio";
import type {
  DevelopmentAction,
  DevelopmentActionOwner,
  DevelopmentActionPriority,
  DevelopmentActionStatus,
  EvidenceActionLink,
  EvidenceCompetencyLink,
  EvidenceCompetencyLinkType,
  EvidenceEntry,
  EvidenceMethod,
  EvidenceVerificationEvent,
  EvidenceVerificationEventType,
  StructuredEvidenceSections,
  CompetencyLevel,
} from "@/types/graduate-matrix";

const LEVELS: readonly CompetencyLevel[] = ["L1", "L2", "L3", "L4", "L5"];
const EVIDENCE_METHODS: readonly EvidenceMethod[] = ["carr", "star", "psar"];
const LINK_TYPES: readonly EvidenceCompetencyLinkType[] = [
  "primary",
  "accepted",
  "suggested",
];
const VERIFICATION_EVENT_TYPES: readonly EvidenceVerificationEventType[] = [
  "verified",
  "verification-revoked",
  "reverification-required",
];
const ACTION_OWNERS: readonly DevelopmentActionOwner[] = [
  "graduate",
  "mentor",
  "shared",
];
const ACTION_PRIORITIES: readonly DevelopmentActionPriority[] = [
  "low",
  "medium",
  "high",
];
const ACTION_STATUSES: readonly DevelopmentActionStatus[] = [
  "open",
  "submitted",
  "returned-for-revision",
  "completed",
  "closed",
];
const CPD_CATEGORIES = new Set(["T", "M", "P", "E", "uncategorized"]);

export interface MappedCandidatePortfolio {
  evidence: EvidenceEntry[];
  competencyLinks: EvidenceCompetencyLink[];
  actions: DevelopmentAction[];
  actionLinks: EvidenceActionLink[];
  verificationEvents: EvidenceVerificationEvent[];
}

export type CandidatePortfolioMappingResult =
  | { status: "mapped"; data: MappedCandidatePortfolio }
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

function mapStructuredSections(
  value: CandidatePortfolioRows["evidence"][number]["structured_sections"],
  evidenceMethod: EvidenceMethod,
): StructuredEvidenceSections | null | undefined {
  if (value === null) return null;
  if (typeof value !== "object" || Array.isArray(value)) return undefined;

  const method = value.method;
  const sectionValues = value.values;

  if (
    typeof method !== "string" ||
    !isOneOf(method, EVIDENCE_METHODS) ||
    method !== evidenceMethod ||
    typeof sectionValues !== "object" ||
    sectionValues === null ||
    Array.isArray(sectionValues)
  ) {
    return undefined;
  }

  const entries = Object.entries(sectionValues);
  if (entries.some(([, sectionValue]) => typeof sectionValue !== "string")) {
    return undefined;
  }

  return {
    method,
    values: Object.fromEntries(entries) as Record<string, string>,
  };
}

export function mapCandidatePortfolio(
  serverResolvedCandidateId: string,
  rows: CandidatePortfolioRows,
): CandidatePortfolioMappingResult {
  const canonicalCompetencyIds = new Set<string>(
    COMPETENCY_DEFINITIONS.map(({ id }) => id),
  );
  const standardTaskIds = new Set<string>(
    STANDARD_DEVELOPMENT_TASKS.map(({ id }) => id),
  );

  if (
    hasDuplicate(rows.evidence.map(({ id }) => id)) ||
    hasDuplicate(rows.actions.map(({ id }) => id)) ||
    hasDuplicate(rows.competencyLinks.map(({ id }) => id)) ||
    hasDuplicate(rows.actionLinks.map(({ id }) => id)) ||
    hasDuplicate(rows.verificationEvents.map(({ id }) => id)) ||
    hasDuplicate(rows.candidateCompetencies.map(({ id }) => id)) ||
    hasDuplicate(rows.competencyCycles.map(({ id }) => id))
  ) {
    return { status: "integrity-error" };
  }

  const candidateCompetencies = new Map(
    rows.candidateCompetencies.map((record) => [record.id, record]),
  );
  const candidateCompetencyDefinitionIds = new Set<string>();

  for (const record of rows.candidateCompetencies) {
    if (
      record.candidate_id !== serverResolvedCandidateId ||
      !canonicalCompetencyIds.has(record.competency_definition_id) ||
      candidateCompetencyDefinitionIds.has(record.competency_definition_id)
    ) {
      return { status: "integrity-error" };
    }
    candidateCompetencyDefinitionIds.add(record.competency_definition_id);
  }

  const cycles = new Map(rows.competencyCycles.map((cycle) => [cycle.id, cycle]));
  for (const cycle of rows.competencyCycles) {
    if (!candidateCompetencies.has(cycle.candidate_competency_id)) {
      return { status: "integrity-error" };
    }
  }

  const verificationEvents: EvidenceVerificationEvent[] = [];
  const evidenceIds = new Set(rows.evidence.map(({ id }) => id));

  for (const event of rows.verificationEvents) {
    if (
      !evidenceIds.has(event.evidence_id) ||
      !isOneOf(event.event_type, VERIFICATION_EVENT_TYPES)
    ) {
      return { status: "integrity-error" };
    }
    verificationEvents.push({
      id: event.id,
      evidenceId: event.evidence_id,
      type: event.event_type,
      actor: event.actor_display_name,
      occurredAt: event.occurred_at,
      reason: event.reason,
    });
  }

  const evidence: EvidenceEntry[] = [];
  for (const row of rows.evidence) {
    if (
      row.candidate_id !== serverResolvedCandidateId ||
      !isOneOf(row.claimed_level, LEVELS) ||
      !isOneOf(row.method, EVIDENCE_METHODS)
    ) {
      return { status: "integrity-error" };
    }

    const structuredSections = mapStructuredSections(
      row.structured_sections,
      row.method,
    );
    if (structuredSections === undefined) {
      return { status: "integrity-error" };
    }

    const cpdHours = row.cpd_hours;
    const hasCpd = cpdHours !== null;
    if (
      (hasCpd &&
        (!Number.isFinite(cpdHours) ||
          row.cpd_category === null ||
          !CPD_CATEGORIES.has(row.cpd_category) ||
          (row.cpd_signed_off_at === null &&
            (row.cpd_signed_off_by_user_id !== null ||
              row.cpd_signed_off_by_display_name !== null)) ||
          (row.cpd_signed_off_at !== null &&
            !row.cpd_signed_off_by_display_name?.trim()))) ||
      (!hasCpd &&
        (row.cpd_category !== null ||
          row.cpd_signed_off_at !== null ||
          row.cpd_signed_off_by_user_id !== null ||
          row.cpd_signed_off_by_display_name !== null))
    ) {
      return { status: "integrity-error" };
    }

    const mapped: EvidenceEntry = {
      id: row.id,
      candidateId: row.candidate_id,
      date: row.evidence_date,
      claimedLevel: row.claimed_level,
      projectReference: row.project_reference,
      projectType: row.project_type,
      ribaStage: row.riba_stage,
      title: row.title,
      description: row.description,
      outcome: row.outcome,
      method: row.method,
      structuredSections,
      systems: row.systems,
      verificationStatus: "unverified",
      cpd: hasCpd
        ? {
            hours: cpdHours,
            category: row.cpd_category as string,
            signedOffAt: row.cpd_signed_off_at,
            signedOffBy: row.cpd_signed_off_by_display_name,
          }
        : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    evidence.push({
      ...mapped,
      verificationStatus: getCurrentEvidenceVerificationStatus(
        mapped,
        verificationEvents,
      ),
    });
  }

  const evidenceById = new Map(evidence.map((entry) => [entry.id, entry]));
  const competencyLinkPairs = new Set<string>();
  const competencyLinks: EvidenceCompetencyLink[] = [];

  for (const link of rows.competencyLinks) {
    const pair = `${link.evidence_id}:${link.competency_definition_id}`;
    if (
      !evidenceById.has(link.evidence_id) ||
      !candidateCompetencyDefinitionIds.has(link.competency_definition_id) ||
      !isOneOf(link.link_type, LINK_TYPES) ||
      competencyLinkPairs.has(pair)
    ) {
      return { status: "integrity-error" };
    }
    competencyLinkPairs.add(pair);
    competencyLinks.push({
      id: link.id,
      evidenceId: link.evidence_id,
      competencyId: link.competency_definition_id,
      linkType: link.link_type,
      acceptedAt: link.accepted_at,
      acceptedBy: link.accepted_by_display_name,
      createdAt: link.created_at,
    });
  }

  const actions: DevelopmentAction[] = [];
  for (const action of rows.actions) {
    const competency = candidateCompetencies.get(
      action.candidate_competency_id,
    );
    const cycle = cycles.get(action.cycle_id);

    if (
      action.candidate_id !== serverResolvedCandidateId ||
      !competency ||
      competency.candidate_id !== serverResolvedCandidateId ||
      !cycle ||
      cycle.candidate_competency_id !== competency.id ||
      !isOneOf(action.owner, ACTION_OWNERS) ||
      !isOneOf(action.priority, ACTION_PRIORITIES) ||
      !isOneOf(action.status, ACTION_STATUSES) ||
      (action.status === "completed" && action.completed_at === null) ||
      (action.completed_at !== null &&
        !action.completed_by_display_name?.trim()) ||
      (action.submitted_at !== null &&
        !action.submitted_by_display_name?.trim()) ||
      (action.archived_at === null &&
        (action.archived_by_user_id !== null ||
          action.archived_by_display_name !== null ||
          action.archive_reason !== null)) ||
      (action.archived_at !== null &&
        (!action.archived_by_display_name?.trim() ||
          !action.archive_reason?.trim())) ||
      action.carried_forward_from_action_id === action.id ||
      (action.source_standard_task_definition_id !== null &&
        !standardTaskIds.has(action.source_standard_task_definition_id))
    ) {
      return { status: "integrity-error" };
    }

    actions.push({
      id: action.id,
      candidateId: action.candidate_id,
      competencyId: competency.competency_definition_id,
      cycleId: action.cycle_id,
      title: action.title,
      notes: action.notes,
      owner: action.owner,
      priority: action.priority,
      status: action.status,
      dueDate: action.due_date,
      sourceStandardTaskId: action.source_standard_task_definition_id,
      carriedForwardFromActionId: action.carried_forward_from_action_id,
      createdAt: action.created_at,
      createdBy: action.created_by_display_name,
      submittedAt: action.submitted_at,
      submittedBy: action.submitted_by_display_name,
      completedAt: action.completed_at,
      completedBy: action.completed_by_display_name,
      archivedAt: action.archived_at,
      archivedBy: action.archived_by_display_name,
      archiveReason: action.archive_reason,
      updatedAt: action.updated_at,
    });
  }

  const actionById = new Map(actions.map((action) => [action.id, action]));
  for (const action of actions) {
    if (
      action.carriedForwardFromActionId !== null &&
      !actionById.has(action.carriedForwardFromActionId)
    ) {
      return { status: "integrity-error" };
    }
  }

  const actionLinkPairs = new Set<string>();
  const actionLinks: EvidenceActionLink[] = [];
  for (const link of rows.actionLinks) {
    const pair = `${link.evidence_id}:${link.development_action_id}`;
    if (
      !evidenceById.has(link.evidence_id) ||
      !actionById.has(link.development_action_id) ||
      actionLinkPairs.has(pair)
    ) {
      return { status: "integrity-error" };
    }
    actionLinkPairs.add(pair);
    actionLinks.push({
      id: link.id,
      evidenceId: link.evidence_id,
      developmentActionId: link.development_action_id,
      createdAt: link.created_at,
      createdBy: link.created_by_display_name,
    });
  }

  return {
    status: "mapped",
    data: {
      evidence,
      competencyLinks,
      actions,
      actionLinks,
      verificationEvents,
    },
  };
}
