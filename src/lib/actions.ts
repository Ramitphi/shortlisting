// Every mutation in the prototype. These were Next server actions; the data
// now lives in the browser (see browser-db.ts), so they are plain client
// functions with the same signatures — every `action={...}` call site still
// works, `dirty()` stands in for revalidatePath, `goto()` for redirect.

import { getDb } from "./db";
import { dirty, goto, hardGoto } from "./browser-db";
import {
  setActivityView,
  setLearnerView,
  setSessionUid,
  activityViewRaw,
  learnerViewRaw,
} from "./session";
import { requireUser } from "./auth";
import { attachMissingForms, attachRequiredForms, claimApplication } from "./vetting";
import {
  CLAUSES,
  FORM_FIELDS,
  REVIEW_GROUP_BY_KEY,
  reviewGroupsFor,
  commentableFieldOf,
  triggeredClausesFor,
  groupOfField,
  missingForSubmit,
  LEARNER_DOC_BY_KEY,
  MAX_RECOMMENDED_PROGRAMS,
  matchScore,
  affectsEligibility,
  canEditDetails,
  canTransition,
  roleHome,
  type Role,
} from "./domain";
import {
  getApplication,
  getDocuments,
  getFormResponses,
  getLearnerDocs,
  getOfferLetter,
  getPrograms,
  getRemarks,
  logEvent,
  recordView,
  notify,
  notifyRole,
  setStatus,
} from "./queries";

/**
 * Put the demo back to one learner per state. Reviewers click through and
 * change the data — that's the point — so there has to be a way back that
 * doesn't need a terminal. Same code as `npm run seed`.
 */
export async function resetDemoData() {
  requireUser();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { seedDemo } = require("./demo-seed.js");
  seedDemo(getDb());
  setSessionUid(null);
  // Full page load: the session just died under a mounted protected page,
  // and an SPA transition would race its own teardown (see hardGoto).
  await hardGoto("/login?toast=reset");
}

/**
 * Prototype-only presentation switch, driven from the role-switcher FAB.
 *
 * "inline" is the built design: the activity timeline lives in the right rail
 * of the application. "drawer" is the alternative being shown for comparison —
 * the rail disappears and the same log fans out from the right edge behind a
 * button in the header. It is a cookie rather than state so a server component
 * can pick the shape before it renders, without a flash of the wrong one.
 */
export async function toggleActivityView() {
  requireUser();
  setActivityView(activityViewRaw() === "drawer" ? "inline" : "drawer");
}

/**
 * Prototype-only: flip the learner between the redesigned flow (v1) and the
 * one built on the site's current My Applications pages (v2). See
 * `learnerView` in auth.ts. Lands on the learner home so the switch is
 * immediately visible rather than leaving you on a page the other version
 * doesn't have.
 */
export async function toggleLearnerView() {
  requireUser();
  setLearnerView(learnerViewRaw() === "v2" ? "v1" : "v2");
}

// ---------- auth ----------

// Mock credential auth: one demo account per role, password "12345" for all.
// Each maps onto a seeded user so the demo data stays intact. Exported so
// /dev-login can translate the same shortcuts.
export const DEMO_ACCOUNTS: Record<string, string> = {
  "learner@upgrad.com": "neha.learner@example.com",
  "ops@upgrad.com": "omar.ops@example.com",
  "academic@upgrad.com": "arjun.ac@example.com",
  "admin@upgrad.com": "asha.admin@example.com",
};

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const seededEmail = DEMO_ACCOUNTS[email] ?? DEMO_ACCOUNTS[`${email}.com`];
  if (!seededEmail || password !== "12345") return goto("/login?error=1");
  const user = getDb()
    .prepare("SELECT id, role FROM users WHERE email = ?")
    .get(seededEmail) as { id: number; role: Role } | undefined;
  if (!user) return goto("/login?error=1");
  setSessionUid(user.id);
  goto(roleHome(user.role));
}

export async function logout() {
  setSessionUid(null);
  await hardGoto("/login");
}

// ---------- Stage 1: AC fills & submits the eligibility form ----------

/**
 * "Auto-sync with LSQ" — the counsellor's one-click pull of whatever the
 * LeadSquared lead already knows, so the call starts from a part-filled form
 * instead of a blank one. Prototype: stands in for the CRM call with the
 * lead-form fields, and only ever fills fields that are still EMPTY — the
 * counsellor's own answers are never overwritten.
 */
export async function syncFromLsq(applicationId: number) {
  const user = requireUser("ac");
  const app = getApplication(applicationId);
  if (!app || app.ac_id !== user.id || app.status !== "draft") return;

  // What a lead record carries: identity and intent, never academics.
  const lead: Record<string, string> = {
    full_name: app.learner_name ?? "",
    mobile: "+91 98450 21167",
    degree_level: "Masters",
    countries: "Germany, Australia",
    finance_plan: "Education Loan (Partial/Full)",
  };

  const before = getFormResponses(applicationId);
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO form_responses (application_id, field_key, value) VALUES (?, ?, ?)
     ON CONFLICT (application_id, field_key) DO UPDATE SET value = excluded.value`
  );
  const filled: string[] = [];
  // A tick means "I read this section and it is right". LSQ writing into a
  // section after that makes the tick a lie, so the sections the sync touched
  // go back to unconfirmed and the counsellor re-reads what LSQ sent.
  const untick = db.prepare(
    "DELETE FROM group_checks WHERE application_id = ? AND group_key = ? AND actor_role = 'ac'"
  );
  const tx = db.transaction(() => {
    const touched = new Set<string>();
    for (const [key, value] of Object.entries(lead)) {
      if ((before[key] ?? "").trim() || !value) continue;
      upsert.run(applicationId, key, value);
      filled.push(FORM_FIELDS.find((f) => f.key === key)?.label ?? key);
      const group = groupOfField(key);
      if (group) touched.add(group.key);
    }
    touched.forEach((key) => untick.run(applicationId, key));
  });
  tx();

  logEvent(
    applicationId,
    user.id,
    filled.length > 0
      ? `Auto-synced ${filled.length} field(s) from LSQ`
      : "Auto-sync with LSQ — everything already up to date",
    filled.length > 0 ? filled.join(", ") : undefined
  );
  dirty();
}

/**
 * The counsellor's autosave. Draft only: submitting hands the pen to Ops and
 * the counsellor does not get it back. See `editorOf` in domain.ts.
 */
export async function saveForm(applicationId: number, formData: FormData) {
  const user = requireUser("ac");
  const app = getApplication(applicationId);
  // Draft, or ANY live re-check — the page opens the edit board for both
  // (page.tsx: `recheckEditing = Boolean(recheck)`), so this has to accept
  // both or the board saves nothing and says nothing. Same rule as
  // toggleGroupCheck, which is why the ticks used to persist while the field
  // edits beside them vanished.
  // A live re-check re-opens the board — but not while the application is
  // still in Ops' hands for first-pass vetting. There the pen is theirs, and
  // "any live re-check" would have handed it back mid-sentence.
  const recheckEditing =
    Boolean(app?.recheck_at) &&
    app?.ac_id === user.id &&
    app?.status !== "under_review";
  if (!app || app.ac_id !== user.id) return;
  if (!(canEditDetails(app.status, "ac") || recheckEditing)) return;

  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO form_responses (application_id, field_key, value) VALUES (?, ?, ?)
     ON CONFLICT (application_id, field_key) DO UPDATE SET value = excluded.value`
  );
  const tx = db.transaction(() => {
    for (const f of FORM_FIELDS) {
      const v = formData.get(f.key);
      if (v === null) continue;
      upsert.run(applicationId, f.key, String(v));
    }
    // Clauses the call form triggered from the learner's answers.
    const clauses = formData.get("triggered_clauses");
    if (clauses !== null)
      upsert.run(applicationId, "triggered_clauses", String(clauses));
  });
  tx();
  // No event: autosaving is not a milestone, it is just not losing work.
  dirty();
}

