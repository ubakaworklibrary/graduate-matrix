"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { logout } from "@/app/auth-actions";
import type { CandidateInfo } from "@/types/graduate-matrix";
import CandidatePanel from "./CandidatePanel";
import type { CandidateBaselineView } from "./BaselinePanel";
import type { CandidateMatrixView } from "./MatrixPanel";
import PortfolioPanel, { type CandidatePortfolioView, type PortfolioTab } from "./PortfolioPanel";
import type { PlacementDiscipline, PlacementsViewModel } from "@/types/graduate-matrix";
import MeetingLogPanel, {
  type CandidateMeetingLogView,
} from "./MeetingLogPanel";
import CpdLogPanel, { type CandidateCpdLogView } from "./CpdLogPanel";
import DashboardPanel from "./DashboardPanel";
import GuidePanel from "./GuidePanel";
import type { MentorWorkflowView } from "@/lib/graduate-matrix/mappers/mentor-workflow";
import type { AccessibleCandidate } from "@/lib/graduate-matrix/repositories/candidate-access";

const tabs = [
  "Candidate",
  "Dashboard",
  "Portfolio",
  "CPD Log",
  "Meeting Log",
  "Guide",
] as const;

type Tab = (typeof tabs)[number] | "Matrix" | "Placements";

export type CandidateLoadState =
  | "loaded"
  | "not-linked"
  | "incomplete"
  | "error";

interface GraduateMatrixAppProps {
  candidate: CandidateInfo | null;
  candidateState: CandidateLoadState;
  baseline: CandidateBaselineView | null;
  matrix: CandidateMatrixView | null;
  portfolio: CandidatePortfolioView | null;
  meetingLog: CandidateMeetingLogView | null;
  cpdLog: CandidateCpdLogView | null;
  accessibleCandidates: AccessibleCandidate[];
  selectedCandidateId: string | null;
  mentorWorkflow: MentorWorkflowView | null;
  workflowMessage: { outcome: "success" | "error"; message: string } | null;
  placementsViewModel: PlacementsViewModel | null;
  initialSection: "Candidate" | "Portfolio";
  initialPortfolioTab: PortfolioTab;
  initialPlacementDiscipline: PlacementDiscipline | null;
}

const candidateStateMessages: Record<
  Exclude<CandidateLoadState, "loaded">,
  { title: string; message: string }
> = {
  "not-linked": {
    title: "Candidate profile not linked",
    message:
      "Your user account is not yet linked to a Graduate Matrix candidate profile.",
  },
  incomplete: {
    title: "Candidate setup incomplete",
    message:
      "Your candidate profile exists, but its professional pathway has not been completed yet.",
  },
  error: {
    title: "Candidate profile unavailable",
    message:
      "We could not load your candidate profile. Please refresh the page or try again later.",
  },
};

