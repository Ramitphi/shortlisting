/**
 * Which declarations a set of answers triggers — the spec's trigger column.
 *
 * Plain JS with no imports, for the same reason as clause-text.js: this runs
 * in three places — the counsellor's wizard as they type, the learner's own
 * later edit, and the demo seed — and a seed that decides undertakings by a
 * different rule than the product is a seed that lies about the product.
 */

/** Age from a yyyy-mm-dd date of birth; null when it isn't a real date. */
function ageFrom(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function triggeredClausesFor(responses) {
  const v = (k) => String((responses && responses[k]) || "").trim();
  const age = ageFrom(v("dob"));
  const degree = v("degree_level");
  const isMasters = degree === "Masters";
  const isBachelors = degree === "Bachelors";
  const isMinor = age !== null && age < 18;

  const ids = [];
  // Every application carries the base declaration.
  ids.push("UT/Dec-PII Data-01");
  if (isMinor) ids.push("CON-Parents-01");
  if (age !== null && ((isBachelors && age > 30) || (isMasters && age > 45)))
    ids.push("ACK-Age/Visa-01");
  if (v("status_12") === "Pursuing") ids.push("UT-uG Doc-01");
  if (v("has_marksheet_12") === "Not yet available")
    ids.push("UT-uG Doc/Result-03");
  if (isMasters) {
    if (v("bachelor_status").indexOf("Pursuing") === 0) ids.push("UT-PG Doc-02");
    const bDocs = v("bachelor_docs");
    if (bDocs === "Yes - Partial Documents" || bDocs === "No")
      ids.push("UT-PG Doc/Result-04");
    // Two backlog declarations: one for a degree already finished (a closed
    // count) and one for a degree still running (a count that can still grow,
    // so it caps rather than states).
    if (Number(v("backlogs") || 0) > 0)
      ids.push(
        v("bachelor_status") === "Completed" ? "UT-Backlog-01" : "UT-Backlog-02"
      );
    const pgDocs = v("pg_docs");
    const pgStatus = v("pg_status");
    if (
      pgDocs === "Yes - Partial Documents" ||
      (pgDocs === "No" && pgStatus && pgStatus !== "No")
    )
      ids.push("UT-PG Doc-02");
  }
  // A profile-building track is not a degree and not an admission, and that
  // is exactly the thing learners assume it is — so it is acknowledged.
  if (degree === "Profile Building") ids.push("ACK-YLP-01");
  // APS is the German academic evaluation; dMAT and TestAS are its entrance
  // tests. Asked of anyone with Germany on their list.
  if (v("countries").indexOf("Germany") !== -1) {
    ids.push("ACK-Others/Exams-01");
    ids.push("ACK-Others/Exams-02");
  }
  // Loan and self-funding are different promises, so they are different
  // clauses — one is about the lender, the other about having the money.
  const finance = v("finance_plan");
  if (finance === "Self-funded") ids.push("ACK-Self Funding-01");
  else if (finance) ids.push("UT/ACK-Loan-01");
  return ids.filter((id, i) => ids.indexOf(id) === i);
}

module.exports = { ageFrom, triggeredClausesFor };
