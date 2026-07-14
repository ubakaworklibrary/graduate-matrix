export interface AssessmentMethodDefinition {
  name: string;
  description: string;
  typicalFrequency: string;
}

export const ASSESSMENT_METHODS = [
  {
    name: "Mentor review",
    description:
      "Regular structured review by appointed mentor; sign-off of evidence and reflective accounts.",
    typicalFrequency: "Monthly / Quarterly",
  },
  {
    name: "Line manager sign-off",
    description:
      "Confirmation of workplace performance, behaviours, and progression.",
    typicalFrequency: "Quarterly",
  },
  {
    name: "Portfolio review",
    description:
      "Cumulative review of evidence portfolio against each competence (A1–E5).",
    typicalFrequency: "Quarterly + Annual",
  },
  {
    name: "Technical interview",
    description:
      "Structured technical Q&A by senior engineer / panel; tests depth of understanding.",
    typicalFrequency: "Annually",
  },
  {
    name: "Presentation",
    description:
      "Graduate presents project work / reflective account to panel.",
    typicalFrequency: "Annually",
  },
  {
    name: "Direct observation",
    description:
      "Observation in meetings, on site, or during design reviews.",
    typicalFrequency: "Project milestones",
  },
  {
    name: "Quarterly review",
    description:
      "Formal quarterly progress meeting between graduate, mentor, and line manager.",
    typicalFrequency: "Quarterly",
  },
  {
    name: "Annual progression panel",
    description:
      "Cross-functional panel reviews portfolio, presentation, and interview; sets next-year plan.",
    typicalFrequency: "Annually",
  },
] as const satisfies readonly AssessmentMethodDefinition[];
