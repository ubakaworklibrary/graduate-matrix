"use client";

import { useState } from "react";
import { completeCompetencyCycle, initializeCompetency, reopenCompetencyLevel, resetCompetencyCycle, saveMentorAssessment } from "@/app/mentor-actions";
import type { MentorWorkflowView } from "@/lib/graduate-matrix/mappers/mentor-workflow";
import type { CompetencyCycle, CompetencyCycleId, CompetencyDefinition, CompetencyLevel, DevelopmentAction, EvidenceEntry } from "@/types/graduate-matrix";
import Modal from "./Modal";

const LEVELS: readonly CompetencyLevel[] = ["L1", "L2", "L3", "L4", "L5"];

interface MentorAssessmentProps {
  candidateId: string;
  definition: CompetencyDefinition;
  item: MentorWorkflowView["competencies"][number] | null;
  mentors: MentorWorkflowView["mentors"];
  managers: MentorWorkflowView["managers"];
  cycles: Record<CompetencyCycleId, CompetencyCycle>;
  evidence: EvidenceEntry[];
  actions: DevelopmentAction[];
}

function HiddenIds({ candidateId, competencyId, cycleId }: { candidateId: string; competencyId: string; cycleId: string }) {
  return <><input type="hidden" name="candidateId" value={candidateId} /><input type="hidden" name="candidateCompetencyId" value={competencyId} /><input type="hidden" name="expectedCycleId" value={cycleId} /></>;
}

function label(value: string) { return value.replaceAll("-", " "); }

export default function MentorAssessment({ candidateId, definition, item, mentors, managers, cycles, evidence, actions }: MentorAssessmentProps) {
  if (!item) return <form action={initializeCompetency} className="mentor-initialize"><input type="hidden" name="candidateId" value={candidateId} /><input type="hidden" name="competencyDefinitionId" value={definition.id} /><strong>This competency has not been initialized.</strong><input name="reason" required placeholder="Initialization reason" /><button className="btn-primary">Initialize at L1</button></form>;
  if (!item.activeCycleId) return <div className="mentor-process-note">This competency has no authoritative active cycle.</div>;

  return <MentorAssessmentActive candidateId={candidateId} definition={definition} item={{ ...item, activeCycleId: item.activeCycleId }} mentors={mentors} managers={managers} cycles={cycles} evidence={evidence} actions={actions} />;
}

