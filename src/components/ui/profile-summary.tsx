import { SectionCard } from "./section-card";
import { IconClipboardFill } from "./icons";

/**
 * What we know about the learner — its own card in the stack, ahead of the
 * programme sections, because both the counsellor and Ops are about to decide
 * which programme to put in front of this person and that decision is only as
 * good as the profile behind it.
 *
 * The question set comes from the eligibility sheet, and the sheet asks
 * different things depending on what the learner is going for: a Bachelor's
 * application stops at Class 12, a Master's carries on into the degree, any
 * post-graduate study and the work history after it. Showing a Bachelor's
 * learner five empty blocks about a degree they have not started reads as
 * missing data; here those blocks simply are not asked.
 *
 * Every block collapses. Ops and the counsellor come to this card for one or
 * two answers at a time — the scores, the backlogs, the work months — so the
 * card opens small and each block opens on the arrow.
 */

type Responses = Record<string, string>;

interface Fact {
  key: string;
  label: string;
  suffix?: string;
  /**
   * The muted second line. The sheet clubs pairs of questions together —
   * degree name with its completion year, university with its mode — and
   * this is how they read as one answer instead of two rows.
   */
  note?: (r: Responses) => string | null;
  /** The sheet's comment column: some answers are only asked in some cases. */
  when?: (r: Responses) => boolean;
}

interface Group {
  id: string;
  title: string;
  /** Which degree levels the sheet asks this block for. */
  levels: readonly string[];
  when?: (r: Responses) => boolean;
  facts: Fact[];
}

const ALL_LEVELS = ["Bachelors", "Masters", "Profile Building"] as const;
/** The sheet's right-hand bracket: these blocks belong to a Master's. */
const AFTER_SCHOOL = ["Masters", "Profile Building"] as const;

const val = (r: Responses, k: string) => (r[k] ?? "").trim();

