"use client";

import { useState } from "react";
import { PROGRESSION_RUBRIC } from "@/lib/graduate-matrix/data/progression-rubric";
import { ENGINEERING_REGISTRATION_OPTIONS, PRIMARY_OUTCOME_OPTIONS, PROFESSIONAL_BODY_OPTIONS } from "@/lib/graduate-matrix/data/pathways";
import type { CandidateInfo } from "@/types/graduate-matrix";
import type { CandidateMatrixView } from "./MatrixPanel";
import { COMPETENCY_PROFILES, TARGET_CURVES } from "@/lib/graduate-matrix/progression-targets";

type GuideTab = "howto" | "targets" | "rubric" | "methods" | "references" | "sources";

const tabs: { id: GuideTab; label: string }[] = [
  { id: "howto", label: "How to use" },
  { id: "references", label: "Reference Tables" },
  { id: "targets", label: "Targets" },
  { id: "methods", label: "Assessment Methods" },
  { id: "rubric", label: "Progression Rubric" },
  { id: "sources", label: "Controlling Sources" },
];

const assessmentMethods = [
  ["Mentor review", "Regular structured review by the appointed mentor; assessment of evidence and reflective accounts.", "Monthly / Quarterly"],
  ["Line manager sign-off", "Confirmation of workplace performance, behaviours and progression.", "Quarterly"],
  ["Portfolio review", "Cumulative review of portfolio evidence against each competence.", "Quarterly + Annual"],
  ["Technical interview", "Structured technical questions by a senior engineer or panel to test depth of understanding.", "Annually"],
  ["Presentation", "Candidate presents project work or a reflective account to a panel.", "Annually"],
  ["Direct observation", "Observation in meetings, on site or during design reviews.", "Project milestones"],
  ["Quarterly review", "Formal progress meeting between candidate, mentor and line manager.", "Quarterly"],
  ["Annual progression panel", "Cross-functional panel reviews portfolio, presentation and interview and agrees the next-year plan.", "Annually"],
] as const;

const sources = [
  ["CIBSE Factsheet M21", "https://www.cibse.org/media/hn3h502t/factsheet-m21.pdf"],
  ["Engineering Council UK-SPEC", "https://www.engc.org.uk/ukspec"],
  ["IET professional registration guidance", "https://www.theiet.org/career/professional-registration/chartered-engineer/am-i-eligible"],
  ["IMechE UK-SPEC profiles", "https://www.imeche.org/membership-registration/professional-development-and-cpd/working-towards-professional-registration/competence-framework-uk-spec"],
] as const;

const ukSpecComparison = [
  ["A", "Knowledge and understanding", "Use engineering knowledge and understanding to apply technical and practical skills.", "Use general and specialist engineering knowledge and understanding to apply existing and emerging technology.", "Use general and specialist engineering knowledge and understanding to optimise advanced and complex systems."],
  ["B", "Design, development and solving engineering problems", "Contribute to the design, development, manufacture, construction, commissioning, operation or maintenance of products, equipment, processes, systems or services.", "Apply theoretical and practical methods to design, develop, manufacture, construct, commission, operate, maintain, decommission and recycle engineering processes, systems, services and products.", "Apply theoretical and practical methods to the analysis and solution of engineering problems."],
  ["C", "Responsibility, management and leadership", "Accept and exercise personal responsibility.", "Provide technical and commercial management.", "Provide technical and commercial leadership."],
  ["D", "Communication and interpersonal skills", "Use effective communication and interpersonal skills.", "Demonstrate effective communication and interpersonal skills.", "Demonstrate effective communication and interpersonal skills."],
  ["E", "Personal and professional commitment", "Demonstrate personal commitment to an appropriate code of professional conduct, recognising obligations to society, the profession and the environment.", "Demonstrate personal commitment to professional standards, recognising obligations to society, the profession and the environment.", "Demonstrate personal commitment to professional standards, recognising obligations to society, the profession and the environment."],
] as const;