export async function submitForm(applicationId: number, formData: FormData) {
  const user = requireUser("ac");
  const app = getApplication(applicationId);
  if (!app || app.ac_id !== user.id) return;
  if (!canTransition(app.status, "under_review", "ac")) return;

  // Save first, then check what we actually have: the button is disabled
  // while anything is missing, but the rule that matters is this one — an
  // application without programmes or a date of birth is one Ops can only
  // send straight back.
  await saveForm(applicationId, formData);
  if (
    missingForSubmit(
      getFormResponses(applicationId),
      getPrograms(applicationId).length
    ).length > 0
  ) {
    return;
  }
  setStatus(applicationId, "under_review");
  logEvent(applicationId, user.id, "Eligibility form submitted", `Submitted by ${user.name} on behalf of ${app.learner_name}`);
  const triggered = String(formData.get("triggered_clauses") ?? "")
    .split("|")
    .filter(Boolean);
  if (triggered.length > 0) {
    logEvent(
      applicationId,
      user.id,
      `${triggered.length} declaration(s) triggered`,
      triggered.map((id) => CLAUSES[id]?.title ?? id).join("; ")
    );
  }
  // Submitting hands it to Ops, so the required forms are generated now
  // rather than when someone happens to open the page.
  attachRequiredForms(applicationId, user.id);
  notifyRole(
    "ops",
    `New learner details submitted: ${app.learner_name} (by ${user.name})`,
    `/ops/application/${applicationId}`
  );
  dirty();
  goto("/ac?toast=submitted");
}

/**
 * The learner's own sign-off: everything they submitted and signed is correct
 * and theirs. Ops cannot release the offer letter until this exists, and
 * editing any detail afterwards withdraws it.
 */
export async function certifyDetails(applicationId: number) {
  const user = requireUser("learner");
  const app = getApplication(applicationId);
  if (!app || app.learner_id !== user.id) return;
  if (app.certified_at) return;
  // Details the learner has just changed are not yet checked — certifying
  // them would vouch for values nobody has looked at since they moved.
  if (app.recheck_at) return;

  // Certification covers the undertakings, so they have to be signed first.
  const docs = getDocuments(applicationId);
  if (docs.length === 0 || !docs.every((d) => d.signed_at)) return;
  // And there has to be a programme to certify INTO. A re-check that rules
  // the shortlisted programme out takes the shortlist off (setProgramEligibility)
  // while the status stays `shortlisted`, and certifying there promised an
  // offer letter that sendOfferLetter would then refuse to issue.
  if (!getPrograms(applicationId).some((p) => p.shortlisted)) return;

  getDb()
    .prepare("UPDATE applications SET certified_at = datetime('now') WHERE id = ?")
    .run(applicationId);
  logEvent(
    applicationId,
    user.id,
    "Learner certified their details",
    "Confirmed all submitted information and signed undertakings are correct"
  );
  // The journey's stage-4 rule (the "or" branch the PM picked): certifying IS
  // the sync — the certified details auto-fill the shortlisted programme's
  // application, no separate trigger step. Ops' next move is releasing the OL.
  const shortlisted = getPrograms(applicationId).find((p) => p.shortlisted);
  if (shortlisted) {
    logEvent(
      applicationId,
      user.id,
      `Certified details auto-filled into the ${shortlisted.name} application`,
      `${shortlisted.institute} — synced from the certified eligibility form`
    );
  }
  if (app.ac_id) {
    notify(
      app.ac_id,
      `${app.learner_name} certified their details`,
      `/ac/application/${applicationId}`
    );
  }
  const msg = shortlisted
    ? `${app.learner_name} certified — details auto-filled into the ${shortlisted.name} application, offer letter can be released`
    : `${app.learner_name} certified their details — offer letter can be released`;
  const link = `/ops/application/${applicationId}`;
  if (app.ops_id) notify(app.ops_id, msg, link);
  else notifyRole("ops", msg, link);
  dirty();
}

// ---------- Stage 2: Ops vetting ----------

export async function addRemark(applicationId: number, fieldKey: string, formData: FormData) {
  const user = requireUser("ops");
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  // Not every comment is a job. Ops says which this is: 'action' has to be
  // dealt with before the shortlist goes out, 'info' is context to read.
  const kind = formData.get("kind") === "info" ? "info" : "action";
  getDb()
    .prepare(
      "INSERT INTO remarks (application_id, field_key, author_id, text, kind) VALUES (?, ?, ?, ?, ?)"
    )
    .run(applicationId, fieldKey, user.id, text, kind);
  const field = FORM_FIELDS.find((f) => f.key === fieldKey);
  logEvent(
    applicationId,
    user.id,
    `${kind === "info" ? "Note" : "Comment"} added on "${field?.label ?? fieldKey}"`,
    text
  );
  dirty();
}

/**
 * The counsellor's two ways of answering a comment without "resolving" it:
 * a thumbs-up that says seen-and-agreed, or a written reply Ops can read.
 * Both leave a trace on the comment; neither closes it.
 */
export async function acknowledgeRemark(remarkId: number) {
  const user = requireUser("ac");
  const r = getDb()
    .prepare("SELECT application_id FROM remarks WHERE id = ?")
    .get(remarkId) as { application_id: number } | undefined;
  if (!r) return;
  const app = getApplication(r.application_id);
  if (!app || app.ac_id !== user.id) return;
  getDb()
    .prepare("UPDATE remarks SET acknowledged_at = datetime('now') WHERE id = ?")
    .run(remarkId);
  dirty();
}

export async function replyToRemark(remarkId: number, formData: FormData) {
  const user = requireUser("ac");
  // Several remark cards can share one <form> (the wizard is one big form),
  // so each reply box is named for its own remark. A shared name="text" made
  // every Send read the topmost box instead of the one being typed in.
  const text = String(
    formData.get(`reply_${remarkId}`) ?? formData.get("text") ?? ""
  ).trim();
  if (!text) return;
  const r = getDb()
    .prepare("SELECT application_id, field_key, author_id FROM remarks WHERE id = ?")
    .get(remarkId) as
    | { application_id: number; field_key: string; author_id: number }
    | undefined;
  if (!r) return;
  const app = getApplication(r.application_id);
  if (!app || app.ac_id !== user.id) return;
  getDb()
    .prepare(
      "UPDATE remarks SET reply = ?, replied_at = datetime('now') WHERE id = ?"
    )
    .run(text, remarkId);
  const field = FORM_FIELDS.find((f) => f.key === r.field_key);
  logEvent(
    r.application_id,
    user.id,
    `Replied to Ops on "${field?.label ?? r.field_key}"`,
    text
  );
  notify(
    r.author_id,
    `${app.learner_name}: the counsellor replied on "${field?.label ?? r.field_key}"`,
    `/ops/application/${r.application_id}`
  );
  dirty();
}

// ---------- review groups: the counsellor's tick, Ops' verdict ----------

/**
 * The counsellor confirms a whole GROUP is correct — "Class 10 is right" —
 * rather than ticking every field. Clicking again unticks it, because a tick
 * you cannot take back is a tick nobody trusts.
 *
 * Available while the form is theirs: the draft, and a re-check handed back.
 */
