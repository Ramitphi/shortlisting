import { FORM_FIELDS } from "@/lib/domain";
import { CardChip } from "./card-bits";
import type { DocRow } from "./document-table";

/**
 * What we know about the learner, and what we still don't — the first thing
 * on the Eligibility tab, because both the counsellor and Ops are about to
 * decide which programme to put in front of this person and that decision is
 * only as good as the profile behind it.
 *
 * Deliberately two halves: the facts a programme is matched on, and the plain
 * list of what is still blank. A summary that only shows what is filled reads
 * as complete when it isn't.
 */

/** The answers a programme recommendation actually turns on. */
const FACTS: { key: string; label: string; suffix?: string }[] = [
  { key: "degree_level", label: "Degree level" },
  { key: "countries", label: "Countries" },
  { key: "score_10", label: "Class 10", suffix: "%" },
  { key: "score_12", label: "Class 12", suffix: "%" },
  { key: "bachelor_score", label: "Bachelor's", suffix: "%" },
  { key: "bachelor_university", label: "University" },
  { key: "backlogs", label: "Backlogs" },
  { key: "work_exp_months", label: "Work experience", suffix: " months" },
  { key: "finance_plan", label: "Financing" },
];

export function ProfileSummary({
  responses,
  locker,
  learnerName,
}: {
  responses: Record<string, string>;
  /** The shortlisting document checklist, joined to what has been uploaded. */
  locker: DocRow[];
  learnerName?: string | null;
}) {
  const val = (k: string) => (responses[k] ?? "").trim();

  // Ops-derived fields are read off the documents, so they count as "not
  // known yet" too — that is exactly what Ops is looking for here.
  const missing = FORM_FIELDS.filter(
    (f) => f.type !== "file" && !val(f.key)
  ).map((f) => f.label);

  const uploaded = locker.filter((r) => r.filename).length;
  const verified = locker.filter((r) => r.verification === "verified").length;
  const missingDocs = locker.filter(
    (r) => !r.filename && !r.optional
  ).length;

  const shown = missing.slice(0, 8);
  const rest = missing.length - shown.length;

  return (
    <div className="card fade-up p-6">
      <h2 className="font-display text-[15px] font-semibold tracking-tight">
        Profile summary
      </h2>
      <p className="mb-5 mt-1 text-sm text-body">
        What is on file for {learnerName ?? "this learner"} — and what is still
        missing — before a programme is recommended.
      </p>

      <div className="grid gap-x-5 gap-y-3.5 sm:grid-cols-3">
        {FACTS.map((f) => {
          const v = val(f.key);
          return (
            <div key={f.key} className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                {f.label}
              </div>
              <div
                className={`mt-0.5 break-words text-[13.5px] ${
                  v ? "font-medium text-ink" : "text-caption"
                }`}
              >
                {v ? `${v}${f.suffix ?? ""}` : "Not on file"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[13px] font-medium text-ink">
            {missing.length === 0
              ? "Every question answered"
              : `Still unknown (${missing.length})`}
          </span>
          <span className="text-[12.5px] text-caption">
            {missing.length === 0
              ? "Nothing outstanding on the form."
              : "These have no answer yet — ask on the call or read them off the documents."}
          </span>
        </div>
        {shown.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {shown.map((label) => (
              <CardChip key={label} tone="muted">
                {label}
              </CardChip>
            ))}
            {rest > 0 && <CardChip tone="muted">+{rest} more</CardChip>}
          </div>
        )}

        <p className="mt-4 text-[12.5px] text-body">
          <b className="font-semibold text-ink">
            {uploaded}/{locker.length}
          </b>{" "}
          documents uploaded ·{" "}
          <b className="font-semibold text-ink">{verified}</b> verified
          {missingDocs > 0 && (
            <>
              {" · "}
              <span className="text-accent">
                {missingDocs} required still missing
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
