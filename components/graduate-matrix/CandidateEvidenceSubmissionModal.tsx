"use client";

import { useEffect, useMemo, useState } from "react";
import type { CompetencyDefinition, CompetencyLevel } from "@/types/graduate-matrix";
import { suggestEvidenceCompetencies } from "./evidence-competency-suggestions";
import { reviewEvidenceResponse } from "./evidence-response-quality";
import Modal from "./Modal";
import { EVIDENCE_RIBA_STAGES, evidenceRibaStageLabel } from "./useMatrixPoc";
import type { PocEvidence, PocEvidenceAttachment, PocEvidenceDocumentLink, PocEvidenceMethod, PocEvidenceVersion, useMatrixPoc } from "./useMatrixPoc";

type PocApi = ReturnType<typeof useMatrixPoc>;
type Prompt = { key: string; label: string; words: string; hint: string; placeholder?: string };
type Method = { value: PocEvidenceMethod; label: string; explanation: string; prompts: Prompt[]; example: { heading: string; sections: { label: string; text: string }[] } };

const LEVELS: readonly CompetencyLevel[] = ["L1", "L2", "L3", "L4", "L5"];

// No existing systems/technical-area taxonomy exists elsewhere in this codebase or in the
// historic standalone tool, so this list is taken directly from the approved spec.
const TECHNICAL_SYSTEMS = ["ventilation", "heating", "cooling", "public-health", "controls", "energy", "sustainability", "electrical-coordination", "fire-smoke-control", "acoustics", "bim-coordination"] as const;
const TECHNICAL_SYSTEM_LABELS: Record<string, string> = { ventilation: "Ventilation", heating: "Heating", cooling: "Cooling", "public-health": "Public health", controls: "Controls", energy: "Energy", sustainability: "Sustainability", "electrical-coordination": "Electrical coordination", "fire-smoke-control": "Fire / smoke control", acoustics: "Acoustics", "bim-coordination": "BIM / coordination" };