export async function toggleGroupCheck(applicationId: number, groupKey: string) {
  const user = requireUser("ac");
  const app = getApplication(applicationId);
  if (!app || app.ac_id !== user.id) return;
  if (!REVIEW_GROUP_BY_KEY[groupKey]) return;
  const mayCheck = app.status === "draft" || Boolean(app.recheck_at);
  if (!mayCheck) return;

  const db = getDb();
  const existing = db
    .prepare(
      "SELECT state FROM group_checks WHERE application_id = ? AND group_key = ? AND actor_role = 'ac'"
    )
    .get(applicationId, groupKey) as { state: string } | undefined;

  if (existing) {
    db.prepare(
      "DELETE FROM group_checks WHERE application_id = ? AND group_key = ? AND actor_role = 'ac'"
    ).run(applicationId, groupKey);
  } else {
    db.prepare(
      `INSERT INTO group_checks (application_id, group_key, actor_role, state, by_id)
       VALUES (?, ?, 'ac', 'checked', ?)`
    ).run(applicationId, groupKey, user.id);
    logEvent(
      applicationId,
      user.id,
      `Confirmed correct: ${REVIEW_GROUP_BY_KEY[groupKey].label}`
    );
  }
  dirty();
}

/**
 * Ops' verdict on a group: verified, or not verified with a reason. Only the
 * groups flagged `opsReview` are Ops' to rule on — the rest are the
 * counsellor's own confirmation and Ops never touches them.
 */
export async function setGroupReview(
  applicationId: number,
  groupKey: string,
  formData: FormData
) {
  const user = requireUser("ops");
  const app = getApplication(applicationId);
  const group = REVIEW_GROUP_BY_KEY[groupKey];
  if (!app || !group || !group.opsReview) return;
  // A section this learner's degree does not have is not theirs to rule on.
  if (
    !reviewGroupsFor(getFormResponses(applicationId)).some(
      (g) => g.key === groupKey
    )
  )
    return;
  // Vetting, or re-reading a learner's change.
  const reRuling = Boolean(app.recheck_at) && app.recheck_state !== "ac";
  if (app.status !== "under_review" && !reRuling) return;

  const verdict = String(formData.get("verdict"));
  if (verdict !== "verified" && verdict !== "not_verified") return;
  const comment = String(formData.get("comment") ?? "").trim();
  // "Not verified" without a reason is a dead end for whoever reads it next.
  if (verdict === "not_verified" && !comment) return;

  getDb()
    .prepare(
      `INSERT INTO group_checks (application_id, group_key, actor_role, state, comment, by_id, at)
       VALUES (?, ?, 'ops', ?, ?, ?, datetime('now'))
       ON CONFLICT (application_id, group_key, actor_role)
       DO UPDATE SET state = excluded.state, comment = excluded.comment,
                     by_id = excluded.by_id, at = excluded.at`
    )
    .run(applicationId, groupKey, verdict, comment || null, user.id);

  logEvent(
    applicationId,
    user.id,
    `${group.label}: ${verdict === "verified" ? "verified" : "not verified"}`,
    comment || undefined
  );
  // Not verified is something the counsellor has to act on, so it also lands
  // as a comment against a field in the group — one their board renders a
  // comment slot on, see commentableFieldOf.
  //
  // Flipping to verified withdraws it: leaving the old complaint open would
  // block the counsellor from handing the re-check back over a point Ops has
  // since agreed with. Re-ruling not-verified replaces it rather than
  // stacking another copy.
  const pin = commentableFieldOf(group);
  const db2 = getDb();
  db2
    .prepare(
      `DELETE FROM remarks
       WHERE application_id = ? AND field_key = ? AND status = 'open'
         AND author_id = ? AND text LIKE ?`
    )
    .run(applicationId, pin, user.id, `${group.label}: %`);
  if (verdict === "not_verified") {
    db2
      .prepare(
        "INSERT INTO remarks (application_id, field_key, author_id, text, kind) VALUES (?, ?, ?, ?, 'action')"
      )
      .run(applicationId, pin, user.id, `${group.label}: ${comment}`);
  }
  dirty();
}

/** Ops can delete a remark they left, as long as it is still open. */
export async function deleteRemark(remarkId: number) {
  const user = requireUser("ops");
  const r = getDb()
    .prepare("SELECT application_id, field_key, author_id, status FROM remarks WHERE id = ?")
    .get(remarkId) as
    | { application_id: number; field_key: string; author_id: number; status: string }
    | undefined;
  if (!r || r.author_id !== user.id || r.status !== "open") return;
  getDb().prepare("DELETE FROM remarks WHERE id = ?").run(remarkId);
  const field = FORM_FIELDS.find((f) => f.key === r.field_key);
  logEvent(
    r.application_id,
    user.id,
    `Remark deleted on "${field?.label ?? r.field_key}"`
  );
  dirty();
}

/**
 * Closing off a comment.
 *
 * The counsellor is the one who acts on it — Ops flags "this number looks
 * wrong", the counsellor checks with the learner and ticks it off. Ops can
 * close their own too, for a comment they have thought better of.
 *
 * Once the shortlist is out the comments are history and nobody closes
 * anything — unless a re-check is open, in which case Ops' comments on the
 * learner's changed details are exactly what the counsellor is working
 * through, and closing them is the job.
 */
export async function resolveRemark(remarkId: number) {
  const user = requireUser();
  const remark = getDb()
    .prepare("SELECT application_id, field_key FROM remarks WHERE id = ?")
    .get(remarkId) as { application_id: number; field_key: string } | undefined;
  if (!remark) return;

  const app = getApplication(remark.application_id);
  if (!app || app.status === "completed") return;
  if (app.status === "shortlisted" && !app.recheck_at) return;
  if (user.role === "ac" && app.ac_id !== user.id) return;
  if (user.role !== "ac" && user.role !== "ops") return;

  getDb().prepare("UPDATE remarks SET status = 'resolved' WHERE id = ?").run(remarkId);
  const field = FORM_FIELDS.find((f) => f.key === remark.field_key);
  logEvent(
    remark.application_id,
    user.id,
    `Comment resolved on "${field?.label ?? remark.field_key}"`
  );
  dirty();
}

/**
 * A single field edited in place — but who may edit what is the PM's split:
 *
 * - OPS, while vetting, fills ONLY the ops-owned fields (scores, university,
 *   career gap — the ones read off the documents). The counsellor's answers
 *   are not Ops' to change; anything wrong there gets a comment pin instead.
 * - The COUNSELLOR, once Ops has reviewed, edits their OWN fields to act on
 *   those comments — the remark sits beside the field, the fix happens right
 *   there ("remarks will be in place with the field which needs to be
 *   edited").
 *
 * Every change is logged with its before and after either way.
 */
