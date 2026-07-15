import type {
  CompetencyCycle,
  CompetencyCycleId,
  CompetencyDefinition,
  CompetencyId,
  CompetencyRecord,
} from "@/types/graduate-matrix";
import {
  getActiveCompetencyCycle,
  getCurrentCompetencyLevel,
} from "@/lib/graduate-matrix/competency-progress";
import { PROGRESSION_RUBRIC } from "@/lib/graduate-matrix/data/progression-rubric";

export type MatrixViewState = "loaded" | "error" | "integrity-error";

export interface CandidateMatrixView {
  state: MatrixViewState;
  definitions: readonly CompetencyDefinition[];
  records: Record<CompetencyId, CompetencyRecord>;
  cycles: Record<CompetencyCycleId, CompetencyCycle>;
}

interface MatrixPanelProps {
  matrix: CandidateMatrixView;
}

function levelLabel(level: string) {
  const rubric = PROGRESSION_RUBRIC.find((entry) => entry.level === level);
  return rubric ? `${rubric.level} · ${rubric.name}` : level;
}

function statusLabel(status: string) {
  return status.replaceAll("-", " ");
}

export default function MatrixPanel({ matrix }: MatrixPanelProps) {
  if (matrix.state === "error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-xl font-bold">Matrix unavailable</h2>
        <p className="mt-2 text-sm text-text-secondary">
          We could not load competency information. Please refresh the page or
          try again later.
        </p>
      </section>
    );
  }

  if (matrix.state === "integrity-error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-xl font-bold">Matrix data needs attention</h2>
        <p className="mt-2 text-sm text-text-secondary">
          The stored competency structure does not match the current Graduate
          Matrix framework. Please contact an administrator.
        </p>
      </section>
    );
  }

  const initializedCount = Object.keys(matrix.records).length;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">
          Competency framework
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Competency Matrix</h2>
            <p className="mt-1 text-sm text-text-secondary">
              Current levels follow each competency’s authoritative active cycle.
            </p>
          </div>
          <p className="text-sm font-semibold text-text-secondary">
            {initializedCount} of {matrix.definitions.length} initialized
          </p>
        </div>

        {initializedCount === 0 ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            No competency cycles have been initialized for this candidate.
          </p>
        ) : null}
      </section>

      <div className="grid gap-3">
        {matrix.definitions.map((definition) => {
          const record = matrix.records[definition.id];
          const activeCycle = record
            ? getActiveCompetencyCycle(record, matrix.cycles)
            : null;
          const currentLevel = record
            ? getCurrentCompetencyLevel(record, matrix.cycles)
            : null;
          const history = Object.values(matrix.cycles)
            .filter(
              (cycle) =>
                cycle.candidateId === record?.candidateId &&
                cycle.competencyId === definition.id,
            )
            .sort((left, right) =>
              left.createdAt.localeCompare(right.createdAt),
            );

          return (
            <article
              key={definition.id}
              className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold text-accent">
                      {definition.reference}
                    </span>
                    <span className="text-sm font-bold">{definition.area}</span>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">
                    {definition.objective}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 lg:justify-end">
                  <span className="rounded-full bg-page px-3 py-1 text-xs font-bold text-ink">
                    {currentLevel ? levelLabel(currentLevel) : "Not initialized"}
                  </span>
                  {activeCycle ? (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold capitalize text-emerald-800">
                      {statusLabel(activeCycle.status)}
                    </span>
                  ) : null}
                  {record?.targetLevelOverride ? (
                    <span className="rounded-full bg-page px-3 py-1 text-xs font-semibold text-text-secondary">
                      Target {record.targetLevelOverride}
                    </span>
                  ) : null}
                </div>
              </div>

              {record && !activeCycle ? (
                <p className="mt-3 text-sm font-semibold text-amber-700">
                  This competency exists but has no active cycle.
                </p>
              ) : null}

              {history.length > 0 ? (
                <div className="mt-3 border-t border-border pt-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-muted">
                    Cycle history
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {history.map((cycle) => (
                      <span
                        key={cycle.id}
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold capitalize ${
                          cycle.id === record?.activeCycleId
                            ? "border-accent bg-hover text-accent"
                            : "border-border bg-page text-text-secondary"
                        }`}
                      >
                        {cycle.level} · {statusLabel(cycle.status)}
                        {cycle.id === record?.activeCycleId ? " · Active" : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
