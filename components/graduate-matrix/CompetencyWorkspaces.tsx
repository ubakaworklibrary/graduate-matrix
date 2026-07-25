"use client";

import { isValidElement, useEffect, useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { archiveAction, createDevelopmentAction, markActionComplete, recordEvidenceVerification } from "@/app/portfolio-actions";
import { STANDARD_DEVELOPMENT_TASKS } from "@/lib/graduate-matrix/data/standard-tasks";
import type { MentorWorkflowView } from "@/lib/graduate-matrix/mappers/mentor-workflow";
import type { CompetencyDefinition, CompetencyLevel, DevelopmentAction, DevelopmentActionOwner, DevelopmentActionPriority, EvidenceActionLink, EvidenceEntry } from "@/types/graduate-matrix";
import Modal from "./Modal";
import CandidateActionResponseModal, { MentorResponseSummary } from "./CandidateActionResponseModal";
import CandidateEvidenceSubmissionModal from "./CandidateEvidenceSubmissionModal";
import MentorActionResponseReviewModal from "./MentorActionResponseReviewModal";
import MentorEvidenceReviewModal from "./MentorEvidenceReviewModal";
import { RIBA_STAGES, ribaStageLabel } from "./useMatrixPoc";
import type { PocAction, PocEvidence, PocRibaStage, useMatrixPoc } from "./useMatrixPoc";

const LEVELS: readonly CompetencyLevel[] = ["L1", "L2", "L3", "L4", "L5"];
const label = (value: string | undefined) => value?.replaceAll("-", " ") ?? "draft";
type PocApi = ReturnType<typeof useMatrixPoc>;
const isPocAction = (action: DevelopmentAction | PocAction): action is PocAction => "source" in action && action.source === "local-poc";
const isPocEvidence = (entry: EvidenceEntry | PocEvidence): entry is PocEvidence => "source" in entry && entry.source === "local-poc";

function usePersistedDisclosure(key: string) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(key);
      // Hydrate browser-only preference after the server-safe default render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "true" || stored === "false") setOpen(stored === "true");
    } catch {}
  }, [key]);
  const change = (next: boolean) => { setOpen(next); try { window.localStorage.setItem(key, String(next)); } catch {} };
  return [open, change] as const;
}

function CompetencyRecordSection({ title, summary, open, onOpenChange, children }: { title: string; summary: string; open: boolean; onOpenChange: (open: boolean) => void; children: React.ReactNode }) {
  return <details className="candidate-progression-position competency-record-section" open={open} onToggle={(event) => onOpenChange(event.currentTarget.open)}><summary><span className="candidate-progression-heading"><strong>{title}</strong><small>{summary}</small></span></summary><div className="competency-record-body">{children}</div></details>;
}

const TableShell = ({ children }: { children: React.ReactNode }) => {
  const className = isValidElement<{ className?: string }>(children) ? children.props.className : undefined;
  const kind = className?.includes("action-table") ? " action-table-shell" : className?.includes("evidence-table") ? " evidence-table-shell" : "";
  return <div className={`dashboard-table-wrap competency-table-shell${kind}`}>{children}<div className="competency-table-bottom-space" aria-hidden="true" /></div>;
};
const SectionToolbar = ({ children }: { children: React.ReactNode }) => <div className="competency-record-toolbar">{children}</div>;