export async function updateFieldValue(
  applicationId: number,
  fieldKey: string,
  formData: FormData
) {
  const user = requireUser();
  const app = getApplication(applicationId);
  if (!app) return;
  const field = FORM_FIELDS.find((f) => f.key === fieldKey);
  if (!field) return;

  // Ops fills their own fields while vetting, and again while re-checking a
  // learner's change — otherwise a score they need to correct on the second
  // pass is uncorrectable by anyone, since the counsellor cannot touch it.
  const opsFilling =
    user.role === "ops" &&
    (app.status === "under_review" || app.recheck_state === "ops") &&
    field.filledBy === "ops";
  // The counsellor's board is open on `reviewed`, during a re-check, and
  // after Ops rules the shortlisted programme out (the shortlist comes off
  // and there is a choice to make again). This has to admit all three or the
  // inputs the page renders report "Saved" and write nothing.
  const shortlistWithdrawn =
    app.status === "shortlisted" &&
    !getPrograms(applicationId).some((p) => p.shortlisted);
  const acResolving =
    user.role === "ac" &&
    app.ac_id === user.id &&
    (app.status === "reviewed" ||
      Boolean(app.recheck_at) ||
      shortlistWithdrawn) &&
    field.filledBy !== "ops";
  if (!opsFilling && !acResolving) return;

  const before = getFormResponses(applicationId);
  const value = String(formData.get("value") ?? "");
  if ((before[fieldKey] ?? "") === value) return; // a blur is not an edit

  // The input already refuses these; this makes sure nothing else can write
  // them either. A Class 10 percentage of 104 is a typo, not a value.
  if (outOfBounds(field, value)) return;

  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO form_responses (application_id, field_key, value) VALUES (?, ?, ?)
     ON CONFLICT (application_id, field_key) DO UPDATE SET value = excluded.value`
  );
  upsert.run(applicationId, fieldKey, value);
  // This is the OTHER write path for the same answers, so it owes the same
  // recomputation updateLearnerDetails does: correcting a backlog count or a
  // financing plan here changes which declarations apply.
  upsert.run(
    applicationId,
    "triggered_clauses",
    triggeredClausesFor({ ...before, [fieldKey]: value }).join("|")
  );
  const actor = user.role === "ops" ? "Ops" : "Counsellor";
  logEvent(
    applicationId,
    user.id,
    `${actor} ${before[fieldKey] ? "corrected" : "filled"} "${field.label}"`,
    `${before[fieldKey] || "(empty)"} → ${value || "(empty)"}`
  );
  dirty();
}

// ---------- the learner's document locker ----------

/**
 * The one-editor rule governs the eligibility FORM — who may change the
 * answers. The document locker is a different thing: files keep arriving after
 * vetting is finished (visa papers, a loan sanction letter, a re-scan of a
 * rejected passport), and someone has to be able to take them.
 *
 * So: the counsellor collects while the form is theirs, and after that the
 * learner and Ops keep the locker current until the offer letter closes the
 * application. Ops never loses the ability to check a document — a file that
 * arrives on Tuesday still has to be verified on Tuesday.
 */
function docUploader(applicationId: number) {
  const user = requireUser();
  const app = getApplication(applicationId);
  if (!app || app.status === "completed") return null;
  if (user.role === "learner")
    return app.learner_id === user.id ? { user, app } : null;
  if (user.role === "ac")
    return app.ac_id === user.id && app.status === "draft" ? { user, app } : null;
  if (user.role === "ops") return { user, app };
  return null;
}

export async function uploadLearnerDoc(
  applicationId: number,
  docKey: string,
  formData: FormData
) {
  const ctx = docUploader(applicationId);
  const def = LEARNER_DOC_BY_KEY[docKey];
  if (!ctx || !def) return;
  const filename = String(formData.get("filename") ?? "").trim();
  if (!filename) return;

  // Replacing a verified document sends it back to pending — Ops verified the
  // file that was there, not whatever replaces it.
  getDb()
    .prepare(
      `INSERT INTO learner_documents (application_id, doc_key, filename, uploaded_by)
       VALUES (?, ?, ?, ?)
       ON CONFLICT (application_id, doc_key) DO UPDATE SET
         filename = excluded.filename,
         uploaded_by = excluded.uploaded_by,
         uploaded_at = datetime('now'),
         verification = 'pending',
         verified_by = NULL,
         verified_at = NULL,
         reason = NULL`
    )
    .run(applicationId, docKey, filename, ctx.user.id);
  logEvent(applicationId, ctx.user.id, `Document uploaded: ${def.type}`, filename);
  dirty();
}

export async function removeLearnerDoc(applicationId: number, docKey: string) {
  const ctx = docUploader(applicationId);
  const def = LEARNER_DOC_BY_KEY[docKey];
  if (!ctx || !def) return;
  // A verified document is a record, not a draft — only Ops can pull it.
  const existing = getLearnerDocs(applicationId)[docKey];
  if (!existing) return;
  if (existing.verification === "verified" && ctx.user.role !== "ops") return;

  getDb()
    .prepare("DELETE FROM learner_documents WHERE application_id = ? AND doc_key = ?")
    .run(applicationId, docKey);
  logEvent(applicationId, ctx.user.id, `Document removed: ${def.type}`);
  dirty();
}

/**
 * Verification is Ops' alone — they are the only role that reads a document
 * against the form and says it checks out. It stays open until the offer
 * letter closes the application, because documents keep arriving after vetting
 * ends and an unverifiable document is just a row nobody can act on.
 */
export async function verifyLearnerDoc(
  applicationId: number,
  docKey: string,
  formData: FormData
) {
  const user = requireUser("ops");
  const app = getApplication(applicationId);
  const def = LEARNER_DOC_BY_KEY[docKey];
  if (!app || !def || app.status === "completed") return;
  if (!getLearnerDocs(applicationId)[docKey]) return;

  const verdict = String(formData.get("verdict") ?? "");
  if (verdict !== "verified" && verdict !== "rejected") return;
  const reason = String(formData.get("reason") ?? "").trim() || null;

  getDb()
    .prepare(
      `UPDATE learner_documents
       SET verification = ?, verified_by = ?, verified_at = datetime('now'), reason = ?
       WHERE application_id = ? AND doc_key = ?`
    )
    .run(verdict, user.id, reason, applicationId, docKey);
  logEvent(
    applicationId,
    user.id,
    `Document ${verdict}: ${def.type}`,
    reason ?? undefined
  );
  if (verdict === "rejected") {
    notify(
      app.learner_id,
      `Please re-upload your ${def.type}${reason ? ` — ${reason}` : ""}`,
      `/learner/application/${applicationId}?tab=docs`
    );
  }
  dirty();
}

/** Ops attaches an undertaking by picking a template — never authoring one. */
export async function addDocument(applicationId: number, formData: FormData) {
  const user = requireUser("ops");
  const templateId = Number(formData.get("templateId"));
  if (!templateId) return;

  const db = getDb();
  const tpl = db
    .prepare("SELECT * FROM document_templates WHERE id = ?")
    .get(templateId) as
    | { id: number; type: string; title: string; content: string }
    | undefined;
  if (!tpl) return;
  if (getDocuments(applicationId).some((d) => d.template_id === tpl.id)) return;

  const app = getApplication(applicationId);
  const responses = getFormResponses(applicationId);
  const learner = responses.full_name || app?.learner_name || "the learner";

  db.prepare(
    `INSERT INTO documents
     (application_id, type, title, content, auto_generated, template_id, source)
     VALUES (?, ?, ?, ?, 0, ?, 'ops')`
  ).run(applicationId, tpl.type, tpl.title, `I, ${learner}, ${tpl.content}`, tpl.id);
  logEvent(applicationId, user.id, `Document attached: ${tpl.title}`);
  dirty();
}

/** Ops may only detach a document Ops attached, and only before it is signed. */
export async function removeDocument(docId: number) {
  const user = requireUser("ops");
  const d = getDb()
    .prepare("SELECT application_id, title, signed_at, source FROM documents WHERE id = ?")
    .get(docId) as
    | { application_id: number; title: string; signed_at: string | null; source: string }
    | undefined;
  if (!d || d.signed_at || d.source !== "ops") return;
  getDb().prepare("DELETE FROM documents WHERE id = ?").run(docId);
  logEvent(d.application_id, user.id, `Document removed: ${d.title}`);
  dirty();
}

/**
 * The COUNSELLOR recommends programmes, from the catalogue with the matching
 * score beside each — on the call, while filling the form. Ops does not add
 * programmes any more; they rule on these (see setProgramEligibility).
 */
export async function addProgram(applicationId: number, formData: FormData) {
  const user = requireUser("ac");
  const app = getApplication(applicationId);
  // Any live re-check, not just one handed back: the counsellor's board is
  // open for the whole re-check, and a control that renders has to work.
  const mayEdit = app?.status === "draft" || Boolean(app?.recheck_at);
  if (!app || app.ac_id !== user.id || !mayEdit) return;
  if (getPrograms(applicationId).length >= MAX_RECOMMENDED_PROGRAMS) return;
  const catalogueId = Number(formData.get("catalogueId"));
  if (!catalogueId) return;

  const db = getDb();
  const item = db
    .prepare("SELECT * FROM program_catalogue WHERE id = ?")
    .get(catalogueId) as
    | {
        id: number;
        name: string;
        institute: string;
        country: string;
        degree_level: string;
        duration: string | null;
        fee: string | null;
        min_score: number | null;
        min_work_exp_months: number | null;
        notes: string | null;
      }
    | undefined;
  if (!item) return;
  // Don't attach the same catalogue entry twice.
  if (getPrograms(applicationId).some((p) => p.catalogue_id === item.id)) return;

  db.prepare(
    `INSERT INTO programs
     (application_id, name, institute, duration, fee, notes, added_by, catalogue_id, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ac')`
  ).run(
    applicationId,
    item.name,
    item.institute,
    item.duration,
    item.fee,
    item.notes,
    user.id,
    item.id
  );
  const { score } = matchScore(item, getFormResponses(applicationId));
  logEvent(
    applicationId,
    user.id,
    `Programme recommended: ${item.name} (${item.institute})`,
    `${score}% match`
  );
  dirty();
}

