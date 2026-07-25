import type { CompetencyDefinition } from "@/types/graduate-matrix";
import type { PocEvidenceMethod } from "./useMatrixPoc";

// Ported from the standalone tool's suggested-linked-competencies feature
// (Reference/Graduate_Training_Matrix.html, ref21SuggestedLinkedCompetencies).
// Deterministic, local, token-overlap scoring — no network requests, no AI calls.

export interface EvidenceSuggestionInput {
  primaryCompetencyRef: string;
  title: string;
  projectReference: string;
  projectType: string;
  ribaStage: string;
  method: PocEvidenceMethod;
  fields: Record<string, string>;
  systems: string[];
}

export interface EvidenceCompetencySuggestion {
  ref: string;
  score: number;
}

// Generic reference-keyword mapping ported verbatim from GENERIC_REF_KEYWORDS in the
// historic tool — a light keyword boost per competency reference, independent of the
// current framework wording, so short/plain Evidence text still surfaces sensible matches.
const GENERIC_REF_KEYWORDS: Record<string, string> = {
  A1: "knowledge theory technical standards emerging technology cpd learning guide regulation principles current understanding",
  A2: "design analysis problem solution option appraisal simulation calculation complex unusual risk integration recommendation judgement",
  B1: "brief requirement define problem opportunity client stakeholder assumption scope risk improvement alternative",
  B2: "investigation research calculation analysis design cost quality safety sustainability accessibility environmental security option comparison",
  B3: "implementation site commissioning installation inspection testing performance effectiveness lessons learned snagging witness",
  C1: "plan programme resource budget risk stakeholder method fee estimate task project delivery",
  C2: "manage organise direct control budget programme fee quality time rfi change coordination workload",
  C3: "lead team mentor junior assist objective feedback knowledge sharing supervision support others",
  C4: "quality improvement best practice digital bim revit automation workflow qa process lesson learned innovation",
  D1: "communicate report drawing specification email meeting explain technical non technical collaborate audience",
  D2: "present proposal justification conclusion presentation bid article technical note client contractor",
  D3: "personal social emotional intelligence diversity inclusion relationship conflict behaviour pressure team",
  E1: "code conduct legislation regulation building regulations cdm building safety act compliance professional",
  E2: "safety hazard risk rams safe system work cdm designer site induction hasawa",
  E3: "sustainability net zero carbon energy environmental circular social value embodied operational tm65",
  E4: "cpd reflective practice learning development plan competence training record reflection",
  E5: "ethics ethical dilemma responsibility conduct whistleblowing safeguarding principle professional",
};

const STOP_WORDS = new Set(
  "about above after again against along also although always among around based because been before being below between both cannot could did does doing done during each either enough every from further give given gives going have having here into itself just keep less like made make many more most much need needs only other over same should show since some such than that their them then there these they this those through under until upon very what when where which while with within without would your"
    .split(/\s+/),
);

function tokenise(text: string): string[] {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function competencyText(competency: CompetencyDefinition): string {
  const generic = GENERIC_REF_KEYWORDS[competency.reference] || "";
  return [generic, competency.area, competency.objective, competency.behaviours, competency.evidenceExamples].filter(Boolean).join(" ");
}

export function evidenceAnalysisText(input: EvidenceSuggestionInput): string {
  const parts = [input.title, input.projectReference, input.projectType, input.ribaStage, ...Object.values(input.fields), ...input.systems];
  return parts.filter(Boolean).join("\n");
}

export function suggestEvidenceCompetencies(
  input: EvidenceSuggestionInput,
  competencies: readonly CompetencyDefinition[],
  limit = 6,
): EvidenceCompetencySuggestion[] {
  const inputTokens = tokenise(evidenceAnalysisText(input));
  if (!inputTokens.length) return [];
  const inputSet = new Set(inputTokens);
  const candidates = competencies.filter((competency) => competency.reference !== input.primaryCompetencyRef);

  const scored = candidates.map((competency) => {
    let score = 0;
    tokenise(competencyText(competency)).forEach((token) => {
      if (inputSet.has(token)) score += 1;
    });
    tokenise(GENERIC_REF_KEYWORDS[competency.reference] || "").forEach((token) => {
      if (inputSet.has(token)) score += 0.75;
    });
    return { ref: competency.reference, score };
  });

  return scored
    .filter((entry) => entry.score >= 2.25)
    .sort((a, b) => b.score - a.score || a.ref.localeCompare(b.ref))
    .slice(0, limit);
}
