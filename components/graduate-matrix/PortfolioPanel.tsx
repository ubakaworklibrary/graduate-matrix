"use client";

import { Fragment, useMemo, useState } from "react";
import {
  archiveAction,
  markActionComplete,
  recordEvidenceVerification,
  reopenAction,
  submitEvidenceResponse,
} from "@/app/portfolio-actions";
import { COMPETENCY_DEFINITIONS } from "@/lib/graduate-matrix/data/competencies";
import {
  getCompetencyLinksForEvidence,
  getFrameworkEvidenceSummary,
} from "@/lib/graduate-matrix/evidence";
import {
  getActionsForEvidence,
  getCurrentDevelopmentActions,
  getDevelopmentActionSummary,
  getEvidenceForAction,
} from "@/lib/graduate-matrix/development-actions";
import type { MentorWorkflowView } from "@/lib/graduate-matrix/mappers/mentor-workflow";
import type {
  CandidateInfo,
  DevelopmentAction,
  EvidenceActionLink,
  EvidenceCompetencyLink,
  EvidenceEntry,
  EvidenceVerificationEvent,
  IsoDate,
  PlacementDiscipline,
  PlacementsViewModel,
} from "@/types/graduate-matrix";
import MatrixPanel, { MatrixNavigationControls, type CandidateMatrixView, type MatrixDisplayMode } from "./MatrixPanel";
import type { CandidateBaselineView } from "./BaselinePanel";
import PlacementsPanel from "./PlacementsPanel";

export type PortfolioViewState = "loaded" | "error" | "integrity-error";
export type PortfolioRole = "mentor" | "candidate";

export interface CandidatePortfolioView {
  state: PortfolioViewState;
  evidence: EvidenceEntry[];
  competencyLinks: EvidenceCompetencyLink[];
  actions: DevelopmentAction[];
  actionLinks: EvidenceActionLink[];
  verificationEvents: EvidenceVerificationEvent[];
  today: IsoDate;
}

interface PortfolioPanelProps {
  portfolio: CandidatePortfolioView;
  matrix: CandidateMatrixView;
  candidate: CandidateInfo;
  baseline: CandidateBaselineView | null;
  mentorWorkflow: MentorWorkflowView | null;
  role: PortfolioRole;
  candidateId: string;
  initialTab?: PortfolioTab;
  placementsViewModel: PlacementsViewModel | null;
  initialPlacementDiscipline: PlacementDiscipline | null;
}

export type PortfolioTab = "matrix" | "evidence" | "actions" | "placements" | "project";
type EvidenceFilter = "all" | "needs-review" | "verified" | "action-linked";
type ActionFilter = "all" | "active" | "submitted" | "overdue" | "complete";
const LEVELS = ["L1", "L2", "L3", "L4", "L5"] as const;
const METHODS = ["carr", "star", "psar"] as const;

const WORKSPACE_COPY: Record<PortfolioRole, Record<PortfolioTab, { title: string; description: string }>> = {
  mentor: {
    matrix: { title: "Matrix Portfolio Workspace", description: "Review the candidate’s competence progress, active levels, evidence coverage and controlled assessment decisions." },
    evidence: { title: "Evidence Portfolio Workspace", description: "Review the candidate’s evidence, competency links and supporting responses, and record verification decisions." },
    actions: { title: "Actions Portfolio Workspace", description: "Review agreed development actions, priorities, due dates and completion across the candidate’s portfolio." },
    placements: { title: "Placements Portfolio Workspace", description: "Review cross-discipline rotations, completed standard tasks and candidate reflections, and provide mentor verification." },
    project: { title: "Project Portfolio Workspace", description: "Review project experience and the records supporting the candidate’s professional development." },
  },
  candidate: {
    matrix: { title: "Matrix Portfolio Workspace", description: "Review your competence progress, active levels and evidence coverage across the professional framework." },
    evidence: { title: "Evidence Portfolio Workspace", description: "Build and review your evidence record, supporting responses and links to the relevant competencies." },
    actions: { title: "Actions Portfolio Workspace", description: "Review your agreed development actions, priorities and due dates, and keep completion progress up to date." },
    placements: { title: "Placements Portfolio Workspace", description: "Review your planned rotations and record completed cross-discipline tasks and placement reflections." },
    project: { title: "Project Portfolio Workspace", description: "Review project experience and the records supporting your professional development." },
  },
};

const competencyById = new Map<string, (typeof COMPETENCY_DEFINITIONS)[number]>(
  COMPETENCY_DEFINITIONS.map((definition) => [definition.id, definition]),
);

