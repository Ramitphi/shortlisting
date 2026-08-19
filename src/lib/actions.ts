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
import { attachRequiredForms, claimApplication } from "./vetting";
import {
  CLAUSES,
  FORM_FIELDS,
  LEARNER_DOC_BY_KEY,
  MAX_RECOMMENDED_PROGRAMS,
  matchScore,
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
// Each maps onto a seeded user so the demo data stays intact.
const DEMO_ACCOUNTS: Record<string, string> = {
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
 * The counsellor's autosave. Draft only: submitting hands the pen to Ops and
 * the counsellor does not get it back. See `editorOf` in domain.ts.
 */
export async function saveForm(applicationId: number, formData: FormData) {
  requireUser("ac");
  const app = getApplication(applicationId);
  if (!app || !canEditDetails(app.status, "ac")) return;

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
  if (!app || !canTransition(app.status, "under_review", "ac")) return;

  await saveForm(applicationId, formData);
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

  // Certification covers the undertakings, so they have to be signed first.
  const docs = getDocuments(applicationId);
  if (docs.length === 0 || !docs.every((d) => d.signed_at)) return;

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
  getDb()
    .prepare("INSERT INTO remarks (application_id, field_key, author_id, text) VALUES (?, ?, ?, ?)")
    .run(applicationId, fieldKey, user.id, text);
  const field = FORM_FIELDS.find((f) => f.key === fieldKey);
  logEvent(applicationId, user.id, `Remark added on "${field?.label ?? fieldKey}"`, text);
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
 * anything.
 */
export async function resolveRemark(remarkId: number) {
  const user = requireUser();
  const remark = getDb()
    .prepare("SELECT application_id, field_key FROM remarks WHERE id = ?")
    .get(remarkId) as { application_id: number; field_key: string } | undefined;
  if (!remark) return;

  const app = getApplication(remark.application_id);
  if (!app || app.status === "shortlisted" || app.status === "completed") return;
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

  const opsFilling =
    user.role === "ops" &&
    app.status === "under_review" &&
    field.filledBy === "ops";
  const acResolving =
    user.role === "ac" &&
    app.ac_id === user.id &&
    app.status === "reviewed" &&
    field.filledBy !== "ops";
  if (!opsFilling && !acResolving) return;

  const before = getFormResponses(applicationId);
  const value = String(formData.get("value") ?? "");
  if ((before[fieldKey] ?? "") === value) return; // a blur is not an edit

  // The input already refuses these; this makes sure nothing else can write
  // them either. A Class 10 percentage of 104 is a typo, not a value.
  if (field.type === "number" && value !== "") {
    const n = Number(value);
    if (Number.isNaN(n)) return;
    if (field.min !== undefined && n < field.min) return;
    if (field.max !== undefined && n > field.max) return;
  }

  getDb()
    .prepare(
      `INSERT INTO form_responses (application_id, field_key, value) VALUES (?, ?, ?)
       ON CONFLICT (application_id, field_key) DO UPDATE SET value = excluded.value`
    )
    .run(applicationId, fieldKey, value);
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
  if (!app || app.ac_id !== user.id || app.status !== "draft") return;
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
export async function removeProgram(programId: number) {
  const user = requireUser("ac");
  const p = getDb()
    .prepare("SELECT application_id, name, shortlisted, source FROM programs WHERE id = ?")
    .get(programId) as
    | { application_id: number; name: string; shortlisted: number; source: string }
    | undefined;
  if (!p || p.shortlisted) return;
  const app = getApplication(p.application_id);
  if (!app || app.ac_id !== user.id || app.status !== "draft") return;
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
  if (!p || p.shortlisted) return;
  const app = getApplication(p.application_id);
  if (!app || app.status !== "under_review") return;

  const verdict = String(formData.get("verdict"));
  if (verdict !== "eligible" && verdict !== "not_eligible") return;
  getDb()
    .prepare("UPDATE programs SET eligibility = ? WHERE id = ?")
    .run(verdict, programId);
  logEvent(
    p.application_id,
    user.id,
    `Programme marked ${verdict === "eligible" ? "eligible" : "not eligible"}: ${p.name}`
  );
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
  if (!app || !canTransition(app.status, "shortlisted", "ac")) return;
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
    "Program shortlisted & sent to learner",
    `${chosen.name} — ${chosen.institute}`
  );
  notify(
    app.learner_id,
    `Congratulations! You have been shortlisted for ${chosen.name} at ${chosen.institute}. Please review and sign your documents.`,
    "/learner"
  );
  dirty();
  goto("/ac?toast=shortlisted");
}

// ---------- Learner self-service ----------

/**
 * The learner corrects their own details — no counsellor round trip needed.
 * Only Ops-derived fields (scores read off marksheets) stay read-only, and a
 * completed application is closed. Every change is logged and the counsellor
 * is notified, so edits after signing stay traceable.
 */
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

  const tx = db.transaction(() => {
    for (const f of FORM_FIELDS) {
      if (f.filledBy === "ops") continue;
      const v = formData.get(f.key);
      if (v === null) continue;
      const next = String(v);
      if ((before[f.key] ?? "") !== next) changed.push(f.label);
      upsert.run(applicationId, f.key, next);
    }
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
    logEvent(
      applicationId,
      user.id,
      `Learner updated ${changed.length} detail(s)`,
      changed.slice(0, 6).join(", ")
    );
    // Both sides need to know — Ops vetted these values, the counsellor owns
    // the relationship.
    const what = changed.slice(0, 3).join(", ");
    if (app.ac_id) {
      notify(
        app.ac_id,
        `${app.learner_name} updated their details: ${what}`,
        `/ac/application/${applicationId}`
      );
    }
    const opsMsg = `${app.learner_name} updated their details: ${what}`;
    const opsLink = `/ops/application/${applicationId}`;
    if (app.ops_id) notify(app.ops_id, opsMsg, opsLink);
    else notifyRole("ops", opsMsg, opsLink);
  }
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
  goto(`/ops/application/${applicationId}?tab=undertaking&toast=offer`);
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
