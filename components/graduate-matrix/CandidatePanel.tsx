"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { autosaveCandidateDetails } from "@/app/candidate-actions";
import type { CandidateInfo, PrimaryOutcome, ProfessionalBody } from "@/types/graduate-matrix";
import {
  CIBSE_MEMBERSHIP_OPTIONS,
  ENGINEERING_REGISTRATION_OPTIONS,
  IET_MEMBERSHIP_OPTIONS,
  LCC_STRAND_OPTIONS,
  PRIMARY_OUTCOME_DERIVATIONS,
  PRIMARY_OUTCOME_OPTIONS,
  PROFESSIONAL_BODY_PATHWAY_RULES,
  PROFESSIONAL_BODY_OPTIONS,
  SPECIALIST_ROUTE_OPTIONS,
  type ProfessionalBodyPathwayRules,
} from "@/lib/graduate-matrix/data/pathways";
import BaselinePanel, { type CandidateBaselineView } from "./BaselinePanel";

interface CandidatePanelProps {
  candidate: CandidateInfo;
  baseline: CandidateBaselineView;
  canStartL1: boolean;
  isActive: boolean;
}

const labelClass = "text-[10px] font-bold uppercase tracking-[0.06em] text-text-muted";
const fieldClass = "mt-1 w-full rounded border border-border bg-white px-2.5 py-2 text-[12px] font-normal normal-case tracking-normal text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

const DISCIPLINE_OPTIONS = ["Mechanical & Public Health", "Electrical", "Sustainability"] as const;
const OFFICE_OPTIONS = ["London", "Oxford"] as const;
const MENTOR_OPTIONS = ["Chris Hughes", "Henry Metcalfe", "James Hazell", "Ubaka Attah", "Tomas Keating", "Adeel Ahmed"] as const;
const MANAGER_OPTIONS = ["Matthew Edwards", "Jeremy Denton", "Ubaka Attah", "Dushyant Kanik"] as const;
const TARGETED_IN_YEAR_OPTIONS = ["1", "2", "3", "4", "5"] as const;

// The database only has a real date column for this field, so "targeted in
// Year N" is stored as 1 January of (the year it was selected + N) — a plain,
// unlinked marker rather than a calculation from any other candidate date.
function targetedInYearsFromDate(expectedApplicationDate: string | null): string {
  if (!expectedApplicationDate) return "";
  const storedYear = Number(expectedApplicationDate.slice(0, 4));
  if (!Number.isFinite(storedYear)) return "";
  const yearsFromNow = storedYear - new Date().getFullYear();
  return yearsFromNow >= 1 && yearsFromNow <= 5 ? String(yearsFromNow) : "";
}

const EMPTY_PATHWAY_RULES: ProfessionalBodyPathwayRules = {
  hint: "",
  primaryOutcomes: [],
  cibseMembershipTargets: [],
  ietMembershipTargets: [],
  engineeringRegistrationTargets: [],
  showCibseMembership: false,
  showIetMembership: false,
  showEngineeringRegistration: false,
  showLccStrands: false,
  showSpecialistRoutes: false,
};

function TextOptions({ values, placeholder }: { values: readonly string[]; placeholder: string }) {
  return <><option value="">{placeholder}</option>{values.map((value) => <option key={value} value={value}>{value}</option>)}</>;
}

function Options({ options }: { options: readonly { value: string; label: string }[] }) {
  return options.map(({ value, label }) => <option key={value} value={value}>{label}</option>);
}

type SaveStatus = "idle" | "pending" | "saved" | "error";

function SaveIndicator({ status, error }: { status: SaveStatus; error: string | null }) {
  if (status === "pending") return <span className="text-[11px] font-semibold text-text-muted">Saving…</span>;
  if (status === "error") return <span className="text-[11px] font-semibold text-[#c0392b]">{error ?? "Could not save."}</span>;
  if (status === "saved") return <span className="text-[11px] font-semibold text-[#1a7a60]">Saved</span>;
  return null;
}

