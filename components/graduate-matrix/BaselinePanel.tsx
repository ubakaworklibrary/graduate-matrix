import type {
  BaselineReadinessSummary,
} from "@/lib/graduate-matrix/readiness";
import type { BaselineSetup, BaselineTaskStatus } from "@/types/graduate-matrix";

export type BaselineViewState =
  | "loaded"
  | "not-configured"
  | "error"
  | "definition-mismatch";

export interface CandidateBaselineView {
  state: BaselineViewState;
  setup: BaselineSetup | null;
  readiness: BaselineReadinessSummary | null;
}

interface BaselinePanelProps {
  baseline: CandidateBaselineView;
}

const statusLabels: Record<BaselineTaskStatus, string> = {
  "not-complete": "Not complete",
  complete: "Complete",
  waived: "Waived",
};

function formatDateTime(value: string | null) {
  if (!value) return "Not started";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(value));
}

export default function BaselinePanel({ baseline }: BaselinePanelProps) {
  if (baseline.state === "error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h3 className="text-lg font-bold">Baseline readiness unavailable</h3>
        <p className="mt-2 text-sm text-text-secondary">
          We could not load baseline setup information. Please refresh the page
          or try again later.
        </p>
      </section>
    );
  }

  if (baseline.state === "definition-mismatch" || !baseline.readiness) {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h3 className="text-lg font-bold">Baseline setup needs attention</h3>
        <p className="mt-2 text-sm text-text-secondary">
          The stored baseline task definitions do not match the current Graduate
          Matrix framework. Please contact an administrator.
        </p>
      </section>
    );
  }

  const { readiness, setup } = baseline;
  const setupLabel = setup?.status.replaceAll("-", " ") ?? "not configured";

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">Baseline readiness</h3>
          <p className="mt-1 text-sm text-text-secondary">
            Required onboarding tasks before formal competency progression.
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            readiness.ready
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {readiness.ready ? "Ready" : "Not ready"}
        </span>
      </div>

      {baseline.state === "not-configured" ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Baseline setup has not yet been configured for this candidate.
        </p>
      ) : null}

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-border bg-page p-3">
          <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-muted">
            Setup status
          </dt>
          <dd className="mt-1 text-sm font-semibold capitalize">{setupLabel}</dd>
        </div>
        <div className="rounded-md border border-border bg-page p-3">
          <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-muted">
            Mandatory tasks met
          </dt>
          <dd className="mt-1 text-sm font-semibold">
            {readiness.completeOrWaived} of {readiness.totalRequired}
          </dd>
        </div>
        <div className="rounded-md border border-border bg-page p-3">
          <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-muted">
            Formal training started
          </dt>
          <dd className="mt-1 text-sm font-semibold">
            {formatDateTime(setup?.formalTrainingStartedAt ?? null)}
          </dd>
          {setup?.formalTrainingStartedBy ? (
            <dd className="mt-1 text-xs text-text-muted">
              By {setup.formalTrainingStartedBy}
            </dd>
          ) : null}
        </div>
      </dl>

      <div className="mt-5 space-y-2">
        {readiness.tasks.map(({ definition, status, met }) => (
          <article
            key={definition.id}
            className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-start sm:justify-between"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-bold">{definition.title}</h4>
                {definition.mandatory ? (
                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted">
                    Required
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-text-secondary">
                {definition.description}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                met
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-page text-text-secondary"
              }`}
            >
              {statusLabels[status]}
            </span>
          </article>
        ))}
      </div>
    </section>
  );
}