function optionLabel(options: readonly { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export default function GuidePanel({ candidate, matrix }: { candidate: CandidateInfo; matrix: CandidateMatrixView }) {
  const [activeTab, setActiveTab] = useState<GuideTab>("howto");

  return (
    <div className="space-y-4">
      <nav className="sticky top-16 z-[5] flex overflow-x-auto border-b-2 border-ink bg-surface px-2" aria-label="Guide sections">
        {tabs.map((tab) => <GuideTabButton key={tab.id} tab={tab} active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} />)}
      </nav>

      {activeTab === "howto" ? <HowTo /> : null}
      {activeTab === "targets" ? <Targets candidate={candidate} matrix={matrix} /> : null}
      {activeTab === "rubric" ? <Rubric /> : null}
      {activeTab === "methods" ? <Methods /> : null}
      {activeTab === "references" ? <References matrix={matrix} /> : null}
      {activeTab === "sources" ? <Sources /> : null}
    </div>
  );
}

function GuideTabButton({ tab, active, onClick }: { tab: { id: GuideTab; label: string }; active: boolean; onClick: () => void }) { return <button type="button" onClick={onClick} className={`shrink-0 border-b-[3px] px-4 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.05em] ${active ? "border-accent text-accent" : "border-transparent text-text-secondary hover:text-ink"}`}>{tab.label}</button>; }

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-lg border border-border bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"><h2 className="text-[16px] font-bold">{title}</h2><div className="guide-copy mt-3 space-y-4 text-[12px] leading-[1.65] text-text-secondary">{children}</div></section>;
}

