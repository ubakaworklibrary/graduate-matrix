import type { PocResponseMethod } from "./useMatrixPoc";

export type ResponseQualityLabel = "Weak" | "Developing" | "Adequate" | "Strong" | "Exemplary";
export interface ResponseQualityInput { method: PocResponseMethod; fields: Record<string, string> }
export interface ResponseQualityCheck { id: string; label: string; state: "met" | "improve" | "missing" }
export interface ResponseQualityResult { score: 1 | 2 | 3 | 4 | 5; label: ResponseQualityLabel; checks: ResponseQualityCheck[]; wordCount: number }

// Exported so evidence-response-quality.ts can reuse the same personal-contribution,
// reflection, result and leadership detectors without duplicating regex logic.
// Purely additive — behaviour of this module is unchanged.
export const PERSONAL = [/\bi\s+(reviewed|calculated|prepared|checked|coordinated|developed|selected|proposed|resolved|led|issued|presented|challenged|decided|completed|created|updated)\b/i];
export const REFLECTION = [/\bi\s+learned\b/i,/\bi\s+realised\b/i,/\bnext\s+time\b/i,/\bin\s+future\b/i,/\bi\s+would\b/i,/\bthis\s+(improved|changed|taught|showed)\b/i];
export const RESULT = [/\bresult(ed)?\b/i,/\boutcome\b/i,/\bimproved\b/i,/\breduced\b/i,/\bresolved\b/i,/\bapproved\b/i,/\bcompleted\b/i,/\baccepted\b/i,/\bavoided\b/i];
export const DEPTH = [/\bbecause\b/i,/\bhowever\b/i,/\balthough\b/i,/\btrade.?off\b/i,/\bconstraint\b/i,/\brisk\b/i,/\bstandard\b/i,/\bcompliance\b/i,/\bcalculation\b/i,/\bverified?\b/i,/\bjudg(e|ement)\b/i,/\bdecision\b/i,/\bcoordinat(ed|ion)\b/i,/\boption\b/i,/\balternative\b/i,/\brationale\b/i];
export const LEADERSHIP = [/\bi\s+led\b/i,/\bi\s+coordinated\b/i,/\bi\s+mentored\b/i,/\bi\s+initiated\b/i,/\bi\s+proposed\b/i,/\bi\s+championed\b/i,/\binnovat(ed|ion|ive)\b/i,/\bnovel\b/i];
export const words = (value = "") => value.trim().split(/\s+/).filter(Boolean).length;
export const hit = (patterns: RegExp[], value: string) => patterns.some((pattern) => pattern.test(value));
const definitions: Record<PocResponseMethod, { required: string[]; result?: string; reflection?: string }> = {
  carr: { required:["context","action","result","reflection"], result:"result", reflection:"reflection" },
  star: { required:["situation","task","action","result","reflection"], result:"result", reflection:"reflection" },
  psar: { required:["problem","solution","action","result","reflection"], result:"result", reflection:"reflection" },
  "short-update": { required:["progress","nextStep"] },
};

export function reviewActionResponse({ method, fields }: ResponseQualityInput): ResponseQualityResult {
  const definition = definitions[method];
  const values = definition.required.map((key) => fields[key]?.trim() ?? "");
  const text = values.join("\n");
  const wordCount = words(text);
  const complete = values.filter((value) => words(value) >= 8).length;
  const actionText = fields.action ?? fields.progress ?? "";
  const resultText = definition.result ? fields[definition.result] ?? "" : fields.nextStep ?? "";
  const reflectionText = definition.reflection ? fields[definition.reflection] ?? "" : "";
  const checks: ResponseQualityCheck[] = [
    { id:"sections", label: complete === definition.required.length ? "Every response section contains meaningful detail." : "Add meaningful detail to the incomplete response sections.", state: complete === definition.required.length ? "met" : complete ? "improve" : "missing" },
    { id:"ownership", label: hit(PERSONAL, actionText) ? "Your personal contribution is clear." : "Make your personal contribution clearer by describing what you did using “I”.", state: hit(PERSONAL, actionText) ? "met" : actionText ? "improve" : "missing" },
    { id:"result", label: hit(RESULT, resultText) || words(resultText) >= 25 ? "A specific result or next step is identifiable." : "Add a clearer result showing what changed.", state: hit(RESULT, resultText) || words(resultText) >= 25 ? "met" : resultText ? "improve" : "missing" },
  ];
  if (method !== "short-update") checks.push({ id:"reflection", label: hit(REFLECTION, reflectionText) ? "Reflection explains learning or future application." : "Explain what you learned and how you will apply it next time.", state: hit(REFLECTION, reflectionText) ? "met" : reflectionText ? "improve" : "missing" });
  const depthHits = DEPTH.filter((pattern) => pattern.test(text)).length;
  const leadershipHits = LEADERSHIP.filter((pattern) => pattern.test(text)).length;
  checks.push({ id:"depth", label: depthHits >= 2 ? "The response includes technical reasoning, judgement or coordination." : "Add technical reasoning, checks, options, risk, judgement or coordination where relevant.", state: depthHits >= 2 ? "met" : text ? "improve" : "missing" });
  if (method === "psar") checks.push({ id:"leadership", label: leadershipHits ? "Leadership, coordination or innovation is visible." : "For higher-level work, explain any leadership, coordination, judgement or innovation that genuinely occurred.", state: leadershipHits ? "met" : "improve" });
  const met = checks.filter((check) => check.state === "met").length;
  let score = Math.max(1, Math.min(5, Math.round(1 + (met / checks.length) * 4 + (wordCount >= 180 ? .5 : 0)))) as 1|2|3|4|5;
  if (method === "short-update") score = Math.min(score, 3) as 1|2|3;
  return { score, label: (["","Weak","Developing","Adequate","Strong","Exemplary"] as const)[score], checks, wordCount };
}
