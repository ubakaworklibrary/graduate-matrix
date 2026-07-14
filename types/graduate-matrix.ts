export type CandidateId = string;
export type CompetencyId = string;
export type CompetencyCycleId = string;
export type EvidenceId = string;
export type EvidenceCompetencyLinkId = string;
export type EvidenceActionLinkId = string;
export type EvidenceVerificationEventId = string;
export type MentorAssessmentId = string;
export type DevelopmentActionId = string;
export type StandardTaskId = string;
export type ProgressionEventId = string;
export type CompetencyCycleReviewId = string;
export type ReviewId = string;
export type MeetingId = string;
export type CpdEntryId = string;
export type CpdCompetencyLinkId = string;
export type BaselineTaskId = string;

export type IsoDate = string;
export type IsoDateTime = string;

export type CompetencyLevel = "L1" | "L2" | "L3" | "L4" | "L5";

/** A workflow mode only. Database authorization will be enforced separately. */
export type WorkflowRole = "graduate" | "mentor";

export type ProfessionalBody =
  | "cibse"
  | "iet"
  | "imeche"
  | "cibse-certification"
  | "internal"
  | "other";

export type PrimaryOutcome =
  | "internal-graduate"
  | "engtech-lcibse"
  | "ieng-acibse"
  | "ieng-mcibse"
  | "ceng-mcibse"
  | "ceng-fcibse"
  | "engtech-iet"
  | "ieng-iet"
  | "ceng-iet"
  | "engtech-imeche"
  | "ieng-imeche"
  | "ceng-imeche"
  | "lcc"
  | "lcea"
  | "cibse-cert-specialist"
  | "custom";

export type CibseMembershipTarget =
  | "none"
  | "graduate"
  | "affiliate"
  | "lcibse"
  | "acibse"
  | "mcibse"
  | "fcibse";

export type IetMembershipTarget =
  | "none"
  | "student"
  | "tmiet"
  | "miet"
  | "fiet";

export type EngineeringRegistrationTarget =
  | "none"
  | "engtech"
  | "ieng"
  | "ceng"
  | "international-later";

export type LccStrand =
  | "building-design"
  | "building-operation"
  | "simulation"
  | "energy-management-systems";

export type SpecialistRoute =
  | "lcea"
  | "air-conditioning-inspection"
  | "section-63"
  | "esos-lead-assessor"
  | "heat-networks-consultant"
  | "whole-life-carbon-assessor"
  | "nabers-uk-assessor"
  | "management-systems-specialist";

export interface ProfessionalPathway {
  professionalBody: ProfessionalBody;
  primaryOutcome: PrimaryOutcome;
  cibseMembershipTarget: CibseMembershipTarget;
  ietMembershipTarget: IetMembershipTarget;
  engineeringRegistrationTarget: EngineeringRegistrationTarget;
  lccStrands: LccStrand[];
  specialistRoutes: SpecialistRoute[];
  currentMembershipStatus: string;
  academicRoute: string;
  notes: string;
}

