import type {
  EngineeringRegistrationTarget,
  LccStrand,
  PrimaryOutcome,
  SpecialistRoute,
} from "../../types/graduate-matrix";
import {
  PRIMARY_OUTCOME_DERIVATIONS,
  PROFESSIONAL_BODY_PATHWAY_RULES,
  type ProfessionalBodyPathwayRules,
  type SourceCibseMembershipTarget,
  type SourceIetMembershipTarget,
  type SourceProfessionalBody,
} from "./data/pathways";

export interface SourceCompatiblePathway {
  professionalBody: SourceProfessionalBody;
  primaryOutcome: PrimaryOutcome;
  cibseMembershipTarget: SourceCibseMembershipTarget;
  ietMembershipTarget: SourceIetMembershipTarget;
  engineeringRegistrationTarget: EngineeringRegistrationTarget;
  lccStrands: readonly LccStrand[];
  specialistRoutes: readonly SpecialistRoute[];
}

export interface PathwayFieldApplicability {
  cibseMembershipTarget: boolean;
  ietMembershipTarget: boolean;
  engineeringRegistrationTarget: boolean;
  lccStrands: boolean;
  specialistRoutes: boolean;
}

export interface PathwayFieldEditability extends PathwayFieldApplicability {
  primaryOutcome: true;
}

export function getPathwayRules(
  professionalBody: SourceProfessionalBody,
): ProfessionalBodyPathwayRules {
  return PROFESSIONAL_BODY_PATHWAY_RULES[professionalBody];
}

export function isPrimaryOutcomeDerived(
  primaryOutcome: PrimaryOutcome,
): boolean {
  return primaryOutcome in PRIMARY_OUTCOME_DERIVATIONS;
}

export function derivePrimaryOutcomeTargets(
  primaryOutcome: PrimaryOutcome,
) {
  return PRIMARY_OUTCOME_DERIVATIONS[
    primaryOutcome as keyof typeof PRIMARY_OUTCOME_DERIVATIONS
  ] ?? null;
}

export function getPathwayFieldApplicability(
  professionalBody: SourceProfessionalBody,
  primaryOutcome: PrimaryOutcome,
): PathwayFieldApplicability {
  const rules = getPathwayRules(professionalBody);

  return {
    cibseMembershipTarget: rules.showCibseMembership,
    ietMembershipTarget: rules.showIetMembership,
    engineeringRegistrationTarget: rules.showEngineeringRegistration,
    lccStrands: rules.showLccStrands && primaryOutcome === "lcc",
    specialistRoutes: rules.showSpecialistRoutes,
  };
}

export function getPathwayFieldEditability(
  professionalBody: SourceProfessionalBody,
  primaryOutcome: PrimaryOutcome,
): PathwayFieldEditability {
  const applicability = getPathwayFieldApplicability(
    professionalBody,
    primaryOutcome,
  );
  const dependentFieldsEditable = !isPrimaryOutcomeDerived(primaryOutcome);

  return {
    primaryOutcome: true,
    cibseMembershipTarget:
      applicability.cibseMembershipTarget && dependentFieldsEditable,
    ietMembershipTarget:
      applicability.ietMembershipTarget && dependentFieldsEditable,
    engineeringRegistrationTarget:
      applicability.engineeringRegistrationTarget && dependentFieldsEditable,
    lccStrands: applicability.lccStrands,
    specialistRoutes: applicability.specialistRoutes,
  };
}

function includesValue<Value extends string>(
  values: readonly Value[],
  value: Value,
): boolean {
  return values.includes(value);
}

export function normalisePathway(
  pathway: SourceCompatiblePathway,
): SourceCompatiblePathway {
  const rules = getPathwayRules(pathway.professionalBody);
  const primaryOutcome = includesValue(
    rules.primaryOutcomes,
    pathway.primaryOutcome,
  )
    ? pathway.primaryOutcome
    : rules.primaryOutcomes[0];
  const derivation = derivePrimaryOutcomeTargets(primaryOutcome);

  const derivedPathway = derivation
    ? {
        ...pathway,
        cibseMembershipTarget: derivation.cibseMembershipTarget,
        ietMembershipTarget: derivation.ietMembershipTarget,
        engineeringRegistrationTarget:
          derivation.engineeringRegistrationTarget,
        specialistRoutes:
          "specialistRoutes" in derivation
            ? derivation.specialistRoutes
            : pathway.specialistRoutes,
      }
    : pathway;

  const cibseMembershipTarget = rules.showCibseMembership
    ? includesValue(
        rules.cibseMembershipTargets,
        derivedPathway.cibseMembershipTarget,
      )
      ? derivedPathway.cibseMembershipTarget
      : rules.cibseMembershipTargets[0]
    : "none";
  const ietMembershipTarget = rules.showIetMembership
    ? includesValue(
        rules.ietMembershipTargets,
        derivedPathway.ietMembershipTarget,
      )
      ? derivedPathway.ietMembershipTarget
      : rules.ietMembershipTargets[0]
    : "none";
  const engineeringRegistrationTarget = rules.showEngineeringRegistration
    ? includesValue(
        rules.engineeringRegistrationTargets,
        derivedPathway.engineeringRegistrationTarget,
      )
      ? derivedPathway.engineeringRegistrationTarget
      : rules.engineeringRegistrationTargets[0]
    : "none";

  return {
    professionalBody: pathway.professionalBody,
    primaryOutcome,
    cibseMembershipTarget,
    ietMembershipTarget,
    engineeringRegistrationTarget,
    lccStrands:
      rules.showLccStrands && primaryOutcome === "lcc"
        ? [...derivedPathway.lccStrands]
        : [],
    specialistRoutes: rules.showSpecialistRoutes
      ? [...derivedPathway.specialistRoutes]
      : [],
  };
}
