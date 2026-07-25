"use client";

import { useMemo, useRef, useState } from "react";
import { recordEvidenceVerification } from "@/app/portfolio-actions";
import type { CompetencyDefinition, EvidenceEntry } from "@/types/graduate-matrix";
import Modal from "./Modal";
import { evidenceRibaStageLabel } from "./useMatrixPoc";
import type { PocEvidence, PocEvidenceCompetencyDecision, PocEvidenceMethod, PocEvidenceReview, PocEvidenceVersion, useMatrixPoc } from "./useMatrixPoc";

type PocApi = ReturnType<typeof useMatrixPoc>;
type Entry = EvidenceEntry | PocEvidence;

const methodLabels: Record<PocEvidenceMethod, string> = { carr: "CAR+R", star: "STAR", psar: "PSAR" };
const methodFields: Record<PocEvidenceMethod, { key: string; label: string }[]> = {
  carr: [{ key: "context", label: "Context" }, { key: "action", label: "Action" }, { key: "result", label: "Result" }, { key: "reflection", label: "Reflection" }],
  star: [{ key: "situation", label: "Situation" }, { key: "task", label: "Task" }, { key: "action", label: "Action" }, { key: "result", label: "Result" }, { key: "reflection", label: "Reflection" }],
  psar: [{ key: "problem", label: "Problem" }, { key: "solution", label: "Solution" }, { key: "action", label: "Action" }, { key: "result", label: "Result" }, { key: "reflection", label: "Reflection" }],
};

const isPoc = (entry: Entry): entry is PocEvidence => "source" in entry;
const date = (value?: string | null) => value ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not recorded";
const validUrl = (value: string) => { try { const url = new URL(value); return url.protocol === "https:" || url.protocol === "http:"; } catch { return false; } };