function MentorAssessmentActive({ candidateId, definition, item, mentors, managers, cycles, evidence, actions }: MentorAssessmentProps & { item: MentorWorkflowView["competencies"][number] & { activeCycleId: string } }) {
  const assessments = item.assessments.filter((entry) => entry.cycleId === item.activeCycleId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const current = assessments[0];
  const reviews = item.reviews.filter((entry) => entry.cycleId === item.activeCycleId).sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  const competencyCycles = Object.values(cycles).filter((cycle) => cycle.competencyId === definition.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [status, setStatus] = useState(current?.status ?? "not-reviewed");
  const [recommendation, setRecommendation] = useState(current?.recommendation ?? "not-set");
  const [modal, setModal] = useState<"complete" | "select" | "history" | CompetencyLevel | null>(null);
  const persistedReady = current?.status === "demonstrated" && current.recommendation === "progress-discussion";
  const draftReady = status === "demonstrated" && recommendation === "progress-discussion";
  const levelEvidence = evidence.filter((entry) => entry.claimedLevel === item.activeLevel);
  const verified = levelEvidence.filter((entry) => entry.verificationStatus === "verified").length;
  const earlierLevels = item.activeLevel ? LEVELS.slice(0, LEVELS.indexOf(item.activeLevel)) : [];
  const eligible = assessments.filter((entry) => entry.status === "demonstrated" && entry.recommendation === "progress-discussion");

  return <div className="mentor-original-card">
    <h3>Mentor-controlled assessment</h3>
    <p className="mentor-process-note">The candidate is currently in the <strong>{item.activeLevel} cycle</strong>. Use the level containers to review cycle evidence, actions and saved review logs.</p>
    <div className="mentor-cycle-strip">{LEVELS.map((level) => {
      const cycle = competencyCycles.find((entry) => entry.level === level);
      const state = cycle?.status ?? "locked";
      const active = cycle?.id === item.activeCycleId;
      return <article className={`mentor-cycle-card state-${state}${active ? " active" : ""}`} key={level}><div><strong>{level} cycle</strong><span>{label(state)}</span></div><p>{active ? "Single source: open cycle controls the current level" : state === "completed" ? "Completed cycle" : state === "paused" ? "Paused · evidence retained" : state === "locked" ? "Locked until the previous cycle is completed" : "Archived cycle"}</p>{active ? <em>Current source</em> : null}<button type="button" className={cycle ? "btn-secondary" : "btn-ghost"} disabled={!cycle} onClick={() => setModal(level)}>{cycle ? "Open" : "Locked"}</button></article>;
    })}</div>

    <form action={saveMentorAssessment} className="mentor-decision-form">
      <h4>Mentor decision inputs</h4><HiddenIds candidateId={candidateId} competencyId={item.candidateCompetencyId} cycleId={item.activeCycleId} />{current ? <input type="hidden" name="assessmentId" value={current.id} /> : null}
      <div className="mentor-decision-grid">
        <label className={`decision-input ${status === "demonstrated" ? "green" : status === "more-evidence" ? "amber" : "neutral"}`}><span>Assessment status</span><select name="status" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="not-reviewed">Not reviewed</option><option value="more-evidence">More evidence required</option><option value="demonstrated">Demonstrated at current level</option></select></label>
        <label className={`decision-input ${recommendation === "progress-discussion" ? "green" : recommendation === "maintain-level" ? "amber" : "neutral"}`}><span>Discuss progression</span><select name="recommendation" value={recommendation} onChange={(event) => setRecommendation(event.target.value as typeof recommendation)}><option value="not-set">Not set</option><option value="maintain-level">Remain at current level</option><option value="progress-discussion">Discuss progression</option></select></label>
        <div className="mentor-readonly"><span>Last saved review</span>{reviews[0] ? `${reviews[0].reviewedAt.slice(0, 10)} · ${reviews[0].reviewedBy}` : "No reviews logged yet"}</div>
        <div className="mentor-readonly"><span>Evidence</span>Viewing {item.activeLevel}: {levelEvidence.length} entries · {verified} verified</div>
      </div>
      <label className="mentor-rationale"><span>Mentor next action / rationale</span><textarea name="nextAction" defaultValue={current?.nextAction ?? ""} placeholder="Example: Candidate has demonstrated this level. Agree progression and carry forward one action into the next cycle." /></label>
      <div className="mentor-toolbar"><button className="btn-secondary" type="button" disabled={!persistedReady} onClick={() => setModal("complete")}>Complete current level and open next level</button><button className="btn-secondary" type="button" onClick={() => setModal("select")}>Select cycle</button><button className="btn-primary">Save mentor assessment</button></div>
      <div className={`mentor-gate ${persistedReady ? "ready" : "locked"}`}>{persistedReady ? "Level-cycle completion is unlocked: the saved status and recommendation support progression. Manager sign-off is checked in the completion workflow." : draftReady ? "Save this mentor assessment to unlock level-cycle completion." : `Level-cycle completion is locked until these are set: ${status !== "demonstrated" ? "Assessment status = Demonstrated at current level" : ""}${status !== "demonstrated" && recommendation !== "progress-discussion" ? "; " : ""}${recommendation !== "progress-discussion" ? "Progression recommendation = Discuss progression" : ""}.`}</div>
    </form>

    <div className="mentor-history-summary"><div><strong>Assessment cycle history</strong><span>{competencyCycles.filter((cycle) => cycle.id !== item.activeCycleId).length || "No"} historical cycle records · {item.activeLevel} {label(item.activeStatus ?? "open")}</span></div><button className="btn-secondary" type="button" onClick={() => setModal("history")}>View cycle history</button></div>

    {modal === "complete" ? <CompletionModal item={item} candidateId={candidateId} mentors={mentors} managers={managers} eligible={eligible} onClose={() => setModal(null)} /> : null}
    {modal === "select" ? <SelectCycleModal item={item} candidateId={candidateId} earlierLevels={earlierLevels} onClose={() => setModal(null)} /> : null}
    {modal === "history" ? <Modal title={`Assessment cycle history · ${definition.reference}`} size="lg" onClose={() => setModal(null)} footer={<button className="btn-primary" onClick={() => setModal(null)}>Close</button>}><div className="mentor-history-list">{competencyCycles.map((cycle) => <div key={cycle.id}><strong>{cycle.level} · {label(cycle.status)}</strong><span>{cycle.openedAt?.slice(0, 10) ?? "Not opened"}{cycle.openedBy ? ` · ${cycle.openedBy}` : ""}{cycle.completedAt ? ` · completed ${cycle.completedAt.slice(0, 10)}` : ""}</span></div>)}</div></Modal> : null}
    {LEVELS.includes(modal as CompetencyLevel) ? <CycleDetailModal level={modal as CompetencyLevel} definition={definition} cycles={competencyCycles} evidence={evidence} actions={actions} item={item} onClose={() => setModal(null)} /> : null}
  </div>;
}

function CompletionModal({ item, candidateId, mentors, managers, eligible, onClose }: { item: MentorWorkflowView["competencies"][number] & { activeCycleId: string }; candidateId: string; mentors: MentorWorkflowView["mentors"]; managers: MentorWorkflowView["managers"]; eligible: MentorWorkflowView["competencies"][number]["assessments"]; onClose: () => void }) {
  return <Modal title={`Complete ${item.activeLevel} cycle`} size="lg" onClose={onClose} footer={<button className="btn-ghost" onClick={onClose}>Cancel</button>}><form action={completeCompetencyCycle} className="mentor-modal-form"><p>This closes the current level cycle and {item.activeLevel === "L5" ? "records final L5 completion" : "automatically opens the next level cycle"}. Evidence verification remains separate and does not trigger progression.</p><HiddenIds candidateId={candidateId} competencyId={item.candidateCompetencyId} cycleId={item.activeCycleId} /><label>Demonstrated assessment<select name="assessmentId" required defaultValue=""><option value="" disabled>Select saved assessment</option>{eligible.map((entry) => <option key={entry.id} value={entry.id}>{entry.assessedAt?.slice(0, 10)} · {entry.assessedBy}</option>)}</select></label><div className="mentor-modal-grid"><label>Mentor approver<select name="mentorUserId" required defaultValue=""><option value="" disabled>Select mentor</option>{mentors.map((entry) => <option key={entry.userId} value={entry.userId}>{entry.name}</option>)}</select></label><label>Manager approver<select name="managerUserId" required defaultValue=""><option value="" disabled>Select manager</option>{managers.map((entry) => <option key={entry.userId} value={entry.userId}>{entry.name}</option>)}</select></label></div><label>Evidence basis<textarea name="evidenceBasis" required /></label><label>Decision reason<textarea name="reason" required /></label>{item.activeLevel !== "L5" ? <div className="mentor-carry">{item.activeActions.map((action) => <label key={action.id}><input type="checkbox" name="carryActionId" value={action.id} /><span>{action.title}</span><input type="date" name={`due-${action.id}`} defaultValue={action.dueDate ?? ""} /></label>)}</div> : null}<label className="mentor-confirm"><input type="checkbox" name="managerConfirmed" value="yes" required />Manager sign-off confirmed.</label><button className="btn-primary">Complete {item.activeLevel} cycle</button></form></Modal>;
}

function SelectCycleModal({ item, candidateId, earlierLevels, onClose }: { item: MentorWorkflowView["competencies"][number] & { activeCycleId: string }; candidateId: string; earlierLevels: readonly CompetencyLevel[]; onClose: () => void }) {
  return <Modal title="Select assessment cycle" size="lg" onClose={onClose} footer={<button className="btn-primary" onClick={onClose}>Close</button>}><p>Reopening an earlier level pauses later opened cycles and retains their evidence history.</p>{earlierLevels.length ? <form action={reopenCompetencyLevel} className="mentor-modal-form"><HiddenIds candidateId={candidateId} competencyId={item.candidateCompetencyId} cycleId={item.activeCycleId} /><label>Earlier level<select name="level">{earlierLevels.map((level) => <option key={level}>{level}</option>)}</select></label><label>Reason<input name="reason" required /></label><label className="mentor-confirm"><input type="checkbox" required />Confirm cycle selection</label><button className="btn-primary">Reopen selected level</button></form> : <p>No earlier level is available.</p>}<form action={resetCompetencyCycle} className="mentor-modal-form mentor-reset"><HiddenIds candidateId={candidateId} competencyId={item.candidateCompetencyId} cycleId={item.activeCycleId} /><label>Reset reason<input name="reason" required /></label><label className="mentor-confirm"><input type="checkbox" required />Confirm active-cycle reset</label><button className="btn-secondary">Reset active cycle</button></form></Modal>;
}

function CycleDetailModal({ level, definition, cycles, evidence, actions, item, onClose }: { level: CompetencyLevel; definition: CompetencyDefinition; cycles: CompetencyCycle[]; evidence: EvidenceEntry[]; actions: DevelopmentAction[]; item: MentorWorkflowView["competencies"][number]; onClose: () => void }) {
  const cycle = cycles.find((entry) => entry.level === level); const entries = evidence.filter((entry) => entry.claimedLevel === level); const cycleActions = cycle ? actions.filter((entry) => entry.cycleId === cycle.id) : []; const cycleReviews = cycle ? item.reviews.filter((entry) => entry.cycleId === cycle.id) : [];
  return <Modal title={`${level} cycle detail · ${definition.reference}`} size="lg" onClose={onClose} footer={<button className="btn-primary" onClick={onClose}>Close</button>}><div className="mentor-cycle-detail"><div><span>Status</span><strong>{cycle ? label(cycle.status) : "Locked"}</strong></div><div><span>Evidence</span><strong>{entries.length} entries · {entries.filter((entry) => entry.verificationStatus === "verified").length} verified</strong></div><div><span>Actions</span><strong>{cycleActions.length}</strong></div><div><span>Review logs</span><strong>{cycleReviews.length}</strong></div></div></Modal>;
}
