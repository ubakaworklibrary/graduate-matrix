import type {
  CibseMembershipTarget,
  EngineeringRegistrationTarget,
  IetMembershipTarget,
  LccStrand,
  PrimaryOutcome,
  SpecialistRoute,
} from "../../../types/graduate-matrix";

export interface PathwayOption<Value extends string = string> {
  value: Value;
  label: string;
}

export type SourceProfessionalBody =
  | "cibse"
  | "iet"
  | "imeche"
  | "cibse-certification"
  | "internal"
  | "other";

export type SourceCibseMembershipTarget =
  | CibseMembershipTarget
  | "graduate"
  | "affiliate";

export type SourceIetMembershipTarget =
  | IetMembershipTarget
  | "student"
  | "fiet";

export const PROFESSIONAL_BODY_OPTIONS = [
  { value: "cibse", label: "CIBSE" },
  { value: "iet", label: "IET" },
  { value: "imeche", label: "IMechE" },
  { value: "cibse-certification", label: "CIBSE Certification" },
  { value: "internal", label: "Internal company pathway only" },
  { value: "other", label: "Other / to be confirmed" },
] as const satisfies readonly PathwayOption<SourceProfessionalBody>[];

export const CIBSE_MEMBERSHIP_OPTIONS = [
  { value: "none", label: "Not currently targeting CIBSE membership" },
  { value: "graduate", label: "CIBSE Graduate Member" },
  { value: "affiliate", label: "CIBSE Affiliate" },
  { value: "lcibse", label: "LCIBSE — Licentiate" },
  { value: "acibse", label: "ACIBSE — Associate" },
  { value: "mcibse", label: "MCIBSE — Member" },
  { value: "fcibse", label: "FCIBSE — Fellow / later-career route" },
] as const satisfies readonly PathwayOption<SourceCibseMembershipTarget>[];

export const IET_MEMBERSHIP_OPTIONS = [
  { value: "none", label: "Not currently targeting IET membership" },
  { value: "student", label: "IET Student / apprentice membership" },
  { value: "tmiet", label: "TMIET — Technician Member" },
  { value: "miet", label: "MIET — Member of the IET" },
  { value: "fiet", label: "FIET — Fellow / later-career route" },
] as const satisfies readonly PathwayOption<SourceIetMembershipTarget>[];

export const ENGINEERING_REGISTRATION_OPTIONS = [
  { value: "none", label: "No Engineering Council registration target" },
  { value: "engtech", label: "EngTech — Engineering Technician" },
  { value: "ieng", label: "IEng — Incorporated Engineer" },
  { value: "ceng", label: "CEng — Chartered Engineer" },
  {
    value: "international-later",
    label: "IntPE / EUR ING — later international route",
  },
] as const satisfies readonly PathwayOption<EngineeringRegistrationTarget>[];

export const PRIMARY_OUTCOME_OPTIONS = [
  { value: "internal-graduate", label: "Internal graduate development only" },
  { value: "engtech-lcibse", label: "EngTech + LCIBSE" },
  { value: "ieng-acibse", label: "IEng + ACIBSE" },
  { value: "ieng-mcibse", label: "IEng + MCIBSE" },
  { value: "ceng-mcibse", label: "CEng + MCIBSE" },
  { value: "ceng-fcibse", label: "CEng + FCIBSE / senior route" },
  { value: "engtech-iet", label: "EngTech via IET" },
  { value: "ieng-iet", label: "IEng via IET" },
  { value: "ceng-iet", label: "CEng via IET" },
  { value: "engtech-imeche", label: "EngTech via IMechE" },
  { value: "ieng-imeche", label: "IEng via IMechE" },
  { value: "ceng-imeche", label: "CEng via IMechE" },
  { value: "lcc", label: "CIBSE Low Carbon Consultant" },
  { value: "lcea", label: "Low Carbon Energy Assessor" },
  {
    value: "cibse-cert-specialist",
    label: "Other CIBSE Certification specialist route",
  },
  { value: "custom", label: "Custom / to be agreed" },
] as const satisfies readonly PathwayOption<PrimaryOutcome>[];

