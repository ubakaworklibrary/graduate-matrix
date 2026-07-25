"use client";

import { useCallback, useEffect, useState } from "react";
import type { CompetencyLevel, DevelopmentActionOwner, DevelopmentActionPriority, DevelopmentActionStatus } from "@/types/graduate-matrix";

export const MATRIX_POC_KEY = "graduate-matrix-poc-v1";

export type PocResponseMethod = "carr" | "star" | "psar" | "short-update";
export type PocCompletionConfidence = "not-yet-complete" | "partly-complete" | "ready-for-review";
export type PocResponseStatus = "draft" | "submitted" | "returned";

export type PocRibaStage = "stage-0" | "stage-1" | "stage-2" | "stage-3" | "stage-4" | "stage-5" | "stage-6" | "stage-7";
export const RIBA_STAGES: readonly PocRibaStage[] = ["stage-0", "stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6", "stage-7"];
export const ribaStageLabel = (value: PocRibaStage | null | undefined): string => value ? `Stage ${value.slice(6)}` : "Not set";

// Evidence RIBA stage is independent of the Development Action's RIBA stage: it is always a
// plain string (never null) and additionally supports "not-applicable" for Evidence that has no
// associated design stage (e.g. behavioural/CPD entries).
export type PocEvidenceRibaStage = "not-set" | "stage-0" | "stage-1" | "stage-2" | "stage-3" | "stage-4" | "stage-5" | "stage-6" | "stage-7" | "not-applicable";
export const EVIDENCE_RIBA_STAGES: readonly PocEvidenceRibaStage[] = ["stage-0", "stage-1", "stage-2", "stage-3", "stage-4", "stage-5", "stage-6", "stage-7", "not-applicable"];
export const evidenceRibaStageLabel = (value: string | null | undefined): string => {
  if (!value || value === "not-set") return "Not set";
  if (value === "not-applicable") return "Not applicable";
  return value.startsWith("stage-") ? `Stage ${value.slice(6)}` : "Not set";
};

export interface PocResponseVersion {
  id: string;
  version: number;
  status: PocResponseStatus;
  method: PocResponseMethod;
  fields: Record<string, string>;
  attachments: { id: string; kind: "file"; name: string; detail: string; size?: number }[];
  documentLinks: { id: string; kind: "link"; title: string; reference?: string; revision?: string; url: string; accessNote?: string }[];
  savedAt: string;
  submittedAt?: string | null;
  advisoryQualityScore?: 1 | 2 | 3 | 4 | 5;
}

export interface PocActionResponse {
  id: string;
  source: "local-poc";
  candidateId: string;
  actionId: string;
  competencyRef: string;
  versions: PocResponseVersion[];
  updatedAt: string;
}

export type PocActionResponseReviewOutcome = "accepted" | "returned" | "kept-open";
export interface PocActionResponseReview {
  id: string;
  actionId: string;
  responseId: string;
  responseVersionId: string;
  responseVersion: number;
  reviewerName: string;
  outcome: PocActionResponseReviewOutcome;
  feedback: string;
  completeAction: boolean;
  reviewedAt: string;
}

export interface PocAction {
  id: string;
  source: "local-poc";
  templateId: string | null;
  candidateId: string;
  competencyRef: string;
  cycleLevel: CompetencyLevel | null;
  title: string;
  description: string;
  expectedEvidence: string;
  owner: DevelopmentActionOwner;
  priority: DevelopmentActionPriority;
  dueDate: string | null;
  status: DevelopmentActionStatus;
  candidateResponse: string;
  linkedEvidenceIds: string[];
  ribaStage: PocRibaStage | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Evidence — versioned local POC model. Evidence and Development Actions are
// deliberately separate workflows: Evidence carries no action reference of any
// kind. A single Evidence record has one primary competency (fixed at creation)
// plus candidate-suggested competency cross-links, which remain advisory
// ("suggested") until a mentor accepts them — the candidate cannot self-accept.
// ---------------------------------------------------------------------------

export type PocEvidenceMethod = "carr" | "star" | "psar";
export type PocEvidenceStatus = "draft" | "submitted" | "returned" | "verified";

export interface PocEvidenceAttachment {
  id: string;
  kind: "file";
  name: string;
  detail: string;
  size?: number;
}

export interface PocEvidenceDocumentLink {
  id: string;
  kind: "link";
  title: string;
  url: string;
  reference?: string;
  revision?: string;
  accessNote?: string;
}

export interface PocEvidenceVersion {
  id: string;
  version: number;
  status: PocEvidenceStatus;

  title: string;
  date: string;
  claimedLevel: CompetencyLevel;
  projectReference: string;
  projectType: string;
  ribaStage: string;

