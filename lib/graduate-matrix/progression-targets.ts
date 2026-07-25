import type {
  CompetencyDefinition,
  CompetencyLevel,
  CompetencyRecord,
  EngineeringRegistrationTarget,
  IsoDate,
} from "@/types/graduate-matrix";
import { getCompetencyTargetLevel } from "./competency-progress";

export type CompetencyProfile = "knowledge" | "applied" | "managerial" | "leadership" | "behavioural" | "reflective";
type SupportedRegistrationTarget = "engtech" | "ieng" | "ceng";

export const COMPETENCY_PROFILES: Readonly<Record<string, CompetencyProfile>> = {
  A1: "knowledge", A2: "applied", B1: "applied", B2: "applied", B3: "applied",
  C1: "managerial", C2: "managerial", C3: "leadership", C4: "leadership",
  D1: "behavioural", D2: "behavioural", D3: "behavioural", E1: "knowledge",
  E2: "applied", E3: "applied", E4: "reflective", E5: "knowledge",
};

export const TARGET_CURVES: Readonly<Record<SupportedRegistrationTarget, Readonly<Record<CompetencyProfile, readonly CompetencyLevel[]>>>> = {
  ceng: { knowledge: ["L2", "L3", "L4", "L4"], applied: ["L1", "L3", "L4", "L5"], managerial: ["L1", "L2", "L3", "L4"], leadership: ["L1", "L1", "L2", "L4"], behavioural: ["L2", "L3", "L4", "L4"], reflective: ["L3", "L4", "L4", "L5"] },
  ieng: { knowledge: ["L2", "L3", "L4", "L4"], applied: ["L1", "L2", "L3", "L4"], managerial: ["L1", "L2", "L3", "L4"], leadership: ["L1", "L1", "L2", "L3"], behavioural: ["L2", "L3", "L4", "L4"], reflective: ["L3", "L4", "L4", "L4"] },
  engtech: { knowledge: ["L1", "L2", "L3", "L3"], applied: ["L1", "L2", "L3", "L3"], managerial: ["L1", "L2", "L2", "L2"], leadership: ["L1", "L1", "L2", "L2"], behavioural: ["L1", "L2", "L3", "L3"], reflective: ["L2", "L3", "L3", "L3"] },
};

export function getGraduateSchemeYear(startDate: IsoDate | null, asOf = new Date()): 1 | 2 | 3 | 4 | null {
  if (!startDate) return null;
  const start = new Date(`${startDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime())) return null;
  const months = (asOf.getUTCFullYear() - start.getUTCFullYear()) * 12 + asOf.getUTCMonth() - start.getUTCMonth();
  return Math.max(1, Math.min(4, Math.floor(months / 12) + 1)) as 1 | 2 | 3 | 4;
}

function supportedRegistrationTarget(target: EngineeringRegistrationTarget): SupportedRegistrationTarget {
  return target === "engtech" || target === "ieng" ? target : "ceng";
}

export function getTargetCurve(definition: CompetencyDefinition, registrationTarget: EngineeringRegistrationTarget): readonly CompetencyLevel[] {
  const profile = COMPETENCY_PROFILES[definition.reference] ?? "applied";
  return TARGET_CURVES[supportedRegistrationTarget(registrationTarget)][profile];
}

export function resolveCurrentCompetencyTarget(
  definition: CompetencyDefinition,
  record: CompetencyRecord | undefined,
  registrationTarget: EngineeringRegistrationTarget,
  schemeStartDate: IsoDate | null,
  asOf = new Date(),
): CompetencyLevel {
  const year = getGraduateSchemeYear(schemeStartDate, asOf);
  const curve = getTargetCurve(definition, registrationTarget);
  const baselineTarget = year ? curve[year - 1] ?? curve[3] ?? "L1" : "L1";
  return record ? getCompetencyTargetLevel(record, baselineTarget) ?? "L1" : baselineTarget;
}
