import type { CandidateInfo } from "@/types/graduate-matrix";
import {
  CIBSE_MEMBERSHIP_OPTIONS,
  ENGINEERING_REGISTRATION_OPTIONS,
  IET_MEMBERSHIP_OPTIONS,
  LCC_STRAND_OPTIONS,
  PRIMARY_OUTCOME_OPTIONS,
  PROFESSIONAL_BODY_OPTIONS,
  SPECIALIST_ROUTE_OPTIONS,
} from "@/lib/graduate-matrix/data/pathways";
import BaselinePanel, { type CandidateBaselineView } from "./BaselinePanel";

interface CandidatePanelProps {
  candidate: CandidateInfo;
  baseline: CandidateBaselineView;
}

function valueOrFallback(value: string, fallback = "Not recorded") {
  return value.trim() || fallback;
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function optionLabel(
  options: readonly { value: string; label: string }[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-page p-3">
      <dt className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function SelectionList({ values }: { values: readonly string[] }) {
  if (values.length === 0) {
    return <p className="text-sm text-text-muted">None selected</p>;
  }

  return (
    <ul className="space-y-1 text-sm text-text-secondary">
      {values.map((value) => (
        <li key={value}>• {value}</li>
      ))}
    </ul>
  );
}

export default function CandidatePanel({
  candidate,
  baseline,
}: CandidatePanelProps) {
  const pathway = candidate.pathway;

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">
          Candidate profile
        </p>
        <h2 className="mt-1 text-2xl font-bold">
          {candidate.firstName} {candidate.surname}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {valueOrFallback(candidate.jobTitle)}
        </p>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Discipline" value={valueOrFallback(candidate.discipline)} />
          <Detail label="Employer / team" value={valueOrFallback(candidate.employerTeam)} />
          <Detail label="Office" value={valueOrFallback(candidate.officeLocation)} />
          <Detail label="Scheme start" value={formatDate(candidate.schemeStartDate)} />
          <Detail
            label="Expected application"
            value={formatDate(candidate.expectedApplicationDate)}
          />
          <Detail label="Mentor" value={valueOrFallback(candidate.mentorName, "Not assigned")} />
          <Detail
            label="Line manager"
            value={valueOrFallback(candidate.lineManagerName, "Not assigned")}
          />
          <Detail label="Reviewer" value={valueOrFallback(candidate.reviewerName, "Not assigned")} />
        </dl>
      </section>

      <BaselinePanel baseline={baseline} />

      <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
        <h3 className="text-lg font-bold">Professional pathway</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail
            label="Professional body"
            value={optionLabel(PROFESSIONAL_BODY_OPTIONS, pathway.professionalBody)}
          />
          <Detail
            label="Primary outcome"
            value={optionLabel(PRIMARY_OUTCOME_OPTIONS, pathway.primaryOutcome)}
          />
          <Detail
            label="Engineering registration"
            value={optionLabel(
              ENGINEERING_REGISTRATION_OPTIONS,
              pathway.engineeringRegistrationTarget,
            )}
          />
          <Detail
            label="CIBSE membership target"
            value={optionLabel(
              CIBSE_MEMBERSHIP_OPTIONS,
              pathway.cibseMembershipTarget,
            )}
          />
          <Detail
            label="IET membership target"
            value={optionLabel(IET_MEMBERSHIP_OPTIONS, pathway.ietMembershipTarget)}
          />
          <Detail
            label="Current membership"
            value={valueOrFallback(pathway.currentMembershipStatus)}
          />
          <Detail label="Academic route" value={valueOrFallback(pathway.academicRoute)} />
        </dl>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-border p-3">
            <h4 className="text-sm font-bold">LCC strands</h4>
            <div className="mt-2">
              <SelectionList
                values={pathway.lccStrands.map((value) =>
                  optionLabel(LCC_STRAND_OPTIONS, value),
                )}
              />
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <h4 className="text-sm font-bold">Specialist routes</h4>
            <div className="mt-2">
              <SelectionList
                values={pathway.specialistRoutes.map((value) =>
                  optionLabel(SPECIALIST_ROUTE_OPTIONS, value),
                )}
              />
            </div>
          </div>
        </div>

        {pathway.notes.trim() ? (
          <div className="mt-4 rounded-md border border-border bg-page p-3">
            <h4 className="text-sm font-bold">Pathway notes</h4>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
              {pathway.notes}
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