  method: PocEvidenceMethod;
  fields: Record<string, string>;
  systems: string[];

  suggestedCompetencyRefs: string[];

  attachments: PocEvidenceAttachment[];
  documentLinks: PocEvidenceDocumentLink[];

  advisoryQualityScore?: 1 | 2 | 3 | 4 | 5;

  savedAt: string;
  submittedAt?: string | null;
}

export interface PocEvidence {
  id: string;
  source: "local-poc";
  candidateId: string;
  primaryCompetencyRef: string;
  versions: PocEvidenceVersion[];
  updatedAt: string;
}

// Mentor review of a submitted Evidence version — the Evidence-specific counterpart of
// PocActionResponseReview. Outcomes are deliberately Evidence-only (Verify / Return for
// revision); Development Action outcomes ("keep open", "accept & complete") do not apply here.
export type PocEvidenceReviewOutcome = "verified" | "returned";
export interface PocEvidenceCompetencyDecision {
  ref: string;
  decision: "accepted" | "declined";
  decidedBy: string;
  decidedAt: string;
}
export interface PocEvidenceReview {
  id: string;
  evidenceId: string;
  versionId: string;
  version: number;
  reviewerName: string;
  outcome: PocEvidenceReviewOutcome;
  feedback: string;
  competencyDecisions: PocEvidenceCompetencyDecision[];
  reviewedAt: string;
}

interface PocState { version: 1; actions: PocAction[]; evidence: PocEvidence[]; responses: PocActionResponse[]; responseReviews: PocActionResponseReview[]; evidenceReviews: PocEvidenceReview[]; candidateName?: string; mentorName?: string }
const EMPTY: PocState = { version: 1, actions: [], evidence: [], responses: [], responseReviews: [], evidenceReviews: [] };

function normalizeAction(action: PocAction): PocAction {
  const ribaStage: PocRibaStage | null = RIBA_STAGES.includes(action.ribaStage as PocRibaStage) ? action.ribaStage : null;
  return { ...action, ribaStage };
}

function normalizeResponseVersion(version: PocResponseVersion): PocResponseVersion {
  const method: PocResponseMethod = ["carr", "star", "psar", "short-update"].includes(version.method)
    ? version.method
    : "carr";
  return {
    id: version.id,
    version: version.version,
    status: version.status,
    method,
    fields: version.fields && typeof version.fields === "object" ? version.fields : {},
    attachments: Array.isArray(version.attachments) ? version.attachments.filter((item) => item?.kind === "file") : [],
    documentLinks: Array.isArray(version.documentLinks) ? version.documentLinks.filter((item) => item?.kind === "link") : [],
    savedAt: version.savedAt,
    submittedAt: version.submittedAt ?? null,
    advisoryQualityScore: version.advisoryQualityScore,
  };
}

/**
 * Normalises both the current versioned Evidence shape and the legacy flat
 * shape (title/description/claimedLevel/... directly on the record, with a
 * `linkedActionIds` array) into one versioned record. Legacy `linkedActionIds`
 * are intentionally dropped — Evidence never links to Development Actions.
 */
function normalizeEvidence(raw: unknown, candidateId: string): PocEvidence | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : `local-poc-evidence-${Date.now()}`;
  const now = new Date().toISOString();

  if (Array.isArray(record.versions)) {
    const versions = (record.versions as unknown[])
      .map((entry) => normalizeEvidenceVersion(entry))
      .filter((entry): entry is PocEvidenceVersion => entry !== null);
    return {
      id,
      source: "local-poc",
      candidateId: typeof record.candidateId === "string" ? record.candidateId : candidateId,
      primaryCompetencyRef: typeof record.primaryCompetencyRef === "string" ? record.primaryCompetencyRef : (typeof record.competencyRef === "string" ? record.competencyRef : ""),
      versions: versions.length ? versions : [emptyEvidenceVersion(now)],
      updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : now,
    };
  }

