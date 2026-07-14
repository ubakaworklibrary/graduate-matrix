import type { CompetencyLevel } from "../../../types/graduate-matrix";

export interface ProgressionRubricEntry {
  level: CompetencyLevel;
  name: string;
  description: string;
  evidenceExpectation: string;
  typicalTiming: string;
}

export const PROGRESSION_RUBRIC = [
  {
    level: "L1",
    name: "Awareness",
    description:
      "Understands why the competence matters and where it sits in professional practice.",
    evidenceExpectation:
      "Can describe purpose and context; recognises relevant terminology.",
    typicalTiming: "Year 1 (months 0–6)",
  },
  {
    level: "L2",
    name: "Knowledge",
    description:
      "Understands how the competence is achieved and the methods/tools used.",
    evidenceExpectation:
      "Can explain methods, codes, and tools; recalls relevant standards.",
    typicalTiming: "Year 1 (months 6–12)",
  },
  {
    level: "L3",
    name: "Supervised Application",
    description:
      "Performs the competence under direct supervision of a senior engineer.",
    evidenceExpectation:
      "Produces outputs reviewed and checked by a senior; learns from feedback.",
    typicalTiming: "Year 2",
  },
  {
    level: "L4",
    name: "Independent Application",
    description:
      "Performs the competence reliably without close supervision; outputs require technical check only.",
    evidenceExpectation:
      "Plans own work; produces compliant deliverables; identifies and escalates risk; explains judgement and escalates appropriately.",
    typicalTiming: "Year 3",
  },
  {
    level: "L5",
    name: "Leadership / Mentoring / Strategic",
    description:
      "Leads others in the competence; innovates; contributes to strategy, complex / unfamiliar problems.",
    evidenceExpectation:
      "Mentors juniors; leads workstreams; demonstrates innovation, complexity handling and technical leadership where relevant.",
    typicalTiming: "Year 4+",
  },
] as const satisfies readonly ProgressionRubricEntry[];