export default function CandidatePanel({ candidate, baseline, canStartL1, isActive }: CandidatePanelProps) {
  const pathway = candidate.pathway;
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autosaveSeqRef = useRef(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const hasExtendedSetup = Boolean(
    candidate.jobTitle.trim()
    || candidate.discipline.trim()
    || candidate.employerTeam.trim()
    || candidate.officeLocation.trim()
    || candidate.expectedApplicationDate
    || candidate.mentorName.trim()
    || candidate.lineManagerName.trim()
    || candidate.reviewerName.trim()
    || pathway.isConfigured
    || pathway.currentMembershipStatus.trim()
    || pathway.academicRoute.trim()
    || pathway.notes.trim()
    || pathway.lccStrands.length
    || pathway.specialistRoutes.length,
  );
  const [fullSetup, setFullSetup] = useState(hasExtendedSetup);
  const [firstName, setFirstName] = useState(candidate.firstName);
  const [surname, setSurname] = useState(candidate.surname);
  const [schemeStartDate, setSchemeStartDate] = useState(candidate.schemeStartDate ?? "");
  const [discipline, setDiscipline] = useState(candidate.discipline);
  const [officeLocation, setOfficeLocation] = useState(candidate.officeLocation);
  const [targetedInYears, setTargetedInYears] = useState(targetedInYearsFromDate(candidate.expectedApplicationDate));
  const [mentorName, setMentorName] = useState(candidate.mentorName);
  const [lineManagerName, setLineManagerName] = useState(candidate.lineManagerName);
  const [reviewerName, setReviewerName] = useState(candidate.reviewerName);
  const [professionalBody, setProfessionalBody] = useState<ProfessionalBody | "">(pathway.isConfigured ? pathway.professionalBody : "");
  const [primaryOutcome, setPrimaryOutcome] = useState<PrimaryOutcome | "">(pathway.isConfigured ? pathway.primaryOutcome : "");
  const [cibseTarget, setCibseTarget] = useState(pathway.cibseMembershipTarget);
  const [ietTarget, setIetTarget] = useState(pathway.ietMembershipTarget);
  const [registrationTarget, setRegistrationTarget] = useState(pathway.engineeringRegistrationTarget);
  const minimumReady = Boolean(firstName.trim() && surname.trim() && schemeStartDate);
  const pathwayRules = professionalBody ? PROFESSIONAL_BODY_PATHWAY_RULES[professionalBody] : EMPTY_PATHWAY_RULES;
  const primaryOptions = PRIMARY_OUTCOME_OPTIONS.filter(({ value }) =>
    pathwayRules.primaryOutcomes.some((allowed) => allowed === value),
  );

  useEffect(() => {
    if (isActive || !formRef.current) return;
    const formData = new FormData(formRef.current);
    const deferredNames = [
      "jobTitle",
      "discipline",
      "employerTeam",
      "officeLocation",
      "targetedInYears",
      "mentorName",
      "lineManagerName",
      "reviewerName",
      "currentMembershipStatus",
      "academicRoute",
      "pathwayNotes",
    ];
    const hasDeferredEntry = deferredNames.some((name) => {
      const entry = formData.get(name);
      return typeof entry === "string" && entry.trim().length > 0;
    }) || formData.getAll("lccStrands").length > 0 || formData.getAll("specialistRoutes").length > 0;
    if (!hasDeferredEntry) setFullSetup(false);
  }, [isActive]);

  useEffect(() => {
    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
    };
  }, []);

  function scheduleAutosave() {
    // Deliberately not calling setSaveStatus("pending") here: doing it
    // synchronously on every raw input/change event re-renders this whole
    // panel at the exact moment the user is clicking/opening a dropdown,
    // which was swallowing that click and needing a second one to register.
    // The "pending" state (and the actual re-render it causes) is deferred
    // until the debounce timer itself fires, well after the interaction.
    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    autosaveTimeoutRef.current = setTimeout(() => {
      if (!formRef.current) return;
      setSaveStatus("pending");
      const formData = new FormData(formRef.current);
      const seq = ++autosaveSeqRef.current;
      autosaveCandidateDetails(formData).then((result) => {
        // A newer autosave may have started (and possibly already resolved)
        // while this one was in flight — ignore a stale response so it can't
        // overwrite a more recent save's status.
        if (seq !== autosaveSeqRef.current) return;
        if (result.status === "success") {
          setSaveError(null);
          setSaveStatus("saved");
          // Refreshing straight away re-renders this panel with fresh server
          // props while the user may still be mid-interaction with another
          // field (e.g. a dropdown popup open), which was causing dropdowns
          // to feel unresponsive and edits to appear to "reset". Debouncing
          // the refresh separately — and much longer — means it only runs
          // once the user has actually paused, not after every keystroke's
          // own save.
          if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current);
          refreshTimeoutRef.current = setTimeout(() => router.refresh(), 2500);
        } else {
          setSaveError(result.message);
          setSaveStatus("error");
        }
      });
    }, 600);
  }

  function changeOutcome(value: PrimaryOutcome | "") {
    setPrimaryOutcome(value);
    const derived = value && value in PRIMARY_OUTCOME_DERIVATIONS
      ? PRIMARY_OUTCOME_DERIVATIONS[value as keyof typeof PRIMARY_OUTCOME_DERIVATIONS]
      : undefined;
    if (derived) {
      setCibseTarget(derived.cibseMembershipTarget);
      setIetTarget(derived.ietMembershipTarget);
      setRegistrationTarget(derived.engineeringRegistrationTarget);
    }
  }

  function changeProfessionalBody(value: ProfessionalBody | "") {
    setProfessionalBody(value);
    const rules = value ? PROFESSIONAL_BODY_PATHWAY_RULES[value] : EMPTY_PATHWAY_RULES;
    const nextOutcome = value && rules.primaryOutcomes.some((allowed) => allowed === primaryOutcome)
      ? primaryOutcome
      : (rules.primaryOutcomes[0] ?? "");
    changeOutcome(nextOutcome);
  }

  const required = (missing: boolean) => missing ? (
    <span className="mt-1 block text-[10px] font-extrabold uppercase tracking-[0.06em] text-[#c0392b]">Required</span>
  ) : null;

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 items-start gap-5 min-[1120px]:grid-cols-2">
      <section className="min-w-0 overflow-hidden rounded-lg border border-[#b8bec8] bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="candidate-setup-card-label">Candidate details</div>
        <div className="candidate-setup-card-header flex items-center border-b border-[#dde2ea] bg-white px-[14px] py-3">
          <p className="text-[12.5px] font-bold text-text-muted">Candidate-completed fields. Mentor can edit these later if correction is needed.</p>
        </div>
        <div className="p-6 pt-4">
          <form
            ref={formRef}
            onSubmit={(event) => event.preventDefault()}
            onChange={scheduleAutosave}
          >
            <input type="hidden" name="candidateId" value={candidate.id} />
            <input type="hidden" name="saveMode" value={fullSetup ? "full" : "quick"} />
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
              <label className={labelClass}>First name<input className={fieldClass} name="firstName" value={firstName} onChange={(event) => setFirstName(event.target.value)} />{required(!firstName.trim())}</label>
              <label className={labelClass}>Surname<input className={fieldClass} name="surname" value={surname} onChange={(event) => setSurname(event.target.value)} />{required(!surname.trim())}</label>
              {!fullSetup ? <div className="flex flex-col items-start gap-3 rounded-md border border-[#e67e22] bg-[#fff8e8] px-4 py-3 text-[12px] normal-case leading-relaxed tracking-normal text-[#8a5200]">
                <p><strong className="text-[#6f4100]">Quick start:</strong> enter first name, surname and start date to unlock the tool. Mentor, pathway and all other fields can be completed during baseline setup.</p>
                <button type="button" onClick={() => setFullSetup(true)} className="rounded border border-[#e67e22] bg-white px-3 py-2 text-[11px] font-extrabold uppercase tracking-[0.03em] text-[#c65f00]">Complete full setup ▾</button>
              </div> : null}
              <label className={`${labelClass} ${!fullSetup ? "sm:col-start-2" : ""}`}>Scheme start date<input className={fieldClass} type="date" name="schemeStartDate" value={schemeStartDate} onChange={(event) => setSchemeStartDate(event.target.value)} />{required(!schemeStartDate)}</label>

              {fullSetup ? <>
                <label className={labelClass}>Discipline<select className={fieldClass} name="discipline" value={discipline} onChange={(event) => setDiscipline(event.target.value)}><TextOptions values={DISCIPLINE_OPTIONS} placeholder="Select discipline" /></select></label>
                <label className={labelClass}>Job title<input className={fieldClass} name="jobTitle" defaultValue={candidate.jobTitle} /></label>
                <label className={labelClass}>Team / department<input className={fieldClass} name="employerTeam" defaultValue={candidate.employerTeam} /></label>
                <label className={labelClass}>Office<select className={fieldClass} name="officeLocation" value={officeLocation} onChange={(event) => setOfficeLocation(event.target.value)}><TextOptions values={OFFICE_OPTIONS} placeholder="Select office" /></select></label>
                <label className={labelClass}>Targeted in<select className={fieldClass} name="targetedInYears" value={targetedInYears} onChange={(event) => setTargetedInYears(event.target.value)}><option value="">Not set</option>{TARGETED_IN_YEAR_OPTIONS.map((year) => <option key={year} value={year}>Year {year}</option>)}</select></label>
                <label className={labelClass}>Mentor<select className={fieldClass} name="mentorName" value={mentorName} onChange={(event) => setMentorName(event.target.value)}><TextOptions values={MENTOR_OPTIONS} placeholder="Select mentor" /></select></label>
                <label className={labelClass}>Line manager<select className={fieldClass} name="lineManagerName" value={lineManagerName} onChange={(event) => setLineManagerName(event.target.value)}><TextOptions values={MANAGER_OPTIONS} placeholder="Select line manager" /></select></label>
                <label className={labelClass}>Additional reviewer / sponsor<select className={fieldClass} name="reviewerName" value={reviewerName} onChange={(event) => setReviewerName(event.target.value)}><TextOptions values={MANAGER_OPTIONS} placeholder="Select additional reviewer" /></select></label>
                <label className={labelClass}>Current membership status<input className={fieldClass} name="currentMembershipStatus" defaultValue={pathway.currentMembershipStatus} /></label>
                <label className={labelClass}>Academic / experiential route<input className={fieldClass} name="academicRoute" defaultValue={pathway.academicRoute} /></label>

                <div className="sm:col-span-2 mt-2 border-t border-border pt-5">
                  <h3 className="text-[13px] font-bold text-ink">Professional pathway</h3>
                  <p className="mt-1 text-[12.5px] text-text-muted">Choose the proposed route. Controlled fields use the reference tool’s dropdown and checkbox entry modes.</p>
                </div>
                <label className={labelClass}>Professional body / scheme owner<select className={fieldClass} name="professionalBody" value={professionalBody} onChange={(event) => changeProfessionalBody(event.target.value as ProfessionalBody | "")}><option value="">Select professional body / scheme owner</option><Options options={PROFESSIONAL_BODY_OPTIONS} /></select></label>
                <label className={labelClass}>Primary target outcome<select className={fieldClass} name="primaryOutcome" value={primaryOutcome} onChange={(event) => changeOutcome(event.target.value as PrimaryOutcome | "")}><option value="">Select primary target outcome</option><Options options={primaryOptions} /></select></label>
                {pathwayRules.showCibseMembership ? <label className={labelClass}>Membership target<select className={`${fieldClass} border-2 border-dashed bg-white [border-color:#00a786]`} value={cibseTarget} onChange={(event) => setCibseTarget(event.target.value as typeof cibseTarget)}><Options options={CIBSE_MEMBERSHIP_OPTIONS.filter(({ value }) => pathwayRules.cibseMembershipTargets.some((allowed) => allowed === value))} /></select><input type="hidden" name="cibseMembershipTarget" value={cibseTarget} /></label> : <input type="hidden" name="cibseMembershipTarget" value="none" />}
                {pathwayRules.showIetMembership ? <label className={labelClass}>Membership target<select className={`${fieldClass} border-2 border-dashed bg-white [border-color:#00a786]`} value={ietTarget} onChange={(event) => setIetTarget(event.target.value as typeof ietTarget)}><Options options={IET_MEMBERSHIP_OPTIONS.filter(({ value }) => pathwayRules.ietMembershipTargets.some((allowed) => allowed === value))} /></select><input type="hidden" name="ietMembershipTarget" value={ietTarget} /></label> : <input type="hidden" name="ietMembershipTarget" value="none" />}
                {pathwayRules.showEngineeringRegistration ? <label className={labelClass}>Engineering Council target<select className={`${fieldClass} border-2 border-dashed bg-white [border-color:#00a786]`} value={registrationTarget} onChange={(event) => setRegistrationTarget(event.target.value as typeof registrationTarget)}><Options options={ENGINEERING_REGISTRATION_OPTIONS.filter(({ value }) => pathwayRules.engineeringRegistrationTargets.some((allowed) => allowed === value))} /></select><input type="hidden" name="engineeringRegistrationTarget" value={registrationTarget} /></label> : <input type="hidden" name="engineeringRegistrationTarget" value="none" />}
                {pathwayRules.showLccStrands ? <details className="group rounded border border-border sm:col-span-2"><summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 marker:hidden"><span className="text-[11px] text-black group-open:hidden">▶</span><span className="hidden text-[11px] text-black group-open:inline">▼</span><span className={labelClass}>CIBSE Low Carbon Consultant strands</span></summary><div className="grid gap-2 border-t border-border px-4 py-3 sm:grid-cols-2">{LCC_STRAND_OPTIONS.map(({ value, label }) => <label key={value} className="flex items-start gap-2 text-sm text-text-secondary"><input className="mt-0.5 accent-accent" type="checkbox" name="lccStrands" value={value} defaultChecked={pathway.lccStrands.includes(value)} />{label}</label>)}</div></details> : null}
                {pathwayRules.showSpecialistRoutes ? <details className="group rounded border border-border sm:col-span-2"><summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-3 marker:hidden"><span className="text-[11px] text-black group-open:hidden">▶</span><span className="hidden text-[11px] text-black group-open:inline">▼</span><span className={labelClass}>Specialist certification routes</span></summary><div className="grid gap-2 border-t border-border px-4 py-3 sm:grid-cols-2">{SPECIALIST_ROUTE_OPTIONS.map(({ value, label }) => <label key={value} className="flex items-start gap-2 text-sm text-text-secondary"><input className="mt-0.5 accent-accent" type="checkbox" name="specialistRoutes" value={value} defaultChecked={pathway.specialistRoutes.includes(value)} />{label}</label>)}</div></details> : null}
                <label className={`${labelClass} sm:col-span-2`}>Pathway notes / mentor rationale<textarea className={`${fieldClass} min-h-24 resize-y`} name="pathwayNotes" defaultValue={pathway.notes} /></label>
              </> : <>
                <input type="hidden" name="jobTitle" value={candidate.jobTitle} /><input type="hidden" name="discipline" value={discipline} /><input type="hidden" name="employerTeam" value={candidate.employerTeam} /><input type="hidden" name="officeLocation" value={officeLocation} /><input type="hidden" name="targetedInYears" value={targetedInYears} />
                <input type="hidden" name="mentorName" value={mentorName} /><input type="hidden" name="lineManagerName" value={lineManagerName} /><input type="hidden" name="reviewerName" value={reviewerName} />
                <input type="hidden" name="professionalBody" value={professionalBody} /><input type="hidden" name="primaryOutcome" value={primaryOutcome} /><input type="hidden" name="cibseMembershipTarget" value={cibseTarget} /><input type="hidden" name="ietMembershipTarget" value={ietTarget} /><input type="hidden" name="engineeringRegistrationTarget" value={registrationTarget} /><input type="hidden" name="currentMembershipStatus" value={pathway.currentMembershipStatus} /><input type="hidden" name="academicRoute" value={pathway.academicRoute} /><input type="hidden" name="pathwayNotes" value={pathway.notes} />
                {pathway.lccStrands.map((value) => <input key={value} type="hidden" name="lccStrands" value={value} />)}{pathway.specialistRoutes.map((value) => <input key={value} type="hidden" name="specialistRoutes" value={value} />)}
              </>}
            </div>
            <div className="mt-4 flex min-h-[1.25rem] justify-end">
              <SaveIndicator status={saveStatus} error={saveError} />
            </div>
          </form>
        </div>
      </section>

      <BaselinePanel baseline={baseline} candidateId={candidate.id} minimumReady={minimumReady} canStartL1={canStartL1} minimumValues={{ firstName, surname, schemeStartDate }} />
      </div>
    </div>
  );
}