  // Legacy flat shape.
  const legacyStatus = record.status;
  const status: PocEvidenceStatus = legacyStatus === "submitted" || legacyStatus === "returned" || legacyStatus === "verified" ? legacyStatus : "draft";
  const legacyDescription = typeof record.description === "string" ? record.description : "";
  const version: PocEvidenceVersion = {
    id: `${id}-v1`,
    version: 1,
    status,
    title: typeof record.title === "string" ? record.title : "",
    date: typeof record.date === "string" ? record.date : now.slice(0, 10),
    claimedLevel: (typeof record.claimedLevel === "string" ? record.claimedLevel : "L1") as CompetencyLevel,
    projectReference: typeof record.projectReference === "string" ? record.projectReference : "",
    projectType: "",
    ribaStage: "not-set",
    method: "carr",
    // The legacy flat form only had one free-text description field. Map it into
    // the CAR+R "action" prompt (the primary narrative field) rather than
    // inventing new candidate content for the other structured sections.
    fields: legacyDescription ? { action: legacyDescription } : {},
    systems: [],
    suggestedCompetencyRefs: [],
    attachments: [],
    documentLinks: [],
    savedAt: typeof record.updatedAt === "string" ? record.updatedAt : now,
    submittedAt: status === "draft" ? null : (typeof record.updatedAt === "string" ? record.updatedAt : now),
  };
  return {
    id,
    source: "local-poc",
    candidateId: typeof record.candidateId === "string" ? record.candidateId : candidateId,
    primaryCompetencyRef: typeof record.competencyRef === "string" ? record.competencyRef : "",
    versions: [version],
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : now,
  };
}

function emptyEvidenceVersion(now: string): PocEvidenceVersion {
  return { id: `local-poc-evidence-version-${Date.now()}`, version: 1, status: "draft", title: "", date: now.slice(0, 10), claimedLevel: "L1", projectReference: "", projectType: "", ribaStage: "not-set", method: "carr", fields: {}, systems: [], suggestedCompetencyRefs: [], attachments: [], documentLinks: [], savedAt: now, submittedAt: null };
}

function normalizeEvidenceVersion(raw: unknown): PocEvidenceVersion | null {
  if (!raw || typeof raw !== "object") return null;
  const version = raw as Record<string, unknown>;
  const method: PocEvidenceMethod = version.method === "star" || version.method === "psar" ? version.method : "carr";
  const status: PocEvidenceStatus = version.status === "submitted" || version.status === "returned" || version.status === "verified" ? version.status : "draft";
  const now = new Date().toISOString();
  return {
    id: typeof version.id === "string" ? version.id : `local-poc-evidence-version-${Date.now()}`,
    version: typeof version.version === "number" ? version.version : 1,
    status,
    title: typeof version.title === "string" ? version.title : "",
    date: typeof version.date === "string" ? version.date : now.slice(0, 10),
    claimedLevel: (typeof version.claimedLevel === "string" ? version.claimedLevel : "L1") as CompetencyLevel,
    projectReference: typeof version.projectReference === "string" ? version.projectReference : "",
    projectType: typeof version.projectType === "string" ? version.projectType : "",
    ribaStage: typeof version.ribaStage === "string" ? version.ribaStage : "not-set",
    method,
    fields: version.fields && typeof version.fields === "object" ? version.fields as Record<string, string> : {},
    systems: Array.isArray(version.systems) ? version.systems.filter((item): item is string => typeof item === "string") : [],
    suggestedCompetencyRefs: Array.isArray(version.suggestedCompetencyRefs) ? version.suggestedCompetencyRefs.filter((item): item is string => typeof item === "string") : [],
    attachments: Array.isArray(version.attachments) ? (version.attachments as unknown[]).filter((item): item is PocEvidenceAttachment => Boolean(item) && (item as PocEvidenceAttachment).kind === "file") : [],
    documentLinks: Array.isArray(version.documentLinks) ? (version.documentLinks as unknown[]).filter((item): item is PocEvidenceDocumentLink => Boolean(item) && (item as PocEvidenceDocumentLink).kind === "link") : [],
    advisoryQualityScore: typeof version.advisoryQualityScore === "number" ? version.advisoryQualityScore as 1 | 2 | 3 | 4 | 5 : undefined,
    savedAt: typeof version.savedAt === "string" ? version.savedAt : now,
    submittedAt: typeof version.submittedAt === "string" ? version.submittedAt : null,
  };
}

function readPoc(): PocState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(MATRIX_POC_KEY) ?? "null");
    if (!value || typeof value !== "object") return EMPTY;
    const parsed = value as Partial<PocState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.actions) || !Array.isArray(parsed.evidence)) return EMPTY;
    const evidence = parsed.evidence
      .map((entry) => normalizeEvidence(entry, typeof (entry as { candidateId?: unknown })?.candidateId === "string" ? (entry as { candidateId: string }).candidateId : ""))
      .filter((entry): entry is PocEvidence => entry !== null);
    return {
      version: 1,
      actions: parsed.actions.map(normalizeAction),
      evidence,
      responses: Array.isArray(parsed.responses) ? parsed.responses.map((response) => ({ ...response, versions: Array.isArray(response.versions) ? response.versions.map(normalizeResponseVersion) : [] })) : [],
      responseReviews: Array.isArray(parsed.responseReviews) ? parsed.responseReviews : [],
      evidenceReviews: Array.isArray(parsed.evidenceReviews) ? parsed.evidenceReviews : [],
      candidateName: typeof parsed.candidateName === "string" ? parsed.candidateName : undefined,
      mentorName: typeof parsed.mentorName === "string" ? parsed.mentorName : undefined,
    };
  } catch { return EMPTY; }
}

