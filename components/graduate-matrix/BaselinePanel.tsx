"use client";

import { useState } from "react";
import { saveBaselineChecklist, startL1Cycle } from "@/app/mentor-actions";
import type { BaselineReadinessSummary } from "@/lib/graduate-matrix/readiness";
import type { BaselineSetup, BaselineTaskStatus } from "@/types/graduate-matrix";

export type BaselineViewState = "loaded" | "not-configured" | "error" | "definition-mismatch";

export interface CandidateBaselineView {
  state: BaselineViewState;
  setup: BaselineSetup | null;
  readiness: BaselineReadinessSummary | null;
}

interface BaselinePanelProps {
  baseline: CandidateBaselineView;
  candidateId: string;
  minimumReady: boolean;
  canStartL1: boolean;
  minimumValues: { firstName: string; surname: string; schemeStartDate: string };
}

const statusLabels: Record<BaselineTaskStatus, string> = {
  "not-complete": "Not complete",
  complete: "Complete",
  waived: "Waived",
};

export default function BaselinePanel({ baseline, candidateId, minimumReady, canStartL1, minimumValues }: BaselinePanelProps) {
  const initialStatuses = Object.fromEntries(
    (baseline.readiness?.tasks ?? [])
      .filter(({ definition }) => definition.completionMode === "mentor")
      .map(({ definition, status }) => [definition.id, status === "complete" ? "complete" : "not-complete"]),
  ) as Record<string, "not-complete" | "complete">;
  const [manualStatuses, setManualStatuses] = useState(initialStatuses);

  if (baseline.state === "error") {
    return <section className="min-w-0 rounded-lg border border-[#c8ced8] bg-white px-[14px] py-3 text-[#555] shadow-[0_1px_4px_rgba(0,0,0,0.06)]"><h3 className="text-[15px] font-extrabold leading-[1.2] text-[#1a1a2e]">Baseline readiness unavailable</h3><p>We could not load baseline setup information. Please refresh the page or try again later.</p></section>;
  }
  if (baseline.state === "definition-mismatch" || !baseline.readiness) {
    return <section className="min-w-0 rounded-lg border border-[#c8ced8] bg-white px-[14px] py-3 text-[#555] shadow-[0_1px_4px_rgba(0,0,0,0.06)]"><h3 className="text-[15px] font-extrabold leading-[1.2] text-[#1a1a2e]">Baseline setup needs attention</h3><p>The stored baseline task definitions do not match the current Graduate Matrix framework. Please contact an administrator.</p></section>;
  }

  const { readiness, setup } = baseline;
  const started = setup?.status === "completed" || Boolean(setup?.formalTrainingStartedAt);
  const requiredComplete = readiness.tasks.filter(({ definition, status }) => {
    if (!definition.mandatory) return false;
    const current = definition.completionMode === "mentor"
      ? (manualStatuses[definition.id] ?? "not-complete")
      : status;
    return current === "complete" || current === "waived";
  }).length;

  const bottomStartL1Action = !started ? (
    canStartL1 ? <form action={startL1Cycle}>
        <input type="hidden" name="candidateId" value={candidateId} />
        <input type="hidden" name="firstName" value={minimumValues.firstName} />
        <input type="hidden" name="surname" value={minimumValues.surname} />
        <input type="hidden" name="schemeStartDate" value={minimumValues.schemeStartDate} />
        <button className="rounded bg-[#00a786] px-[11px] py-[7px] text-[11.5px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#aeb5bb]" type="submit" disabled={!minimumReady}>Start L1 cycle</button>
      </form> : <span className="text-[11.5px] font-bold text-[#555]">Mentor action required to start L1.</span>
  ) : null;

  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-[#b8bec8] bg-white px-[14px] py-3 text-[#555] shadow-[0_1px_4px_rgba(0,0,0,0.06)]" aria-label="Baseline setup stage">
      <div className="candidate-setup-card-label -mx-[14px] -mt-3">Baseline setup</div>
      <div className="candidate-setup-card-header -mx-[14px] flex min-w-0 items-start gap-[10px] border-b border-[#c8ced8] px-[14px] py-3">
        <div className="min-w-0">
          <p className="mt-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-[#888]">Onboarding checklist — complete alongside L1</p>
          <p className="mt-1 text-[11.5px] font-bold leading-[1.45] text-[#1a1a2e]">
            {started
              ? "L1 cycle has started. The onboarding checklist below can still be completed."
              : "Enter first name, surname and start date, then the mentor can start L1. The onboarding checklist can be completed alongside L1 — it does not block starting."}
          </p>
        </div>
        <span className={`ml-auto whitespace-nowrap rounded-full border px-[7px] py-[3px] text-[10px] font-extrabold uppercase tracking-[0.04em] ${started ? "border-[#00a786] bg-[#e8f8f5] text-[#1a7a60]" : "border-[#f0e2a8] bg-[#fef9e7] text-[#8a6d00]"}`}>{started ? "L1 started" : "Active"}</span>
      </div>
      <form action={saveBaselineChecklist} className="mt-4 overflow-hidden rounded-md border border-[#dde2ea]">
        <input type="hidden" name="candidateId" value={candidateId} />
        <input type="hidden" name="firstName" value={minimumValues.firstName} />
        <input type="hidden" name="surname" value={minimumValues.surname} />
        <input type="hidden" name="schemeStartDate" value={minimumValues.schemeStartDate} />
        <div className="flex flex-wrap items-center justify-between gap-[7px] bg-[#f8f9fc] px-[10px] py-2">
          <h4 className="text-[11px] font-extrabold uppercase tracking-[0.05em] text-[#1a1a2e]">BL readiness checklist</h4>
          <div className="ml-auto flex flex-wrap items-center gap-[7px]">
            {!started && canStartL1 ? <button formAction={startL1Cycle} className="rounded bg-[#00a786] px-[11px] py-[7px] text-[11.5px] font-bold text-white disabled:cursor-not-allowed disabled:bg-[#aeb5bb]" type="submit" disabled={!minimumReady}>Start L1 cycle</button> : null}
            <span className="rounded border border-[#f0e2a8] bg-[#fef9e7] px-[7px] py-[3px] text-[10px] font-extrabold uppercase text-[#8a6d00]">{requiredComplete}/{readiness.totalRequired} required complete</span>
          </div>
        </div>
        <p className="border-t border-[#eef0f4] px-[10px] py-2 text-[10.5px] leading-[1.4] text-[#777]">These are onboarding/readiness tasks only. They do not assess competence and do not count as L1–L5 evidence.</p>
        <div className="baseline-checklist-column-head grid grid-cols-[minmax(250px,1.5fr)_100px_120px_minmax(140px,0.8fr)] items-center gap-[10px] border-t px-[10px] py-[6px] text-[9.5px] font-extrabold uppercase tracking-[0.05em] max-[760px]:hidden" aria-hidden="true"><span>Task</span><span>Owner</span><span>Status</span><span>Note</span></div>
        <div className="baseline-readiness-list">
          {readiness.tasks.map(({ definition, status }) => {
            const manual = definition.completionMode === "mentor";
            const displayStatus = manual ? (manualStatuses[definition.id] ?? "not-complete") : status;
            const stored = setup?.tasks[definition.id];
            return (
              <div className="grid grid-cols-[minmax(250px,1.5fr)_100px_120px_minmax(140px,0.8fr)] items-center gap-[10px] border-t border-[#eef0f4] bg-white px-[10px] py-2 max-[760px]:grid-cols-[minmax(0,1fr)] max-[760px]:items-stretch" key={definition.id}>
                <div className="baseline-readiness-task">
                  <div className="flex flex-wrap items-baseline gap-[5px] text-[12px] font-bold leading-[1.25] text-[#1a1a2e]">{definition.title}{definition.mandatory ? <span className="text-[10px] font-extrabold uppercase tracking-[0.05em] text-[#c62828]">Required</span> : null}</div>
                  <p className="mt-0.5 text-[10.5px] font-normal leading-[1.35] text-[#888]">{definition.description}</p>
                </div>
                <div className="text-[11.5px] font-bold text-[#555] max-[760px]:before:font-normal max-[760px]:before:content-['Owner:_']">{definition.owner}</div>
                <div className="baseline-readiness-control">
                  {manual && canStartL1 ? (
                    <span className="relative inline-flex min-w-[112px] max-w-full items-center">
                    <select
                      aria-label={`${definition.title} status`}
                      className="inline-block max-w-full appearance-none rounded border text-[10.5px] font-extrabold uppercase leading-[1.2]"
                      style={{
                        backgroundColor: displayStatus === "complete" ? "#e8f8f5" : "#fef9e7",
                        borderColor: displayStatus === "complete" ? "#00a786" : "#f0e2a8",
                        color: displayStatus === "complete" ? "#1a7a60" : "#8a6d00",
                        fontSize: "10.5px",
                        fontWeight: 800,
                        lineHeight: 1.2,
                        minWidth: "112px",
                        padding: "3px 24px 3px 7px",
                      }}
                      name={`status:${definition.id}`}
                      value={displayStatus}
                      onChange={(event) => setManualStatuses((current) => ({ ...current, [definition.id]: event.target.value as "not-complete" | "complete" }))}
                    >
                      <option value="not-complete">Not complete</option><option value="complete">Complete</option>
                    </select>
                    <span aria-hidden="true" className={`pointer-events-none absolute right-[7px] text-[10px] font-extrabold ${displayStatus === "complete" ? "text-[#1a7a60]" : "text-[#8a6d00]"}`}>▼</span>
                    </span>
                  ) : <span className={`inline-block max-w-full rounded border px-[7px] py-[3px] text-[10.5px] font-extrabold uppercase leading-[1.2] ${displayStatus === "complete" ? "border-[#00a786] bg-[#e8f8f5] text-[#1a7a60]" : displayStatus === "waived" ? "border-[#dde2ea] bg-[#f8f9fc] text-[#555]" : "border-[#f0e2a8] bg-[#fef9e7] text-[#8a6d00]"}`}>{statusLabels[displayStatus]}</span>}
                </div>
                <div className="baseline-readiness-note">
                  {manual && canStartL1
                    ? <input className="w-full min-w-0 rounded border border-[#dde2ea] px-[7px] py-[5px] text-[11px] text-[#555]" name={`note:${definition.id}`} maxLength={500} defaultValue={stored?.note ?? ""} placeholder="Optional note / date / reference" />
                    : <span className="text-[11px] text-[#777] [overflow-wrap:anywhere]">{stored?.note || "—"}</span>}
                </div>
              </div>
            );
          })}
        </div>
      </form>

      {bottomStartL1Action ? <div className="mt-[10px]">{bottomStartL1Action}</div> : null}
      {!started && !minimumReady ? <div className="mt-[10px] rounded-md border border-[#f0e2a8] border-l-4 border-l-[#e67e22] bg-[#fef9e7] px-[9px] py-[7px] text-[11.5px] text-[#8a6d00]">Enter first name, surname and start date to enable the Start L1 button.</div> : null}
    </section>
  );
}