export const LCC_STRAND_OPTIONS = [
  { value: "building-design", label: "LCC Building Design" },
  { value: "building-operation", label: "LCC Building Operation" },
  { value: "simulation", label: "LCC Simulation" },
  {
    value: "energy-management-systems",
    label: "LCC Energy Management Systems",
  },
] as const satisfies readonly PathwayOption<LccStrand>[];

export const SPECIALIST_ROUTE_OPTIONS = [
  { value: "lcea", label: "Low Carbon Energy Assessor (LCEA)" },
  {
    value: "air-conditioning-inspection",
    label: "Air Conditioning Inspection Assessor",
  },
  { value: "section-63", label: "Section 63 Advisor (Scotland)" },
  { value: "esos-lead-assessor", label: "ESOS Lead Assessor" },
  {
    value: "heat-networks-consultant",
    label: "Heat Networks Consultant",
  },
  {
    value: "whole-life-carbon-assessor",
    label: "Whole Life Carbon Assessor",
  },
  { value: "nabers-uk-assessor", label: "NABERS UK Licensed Assessor" },
  {
    value: "management-systems-specialist",
    label: "Management System Specialist",
  },
] as const satisfies readonly PathwayOption<SpecialistRoute>[];

export interface PrimaryOutcomeDerivation {
  cibseMembershipTarget: CibseMembershipTarget;
  ietMembershipTarget: IetMembershipTarget;
  engineeringRegistrationTarget: EngineeringRegistrationTarget;
  specialistRoutes?: readonly SpecialistRoute[];
}

export const PRIMARY_OUTCOME_DERIVATIONS = {
  "internal-graduate": {
    cibseMembershipTarget: "none",
    ietMembershipTarget: "none",
    engineeringRegistrationTarget: "none",
  },
  "engtech-lcibse": {
    cibseMembershipTarget: "lcibse",
    ietMembershipTarget: "none",
    engineeringRegistrationTarget: "engtech",
  },
  "ieng-acibse": {
    cibseMembershipTarget: "acibse",
    ietMembershipTarget: "none",
    engineeringRegistrationTarget: "ieng",
  },
  "ieng-mcibse": {
    cibseMembershipTarget: "mcibse",
    ietMembershipTarget: "none",
    engineeringRegistrationTarget: "ieng",
  },
  "ceng-mcibse": {
    cibseMembershipTarget: "mcibse",
    ietMembershipTarget: "none",
    engineeringRegistrationTarget: "ceng",
  },
  "ceng-fcibse": {
    cibseMembershipTarget: "fcibse",
    ietMembershipTarget: "none",
    engineeringRegistrationTarget: "ceng",
  },
  "engtech-iet": {
    cibseMembershipTarget: "none",
    ietMembershipTarget: "tmiet",
    engineeringRegistrationTarget: "engtech",
  },
  "ieng-iet": {
    cibseMembershipTarget: "none",
    ietMembershipTarget: "miet",
    engineeringRegistrationTarget: "ieng",
  },
  "ceng-iet": {
    cibseMembershipTarget: "none",
    ietMembershipTarget: "miet",
    engineeringRegistrationTarget: "ceng",
  },
  "engtech-imeche": {
    cibseMembershipTarget: "none",
    ietMembershipTarget: "none",
    engineeringRegistrationTarget: "engtech",
  },
  "ieng-imeche": {
    cibseMembershipTarget: "none",
    ietMembershipTarget: "none",
    engineeringRegistrationTarget: "ieng",
  },
  "ceng-imeche": {
    cibseMembershipTarget: "none",
    ietMembershipTarget: "none",
    engineeringRegistrationTarget: "ceng",
  },
  lcc: {
    cibseMembershipTarget: "none",
    ietMembershipTarget: "none",
    engineeringRegistrationTarget: "none",
  },
  lcea: {
    cibseMembershipTarget: "none",
    ietMembershipTarget: "none",
    engineeringRegistrationTarget: "none",
    specialistRoutes: ["lcea"],
  },
} as const satisfies Partial<
  Record<PrimaryOutcome, PrimaryOutcomeDerivation>
>;

export interface ProfessionalBodyPathwayRules {
  hint: string;
  primaryOutcomes: readonly PrimaryOutcome[];
  cibseMembershipTargets: readonly SourceCibseMembershipTarget[];
  ietMembershipTargets: readonly SourceIetMembershipTarget[];
  engineeringRegistrationTargets: readonly EngineeringRegistrationTarget[];
  showCibseMembership: boolean;
  showIetMembership: boolean;
  showEngineeringRegistration: boolean;
  showLccStrands: boolean;
  showSpecialistRoutes: boolean;
}

