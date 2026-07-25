"use client";

import { useRef, useState } from "react";
import {
  assignPlacementTasks,
  recordPlacementTaskVerification,
  updatePlacementTaskProgress,
} from "@/app/placement-actions";
import { getPlacementDisciplineLabel } from "@/lib/graduate-matrix/data/placements";
import type {
  CandidatePlacementTask,
  CandidatePlacementWorkspace,
  PlacementDiscipline,
  PlacementTaskProgress,
  PlacementVerificationStatus,
  PlacementsViewModel,
} from "@/types/graduate-matrix";
import Modal from "./Modal";

const PROGRESS_LABELS: Record<PlacementTaskProgress, string> = {
  "not-started": "Not started",
  "in-progress": "In progress",
  complete: "Complete",
};

const PROGRESS_TONE: Record<PlacementTaskProgress, { background: string; borderColor: string; color: string }> = {
  "not-started": { background: "#f8f9fc", borderColor: "#dde2ea", color: "#555" },
  "in-progress": { background: "#fef9e7", borderColor: "#f0e2a8", color: "#8a6d00" },
  complete: { background: "#e8f8f5", borderColor: "#00a786", color: "#1a7a60" },
};

const VERIFICATION_LABELS: Record<PlacementVerificationStatus, string> = {
  unverified: "Not verified",
  verified: "Verified",
  "changes-required": "Changes required",
  "reverification-required": "Reverification required",
};

const STAGE_LABELS: Record<string, string> = {
  graduate: "Graduate",
  "graduate-intermediate": "Graduate / Intermediate",
  intermediate: "Intermediate",
};

function displayStage(stage: string): string {
  return STAGE_LABELS[stage] ?? stage;
}

function verificationTone(status: PlacementVerificationStatus): "good" | "warn" | "" {
  if (status === "verified") return "good";
  if (status === "changes-required" || status === "reverification-required") return "warn";
  return "";
}

interface PlacementsPanelProps {
  candidateId: string;
  viewModel: PlacementsViewModel;
  initialDiscipline?: PlacementDiscipline;
}