/** The counsellor can withdraw a recommendation while the form is still theirs. */
/**
 * Ops adds a programme from the catalogue.
 *
 * Normally recommending is the counsellor's job. The exception is the loop
 * this whole re-check machinery exists for: the learner changes an answer,
 * every programme they were recommended goes not-eligible, and the
 * application dead-ends. Ops is the one with the catalogue open and the
 * verdicts in hand, so they can put a live option back — marked as theirs,
 * already ruled eligible, and the counsellor is told it is there.
 */
export async function opsAddProgram(applicationId: number, formData: FormData) {
  const user = requireUser("ops");
  const app = getApplication(applicationId);
  if (!app) return;
  const reRuling = Boolean(app.recheck_at) && app.recheck_state !== "ac";
  if (app.status !== "under_review" && !reRuling) return;
  if (getPrograms(applicationId).length >= MAX_RECOMMENDED_PROGRAMS) return;

  const catalogueId = Number(formData.get("catalogueId"));
  if (!catalogueId) return;
  const db = getDb();
  const item = db
    .prepare("SELECT * FROM program_catalogue WHERE id = ?")
    .get(catalogueId) as
    | {
        id: number;
        name: string;
        institute: string;
        duration: string | null;
        fee: string | null;
        notes: string | null;
      }
    | undefined;
  if (!item) return;
  if (getPrograms(applicationId).some((p) => p.catalogue_id === item.id)) return;

  db.prepare(
    `INSERT INTO programs
     (application_id, name, institute, duration, fee, notes, added_by,
      shortlisted, catalogue_id, source, eligibility, eligibility_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, 'ops', 'eligible', ?)`
  ).run(
    applicationId,
    item.name,
    item.institute,
    item.duration,
    item.fee,
    item.notes,
    user.id,
    item.id,
    "Added by Ops and ruled eligible against the learner's current details"
  );
  logEvent(
    applicationId,
    user.id,
    `Ops added an eligible programme: ${item.name}`,
    item.institute
  );
  const msg = `Ops added ${item.name} for ${app.learner_name} — eligible, ready to shortlist`;
  const link = `/ac/application/${applicationId}`;
  if (app.ac_id) notify(app.ac_id, msg, link);
  else notifyRole("ac", msg, link);
  dirty();
}

export async function removeProgram(programId: number) {
  const user = requireUser("ac");
  const p = getDb()
    .prepare("SELECT application_id, name, shortlisted, source FROM programs WHERE id = ?")
    .get(programId) as
    | { application_id: number; name: string; shortlisted: number; source: string }
    | undefined;
  if (!p || p.shortlisted) return;
  const app = getApplication(p.application_id);
  // Any live re-check, not just one handed back: the counsellor's board is
  // open for the whole re-check, and a control that renders has to work.
  const mayEdit = app?.status === "draft" || Boolean(app?.recheck_at);
  if (!app || app.ac_id !== user.id || !mayEdit) return;
  getDb().prepare("DELETE FROM programs WHERE id = ?").run(programId);
  logEvent(p.application_id, user.id, `Recommendation withdrawn: ${p.name}`);
  dirty();
}

/**
 * Ops rules on each counsellor recommendation: eligible or not. This replaces
 * Ops adding programmes — the set comes from the counsellor, the verdicts
 * come from Ops, and the counsellor later shortlists only among the eligible.
 */
export async function setProgramEligibility(
  programId: number,
  formData: FormData
) {
  const user = requireUser("ops");
  const p = getDb()
    .prepare("SELECT application_id, name, shortlisted FROM programs WHERE id = ?")
    .get(programId) as
    | { application_id: number; name: string; shortlisted: number }
    | undefined;
  if (!p) return;
  const app = getApplication(p.application_id);
  if (!app) return;
  // Vetting is the normal time to rule. A re-check is the other one: the
  // learner has changed an answer the verdict rested on, and this time the
  // SHORTLISTED programme is in scope too — that is the whole risk, that they
  // have edited their way out of the programme they were sent.
  const reRuling = Boolean(app.recheck_at) && app.recheck_state !== "ac";
  if (app.status !== "under_review" && !reRuling) return;
  if (p.shortlisted && !reRuling) return;

  const verdict = String(formData.get("verdict"));
  if (verdict !== "eligible" && verdict !== "not_eligible") return;
  // Why, in Ops' words — the counsellor quotes this to the learner.
  const note = String(formData.get("note") ?? "").trim();
  getDb()
    .prepare(
      "UPDATE programs SET eligibility = ?, eligibility_stale = 0, eligibility_note = ? WHERE id = ?"
    )
    .run(verdict, note || null, programId);
  logEvent(
    p.application_id,
    user.id,
    `Programme marked ${verdict === "eligible" ? "eligible" : "not eligible"}: ${p.name}`,
    note || undefined
  );

  // The one that hurts: the programme the learner was shortlisted for is no
  // longer open to them. The shortlist comes off — nobody signs an offer for
  // a programme they don't qualify for — and the counsellor picks again from
  // whatever is still eligible.
  if (p.shortlisted && verdict === "not_eligible") {
    getDb()
      .prepare("UPDATE programs SET shortlisted = 0 WHERE id = ?")
      .run(programId);
    logEvent(
      p.application_id,
      user.id,
      `Shortlist withdrawn: ${p.name}`,
      "The learner is no longer eligible after their own change to the details"
    );
    const stillEligible = getPrograms(p.application_id).filter(
      (x) => x.eligibility === "eligible"
    ).length;
    const msg = stillEligible
      ? `${app.learner_name} is no longer eligible for ${p.name} — choose another programme (${stillEligible} still eligible)`
      : `${app.learner_name} is no longer eligible for ${p.name} and nothing else on their list is — they need new recommendations`;
    if (app.ac_id) notify(app.ac_id, msg, `/ac/application/${p.application_id}`);
    else notifyRole("ac", msg, `/ac/application/${p.application_id}`);
  }
  dirty();
}

