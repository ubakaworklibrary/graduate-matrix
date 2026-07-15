import {
  addCompetencyCycleReview,
  completeCompetencyCycle,
  initializeCompetency,
  reopenCompetencyLevel,
  resetCompetencyCycle,
  saveMentorAssessment,
} from "@/app/mentor-actions";
import { COMPETENCY_DEFINITIONS } from "@/lib/graduate-matrix/data/competencies";
import type { MentorWorkflowView } from "@/lib/graduate-matrix/mappers/mentor-workflow";

interface Props {
  candidateId: string;
  workflow: MentorWorkflowView;
}

const levels = ["L1", "L2", "L3", "L4", "L5"] as const;

function HiddenIds({ candidateId, competencyId, cycleId }: { candidateId: string; competencyId: string; cycleId?: string | null }) {
  return <><input type="hidden" name="candidateId" value={candidateId} /><input type="hidden" name="candidateCompetencyId" value={competencyId} />{cycleId ? <input type="hidden" name="expectedCycleId" value={cycleId} /> : null}</>;
}

const inputClass = "rounded-md border border-border bg-surface px-2 py-1.5 text-sm";
const buttonClass = "rounded-md bg-accent px-3 py-1.5 text-sm font-bold text-white";

export default function MentorWorkflowPanel({ candidateId, workflow }: Props) {
  const initialized = new Set(workflow.competencies.map(({ competencyId }) => competencyId));
  return (
    <section className="mb-4 rounded-lg border border-accent/30 bg-surface p-4 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">Authorized mentor workflow</p>
      <h2 className="mt-1 text-xl font-bold">Assess and progress competencies</h2>

      <details className="mt-3 rounded-md border border-border p-3">
        <summary className="cursor-pointer font-bold">Initialize a competency</summary>
        <div className="mt-3 grid gap-2">
          {COMPETENCY_DEFINITIONS.filter(({ id }) => !initialized.has(id)).map((definition) => (
            <form key={definition.id} action={initializeCompetency} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="candidateId" value={candidateId} />
              <input type="hidden" name="competencyDefinitionId" value={definition.id} />
              <span className="w-10 font-mono text-sm font-bold">{definition.reference}</span>
              <input className={`${inputClass} min-w-60 flex-1`} name="reason" required placeholder="Initialization reason" />
              <button className={buttonClass}>Initialize at L1</button>
            </form>
          ))}
          {initialized.size === COMPETENCY_DEFINITIONS.length ? <p className="text-sm text-text-muted">All competencies are initialized.</p> : null}
        </div>
      </details>

      <div className="mt-3 grid gap-3">
        {workflow.competencies.map((item) => {
          const definition = COMPETENCY_DEFINITIONS.find(({ id }) => id === item.competencyId);
          const activeAssessments = item.assessments.filter(({ cycleId }) => cycleId === item.activeCycleId);
          const currentAssessment = activeAssessments[0];
          const eligibleAssessments = activeAssessments.filter(({ status, recommendation }) => status === "demonstrated" && recommendation === "progress-discussion");
          const activeReviews = item.reviews.filter(({ cycleId }) => cycleId === item.activeCycleId);
          const earlierLevels = item.activeLevel ? levels.slice(0, levels.indexOf(item.activeLevel)) : [];

          return (
            <details key={item.candidateCompetencyId} className="rounded-md border border-border bg-page p-3">
              <summary className="cursor-pointer font-bold">
                {definition?.reference ?? item.competencyId} · {item.activeLevel ?? "No active cycle"} · {item.activeStatus ?? "not initialized"}
              </summary>
              {item.activeCycleId ? (
                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <form action={saveMentorAssessment} className="grid gap-2 rounded-md bg-surface p-3">
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

                  <form action={addCompetencyCycleReview} className="grid gap-2 rounded-md bg-surface p-3">
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
                      <div className="grid gap-2 sm:grid-cols-2"><select className={inputClass} name="mentorUserId" required defaultValue=""><option value="" disabled>Actual mentor approver</option>{workflow.mentors.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}</select><select className={inputClass} name="managerUserId" required defaultValue=""><option value="" disabled>Actual manager approver</option>{workflow.managers.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}</select></div>
                      <textarea className={inputClass} name="evidenceBasis" required placeholder="Evidence basis" /><textarea className={inputClass} name="reason" required placeholder="Decision reason" />
                      {item.activeLevel !== "L5" && item.activeActions.length ? <div className="grid gap-2"><p className="text-sm font-bold">Optional carry-forward actions</p>{item.activeActions.map((action) => <label key={action.id} className="flex flex-wrap items-center gap-2 text-sm"><input type="checkbox" name="carryActionId" value={action.id} />{action.title}<input className={inputClass} type="date" name={`due-${action.id}`} defaultValue={action.dueDate ?? ""} /></label>)}</div> : null}
                      <label className="text-sm"><input className="mr-2" type="checkbox" name="managerConfirmed" value="yes" required />Manager sign-off is confirmed and I understand this progression is transactional.</label>
                      <button className={buttonClass}>Complete cycle</button>
                    </form>

                    <form action={resetCompetencyCycle} className="flex flex-wrap items-center gap-2 rounded-md bg-surface p-3">
                      <HiddenIds candidateId={candidateId} competencyId={item.candidateCompetencyId} cycleId={item.activeCycleId} /><input className={`${inputClass} flex-1`} name="reason" required placeholder="Reset reason" /><label className="text-xs"><input className="mr-1" type="checkbox" required />Confirm reset</label><button className={buttonClass}>Reset cycle</button>
                    </form>

                    {earlierLevels.length ? <form action={reopenCompetencyLevel} className="flex flex-wrap items-center gap-2 rounded-md bg-surface p-3">
                      <HiddenIds candidateId={candidateId} competencyId={item.candidateCompetencyId} cycleId={item.activeCycleId} /><select className={inputClass} name="level" required>{earlierLevels.map((level) => <option key={level}>{level}</option>)}</select><input className={`${inputClass} flex-1`} name="reason" required placeholder="Reopen reason" /><label className="text-xs"><input className="mr-1" type="checkbox" required />Confirm reopen</label><button className={buttonClass}>Reopen earlier level</button>
                    </form> : null}
                  </> : null}
                </div>
              ) : <p className="mt-2 text-sm text-text-muted">This persisted competency has no active cycle; initialization cannot be repeated.</p>}
            </details>
          );
        })}
      </div>
    </section>
  );
}
