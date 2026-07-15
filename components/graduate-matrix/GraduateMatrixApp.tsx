"use client";

import { useState } from "react";
import { logout } from "@/app/auth-actions";
import type { CandidateInfo } from "@/types/graduate-matrix";
import CandidatePanel from "./CandidatePanel";
import type { CandidateBaselineView } from "./BaselinePanel";
import MatrixPanel, { type CandidateMatrixView } from "./MatrixPanel";
import PortfolioPanel, { type CandidatePortfolioView } from "./PortfolioPanel";
import MeetingLogPanel, {
  type CandidateMeetingLogView,
} from "./MeetingLogPanel";
import CpdLogPanel, { type CandidateCpdLogView } from "./CpdLogPanel";

const tabs = [
  "Candidate",
  "Dashboard",
  "Portfolio",
  "Matrix",
  "CPD Log",
  "Meeting Log",
  "Guide",
] as const;

type Tab = (typeof tabs)[number];

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
}: GraduateMatrixAppProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Candidate");

  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="sticky top-0 z-10 h-14 border-b-[3px] border-accent bg-surface shadow-[0_1px_4px_rgba(0,0,0,0.1)]">
        <div className="mx-auto flex h-full max-w-[1500px] items-stretch px-4 sm:px-6">
          <div className="flex shrink-0 flex-col justify-center pr-5">
            <h1 className="text-base font-bold leading-tight">Graduate Matrix</h1>
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted">
              Graduate Development Platform
            </p>
          </div>

          <nav
            aria-label="Graduate Matrix sections"
            className="ml-auto flex min-w-0 items-stretch overflow-x-auto"
          >
            {tabs.map((tab) => {
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  aria-current={isActive ? "page" : undefined}
                  className={`shrink-0 border-b-[3px] px-3 text-xs font-semibold transition-colors sm:px-4 ${
                    isActive
                      ? "border-accent text-accent"
                      : "border-transparent text-text-muted hover:bg-hover hover:text-accent"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </nav>

          <form action={logout} className="flex shrink-0 items-center pl-3">
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              Log out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-4 sm:px-6 sm:py-6">
        {activeTab === "Candidate" ? (
          candidateState === "loaded" && candidate && baseline ? (
            <CandidatePanel candidate={candidate} baseline={baseline} />
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
        ) : activeTab === "Portfolio" && portfolio ? (
          <PortfolioPanel portfolio={portfolio} />
        ) : activeTab === "Matrix" && matrix ? (
          <MatrixPanel matrix={matrix} />
        ) : activeTab === "CPD Log" && cpdLog ? (
          <CpdLogPanel cpdLog={cpdLog} />
        ) : activeTab === "Meeting Log" && meetingLog ? (
          <MeetingLogPanel meetingLog={meetingLog} />
        ) : (
          <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
            <h2 className="text-xl font-bold">{activeTab}</h2>
            <p className="mt-2 text-sm text-text-secondary">
              This section will be migrated from the original Graduate Matrix
              application.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
