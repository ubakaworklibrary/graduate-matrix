"use client";

import { useEffect, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import {
  addCompetencyCycleReview,
  completeCompetencyCycle,
  initializeCompetency,
  reopenCompetencyLevel,
  resetCompetencyCycle,
  saveMentorAssessment,
} from "@/app/mentor-actions";
import {
  compareCompetencyLevels,
  getActiveCompetencyCycle,
  getCurrentCompetencyLevel,
} from "@/lib/graduate-matrix/competency-progress";
import { PROGRESSION_RUBRIC } from "@/lib/graduate-matrix/data/progression-rubric";
import { ENGINEERING_REGISTRATION_OPTIONS } from "@/lib/graduate-matrix/data/pathways";
import { getGraduateSchemeYear, getTargetCurve, resolveCurrentCompetencyTarget } from "@/lib/graduate-matrix/progression-targets";
import { getEvidenceForCompetency } from "@/lib/graduate-matrix/evidence";
import { getActionsForCompetency } from "@/lib/graduate-matrix/development-actions";
import type { MentorWorkflowView } from "@/lib/graduate-matrix/mappers/mentor-workflow";
import type {
  CandidateInfo,
  CompetencyCycle,
  CompetencyCycleId,
  CompetencyDefinition,
  CompetencyId,
  CompetencyRecord,
  CompetencyLevel,
  IsoDate,
} from "@/types/graduate-matrix";
import type { CandidatePortfolioView } from "./PortfolioPanel";
import type { CandidateBaselineView } from "./BaselinePanel";
import Modal from "./Modal";
import MentorAssessment from "./MentorAssessment";
import { DevelopmentActionsWorkspace, EvidenceWorkspace } from "./CompetencyWorkspaces";
import { useMatrixPoc } from "./useMatrixPoc";

export type MatrixViewState = "loaded" | "error" | "integrity-error";

export interface CandidateMatrixView {
  state: MatrixViewState;
  definitions: readonly CompetencyDefinition[];
  records: Record<CompetencyId, CompetencyRecord>;
  cycles: Record<CompetencyCycleId, CompetencyCycle>;
}

interface MatrixPanelProps {
  matrix: CandidateMatrixView;
  portfolio: CandidatePortfolioView;
  candidate: CandidateInfo;
  baseline: CandidateBaselineView | null;
  mentorWorkflow: MentorWorkflowView | null;
  candidateId: string;
  initialCompetencyId?: string | null;
  controls: MatrixControls;
}

const levels = ["L1", "L2", "L3", "L4", "L5"] as const;
export type MatrixDisplayMode = "list" | "grid";
export interface MatrixControls {
  areaFilter: string;
  levelFilter: string;
  displayMode: MatrixDisplayMode;
  isCompetencyPanelCollapsed: boolean;
  setAreaFilter: (value: string) => void;
  setLevelFilter: (value: string) => void;
  setDisplayMode: (value: MatrixDisplayMode) => void;
  toggleCompetencyPanel: () => void;
}
const inputClass = "rounded-md border border-border bg-surface px-2 py-1.5 text-sm";
const buttonClass = "rounded-md bg-accent px-3 py-1.5 text-sm font-bold text-white";

function statusLabel(status: string) {
  return status.replaceAll("-", " ");
}

function HiddenIds({ candidateId, competencyId, cycleId }: { candidateId: string; competencyId: string; cycleId?: string | null }) {
  return <><input type="hidden" name="candidateId" value={candidateId} /><input type="hidden" name="candidateCompetencyId" value={competencyId} />{cycleId ? <input type="hidden" name="expectedCycleId" value={cycleId} /> : null}</>;
}

export function MatrixNavigationControls({ matrix, controls }: { matrix: CandidateMatrixView; controls: MatrixControls }) {
  const areas = useMemo(() => Array.from(new Set(matrix.definitions.map((definition) => definition.area))).sort(), [matrix.definitions]);
  return (
    <div className="matrix-navigation-controls">
      <div className="filters">
        <select aria-label="Filter by competence area" value={controls.areaFilter} onChange={(event) => controls.setAreaFilter(event.target.value)}>
          <option value="all">All areas</option>
          {areas.map((area) => <option key={area} value={area}>{area}</option>)}
        </select>
        <select aria-label="Filter by competence level" value={controls.levelFilter} onChange={(event) => controls.setLevelFilter(event.target.value)}>
          <option value="all">All levels</option>
          {levels.map((level) => <option key={level} value={level}>{level}</option>)}
        </select>
      </div>
      <div className="matrix-mode-toggle" role="group" aria-label="Competency view">
        <span>Competency view</span>
        <div>
          <button type="button" className={controls.displayMode === "list" ? "active" : ""} aria-pressed={controls.displayMode === "list"} onClick={() => controls.setDisplayMode("list")}>List</button>
          <button type="button" className={controls.displayMode === "grid" ? "active" : ""} aria-pressed={controls.displayMode === "grid"} onClick={() => controls.setDisplayMode("grid")}>Grid</button>
          <button type="button" className="matrix-panel-toggle" aria-controls="matrix-competency-panel" aria-expanded={!controls.isCompetencyPanelCollapsed} title={controls.isCompetencyPanelCollapsed ? "Show competencies" : "Hide competencies and expand details"} onClick={controls.toggleCompetencyPanel}>
            <span aria-hidden="true">{controls.isCompetencyPanelCollapsed ? "→" : "←"}</span>
            <span>{controls.isCompetencyPanelCollapsed ? "Show" : "Hide"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MatrixPanel({ matrix, portfolio, candidate, baseline, mentorWorkflow, candidateId, initialCompetencyId, controls }: MatrixPanelProps) {
  const alphabeticalDefinitions = useMemo(() => [...matrix.definitions].sort((left, right) => left.reference.localeCompare(right.reference, undefined, { numeric: true })), [matrix.definitions]);
  const [selectedId, setSelectedId] = useState<string | null>(initialCompetencyId ?? alphabeticalDefinitions[0]?.id ?? null);
  const selectedCompetencyStorageKey = `graduate-matrix-selected-competency:${candidateId}`;
  const actualRole = mentorWorkflow ? "mentor" : "candidate";
  const [previewRole, setPreviewRole] = useState<"candidate" | "mentor">(actualRole);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    try {
      const stored = window.localStorage.getItem("graduate-matrix-preview-role");
      // Hydrate the browser-only preview preference after the server-safe role render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored === "candidate" || stored === "mentor") setPreviewRole(stored);
    } catch { /* Local preview remains usable when storage is unavailable. */ }
  }, []);
  useEffect(() => {
    if (initialCompetencyId) return;
    try {
      const stored = window.localStorage.getItem(selectedCompetencyStorageKey);
      if (stored && matrix.definitions.some((definition) => definition.id === stored)) {
        // Hydrate the candidate-specific last selection after the server-safe first item.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedId(stored);
      }
    } catch { /* The alphabetical first competency remains selected. */ }
  }, [initialCompetencyId, matrix.definitions, selectedCompetencyStorageKey]);
  const selectCompetency = (competencyId: string) => {
    setSelectedId(competencyId);
    try { window.localStorage.setItem(selectedCompetencyStorageKey, competencyId); } catch { /* non-fatal */ }
  };
  const choosePreviewRole = (role: "candidate" | "mentor") => {
    setPreviewRole(role);
    try { window.localStorage.setItem("graduate-matrix-preview-role", role); } catch { /* non-fatal */ }
  };

  const filtered = useMemo(() => alphabeticalDefinitions.filter((definition) => {
    if (controls.areaFilter !== "all" && definition.area !== controls.areaFilter) return false;
    if (controls.levelFilter !== "all") {
      const record = matrix.records[definition.id];
      const level = record ? getCurrentCompetencyLevel(record, matrix.cycles) : null;
      if (level !== controls.levelFilter) return false;
    }
    return true;
  }), [alphabeticalDefinitions, matrix.records, matrix.cycles, controls.areaFilter, controls.levelFilter]);

  if (matrix.state === "error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-xl font-bold">Matrix unavailable</h2>
        <p className="mt-2 text-sm text-text-secondary">
          We could not load competency information. Please refresh the page or try again later.
        </p>
      </section>
    );
  }

  if (matrix.state === "integrity-error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-xl font-bold">Matrix data needs attention</h2>
        <p className="mt-2 text-sm text-text-secondary">
          The stored competency structure does not match the current Graduate Matrix framework. Please contact an administrator.
        </p>
      </section>
    );
  }

  const selected = selectedId ? matrix.definitions.find((definition) => definition.id === selectedId) ?? null : null;

  let previousArea: string | null = null;

  return (
    <div className="matrix-workspace">
      {process.env.NODE_ENV !== "production" ? <div className="matrix-preview-toolbar">
        <span><strong>Preview workflow</strong><small>Previewing {previewRole === "mentor" ? "Mentor" : "Candidate"} workflow</small></span>
        <div role="group" aria-label="Preview workflow role"><button type="button" aria-pressed={previewRole === "candidate"} className={previewRole === "candidate" ? "active" : ""} onClick={() => choosePreviewRole("candidate")}>Candidate</button><button type="button" aria-pressed={previewRole === "mentor"} className={previewRole === "mentor" ? "active" : ""} onClick={() => choosePreviewRole("mentor")}>Mentor</button></div>
      </div> : null}
      <div className={`matrix-view${controls.isCompetencyPanelCollapsed ? " competency-panel-collapsed" : ""}`}>
        <div id="matrix-competency-panel" className={`comp-list comp-list-${controls.displayMode}`} hidden={controls.isCompetencyPanelCollapsed}>
          {filtered.length ? filtered.map((definition) => {
            const record = matrix.records[definition.id];
            const level = record ? getCurrentCompetencyLevel(record, matrix.cycles) : null;
            const cycle = record ? getActiveCompetencyCycle(record, matrix.cycles) : null;
            const showAreaHeader = definition.area !== previousArea;
            previousArea = definition.area;
            return (
              <div key={definition.id}>
                {showAreaHeader ? <div className="comp-area-header">{definition.area}</div> : null}
                <div className={`comp-row${selectedId === definition.id ? " selected" : ""}`} data-grid-tooltip={controls.displayMode === "grid" ? definition.objective : undefined} tabIndex={controls.displayMode === "grid" ? 0 : undefined} onClick={() => selectCompetency(definition.id)}>
                  <div className="comp-ref">{definition.reference}</div>
                  <div className="comp-row-body">
                    <div className="comp-title">{definition.objective}</div>
                    <div className="comp-area-label">{definition.area}</div>
                  </div>
                  <div className="comp-row-meta">
                    <span className="level-pill" data-level={level ?? "none"}>{level ?? "—"}</span>
                    {cycle ? <span className="portfolio-chip">{statusLabel(cycle.status)}</span> : <span className="portfolio-chip">Not initialized</span>}
                  </div>
                </div>
              </div>
            );
          }) : <div className="empty-state">No competences match the current filters.</div>}
        </div>

        <div className={`detail-panel${selected ? "" : " empty"}`}>
          {!selected ? (
            "Select a competence on the left to view detail, set progression level, and log evidence."
          ) : (
            <CompetencyDetail
              definition={selected}
              allDefinitions={matrix.definitions}
              record={matrix.records[selected.id]}
              cycles={matrix.cycles}
              portfolio={portfolio}
              candidate={candidate}
              baseline={baseline}
              mentorWorkflow={mentorWorkflow}
              candidateId={candidateId}
              previewRole={process.env.NODE_ENV !== "production" ? previewRole : actualRole}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function CompetencyDetail({
  definition,
  allDefinitions,
  record,
  cycles,
  portfolio,
  candidate,
  baseline,
  mentorWorkflow,
  candidateId,
  previewRole,
}: {
  definition: CompetencyDefinition;
  allDefinitions: readonly CompetencyDefinition[];
  record: CompetencyRecord | undefined;
  cycles: Record<CompetencyCycleId, CompetencyCycle>;
  portfolio: CandidatePortfolioView;
  candidate: CandidateInfo;
  baseline: CandidateBaselineView | null;
  mentorWorkflow: MentorWorkflowView | null;
  candidateId: string;
  previewRole: "candidate" | "mentor";
}) {
  const currentLevel = record ? getCurrentCompetencyLevel(record, cycles) : null;
  const activeCycle = record ? getActiveCompetencyCycle(record, cycles) : null;
  const evidence = getEvidenceForCompetency(definition.id, portfolio.evidence, portfolio.competencyLinks);
  const actions = getActionsForCompetency(definition.id, portfolio.actions);
  const item = mentorWorkflow?.competencies.find((competency) => competency.competencyId === definition.id) ?? null;
  const currentAssessment = item?.assessments.find((assessment) => assessment.cycleId === item.activeCycleId);

  const [evidenceLevelView, setEvidenceLevelView] = useState<(typeof levels)[number]>(currentLevel ?? "L1");
  const [referenceModal, setReferenceModal] = useState<"rubric" | "specification" | null>(null);
  const [mentorAssessmentOpen, setMentorAssessmentOpen] = useState(false);
  const poc = useMatrixPoc();

  return (
    <div className="detail-body">
      <div className="competency-detail-heading">
        <div className="competency-detail-label">Competency details</div>
        <div className="detail-header">
          <div className="detail-reference-line">
            <span><span className="detail-ref">{definition.reference}</span><span className="detail-area">{definition.area}</span></span>
            <span className="detail-reference-links">
              <button type="button" onClick={() => setReferenceModal("rubric")}>@ rubric</button>
              <button type="button" onClick={() => setReferenceModal("specification")}>@ competency specification</button>
            </span>
          </div>
          <p className="detail-objective">{definition.objective}</p>
          {process.env.NODE_ENV !== "production" ? <div className="poc-scenario-controls"><span>Local proof-of-concept data</span><button type="button" className="btn-secondary" onClick={() => poc.loadSample(candidateId)}>Load sample scenario</button><button type="button" className="btn-ghost" onClick={poc.reset}>Reset POC data</button></div> : null}
        </div>
      </div>

      <CandidateProgressionPosition definition={definition} record={record} cycles={cycles} candidate={candidate} baseline={baseline} today={portfolio.today} currentLevel={currentLevel} activeCycle={activeCycle} onMentorAssessment={mentorWorkflow && previewRole === "mentor" ? () => setMentorAssessmentOpen(true) : null} />

      <DevelopmentActionsWorkspace actions={actions} evidence={evidence} actionLinks={portfolio.actionLinks} candidateId={candidateId} competency={definition} currentLevel={currentLevel} item={item} previewRole={previewRole} canUseServerMentorActions={Boolean(mentorWorkflow)} poc={poc} />

      <EvidenceWorkspace evidence={evidence} candidateId={candidateId} competency={definition} allCompetencies={allDefinitions} previewRole={previewRole} canUseServerMentorActions={Boolean(mentorWorkflow)} selectedLevel={evidenceLevelView} onLevel={setEvidenceLevelView} currentLevel={currentLevel} assessmentStatus={currentAssessment?.status ?? "not-reviewed"} nextAction={currentAssessment?.nextAction} poc={poc} />

      {mentorAssessmentOpen && mentorWorkflow ? (
        <Modal title={`Mentor assessment · ${definition.reference} — ${definition.area}`} size="workspace" onClose={() => setMentorAssessmentOpen(false)} footer={<button type="button" className="btn-primary" onClick={() => setMentorAssessmentOpen(false)}>Close</button>}>
          <MentorAssessment candidateId={candidateId} definition={definition} item={item} mentors={mentorWorkflow.mentors} managers={mentorWorkflow.managers} cycles={cycles} evidence={evidence} actions={actions} />
        </Modal>
      ) : null}

      {referenceModal === "rubric" ? (
        <Modal title="Progression rubric" size="xl" onClose={() => setReferenceModal(null)} footer={<button type="button" className="btn-primary" onClick={() => setReferenceModal(null)}>Close</button>}>
          <p className="matrix-reference-intro">The rubric describes what each formal progression level means and the evidence normally expected at that level.</p>
          <div className="matrix-reference-table-wrap"><table className="matrix-reference-table"><colgroup><col className="rubric-level-column" /><col className="rubric-meaning-column" /><col className="rubric-description-column" /><col className="rubric-evidence-column" /><col className="rubric-timing-column" /></colgroup><thead><tr><th>Level</th><th>Meaning</th><th>Description</th><th>Evidence expectation</th><th>Typical timing</th></tr></thead><tbody>
            {PROGRESSION_RUBRIC.map((entry) => <tr key={entry.level}><td><span className="level-pill" data-level={entry.level}>{entry.level}</span></td><td><strong>{entry.name}</strong></td><td>{entry.description}</td><td>{entry.evidenceExpectation}</td><td>{entry.typicalTiming}</td></tr>)}
          </tbody></table></div>
        </Modal>
      ) : null}

      {referenceModal === "specification" ? (
        <Modal title={`${definition.reference} competency specification`} size="xl" onClose={() => setReferenceModal(null)} footer={<button type="button" className="btn-primary" onClick={() => setReferenceModal(null)}>Close</button>}>
          <p className="matrix-reference-intro"><strong>{definition.objective}</strong></p>
          <div className="spec-body-inner matrix-specification-modal">
            <div className="spec-block"><span className="spec-label">Expected behaviours</span><div className="spec-value">{definition.behaviours}</div></div>
            <div className="spec-grid-2">
              <div className="spec-block"><span className="spec-label">Evidence examples</span><div className="spec-value">{definition.evidenceExamples}</div></div>
              <div className="spec-block"><span className="spec-label">Assessment method</span><div className="spec-value">{definition.assessmentMethods}</div></div>
              <div className="spec-block"><span className="spec-label">Review frequency</span><div className="spec-value">{definition.frequency}</div></div>
              <div className="spec-block"><span className="spec-label">Registration relevance</span><div className="spec-value">{definition.relevance}</div></div>
            </div>
            {definition.notes ? <div className="spec-block"><span className="spec-label">Notes</span><div className="spec-value italic">{definition.notes}</div></div> : null}
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function CandidateProgressionPosition({
  definition,
  record,
  cycles,
  candidate,
  baseline,
  today,
  currentLevel,
  activeCycle,
  onMentorAssessment,
}: {
  definition: CompetencyDefinition;
  record: CompetencyRecord | undefined;
  cycles: Record<CompetencyCycleId, CompetencyCycle>;
  candidate: CandidateInfo;
  baseline: CandidateBaselineView | null;
  today: IsoDate;
  currentLevel: CompetencyLevel | null;
  activeCycle: CompetencyCycle | null;
  onMentorAssessment: (() => void) | null;
}) {
  const asOf = new Date(`${today}T00:00:00Z`);
  const schemeYear = getGraduateSchemeYear(candidate.schemeStartDate, asOf);
  const registrationTarget = candidate.pathway.engineeringRegistrationTarget;
  const registrationLabel = ENGINEERING_REGISTRATION_OPTIONS.find((option) => option.value === registrationTarget)?.label ?? registrationTarget.toUpperCase();
  const registrationSubmissionLevel = registrationTarget === "engtech" ? "L3" : registrationTarget === "ieng" ? "L4" : registrationTarget === "ceng" || registrationTarget === "international-later" ? "L5" : null;
  const targetCurve = getTargetCurve(definition, registrationTarget);
  const targetLevel = resolveCurrentCompetencyTarget(definition, record, registrationTarget, candidate.schemeStartDate, asOf);
  const baselineActive = Boolean(baseline?.setup && !baseline.setup.formalTrainingStartedAt && !activeCycle);
  const levelIndex = currentLevel ? levels.indexOf(currentLevel) : -1;
  const nextFormalCycle = baselineActive || !currentLevel ? "L1" : levelIndex >= 0 && levelIndex < levels.length - 1 ? levels[levelIndex + 1] : null;
  const competencyCycles = Object.values(cycles)
    .filter((cycle) => cycle.candidateId === record?.candidateId && cycle.competencyId === definition.id)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const latestCycleByLevel = new Map(levels.map((level) => [level, competencyCycles.find((cycle) => cycle.level === level) ?? null]));
  const targetComparison = !baselineActive && schemeYear !== null && currentLevel !== null ? compareCompetencyLevels(currentLevel, targetLevel) : null;
  const targetStatus = targetComparison === null ? null : targetComparison < 0 ? "behind" : targetComparison > 0 ? "ahead" : "on-target";

  return (
    <details className="candidate-progression-position" open>
      <summary>
        <span className="candidate-progression-heading"><strong>Candidate current level and target for current year</strong></span>
      </summary>
      <div className="candidate-progression-body">
        <div className="candidate-progression-summary">
          {baselineActive ? <ProgressionChip label="Current stage" value="BL" /> : null}
          {baselineActive ? <ProgressionChip label="Formal level" value="Not started" emphasis="formal" /> : null}
          {nextFormalCycle ? <ProgressionChip label="Next formal cycle" value={nextFormalCycle} /> : null}
          <ProgressionChip label="Scheme year" value={schemeYear ? (schemeYear === 4 ? "4+" : String(schemeYear)) : "Not set"} />
          <ProgressionChip label="Registration submission target" value={registrationSubmissionLevel ? `${registrationLabel} · ${registrationSubmissionLevel}` : registrationLabel} />
          {targetStatus ? <span className={`candidate-progress-status ${targetStatus}`}>{targetStatus === "behind" ? "Behind target" : targetStatus === "ahead" ? "Ahead of target" : "On target"}</span> : null}
        </div>

        <div className="candidate-level-track">
          {levels.map((level) => {
            const rubric = PROGRESSION_RUBRIC.find((entry) => entry.level === level);
            const years = targetCurve.flatMap((curveLevel, yearIndex) => curveLevel === level ? [yearIndex === 3 ? "Y4+" : `Y${yearIndex + 1}`] : []);
            const isCurrent = !baselineActive && currentLevel === level;
            const isTarget = schemeYear !== null && targetLevel === level;
            const cycle = isCurrent ? activeCycle : latestCycleByLevel.get(level);
            const isCompleted = !isCurrent && cycle?.status === "completed";
            const isLocked = !isCurrent && (cycle === null || cycle?.status === "locked");
            return <div className={`candidate-level-step${isCurrent ? " current" : ""}${isTarget ? " target" : ""}${isCompleted ? " completed" : ""}${isLocked ? " locked" : ""}`} key={level}>
              <div className="candidate-level-markers">{isCurrent ? <span className="current-marker">Current level</span> : null}{isTarget ? <span className="target-marker">Target for current year</span> : null}</div>
              <div className="candidate-level-icon-slot">{isLocked ? <span className="candidate-level-lock" title="Locked level"><Lock aria-hidden="true" className="h-4 w-4" /><span className="sr-only">Locked</span></span> : null}</div>
              <strong>{level}</strong><span className="candidate-level-name">{rubric?.name ?? ""}</span><small>{years.length ? years.join(", ") : "—"}</small>
              <div className="candidate-level-state-slot">{isCurrent ? <em className="candidate-level-state active">✓ Active cycle</em> : isCompleted ? <em className="candidate-level-state completed">✓ Completed</em> : cycle && cycle.status !== "locked" ? <em className={`candidate-level-state ${cycle.status}`}>{statusLabel(cycle.status)}</em> : null}</div>
            </div>;
          })}
        </div>

        <div className="candidate-progression-footer">
          <p>The current level comes from the active assessment cycle.<br />Progression decisions are recorded through Mentor assessment.</p>
          {onMentorAssessment ? <button type="button" className="btn-secondary candidate-mentor-assessment-button" onClick={onMentorAssessment}>Mentor assessment</button> : null}
        </div>
      </div>
    </details>
  );
}

function ProgressionChip({ label, value, emphasis }: { label: string; value: string; emphasis?: string }) {
  return <span className={`candidate-progression-chip${emphasis ? ` ${emphasis}` : ""}`}><small>{label}</small><strong>{value}</strong></span>;
}

export function LegacyMentorControls({ candidateId, definition, item, mentors, managers }: { candidateId: string; definition: CompetencyDefinition; item: MentorWorkflowView["competencies"][number] | null; mentors: MentorWorkflowView["mentors"]; managers: MentorWorkflowView["managers"] }) {
  if (!item) {
    return (
      <form action={initializeCompetency} className="grid gap-2 rounded-md border border-border bg-page p-3">
        <input type="hidden" name="candidateId" value={candidateId} />
        <input type="hidden" name="competencyDefinitionId" value={definition.id} />
        <p className="text-sm font-semibold">This competency has not been initialized.</p>
        <input className={inputClass} name="reason" required placeholder="Initialization reason" />
        <button className={buttonClass}>Initialize at L1</button>
      </form>
    );
  }

  if (!item.activeCycleId) {
    return <p className="text-sm text-text-muted">This persisted competency has no active cycle; initialization cannot be repeated.</p>;
  }

  const activeAssessments = item.assessments.filter((assessment) => assessment.cycleId === item.activeCycleId);
  const currentAssessment = activeAssessments[0];
  const eligibleAssessments = activeAssessments.filter((assessment) => assessment.status === "demonstrated" && assessment.recommendation === "progress-discussion");
  const activeReviews = item.reviews.filter((review) => review.cycleId === item.activeCycleId);
  const earlierLevels = item.activeLevel ? levels.slice(0, levels.indexOf(item.activeLevel)) : [];

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <form action={saveMentorAssessment} className="grid gap-2 rounded-md border border-border bg-page p-3">
        <h3 className="font-bold">Mentor assessment</h3>
        <HiddenIds candidateId={candidateId} competencyId={item.candidateCompetencyId} cycleId={item.activeCycleId} />
        {currentAssessment ? <input type="hidden" name="assessmentId" value={currentAssessment.id} /> : null}
        <select className={inputClass} name="status" defaultValue={currentAssessment?.status ?? "not-reviewed"}><option value="not-reviewed">Not reviewed</option><option value="more-evidence">More evidence</option><option value="demonstrated">Demonstrated</option></select>
        <select className={inputClass} name="recommendation" defaultValue={currentAssessment?.recommendation ?? "not-set"}><option value="not-set">Not set</option><option value="maintain-level">Maintain level</option><option value="progress-discussion">Progression discussion</option></select>
        <textarea className={inputClass} name="nextAction" defaultValue={currentAssessment?.nextAction ?? ""} placeholder="Next action or rationale" />
        <button className={buttonClass}>{currentAssessment ? "Update assessment" : "Record assessment"}</button>
        {activeAssessments.length ? (
          <div className="border-t border-border pt-2 text-xs text-text-secondary">
            <p className="font-bold">Assessment history</p>
            {activeAssessments.map((assessment) => (
              <p key={assessment.id} className="mt-1">
                {assessment.assessedAt?.slice(0, 10) ?? "Undated"} · {assessment.status} · {assessment.recommendation} · {assessment.assessedBy ?? "Unattributed"}
              </p>
            ))}
          </div>
        ) : null}
      </form>

      <form action={addCompetencyCycleReview} className="grid gap-2 rounded-md border border-border bg-page p-3">
        <h3 className="font-bold">Add cycle review</h3>
        <HiddenIds candidateId={candidateId} competencyId={item.candidateCompetencyId} cycleId={item.activeCycleId} />
        <select className={inputClass} name="status" defaultValue="not-reviewed"><option value="not-reviewed">Not reviewed</option><option value="more-evidence">More evidence</option><option value="demonstrated">Demonstrated</option></select>
        <select className={inputClass} name="recommendation" defaultValue="not-set"><option value="not-set">Not set</option><option value="maintain-level">Maintain level</option><option value="progress-discussion">Progression discussion</option></select>
        <textarea className={inputClass} name="nextAction" placeholder="Next action" />
        <button className={buttonClass}>Record review snapshot</button>
        <div className="border-t border-border pt-2 text-xs text-text-secondary">
          <p className="font-bold">Cycle-review history</p>
          {activeReviews.length ? activeReviews.map((review) => (
            <p key={review.id} className="mt-1">
              {review.reviewedAt.slice(0, 10)} · {review.status} · {review.recommendation} · {review.reviewedBy}
            </p>
          )) : <p className="mt-1 text-text-muted">No review snapshots recorded.</p>}
        </div>
      </form>

      {item.activeStatus === "open" ? <>
        <form action={completeCompetencyCycle} className="grid gap-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 lg:col-span-2">
          <h3 className="font-bold">Complete active cycle</h3>
          <HiddenIds candidateId={candidateId} competencyId={item.candidateCompetencyId} cycleId={item.activeCycleId} />
          <select className={inputClass} name="assessmentId" required defaultValue=""><option value="" disabled>Demonstrated assessment</option>{eligibleAssessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.assessedAt?.slice(0, 10)} · {assessment.assessedBy}</option>)}</select>
          <div className="grid gap-2 sm:grid-cols-2"><select className={inputClass} name="mentorUserId" required defaultValue=""><option value="" disabled>Actual mentor approver</option>{mentors.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}</select><select className={inputClass} name="managerUserId" required defaultValue=""><option value="" disabled>Actual manager approver</option>{managers.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}</select></div>
          <textarea className={inputClass} name="evidenceBasis" required placeholder="Evidence basis" /><textarea className={inputClass} name="reason" required placeholder="Decision reason" />
          {item.activeLevel !== "L5" && item.activeActions.length ? <div className="grid gap-2"><p className="text-sm font-bold">Optional carry-forward actions</p>{item.activeActions.map((action) => <label key={action.id} className="flex flex-wrap items-center gap-2 text-sm"><input type="checkbox" name="carryActionId" value={action.id} />{action.title}<input className={inputClass} type="date" name={`due-${action.id}`} defaultValue={action.dueDate ?? ""} /></label>)}</div> : null}
          <label className="text-sm"><input className="mr-2" type="checkbox" name="managerConfirmed" value="yes" required />Manager sign-off is confirmed and I understand this progression is transactional.</label>
          <button className={buttonClass}>Complete cycle</button>
        </form>

        <form action={resetCompetencyCycle} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-page p-3">
          <HiddenIds candidateId={candidateId} competencyId={item.candidateCompetencyId} cycleId={item.activeCycleId} /><input className={`${inputClass} flex-1`} name="reason" required placeholder="Reset reason" /><label className="text-xs"><input className="mr-1" type="checkbox" required />Confirm reset</label><button className={buttonClass}>Reset cycle</button>
        </form>

        {earlierLevels.length ? <form action={reopenCompetencyLevel} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-page p-3">
          <HiddenIds candidateId={candidateId} competencyId={item.candidateCompetencyId} cycleId={item.activeCycleId} /><select className={inputClass} name="level" required>{earlierLevels.map((level) => <option key={level}>{level}</option>)}</select><input className={`${inputClass} flex-1`} name="reason" required placeholder="Reopen reason" /><label className="text-xs"><input className="mr-1" type="checkbox" required />Confirm reopen</label><button className={buttonClass}>Reopen earlier level</button>
        </form> : null}
      </> : null}
    </div>
  );
}