/** Q4 is asked for the age it gives us — so the card does that sum. */
function ageFrom(dob: string): string | null {
  const d = new Date(dob);
  if (!dob || Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const months = now.getMonth() - d.getMonth();
  if (months < 0 || (months === 0 && now.getDate() < d.getDate())) age -= 1;
  return age > 0 && age < 120 ? `${age} years old` : null;
}

/**
 * "2019-06" reads better as "June 2019" on a summary. Applied to every
 * answer, not just the ones we know are months: the shape is unambiguous and
 * a stored month should never reach a reader as a hyphenated number.
 */
function monthYear(v: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  if (!m) return v;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (Number.isNaN(date.getTime())) return v;
  return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

const GROUPS: Group[] = [
  {
    id: "basics",
    title: "Basics",
    levels: ALL_LEVELS,
    facts: [
      { key: "dob", label: "Date of birth", note: (r) => ageFrom(val(r, "dob")) },
      { key: "degree_level", label: "Degree to pursue" },
      { key: "countries", label: "Countries to study in" },
      { key: "finance_plan", label: "Financing plan" },
    ],
  },
  {
    id: "school",
    title: "Class 10 & 12",
    levels: ALL_LEVELS,
    facts: [
      { key: "score_10", label: "Class 10 score", suffix: "%" },
      { key: "completion_10", label: "Class 10 completion year" },
      { key: "board_12", label: "Class 12 board / category" },
      { key: "stream_12", label: "Class 12 stream" },
      {
        key: "completion_12",
        label: "Class 12 completion",
        note: (r) => {
          const s = val(r, "status_12");
          return s && s !== "Completed" ? s : null;
        },
      },
      { key: "score_12", label: "Class 12 score", suffix: "%" },
      // The sheet marks NEET as premium — it is only asked of an MBBS intent.
      {
        key: "neet_status",
        label: "NEET exam status",
        when: (r) => val(r, "mbbs_intent") === "Yes",
      },
    ],
  },
  {
    id: "bachelors",
    title: "Bachelor's degree",
    levels: AFTER_SCHOOL,
    facts: [
      {
        key: "bachelor_degree",
        label: "Degree",
        note: (r) => {
          const done = val(r, "bachelor_completion");
          const status = val(r, "bachelor_status");
          if (done) return `Completed ${monthYear(done)}`;
          return status || null;
        },
      },
      {
        key: "bachelor_university",
        label: "University",
        note: (r) => val(r, "bachelor_mode") || null,
      },
      { key: "bachelor_score", label: "Score", suffix: "%" },
      { key: "backlogs", label: "Backlogs / ATKTs" },
      // Only when it is not English — an English-medium degree needs no note.
      {
        key: "bachelor_medium",
        label: "Medium of instruction",
        when: (r) => {
          const v = val(r, "bachelor_medium");
          return Boolean(v) && v !== "English";
        },
      },
      { key: "bachelor_naac", label: "University NAAC status" },
      // Anabin is the German recognition database — asked only for Germany.
      {
        key: "bachelor_anabin",
        label: "University Anabin status",
        when: (r) => val(r, "countries").includes("Germany"),
      },
    ],
  },
  {
    id: "postgraduate",
    title: "After Bachelor's",
    levels: AFTER_SCHOOL,
    // The sheet only opens this block when there is a degree after the
    // bachelor's; "No" is an answer, not a gap to fill in.
    when: (r) => {
      const s = val(r, "pg_status");
      return s === "Completed" || s === "Currently Pursuing";
    },
    facts: [
      {
        key: "pg_degree",
        label: "Degree",
        note: (r) => {
          const done = val(r, "pg_completion");
          return done ? `Completed ${monthYear(done)}` : val(r, "pg_status") || null;
        },
      },
      { key: "pg_university", label: "University" },
      { key: "pg_score", label: "Score", suffix: "%" },
      { key: "pg_naac", label: "University NAAC / Anabin" },
    ],
  },
  {
    id: "work",
    title: "Work history",
    levels: AFTER_SCHOOL,
    facts: [
      {
        key: "work_exp_months",
        label: "Work experience after Bachelor's",
        suffix: " months",
      },
      { key: "career_gap_months", label: "Career gap", suffix: " months" },
    ],
  },
];

/** The disclosure arrow — points right when shut, down when open. */
function Caret() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0 text-caption transition-transform duration-150 group-open/block:rotate-90"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function ProfileSummary({
  responses,
  learnerName,
}: {
  responses: Record<string, string>;
  learnerName?: string | null;
}) {
  const level = val(responses, "degree_level");
  // An unanswered degree level should not hide half the profile — until the
  // answer exists, show everything the sheet can ask.
  const asks = (g: Group) =>
    (!level || g.levels.includes(level)) && (!g.when || g.when(responses));
  const groups = GROUPS.filter(asks);
  // Named plainly, because "why is there no degree block?" is the first
  // question a counsellor asks when they open someone else's learner.
  const skipped = GROUPS.filter((g) => !g.levels.includes(level)).map(
    (g) => g.title
  );

  return (
    <SectionCard
      id="profile-summary"
      className="fade-up"
      icon={<IconClipboardFill />}
      title="Profile summary"
      subtitle={`What is on file for ${learnerName ?? "this learner"} before a programme is recommended.`}
    >
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {groups.map((g, i) => {
          const facts = g.facts.filter((f) => !f.when || f.when(responses));
          const onFile = facts.filter((f) => val(responses, f.key)).length;
          return (
            <details
              key={g.id}
              open={i === 0}
              className="group/block bg-white open:bg-paper/40"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 text-[13.5px] font-semibold text-ink">
                  {g.title}
                </span>
                <span className="ml-auto flex shrink-0 items-center gap-2.5">
                  <span className="text-[11.5px] text-caption">
                    {onFile} of {facts.length}
                  </span>
                  <Caret />
                </span>
              </summary>
              <div className="grid gap-x-5 gap-y-3.5 border-t border-line px-4 pb-4 pt-3.5 sm:grid-cols-3">
                {facts.map((f) => {
                  const v = val(responses, f.key);
                  const note = v && f.note ? f.note(responses) : null;
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
                        {v ? `${monthYear(v)}${f.suffix ?? ""}` : "Not on file"}
                      </div>
                      {note && (
                        <div className="mt-0.5 text-[12px] text-caption">
                          {note}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
      {skipped.length > 0 && (
        <p className="mt-2.5 text-[12px] text-caption">
          {skipped.join(", ")}{" "}
          {skipped.length === 1 ? "is" : "are"} not asked on a{" "}
          {level === "Bachelors" ? "Bachelor's" : level} application.
        </p>
      )}
    </SectionCard>
  );
}
