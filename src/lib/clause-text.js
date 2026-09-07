/**
 * Filling the legal team's blanks.
 *
 * Clause wording ships with angle-bracket placeholders — a date, a
 * percentage, a backlog count. Filling them from the learner's own answers
 * is what turns a template into something a person can actually be asked to
 * agree to: a promise about a specific score by a specific month, not
 * "<%> by <DD/MM/YY>". Anything we have no answer for degrades to plain
 * words rather than leaving brackets on screen.
 *
 * Plain JS with no imports on purpose: both the document generator
 * (vetting.ts) and the demo seed (demo-seed.js) need it, and a document
 * whose text depends on which of the two created it is not one document.
 */

function monthName(raw) {
  const m = /^(\d{4})-(\d{2})$/.exec(raw || "");
  if (!m) return raw;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
  return Number.isNaN(d.getTime())
    ? raw
    : d.toLocaleString("en-GB", { month: "long", year: "numeric" });
}

function fillPlaceholders(content, responses) {
  const v = (k) => String((responses && responses[k]) || "").trim();
  const map = {
    COMPLETION: monthName(v("completion_12")) || "the agreed date",
    BACHELOR_COMPLETION: monthName(v("bachelor_completion")) || "the agreed date",
    EXPECTED_12: v("expected_score_12") || "the required",
    BACHELOR_SCORE: v("bachelor_score") || "the stated",
    BACKLOGS: v("backlogs") || "the declared number of",
    UNIVERSITY: v("bachelor_university") || "my university",
    COUNTRIES: v("countries") || "my chosen country",
  };
  return String(content).replace(/<([A-Z_0-9]+)>/g, (whole, key) =>
    key in map ? map[key] : whole
  );
}

module.exports = { fillPlaceholders };
