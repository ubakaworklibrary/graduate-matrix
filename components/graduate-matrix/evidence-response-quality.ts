import { DEPTH, LEADERSHIP, PERSONAL, REFLECTION, RESULT, hit, words } from "./action-response-quality";
import type { PocEvidenceMethod } from "./useMatrixPoc";

export type EvidenceQualityLabel = "Weak" | "Developing" | "Adequate" | "Strong" | "Exemplary";
export interface EvidenceQualityInput { method: PocEvidenceMethod; fields: Record<string, string> }
export interface EvidenceQualityCheck { id: string; label: string; state: "met" | "improve" | "missing" }
export interface EvidenceQualityResult { score: 1 | 2 | 3 | 4 | 5; label: EvidenceQualityLabel; checks: EvidenceQualityCheck[]; wordCount: number }

const definitions: Record<PocEvidenceMethod, { required: string[]; result: string; reflection: string }> = {
  carr: { required: ["context", "action", "result", "reflection"], result: "result", reflection: "reflection" },
  star: { required: ["situation", "task", "action", "result", "reflection"], result: "result", reflection: "reflection" },
  psar: { required: ["problem", "solution", "action", "result", "reflection"], result: "result", reflection: "reflection" },
};

export function reviewEvidenceResponse({ method, fields }: EvidenceQualityInput): EvidenceQualityResult {
  const definition = definitions[method];
  const values = definition.required.map((key) => fields[key]?.trim() ?? "");
  const text = values.join("\n");
  const wordCount = words(text);
  const complete = values.filter((value) => words(value) >= 8).length;
  const actionText = fields.action ?? "";
  const resultText = fields[definition.result] ?? "";
  const reflectionText = fields[definition.reflection] ?? "";

  const checks: EvidenceQualityCheck[] = [
    { id: "sections", label: complete === definition.required.length ? "Every Evidence section contains meaningful detail." : "Add meaningful detail to the incomplete Evidence sections.", state: complete === definition.required.length ? "met" : complete ? "improve" : "missing" },
    { id: "ownership", label: hit(PERSONAL, actionText) ? "Your personal contribution is clear." : "Make your personal contribution clearer by describing what you did using “I”.", state: hit(PERSONAL, actionText) ? "met" : actionText ? "improve" : "missing" },
    { id: "result", label: hit(RESULT, resultText) || words(resultText) >= 25 ? "A specific result or impact is identifiable." : "Add a measurable or observable result showing what changed.", state: hit(RESULT, resultText) || words(resultText) >= 25 ? "met" : resultText ? "improve" : "missing" },
    { id: "reflection", label: hit(REFLECTION, reflectionText) ? "Reflection explains learning or future application." : "Explain what you learned and how you will apply it in future work.", state: hit(REFLECTION, reflectionText) ? "met" : reflectionText ? "improve" : "missing" },
  ];

  const depthHits = DEPTH.filter((pattern) => pattern.test(text)).length;
  const leadershipHits = LEADERSHIP.filter((pattern) => pattern.test(text)).length;
  checks.push({ id: "depth", label: depthHits >= 2 ? "The Evidence includes technical reasoning, judgement, standards or coordination." : "Add technical reasoning, standards, calculations, risks, constraints or options where relevant.", state: depthHits >= 2 ? "met" : text ? "improve" : "missing" });
  if (method === "psar") checks.push({ id: "leadership", label: leadershipHits ? "Leadership, coordination or innovation is visible." : "For higher-level Evidence, explain any leadership, coordination, judgement or innovation that genuinely occurred.", state: leadershipHits ? "met" : "improve" });

  const met = checks.filter((check) => check.state === "met").length;
  const score = Math.max(1, Math.min(5, Math.round(1 + (met / checks.length) * 4 + (wordCount >= 180 ? 0.5 : 0)))) as 1 | 2 | 3 | 4 | 5;
  return { score, label: (["", "Weak", "Developing", "Adequate", "Strong", "Exemplary"] as const)[score], checks, wordCount };
}