const METHODS: Method[] = [
  { value: "carr", label: "CAR+R", explanation: "Good for normal Evidence entries where you need to explain the context, what you personally did and what changed.", prompts: [{ key: "context", label: "Context", words: "60–120 words", hint: "Set out the project context, your role, the competence being evidenced and the technical situation.", placeholder: "Example: On a Stage 3 ventilation package, I was asked to check plant capacity against the revised occupancy schedule..." }, { key: "action", label: "Action", words: "100–220 words", hint: "Explain what you personally did. Use ‘I’, not ‘we’. Include checks, coordination, judgement and decisions.", placeholder: "Example: I reviewed the occupancy assumptions, recalculated the ventilation rate, and coordinated the riser impact with the architect..." }, { key: "result", label: "Result", words: "50–120 words", hint: "State what changed because of your action, including technical, programme, quality or compliance outcomes.", placeholder: "Example: The revised rate was accepted and issued at Stage 3, avoiding a late design change..." }, { key: "reflection", label: "Reflection", words: "80–160 words", hint: "Explain what you learned, what you would do differently, and how this will improve your future work.", placeholder: "Example: I learned that checking occupancy assumptions early is as important as checking plant duty. Next time I would confirm briefing assumptions before starting the calculation..." }], example: { heading: "Example · CAR+R structure (L2 entry on B2)", sections: [{ label: "Context", text: "On project PRJ-2024-014 (mid-rise office refurb), I was asked by the senior engineer to size the new chilled water pipework for the cooling loop serving floors 3–5." }, { label: "Action", text: "I extracted the cooling loads from the IES VE model (peak 142 kW) and used the chiller manufacturer's flow rate (5.4 l/s for 6°C ΔT). I calculated pipe sizes for each branch using CIBSE Guide C tables, targeting 1–2 m/s velocity and ≤300 Pa/m pressure drop. I selected DN65 for the main risers and stepped down to DN40–DN32 for the branches. I produced a marked-up plant schematic and a pipe schedule which I checked with the senior engineer." }, { label: "Result", text: "The senior engineer reviewed and amended two branch sizes because I had not accounted for diversity in the original sizing assumption. The schedule was issued at RIBA Stage 3." }, { label: "Reflection", text: "I learned that diversity factors are critical when sizing branch pipework, not just at plant level. Next time I will document my diversity assumptions explicitly in the calculation sheet and ask my senior to review my assumptions list before doing the sizing." }] } },
  { value: "star", label: "STAR", explanation: "Good for interview-style Evidence and behavioural competences. It separates the situation from your personal responsibility.", prompts: [{ key: "situation", label: "Situation", words: "50–100 words", hint: "Describe the project background, technical issue, constraint or setting.", placeholder: "Example: The Stage 3 mechanical design package was due in two weeks and the architectural layout had changed..." }, { key: "task", label: "Task", words: "40–90 words", hint: "State what you were personally responsible for, separate from the wider team.", placeholder: "Example: I was responsible for updating the ventilation coordination mark-ups and reporting risks to the senior engineer..." }, { key: "action", label: "Action", words: "120–240 words", hint: "Explain the specific steps, decisions, checks, coordination or calculations you carried out.", placeholder: "Example: I reviewed the latest architectural drawings, marked up the affected risers, and identified two coordination clashes..." }, { key: "result", label: "Result", words: "50–120 words", hint: "Explain the outcome, decision, deliverable, risk reduction, improvement or feedback received.", placeholder: "Example: The architect amended the layout before the package was issued, avoiding a late site change..." }, { key: "reflection", label: "Reflection", words: "80–160 words", hint: "Explain what you learned and what you would do differently next time.", placeholder: "Example: I learned that a clear issue schedule is more useful than a long email because it makes ownership obvious..." }], example: { heading: "Example · STAR structure (L3 entry on C1 / project delivery)", sections: [{ label: "Situation", text: "On project PRJ-2024-033, the Stage 3 mechanical design package was due in two weeks and the architectural layout had changed, affecting the riser sizes and plantroom access routes." }, { label: "Task", text: "I was responsible for updating the ventilation coordination mark-ups, checking that the revised duct routes still allowed access for maintenance, and reporting any risks to the senior engineer before the design team meeting." }, { label: "Action", text: "I reviewed the latest architectural drawings, marked up the affected risers in Bluebeam, checked duct sizes against the airflow schedule, and identified two locations where the access panels would be blocked by new joinery. I prepared a short issue schedule with screenshots, proposed revised access zones, and talked the architect through the problem before the coordination meeting." }, { label: "Result", text: "The architect amended the joinery layout before the package was issued, avoiding a late site change. My senior engineer accepted the issue schedule as evidence of coordination and asked me to use the same format on the next project." }, { label: "Reflection", text: "I learned that a clear issue schedule is more useful than a long email because it makes ownership and required action obvious. Next time I will raise access and maintenance constraints earlier when layouts are still flexible." }] } },
  { value: "psar", label: "PSAR", explanation: "Best for L4/L5 Evidence demonstrating judgement, complexity, leadership, innovation or strategic decision-making.", prompts: [{ key: "problem", label: "Problem", words: "60–120 words", hint: "Define the complex, unfamiliar, ambiguous or higher-risk problem and its constraints.", placeholder: "Example: The existing electrical incomer had insufficient capacity for a straightforward ASHP solution, and a full upgrade was outside budget..." }, { key: "solution", label: "Solution", words: "100–220 words", hint: "Explain the options considered, technical rationale and why the preferred approach was selected.", placeholder: "Example: I compared ASHP, hybrid and ground-source options and judged ground-source the best route because..." }, { key: "action", label: "Action", words: "100–220 words", hint: "Explain what you led, developed, coordinated, challenged, improved or decided.", placeholder: "Example: I coordinated the geotechnical input, developed the heat pump strategy, and presented the preferred option to the client..." }, { key: "result", label: "Result", words: "50–120 words", hint: "State the impact, including improved decisions, risk reduction, performance or deliverable quality.", placeholder: "Example: The client proceeded without an immediate supply upgrade, giving the design team a clear Stage 4 route..." }, { key: "reflection", label: "Reflection", words: "80–180 words", hint: "Explain what you learned about judgement, leadership, uncertainty, trade-offs or innovation.", placeholder: "Example: The key insight was that the constraint became the design driver, not a barrier. With hindsight I would..." }], example: { heading: "Example · PSAR structure (L4 entry on A2 / CEng track)", sections: [{ label: "Problem", text: "On PRJ-2024-021 (heritage school retrofit), the existing gas boilers were end-of-life and the client wanted to electrify heating, but the existing electrical incomer had insufficient capacity for a straightforward ASHP solution. A full incomer upgrade was expensive and would have pushed the project outside the budget." }, { label: "Solution", text: "I led an option study comparing ASHP with supplementary direct electric, hybrid ASHP/gas, and a ground-source option with lower electrical peak demand. I judged the ground-source option as the best route because it reduced the peak electrical load while supporting the client's decarbonisation brief. I compared whole-life carbon and operational cost over 25 years against the alternatives." }, { label: "Action", text: "I coordinated the geotechnical input, developed the heat pump and buffer vessel strategy, presented the preferred option to the client, and reviewed the associated electrical load assessment with the electrical engineer." }, { label: "Reflection", text: "The key insight was that the constraint became the design driver, not a barrier. With hindsight, I would have started the borehole feasibility work earlier because waiting for the test results delayed Stage 3 sign-off. This entry demonstrates judgement, ownership of an unfamiliar problem, and coordination across disciplines." }] } },
];