export async function markReviewed(applicationId: number) {
  const user = requireUser("ops");
  const app = getApplication(applicationId);
  if (!app || !canTransition(app.status, "reviewed", "ops")) return;
  // The counsellor can only shortlist among eligible programmes, so a review
  // with none eligible would hand them a dead end.
  if (!getPrograms(applicationId).some((p) => p.eligibility === "eligible"))
    return;
  // Remarks travel with the application as notes — they no longer block
  // Ops from finishing the review.
  setStatus(applicationId, "reviewed");
  logEvent(applicationId, user.id, "Marked as reviewed by Ops");
  if (app.ac_id) {
    notify(
      app.ac_id,
      `Ops reviewed ${app.learner_name}'s application — recommended programmes are ready`,
      `/ac/application/${applicationId}`
    );
  }
  dirty();
  goto("/ops?toast=reviewed");
}

/**
 * Called once from the browser when someone actually opens an application.
 * Records the visit and, for Ops, picks up a new submission — opening it IS
 * taking it on, with no extra confirmation step. This must never run during
 * render: see the note in components/open-application.tsx.
 */
export async function openApplication(applicationId: number) {
  const user = requireUser();
  const app = getApplication(applicationId);
  if (!app) return;

  recordView(user.id, applicationId);
  if (user.role === "ops" && claimApplication(applicationId, user.id)) {
    dirty();
  }
}

// ---------- Stage 3: AC shortlists programs for the learner ----------

/**
 * The counsellor sends the learner exactly one programme — the one they are
 * going ahead with. Ops recommends a shortlist to choose from; choosing is
 * picking one of them, not forwarding the whole list for the learner to
 * decide between.
 */
export async function shortlistProgram(applicationId: number, formData: FormData) {
  const user = requireUser("ac");
  const app = getApplication(applicationId);
  // The second time round: Ops re-ruled the shortlisted programme not
  // eligible after the learner changed something, so the shortlist came off
  // and the learner is sitting with nothing. Choosing again is the fix, and
  // the status is already where it needs to be.
  const reChoosing =
    app?.status === "shortlisted" &&
    !getPrograms(applicationId).some((p) => p.shortlisted);
  if (!app || app.ac_id !== user.id) return;
  if (!canTransition(app.status, "shortlisted", "ac") && !reChoosing) return;
  const id = Number(formData.get("programId"));
  if (!id) return;

  const chosen = getPrograms(applicationId).find((p) => p.id === id);
  // Only programmes Ops ruled eligible can go to the learner.
  if (!chosen || chosen.eligibility !== "eligible") return;

  const db = getDb();
  const tx = db.transaction(() => {
    // Clear first: re-running this must never leave two programmes marked.
    db.prepare("UPDATE programs SET shortlisted = 0 WHERE application_id = ?").run(
      applicationId
    );
    db.prepare(
      "UPDATE programs SET shortlisted = 1 WHERE id = ? AND application_id = ?"
    ).run(id, applicationId);
  });
  tx();
  setStatus(applicationId, "shortlisted");
  logEvent(
    applicationId,
    user.id,
    reChoosing
      ? "Replacement programme shortlisted & sent to learner"
      : "Program shortlisted & sent to learner",
    `${chosen.name} — ${chosen.institute}`
  );
  notify(
    app.learner_id,
    reChoosing
      ? `Your programme has been updated to ${chosen.name} at ${chosen.institute}. Please review and sign your documents.`
      : `Congratulations! You have been shortlisted for ${chosen.name} at ${chosen.institute}. Please review and sign your documents.`,
    "/learner"
  );
  dirty();
  goto("/ac?toast=shortlisted");
}

// ---------- Learner self-service ----------

/**
 * The learner corrects their own details — no counsellor round trip needed.
 * Only Ops-derived fields (scores read off marksheets) stay read-only, and a
 * completed application is closed.
 *
 * A change is never just a change once the form has been vetted: it withdraws
 * the learner's certification, tells the counsellor, and puts the application
 * back in front of Ops as a re-check that has to be cleared before the
 * learner can certify again or the offer letter can go out.
 */
/** A number field's value is only acceptable inside its declared bounds. */
function outOfBounds(field: (typeof FORM_FIELDS)[number], value: string) {
  if (field.type !== "number" || value === "") return false;
  const n = Number(value);
  if (Number.isNaN(n)) return true;
  if (field.min !== undefined && n < field.min) return true;
  if (field.max !== undefined && n > field.max) return true;
  return false;
}

/** The posted fields as a plain record, for the shared rule helpers. */
function formDataValues(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const f of FORM_FIELDS) {
    const v = formData.get(f.key);
    if (v !== null) out[f.key] = String(v);
  }
  return out;
}