export default function PlacementsPanel({ candidateId, viewModel, initialDiscipline }: PlacementsPanelProps) {
  const [selectedDiscipline, setSelectedDiscipline] = useState<PlacementDiscipline | null>(
    initialDiscipline && viewModel.eligibleDisciplines.includes(initialDiscipline)
      ? initialDiscipline
      : viewModel.eligibleDisciplines[0] ?? null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  if (viewModel.state === "error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2>Placements unavailable</h2>
        <p className="mt-2 text-sm text-text-secondary">We could not load Placements information. Please refresh the page or try again later.</p>
      </section>
    );
  }
  if (viewModel.state === "integrity-error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2>Placements data needs attention</h2>
        <p className="mt-2 text-sm text-text-secondary">The stored placement records do not match the current Graduate Matrix framework. Please contact an administrator.</p>
      </section>
    );
  }
  if (viewModel.state === "unsupported-discipline") {
    return (
      <section className="rounded-lg border border-border bg-surface p-6">
        <h2>Placement disciplines not available</h2>
        <p className="mt-2 text-sm text-text-secondary">Placement disciplines cannot yet be determined for this candidate. Confirm the candidate&rsquo;s home discipline on the Candidate page, then return here.</p>
      </section>
    );
  }

  const workspace = viewModel.workspaces.find((item) => item.discipline === selectedDiscipline) ?? viewModel.workspaces[0] ?? null;

  return (
    <div className="matrix-view">
      <div>
        <div className="comp-list">
          {viewModel.workspaces.map((item) => {
            const meta = item.summary.selectedTaskCount === 0
              ? "No tasks selected yet"
              : `${item.summary.candidateCompleteCount} complete · ${item.summary.verifiedCount} verified`;
            return (
              <div
                key={item.discipline}
                className={`comp-row${workspace?.discipline === item.discipline ? " selected" : ""}`}
                onClick={() => setSelectedDiscipline(item.discipline)}
              >
                <div className="comp-ref">{item.summary.selectedTaskCount}</div>
                <div className="comp-row-body">
                  <div className="comp-title">{getPlacementDisciplineLabel(item.discipline)}</div>
                  <div className="comp-area-label">{meta}</div>
                </div>
                <div className="comp-row-meta">
                  {item.summary.changesRequiredCount > 0 ? <span className="portfolio-chip warn">{item.summary.changesRequiredCount} changes required</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`detail-panel${workspace ? "" : " empty"}`}>
        {!workspace ? (
          "Select a placement discipline on the left to view detail."
        ) : (
          <PlacementWorkspaceDetail
            candidateId={candidateId}
            workspace={workspace}
            canAssignTasks={viewModel.canAssignTasks}
            canUpdateCandidateProgress={viewModel.canUpdateCandidateProgress}
            canVerifyTasks={viewModel.canVerifyTasks}
            onOpenAddTasks={() => setModalOpen(true)}
          />
        )}
      </div>

      {modalOpen && workspace ? (
        <AddTasksModal candidateId={candidateId} workspace={workspace} onClose={() => setModalOpen(false)} />
      ) : null}
    </div>
  );
}

function PlacementSummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="portfolio-card">
      <div className="pc-label">{label}</div>
      <div className="pc-value">{value}</div>
    </div>
  );
}

function PlacementWorkspaceDetail({
  candidateId,
  workspace,
  canAssignTasks,
  canUpdateCandidateProgress,
  canVerifyTasks,
  onOpenAddTasks,
}: {
  candidateId: string;
  workspace: CandidatePlacementWorkspace;
  canAssignTasks: boolean;
  canUpdateCandidateProgress: boolean;
  canVerifyTasks: boolean;
  onOpenAddTasks: () => void;
}) {
  const { summary } = workspace;

  return (
    <div>
      <div className="detail-header">
        <span className="detail-ref">{getPlacementDisciplineLabel(workspace.discipline)}</span>
        <p className="detail-objective">Cross-discipline placement tasks selected for this candidate.</p>
      </div>
      <div className="detail-body">
        <div className="portfolio-summary-grid">
          <PlacementSummaryCard label="Selected tasks" value={summary.selectedTaskCount} />
          <PlacementSummaryCard label="Candidate complete" value={summary.candidateCompleteCount} />
          <PlacementSummaryCard label="Mentor verified" value={summary.verifiedCount} />
          <PlacementSummaryCard label="Changes required" value={summary.changesRequiredCount} />
        </div>

        {canAssignTasks ? (
          <div className="flex justify-end">
            <button type="button" className="btn-secondary" onClick={onOpenAddTasks}>Add tasks</button>
          </div>
        ) : null}

        {workspace.assignedTasks.length === 0 ? (
          <section className="rounded-lg border border-dashed border-border bg-surface p-6 text-center text-[12.5px] text-text-muted">
            No placement tasks selected yet.
          </section>
        ) : (
          <div className="space-y-3">
            {workspace.assignedTasks.map((task) => (
              <PlacementTaskCard
                key={task.id}
                candidateId={candidateId}
                discipline={workspace.discipline}
                task={task}
                canUpdateCandidateProgress={canUpdateCandidateProgress}
                canVerifyTasks={canVerifyTasks}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlacementTaskCard({
  candidateId,
  discipline,
  task,
  canUpdateCandidateProgress,
  canVerifyTasks,
}: {
  candidateId: string;
  discipline: PlacementDiscipline;
  task: CandidatePlacementTask;
  canUpdateCandidateProgress: boolean;
  canVerifyTasks: boolean;
}) {
  const progressFormRef = useRef<HTMLFormElement>(null);
  const [editingVerification, setEditingVerification] = useState(false);
  const tone = verificationTone(task.currentVerificationStatus);
  const progressTone = PROGRESS_TONE[task.candidateProgress];

  return (
    <div className="space-y-3 rounded-lg border border-[#b8bec8] bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[13px] font-bold text-ink">{task.taskDefinition.title}</div>
          <p className="mt-1 text-[12px] text-text-secondary">{task.taskDefinition.description}</p>
          {task.taskDefinition.suggestedStage ? (
            <span className="portfolio-chip mt-2 inline-block">{displayStage(task.taskDefinition.suggestedStage)}</span>
          ) : null}
        </div>
        <span className={`portfolio-chip ${tone}`}>{VERIFICATION_LABELS[task.currentVerificationStatus]}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Progress</span>
        {canUpdateCandidateProgress ? (
          <form ref={progressFormRef} action={updatePlacementTaskProgress}>
            <input type="hidden" name="candidateId" value={candidateId} />
            <input type="hidden" name="placementDiscipline" value={discipline} />
            <input type="hidden" name="candidatePlacementTaskId" value={task.id} />
            <input type="hidden" name="candidateNote" value={task.candidateNote} />
            <span className="relative inline-flex min-w-[130px] items-center">
              <select
                aria-label={`${task.taskDefinition.title} progress`}
                name="candidateProgress"
                defaultValue={task.candidateProgress}
                onChange={() => progressFormRef.current?.requestSubmit()}
                className="inline-block max-w-full appearance-none rounded border text-[10.5px] font-extrabold uppercase leading-[1.2]"
                style={{
                  backgroundColor: progressTone.background,
                  borderColor: progressTone.borderColor,
                  color: progressTone.color,
                  padding: "3px 22px 3px 7px",
                }}
              >
                <option value="not-started">Not started</option>
                <option value="in-progress">In progress</option>
                <option value="complete">Complete</option>
              </select>
              <span aria-hidden="true" className="pointer-events-none absolute right-[7px] text-[10px] font-extrabold" style={{ color: progressTone.color }}>▼</span>
            </span>
          </form>
        ) : (
          <span className="portfolio-chip">{PROGRESS_LABELS[task.candidateProgress]}</span>
        )}
      </div>

      <div className="grid gap-3 border-t border-border pt-3 text-[11.5px] text-text-secondary sm:grid-cols-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Candidate note</div>
          {canUpdateCandidateProgress ? (
            <form action={updatePlacementTaskProgress} className="mt-1">
              <input type="hidden" name="candidateId" value={candidateId} />
              <input type="hidden" name="placementDiscipline" value={discipline} />
              <input type="hidden" name="candidatePlacementTaskId" value={task.id} />
              <input type="hidden" name="candidateProgress" value={task.candidateProgress} />
              <textarea name="candidateNote" defaultValue={task.candidateNote} maxLength={1000} className="min-h-16 w-full rounded border border-border bg-white px-2 py-1.5 text-[12px] normal-case text-ink" />
              <button type="submit" className="btn-secondary mt-1.5">Save note</button>
            </form>
          ) : (
            <p className="mt-1 whitespace-pre-wrap">{task.candidateNote || "—"}</p>
          )}
          {task.candidateUpdatedAt ? (
            <p className="mt-1 text-[10.5px] text-text-muted">Updated {task.candidateUpdatedAt.slice(0, 10)} by {task.candidateUpdatedByDisplayName ?? "the candidate"}</p>
          ) : null}
        </div>
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">Latest mentor comment</div>
          <p className="mt-1 whitespace-pre-wrap">{task.latestVerificationEvent?.mentorComment || "—"}</p>
          <p className="mt-1 text-[10.5px] text-text-muted">Assigned {task.assignedAt.slice(0, 10)} by {task.assignedByDisplayName}</p>
        </div>
      </div>

      {canVerifyTasks ? (
        editingVerification ? (
          <form action={recordPlacementTaskVerification} className="border-t border-border pt-3">
            <input type="hidden" name="candidateId" value={candidateId} />
            <input type="hidden" name="placementDiscipline" value={discipline} />
            <input type="hidden" name="candidatePlacementTaskId" value={task.id} />
            <label className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">
              Mentor comment
              <textarea name="mentorComment" maxLength={1000} className="mt-1 min-h-16 w-full rounded border border-border bg-white px-2 py-1.5 text-[12px] normal-case text-ink" />
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button type="submit" name="decision" value="verified" className="btn-secondary" disabled={task.candidateProgress !== "complete"}>Verify</button>
              <button type="submit" name="decision" value="changes-required" className="btn-ghost">Changes required</button>
              <button type="button" className="btn-ghost" onClick={() => setEditingVerification(false)}>Cancel</button>
            </div>
            {task.candidateProgress !== "complete" ? (
              <p className="mt-1 text-[10.5px] text-text-muted">Verify is available once candidate progress is Complete.</p>
            ) : null}
          </form>
        ) : (
          <div className="border-t border-border pt-3">
            <button type="button" className="btn-secondary" onClick={() => setEditingVerification(true)}>Record verification</button>
          </div>
        )
      ) : null}

      {task.verificationHistory.length > 0 ? (
        <details className="border-t border-border pt-3">
          <summary className="cursor-pointer text-[11px] font-bold text-accent">Verification history ({task.verificationHistory.length})</summary>
          <ul className="mt-2 space-y-2">
            {task.verificationHistory.map((event) => (
              <li key={event.id} className="rounded border border-border bg-white p-2 text-[11px] text-text-secondary">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`portfolio-chip ${verificationTone(event.eventType)}`}>{VERIFICATION_LABELS[event.eventType]}</span>
                  <span className="text-[10.5px] text-text-muted">{event.occurredAt.slice(0, 10)} · {event.actorDisplayName}</span>
                </div>
                {event.mentorComment ? <p className="mt-1 whitespace-pre-wrap">{event.mentorComment}</p> : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

function AddTasksModal({
  candidateId,
  workspace,
  onClose,
}: {
  candidateId: string;
  workspace: CandidatePlacementWorkspace;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Modal
      title={`Add ${getPlacementDisciplineLabel(workspace.discipline)} placement tasks`}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          {workspace.availableTaskDefinitions.length > 0 ? (
            <button type="submit" form="add-placement-tasks-form" className="btn-primary" disabled={selected.size === 0}>
              OK{selected.size ? ` (${selected.size})` : ""}
            </button>
          ) : null}
        </>
      }
    >
      {workspace.availableTaskDefinitions.length === 0 ? (
        <p className="text-[12.5px] text-text-secondary">All available tasks for this discipline have already been selected.</p>
      ) : (
        <form id="add-placement-tasks-form" action={assignPlacementTasks}>
          <input type="hidden" name="candidateId" value={candidateId} />
          <input type="hidden" name="placementDiscipline" value={workspace.discipline} />
          <div className="space-y-2">
            {workspace.availableTaskDefinitions.map((definition) => (
              <label key={definition.id} className="gm-modal-option">
                <input
                  type="checkbox"
                  name="taskDefinitionIds"
                  value={definition.id}
                  checked={selected.has(definition.id)}
                  onChange={() => toggle(definition.id)}
                />
                <span>
                  <span className="gm-modal-option-title">{definition.title}</span>
                  <span className="gm-modal-option-description">{definition.description}</span>
                  {definition.suggestedStage ? <span className="portfolio-chip mt-1 inline-block">{displayStage(definition.suggestedStage)}</span> : null}
                </span>
              </label>
            ))}
          </div>
        </form>
      )}
    </Modal>
  );
}
