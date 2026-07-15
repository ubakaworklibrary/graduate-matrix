import {
  getArchivedDevelopmentActions,
  getCurrentDevelopmentActions,
  getDevelopmentActionSummary,
  getEvidenceForAction,
  getActionsForEvidence,
} from "@/lib/graduate-matrix/development-actions";
import { COMPETENCY_DEFINITIONS } from "@/lib/graduate-matrix/data/competencies";
import {
  getCompetencyLinksForEvidence,
  getFrameworkEvidenceSummary,
  getVerificationEventsForEvidence,
} from "@/lib/graduate-matrix/evidence";
import type {
  DevelopmentAction,
  EvidenceActionLink,
  EvidenceCompetencyLink,
  EvidenceEntry,
  EvidenceVerificationEvent,
  IsoDate,
} from "@/types/graduate-matrix";

export type PortfolioViewState = "loaded" | "error" | "integrity-error";

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
}

const competencyById = new Map<string, (typeof COMPETENCY_DEFINITIONS)[number]>(
  COMPETENCY_DEFINITIONS.map((definition) => [definition.id, definition]),
);

function displayLabel(value: string) {
  return value.replaceAll("-", " ");
}

function verificationClasses(status: EvidenceEntry["verificationStatus"]) {
  switch (status) {
    case "verified":
      return "bg-emerald-100 text-emerald-800";
    case "reverification-required":
      return "bg-amber-100 text-amber-800";
    case "unverified":
      return "bg-page text-text-secondary";
  }
}