export default function GraduateMatrixApp({
  candidate,
  candidateState,
  baseline,
  matrix,
  portfolio,
  meetingLog,
  cpdLog,
  accessibleCandidates,
  selectedCandidateId,
  mentorWorkflow,
  workflowMessage,
  placementsViewModel,
  initialSection,
  initialPortfolioTab,
  initialPlacementDiscipline,
}: GraduateMatrixAppProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialSection);
  const [dismissedWorkflowMessage, setDismissedWorkflowMessage] = useState<string | null>(null);
  const workflowMessageKey = workflowMessage ? `${workflowMessage.outcome}:${workflowMessage.message}` : null;
  const visibleWorkflowMessage = workflowMessageKey !== dismissedWorkflowMessage ? workflowMessage : null;

  useEffect(() => {
    if (!workflowMessage) return;
    const cleanUrl = selectedCandidateId
      ? `/?candidate=${encodeURIComponent(selectedCandidateId)}`
      : "/";
    window.history.replaceState(null, "", cleanUrl);
  }, [selectedCandidateId, workflowMessage]);
  useEffect(() => {
    if (!workflowMessageKey || workflowMessage?.outcome !== "success") return;
    const timer = window.setTimeout(() => setDismissedWorkflowMessage(workflowMessageKey), 4000);
    return () => window.clearTimeout(timer);
  }, [workflowMessage?.outcome, workflowMessageKey]);
  return (
    <div data-graduate-matrix-app className="min-h-screen bg-page text-ink">
      <header className="sticky top-0 z-20 flex h-16 items-stretch overflow-visible border-b-[3px] border-accent bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.08)]">
        <div className="flex shrink-0 items-center border-r border-border-soft px-4 sm:px-5">
          <Image
            src="/etch-logo.jpg"
            alt="Etch Associates"
            width={236}
            height={95}
            priority
            className="h-auto w-[82px] sm:w-[94px]"
          />
        </div>
        <div className="hidden shrink-0 items-center px-4 sm:flex lg:px-5">
          <h1 className="whitespace-nowrap text-[15px] font-bold leading-none text-ink lg:text-[16px]">
            Graduate Matrix
          </h1>
        </div>
        <nav aria-label="Graduate Matrix sections" className="ml-auto flex h-full min-w-0 items-stretch overflow-x-auto [scrollbar-width:none]">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                aria-current={isActive ? "page" : undefined}
                className={
                  isActive
                    ? "flex shrink-0 items-center border-b-[3px] border-accent px-3 text-[10px] font-bold text-accent sm:px-4 lg:text-[11px]"
                    : "flex shrink-0 items-center border-b-[3px] border-transparent px-3 text-[10px] font-bold text-ink/75 hover:text-accent sm:px-4 lg:text-[11px]"
                }
              >
                {tab}
              </button>
            );
          })}
        </nav>
        <form action={logout} className="hidden shrink-0 items-center border-l border-border-soft px-3 lg:flex">
          <button type="submit" className="text-[10px] font-bold text-ink/75 hover:text-accent">Log out</button>
        </form>
      </header>

      <main className="graduate-matrix-workspace w-full">
        {accessibleCandidates.length > 1 ? (
          <form method="get" className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <label className="text-[11px] font-bold uppercase tracking-wider text-text-muted" htmlFor="candidate-selector">Candidate</label>
            <select id="candidate-selector" name="candidate" defaultValue={selectedCandidateId ?? ""} className="rounded border border-border bg-surface px-2 py-1 text-[12px]">
              {accessibleCandidates.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
            <button className="rounded bg-accent px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-accent-hover">Load candidate</button>
          </form>
        ) : null}
        {visibleWorkflowMessage && workflowMessageKey ? (
          <div role={visibleWorkflowMessage.outcome === "error" ? "alert" : "status"} className={`workflow-status-notice ${visibleWorkflowMessage.outcome}`}>
            <span>{visibleWorkflowMessage.message}</span>
            <button type="button" aria-label="Dismiss notification" onClick={() => setDismissedWorkflowMessage(workflowMessageKey)}>Close</button>
          </div>
        ) : null}
        <div hidden={activeTab !== "Candidate"}>
          {(
          candidateState === "loaded" && candidate && baseline ? (
            <CandidatePanel candidate={candidate} baseline={baseline} canStartL1={Boolean(mentorWorkflow)} isActive={activeTab === "Candidate"} />
          ) : (
            <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
              <h2 className="text-xl font-bold">
                {candidateState === "loaded"
                  ? "Candidate profile unavailable"
                  : candidateStateMessages[candidateState].title}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                {candidateState === "loaded"
                  ? "We could not load your candidate profile."
                  : candidateStateMessages[candidateState].message}
              </p>
            </section>
          )
          )}
        </div>
        <div hidden={activeTab !== "Portfolio"}>
          {portfolio && matrix && candidate ? (
            <PortfolioPanel portfolio={portfolio} matrix={matrix} candidate={candidate} baseline={baseline} mentorWorkflow={mentorWorkflow} role={mentorWorkflow ? "mentor" : "candidate"} candidateId={candidate.id} initialTab={initialPortfolioTab} placementsViewModel={placementsViewModel} initialPlacementDiscipline={initialPlacementDiscipline} />
          ) : (
            <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
              <h2 className="text-xl font-bold">Portfolio</h2>
              <p className="mt-2 text-sm text-text-secondary">
                Portfolio data is unavailable. Refresh the page or try again later.
              </p>
            </section>
          )}
        </div>
        {activeTab === "Candidate" || activeTab === "Portfolio" ? null : activeTab === "Dashboard" && candidate && baseline && matrix && portfolio && cpdLog && meetingLog ? (
          <DashboardPanel candidate={candidate} baseline={baseline} matrix={matrix} portfolio={portfolio} cpdLog={cpdLog} meetingLog={meetingLog} mentorWorkflow={mentorWorkflow} onOpenTab={setActiveTab} />
        ) : activeTab === "Matrix" && portfolio && matrix && candidate ? (
          <PortfolioPanel portfolio={portfolio} matrix={matrix} candidate={candidate} baseline={baseline} mentorWorkflow={mentorWorkflow} role={mentorWorkflow ? "mentor" : "candidate"} candidateId={candidate.id} initialTab="matrix" placementsViewModel={placementsViewModel} initialPlacementDiscipline={initialPlacementDiscipline} />
        ) : activeTab === "Placements" && portfolio && matrix && candidate ? (
          <PortfolioPanel portfolio={portfolio} matrix={matrix} candidate={candidate} baseline={baseline} mentorWorkflow={mentorWorkflow} role={mentorWorkflow ? "mentor" : "candidate"} candidateId={candidate.id} initialTab="placements" placementsViewModel={placementsViewModel} initialPlacementDiscipline={initialPlacementDiscipline} />
        ) : activeTab === "CPD Log" && cpdLog ? (
          <CpdLogPanel cpdLog={cpdLog} role={mentorWorkflow ? "mentor" : "candidate"} />
        ) : activeTab === "Meeting Log" && meetingLog ? (
          <MeetingLogPanel meetingLog={meetingLog} />
        ) : activeTab === "Guide" && candidate && matrix ? (
          <GuidePanel candidate={candidate} matrix={matrix} />
        ) : (
          <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
            <h2 className="text-xl font-bold">{activeTab}</h2>
            <p className="mt-2 text-sm text-text-secondary">
              This workspace is currently unavailable.
            </p>
          </section>
        )}
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-5 py-3 text-[10px] text-text-muted">
        <span>Controlling sources: <strong className="text-text-secondary">CIBSE competence framework</strong> · UK-SPEC A–E · Candidate pathway settings</span>
        <span>Secure Supabase record</span>
      </footer>
    </div>
  );
}