export function DevelopmentActionsWorkspace({ actions, evidence, actionLinks, candidateId, competency, currentLevel, item, previewRole, canUseServerMentorActions, poc }: { actions: DevelopmentAction[]; evidence: EvidenceEntry[]; actionLinks: EvidenceActionLink[]; candidateId: string; competency: CompetencyDefinition; currentLevel: CompetencyLevel | null; item: MentorWorkflowView["competencies"][number] | null; previewRole: "candidate" | "mentor"; canUseServerMentorActions: boolean; poc: PocApi }) {
  const [open, setOpen] = usePersistedDisclosure("graduate-matrix-actions-expanded");
  const [manageOpen, setManageOpen] = useState(false);
  const [responsePickerOpen, setResponsePickerOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<DevelopmentAction | PocAction | null>(null);
  const [reviewAction, setReviewAction] = useState<DevelopmentAction | PocAction | null>(null);
  const isMentor = previewRole === "mentor";
  const local = poc.state.actions.filter((action) => action.candidateId === candidateId && action.competencyRef === competency.reference);
  const real = [...actions].filter((action) => !action.archivedAt);
  const visible = [...local, ...real].sort((a, b) => a.status.localeCompare(b.status) || (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
  const today = new Date().toISOString().slice(0, 10);
  const openCount = visible.filter((action) => !["completed", "closed"].includes(action.status)).length;
  const overdueCount = visible.filter((action) => action.dueDate && action.dueDate < today && !["completed", "closed"].includes(action.status)).length;
  const responseActions = visible.filter((action) => ["open", "returned-for-revision"].includes(action.status));

  return <>
    <CompetencyRecordSection title="Development actions" summary={`${openCount} open · ${overdueCount} overdue · ${visible.length} total`} open={open} onOpenChange={setOpen}>
      <SectionToolbar>{isMentor ? <button type="button" className="btn-secondary" onClick={() => setManageOpen(true)}>+ Assign action</button> : responseActions.length ? <button type="button" className="btn-primary" onClick={() => setResponsePickerOpen(true)}>Add response</button> : visible.length ? <button type="button" className="btn-secondary" onClick={() => setResponsePickerOpen(true)}>View actions</button> : null}</SectionToolbar>
      {visible.length ? <TableShell><table className="competency-record-table action-table"><thead><tr><th>Action</th><th>Owner</th><th>Due date</th><th>Priority</th><th>Status</th><th>Linked evidence</th><th>Controls</th></tr></thead><tbody>{visible.map((action) => {
        const isLocal = isPocAction(action);
        const latestResponse = poc.state.responses.find((entry) => entry.actionId === action.id)?.versions.at(-1);
        const latestReview = latestResponse ? poc.state.responseReviews.find((entry) => entry.responseVersionId === latestResponse.id) : undefined;
        const candidateControl = latestReview?.outcome === "accepted" ? "View response" : latestResponse?.status === "returned" || action.status === "returned-for-revision" ? "Revise response" : latestResponse ? "Update response" : "Respond";
        const linkedCount = isLocal ? action.linkedEvidenceIds.length : evidence.filter((entry) => actionLinks.some((link) => link.developmentActionId === action.id && link.evidenceId === entry.id)).length;
        const overdue = Boolean(action.dueDate && action.dueDate < today && !["completed", "closed"].includes(action.status));
        const tone = action.status === "completed" ? "complete" : action.status === "submitted" ? "awaiting" : action.status === "returned-for-revision" || overdue ? "warning" : action.status === "closed" ? "muted" : "neutral";
        const isTerminal = ["completed", "closed"].includes(action.status);
        const mentorControlLabel = isTerminal ? "View action history" : latestReview ? (latestResponse?.status === "returned" ? "View returned response" : "View review") : "Review action";
        const mentorControlClass = isTerminal || latestReview ? "btn-ghost" : "btn-secondary";
        return <tr className={`record-row tone-${tone}`} key={action.id}><td><strong>{action.title}</strong><span>{isLocal ? action.description : action.notes || "No supporting detail recorded."}</span>{isLocal ? <small className="poc-badge">Local POC</small> : null}{isMentor&&!latestResponse?<small>Awaiting candidate response</small>:isMentor&&latestResponse?.status==="draft"?<small>Candidate draft — not submitted</small>:isMentor&&latestResponse?.status==="returned"?<small>Awaiting candidate revision</small>:null}</td><td>{label(action.owner)}</td><td>{action.dueDate || "—"}{overdue ? <span className="record-inline-warning">Overdue</span> : null}</td><td><span className={`record-chip priority-${action.priority}`}>{action.priority}</span></td><td><StatusChip tone={tone} text={label(action.status)} complete={action.status === "completed"} /></td><td>{linkedCount || "None"}</td><td><div className="record-controls">{isMentor ? <button type="button" className={mentorControlClass} onClick={() => setReviewAction(action)}>{mentorControlLabel}</button> : <button type="button" className={candidateControl === "View response" ? "btn-ghost" : "btn-secondary"} onClick={() => setSelectedAction(action)}>{candidateControl}</button>}</div></td></tr>;
      })}</tbody></table></TableShell> : <WorkspaceEmpty text={isMentor ? "No development actions are assigned to this competency." : "No current development actions are assigned to this competency."} action={isMentor ? <button type="button" className="btn-secondary" onClick={() => setManageOpen(true)}>+ Assign action</button> : null} />}
    </CompetencyRecordSection>
    {manageOpen ? <AssignActionModal competency={competency} candidateId={candidateId} currentLevel={currentLevel} item={item} canUseServerMentorActions={canUseServerMentorActions} poc={poc} onClose={() => setManageOpen(false)} /> : null}
    {responsePickerOpen ? <ActionResponsePicker actions={responseActions.length ? responseActions : visible} onSelect={(action) => { setResponsePickerOpen(false); setSelectedAction(action); }} onClose={() => setResponsePickerOpen(false)} /> : null}
    {selectedAction ? <CandidateActionResponseModal action={selectedAction} competency={competency} candidateId={candidateId} currentLevel={currentLevel} poc={poc} onClose={() => setSelectedAction(null)}/> : null}
    {reviewAction ? <MentorActionResponseReviewModal action={reviewAction} competency={competency} currentLevel={currentLevel} candidateId={candidateId} canUseServerMentorActions={canUseServerMentorActions} poc={poc} onClose={()=>setReviewAction(null)}/> : null}
  </>;
}

function ActionResponsePicker({ actions, onSelect, onClose }: { actions: (DevelopmentAction | PocAction)[]; onSelect: (action: DevelopmentAction | PocAction) => void; onClose: () => void }) {
  return <Modal title="Add response · Choose an action" size="lg" onClose={onClose} footer={<button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>}><p className="record-empty-copy">Choose the development action you want to respond to or update.</p><div className="response-action-list">{actions.map((action) => <div key={action.id}><span><strong>{action.title}</strong><small>{label(action.status)}{action.dueDate ? ` · Due ${action.dueDate}` : ""}</small></span><button type="button" className="btn-primary" onClick={() => onSelect(action)}>{action.status === "returned-for-revision" ? "Revise response" : "Respond"}</button></div>)}</div></Modal>;
}

function AssignActionModal({ competency, candidateId, currentLevel, item, canUseServerMentorActions, poc, onClose }: { competency: CompetencyDefinition; candidateId: string; currentLevel: CompetencyLevel | null; item: MentorWorkflowView["competencies"][number] | null; canUseServerMentorActions: boolean; poc: PocApi; onClose: () => void }) {
  const [tab, setTab] = useState<"templates" | "custom">("templates");
  const [selected, setSelected] = useState<string[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [discipline, setDiscipline] = useState<string>("all");
  const [taskType, setTaskType] = useState<string>("all");
  const [owner, setOwner] = useState<DevelopmentActionOwner>("graduate");
  const [priority, setPriority] = useState<DevelopmentActionPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [ribaStage, setRibaStage] = useState<PocRibaStage | "">("");
  const recommended = useMemo(() => STANDARD_DEVELOPMENT_TASKS.filter((task) => (task.competencyReferences as readonly string[]).includes(competency.reference) && (levelFilter === "all" || task.suggestedLevel === levelFilter) && (discipline === "all" || task.discipline === discipline) && (taskType === "all" || task.type === taskType)), [competency.reference, levelFilter, discipline, taskType]);
  const assignSelected = () => {
    const now = new Date().toISOString();
    poc.commit((state) => {
      const chosen = STANDARD_DEVELOPMENT_TASKS.filter((task) => selected.includes(task.id));
      const existing = new Set(state.actions.filter((action) => action.candidateId === candidateId && action.competencyRef === competency.reference).map((action) => action.templateId));
      const additions: PocAction[] = chosen.filter((task) => !existing.has(task.id)).map((task, index) => ({ id: `local-poc-action-${Date.now()}-${index}`, source: "local-poc", templateId: task.id, candidateId, competencyRef: competency.reference, cycleLevel: currentLevel, title: task.title, description: task.successCriteria, expectedEvidence: task.deliverable, owner, priority, dueDate: dueDate || null, status: "open", candidateResponse: "", linkedEvidenceIds: [], ribaStage: ribaStage || null, createdAt: now, updatedAt: now }));
      return { ...state, actions: [...state.actions, ...additions] };
    });
    onClose();
  };
  return <Modal title={`Assign action · ${competency.reference} — ${competency.objective}`} size="xl" onClose={onClose} footer={tab === "templates" ? <><span className="modal-selection-count">{selected.length} action{selected.length === 1 ? "" : "s"} selected</span><button type="button" className="btn-primary" disabled={!selected.length} onClick={assignSelected}>Assign selected actions</button></> : <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>}>
    <div className="record-tabs" role="tablist" aria-label="Action assignment method"><button type="button" role="tab" aria-selected={tab === "templates"} className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>Recommended templates</button><button type="button" role="tab" aria-selected={tab === "custom"} className={tab === "custom" ? "active" : ""} onClick={() => setTab("custom")}>Custom action</button></div>
    {tab === "templates" ? <><div className="template-filters"><label>Level<select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)}><option value="all">All levels</option>{LEVELS.map((level) => <option key={level}>{level}</option>)}</select></label><label>Discipline<select value={discipline} onChange={(event) => setDiscipline(event.target.value)}><option value="all">All disciplines</option>{["general","mechanical","electrical","sustainability","site","digital"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label><label>Task type<select value={taskType} onChange={(event) => setTaskType(event.target.value)}><option value="all">All types</option>{["core","discipline","project","gap","site"].map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label><button type="button" className="btn-ghost" onClick={() => { setLevelFilter("all"); setDiscipline("all"); setTaskType("all"); }}>Reset filters</button></div><div className="template-shared-defaults"><label>Owner<select value={owner} onChange={(event) => setOwner(event.target.value as DevelopmentActionOwner)}><option value="graduate">Candidate</option><option value="mentor">Mentor</option><option value="shared">Shared</option></select></label><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as DevelopmentActionPriority)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label><label>RIBA Design Stage<select value={ribaStage} onChange={(event) => setRibaStage(event.target.value as PocRibaStage | "")}><option value="">Not set</option>{RIBA_STAGES.map((stage) => <option key={stage} value={stage}>{ribaStageLabel(stage)}</option>)}</select></label></div><div className="template-card-list">{recommended.map((task) => <label className={`template-card${selected.includes(task.id) ? " selected" : ""}`} key={task.id}><input type="checkbox" checked={selected.includes(task.id)} onChange={() => setSelected((current) => current.includes(task.id) ? current.filter((id) => id !== task.id) : [...current, task.id])}/><span><strong>{task.title}</strong><small>{task.id} · {competency.reference} · {task.suggestedLevel} · {label(task.type)} · {label(task.discipline)}</small><p>{task.successCriteria}</p><dl><div><dt>Typical evidence</dt><dd>{task.deliverable}</dd></div><div><dt>Timeframe</dt><dd>{task.duePeriod}</dd></div><div><dt>Default owner</dt><dd>{task.owner}</dd></div></dl></span></label>)}</div></> : canUseServerMentorActions && item?.activeCycleId ? <form action={createDevelopmentAction} className="action-manage-form"><p>This custom action will be saved to the authoritative active assessment cycle.</p><input type="hidden" name="candidateId" value={candidateId}/><input type="hidden" name="candidateCompetencyId" value={item.candidateCompetencyId}/><input type="hidden" name="expectedCycleId" value={item.activeCycleId}/><label>Action title<input name="title" required /></label><div><label>Owner<select name="owner" defaultValue="graduate"><option value="graduate">Candidate</option><option value="mentor">Mentor</option><option value="shared">Shared</option></select></label><label>Priority<select name="priority" defaultValue="medium"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Due date<input type="date" name="dueDate" /></label></div><label>Description / expected evidence<textarea name="notes" required /></label><button className="btn-primary">Add custom action</button></form> : <p className="record-empty-copy">Custom production actions are unavailable in preview because this account is not authorised for mentor writes. Recommended templates remain available through clearly marked local POC data.</p>}
  </Modal>;
}

// Retained temporarily for migration comparison; no longer mounted by the action workflow.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ActionDetailModal({ action, evidence, actionLinks, candidateId, canUseServerMentorActions, poc, onClose }: { action: DevelopmentAction | PocAction; evidence: EvidenceEntry[]; actionLinks: EvidenceActionLink[]; candidateId: string; isMentor: boolean; canUseServerMentorActions: boolean; poc: PocApi; onClose: () => void }) {
  const isLocal = isPocAction(action);
  const linkedEvidence = isLocal ? action.linkedEvidenceIds.length : evidence.filter((entry) => actionLinks.some((link) => link.developmentActionId === action.id && link.evidenceId === entry.id)).length;
  const response = poc.state.responses.find((entry) => entry.actionId === action.id);
  const latest = response?.versions.at(-1);
  const reviewLocal = (status: "returned" | "submitted") => { if (!response || !latest) return; const now = new Date().toISOString(); poc.commit((state) => ({ ...state, responses: state.responses.map((entry) => entry.id === response.id ? { ...entry, versions: [...entry.versions, { ...latest, id: `local-poc-response-version-${Date.now()}`, version: entry.versions.length + 1, status, savedAt: now }], updatedAt: now } : entry), actions: state.actions.map((entry) => entry.id === action.id ? { ...entry, status: status === "returned" ? "returned-for-revision" : "submitted", updatedAt: now } : entry) })); onClose(); };
  return <Modal title={`Development action · ${action.title}`} size="lg" onClose={onClose} footer={<button type="button" className="btn-ghost" onClick={onClose}>Close</button>}><div className="record-detail"><div><span>Owner</span><strong>{label(action.owner)}</strong></div><div><span>Priority</span><strong>{label(action.priority)}</strong></div><div><span>Due date</span><strong>{action.dueDate || "Not set"}</strong></div><div><span>Status</span><strong>{label(action.status)}</strong></div></div><section className="record-detail-copy"><strong>Action / success criteria</strong><p>{isLocal ? action.description : action.notes || "No supporting detail recorded."}</p></section>{response ? <MentorResponseSummary response={response}/> : <p className="record-empty-copy">No structured candidate response has been submitted.</p>}<p className="record-empty-copy">{linkedEvidence} supporting evidence record{linkedEvidence === 1 ? "" : "s"} linked.</p>{latest?.status === "submitted" ? <div className="record-modal-actions"><button type="button" className="btn-secondary" onClick={() => reviewLocal("returned")}>Return for revision</button></div> : null}{isLocal ? <button type="button" className="btn-primary" onClick={() => { poc.commit((state) => ({ ...state, actions: state.actions.map((entry) => entry.id === action.id ? { ...entry, status: "completed", updatedAt: new Date().toISOString() } : entry) })); onClose(); }}>Complete action</button> : canUseServerMentorActions ? <div className="record-modal-actions"><form action={markActionComplete}><input type="hidden" name="candidateId" value={candidateId}/><input type="hidden" name="actionId" value={action.id}/><button className="btn-primary">Mark complete</button></form><form action={archiveAction}><input type="hidden" name="candidateId" value={candidateId}/><input type="hidden" name="actionId" value={action.id}/><input type="hidden" name="reason" value="Removed from the active action plan by the mentor."/><button className="btn-danger">Delete</button></form></div> : null}</Modal>;
}

export function EvidenceWorkspace({ evidence, candidateId, competency, allCompetencies, previewRole, canUseServerMentorActions, selectedLevel, onLevel, currentLevel, assessmentStatus, nextAction, poc }: { evidence: EvidenceEntry[]; candidateId: string; competency: CompetencyDefinition; allCompetencies: readonly CompetencyDefinition[]; previewRole: "candidate" | "mentor"; canUseServerMentorActions: boolean; selectedLevel: CompetencyLevel; onLevel: (level: CompetencyLevel) => void; currentLevel: CompetencyLevel | null; assessmentStatus: string; nextAction?: string | null; poc: PocApi }) {
  const [open, setOpen] = usePersistedDisclosure("graduate-matrix-evidence-expanded");
  const [selectedEvidence, setSelectedEvidence] = useState<EvidenceEntry | PocEvidence | null>(null);
  const [submissionEntry, setSubmissionEntry] = useState<PocEvidence | "new" | null>(null);
  const isMentor = previewRole === "mentor";
  const local = poc.state.evidence.filter((entry) => entry.candidateId === candidateId && entry.primaryCompetencyRef === competency.reference);
  const localLatest = (entry: PocEvidence) => entry.versions.at(-1) ?? null;
  const all: (EvidenceEntry | PocEvidence)[] = [...local, ...evidence];
  const claimLevelOf = (entry: EvidenceEntry | PocEvidence) => isPocEvidence(entry) ? localLatest(entry)?.claimedLevel : entry.claimedLevel;
  const statusOf = (entry: EvidenceEntry | PocEvidence) => isPocEvidence(entry) ? (localLatest(entry)?.status ?? "draft") : entry.verificationStatus;
  const displayed = all.filter((entry) => claimLevelOf(entry) === selectedLevel);
  const verified = all.filter((entry) => statusOf(entry) === "verified").length;
  const awaiting = all.filter((entry) => statusOf(entry) === "submitted" || statusOf(entry) === "unverified");
  const returnedCount = all.filter((entry) => statusOf(entry) === "returned" || statusOf(entry) === "reverification-required").length;
  const returnedEvidence = local.find((entry) => localLatest(entry)?.status === "returned");
  return <>
    <CompetencyRecordSection title="Evidence" summary={`${all.length} total · ${awaiting.length} awaiting review · ${returnedCount} returned · ${verified} verified`} open={open} onOpenChange={setOpen}>
      <SectionToolbar>{isMentor ? awaiting.length ? <button type="button" className="btn-secondary" onClick={() => setSelectedEvidence(awaiting[0])}>Review evidence</button> : all.length ? <button type="button" className="btn-secondary" onClick={() => setSelectedEvidence(all[0])}>View evidence</button> : null : <>{returnedEvidence ? <button type="button" className="btn-primary" onClick={() => setSubmissionEntry(returnedEvidence)}>Update returned evidence</button> : null}<button type="button" className="btn-secondary" onClick={() => setSubmissionEntry("new")}>+ Add evidence</button></>}</SectionToolbar>
      <div className="competency-level-filter" aria-label="Evidence claim level">{LEVELS.map((level) => <button type="button" className={selectedLevel === level ? "active" : ""} onClick={() => onLevel(level)} key={level}>{level}<span>{all.filter((entry) => claimLevelOf(entry) === level).length}</span></button>)}</div>
      {displayed.length ? <TableShell><table className="competency-record-table evidence-table"><thead><tr><th>Evidence</th><th>Claim level</th><th>Project / reference</th><th>Date</th><th>Status</th><th>Controls</th></tr></thead><tbody>{displayed.map((entry) => {
        const isLocal = isPocEvidence(entry);
        const latest = isLocal ? localLatest(entry) : null;
        const status = statusOf(entry);
        const title = isLocal ? (latest?.title || "Untitled evidence") : (entry.title || "Untitled evidence");
        const summaryText = isLocal ? (latest ? Object.values(latest.fields).find((value) => value?.trim()) || "No narrative recorded." : "No narrative recorded.") : (entry.description || "No description recorded.");
        const projectReference = isLocal ? latest?.projectReference : entry.projectReference;
        const date = isLocal ? latest?.date : entry.date;
        const tone = status === "verified" ? "complete" : status === "returned" || status === "reverification-required" ? "warning" : status === "submitted" || status === "unverified" ? "awaiting" : "neutral";
        const rowLabel = isMentor
          ? (status === "draft" ? "Awaiting candidate submission" : status === "submitted" || status === "unverified" ? "Review Evidence" : status === "returned" || status === "reverification-required" ? "View returned Evidence" : "View verified Evidence")
          : isLocal ? (latest?.status === "draft" ? "Edit draft" : latest?.status === "returned" ? "Revise Evidence" : latest?.status === "submitted" ? "Edit submitted Evidence" : "View verified Evidence") : "Open";
        const onOpen = isMentor ? () => setSelectedEvidence(entry) : isLocal ? () => setSubmissionEntry(entry) : () => setSelectedEvidence(entry);
        const canOpen = !(isMentor && status === "draft");
        return <tr className={`record-row tone-${tone}`} key={entry.id}><td><strong>{title}</strong><span>{summaryText}</span>{isLocal ? <small className="poc-badge">Local POC</small> : null}</td><td><span className="level-pill" data-level={claimLevelOf(entry)}>{claimLevelOf(entry)}</span></td><td>{projectReference || "—"}</td><td>{date || "—"}</td><td><StatusChip tone={tone} text={label(status)} complete={status === "verified"}/></td><td>{canOpen ? <button type="button" className="btn-ghost" onClick={onOpen}>{rowLabel}</button> : <span className="record-inline-note">{rowLabel}</span>}</td></tr>;
      })}</tbody></table></TableShell> : <WorkspaceEmpty text={`No ${selectedLevel} evidence is linked to this competency yet.`}/>}<p className="competency-record-note">Current mentor-assessed level: {currentLevel ?? "Not initialized"} · Assessment status: {label(assessmentStatus)}{nextAction ? ` · Next action: ${nextAction}` : ""}</p>
    </CompetencyRecordSection>
    {submissionEntry ? <CandidateEvidenceSubmissionModal entry={submissionEntry === "new" ? null : submissionEntry} primaryCompetencyRef={competency.reference} competency={competency} allCompetencies={allCompetencies} candidateId={candidateId} currentLevel={currentLevel} poc={poc} onClose={() => setSubmissionEntry(null)} /> : null}
    {selectedEvidence ? (isMentor ? <MentorEvidenceReviewModal entry={selectedEvidence} competency={competency} allCompetencies={allCompetencies} candidateId={candidateId} canUseServerMentorActions={canUseServerMentorActions} poc={poc} onClose={() => setSelectedEvidence(null)} /> : <EvidenceDetailModal entry={selectedEvidence} candidateId={candidateId} isMentor={isMentor} canUseServerMentorActions={canUseServerMentorActions} poc={poc} onClose={() => setSelectedEvidence(null)}/>) : null}
  </>;
}

function EvidenceDetailModal({ entry, candidateId, isMentor, canUseServerMentorActions, poc, onClose }: { entry: EvidenceEntry | PocEvidence; candidateId: string; isMentor: boolean; canUseServerMentorActions: boolean; poc: PocApi; onClose: () => void }) {
  const isLocal = isPocEvidence(entry);
  const latest = isLocal ? entry.versions.at(-1) ?? null : null;
  const status = isLocal ? (latest?.status ?? "draft") : entry.verificationStatus;
  const title = isLocal ? (latest?.title || "Untitled evidence") : (entry.title || "Untitled evidence");
  const claimedLevel = isLocal ? latest?.claimedLevel : entry.claimedLevel;
  const projectReference = isLocal ? latest?.projectReference : entry.projectReference;
  const date = isLocal ? latest?.date : entry.date;
  const description = isLocal ? (latest ? Object.entries(latest.fields).filter(([, value]) => value?.trim()).map(([, value]) => value).join("\n\n") : "") : entry.description;
  const updateLocal = (next: "returned" | "verified") => {
    if (!isLocal || !latest) return;
    const now = new Date().toISOString();
    poc.commit((state) => ({ ...state, evidence: state.evidence.map((item) => item.id === entry.id ? { ...item, versions: [...item.versions, { ...latest, id: `local-poc-evidence-version-${Date.now()}`, version: item.versions.length + 1, status: next, savedAt: now }], updatedAt: now } : item) }));
    onClose();
  };
  return <Modal title={`Evidence · ${title}`} size="lg" onClose={onClose} footer={<button type="button" className="btn-ghost" onClick={onClose}>Close</button>}><div className="record-detail"><div><span>Claim level</span><strong>{claimedLevel || "—"}</strong></div><div><span>Project / reference</span><strong>{projectReference || "—"}</strong></div><div><span>Date</span><strong>{date || "—"}</strong></div><div><span>Status</span><strong>{label(status)}</strong></div></div><section className="record-detail-copy"><strong>Narrative</strong><p>{description || "No narrative recorded."}</p></section>{isLocal && isMentor ? <div className="record-modal-actions"><button type="button" className="btn-secondary" onClick={() => updateLocal("returned")}>Return for revision</button><button type="button" className="btn-primary" onClick={() => updateLocal("verified")}>Verify evidence</button></div> : null}{!isLocal && isMentor && canUseServerMentorActions ? <form action={recordEvidenceVerification} className="record-review-form"><input type="hidden" name="candidateId" value={candidateId}/><input type="hidden" name="evidenceId" value={entry.id}/><label>Decision<select name="outcome" defaultValue={entry.verificationStatus === "verified" ? "reverification-required" : "verified"}><option value="verified">Verify</option><option value="reverification-required">Return for revision</option></select></label><label>Reason (optional)<input name="reason"/></label><button className="btn-primary">Record decision</button></form> : null}</Modal>;
}

function StatusChip({ tone, text, complete = false }: { tone: string; text: string; complete?: boolean }) { return <span className={`record-chip tone-${tone}`}>{complete ? <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5"/> : null}<span>{text}</span></span>; }
function WorkspaceEmpty({ text, action }: { text: string; action?: React.ReactNode }) { return <div className="competency-workspace-empty"><p>{text}</p>{action}</div>; }