function HowTo() {
  return <Panel title="How to use this tool">
    <GuideSection title="Where to start">
      <p><strong>Dashboard</strong> is your landing page — it shows total entries logged, competences with evidence, hours, mentor-verified count, and progression by area. Use this to see where you stand and what&apos;s missing.</p>
      <p><strong>Matrix</strong> is where you do the work. Click any competence to open its detail panel. The detail panel shows:</p>
      <ul className="list-disc space-y-1 pl-5"><li><strong>Expected / current / mentor-controlled progression levels</strong> at the top — candidates remain at BL until the mentor starts L1, and only an authorized progression decision changes the current level or assessment status.</li><li><strong>Evidence Log</strong> — the main body. Click <em>Add evidence</em> to log a piece of work that demonstrates the competence. You can log as many entries as you like.</li><li><strong>Competence specification</strong> — internal A1–E5 guidance, expected behaviours, evidence examples and notes. Use <em>Guide → Reference Tables</em> and the linked source documents for exact professional-body wording.</li></ul>
    </GuideSection>
    <GuideSection title="Two separate logs — Matrix vs CPD">
      <p>This tool keeps two records that serve different purposes:</p>
      <ul className="list-disc space-y-1 pl-5"><li><strong>Matrix (competence evidence)</strong> — what you&apos;ve <em>done</em> that demonstrates each UK-SPEC/CIBSE competence. No hours are captured here. A single 30-minute design decision can demonstrate L4 just as well as a 40-hour project.</li><li><strong>CPD Log</strong> — what you&apos;ve <em>learned</em>, in hours: webinars, courses, conferences and technical reading.</li></ul>
      <p>The same activity might generate both records, but you log them separately. This mirrors how CIBSE assesses chartership: competence is judged on capability, not hours.</p>
    </GuideSection>
    <GuideSection title="Logging competence evidence (Matrix)">
      <p>The tool uses <strong>portfolio evidence targets by level</strong> over the duration of the scheme: L1 = 8, L2 = 10, L3 = 12, L4 = 12 and L5 = 6. These are whole-portfolio targets, not per-competence quotas. Each competence still needs enough relevant coverage to show development.</p>
      <p>For each entry, capture:</p>
      <ul className="list-disc space-y-1 pl-5"><li>Date, anonymised project reference, project type and RIBA stage.</li><li>A short title and full career-episode description using the CAR+R, STAR, SOAR or other available structured method.</li><li>The reflective outcome — what you learned and what you would do differently. <strong>This is critical for accreditation.</strong></li><li>Evidence claim level. It defaults to the active cycle, but does not set or change assessed competence level.</li><li>Relevant building-services systems for technical competences.</li><li>Cross-links to other competences and development actions.</li></ul>
    </GuideSection>
    <GuideSection title="Logging CPD (CPD Log tab)">
      <p>Click <strong>+ Log CPD activity</strong> on the CPD Log tab. Capture:</p><ul className="list-disc space-y-1 pl-5"><li>Date, title, hours and CPD category.</li><li>Description and reflection.</li><li>Supporting certificate or note attachments.</li></ul><p>Mentor signs off each CPD entry separately to confirm that it counts toward the annual target.</p>
    </GuideSection>
    <GuideSection title="Mentor sign-off">
      <p>Two distinct mentor actions:</p><ul className="list-disc space-y-1 pl-5"><li><strong>Evidence verification</strong> — confirms that evidence supports the competence at the claimed level. It does not automatically change assessed competence level.</li><li><strong>CPD sign-off</strong> — confirms that the hours and reflection count toward annual CPD.</li></ul>
    </GuideSection>
    <GuideSection title="Mentor-controlled assessment status">
      <p>Progression requires mentor assessment and manager countersign-off before the assessed level is updated. Action plans remain mentor-managed and do not update progression automatically.</p>
      <p>Active-cycle reset affects only the selected competence cycle. Reopening an earlier level restores the controlled earlier-cycle workflow without deleting the audit history.</p>
    </GuideSection>
    <GuideSection title="Setting progression levels">
      <p>BL is the setup stage. Formal competence assessment begins at L1. Candidates cannot change their own competence level. Authorized progression moves the competence to L2, L3, L4 or L5 when the evidence and review requirements are satisfied.</p>
    </GuideSection>
    <GuideSection title="Mentor review workflow">
      <ol className="list-decimal space-y-1 pl-5"><li>Candidate logs entries throughout the review period.</li><li>Mentor reviews Matrix evidence and CPD through their authorized account.</li><li>Mentor records assessment status and next actions.</li><li>Review meetings and outcomes are recorded in Meeting Log.</li><li>Required mentor and manager authorities complete progression.</li></ol>
    </GuideSection>
    <GuideSection title="Data and security">
      <p>The migrated tool stores its canonical records in Supabase. Authentication, row-level security, role relationships, repositories and server actions control access. Browser JSON export/import is not the source of truth in this version.</p>
    </GuideSection>
  </Panel>;
}