function displayLabel(value: string) {
  return value.replaceAll("-", " ");
}

function latestEvidence(entries: EvidenceEntry[]) {
  return [...entries].sort((a, b) => (b.date || b.createdAt).localeCompare(a.date || a.createdAt))[0] ?? null;
}

function useToggle() {
  const [open, setOpen] = useState<Set<string>>(new Set());
  function toggle(key: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }
  return [open, toggle] as const;
}

export default function PortfolioPanel({ portfolio, matrix, candidate, baseline, mentorWorkflow, role, candidateId, initialTab, placementsViewModel, initialPlacementDiscipline }: PortfolioPanelProps) {
  const [tab, setTab] = useState<PortfolioTab>(initialTab ?? "evidence");
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>("all");
  const [actionFilter, setActionFilter] = useState<ActionFilter>("all");
  const [selectedCompetencyId, setSelectedCompetencyId] = useState<string | null>(null);
  const [matrixAreaFilter, setMatrixAreaFilter] = useState("all");
  const [matrixLevelFilter, setMatrixLevelFilter] = useState("all");
  const [matrixDisplayMode, setMatrixDisplayMode] = useState<MatrixDisplayMode>("list");
  const [isMatrixCompetencyPanelCollapsed, setIsMatrixCompetencyPanelCollapsed] = useState(false);
  const workspaceCopy = WORKSPACE_COPY[role][tab];
  const matrixControls = {
    areaFilter: matrixAreaFilter,
    levelFilter: matrixLevelFilter,
    displayMode: matrixDisplayMode,
    isCompetencyPanelCollapsed: isMatrixCompetencyPanelCollapsed,
    setAreaFilter: setMatrixAreaFilter,
    setLevelFilter: setMatrixLevelFilter,
    setDisplayMode: setMatrixDisplayMode,
    toggleCompetencyPanel: () => setIsMatrixCompetencyPanelCollapsed((collapsed) => !collapsed),
  };

  if (portfolio.state !== "loaded") {
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2>{portfolio.state === "error" ? "Portfolio unavailable" : "Portfolio data needs attention"}</h2>
        <p className="mt-2 text-sm text-text-secondary">
          {portfolio.state === "error" ? "We could not load Portfolio information. Please refresh the page or try again later." : "The stored Portfolio relationships do not match the current Graduate Matrix model. Please contact an administrator."}
        </p>
      </section>
    );
  }

  function openCompetency(competencyId: string) {
    setSelectedCompetencyId(competencyId);
    setTab("matrix");
  }

  return (
    <div className="portfolio-workspace">
      <div className="portfolio-subnav" role="tablist" aria-label="Portfolio views">
        <PortfolioTabButton active={tab === "matrix"} onClick={() => setTab("matrix")}>Matrix</PortfolioTabButton>
        <PortfolioTabButton active={tab === "evidence"} onClick={() => setTab("evidence")}>Evidence</PortfolioTabButton>
        <PortfolioTabButton active={tab === "actions"} onClick={() => setTab("actions")}>Actions</PortfolioTabButton>
        <PortfolioTabButton active={tab === "placements"} onClick={() => setTab("placements")}>Placements</PortfolioTabButton>
        <PortfolioTabButton active={tab === "project"} onClick={() => setTab("project")}>Project</PortfolioTabButton>
        {tab === "matrix" ? <MatrixNavigationControls matrix={matrix} controls={matrixControls} /> : null}
      </div>

      <div className="portfolio-intro">
        <strong>{workspaceCopy.title}.</strong> {workspaceCopy.description}
      </div>

      {tab === "matrix" ? (
        <>
          <MatrixPanel matrix={matrix} portfolio={portfolio} candidate={candidate} baseline={baseline} mentorWorkflow={mentorWorkflow} candidateId={candidateId} initialCompetencyId={selectedCompetencyId} controls={matrixControls} />
        </>
      ) : tab === "evidence" ? (
        <EvidenceRegister portfolio={portfolio} role={role} candidateId={candidateId} filter={evidenceFilter} onFilter={setEvidenceFilter} onOpenCompetency={openCompetency} />
      ) : tab === "actions" ? (
        <ActionTracker portfolio={portfolio} role={role} candidateId={candidateId} filter={actionFilter} onFilter={setActionFilter} onOpenCompetency={openCompetency} />
      ) : tab === "placements" ? (
        placementsViewModel ? (
          <PlacementsPanel candidateId={candidateId} viewModel={placementsViewModel} initialDiscipline={initialPlacementDiscipline ?? undefined} />
        ) : (
          <section className="rounded-lg border border-border bg-surface p-6">
            <h2>Placements unavailable</h2>
            <p className="mt-2 text-sm text-text-secondary">We could not load Placements information. Please refresh the page or try again later.</p>
          </section>
        )
      ) : (
        <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
          <h2 className="text-xl font-bold">Project register</h2>
          <p className="mt-2 text-sm text-text-secondary">No project records have been added yet.</p>
        </section>
      )}
    </div>
  );
}

function PortfolioTabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={`dashboard-button secondary${active ? " active" : ""}`}>{children}</button>;
}

function ExpandPanel({ sections }: { sections: { label: string; value: string }[] }) {
  const populated = sections.filter((section) => section.value.trim());
  return (
    <div className="portfolio-expand-panel">
      {populated.length ? populated.map((section) => (
        <div className="pep-section" key={section.label}>
          <strong>{section.label}</strong>
          <div>{section.value}</div>
        </div>
      )) : <div className="pep-section"><div>No candidate response text has been entered.</div></div>}
    </div>
  );
}

function evidenceSections(entry: EvidenceEntry) {
  const sections = [
    { label: "Evidence response", value: entry.description },
    { label: "Outcome / reflection", value: entry.outcome },
  ];
  if (entry.structuredSections) {
    Object.entries(entry.structuredSections.values).forEach(([key, value]) => sections.push({ label: displayLabel(key), value }));
  }
  return sections;
}

function EvidenceRegister({ portfolio, role, candidateId, filter, onFilter, onOpenCompetency }: { portfolio: CandidatePortfolioView; role: PortfolioRole; candidateId: string; filter: EvidenceFilter; onFilter: (filter: EvidenceFilter) => void; onOpenCompetency: (competencyId: string) => void }) {
  const summary = getFrameworkEvidenceSummary(portfolio.evidence, portfolio.competencyLinks, portfolio.verificationEvents);
  const [collapsedGroups, toggleGroup] = useToggle();
  const [expandedRows, toggleRow] = useToggle();
  const [verifyOpen, toggleVerify] = useToggle();

  const rows = useMemo(() => portfolio.evidence.filter((entry) => {
    const linkedActions = getActionsForEvidence(entry.id, portfolio.actions, portfolio.actionLinks, true);
    if (filter === "verified") return entry.verificationStatus === "verified";
    if (filter === "needs-review") return entry.verificationStatus !== "verified";
    if (filter === "action-linked") return linkedActions.length > 0;
    return true;
  }), [filter, portfolio]);
  const actionLinked = portfolio.evidence.filter((entry) => getActionsForEvidence(entry.id, portfolio.actions, portfolio.actionLinks, true).length > 0).length;

  const groups = useMemo(() => {
    const map = new Map<string, EvidenceEntry[]>();
    rows.forEach((entry) => {
      const primary = getCompetencyLinksForEvidence(entry.id, portfolio.competencyLinks, true)[0];
      const key = primary?.competencyId ?? "unlinked";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(entry);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows, portfolio.competencyLinks]);

  return (
    <div className="portfolio-content">
      <div className="portfolio-summary-grid">
        <PortfolioCard label="Evidence entries" value={portfolio.evidence.length} />
        <PortfolioCard label="Verified" value={summary.verifiedEvidenceCount} />
        <PortfolioCard label="Needs mentor review" value={portfolio.evidence.length - summary.verifiedEvidenceCount} />
        <PortfolioCard label="Action-linked" value={actionLinked} />
      </div>
      <div className="portfolio-filters">
        <label htmlFor="portfolio-evidence-filter">Evidence filter</label>
        <select id="portfolio-evidence-filter" value={filter} onChange={(event) => onFilter(event.target.value as EvidenceFilter)}>
          <option value="all">All evidence</option><option value="needs-review">Needs mentor review</option><option value="verified">Verified</option><option value="action-linked">Action-linked</option>
        </select>
      </div>
      <div className="portfolio-table-wrap">
        <table className="portfolio-table">
          <thead><tr><th>Evidence</th><th>Competence</th><th>Claim level</th><th>Status</th><th>Action link</th><th>Date</th><th>Controls</th></tr></thead>
          <tbody>
            {groups.length ? groups.map(([competencyId, entries]) => {
              const definition = competencyById.get(competencyId);
              const collapsed = collapsedGroups.has(competencyId);
              return (
                <Fragment key={competencyId}>
                  <tr className="portfolio-group-row">
                    <td colSpan={7}>
                      <div className="portfolio-group-heading">
                        <span>
                          <button type="button" className="portfolio-group-toggle" onClick={() => toggleGroup(competencyId)}>{collapsed ? "Expand" : "Collapse"}</button>
                          {definition ? `${definition.reference} · ${definition.area}` : "Unlinked evidence"}
                        </span>
                        <span className="portfolio-group-count">{entries.length}</span>
                      </div>
                    </td>
                  </tr>
                  {collapsed ? null : entries.map((entry) => {
                    const links = getCompetencyLinksForEvidence(entry.id, portfolio.competencyLinks, true);
                    const actions = getActionsForEvidence(entry.id, portfolio.actions, portfolio.actionLinks, true);
                    const expanded = expandedRows.has(entry.id);
                    const verifying = verifyOpen.has(entry.id);
                    return (
                      <Fragment key={entry.id}>
                        <tr className={entry.verificationStatus === "verified" ? "portfolio-state-closed" : "portfolio-state-open"}>
                          <td>
                            <div className="portfolio-row-title">{entry.title || "Untitled evidence"}</div>
                            <div className="portfolio-row-meta">{entry.projectReference || "No project/reference entered"}</div>
                            <button type="button" className="portfolio-expand-btn mt-2" aria-expanded={expanded} onClick={() => toggleRow(entry.id)}>{expanded ? "Collapse" : "Expand"}</button>
                          </td>
                          <td><div className="flex flex-wrap gap-1">{links.length ? links.map((link) => <span className="portfolio-chip" key={link.id}>{competencyById.get(link.competencyId)?.reference ?? link.competencyId}</span>) : <span className="portfolio-chip">—</span>}</div></td>
                          <td><span className="level-pill" data-level={entry.claimedLevel}>{entry.claimedLevel}</span></td>
                          <td><StatusChip status={entry.verificationStatus} /></td>
                          <td>{actions.length ? actions.map((action) => <span className="portfolio-chip action-linked" key={action.id}>{action.title}</span>) : <span className="portfolio-chip">—</span>}</td>
                          <td>{entry.date || "—"}</td>
                          <td>
                            <div className="flex flex-wrap gap-1.5">
                              {role === "mentor" ? <button type="button" className="btn-ghost" onClick={() => toggleVerify(entry.id)}>Verify / re-review</button> : null}
                              <button type="button" className="btn-secondary" onClick={() => onOpenCompetency(competencyId)} disabled={competencyId === "unlinked"}>Open matrix</button>
                            </div>
                            {role === "mentor" && verifying ? (
                              <form action={recordEvidenceVerification} className="portfolio-inline-form">
                                <input type="hidden" name="candidateId" value={candidateId} />
                                <input type="hidden" name="evidenceId" value={entry.id} />
                                <label htmlFor={`outcome-${entry.id}`}>Outcome</label>
                                <select id={`outcome-${entry.id}`} name="outcome" defaultValue="verified"><option value="verified">Verified</option><option value="reverification-required">Needs re-review</option></select>
                                <label htmlFor={`reason-${entry.id}`}>Reason (optional)</label>
                                <textarea id={`reason-${entry.id}`} name="reason" rows={2} />
                                <button type="submit" className="btn-secondary">Record verification</button>
                              </form>
                            ) : null}
                          </td>
                        </tr>
                        {expanded ? <tr><td colSpan={7}><ExpandPanel sections={evidenceSections(entry)} /></td></tr> : null}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            }) : <tr><td colSpan={7}><div className="empty-state">No evidence matches this filter.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActionTracker({ portfolio, role, candidateId, filter, onFilter, onOpenCompetency }: { portfolio: CandidatePortfolioView; role: PortfolioRole; candidateId: string; filter: ActionFilter; onFilter: (filter: ActionFilter) => void; onOpenCompetency: (competencyId: string) => void }) {
  const currentActions = useMemo(() => getCurrentDevelopmentActions(portfolio.actions), [portfolio.actions]);
  const summary = getDevelopmentActionSummary(currentActions, portfolio.today);
  const [expandedRows, toggleRow] = useToggle();
  const [archiveOpen, toggleArchive] = useToggle();
  const [responseOpen, toggleResponse] = useToggle();

  const rows = useMemo(() => currentActions.filter((action) => {
    const active = !["completed", "closed"].includes(action.status);
    if (filter === "active") return active;
    if (filter === "submitted") return ["submitted", "returned-for-revision"].includes(action.status);
    if (filter === "overdue") return active && !!action.dueDate && action.dueDate < portfolio.today;
    if (filter === "complete") return action.status === "completed";
    return true;
  }), [filter, currentActions, portfolio.today]);
  const submitted = currentActions.filter((action) => ["submitted", "returned-for-revision"].includes(action.status)).length;

  const groups = useMemo(() => {
    const map = new Map<string, DevelopmentAction[]>();
    rows.forEach((action) => {
      if (!map.has(action.competencyId)) map.set(action.competencyId, []);
      map.get(action.competencyId)!.push(action);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  return (
    <div className="portfolio-content">
      <div className="portfolio-summary-grid">
        <PortfolioCard label="Total actions" value={currentActions.length} />
        <PortfolioCard label="Active" value={summary.active} />
        <PortfolioCard label="Submitted / returned" value={submitted} />
        <PortfolioCard label="Overdue" value={summary.overdue} />
      </div>
      <div className="portfolio-filters">
        <label htmlFor="portfolio-action-filter">Action filter</label>
        <select id="portfolio-action-filter" value={filter} onChange={(event) => onFilter(event.target.value as ActionFilter)}>
          <option value="all">All actions</option><option value="active">Active only</option><option value="submitted">Submitted / returned</option><option value="overdue">Overdue</option><option value="complete">Complete</option>
        </select>
      </div>
      <div className="portfolio-table-wrap">
        <table className="portfolio-table">
          <thead><tr><th>Action</th><th>Competence</th><th>Owner</th><th>Due</th><th>Status</th><th>Evidence</th><th>Controls</th></tr></thead>
          <tbody>
            {groups.length ? groups.map(([competencyId, actions]) => {
              const definition = competencyById.get(competencyId);
              return (
                <Fragment key={competencyId}>
                  <tr className="portfolio-group-row">
                    <td colSpan={7}>
                      <div className="portfolio-group-heading">
                        <span>{definition ? `${definition.reference} · ${definition.area}` : competencyId}</span>
                        <span className="portfolio-group-count">{actions.length}</span>
                      </div>
                    </td>
                  </tr>
                  {actions.map((action) => {
                    const linkedEvidence = getEvidenceForAction(action.id, portfolio.evidence, portfolio.actionLinks);
                    const latest = latestEvidence(linkedEvidence);
                    const overdue = !!action.dueDate && action.dueDate < portfolio.today && !["completed", "closed"].includes(action.status);
                    const terminal = ["completed", "closed"].includes(action.status);
                    const expanded = expandedRows.has(action.id);
                    const archiving = archiveOpen.has(action.id);
                    const responding = responseOpen.has(action.id);
                    const locked = !!latest && latest.verificationStatus === "verified";
                    return (
                      <Fragment key={action.id}>
                        <tr className={overdue ? "portfolio-state-overdue" : terminal ? "portfolio-state-closed" : "portfolio-state-open"}>
                          <td>
                            <div className="portfolio-row-title"><span className="mentor-action-number">{definition?.reference ?? "Action"}</span>{action.title}</div>
                            <div className="portfolio-row-meta">{action.notes || "No additional notes recorded."}</div>
                            {latest ? <button type="button" className="portfolio-expand-btn mt-2" aria-expanded={expanded} onClick={() => toggleRow(action.id)}>{expanded ? "Collapse" : "Expand"}</button> : <div className="portfolio-row-meta mt-2">No candidate answer linked yet.</div>}
                          </td>
                          <td><span className="portfolio-chip">{definition?.reference ?? action.competencyId}</span><div className="portfolio-row-meta">{definition?.area ?? ""}</div></td>
                          <td className="capitalize">{action.owner}</td>
                          <td>{action.dueDate ?? "—"} {overdue ? <span className="portfolio-chip bad">Overdue</span> : null}</td>
                          <td><span className={`portfolio-chip ${action.status === "completed" ? "good" : "warn"}`}>{displayLabel(action.status)}</span></td>
                          <td>{linkedEvidence.length ? <span className="portfolio-chip action-linked">{linkedEvidence.length} response{linkedEvidence.length === 1 ? "" : "s"}</span> : <span className="portfolio-chip">No response</span>}</td>
                          <td>
                            <div className="flex flex-wrap gap-1.5">
                              {role === "mentor" ? (
                                terminal ? (
                                  <form action={reopenAction}><input type="hidden" name="candidateId" value={candidateId} /><input type="hidden" name="actionId" value={action.id} /><button type="submit" className="btn-ghost">Reopen</button></form>
                                ) : (
                                  <>
                                    <form action={markActionComplete}><input type="hidden" name="candidateId" value={candidateId} /><input type="hidden" name="actionId" value={action.id} /><button type="submit" className="btn-secondary">Mark complete</button></form>
                                    <button type="button" className="btn-danger" onClick={() => toggleArchive(action.id)}>Delete</button>
                                  </>
                                )
                              ) : !terminal ? (
                                (!latest || !locked) ? <button type="button" className="btn-secondary" onClick={() => toggleResponse(action.id)}>{latest ? "Edit evidence response" : "Add evidence response"}</button> : null
                              ) : null}
                              <button type="button" className="btn-ghost" onClick={() => onOpenCompetency(action.competencyId)}>Open matrix</button>
                            </div>
                            {role === "mentor" && archiving ? (
                              <form action={archiveAction} className="portfolio-inline-form">
                                <input type="hidden" name="candidateId" value={candidateId} />
                                <input type="hidden" name="actionId" value={action.id} />
                                <label htmlFor={`archive-reason-${action.id}`}>Delete reason (required)</label>
                                <input id={`archive-reason-${action.id}`} name="reason" required placeholder="Why is this action being removed?" />
                                <button type="submit" className="btn-danger">Confirm delete</button>
                              </form>
                            ) : null}
                            {role === "candidate" && responding ? (
                              <EvidenceResponseForm candidateId={candidateId} actionId={action.id} today={portfolio.today} existing={locked ? null : latest} />
                            ) : null}
                          </td>
                        </tr>
                        {expanded && latest ? <tr><td colSpan={7}><ExpandPanel sections={evidenceSections(latest)} /></td></tr> : null}
                      </Fragment>
                    );
                  })}
                </Fragment>
              );
            }) : <tr><td colSpan={7}><div className="empty-state">No actions match this filter.</div></td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EvidenceResponseForm({ candidateId, actionId, today, existing }: { candidateId: string; actionId: string; today: IsoDate; existing: EvidenceEntry | null }) {
  return (
    <form action={submitEvidenceResponse} className="portfolio-inline-form">
      <input type="hidden" name="candidateId" value={candidateId} />
      <input type="hidden" name="actionId" value={actionId} />
      {existing ? <input type="hidden" name="evidenceId" value={existing.id} /> : null}
      <label htmlFor={`title-${actionId}`}>Title</label>
      <input id={`title-${actionId}`} name="title" required defaultValue={existing?.title ?? ""} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor={`date-${actionId}`}>Date</label>
          <input id={`date-${actionId}`} type="date" name="date" required defaultValue={existing?.date ?? today} />
        </div>
        <div>
          <label htmlFor={`level-${actionId}`}>Claimed level</label>
          <select id={`level-${actionId}`} name="claimedLevel" defaultValue={existing?.claimedLevel ?? "L1"}>{LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}</select>
        </div>
      </div>
      <label htmlFor={`method-${actionId}`}>Method</label>
      <select id={`method-${actionId}`} name="method" defaultValue={existing?.method ?? "carr"}>{METHODS.map((method) => <option key={method} value={method}>{method.toUpperCase()}</option>)}</select>
      <label htmlFor={`ref-${actionId}`}>Project / reference (optional)</label>
      <input id={`ref-${actionId}`} name="projectReference" defaultValue={existing?.projectReference ?? ""} />
      <label htmlFor={`desc-${actionId}`}>Evidence response</label>
      <textarea id={`desc-${actionId}`} name="description" required rows={3} defaultValue={existing?.description ?? ""} />
      <label htmlFor={`outcome-${actionId}`}>Outcome / reflection (optional)</label>
      <textarea id={`outcome-${actionId}`} name="outcome" rows={2} defaultValue={existing?.outcome ?? ""} />
      <button type="submit" className="btn-secondary">{existing ? "Save evidence response" : "Submit evidence response"}</button>
    </form>
  );
}

function PortfolioCard({ label, value }: { label: string; value: number }) {
  return <div className="portfolio-card"><div className="pc-label">{label}</div><div className="pc-value">{value}</div></div>;
}

function StatusChip({ status }: { status: EvidenceEntry["verificationStatus"] }) {
  const label = status === "verified" ? "Verified" : status === "reverification-required" ? "Re-review" : "Draft / review";
  return <span className={`portfolio-chip ${status === "verified" ? "good" : "warn"}`}>{label}</span>;
}