export default function MentorEvidenceReviewModal({ entry, competency, allCompetencies, candidateId, canUseServerMentorActions, poc, onClose }: {
  entry: Entry;
  competency: CompetencyDefinition;
  allCompetencies: readonly CompetencyDefinition[];
  candidateId: string;
  canUseServerMentorActions: boolean;
  poc: PocApi;
  onClose: () => void;
}) {
  const local = isPoc(entry);
  const primaryRef = local ? entry.primaryCompetencyRef : competency.reference;
  const displayId = `${primaryRef}-${entry.id.startsWith("local-poc") ? "E01" : entry.id.slice(0, 6).toUpperCase()}`;
  const competencyTitle = (ref: string) => allCompetencies.find((item) => item.reference === ref)?.area ?? ref;

  // ---- Local POC Evidence: full interactive review ----
  const reviewable = local ? entry.versions.filter((version) => version.status === "submitted" || version.status === "returned").at(-1) ?? null : null;
  const latestAny = local ? entry.versions.at(-1) ?? null : null;
  const [viewVersion, setViewVersion] = useState<PocEvidenceVersion | null>(reviewable);
  const reviews = useMemo(() => local ? poc.state.evidenceReviews.filter((review) => review.evidenceId === entry.id) : [], [local, poc.state.evidenceReviews, entry.id]);
  const existingReview = reviewable ? reviews.find((review) => review.versionId === reviewable.id) : undefined;
  const existingOutcome: "" | "verify" | "return" = existingReview?.outcome === "verified" ? "verify" : existingReview?.outcome === "returned" ? "return" : "";
  const [historyOpen, setHistoryOpen] = useState(false);
  const [feedback, setFeedback] = useState(existingReview?.feedback ?? "");
  const [outcome, setOutcome] = useState<"" | "verify" | "return">(existingOutcome);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const feedbackRef = useRef<HTMLTextAreaElement>(null);
  const outcomeRef = useRef<HTMLSelectElement>(null);
  const reviewed = Boolean(existingReview);

  const decisionByRef = useMemo(() => {
    const map = new Map<string, PocEvidenceCompetencyDecision>();
    [...reviews].sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt)).forEach((review) => review.competencyDecisions.forEach((decision) => map.set(decision.ref, decision)));
    return map;
  }, [reviews]);
  const suggestedRefs = reviewable?.suggestedCompetencyRefs ?? [];
  const [choices, setChoices] = useState<Record<string, "accepted" | "declined" | "pending">>(() => {
    const initial: Record<string, "accepted" | "declined" | "pending"> = {};
    suggestedRefs.forEach((ref) => { initial[ref] = decisionByRef.get(ref)?.decision ?? "pending"; });
    return initial;
  });
  const setChoice = (ref: string, decision: "accepted" | "declined") => { if (reviewed) return; setChoices((current) => ({ ...current, [ref]: decision })); };

  const initial = `${existingReview?.feedback ?? ""}|${existingOutcome}`;
  const dirty = !reviewed && `${feedback}|${outcome}` !== initial;
  const requestClose = () => { if (dirty && !window.confirm("Discard your unsaved mentor review?")) return; onClose(); };

  const buttonLabel = outcome === "verify" ? "Verify Evidence" : outcome === "return" ? "Return for revision" : "Select an outcome";
  const save = () => {
    if (!reviewable) return;
    if (!outcome) { setMessage("Select a review outcome."); outcomeRef.current?.focus(); return; }
    if (outcome === "return" && feedback.trim().length < 10) { setMessage("Enter at least 10 characters of constructive mentor feedback."); feedbackRef.current?.focus(); return; }
    setSaving(true);
    const now = new Date().toISOString();
    const decisions: PocEvidenceCompetencyDecision[] = Object.entries(choices).filter(([, value]) => value === "accepted" || value === "declined").map(([ref, decision]) => ({ ref, decision: decision as "accepted" | "declined", decidedBy: poc.state.mentorName || "Preview mentor", decidedAt: now }));
    const review: PocEvidenceReview = { id: `local-poc-evidence-review-${Date.now()}`, evidenceId: entry.id, versionId: reviewable.id, version: reviewable.version, reviewerName: poc.state.mentorName || "Preview mentor", outcome: outcome === "verify" ? "verified" : "returned", feedback: feedback.trim(), competencyDecisions: decisions, reviewedAt: now };
    poc.commit((state) => ({
      ...state,
      evidenceReviews: [...state.evidenceReviews, review],
      evidence: state.evidence.map((item) => item.id === entry.id ? { ...item, versions: item.versions.map((version) => version.id === reviewable.id ? { ...version, status: outcome === "verify" ? "verified" : "returned" } : version), updatedAt: now } : item),
    }));
    onClose();
  };

  if (local) {
    if (!reviewable || !viewVersion) return <Modal title="Review Evidence" size="mentor-review" onClose={onClose} footer={<button className="btn-ghost" onClick={onClose}>Close</button>}>
      <div className="mentor-review-form"><div className="action-comment-subtitle">{displayId} · {latestAny?.title || "Untitled evidence"}</div>
        <section className="mentor-review-section"><h3>Evidence summary</h3><div className="record-detail"><div><span>Claim level</span><strong>{latestAny?.claimedLevel || "—"}</strong></div><div><span>Project / reference</span><strong>{latestAny?.projectReference || "—"}</strong></div><div><span>Date</span><strong>{latestAny?.date || "—"}</strong></div><div><span>Status</span><strong>{(latestAny?.status || "draft").replaceAll("-", " ")}</strong></div></div><div className="mentor-review-copy"><strong>Primary competency</strong><p>{primaryRef} · {competencyTitle(primaryRef)}</p></div></section>
        <p className="record-empty-copy">No submitted Evidence is available for review yet.</p>
      </div>
    </Modal>;

    const fields = methodFields[viewVersion.method] ?? Object.keys(viewVersion.fields).map((key) => ({ key, label: key.replaceAll("-", " ") }));
    return <Modal title="Review Evidence" size="mentor-review" onClose={requestClose} footer={reviewed ? <button type="button" className="btn-ghost" onClick={onClose}>Close</button> : <><button type="button" className="btn-ghost" onClick={requestClose}>Cancel</button><span className="response-footer-status" role="status" aria-live="polite">{message}</span><button type="button" className="btn-primary" disabled={!outcome || saving} onClick={save}>{saving ? "Saving…" : buttonLabel}</button></>}>
      <div className="mentor-review-form"><div className="action-comment-subtitle">{displayId} · {viewVersion.title || "Untitled evidence"}</div>

        <section className="mentor-review-section"><h3>Evidence summary</h3><div className="record-detail"><div><span>Candidate</span><strong>{poc.state.candidateName || "Candidate"}</strong></div><div><span>Date</span><strong>{viewVersion.date || "Not set"}</strong></div><div><span>Claim level</span><strong>{viewVersion.claimedLevel}</strong></div><div><span>Project / reference</span><strong>{viewVersion.projectReference || "—"}</strong></div><div><span>Project type</span><strong>{viewVersion.projectType || "Not set"}</strong></div><div><span>RIBA design stage</span><strong>{evidenceRibaStageLabel(viewVersion.ribaStage)}</strong></div><div><span>Method</span><strong>{methodLabels[viewVersion.method]}</strong></div><div><span>Status</span><strong>{viewVersion.status.replaceAll("-", " ")}</strong></div></div></section>

        <section className="mentor-review-section"><h3>Evidence being reviewed</h3><div className="mentor-response-meta"><span><b>Version</b>{viewVersion.version}</span><span><b>Saved</b>{date(viewVersion.savedAt)}</span><span><b>Submitted</b>{date(viewVersion.submittedAt)}</span></div><div className="mentor-response-sections">{fields.map((field) => { const value = viewVersion.fields[field.key]?.trim(); return value ? <article key={field.key}><strong>{field.label}</strong><p>{value}</p></article> : <article className="empty" key={field.key}><strong>{field.label}</strong><p>Not provided</p></article>; })}</div><details className="mentor-quality-context"><summary>Candidate writing guidance result</summary><p>{viewVersion.advisoryQualityScore ? `Advisory score ${viewVersion.advisoryQualityScore} of 5.` : "No advisory result was recorded."} This automated result is writing guidance only and does not replace mentor judgement.</p></details>
          <div className="mentor-supporting-grid"><div><h4>Supporting files</h4>{viewVersion.attachments.length ? viewVersion.attachments.map((item) => <div className="mentor-material-row" key={item.id}><span><b>{item.name || "Unnamed file"}</b><small>{item.detail || "File"}{item.size ? ` · ${(item.size / 1024).toFixed(1)} KB` : ""}</small></span><em>Metadata only</em></div>) : <p className="record-empty-copy">No supporting files supplied.</p>}<small>File metadata is stored locally. File contents are not retained after refresh.</small></div><div><h4>Document links</h4>{viewVersion.documentLinks.length ? viewVersion.documentLinks.map((item) => <div className="mentor-material-row" key={item.id}><span><b>{item.title || "Untitled document"}</b><small>{item.reference || "No reference"}{item.revision ? ` · ${item.revision}` : ""}{item.accessNote ? ` · ${item.accessNote}` : ""}</small></span>{validUrl(item.url) ? <a className="btn-ghost" href={item.url} target="_blank" rel="noreferrer">Open</a> : <em>Invalid URL</em>}</div>) : <p className="record-empty-copy">No document links supplied.</p>}</div></div>
        </section>

        <section className="mentor-review-section"><h3>Linked competencies</h3>
          <div className="evidence-competency-review-row"><span className="evidence-competency-chip primary">{primaryRef}</span><small>{competencyTitle(primaryRef)} · Primary · Fixed</small></div>
          {suggestedRefs.length ? suggestedRefs.map((ref) => {
            const decided = decisionByRef.get(ref);
            const choice = choices[ref] ?? "pending";
            return <div className="evidence-competency-review-row" key={ref}>
              <span className="evidence-competency-chip suggested">{ref}</span>
              <small>{competencyTitle(ref)} · Suggested by candidate{decided ? ` · ${decided.decision === "accepted" ? "Accepted" : "Declined"} by ${decided.decidedBy} · ${date(decided.decidedAt)}` : ""}</small>
              {!reviewed ? <div className="record-controls"><button type="button" className={choice === "accepted" ? "btn-primary" : "btn-ghost"} onClick={() => setChoice(ref, "accepted")}>Accept</button><button type="button" className={choice === "declined" ? "btn-danger" : "btn-ghost"} onClick={() => setChoice(ref, "declined")}>Decline</button></div> : null}
            </div>;
          }) : <p className="record-empty-copy">The candidate has not proposed any additional competency cross-links for this version.</p>}
        </section>

        {viewVersion.systems.length ? <section className="mentor-review-section"><h3>Technical coverage</h3><div className="evidence-systems-grid">{viewVersion.systems.map((system) => <span className="evidence-system-chip active" key={system}>{system.replaceAll("-", " ")}</span>)}</div></section> : null}

        <details className="mentor-review-section mentor-review-history" open={historyOpen} onToggle={(event) => setHistoryOpen(event.currentTarget.open)}><summary>Evidence history · {entry.versions.length} version{entry.versions.length === 1 ? "" : "s"} · {reviews.length} mentor review{reviews.length === 1 ? "" : "s"}</summary><div>{[...entry.versions].reverse().map((version) => <button type="button" className={viewVersion.id === version.id ? "active" : ""} onClick={() => setViewVersion(version)} key={version.id}><b>Version {version.version} · {methodLabels[version.method]}</b><span>{version.status} · saved {date(version.savedAt)}{version.submittedAt ? ` · submitted ${date(version.submittedAt)}` : ""}</span>{reviews.filter((review) => review.versionId === version.id).map((review) => <small key={review.id}>{review.outcome} by {review.reviewerName} · {date(review.reviewedAt)}{review.feedback ? ` · ${review.feedback}` : ""}</small>)}</button>)}</div></details>

        <section className="mentor-review-section"><h3>Mentor review</h3><label>Your name (mentor)<input readOnly value={existingReview?.reviewerName || poc.state.mentorName || "Preview mentor"} /></label><label>Mentor feedback<textarea readOnly={reviewed} ref={feedbackRef} rows={5} value={feedback} aria-describedby="mentor-evidence-feedback-help" onChange={(event) => setFeedback(event.target.value)} /><small id="mentor-evidence-feedback-help">Explain what was satisfactory, what remains outstanding, or what the candidate must revise.</small></label><label>Review outcome<select disabled={reviewed} ref={outcomeRef} value={outcome} onChange={(event) => setOutcome(event.target.value as typeof outcome)}><option value="">Select an outcome</option><option value="verify">Verify Evidence</option><option value="return">Return for revision</option></select></label>{outcome === "return" ? <p className="mentor-decision-guidance warning">The candidate will see this Evidence as returned and can revise and resubmit it.</p> : outcome === "verify" ? <p className="mentor-decision-guidance">Verifying locks this Evidence version as the candidate&rsquo;s signed-off record.</p> : null}</section>
      </div>
    </Modal>;
  }

  // ---- Server-backed (production) Evidence: read-only summary + the existing verification action ----
  const method = entry.method && methodFields[entry.method] ? entry.method : "carr";
  const structuredFields = entry.structuredSections?.method === method ? entry.structuredSections.values : null;
  const fields = methodFields[method];
  return <Modal title="Review Evidence" size="mentor-review" onClose={onClose} footer={<button type="button" className="btn-ghost" onClick={onClose}>Close</button>}>
    <div className="mentor-review-form"><div className="action-comment-subtitle">{displayId} · {entry.title || "Untitled evidence"}</div>
      <section className="mentor-review-section"><h3>Evidence summary</h3><div className="record-detail"><div><span>Date</span><strong>{entry.date || "Not set"}</strong></div><div><span>Claim level</span><strong>{entry.claimedLevel}</strong></div><div><span>Project / reference</span><strong>{entry.projectReference || "—"}</strong></div><div><span>Project type</span><strong>{entry.projectType || "Not set"}</strong></div><div><span>RIBA design stage</span><strong>{evidenceRibaStageLabel(entry.ribaStage)}</strong></div><div><span>Status</span><strong>{entry.verificationStatus.replaceAll("-", " ")}</strong></div></div></section>
      <section className="mentor-review-section"><h3>Evidence being reviewed</h3>{structuredFields ? <div className="mentor-response-sections">{fields.map((field) => { const value = structuredFields[field.key]?.trim(); return value ? <article key={field.key}><strong>{field.label}</strong><p>{value}</p></article> : null; })}</div> : <div className="mentor-response-sections"><article><strong>Description</strong><p>{entry.description || "No description recorded."}</p></article><article><strong>Outcome</strong><p>{entry.outcome || "Not recorded."}</p></article></div>}</section>
      {entry.systems.length ? <section className="mentor-review-section"><h3>Technical coverage</h3><div className="evidence-systems-grid">{entry.systems.map((system) => <span className="evidence-system-chip active" key={system}>{system}</span>)}</div></section> : null}
      {canUseServerMentorActions ? <section className="mentor-review-section"><h3>Mentor review</h3><form action={recordEvidenceVerification} className="record-review-form"><input type="hidden" name="candidateId" value={candidateId} /><input type="hidden" name="evidenceId" value={entry.id} /><label>Decision<select name="outcome" defaultValue={entry.verificationStatus === "verified" ? "reverification-required" : "verified"}><option value="verified">Verify Evidence</option><option value="reverification-required">Return for revision</option></select></label><label>Reason (optional)<input name="reason" /></label><button className="btn-primary">Record decision</button></form></section> : null}
    </div>
  </Modal>;
}
