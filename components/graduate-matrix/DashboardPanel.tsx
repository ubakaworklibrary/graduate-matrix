"use client";

import { useState } from "react";
import { getCurrentCompetencyLevel } from "@/lib/graduate-matrix/competency-progress";
import { getCombinedCpdSummary } from "@/lib/graduate-matrix/cpd";
import { getActionsForEvidence } from "@/lib/graduate-matrix/development-actions";
import { getCompetencyLinksForEvidence } from "@/lib/graduate-matrix/evidence";
import {
  getPrimaryOutcomeLabel,
  getProfessionalBodyLabel,
} from "@/lib/graduate-matrix/data/pathways";
import type { MentorWorkflowView } from "@/lib/graduate-matrix/mappers/mentor-workflow";
import type { CandidateInfo, CompetencyLevel, MentorAssessmentStatus } from "@/types/graduate-matrix";
import type { CandidateCpdLogView } from "./CpdLogPanel";
import type { CandidateMatrixView } from "./MatrixPanel";
import type { CandidateMeetingLogView } from "./MeetingLogPanel";
import type { CandidatePortfolioView } from "./PortfolioPanel";
import type { CandidateBaselineView } from "./BaselinePanel";
import { buildCompetenceAreaCoverageData } from "@/lib/graduate-matrix/competence-area-coverage";
import { getGraduateSchemeYear, resolveCurrentCompetencyTarget } from "@/lib/graduate-matrix/progression-targets";
import CompetenceAreaCoverageChart from "./CompetenceAreaCoverageChart";

interface DashboardPanelProps {
  candidate: CandidateInfo;
  baseline: CandidateBaselineView;
  matrix: CandidateMatrixView;
  portfolio: CandidatePortfolioView;
  cpdLog: CandidateCpdLogView;
  meetingLog: CandidateMeetingLogView;
  mentorWorkflow: MentorWorkflowView | null;
  onOpenTab: (tab: "Portfolio" | "Matrix" | "Placements" | "CPD Log" | "Meeting Log") => void;
}

const LEVELS: readonly CompetencyLevel[] = ["L1", "L2", "L3", "L4", "L5"];

function displayLabel(value: string) {
  return value.replaceAll("-", " ");
}