export const PROFESSIONAL_BODY_PATHWAY_RULES = {
  cibse: {
    hint: "CIBSE pathway: use this for LCIBSE, ACIBSE, MCIBSE, FCIBSE and Engineering Council registration through CIBSE where applicable.",
    primaryOutcomes: ["internal-graduate", "engtech-lcibse", "ieng-acibse", "ieng-mcibse", "ceng-mcibse", "ceng-fcibse", "custom"],
    cibseMembershipTargets: ["none", "graduate", "affiliate", "lcibse", "acibse", "mcibse", "fcibse"],
    ietMembershipTargets: ["none"],
    engineeringRegistrationTargets: ["none", "engtech", "ieng", "ceng", "international-later"],
    showCibseMembership: true,
    showIetMembership: false,
    showEngineeringRegistration: true,
    showLccStrands: false,
    showSpecialistRoutes: false,
  },
  iet: {
    hint: "IET pathway: use this for IET-linked Engineering Council registration. CIBSE membership grades are hidden because they do not apply to this route.",
    primaryOutcomes: ["internal-graduate", "engtech-iet", "ieng-iet", "ceng-iet", "custom"],
    cibseMembershipTargets: ["none"],
    ietMembershipTargets: ["none", "student", "tmiet", "miet", "fiet"],
    engineeringRegistrationTargets: ["none", "engtech", "ieng", "ceng", "international-later"],
    showCibseMembership: false,
    showIetMembership: true,
    showEngineeringRegistration: true,
    showLccStrands: false,
    showSpecialistRoutes: false,
  },
  imeche: {
    hint: "IMechE pathway: use this for IMechE-linked Engineering Council registration. CIBSE membership grades and CIBSE Certification fields are hidden because they do not apply to this route.",
    primaryOutcomes: ["internal-graduate", "engtech-imeche", "ieng-imeche", "ceng-imeche", "custom"],
    cibseMembershipTargets: ["none"],
    ietMembershipTargets: ["none"],
    engineeringRegistrationTargets: ["none", "engtech", "ieng", "ceng", "international-later"],
    showCibseMembership: false,
    showIetMembership: false,
    showEngineeringRegistration: true,
    showLccStrands: false,
    showSpecialistRoutes: false,
  },
  "cibse-certification": {
    hint: "CIBSE Certification pathway: use this for specialist certification routes such as LCC, LCEA, NABERS UK, TM44 and Whole Life Carbon. It is separate from MCIBSE / CEng unless there is also a separate professional registration aim.",
    primaryOutcomes: ["lcc", "lcea", "cibse-cert-specialist", "custom"],
    cibseMembershipTargets: ["none"],
    ietMembershipTargets: ["none"],
    engineeringRegistrationTargets: ["none"],
    showCibseMembership: false,
    showIetMembership: false,
    showEngineeringRegistration: false,
    showLccStrands: true,
    showSpecialistRoutes: true,
  },
  internal: {
    hint: "Internal pathway: use this where the record is for company graduate development only and not currently linked to a professional body application.",
    primaryOutcomes: ["internal-graduate"],
    cibseMembershipTargets: ["none"],
    ietMembershipTargets: ["none"],
    engineeringRegistrationTargets: ["none"],
    showCibseMembership: false,
    showIetMembership: false,
    showEngineeringRegistration: false,
    showLccStrands: false,
    showSpecialistRoutes: false,
  },
  other: {
    hint: "Other / to be confirmed: keep the outcome custom until the mentor confirms the relevant professional body, registration route or specialist scheme.",
    primaryOutcomes: ["custom", "internal-graduate"],
    cibseMembershipTargets: ["none"],
    ietMembershipTargets: ["none"],
    engineeringRegistrationTargets: ["none"],
    showCibseMembership: false,
    showIetMembership: false,
    showEngineeringRegistration: false,
    showLccStrands: false,
    showSpecialistRoutes: false,
  },
} as const satisfies Record<
  SourceProfessionalBody,
  ProfessionalBodyPathwayRules
>;
