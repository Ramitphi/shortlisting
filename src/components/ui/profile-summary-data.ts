/**
 * The eligibility sheet, as data.
 *
 * The sheet asks different things depending on what the learner is going for:
 * a Bachelor's application stops at Class 12, a Master's carries on into the
 * degree, any study after it, and the work history since. This module answers
 * "what does the sheet ask about THIS learner, and what do we have" once, so
 * every view of the summary argues from the same resolved list.
 */

type Responses = Record<string, string>;

interface FactDef {
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

interface GroupDef {
  id: string;
  title: string;
  /** Which degree levels the sheet asks this block for. */
  levels: readonly string[];
  when?: (r: Responses) => boolean;
  facts: FactDef[];
}

/** One resolved answer, ready for any view to render. */
export interface SummaryFact {
  key: string;
  label: string;
  /** Formatted and suffixed; empty when the answer is not on file. */
  value: string;
  note: string | null;
}

/** One resolved block of the sheet. */
export interface SummaryGroup {
  id: string;
  title: string;
  facts: SummaryFact[];
  /** How many of this block's questions have an answer. */
  onFile: number;
}

const ALL_LEVELS = ["Bachelors", "Masters", "Profile Building"] as const;
/** The sheet's right-hand bracket: these blocks belong to a Master's. */
const AFTER_SCHOOL = ["Masters", "Profile Building"] as const;

const val = (r: Responses, k: string) => (r[k] ?? "").trim();

/** Q4 is asked for the age it gives us — so the card does that sum. */
export function ageFrom(dob: string): string | null {
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
export function monthYear(v: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(v);
  if (!m) return v;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  if (Number.isNaN(date.getTime())) return v;
  return date.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

const GROUPS: GroupDef[] = [
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

/** The blocks the sheet asks about this learner, with their answers filled in. */
export function summaryGroups(responses: Responses): SummaryGroup[] {
  const level = val(responses, "degree_level");
  return GROUPS.filter(
    // An unanswered degree level should not hide half the profile — until the
    // answer exists, show everything the sheet can ask.
    (g) =>
      (!level || g.levels.includes(level)) && (!g.when || g.when(responses))
  ).map((g) => {
    const facts: SummaryFact[] = g.facts
      .filter((f) => !f.when || f.when(responses))
      .map((f) => {
        const raw = val(responses, f.key);
        return {
          key: f.key,
          label: f.label,
          value: raw ? `${monthYear(raw)}${f.suffix ?? ""}` : "",
          note: raw && f.note ? f.note(responses) : null,
        };
      });
    return {
      id: g.id,
      title: g.title,
      facts,
      onFile: facts.filter((f) => f.value).length,
    };
  });
}

/**
 * The blocks this application never asks. Named plainly, because "why is
 * there no degree block?" is the first question a counsellor asks when they
 * open someone else's learner.
 */
export function summarySkipped(responses: Responses): string[] {
  const level = val(responses, "degree_level");
  if (!level) return [];
  return GROUPS.filter((g) => !g.levels.includes(level)).map((g) => g.title);
}

/** "a Bachelor's" / "a Master's" — for a sentence, not a chip. */
export function levelPhrase(responses: Responses): string {
  const level = val(responses, "degree_level");
  if (level === "Bachelors") return "a Bachelor's";
  if (level === "Masters") return "a Master's";
  return level ? `a ${level}` : "an";
}

/**
 * The profile in a couple of sentences — the answers a programme decision
 * actually turns on, in the order someone would say them out loud. Written
 * from the same resolved answers the blocks below show, so the paragraph can
 * never drift from the table it summarises.
 */
export function summaryNarrative(
  responses: Responses,
  learnerName?: string | null
): string {
  const name = (learnerName ?? "This learner").split(" ")[0];
  const level = val(responses, "degree_level");
  const countries = val(responses, "countries");
  const age = ageFrom(val(responses, "dob"));
  const bScore = val(responses, "bachelor_score");
  const bDegree = val(responses, "bachelor_degree");
  const bUni = val(responses, "bachelor_university");
  const s12 = val(responses, "score_12");
  const s10 = val(responses, "score_10");
  const backlogs = val(responses, "backlogs");
  const work = val(responses, "work_exp_months");
  const gap = val(responses, "career_gap_months");
  const finance = val(responses, "finance_plan");
  const isBachelors = level === "Bachelors";

  const bits: string[] = [];

  // Who, and what they are going for.
  const going = level ? `is going for ${levelPhrase(responses)}` : "has not picked a degree level yet";
  bits.push(
    `${name}${age ? `, ${age.replace(" years old", "")},` : ""} ${going}${
      countries ? ` in ${countries}` : ""
    }.`
  );

  // What they are bringing to it.
  if (isBachelors) {
    const school: string[] = [];
    if (s12) school.push(`${s12}% in Class 12`);
    if (s10) school.push(`${s10}% in Class 10`);
    if (school.length) bits.push(`They scored ${school.join(" and ")}.`);
  } else {
    const degree: string[] = [];
    if (bDegree) degree.push(bDegree);
    if (bUni) degree.push(`from ${bUni}`);
    if (degree.length || bScore) {
      bits.push(
        `They hold ${degree.length ? `${degree.join(" ")}` : "a bachelor's degree"}${
          bScore ? ` at ${bScore}%` : ""
        }${backlogs === "0" ? " with no backlogs" : backlogs ? ` with ${backlogs} backlog(s)` : ""}.`
      );
    }
    // Only once there is a degree to have worked "since" — and never assert a
    // career gap nobody has entered.
    const hasDegree = Boolean(bDegree || bUni || bScore);
    if (work && hasDegree) {
      const months = Number(work);
      const spell =
        Number.isFinite(months) && months >= 12
          ? `${Math.floor(months / 12)} year${Math.floor(months / 12) === 1 ? "" : "s"}`
          : `${work} months`;
      const gapPart =
        gap === "" ? "" : gap === "0" ? ", with no career gap" : `, and a ${gap}-month career gap`;
      bits.push(`${spell} of work experience since${gapPart}.`);
    } else if (work && !hasDegree) {
      bits.push(`${work} months of work experience on file.`);
    }
  }

  if (finance) bits.push(`Financing: ${finance.toLowerCase()}.`);
  return bits.join(" ");
}