function Targets({ candidate, matrix }: { candidate: CandidateInfo; matrix: CandidateMatrixView }) {
  const registration = optionLabel(ENGINEERING_REGISTRATION_OPTIONS, candidate.pathway.engineeringRegistrationTarget);
  const registrationKey = candidate.pathway.engineeringRegistrationTarget === "engtech" || candidate.pathway.engineeringRegistrationTarget === "ieng" ? candidate.pathway.engineeringRegistrationTarget : "ceng";
  return <Panel title="Targets & registration mapping">
    <p>The Matrix now uses a state-driven internal UK-SPEC-aligned target dictionary. The selected Engineering Council registration target on the Candidate page sets the internal baseline target for each competence. Use <em>Customize targets</em> in the Matrix to apply individual overrides where the mentor agrees a non-standard target.</p>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Info label="Scheme start date" value={candidate.schemeStartDate || "Not set"} />
      <Info label="Professional body" value={optionLabel(PROFESSIONAL_BODY_OPTIONS, candidate.pathway.professionalBody)} />
      <Info label="Primary outcome" value={optionLabel(PRIMARY_OUTCOME_OPTIONS, candidate.pathway.primaryOutcome)} />
      <Info label="Registration target" value={registration} />
    </div>
    <Notice><strong>How to read the table:</strong> the Dashboard and Matrix badges use the selected registration target: {registration}. Custom competence target overrides are managed in the Matrix and stored in the canonical candidate record.</Notice>
    <Table headers={["Ref", "Competence", "Y1", "Y2", "Y3", "Y4+", "Profile"]}>
      {matrix.definitions.map((definition) => {
        const profile = COMPETENCY_PROFILES[definition.reference] ?? "applied";
        const curve = TARGET_CURVES[registrationKey][profile];
        const override = matrix.records[definition.id]?.targetLevelOverride;
        return <tr key={definition.id} className="border-t border-border-soft"><Cell strong>{definition.reference}</Cell><Cell>{definition.objective}</Cell>{curve.map((level, index) => <Cell key={`${definition.id}-${index}`}><RubricLevel level={override ?? level} /></Cell>)}<Cell>{profile}</Cell></tr>;
      })}
    </Table>
    <GuideSection title="CPD annual hours target"><p>The Dashboard tracks CPD hours against the configured annual target. CIBSE typically expects approximately 35 hours per year; verify the current professional-body policy.</p></GuideSection>
  </Panel>;
}

function Rubric() {
  return <Panel title="Progression Rubric">
    <p>BL is the onboarding and setup stage before formal assessment begins. The five-level progression scale then runs from L1 to L5. <strong>L4 is the IEng readiness threshold; L5 the CEng readiness threshold.</strong></p>
    <Table headers={["Level", "Label", "Definition", "Indicative demonstration", "Indicative timing"]}>
      <tr className="border-t border-border-soft"><Cell><RubricLevel level="BL" /></Cell><Cell strong>Baseline setup</Cell><Cell>Candidate setup, pathway confirmation and onboarding before the formal competence cycle starts.</Cell><Cell>Minimum candidate details recorded and Baseline onboarding reviewed with the mentor.</Cell><Cell>Before L1</Cell></tr>
      {PROGRESSION_RUBRIC.map((item) => <tr key={item.level} className="border-t border-border-soft"><Cell><RubricLevel level={item.level} /></Cell><Cell strong>{item.name}</Cell><Cell>{item.description}</Cell><Cell>{item.evidenceExpectation}</Cell><Cell>{item.typicalTiming}</Cell></tr>)}
    </Table>
  </Panel>;
}

function RubricLevel({ level }: { level: string }) { return <span className="level-pill" data-level={level}>{level}</span>; }

function Methods() {
  return <Panel title="Assessment Methods">
    <p>Combine multiple methods for robust evidence triangulation. No single method alone is sufficient for professional registration.</p>
    <Table headers={["Method", "Description", "Typical frequency"]}>{assessmentMethods.map(([method, description, frequency]) => <tr key={method} className="border-t border-border-soft"><Cell strong>{method}</Cell><Cell>{description}</Cell><Cell>{frequency}</Cell></tr>)}</Table>
  </Panel>;
}