export async function updateLearnerDetails(
  applicationId: number,
  formData: FormData
) {
  const user = requireUser("learner");
  const app = getApplication(applicationId);
  if (!app || app.learner_id !== user.id) return;
  if (app.status === "completed") return;

  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO form_responses (application_id, field_key, value) VALUES (?, ?, ?)
     ON CONFLICT (application_id, field_key) DO UPDATE SET value = excluded.value`
  );
  const before = getFormResponses(applicationId);
  const changed: string[] = [];
  const changedKeys: string[] = [];

  const tx = db.transaction(() => {
    for (const f of FORM_FIELDS) {
      if (f.filledBy === "ops") continue;
      const v = formData.get(f.key);
      if (v === null) continue;
      const next = String(v);
      // Same bounds as everywhere else — the learner's form had none.
      if (outOfBounds(f, next)) continue;
      if ((before[f.key] ?? "") !== next) {
        changed.push(f.label);
        changedKeys.push(f.key);
      }
      upsert.run(applicationId, f.key, next);
    }
    // The declarations follow the answers. Only the counsellor's wizard used
    // to write this, so a learner who edited their way into needing a new
    // undertaking never got one — and attachMissingForms reads exactly this.
    upsert.run(
      applicationId,
      "triggered_clauses",
      triggeredClausesFor({ ...before, ...formDataValues(formData) }).join("|")
    );
  });
  tx();

  if (changed.length > 0) {
    // Editing after certifying withdraws it — they are certifying values that
    // no longer exist.
    if (app.certified_at) {
      getDb()
        .prepare("UPDATE applications SET certified_at = NULL WHERE id = ?")
        .run(applicationId);
    }
    // …and it sends the details back to Ops. A vetted value that the learner
    // then changes is an UNVETTED value, whatever the pipeline says: the
    // scores were read against these answers and the undertakings were
    // generated from them. So the edit raises a re-check — see the note on
    // `clearRecheck` for why this is a flag and not a status.
    const wasVetted = app.status !== "draft";
    // If Ops had already handed it to the counsellor over comments, this edit
    // is the learner acting on those comments — which sends it straight back
    // to Ops. Either way the re-check restarts on the Ops side.
    const answeringRemarks = app.recheck_state === "ac";
    if (wasVetted) {
      // A second edit while a re-check is already open EXTENDS it; it does not
      // restart it. Rebasing recheck_at pushed the comments Ops had already
      // written outside the "raised on this change" window, which stranded
      // them — they could neither be sent nor seen. And the changed-field list
      // is merged, so the first edit's markers survive the second.
      const already = Boolean(app.recheck_at);
      const fields = Array.from(
        new Set(
          (already ? (app.recheck_fields ?? "").split(", ") : [])
            .concat(changed)
            .filter(Boolean)
        )
      ).join(", ");
      getDb()
        .prepare(
          `UPDATE applications
           SET recheck_at = COALESCE(recheck_at, datetime('now')),
               recheck_fields = ?,
               recheck_state = 'ops'
           WHERE id = ?`
        )
        .run(fields, applicationId);
    }
    // A changed answer that a verdict rested on un-makes the verdict. The
    // ruling stays on screen — Ops needs to see what they said last time —
    // but it is marked stale, and the re-check cannot close until they rule
    // again. This is the case where a learner edits their way OUT of the
    // programme they were shortlisted for.
    const eligibilityMoved = wasVetted && affectsEligibility(changedKeys);
    if (eligibilityMoved) {
      getDb()
        .prepare(
          "UPDATE programs SET eligibility_stale = 1 WHERE application_id = ?"
        )
        .run(applicationId);
    }

    logEvent(
      applicationId,
      user.id,
      `Learner updated ${changed.length} detail(s)`,
      changed.slice(0, 6).join(", ")
    );
    if (eligibilityMoved) {
      logEvent(
        applicationId,
        user.id,
        "Eligibility verdicts need re-ruling",
        `${changed.slice(0, 6).join(", ")} — the answers the verdicts were made against have changed`
      );
    }
    if (wasVetted) {
      logEvent(
        applicationId,
        user.id,
        answeringRemarks
          ? "Learner answered the comments — back to Ops for re-check"
          : "Sent back to Ops for re-check",
        `Changed after vetting: ${changed.slice(0, 6).join(", ")}`
      );
    }

    // The counsellor hears about it first — they own the relationship and
    // will be the one the learner rings. Then it goes to Ops, whose queue it
    // actually lands in.
    const what = changed.slice(0, 3).join(", ");
    const more = changed.length > 3 ? ` +${changed.length - 3} more` : "";
    if (app.ac_id) {
      notify(
        app.ac_id,
        !wasVetted
          ? `${app.learner_name} updated their details: ${what}${more}`
          : answeringRemarks
            ? `${app.learner_name} made the changes you discussed (${what}${more}) — back with Ops for a re-check`
            : `${app.learner_name} changed their details (${what}${more}) — back with Ops for a re-check`,
        `/ac/application/${applicationId}`
      );
    }
    const opsMsg = !wasVetted
      ? `${app.learner_name} updated their details: ${what}${more}`
      : answeringRemarks
        ? `Re-check again: ${app.learner_name} answered your comments — ${what}${more}`
        : eligibilityMoved
          ? `Re-check needed: ${app.learner_name} changed ${what}${more} — re-rule the programmes`
          : `Re-check needed: ${app.learner_name} changed ${what}${more} after vetting`;
    const opsLink = `/ops/application/${applicationId}`;
    if (app.ops_id) notify(app.ops_id, opsMsg, opsLink);
    else notifyRole("ops", opsMsg, opsLink);
  }
  dirty();
}

/**
 * Ops closes the loop: they have re-read the fields the learner changed and
 * the application can carry on.
 *
 * This is a flag rather than a trip back to `under_review` on purpose. The
 * status machine is one-way (see domain.ts) because a form that can bounce
 * between two editors bounces forever — and rewinding would also strip the
 * counsellor's shortlist and the learner's signed undertakings of the state
 * they were made in. A re-check is a smaller thing than a re-vetting: read
 * what moved, comment on it if it's wrong, clear it if it isn't.
 */
export async function clearRecheck(applicationId: number) {
  const user = requireUser("ops");
  const app = getApplication(applicationId);
  if (!app || !app.recheck_at) return;
  // While the counsellor is working through Ops' comments the re-check is
  // theirs to hand back; Ops clearing it underneath them would close a
  // conversation that is still running.
  if (app.recheck_state === "ac") return;
  // A verdict made against answers that have since moved is not a verdict.
  // Closing the re-check over the top of one would let the offer letter out
  // on a programme nobody has re-ruled.
  if (getPrograms(applicationId).some((p) => p.eligibility_stale)) return;
  // And something has to survive the re-ruling. Closing with everything ruled
  // out strands the application: the catalogue picker is only on screen while
  // a re-check is open, so shutting it is the one move nobody can undo.
  // Add an eligible programme from the picker instead (see opsAddProgram).
  if (!getPrograms(applicationId).some((p) => p.eligibility === "eligible"))
    return;

  const fields = app.recheck_fields ?? "";
  getDb()
    .prepare(
      `UPDATE applications
       SET recheck_at = NULL, recheck_fields = NULL, recheck_state = NULL
       WHERE id = ?`
    )
    .run(applicationId);
  // The change may have triggered a declaration that did not apply before —
  // a backlog appearing, a pursuing status, a financing plan. Closing the
  // re-check is the moment those undertakings have to exist, because the next
  // thing that happens is the learner being asked to sign.
  attachMissingForms(applicationId, user.id);
  logEvent(
    applicationId,
    user.id,
    "Ops re-checked the learner's changes",
    fields || undefined
  );
  if (app.ac_id) {
    notify(
      app.ac_id,
      `Ops re-checked ${app.learner_name}'s changed details — the application can continue`,
      `/ac/application/${applicationId}`
    );
  }
  // The learner is told the outcome, never whose desk it sat on: they are
  // waiting on a "can I certify yet?" answer, and this is that answer. But
  // attachMissingForms above may just have added an undertaking their change
  // triggered, and certifying is blocked until everything is signed — so the
  // message has to match what they will actually find on screen.
  const unsigned = getDocuments(applicationId).filter((d) => !d.signed_at).length;
  notify(
    app.learner_id,
    unsigned > 0
      ? `Your updated details have been checked — ${unsigned} document${
          unsigned === 1 ? "" : "s"
        } to sign, then you can certify`
      : "Your updated details have been checked — you can certify your application now",
    "/learner"
  );
  dirty();
}

/**
 * The re-check's other exit: Ops read the changed details and something is
 * wrong with them.
 *
 * They do not fix it and they do not go to the learner — Ops never edits the
 * counsellor's answers (see `updateFieldValue`), and the learner is not
 * theirs to ring. The comments they pinned to the fields go to the
 * COUNSELLOR, who talks to the learner; the learner's next edit sends it
 * straight back here. Until then the re-check stays open, so the offer letter
 * stays shut.
 */
export async function raiseRecheckRemarks(applicationId: number) {
  const user = requireUser("ops");
  const app = getApplication(applicationId);
  if (!app || !app.recheck_at || app.recheck_state === "ac") return;
  // Only comments raised on THIS change count. An old remark still open from
  // vetting is not feedback on what the learner just did, and handing that to
  // the counsellor would send them to the learner with the wrong question.
  const open = getRemarks(applicationId).filter(
    (r) =>
      r.status === "open" &&
      r.kind !== "info" &&
      r.created_at >= app.recheck_at!
  );
  if (open.length === 0) return;

  getDb()
    .prepare("UPDATE applications SET recheck_state = 'ac' WHERE id = ?")
    .run(applicationId);
  logEvent(
    applicationId,
    user.id,
    `Re-check returned to the counsellor with ${open.length} comment${open.length === 1 ? "" : "s"}`,
    open
      .map((r) => FORM_FIELDS.find((f) => f.key === r.field_key)?.label ?? r.field_key)
      .join(", ")
  );
  if (app.ac_id) {
    notify(
      app.ac_id,
      `Ops has ${open.length} comment${open.length === 1 ? "" : "s"} on ${app.learner_name}'s changed details — please resolve them with the learner`,
      `/ac/application/${applicationId}`
    );
  } else {
    notifyRole(
      "ac",
      `Ops has ${open.length} comment${open.length === 1 ? "" : "s"} on ${app.learner_name}'s changed details`,
      `/ac/application/${applicationId}`
    );
  }
  // Told plainly, without the internal handoff: someone is about to call them.
  notify(
    app.learner_id,
    "Your counsellor will get in touch about a few of the details you changed",
    "/learner"
  );
  dirty();
}