export interface CandidateInfo {
  id: CandidateId;
  firstName: string;
  surname: string;
  jobTitle: string;
  discipline: string;
  employerTeam: string;
  officeLocation: string;
  schemeStartDate: IsoDate | null;
  expectedApplicationDate: IsoDate | null;
  mentorName: string;
  lineManagerName: string;
  reviewerName: string;
  pathway: ProfessionalPathway;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CompetencyDefinition {
  /** Stable framework-scoped ID; reference is the human-readable code, such as A1. */
  id: CompetencyId;
  reference: string;
  area: string;
  objective: string;
  behaviours: string;
  levelExpectation: string;
  evidenceExamples: string;
  assessmentMethods: string;
  frequency: string;
  relevance: string;
  notes: string;
}

export interface CompetencyRecord {
  candidateId: CandidateId;
  competencyId: CompetencyId;
  activeCycleId: CompetencyCycleId | null;
  targetLevelOverride: CompetencyLevel | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type CycleStatus =
  | "locked"
  | "open"
  | "paused"
  | "completed"
  | "archived";

export interface CompetencyCycle {
  id: CompetencyCycleId;
  candidateId: CandidateId;
  competencyId: CompetencyId;
  level: CompetencyLevel;
  status: CycleStatus;
  openedAt: IsoDateTime | null;
  openedBy: string | null;
  completedAt: IsoDateTime | null;
  completedBy: string | null;
  completionReason: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type EvidenceMethod =
  | "carr"
  | "star"
  | "psar";

export interface StructuredEvidenceSections {
  method: EvidenceMethod;
  values: Record<string, string>;
}

export type EvidenceVerificationStatus =
  | "unverified"
  | "verified"
  | "reverification-required";

export interface EvidenceCpdMetadata {
  hours: number;
  category: string;
  signedOffAt: IsoDateTime | null;
  signedOffBy: string | null;
}

export interface EvidenceEntry {
  id: EvidenceId;
  candidateId: CandidateId;
  date: IsoDate;
  claimedLevel: CompetencyLevel;
  projectReference: string;
  projectType: string;
  ribaStage: string;
  title: string;
  description: string;
  outcome: string;
  method: EvidenceMethod;
  structuredSections: StructuredEvidenceSections | null;
  systems: string[];
  verificationStatus: EvidenceVerificationStatus;
  cpd: EvidenceCpdMetadata | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type EvidenceCompetencyLinkType =
  | "primary"
  | "accepted"
  | "suggested";

export interface EvidenceCompetencyLink {
  id: EvidenceCompetencyLinkId;
  evidenceId: EvidenceId;
  competencyId: CompetencyId;
  linkType: EvidenceCompetencyLinkType;
  acceptedAt: IsoDateTime | null;
  acceptedBy: string | null;
  createdAt: IsoDateTime;
}

export interface EvidenceActionLink {
  id: EvidenceActionLinkId;
  evidenceId: EvidenceId;
  developmentActionId: DevelopmentActionId;
  createdAt: IsoDateTime;
  createdBy: string;
}

export type EvidenceVerificationEventType =
  | "verified"
  | "verification-revoked"
  | "reverification-required";

export interface EvidenceVerificationEvent {
  id: EvidenceVerificationEventId;
  evidenceId: EvidenceId;
  type: EvidenceVerificationEventType;
  actor: string;
  occurredAt: IsoDateTime;
  reason: string | null;
}

export type MentorAssessmentStatus =
  | "not-reviewed"
  | "more-evidence"
  | "demonstrated";

export type ProgressionRecommendation =
  | "not-set"
  | "maintain-level"
  | "progress-discussion";

export interface MentorAssessment {
  id: MentorAssessmentId;
  candidateId: CandidateId;
  competencyId: CompetencyId;
  cycleId: CompetencyCycleId;
  status: MentorAssessmentStatus;
  recommendation: ProgressionRecommendation;
  nextAction: string;
  assessedAt: IsoDateTime | null;
  assessedBy: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CompetencyCycleReview {
  id: CompetencyCycleReviewId;
  candidateId: CandidateId;
  competencyId: CompetencyId;
  cycleId: CompetencyCycleId;
  status: MentorAssessmentStatus;
  recommendation: ProgressionRecommendation;
  nextAction: string | null;
  reviewedAt: IsoDateTime;
  reviewedBy: string;
  createdAt: IsoDateTime;
}

export type DevelopmentActionOwner = "graduate" | "mentor" | "shared";
export type DevelopmentActionPriority = "low" | "medium" | "high";

export type DevelopmentActionStatus =
  | "open"
  | "submitted"
  | "returned-for-revision"
  | "completed"
  | "closed";

export interface DevelopmentAction {
  id: DevelopmentActionId;
  candidateId: CandidateId;
  competencyId: CompetencyId;
  cycleId: CompetencyCycleId;
  title: string;
  notes: string;
  owner: DevelopmentActionOwner;
  priority: DevelopmentActionPriority;
  status: DevelopmentActionStatus;
  dueDate: IsoDate | null;
  sourceStandardTaskId: StandardTaskId | null;
  carriedForwardFromActionId: DevelopmentActionId | null;
  createdAt: IsoDateTime;
  createdBy: string;
  submittedAt: IsoDateTime | null;
  submittedBy: string | null;
  completedAt: IsoDateTime | null;
  completedBy: string | null;
  archivedAt: IsoDateTime | null;
  archivedBy: string | null;
  archiveReason: string | null;
  updatedAt: IsoDateTime;
}

interface ProgressionEventBase {
  id: ProgressionEventId;
  candidateId: CandidateId;
  competencyId: CompetencyId;
  cycleId: CompetencyCycleId;
  occurredAt: IsoDateTime;
  performedBy: string;
}

export interface CycleOpenedEvent extends ProgressionEventBase {
  type: "cycle-opened";
  level: CompetencyLevel;
  previousCycleId: CompetencyCycleId | null;
  reason: string | null;
}

export type ProgressionApprovalAuthority =
  | "mentor"
  | "mentor-and-manager";

export interface CycleCompletedEvent extends ProgressionEventBase {
  type: "cycle-completed";
  fromLevel: CompetencyLevel;
  toLevel: CompetencyLevel | null;
  destinationCycleId: CompetencyCycleId | null;
  mentorApprovedAt: IsoDateTime;
  mentorApprovedBy: string;
  managerSignedOffAt: IsoDateTime | null;
  managerSignedOffBy: string | null;
  managerSignoffConfirmed: boolean;
  approvalAuthority: ProgressionApprovalAuthority;
  reason: string | null;
  evidenceBasis: string;
}

export interface CyclePausedEvent extends ProgressionEventBase {
  type: "cycle-paused";
  reason: string;
}

export interface CycleReopenedEvent extends ProgressionEventBase {
  type: "cycle-reopened";
  reason: string;
}

export interface CycleResetEvent extends ProgressionEventBase {
  type: "cycle-reset";
  reason: string;
}

export interface CycleArchivedEvent extends ProgressionEventBase {
  type: "cycle-archived";
  reason: string | null;
}

export type ProgressionEvent =
  | CycleOpenedEvent
  | CycleCompletedEvent
  | CyclePausedEvent
  | CycleReopenedEvent
  | CycleResetEvent
  | CycleArchivedEvent;

export type ReviewOutcome =
  | "not-recorded"
  | "accepted"
  | "accepted-with-actions";

export interface Review {
  id: ReviewId;
  candidateId: CandidateId;
  reviewedAt: IsoDate | null;
  reviewedBy: string;
  outcome: ReviewOutcome;
  nextReviewDate: IsoDate | null;
  notes: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface Meeting {
  id: MeetingId;
  candidateId: CandidateId;
  reviewId: ReviewId | null;
  date: IsoDate;
  type: string;
  attendees: string;
  duration: string;
  notes: string;
  outcome: string;
  candidateComment: string;
  createdAt: IsoDateTime;
  createdBy: string;
  updatedAt: IsoDateTime;
}

export interface AttachmentMetadata {
  name: string;
  addedAt: IsoDateTime;
}

export type CpdCategory = "T" | "M" | "P" | "E" | "uncategorized";

export interface CpdEntry {
  id: CpdEntryId;
  candidateId: CandidateId;
  date: IsoDate;
  title: string;
  hours: number;
  category: CpdCategory;
  description: string;
  outcome: string;
  attachments: AttachmentMetadata[];
  signedOffAt: IsoDateTime | null;
  signedOffBy: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export type CpdCompetencyLinkType = "accepted" | "suggested";

export interface CpdCompetencyLink {
  id: CpdCompetencyLinkId;
  cpdEntryId: CpdEntryId;
  competencyId: CompetencyId;
  linkType: CpdCompetencyLinkType;
  acceptedAt: IsoDateTime | null;
  acceptedBy: string | null;
  createdAt: IsoDateTime;
}

export type BaselineTaskStatus = "not-complete" | "complete" | "waived";

export type BaselineTaskCompletionMode = "automatic" | "mentor";

export interface BaselineTaskDefinition {
  id: BaselineTaskId;
  title: string;
  description: string;
  mandatory: boolean;
  completionMode: BaselineTaskCompletionMode;
}

export interface BaselineTask {
  id: BaselineTaskId;
  status: BaselineTaskStatus;
  note: string;
  completedAt: IsoDateTime | null;
  completedBy: string | null;
  updatedAt: IsoDateTime;
}

export type BaselineStatus = "not-started" | "in-progress" | "completed";

export interface BaselineSetup {
  candidateId: CandidateId;
  status: BaselineStatus;
  tasks: Record<BaselineTaskId, BaselineTask>;
  formalTrainingStartedAt: IsoDateTime | null;
  formalTrainingStartedBy: string | null;
  updatedAt: IsoDateTime;
}

export interface GraduateMatrixDomainState {
  candidate: CandidateInfo | null;
  competencyRecords: Record<CompetencyId, CompetencyRecord>;
  competencyCycles: Record<CompetencyCycleId, CompetencyCycle>;
  evidence: Record<EvidenceId, EvidenceEntry>;
  evidenceCompetencyLinks: Record<
    EvidenceCompetencyLinkId,
    EvidenceCompetencyLink
  >;
  evidenceActionLinks: Record<EvidenceActionLinkId, EvidenceActionLink>;
  evidenceVerificationEvents: Record<
    EvidenceVerificationEventId,
    EvidenceVerificationEvent
  >;
  mentorAssessments: Record<MentorAssessmentId, MentorAssessment>;
  competencyCycleReviews: Record<
    CompetencyCycleReviewId,
    CompetencyCycleReview
  >;
  developmentActions: Record<DevelopmentActionId, DevelopmentAction>;
  progressionEvents: Record<ProgressionEventId, ProgressionEvent>;
  reviews: Record<ReviewId, Review>;
  meetings: Record<MeetingId, Meeting>;
  cpdEntries: Record<CpdEntryId, CpdEntry>;
  cpdCompetencyLinks: Record<CpdCompetencyLinkId, CpdCompetencyLink>;
  baselineSetup: BaselineSetup | null;
}

export type GraduateMatrixView =
  | "candidate"
  | "dashboard"
  | "portfolio"
  | "matrix"
  | "cpd-log"
  | "meeting-log"
  | "guide";

export type PortfolioSection = "matrix" | "evidence" | "actions";

export interface GraduateMatrixUiState {
  role: WorkflowRole;
  activeView: GraduateMatrixView;
  portfolioSection: PortfolioSection;
  selectedCompetencyId: CompetencyId | null;
  searchQuery: string;
  competencyAreaFilter: string | null;
  competencyLevelFilter: CompetencyLevel | null;
  evidenceFilter: string | null;
  actionFilter: string | null;
}

export interface GraduateMatrixState {
  domain: GraduateMatrixDomainState;
  ui: GraduateMatrixUiState;
}
