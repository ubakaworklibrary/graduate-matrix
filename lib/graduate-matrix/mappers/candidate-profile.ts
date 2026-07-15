import type {
  CandidateInfo,
  CibseMembershipTarget,
  EngineeringRegistrationTarget,
  IetMembershipTarget,
  LccStrand,
  PrimaryOutcome,
  ProfessionalBody,
  SpecialistRoute,
} from "@/types/graduate-matrix";
import type {
  AuthenticatedCandidateProfileRows,
  CandidateRelationshipRow,
} from "@/lib/graduate-matrix/repositories/candidate-profile";
import {
  CIBSE_MEMBERSHIP_OPTIONS,
  ENGINEERING_REGISTRATION_OPTIONS,
  IET_MEMBERSHIP_OPTIONS,
  LCC_STRAND_OPTIONS,
  PRIMARY_OUTCOME_OPTIONS,
  PROFESSIONAL_BODY_OPTIONS,
  SPECIALIST_ROUTE_OPTIONS,
} from "@/lib/graduate-matrix/data/pathways";

const PROFESSIONAL_BODIES: readonly ProfessionalBody[] =
  PROFESSIONAL_BODY_OPTIONS.map(({ value }) => value);
const PRIMARY_OUTCOMES: readonly PrimaryOutcome[] = PRIMARY_OUTCOME_OPTIONS.map(
  ({ value }) => value,
);
const CIBSE_MEMBERSHIP_TARGETS: readonly CibseMembershipTarget[] =
  CIBSE_MEMBERSHIP_OPTIONS.map(({ value }) => value);
const IET_MEMBERSHIP_TARGETS: readonly IetMembershipTarget[] =
  IET_MEMBERSHIP_OPTIONS.map(({ value }) => value);
const ENGINEERING_REGISTRATION_TARGETS: readonly EngineeringRegistrationTarget[] =
  ENGINEERING_REGISTRATION_OPTIONS.map(({ value }) => value);
const LCC_STRANDS: readonly LccStrand[] = LCC_STRAND_OPTIONS.map(
  ({ value }) => value,
);
const SPECIALIST_ROUTES: readonly SpecialistRoute[] =
  SPECIALIST_ROUTE_OPTIONS.map(({ value }) => value);

export type CandidateProfileMappingResult =
  | { status: "mapped"; candidate: CandidateInfo }
  | { status: "incomplete" };

function isOneOf<Value extends string>(
  value: string,
  allowedValues: readonly Value[],
): value is Value {
  return allowedValues.some((allowedValue) => allowedValue === value);
}

function mapAllowedValues<Value extends string>(
  values: readonly string[],
  allowedValues: readonly Value[],
): Value[] | null {
  const mappedValues: Value[] = [];

  for (const value of values) {
    if (!isOneOf(value, allowedValues)) return null;
    mappedValues.push(value);
  }

  return mappedValues;
}

function relationshipName(
  relationships: readonly CandidateRelationshipRow[],
  relationshipType: "mentor" | "manager" | "reviewer",
): string {
  return (
    relationships.find(
      (relationship) => relationship.relationship_type === relationshipType,
    )?.display_name ?? ""
  );
}

export function mapCandidateProfile(
  rows: AuthenticatedCandidateProfileRows,
): CandidateProfileMappingResult {
  const { candidate, pathway } = rows;
  const lccStrands = mapAllowedValues(
    rows.lccStrands.map((row) => row.strand_code),
    LCC_STRANDS,
  );
  const specialistRoutes = mapAllowedValues(
    rows.specialistRoutes.map((row) => row.route_code),
    SPECIALIST_ROUTES,
  );

  if (
    pathway === null ||
    !isOneOf(pathway.professional_body, PROFESSIONAL_BODIES) ||
    !isOneOf(pathway.primary_outcome, PRIMARY_OUTCOMES) ||
    !isOneOf(pathway.cibse_membership_target, CIBSE_MEMBERSHIP_TARGETS) ||
    !isOneOf(pathway.iet_membership_target, IET_MEMBERSHIP_TARGETS) ||
    !isOneOf(
      pathway.engineering_registration_target,
      ENGINEERING_REGISTRATION_TARGETS,
    ) ||
    lccStrands === null ||
    specialistRoutes === null
  ) {
    return { status: "incomplete" };
  }

  return {
    status: "mapped",
    candidate: {
      id: candidate.id,
      firstName: candidate.first_name,
      surname: candidate.surname,
      jobTitle: candidate.job_title,
      discipline: candidate.discipline,
      employerTeam: candidate.employer_team,
      officeLocation: candidate.office_location,
      schemeStartDate: candidate.scheme_start_date,
      expectedApplicationDate: candidate.expected_application_date,
      mentorName: relationshipName(rows.relationships, "mentor"),
      lineManagerName: relationshipName(rows.relationships, "manager"),
      reviewerName: relationshipName(rows.relationships, "reviewer"),
      pathway: {
        professionalBody: pathway.professional_body,
        primaryOutcome: pathway.primary_outcome,
        cibseMembershipTarget: pathway.cibse_membership_target,
        ietMembershipTarget: pathway.iet_membership_target,
        engineeringRegistrationTarget:
          pathway.engineering_registration_target,
        lccStrands,
        specialistRoutes,
        currentMembershipStatus: pathway.current_membership_status,
        academicRoute: pathway.academic_route,
        notes: pathway.notes,
      },
      createdAt: candidate.created_at,
      updatedAt: candidate.updated_at,
    },
  };
}