function References({ matrix }: { matrix: CandidateMatrixView }) {
  return <Panel title="Professional body reference tables">
    <p>Use this tab for the source context behind the condensed competence objective shown in the Matrix.</p>
    <Notice><strong>Important:</strong> this is the internal 17-competence Matrix structure. It is not a verbatim reproduction of CIBSE Factsheet M21. The linked professional-body documents remain controlling.</Notice>
    <Table headers={["Ref", "Area", "Objective", "Range / capability", "Evidence examples", "Route note"]}>
      {matrix.definitions.map((definition) => <tr key={definition.id} className="border-t border-border-soft align-top"><Cell strong>{definition.reference}</Cell><Cell strong>{definition.area}</Cell><Cell>{definition.objective}</Cell><Cell>{definition.behaviours || "—"}</Cell><Cell>{definition.evidenceExamples || "—"}</Cell><Cell>{definition.levelExpectation || definition.relevance || "—"}</Cell></tr>)}
    </Table>
    <GuideSection title="UK-SPEC comparison table — common reference for IET and IMechE routes"><p>IET and IMechE are Engineering Council licensed institutions and use UK-SPEC competence and commitment standards for EngTech, IEng and CEng registration. This table is an internal condensed navigation aid, not a substitute for exact UK-SPEC wording.</p><Table headers={["Area", "Competence area", "EngTech", "IEng", "CEng"]}>{ukSpecComparison.map(([area, title, engtech, ieng, ceng]) => <tr key={area} className="border-t border-border-soft align-top"><Cell strong>{area}</Cell><Cell strong>{title}</Cell><Cell>{engtech}</Cell><Cell>{ieng}</Cell><Cell>{ceng}</Cell></tr>)}</Table></GuideSection>
  </Panel>;
}

function Sources() {
  return <Panel title="Controlling Sources">
    <p>The Matrix combines identified source documents with internal Etch training guidance. Internal wording must not be treated as verbatim professional-body wording unless explicitly verified.</p>
    <Notice><strong>Source-control notice:</strong> for CIBSE MCIBSE, check CIBSE Factsheet M21. For IET and IMechE registration, check Engineering Council UK-SPEC and the relevant institution guidance.</Notice>
    <div className="flex flex-wrap gap-2">{sources.map(([label, href]) => <a key={href} href={href} target="_blank" rel="noreferrer" className="rounded border border-border bg-white px-3 py-2 text-[11px] font-bold text-accent hover:bg-hover">{label}</a>)}</div>
    <GuideSection title="MCIBSE / CEng — Building Services"><p><strong>Controlling source:</strong> CIBSE Factsheet M21 and the current CIBSE competence criteria. Exact objective, range and evidence wording must be checked against the current source before audit or submission.</p></GuideSection>
    <GuideSection title="IET and IMechE routes"><p><strong>Controlling source:</strong> Engineering Council UK-SPEC plus the chosen licensed institution’s application guidance.</p></GuideSection>
    <GuideSection title="CIBSE Low Carbon Consultant"><p><strong>Controlling sources:</strong> the current CIBSE competence framework and Low Carbon Consultant scheme guidance. Verify the current syllabus and assessment route with CIBSE.</p></GuideSection>
    <GuideSection title="Modern internal additions"><ul className="list-disc space-y-1 pl-5"><li>Building Safety Act and duty-holder context.</li><li>Digital engineering and BIM workflows.</li><li>Net zero, embodied carbon and whole-life carbon methods.</li><li>Cyber security within engineering systems.</li><li>Reflective practice and professional ethics.</li></ul></GuideSection>
  </Panel>;
}

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) { return <section><h3 className="mb-1 text-[13px] font-bold text-ink">{title}</h3><div className="space-y-2">{children}</div></section>; }
function Notice({ children }: { children: React.ReactNode }) { return <div className="rounded border border-[#e7c46a] bg-[#fff8e8] px-3 py-2.5 text-[11.5px] text-[#7a5000]">{children}</div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded border border-border bg-surface-subtle p-3"><span className="block text-[9.5px] font-bold uppercase tracking-[0.06em] text-text-muted">{label}</span><strong className="mt-1 block text-[11.5px] text-ink">{value}</strong></div>; }
function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) { return <div className="overflow-x-auto rounded border border-border"><table className="w-full min-w-[760px] border-collapse text-left text-[10.5px]"><thead className="bg-accent text-[9.5px] uppercase tracking-[0.05em] text-black"><tr>{headers.map((header) => <th key={header} className="px-3 py-2 font-bold">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div>; }
function Cell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) { return <td className={`px-3 py-2.5 leading-relaxed ${strong ? "font-bold text-ink" : "text-text-secondary"}`}>{children}</td>; }
