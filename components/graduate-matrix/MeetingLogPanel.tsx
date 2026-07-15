import {
  getGlobalReviewSummary,
  orderGlobalReviewsNewestFirst,
} from "@/lib/graduate-matrix/reviews";
import type { Meeting, Review } from "@/types/graduate-matrix";

export type MeetingLogViewState = "loaded" | "error" | "integrity-error";

export interface CandidateMeetingLogView {
  state: MeetingLogViewState;
  reviews: Review[];
  meetings: Meeting[];
}

interface MeetingLogPanelProps {
  meetingLog: CandidateMeetingLogView;
}

function displayLabel(value: string) {
  return value.replaceAll("-", " ");
}

export default function MeetingLogPanel({ meetingLog }: MeetingLogPanelProps) {
  if (meetingLog.state === "error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-xl font-bold">Meeting Log unavailable</h2>
        <p className="mt-2 text-sm text-text-secondary">
          We could not load reviews and meetings. Please refresh the page or
          try again later.
        </p>
      </section>
    );
  }

  if (meetingLog.state === "integrity-error") {
    return (
      <section className="rounded-lg border border-border bg-surface p-4 sm:p-5">
        <h2 className="text-xl font-bold">Meeting Log data needs attention</h2>
        <p className="mt-2 text-sm text-text-secondary">
          The stored review or meeting relationships do not match the current
          Graduate Matrix model. Please contact an administrator.
        </p>
      </section>
    );
  }

  const orderedReviews = orderGlobalReviewsNewestFirst(meetingLog.reviews);
  const reviewSummary = getGlobalReviewSummary(meetingLog.reviews);
  const reviewsById = new Map(meetingLog.reviews.map((review) => [review.id, review]));

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-accent">
          Candidate record
        </p>
        <h2 className="mt-1 text-2xl font-bold">Reviews and meetings</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-page p-3">
            <p className="text-2xl font-bold">{reviewSummary.total}</p>
            <p className="text-xs font-semibold text-text-muted">Formal reviews</p>
          </div>
          <div className="rounded-md bg-page p-3">
            <p className="text-2xl font-bold">{reviewSummary.recorded}</p>
            <p className="text-xs font-semibold text-text-muted">Reviews recorded</p>
          </div>
          <div className="rounded-md bg-page p-3">
            <p className="text-2xl font-bold">{meetingLog.meetings.length}</p>
            <p className="text-xs font-semibold text-text-muted">Meetings</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
        <h3 className="text-lg font-bold">Formal candidate reviews</h3>
        {orderedReviews.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">
            No formal candidate reviews have been recorded.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {orderedReviews.map((review) => (
              <article key={review.id} className="rounded-md border border-border bg-page p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold">
                      Review {review.reviewedAt ?? "not yet dated"}
                    </h4>
                    <p className="mt-1 text-sm text-text-secondary">
                      Reviewed by {review.reviewedBy}
                    </p>
                  </div>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold capitalize">
                    {displayLabel(review.outcome)}
                  </span>
                </div>
                <p className="mt-3 text-sm text-text-secondary">
                  {review.notes || "No review notes recorded."}
                </p>
                <p className="mt-2 text-xs text-text-secondary">
                  Next review: {review.nextReviewDate ?? "Not scheduled"}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-surface p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
        <h3 className="text-lg font-bold">Meeting history</h3>
        {meetingLog.meetings.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">
            No meetings have been recorded.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            {meetingLog.meetings.map((meeting) => {
              const linkedReview = meeting.reviewId
                ? reviewsById.get(meeting.reviewId)
                : null;

              return (
                <article key={meeting.id} className="rounded-md border border-border bg-page p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold capitalize">
                        {displayLabel(meeting.type)}
                      </h4>
                      <p className="mt-1 text-sm text-text-secondary">
                        {meeting.date} · {meeting.duration}
                      </p>
                    </div>
                    {linkedReview ? (
                      <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold">
                        Linked to review {linkedReview.reviewedAt ?? "undated"}
                      </span>
                    ) : null}
                  </div>

                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-text-muted">Attendees</dt>
                      <dd className="mt-0.5 text-text-secondary">{meeting.attendees || "Not recorded"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold uppercase tracking-wide text-text-muted">Recorded by</dt>
                      <dd className="mt-0.5 text-text-secondary">{meeting.createdBy}</dd>
                    </div>
                  </dl>
                  {meeting.notes ? (
                    <p className="mt-3 text-sm text-text-secondary">{meeting.notes}</p>
                  ) : null}
                  {meeting.outcome ? (
                    <p className="mt-2 text-sm text-text-secondary">
                      <span className="font-bold text-ink">Outcome:</span> {meeting.outcome}
                    </p>
                  ) : null}
                  {meeting.candidateComment ? (
                    <p className="mt-2 text-sm text-text-secondary">
                      <span className="font-bold text-ink">Candidate reflection:</span>{" "}
                      {meeting.candidateComment}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