/**
 * The counsellor has been through Ops' comments with the learner and there is
 * nothing further to change — hand it back for the re-check.
 *
 * The usual way back is the learner editing something, which routes itself.
 * This is the other case: the answer was right all along, or was fixed
 * outside the form, and without this the application would sit with the
 * counsellor forever waiting for an edit that is never coming.
 */
export async function returnRecheckToOps(
  applicationId: number,
  formData?: FormData
) {
  const user = requireUser("ac");
  const app = getApplication(applicationId);
  if (!app || app.ac_id !== user.id) return;
  if (!app.recheck_at || app.recheck_state !== "ac") return;

  // Posted from the edit board: everything on it saves with the hand-back,
  // so "send back" can never lose the fixes it is sending back.
  if (formData) await saveForm(applicationId, formData);
  // Every comment from this re-check answered first — otherwise Ops gets it
  // back with the same open list they sent, and the round trip taught nobody
  // anything. Older remarks are not part of this conversation.
  const open = getRemarks(applicationId).filter(
    (r) =>
      r.status === "open" &&
      r.kind !== "info" &&
      r.created_at >= app.recheck_at!
  );
  if (open.length > 0) return;

  getDb()
    .prepare(
      "UPDATE applications SET recheck_at = datetime('now'), recheck_state = 'ops' WHERE id = ?"
    )
    .run(applicationId);
  logEvent(
    applicationId,
    user.id,
    "Comments resolved with the learner — sent back to Ops",
    app.recheck_fields ?? undefined
  );
  // A changed answer can trigger clauses the original call didn't — any
  // newly needed undertakings attach now, unsigned, closing the loop:
  // learner signs the new papers, certifies again, and only then the OL.
  attachMissingForms(applicationId, user.id);
  const msg = `${app.learner_name}'s counsellor resolved your comments — ready for the re-check`;
  const link = `/ops/application/${applicationId}`;
  if (app.ops_id) notify(app.ops_id, msg, link);
  else notifyRole("ops", msg, link);
  dirty();
}

// ---------- Stage 4: Learner signs UT & Ack; offer letter issued ----------

export async function signDocument(docId: number, formData: FormData) {
  const user = requireUser("learner");
  const signature = String(formData.get("signature") ?? "").trim();
  if (!signature) return;
  const doc = getDb()
    .prepare("SELECT application_id, signed_at, title FROM documents WHERE id = ?")
    .get(docId) as { application_id: number; signed_at: string | null; title: string } | undefined;
  if (!doc || doc.signed_at) return;
  const app = getApplication(doc.application_id);
  if (!app || app.learner_id !== user.id || app.status !== "shortlisted") return;

  getDb()
    .prepare("UPDATE documents SET signed_at = datetime('now'), signature_name = ? WHERE id = ?")
    .run(signature, docId);
  logEvent(doc.application_id, user.id, `Document signed: ${doc.title}`, `Signed as "${signature}"`);

  // Signing everything is the learner-side approval: it certifies the details.
  // The offer letter is NOT auto-issued — Ops reviews the certified details
  // and sends it explicitly (see sendOfferLetter below).
  const docs = getDocuments(doc.application_id);
  if (docs.every((d) => d.signed_at)) {
    logEvent(doc.application_id, user.id, "All documents signed", "Learner details certified — awaiting offer letter from Ops");
    const opsMsg = `${app.learner_name} signed all documents — review the certified details and send the offer letter`;
    if (app.ops_id) notify(app.ops_id, opsMsg, `/ops/application/${doc.application_id}`);
    else notifyRole("ops", opsMsg, `/ops/application/${doc.application_id}`);
    if (app.ac_id) notify(app.ac_id, `${app.learner_name} signed all documents — Ops will send the offer letter`, `/ac/application/${doc.application_id}`);
  }
  dirty();
}

export async function sendOfferLetter(applicationId: number, formData: FormData) {
  const user = requireUser("ops");
  const app = getApplication(applicationId);
  if (!app || !canTransition(app.status, "completed", "ops")) return;
  if (getOfferLetter(applicationId)) return;

  // Only after the learner has signed every document AND certified that the
  // details behind them are correct.
  const docs = getDocuments(applicationId);
  if (docs.length === 0 || !docs.every((d) => d.signed_at)) return;
  if (!app.certified_at) return;
  // An open re-check means the learner moved something after vetting; the
  // offer would be written off details Ops has not re-read.
  if (app.recheck_at) return;

  const shortlisted = getPrograms(applicationId).filter((p) => p.shortlisted);
  const chosen =
    shortlisted.find((p) => p.id === Number(formData.get("programId"))) ?? shortlisted[0];
  if (!chosen) return;

  const responses = getFormResponses(applicationId);
  const learnerName = responses.full_name || app.learner_name;
  getDb()
    .prepare("INSERT INTO offer_letters (application_id, program_id, content) VALUES (?, ?, ?)")
    .run(
      applicationId,
      chosen.id,
      `Dear ${learnerName},\n\nCongratulations! We are pleased to offer you admission to ${chosen.name} at ${chosen.institute}. Your eligibility has been verified and all required documents have been signed.\n\nOur team will reach out with the next steps for enrollment.\n\nWarm regards,\nAdmissions Team`
    );
  setStatus(applicationId, "completed");
  logEvent(applicationId, user.id, "Offer letter sent to learner", `${chosen.name} — ${chosen.institute}`);
  notify(app.learner_id, `Your offer letter for ${chosen.name} (${chosen.institute}) is here!`, "/learner");
  if (app.ac_id) notify(app.ac_id, `Offer letter sent to ${app.learner_name} for ${chosen.name}`, `/ac/application/${applicationId}`);
  dirty();
  // "undertaking" was a tab of its own once; the undertakings live on
  // Eligibility now, and redirecting to a tab that no longer resolves dropped
  // Ops on the default one with no sign the letter had gone.
  goto(`/ops/application/${applicationId}?tab=eligibility&toast=offer`);
}

// ---------- Admin ----------

export async function setUserRole(userId: number, formData: FormData) {
  requireUser("admin");
  const role = String(formData.get("role"));
  if (!["learner", "ac", "ops", "admin"].includes(role)) return;
  getDb().prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  dirty();
}

export async function createUser(formData: FormData) {
  requireUser("admin");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role"));
  if (!name || !email || !["learner", "ac", "ops", "admin"].includes(role)) return;
  try {
    const res = getDb()
      .prepare("INSERT INTO users (name, email, role) VALUES (?, ?, ?)")
      .run(name, email, role);
    if (role === "learner") {
      // A learner always has exactly one eligibility application; assign round-robin to an AC.
      const ac = getDb()
        .prepare("SELECT id FROM users WHERE role = 'ac' ORDER BY RANDOM() LIMIT 1")
        .get() as { id: number } | undefined;
      getDb()
        .prepare("INSERT INTO applications (learner_id, ac_id, status) VALUES (?, ?, 'draft')")
        .run(res.lastInsertRowid, ac?.id ?? null);
    }
  } catch {
    return; // duplicate email — ignore for prototype
  }
  dirty();
}

// ---------- notifications ----------

export async function markAllRead() {
  const user = requireUser();
  getDb().prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(user.id);
  dirty();
}