export function useMatrixPoc() {
  const [state, setState] = useState<PocState>(EMPTY);
  useEffect(() => {
    // POC records exist only in the browser; hydrate after the server-safe empty render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(readPoc());
  }, []);

  const commit = useCallback((update: (current: PocState) => PocState) => {
    setState((current) => {
      const next = update(current);
      window.localStorage.setItem(MATRIX_POC_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    window.localStorage.removeItem(MATRIX_POC_KEY);
    setState(EMPTY);
  }, []);

  const loadSample = useCallback((candidateId: string) => {
    const now = new Date().toISOString();
    const actionId = "local-poc-sample-action-d1";
    const evidenceId = "local-poc-sample-evidence-d1";
    const draftTime = new Date(Date.now() - 86400000).toISOString();
    const sample: PocState = {
      version: 1,
      candidateName: "James Wilson",
      mentorName: "Ubaka Attah",
      responseReviews: [],
      evidenceReviews: [],
      actions: [{ id: actionId, source: "local-poc", templateId: "ST-004", candidateId, competencyRef: "D1", cycleLevel: "L1", title: "Prepare a short technical note explaining a design decision", description: "Prepare a concise note recording the design decision and the basis for it.", expectedEvidence: "The note explains options, constraints, recommendation and basis of judgement.", owner: "graduate", priority: "medium", dueDate: null, status: "submitted", candidateResponse: "", linkedEvidenceIds: [], ribaStage: "stage-3", createdAt: draftTime, updatedAt: now }],
      evidence: [{
        id: evidenceId,
        source: "local-poc",
        candidateId,
        primaryCompetencyRef: "D1",
        updatedAt: now,
        versions: [{
          id: `${evidenceId}-v1`,
          version: 1,
          status: "submitted",
          title: "Coordination note issued to design team",
          date: now.slice(0, 10),
          claimedLevel: "L1",
          projectReference: "POC sample project",
          projectType: "Commercial",
          ribaStage: "stage-3",
          method: "carr",
          fields: {
            context: "On the sample project, the ventilation strategy needed to be explained clearly to a non-technical stakeholder group ahead of a design review.",
            action: "I prepared a short coordination note summarising the proposed strategy, checked it with the senior engineer, and issued it ahead of the meeting.",
            result: "The note was accepted without amendment and used as the basis for the design review discussion.",
            reflection: "I learned that translating technical detail for a non-technical audience early avoids rework later. Next time I will draft this note earlier in the programme.",
          },
          systems: ["controls"],
          suggestedCompetencyRefs: [],
          attachments: [],
          documentLinks: [],
          advisoryQualityScore: 3,
          savedAt: now,
          submittedAt: now,
        }],
      }],
      responses: [{ id: "local-poc-response-d1", source: "local-poc", candidateId, actionId, competencyRef: "D1", updatedAt: now, versions: [{ id: "local-poc-response-version-d1-1", version: 1, status: "draft", method: "carr", fields: { context: "I was comparing two ventilation control options for a live project.", action: "I reviewed both options and recorded the principal constraints." }, attachments: [], documentLinks: [], savedAt: draftTime, submittedAt: null, advisoryQualityScore: 2 }, { id: "local-poc-response-version-d1-2", version: 2, status: "submitted", method: "carr", fields: { context: "I was asked to recommend a ventilation control approach for a live project with limited plant space and a demanding energy target.", action: "I reviewed the two viable options, checked the control interfaces and operational risks, and compared their energy, maintenance and coordination implications. I recommended demand control because it best balanced performance and risk.", result: "The recommendation was accepted and incorporated into the Stage 3 design note, giving the team a clear basis for the control sequence.", reflection: "I learned that a recommendation is stronger when the rejected options and constraints are explicit. In future I will record the decision criteria before beginning the comparison." }, attachments: [{ id: "sample-file", kind: "file", name: "D1-design-decision-note.pdf", detail: "application/pdf", size: 245760 }], documentLinks: [{ id: "sample-link", kind: "link", title: "Design decision register", reference: "DDR-014", revision: "P02", url: "https://example.com/design-decision-register", accessNote: "Project-team access required." }], savedAt: now, submittedAt: now, advisoryQualityScore: 4 }] }],
    };
    window.localStorage.setItem(MATRIX_POC_KEY, JSON.stringify(sample));
    setState(sample);
  }, []);

  return { state, commit, reset, loadSample };
}