function ActionList({
  actions,
  portfolio,
  emptyMessage,
}: {
  actions: readonly DevelopmentAction[];
  portfolio: CandidatePortfolioView;
  emptyMessage: string;
}) {
  if (actions.length === 0) {
    return <p className="text-sm text-text-muted">{emptyMessage}</p>;
  }

  const actionById = new Map(portfolio.actions.map((action) => [action.id, action]));

  return (
    <div className="grid gap-3">
      {actions.map((action) => {
        const competency = competencyById.get(action.competencyId);
        const linkedEvidence = getEvidenceForAction(
          action.id,
          portfolio.evidence,
          portfolio.actionLinks,
        );
        const carriedFrom = action.carriedForwardFromActionId
          ? actionById.get(action.carriedForwardFromActionId)
          : null;

        return (
          <article
            key={action.id}
            className="rounded-md border border-border bg-page p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="font-bold">{action.title}</h4>
                <p className="mt-1 text-sm text-text-secondary">
                  {action.notes || "No additional notes recorded."}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold capitalize">
                  {displayLabel(action.status)}
                </span>
                <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold capitalize text-text-secondary">
                  {action.priority} priority
                </span>
                {action.archivedAt ? (
                  <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700">
                    Archived
                  </span>
                ) : null}
              </div>
            </div>

            <dl className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="font-bold uppercase tracking-wide text-text-muted">Owner</dt>
                <dd className="mt-0.5 capitalize">{action.owner}</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-text-muted">Competency</dt>
                <dd className="mt-0.5">{competency?.reference ?? action.competencyId}</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-text-muted">Due</dt>
                <dd className="mt-0.5">{action.dueDate ?? "No due date"}</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-wide text-text-muted">Linked evidence</dt>
                <dd className="mt-0.5">{linkedEvidence.length}</dd>
              </div>
            </dl>

            {linkedEvidence.length > 0 ? (
              <p className="mt-2 text-xs text-text-secondary">
                Evidence: {linkedEvidence.map((entry) => entry.title).join(", ")}
              </p>
            ) : null}
            {carriedFrom ? (
              <p className="mt-2 text-xs text-text-secondary">
                Carried forward from: {carriedFrom.title}
              </p>
            ) : null}
            {action.completedAt ? (
              <p className="mt-2 text-xs text-text-secondary">
                Completed {action.completedAt.slice(0, 10)}
                {action.completedBy ? ` by ${action.completedBy}` : ""}
              </p>
            ) : null}
            {action.archivedAt ? (
              <p className="mt-2 text-xs text-text-secondary">
                Archived {action.archivedAt.slice(0, 10)}
                {action.archiveReason ? ` — ${action.archiveReason}` : ""}
              </p>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

export default function PortfolioPanel({ portfolio }: PortfolioPanelProps) {
  if (portfolio.state === "error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-xl font-bold">Portfolio unavailable</h2>
        <p className="mt-2 text-sm text-text-secondary">
          We could not load Portfolio information. Please refresh the page or
          try again later.
        </p>
      </section>
    );
  }

  if (portfolio.state === "integrity-error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-xl font-bold">Portfolio data needs attention</h2>
        <p className="mt-2 text-sm text-text-secondary">
          The stored Portfolio relationships do not match the current Graduate
          Matrix model. Please contact an administrator.
        </p>
      </section>
    );
  }

  const evidenceSummary = getFrameworkEvidenceSummary(
    portfolio.evidence,
    portfolio.competencyLinks,
    portfolio.verificationEvents,
  );
  const actionSummary = getDevelopmentActionSummary(
    portfolio.actions,
    portfolio.today,
  );
  const currentActions = getCurrentDevelopmentActions(portfolio.actions);
  const archivedActions = getArchivedDevelopmentActions(portfolio.actions);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">
          Candidate Portfolio
        </p>
        <h2 className="mt-1 text-2xl font-bold">Evidence and development actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-page p-3">
            <p className="text-2xl font-bold">{evidenceSummary.totalEvidenceCount}</p>
            <p className="text-xs font-semibold text-text-muted">Evidence records</p>
          </div>
          <div className="rounded-md bg-page p-3">
            <p className="text-2xl font-bold">{evidenceSummary.verifiedEvidenceCount}</p>
            <p className="text-xs font-semibold text-text-muted">Verified and linked</p>
          </div>
          <div className="rounded-md bg-page p-3">
            <p className="text-2xl font-bold">{actionSummary.active}</p>
            <p className="text-xs font-semibold text-text-muted">Active actions</p>
          </div>
          <div className="rounded-md bg-page p-3">
            <p className="text-2xl font-bold">{actionSummary.archived}</p>
            <p className="text-xs font-semibold text-text-muted">Archived actions</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
        <h3 className="text-lg font-bold">Evidence</h3>
        {portfolio.evidence.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">
            No evidence has been recorded for this candidate.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {portfolio.evidence.map((entry) => {
              const competencyLinks = getCompetencyLinksForEvidence(
                entry.id,
                portfolio.competencyLinks,
                true,
              );
              const verificationEvents = getVerificationEventsForEvidence(
                entry.id,
                portfolio.verificationEvents,
              );
              const linkedActions = getActionsForEvidence(
                entry.id,
                portfolio.actions,
                portfolio.actionLinks,
                true,
              );
              const latestVerification = verificationEvents[0] ?? null;

              return (
                <article key={entry.id} className="rounded-md border border-border bg-page p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold">{entry.title}</h4>
                        {entry.projectReference ? (
                          <span className="font-mono text-xs text-text-muted">
                            {entry.projectReference}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-text-secondary">
                        {entry.description || "No description recorded."}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${verificationClasses(entry.verificationStatus)}`}>
                      {displayLabel(entry.verificationStatus)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-secondary">
                    <span>{entry.date}</span>
                    <span>•</span>
                    <span>{entry.claimedLevel}</span>
                    <span>•</span>
                    <span className="uppercase">{entry.method}</span>
                    {entry.projectType ? <span>• {entry.projectType}</span> : null}
                    {entry.ribaStage ? <span>• {entry.ribaStage}</span> : null}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {competencyLinks.length === 0 ? (
                      <span className="text-xs text-text-muted">No competency links</span>
                    ) : (
                      competencyLinks.map((link) => (
                        <span key={link.id} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold">
                          {competencyById.get(link.competencyId)?.reference ?? link.competencyId}
                          {` · ${displayLabel(link.linkType)}`}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
                    <p>
                      Verification history: {verificationEvents.length}
                      {latestVerification
                        ? ` · Latest ${displayLabel(latestVerification.type)} by ${latestVerification.actor}`
                        : " · No verification events"}
                    </p>
                    <p>
                      Linked actions: {linkedActions.length}
                      {linkedActions.length > 0
                        ? ` · ${linkedActions.map((action) => action.title).join(", ")}`
                        : ""}
                    </p>
                  </div>

                  {entry.cpd ? (
                    <p className="mt-2 text-xs text-text-secondary">
                      CPD contribution: {entry.cpd.hours} hours · {entry.cpd.category}
                      {entry.cpd.signedOffAt ? " · Signed off" : " · Pending sign-off"}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
        <h3 className="text-lg font-bold">Current development actions</h3>
        <div className="mt-3">
          <ActionList
            actions={currentActions}
            portfolio={portfolio}
            emptyMessage="No current development actions have been recorded."
          />
        </div>
      </section>

      {archivedActions.length > 0 ? (
        <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
          <h3 className="text-lg font-bold">Archived action history</h3>
          <div className="mt-3">
            <ActionList
              actions={archivedActions}
              portfolio={portfolio}
              emptyMessage="No archived development actions."
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
