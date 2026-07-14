import type { BaselineTaskDefinition } from "../../../types/graduate-matrix";

export const BASELINE_TASK_DEFINITIONS = [
  {
    id: "candidate-profile",
    title: "Candidate profile completed",
    description:
      "Candidate first name, surname and scheme start date are recorded.",
    mandatory: true,
    completionMode: "automatic",
  },
  {
    id: "registration-route",
    title: "Registration route selected",
    description: "Primary target outcome / pathway is selected.",
    mandatory: true,
    completionMode: "automatic",
  },
  {
    id: "mentor-confirmed",
    title: "Mentor confirmed",
    description: "Named mentor is recorded on the Candidate page.",
    mandatory: true,
    completionMode: "automatic",
  },
  {
    id: "manager-reviewer-confirmed",
    title: "Manager / reviewer confirmed",
    description:
      "Line manager or additional reviewer / sponsor is recorded on the Candidate page.",
    mandatory: false,
    completionMode: "automatic",
  },
  {
    id: "file-structure",
    title: "Company file structure explained",
    description:
      "Project folders, drawings, specifications, calculations, markups and issued information locations have been explained.",
    mandatory: true,
    completionMode: "mentor",
  },
  {
    id: "document-control",
    title: "Document naming and revision control explained",
    description:
      "Naming, revisions, status, superseded information and issue control have been explained.",
    mandatory: true,
    completionMode: "mentor",
  },
  {
    id: "templates-standards",
    title: "Internal templates and standards location explained",
    description:
      "The candidate knows where to find reports, specs, calculation templates, schedules and internal standards.",
    mandatory: true,
    completionMode: "mentor",
  },
  {
    id: "qa-checking",
    title: "QA / checking process explained",
    description:
      "Internal checking, assumptions, exclusions and escalation route have been explained.",
    mandatory: true,
    completionMode: "mentor",
  },
  {
    id: "matrix-briefing",
    title: "Training matrix briefing completed",
    description:
      "Candidate understands BL, L1-L5, evidence, actions, mentor review and export/import expectations.",
    mandatory: true,
    completionMode: "mentor",
  },
  {
    id: "first-review",
    title: "First L1 review date agreed",
    description:
      "The first formal L1 review date or review window has been agreed.",
    mandatory: true,
    completionMode: "mentor",
  },
  {
    id: "initial-l1-actions",
    title: "Initial L1 development actions agreed",
    description:
      "Initial L1 development focus/actions are agreed before the formal cycle starts.",
    mandatory: true,
    completionMode: "mentor",
  },
] as const satisfies readonly BaselineTaskDefinition[];
