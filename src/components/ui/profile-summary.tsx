
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
  learnerName,
}: {
  responses: Record<string, string>;
  learnerName?: string | null;
}) {
  const val = (k: string) => (responses[k] ?? "").trim();

  return (
    <div className="card fade-up p-6">
      <h2 className="font-display text-[15px] font-semibold tracking-tight">
        Profile summary
      </h2>
      <p className="mb-5 mt-1 text-sm text-body">
        What is on file for {learnerName ?? "this learner"} before a programme
        is recommended.
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

    </div>
  );
}
