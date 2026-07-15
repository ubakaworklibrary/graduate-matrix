import {
  getCombinedCpdSummary,
  getCpdLinksForEntry,
  getCpdSummary,
  getRollingTwelveMonthCombinedCpdSummary,
} from "@/lib/graduate-matrix/cpd";
import { COMPETENCY_DEFINITIONS } from "@/lib/graduate-matrix/data/competencies";
import type {
  CpdCompetencyLink,
  CpdEntry,
  EvidenceCompetencyLink,
  EvidenceEntry,
  IsoDate,
} from "@/types/graduate-matrix";

export type CpdLogViewState = "loaded" | "error" | "integrity-error";

export interface CandidateCpdLogView {
  state: CpdLogViewState;
  entries: CpdEntry[];
  competencyLinks: CpdCompetencyLink[];
  evidence: EvidenceEntry[];
  evidenceCompetencyLinks: EvidenceCompetencyLink[];
  includesEvidenceCpd: boolean;
  today: IsoDate;
}

interface CpdLogPanelProps {
  cpdLog: CandidateCpdLogView;
}

const competencyById = new Map<string, (typeof COMPETENCY_DEFINITIONS)[number]>(
  COMPETENCY_DEFINITIONS.map((definition) => [definition.id, definition]),
);

function displayLabel(value: string) {
  return value.replaceAll("-", " ");
}

export default function CpdLogPanel({ cpdLog }: CpdLogPanelProps) {
  if (cpdLog.state === "error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-xl font-bold">CPD Log unavailable</h2>
        <p className="mt-2 text-sm text-text-secondary">
          We could not load CPD information. Please refresh the page or try
          again later.
        </p>
      </section>
    );
  }

  if (cpdLog.state === "integrity-error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-xl font-bold">CPD data needs attention</h2>
        <p className="mt-2 text-sm text-text-secondary">
          The stored CPD relationships do not match the current Graduate Matrix
          model. Please contact an administrator.
        </p>
      </section>
    );
  }

  const standaloneSummary = getCpdSummary(cpdLog.entries);
  const combinedSummary = getCombinedCpdSummary(
    cpdLog.entries,
    cpdLog.evidence,
    cpdLog.evidenceCompetencyLinks,
  );
  const rollingSummary = getRollingTwelveMonthCombinedCpdSummary(
    cpdLog.entries,
    cpdLog.evidence,
    cpdLog.evidenceCompetencyLinks,
    new Date(`${cpdLog.today}T12:00:00`),
  );

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">
          Continuing professional development
        </p>
        <h2 className="mt-1 text-2xl font-bold">CPD Log</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-md bg-page p-3">
            <p className="text-2xl font-bold">{combinedSummary.totalHours}</p>
            <p className="text-xs font-semibold text-text-muted">
              {cpdLog.includesEvidenceCpd ? "Combined hours" : "Standalone hours"}
            </p>
          </div>
          <div className="rounded-md bg-page p-3">
            <p className="text-2xl font-bold">{combinedSummary.signedOffHours}</p>
            <p className="text-xs font-semibold text-text-muted">Signed-off hours</p>
          </div>
          <div className="rounded-md bg-page p-3">
            <p className="text-2xl font-bold">{combinedSummary.pendingSignoffHours}</p>
            <p className="text-xs font-semibold text-text-muted">Pending hours</p>
          </div>
          <div className="rounded-md bg-page p-3">
            <p className="text-2xl font-bold">{rollingSummary.totalHours}</p>
            <p className="text-xs font-semibold text-text-muted">Rolling 12 months</p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Object.entries(combinedSummary.byCategory).map(([category, summary]) => (
            <div key={category} className="rounded-md border border-border px-3 py-2 text-center">
              <p className="font-bold">{summary.hours}</p>
              <p className="text-xs text-text-muted">{category}</p>
            </div>
          ))}
        </div>

        {!cpdLog.includesEvidenceCpd ? (
          <p className="mt-3 text-xs text-text-muted">
            Evidence-derived CPD is temporarily unavailable; these summaries use
            standalone CPD entries only.
          </p>
        ) : null}
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold">Standalone CPD entries</h3>
            <p className="mt-1 text-sm text-text-secondary">
              {standaloneSummary.totalEntries} entries · {standaloneSummary.totalHours} hours
            </p>
          </div>
        </div>

        {cpdLog.entries.length === 0 ? (
          <p className="mt-3 text-sm text-text-muted">
            No standalone CPD entries have been recorded.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {cpdLog.entries.map((entry) => {
              const links = getCpdLinksForEntry(
                entry.id,
                cpdLog.competencyLinks,
              );

              return (
                <article key={entry.id} className="rounded-md border border-border bg-page p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold">{entry.title}</h4>
                      <p className="mt-1 text-sm text-text-secondary">
                        {entry.date} · {entry.hours} hours · {entry.category}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${entry.signedOffAt ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      {entry.signedOffAt ? "Signed off" : "Pending sign-off"}
                    </span>
                  </div>

                  {entry.description ? (
                    <p className="mt-3 text-sm text-text-secondary">{entry.description}</p>
                  ) : null}
                  {entry.outcome ? (
                    <p className="mt-2 text-sm text-text-secondary">
                      <span className="font-bold text-ink">Outcome:</span> {entry.outcome}
                    </p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {links.length === 0 ? (
                      <span className="text-xs text-text-muted">No competency links</span>
                    ) : (
                      links.map((link) => (
                        <span key={link.id} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold">
                          {competencyById.get(link.competencyId)?.reference ?? link.competencyId}
                          {` · ${displayLabel(link.linkType)}`}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="mt-3 grid gap-2 text-xs text-text-secondary sm:grid-cols-2">
                    <p>
                      Attachments: {entry.attachments.length}
                      {entry.attachments.length > 0
                        ? ` · ${entry.attachments.map((attachment) => attachment.name).join(", ")}`
                        : ""}
                    </p>
                    <p>
                      {entry.signedOffAt
                        ? `Signed off ${entry.signedOffAt.slice(0, 10)}${entry.signedOffBy ? ` by ${entry.signedOffBy}` : ""}`
                        : "No sign-off recorded"}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