export default function DashboardPanel({ candidate, baseline, matrix, portfolio, cpdLog, mentorWorkflow, onOpenTab }: DashboardPanelProps) {
  const currentSchemeYear = getGraduateSchemeYear(candidate.schemeStartDate, new Date(`${portfolio.today}T00:00:00Z`));
  const [coverageYear, setCoverageYear] = useState<1 | 2 | 3 | 4>(currentSchemeYear ?? 1);
  const activeActions = portfolio.actions.filter((action) => !["completed", "closed"].includes(action.status) && !action.archivedAt);
  const overdueActions = activeActions.filter((action) => action.dueDate && action.dueDate < portfolio.today);
  const dueSoonCutoff = new Date(`${portfolio.today}T00:00:00Z`);
  dueSoonCutoff.setUTCDate(dueSoonCutoff.getUTCDate() + 7);
  const dueSoonDate = dueSoonCutoff.toISOString().slice(0, 10);
  const dueSoonActions = activeActions.filter((action) => action.dueDate && action.dueDate >= portfolio.today && action.dueDate <= dueSoonDate);
  const submittedActions = portfolio.actions.filter((action) => ["submitted", "returned-for-revision"].includes(action.status));
  const verifiedEvidence = portfolio.evidence.filter((entry) => entry.verificationStatus === "verified");
  const reviewEvidence = portfolio.evidence.filter((entry) => entry.verificationStatus !== "verified").slice(0, 8);
  const priorityActions = [...activeActions].sort((left, right) => {
    const leftOverdue = left.dueDate && left.dueDate < portfolio.today ? 0 : 1;
    const rightOverdue = right.dueDate && right.dueDate < portfolio.today ? 0 : 1;
    return leftOverdue - rightOverdue || (left.dueDate ?? "9999").localeCompare(right.dueDate ?? "9999");
  }).slice(0, 8);
  const cpd = getCombinedCpdSummary(cpdLog.entries, cpdLog.evidence, cpdLog.evidenceCompetencyLinks);
  const workflowByCompetency = new Map(mentorWorkflow?.competencies.map((item) => [item.competencyId, item]) ?? []);
  const levelCounts = new Map<CompetencyLevel, number>(LEVELS.map((level) => [level, 0]));

  const competencyRows = matrix.definitions.map((definition) => {
    const record = matrix.records[definition.id];
    const current = record ? getCurrentCompetencyLevel(record, matrix.cycles) : null;
    const target = resolveCurrentCompetencyTarget(definition, record, candidate.pathway.engineeringRegistrationTarget, candidate.schemeStartDate, new Date(`${portfolio.today}T00:00:00Z`));
    if (current) levelCounts.set(current, (levelCounts.get(current) ?? 0) + 1);
    const workflow = workflowByCompetency.get(definition.id);
    const latestAssessment = [...(workflow?.assessments ?? [])].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
    const evidence = portfolio.competencyLinks.filter((link) => link.competencyId === definition.id);
    const evidenceIds = new Set(evidence.map((link) => link.evidenceId));
    const verified = portfolio.evidence.filter((entry) => evidenceIds.has(entry.id) && entry.verificationStatus === "verified").length;
    const openActions = activeActions.filter((action) => action.competencyId === definition.id).length;
    return { definition, record, current, target, assessment: latestAssessment, evidence: evidenceIds.size, verified, openActions };
  });
  const statusCounts = competencyRows.reduce<Record<MentorAssessmentStatus, number>>(
    (counts, row) => ({
      ...counts,
      [row.assessment?.status ?? "not-reviewed"]:
        counts[row.assessment?.status ?? "not-reviewed"] + 1,
    }),
    { "not-reviewed": 0, "more-evidence": 0, demonstrated: 0 },
  );
  const readyToDiscuss = competencyRows.filter(
    (row) => row.assessment?.recommendation === "progress-discussion",
  ).length;
  const baselineActive = baseline.state !== "error"
    && baseline.state !== "definition-mismatch"
    && !baseline.setup?.formalTrainingStartedAt;
  const areaCoverage = buildCompetenceAreaCoverageData(
    matrix.definitions,
    matrix.records,
    matrix.cycles,
    candidate,
    new Date(`${portfolio.today}T00:00:00Z`),
    coverageYear,
  );

  const candidateNameLabel = [candidate.firstName.trim(), candidate.surname.trim()].filter(Boolean).join(" ") || "Not set";
  const targetOutcomeLabel = candidate.pathway.isConfigured
    ? getPrimaryOutcomeLabel(candidate.pathway.primaryOutcome) ?? "Not set"
    : "Not set";
  const routeLabel = candidate.pathway.isConfigured
    ? `${getProfessionalBodyLabel(candidate.pathway.professionalBody) ?? "Not set"} · ${getPrimaryOutcomeLabel(candidate.pathway.primaryOutcome) ?? "Not set"}`
    : "Not set";

  return (
    <div className="dashboard-page">
      <section className="candidate-summary-panel dashboard-panel">
        <h3>Candidate pathway summary</h3>
        <div className="candidate-summary-grid">
          <Summary label="Candidate" value={candidateNameLabel} />
          <Summary label="Target outcome" value={targetOutcomeLabel} />
          <Summary label="Pathway" value={routeLabel} />
          <Summary label="Mentor" value={candidate.mentorName || "Not set"} />
        </div>
      </section>

      <section className="area-progress dashboard-panel">
        <h3>Portfolio control dashboard</h3>
        <p className="dashboard-section-copy">Key numbers at a glance. Use Portfolio → Matrix for assessment decisions, Portfolio → Evidence for entry review, and Portfolio → Actions for action tracking.</p>
        <div className="dashboard-actions">
          <Button onClick={() => onOpenTab("Matrix")}>Open Matrix</Button>
          <Button onClick={() => onOpenTab("Portfolio")}>Open Evidence Register</Button>
          <Button onClick={() => onOpenTab("Portfolio")}>Open Action Tracker</Button>
          <Button onClick={() => onOpenTab("Placements")}>Open Placements</Button>
        </div>
        <div className="dashboard-kpi-grid">
          <Kpi value={portfolio.evidence.length} label="Evidence entries" detail={`${verifiedEvidence.length} verified · ${reviewEvidence.length} need review`} />
          <Kpi value={activeActions.length} label="Active actions" detail={`${dueSoonActions.length} due within 7 days · ${submittedActions.length} awaiting response`} />
          <Kpi value={overdueActions.length} label="Overdue actions" hot />
          <Kpi value={readyToDiscuss} label="Ready to discuss progression" />
          <Kpi value={statusCounts["more-evidence"]} label="More evidence required" />
          <Kpi value={cpd.totalHours} suffix="/—" label="CPD hours this year" />
        </div>
        <p className="dashboard-route"><strong>Route:</strong> {routeLabel}</p>
      </section>

      <div className="dashboard-extras">
        <section className="dashboard-health-panel">
          <div className="dashboard-card-label">Portfolio Health — Scheme Year — <span className="dashboard-info">i</span></div>
          <div className="dashboard-health-head">
            <div className="dashboard-health-ring">—</div>
            <div><div className="dashboard-extra-title">Not available</div><div className="dashboard-extra-note">Score: —/100 · Evidence target is a guide, not a requirement</div></div>
          </div>
          <div className="dashboard-controlled-empty">The legacy portfolio-health score is not part of the canonical Supabase read model.</div>
        </section>
        <section className="dashboard-radar-panel">
          <div className="dashboard-card-label">Competence Area Coverage</div>
          <div className="dashboard-radar-head">
            <div className="dashboard-radar-title">Spider graph by competence area</div>
            <div className="dashboard-radar-controls">
              <label htmlFor="coverage-year">Target year</label>
              <select id="coverage-year" value={coverageYear} onChange={(event) => setCoverageYear(Number(event.target.value) as 1 | 2 | 3 | 4)}>
                <option value={1}>Year 1</option><option value={2}>Year 2</option><option value={3}>Year 3</option><option value={4}>Year 4+</option>
              </select>
              <div className="dashboard-extra-note">Area-averaged current vs Year {coverageYear === 4 ? "4+" : coverageYear} requirement</div>
            </div>
          </div>
          <CompetenceAreaCoverageChart data={areaCoverage} />
        </section>
      </div>

      <section className="area-progress dashboard-panel">
        <h3>Assessment status by competence</h3>
        {baselineActive ? (
          <p className="dashboard-baseline-message">
            Baseline setup is active. L1 is not treated as formally started until the mentor starts the L1 cycle.
          </p>
        ) : null}
        <div className="dashboard-status-strip">
          <Status label="Not reviewed" value={statusCounts["not-reviewed"]} tone="neutral" />
          <Status label="More evidence" value={statusCounts["more-evidence"]} tone="warning" />
          <Status label="Demonstrated" value={statusCounts.demonstrated} tone="success" />
        </div>
        <TableWrap><table className="dashboard-table"><thead><tr><th>Competence</th><th>Current</th><th>Target</th><th>Mentor status</th><th>Evidence</th><th>Open actions</th><th>Controls</th></tr></thead><tbody>
          {competencyRows.map((row) => <tr key={row.definition.id}>
            <td><div className="dashboard-row-title">{row.definition.reference} · {row.definition.objective}</div><div className="dashboard-row-meta">{row.definition.area}</div></td>
            <td><Level value={baselineActive ? "BL" : (row.current ?? "—")} /></td><td><Level value={candidate.schemeStartDate ? row.target : "—"} /></td>
            <td><AssessmentStatus value={row.assessment?.status ?? "not-reviewed"} /></td>
            <td>{row.evidence} entries · {row.verified} verified</td><td>{row.openActions}</td>
            <td><Button onClick={() => onOpenTab("Matrix")}>Open matrix</Button></td>
          </tr>)}
        </tbody></table></TableWrap>
      </section>

      <section className="area-progress dashboard-panel">
        <h3>Action review queue</h3>
        <TableWrap><table className="dashboard-table"><thead><tr><th>Action</th><th>Owner</th><th>Due</th><th>Status</th><th>Evidence</th><th>Controls</th></tr></thead><tbody>
          {priorityActions.length ? priorityActions.map((action) => {
            const definition = matrix.definitions.find((item) => item.id === action.competencyId);
            const responses = portfolio.actionLinks.filter((link) => link.developmentActionId === action.id).length;
            const overdue = action.dueDate && action.dueDate < portfolio.today;
            return <tr key={action.id}><td><div className="dashboard-row-title">{definition?.reference ?? "Action"} · {action.title}</div><div className="dashboard-row-meta">{definition?.area ?? ""}{action.priority === "high" ? " · High priority" : ""}</div></td><td className="capitalize">{action.owner}</td><td>{action.dueDate ?? "—"} {overdue ? <span className="dashboard-chip danger">Overdue</span> : null}</td><td><span className="dashboard-chip">{displayLabel(action.status)}</span></td><td>{responses ? <span className="dashboard-chip linked">{responses} response{responses === 1 ? "" : "s"}</span> : <span className="dashboard-chip">No response</span>}</td><td><Button onClick={() => onOpenTab("Portfolio")}>Open action</Button></td></tr>;
          }) : <EmptyRow columns={6}>No active action priorities.</EmptyRow>}
        </tbody></table></TableWrap>
      </section>

      <section className="area-progress dashboard-panel">
        <h3>Evidence review queue</h3>
        <TableWrap><table className="dashboard-table"><thead><tr><th>Evidence</th><th>Competence</th><th>Claim level</th><th>Status</th><th>Action link</th><th>Controls</th></tr></thead><tbody>
          {reviewEvidence.length ? reviewEvidence.map((entry) => {
            const links = getCompetencyLinksForEvidence(entry.id, portfolio.competencyLinks, true);
            const primary = links[0] ? matrix.definitions.find((item) => item.id === links[0].competencyId) : null;
            const actions = getActionsForEvidence(entry.id, portfolio.actions, portfolio.actionLinks, true);
            return <tr key={entry.id}><td><div className="dashboard-row-title">{entry.title || "Untitled evidence"}</div><div className="dashboard-row-meta">{entry.projectReference || "No project/reference entered"}</div></td><td><span className="dashboard-chip">{primary?.reference ?? "—"}</span><div className="dashboard-row-meta">{primary?.area ?? ""}</div></td><td><Level value={entry.claimedLevel} /></td><td><span className="dashboard-chip warning">{entry.verificationStatus === "reverification-required" ? "Re-review" : "Needs review"}</span></td><td>{actions.length ? actions.map((action) => <span key={action.id} className="dashboard-chip linked">{action.title}</span>) : <span className="dashboard-chip">—</span>}</td><td><Button onClick={() => onOpenTab("Portfolio")}>Open / edit</Button></td></tr>;
          }) : <EmptyRow columns={6}>No evidence is waiting for mentor review.</EmptyRow>}
        </tbody></table></TableWrap>
      </section>

      <section className="area-progress dashboard-panel">
        <h3>Current assessed levels</h3>
        <div className="dashboard-level-grid">{LEVELS.map((level) => <div className="portfolio-card" key={level}><div className="pc-label">{level}</div><div className="pc-value">{levelCounts.get(level) ?? 0}</div><div className="dashboard-row-meta">competence{levelCounts.get(level) === 1 ? "" : "s"}</div></div>)}</div>
        <p className="dashboard-closing-copy">Current levels are taken from each competency’s authoritative active cycle. Use Portfolio → Matrix for mentor assessment decisions.</p>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) { return <div className="candidate-summary-item"><span>{label}</span><strong>{value}</strong></div>; }
function Kpi({ value, suffix, label, detail, hot = false }: { value: number; suffix?: string; label: string; detail?: string; hot?: boolean }) { return <div className={`dash-card${hot ? " hot" : ""}`}><div className="num">{value}{suffix ? <small>{suffix}</small> : null}</div><div className="label">{label}{detail ? <span>{detail}</span> : null}</div></div>; }
function Level({ value }: { value: string }) {
  return <span className="level-pill" data-level={value}>{value}</span>;
}
function Status({ label, value, tone }: { label: string; value: number; tone: string }) { return <span className={`dashboard-chip ${tone}`}>{label}: {value}</span>; }
function AssessmentStatus({ value }: { value: MentorAssessmentStatus }) { return <span className={`dashboard-chip ${value === "demonstrated" ? "success" : value === "more-evidence" ? "warning" : "neutral"}`}>{displayLabel(value)}</span>; }
function Button({ children, onClick }: { children: React.ReactNode; onClick: () => void }) { return <button type="button" onClick={onClick} className="dashboard-button secondary">{children}</button>; }
function TableWrap({ children }: { children: React.ReactNode }) { return <div className="dashboard-table-wrap">{children}</div>; }
function EmptyRow({ columns, children }: { columns: number; children: React.ReactNode }) { return <tr><td colSpan={columns}><div className="dashboard-empty">{children}</div></td></tr>; }