const formatBytes = (size?: number) => size === undefined ? "" : size < 1024 ? `${size} B` : size < 1048576 ? `${(size / 1024).toFixed(1)} KB` : `${(size / 1048576).toFixed(1)} MB`;
const levelIndex = (level: CompetencyLevel) => LEVELS.indexOf(level);

export default function CandidateEvidenceSubmissionModal({ entry, primaryCompetencyRef, competency, allCompetencies, candidateId, currentLevel, poc, onClose }: {
  entry: PocEvidence | null;
  primaryCompetencyRef: string;
  competency: CompetencyDefinition;
  allCompetencies: readonly CompetencyDefinition[];
  candidateId: string;
  currentLevel: CompetencyLevel | null;
  poc: PocApi;
  onClose: () => void;
}) {
  const previous = entry?.versions.at(-1) ?? null;
  const primaryRef = entry?.primaryCompetencyRef || primaryCompetencyRef;
  const today = new Date().toISOString().slice(0, 10);
  const defaultMethod: PocEvidenceMethod = currentLevel === "L4" || currentLevel === "L5" ? "psar" : "carr";

  const [title, setTitle] = useState(previous?.title ?? "");
  const [date, setDate] = useState(previous?.date ?? today);
  const [claimedLevel, setClaimedLevel] = useState<CompetencyLevel>(previous?.claimedLevel ?? currentLevel ?? "L1");
  const [projectReference, setProjectReference] = useState(previous?.projectReference ?? "");
  const [projectType, setProjectType] = useState(previous?.projectType ?? "");
  const [ribaStage, setRibaStage] = useState(previous?.ribaStage ?? "not-set");
  const [method, setMethod] = useState<PocEvidenceMethod>(previous?.method ?? defaultMethod);
  const [fields, setFields] = useState<Record<string, string>>(previous?.fields ?? {});
  const [systems, setSystems] = useState<string[]>(previous?.systems ?? []);
  const [selectedRefs, setSelectedRefs] = useState<string[]>(previous?.suggestedCompetencyRefs ?? []);
  const [attachments, setAttachments] = useState<PocEvidenceAttachment[]>(previous?.attachments ?? []);
  const [documentLinks, setDocumentLinks] = useState<PocEvidenceDocumentLink[]>(previous?.documentLinks ?? []);
  const [showExample, setShowExample] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [link, setLink] = useState({ title: "", url: "", reference: "", revision: "", accessNote: "" });
  const [message, setMessage] = useState<string | null>(null);

  const [initialState] = useState(() => JSON.stringify({ title: previous?.title ?? "", date: previous?.date ?? today, claimedLevel: previous?.claimedLevel ?? currentLevel ?? "L1", projectReference: previous?.projectReference ?? "", projectType: previous?.projectType ?? "", ribaStage: previous?.ribaStage ?? "not-set", method: previous?.method ?? defaultMethod, fields: previous?.fields ?? {}, systems: previous?.systems ?? [], selectedRefs: previous?.suggestedCompetencyRefs ?? [], attachments: previous?.attachments ?? [], documentLinks: previous?.documentLinks ?? [] }));

  const selected = METHODS.find((entryMethod) => entryMethod.value === method) ?? METHODS[0];
  const quality = useMemo(() => reviewEvidenceResponse({ method, fields }), [method, fields]);
  const hasNarrative = selected.prompts.some((item) => fields[item.key]?.trim());

  const status = previous?.status ?? "draft";
  const returned = status === "returned";
  // Evidence is only locked once a mentor has verified it — like Development Action
  // responses, a submitted-but-not-yet-reviewed entry stays editable so the candidate can
  // keep refining it while it's awaiting review.
  const locked = status === "verified";

  const titleForModal = !entry ? "Add Evidence" : status === "draft" ? "Edit Evidence Draft" : status === "returned" ? "Revise Evidence" : status === "submitted" ? "Edit Submitted Evidence" : "View Verified Evidence";

  const suggestionInput = useMemo(() => ({ primaryCompetencyRef: primaryRef, title, projectReference, projectType, ribaStage, method, fields, systems }), [primaryRef, title, projectReference, projectType, ribaStage, method, fields, systems]);
  const [suggested, setSuggested] = useState<string[]>([]);
  useEffect(() => {
    const timer = setTimeout(() => {
      setSuggested(suggestEvidenceCompetencies(suggestionInput, allCompetencies, 6).map((item) => item.ref));
    }, 200);
    return () => clearTimeout(timer);
  }, [suggestionInput, allCompetencies]);

  const toggleRef = (ref: string) => {
    if (ref === primaryRef || locked) return;
    setSelectedRefs((current) => current.includes(ref) ? current.filter((item) => item !== ref) : [...current, ref]);
  };

  const dirty = initialState !== JSON.stringify({ title, date, claimedLevel, projectReference, projectType, ribaStage, method, fields, systems, selectedRefs, attachments, documentLinks });
  const requestClose = () => { if (!locked && dirty && !window.confirm("Discard your unsaved Evidence changes?")) return; onClose(); };

  const addFiles = (files: FileList | null) => { if (files) setAttachments((current) => [...current, ...Array.from(files).map((file, index) => ({ id: `local-poc-evidence-file-${Date.now()}-${index}`, kind: "file" as const, name: file.name, detail: file.type || "File", size: file.size }))]); };
  const addLink = () => { if (!link.title.trim() || !link.url.trim()) { setMessage("Enter a document title and URL."); return; } try { new URL(link.url); } catch { setMessage("Enter a valid document URL."); return; } setDocumentLinks((current) => [...current, { id: `local-poc-evidence-link-${Date.now()}`, kind: "link", ...link }]); setLink({ title: "", url: "", reference: "", revision: "", accessNote: "" }); setShowLink(false); setMessage(null); };

  const save = (nextStatus: "draft" | "submitted") => {
    if (!title.trim()) { setMessage("Enter an Evidence title."); return; }
    if (!hasNarrative) { setMessage("Enter at least one Evidence section before saving."); return; }
    if (nextStatus === "submitted") {
      const coreComplete = date.trim() && projectReference.trim() && ["action", "result", "reflection"].every((key) => fields[key]?.trim());
      if (!coreComplete) { setMessage("Complete Date, Project/reference, Action, Result and Reflection before submitting."); return; }
    }
    const now = new Date().toISOString();
    const version: PocEvidenceVersion = {
      id: `local-poc-evidence-version-${Date.now()}`,
      version: (entry?.versions.length ?? 0) + 1,
      status: nextStatus,
      title: title.trim(),
      date,
      claimedLevel,
      projectReference: projectReference.trim(),
      projectType,
      ribaStage,
      method,
      fields,
      systems,
      suggestedCompetencyRefs: selectedRefs.filter((ref) => ref !== primaryRef),
      attachments,
      documentLinks,
      advisoryQualityScore: quality.score,
      savedAt: now,
      submittedAt: nextStatus === "submitted" ? now : null,
    };
    poc.commit((state) => {
      const existing = entry ? state.evidence.find((item) => item.id === entry.id) : undefined;
      if (existing) {
        const nextRecord: PocEvidence = { ...existing, versions: [...existing.versions, version], updatedAt: now };
        return { ...state, evidence: state.evidence.map((item) => item.id === existing.id ? nextRecord : item) };
      }
      const nextRecord: PocEvidence = { id: `local-poc-evidence-${Date.now()}`, source: "local-poc", candidateId, primaryCompetencyRef: primaryRef, versions: [version], updatedAt: now };
      return { ...state, evidence: [...state.evidence, nextRecord] };
    });
    onClose();
  };

  const levelWarning = levelIndex(claimedLevel) > levelIndex(currentLevel ?? "L1")
    ? `The current competency cycle is ${currentLevel ?? "not initialised"}. Only claim ${claimedLevel} where this Evidence genuinely demonstrates that level and is ready for mentor review.`
    : levelIndex(claimedLevel) < levelIndex(currentLevel ?? "L1")
    ? `This Evidence is being logged at a lower demonstrated level than the current competency cycle (${currentLevel}).`
    : null;

  const allRefs = useMemo(() => [...allCompetencies].map((item) => item.reference).sort((a, b) => a.localeCompare(b)), [allCompetencies]);
  const competencyTitle = (ref: string) => allCompetencies.find((item) => item.reference === ref)?.area ?? ref;
  const extraSelected = selectedRefs.filter((ref) => ref !== primaryRef);

  return <Modal title={titleForModal} size="response" onClose={requestClose} footer={locked ? <button type="button" className="btn-ghost" onClick={onClose}>Close</button> : <><button type="button" className="btn-ghost" onClick={requestClose}>Cancel</button><span className="response-footer-status" role="status" aria-live="polite">{message}</span><button type="button" className="btn-secondary" onClick={() => save("draft")}>{returned ? "Save revised draft" : "Save draft"}</button><button type="button" className="btn-primary" onClick={() => save("submitted")}>{returned ? "Resubmit for verification" : "Submit for verification"}</button></>}>
    <div className="action-response-form">
      <div className="action-comment-subtitle">{competency.reference} · {competency.area}</div>

      <section className="action-response-section">
        <h3>Evidence information</h3>
        <div className="action-brief-grid">
          <div className="wide"><span>Evidence title</span><input readOnly={locked} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Review of ventilation option appraisal for a laboratory fit-out" /></div>
          <div><span>Date</span><input readOnly={locked} type="date" value={date} onChange={(event) => setDate(event.target.value)} /></div>
          <div><span>Evidence claim level</span><select disabled={locked} value={claimedLevel} onChange={(event) => setClaimedLevel(event.target.value as CompetencyLevel)}>{LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select></div>
          <div className="wide"><span>Project / reference</span><input readOnly={locked} value={projectReference} onChange={(event) => setProjectReference(event.target.value)} placeholder="PRJ-2026-014 or anonymised project reference" /></div>
          <div><span>Project type</span><input readOnly={locked} value={projectType} onChange={(event) => setProjectType(event.target.value)} placeholder="Commercial office refurbishment" /></div>
          <div><span>RIBA design stage</span><select disabled={locked} value={ribaStage} onChange={(event) => setRibaStage(event.target.value)}><option value="not-set">Not set</option>{EVIDENCE_RIBA_STAGES.map((stage) => <option key={stage} value={stage}>{evidenceRibaStageLabel(stage)}</option>)}</select></div>
        </div>
        {levelWarning ? <p className={`response-guidance${levelIndex(claimedLevel) > levelIndex(currentLevel ?? "L1") ? " evidence-level-warning" : ""}`}>{levelWarning}</p> : null}
      </section>

      <section className="action-response-section">
        <div className="response-section-heading"><h3>Evidence structure</h3><button type="button" className="btn-ghost" aria-expanded={showExample} onClick={() => setShowExample((current) => !current)}>{showExample ? "Hide example" : "Show example"}</button></div>
        <div className="response-method-tabs" role="tablist" aria-label="Evidence structure">{METHODS.map((entryMethod) => <button disabled={locked} type="button" role="tab" aria-selected={method === entryMethod.value} className={method === entryMethod.value ? "active" : ""} onClick={() => setMethod(entryMethod.value)} key={entryMethod.value}>{entryMethod.label}</button>)}</div>
        <p className="response-guidance">{selected.explanation}</p>
        <div className="response-learning-banner">Fill each section separately. The tool compiles the sections into one structured Evidence narrative.</div>
        {showExample ? <aside className="response-worked-example"><strong>{selected.example.heading}</strong>{selected.example.sections.map((section) => <p key={section.label}><b>{section.label}:</b> {section.text}</p>)}</aside> : null}
      </section>

      <section className="action-response-section">
        <h3>Structured Evidence</h3>
        <div className="original-structured-fields">{selected.prompts.map((item) => <label key={item.key}><strong>{item.label} <small>{item.words}</small></strong><em>{item.hint}</em><textarea readOnly={locked} placeholder={item.placeholder} rows={4} value={fields[item.key] ?? ""} onChange={(event) => setFields((current) => ({ ...current, [item.key]: event.target.value }))} /></label>)}</div>
      </section>

      <section className="quality-reviewer">
        <div><h3>Writing quality reviewer</h3>{hasNarrative ? <strong className={`quality-label quality-${quality.score}`}>{quality.label}</strong> : null}</div>
        {hasNarrative ? <><ul>{quality.checks.map((check) => <li className={check.state} key={check.id}><span aria-hidden="true">{check.state === "met" ? "✓" : "!"}</span>{check.label}</li>)}</ul><small>{quality.wordCount} words in the active Evidence structure.</small></> : <p>Start writing to receive structured feedback.</p>}
        <p>This is writing guidance only. Your mentor makes the final verification decision.</p>
      </section>

      <section className="action-response-section">
        <div className="evidence-suggestion-head"><h3>Suggested linked competencies</h3><span className="evidence-suggestion-count">{suggested.length ? `${suggested.length} found` : "None yet"}</span></div>
        <p className="response-guidance">The primary competency <strong>{primaryRef}</strong> is fixed in black. Suggested cross-links are advisory; select any relevant ones and they turn coral.</p>
        <div className="evidence-suggestion-row">{suggested.length ? suggested.map((ref) => <button key={ref} type="button" disabled={locked} aria-pressed={selectedRefs.includes(ref)} title={competencyTitle(ref)} className={`evidence-competency-chip${selectedRefs.includes(ref) ? " selected" : " suggested"}`} onClick={() => toggleRef(ref)}>{ref}</button>) : <span className="evidence-suggestion-empty">Start writing the Evidence and suggested cross-links will appear here.</span>}</div>
        <p className="evidence-cross-link-summary">{extraSelected.length ? <>Selected cross-links: <strong>{extraSelected.join(", ")}</strong></> : "No additional linked competencies selected."}</p>

        <h4 className="evidence-also-heading">Also evidences — cross-link to other competencies</h4>
        <div className="evidence-competency-grid" role="group" aria-label="Cross-link to other competencies">{allRefs.map((ref) => {
          const isPrimary = ref === primaryRef;
          const isSelected = selectedRefs.includes(ref);
          const isSuggested = !isSelected && suggested.includes(ref);
          return <button key={ref} type="button" disabled={isPrimary || locked} aria-pressed={isPrimary || isSelected} title={competencyTitle(ref)} className={`evidence-competency-chip${isPrimary ? " primary" : isSelected ? " selected" : isSuggested ? " suggested" : ""}`} onClick={() => toggleRef(ref)}>{ref}</button>;
        })}</div>
      </section>

      <section className="action-response-section">
        <h3>Technical coverage</h3>
        <div className="evidence-systems-grid">{TECHNICAL_SYSTEMS.map((system) => <button key={system} type="button" disabled={locked} aria-pressed={systems.includes(system)} className={`evidence-system-chip${systems.includes(system) ? " active" : ""}`} onClick={() => setSystems((current) => current.includes(system) ? current.filter((item) => item !== system) : [...current, system])}>{TECHNICAL_SYSTEM_LABELS[system]}</button>)}</div>
      </section>

      <section className="action-response-section">
        <h3>Supporting files</h3>
        {!locked ? <div className="supporting-file-actions"><label className="btn-secondary">Upload files<input type="file" multiple onChange={(event) => addFiles(event.target.files)} /></label><button type="button" className="btn-secondary" onClick={() => setShowLink((current) => !current)}>Add document link</button></div> : null}
        {showLink && !locked ? <div className="response-document-link-form"><label>Title<input value={link.title} onChange={(event) => setLink({ ...link, title: event.target.value })} /></label><label>URL<input type="url" value={link.url} onChange={(event) => setLink({ ...link, url: event.target.value })} /></label><label>Reference<input value={link.reference} onChange={(event) => setLink({ ...link, reference: event.target.value })} /></label><label>Revision<input value={link.revision} onChange={(event) => setLink({ ...link, revision: event.target.value })} /></label><label className="wide">Access note<input value={link.accessNote} onChange={(event) => setLink({ ...link, accessNote: event.target.value })} /></label><button type="button" className="btn-primary" onClick={addLink}>Add link</button></div> : null}
        <div className="response-attachment-list">
          {attachments.map((item) => <div key={item.id}><span><b>{item.name}</b><small>{item.detail} · {formatBytes(item.size)}</small></span>{!locked ? <button type="button" className="btn-ghost" onClick={() => setAttachments((current) => current.filter((entryItem) => entryItem.id !== item.id))}>Remove</button> : null}</div>)}
          {documentLinks.map((item) => <div key={item.id}><span><b>{item.title}</b><small>{item.reference || "Document link"}{item.revision ? ` · ${item.revision}` : ""}</small></span><a className="btn-ghost" href={item.url} target="_blank" rel="noreferrer">Open</a>{!locked ? <button type="button" className="btn-ghost" onClick={() => setDocumentLinks((current) => current.filter((entryItem) => entryItem.id !== item.id))}>Remove</button> : null}</div>)}
        </div>
        <p className="response-guidance">Selected file metadata is stored locally. File contents are not retained after refresh.</p>
      </section>
    </div>
  </Modal>;
}
