import { getDb } from "./db";
import { getApplication, getDocuments, getFormResponses, logEvent, notify } from "./queries";

/**
 * Attach the forms this application requires, as source='auto' so Ops cannot
 * remove them: every always-required template plus the template for each
 * clause the counsellor's call triggered. Programmes are never auto-attached —
 * Ops picks all of those themselves.
 *
 * Runs when the counsellor submits. Submitting IS handing it to Ops, so the
 * undertakings are ready before it reaches the vetting queue.
 */
export function attachRequiredForms(applicationId: number, actorId: number) {
  const app = getApplication(applicationId);
  if (!app) return;
  if (getDocuments(applicationId).length > 0) return;

  const db = getDb();
  const responses = getFormResponses(applicationId);
  const learner = responses.full_name || app.learner_name || "the learner";
  const triggered = (responses.triggered_clauses ?? "").split("|").filter(Boolean);

  const templates = db.prepare("SELECT * FROM document_templates").all() as {
    id: number;
    type: string;
    title: string;
    content: string;
    clause_id: string | null;
    always_required: number;
  }[];
  const needed = templates.filter(
    (t) => t.always_required === 1 || (t.clause_id && triggered.includes(t.clause_id))
  );

  const insert = db.prepare(
    `INSERT INTO documents
     (application_id, type, title, content, auto_generated, template_id, source)
     VALUES (?, ?, ?, ?, 1, ?, 'auto')`
  );
  for (const t of needed) {
    // Templates are written first-person ("I hereby undertake…"), so the lead
    // "I" is dropped before the name goes in — otherwise every generated
    // document read "I, Neha Gupta, I hereby undertake…".
    //
    // And the guardian consent is the GUARDIAN speaking, so it carries their
    // name: "I, <minor>, As the parent or legal guardian…" named the wrong
    // person as the declarant.
    const declarant =
      t.clause_id === "CON-Parents-01"
        ? responses.guardian_name || "the parent or legal guardian"
        : learner;
    insert.run(
      applicationId,
      t.type,
      t.title,
      `I, ${declarant}, ${t.content.replace(/^I /, "")}`,
      t.id
    );
  }
  logEvent(
    applicationId,
    actorId,
    "UT & Ack documents auto-generated",
    triggered.length > 0
      ? `Including ${triggered.length} triggered declaration(s)`
      : undefined
  );
}

/**
 * The first Ops user to open an unassigned application takes it on. This is
 * assignment, not a status change — it is already under vetting.
 */
export function claimApplication(applicationId: number, opsId: number): boolean {
  const app = getApplication(applicationId);
  if (!app || app.ops_id || app.status !== "under_review") return false;
  getDb()
    .prepare("UPDATE applications SET ops_id = ? WHERE id = ?")
    .run(opsId, applicationId);
  logEvent(applicationId, opsId, "Picked up for vetting");
  return true;
}

/**
 * The incremental sibling of attachRequiredForms, for re-checks: a changed
 * answer can trigger a clause that wasn't triggered on the original call, so
 * when the counsellor sends a re-check back, any NEWLY needed forms attach —
 * unsigned, for the learner to sign before they can certify again. Forms
 * already attached (signed or not) are left exactly as they are.
 */
export function attachMissingForms(applicationId: number, actorId: number) {
  const app = getApplication(applicationId);
  if (!app) return;

  const db = getDb();
  const responses = getFormResponses(applicationId);
  const learner = responses.full_name || app.learner_name || "the learner";
  const triggered = (responses.triggered_clauses ?? "").split("|").filter(Boolean);

  const existing = new Set(
    getDocuments(applicationId)
      .map((d) => d.template_id)
      .filter((id): id is number => id !== null)
  );
  const templates = db.prepare("SELECT * FROM document_templates").all() as {
    id: number;
    type: string;
    title: string;
    content: string;
    clause_id: string | null;
    always_required: number;
  }[];
  // Detach first. A learner who edits their way OUT of a declaration — the
  // backlog count back to zero, a status no longer "Pursuing" — was left with
  // an undertaking nobody could remove (Ops may only detach what Ops attached)
  // and certifying needs every document signed, so it blocked them for good.
  // Only untouched auto-generated ones go: anything signed is a record.
  const stale = getDocuments(applicationId).filter(
    (d) =>
      d.auto_generated &&
      !d.signed_at &&
      d.template_id !== null &&
      (() => {
        const t = templates.find((x) => x.id === d.template_id);
        return Boolean(
          t && t.always_required !== 1 && t.clause_id && !triggered.includes(t.clause_id)
        );
      })()
  );
  if (stale.length > 0) {
    const drop = db.prepare("DELETE FROM documents WHERE id = ?");
    for (const d of stale) {
      drop.run(d.id);
      logEvent(
        applicationId,
        actorId,
        `Undertaking no longer required: ${d.title}`,
        "The answers that triggered it have changed"
      );
    }
  }

  const needed = templates.filter(
    (t) =>
      !existing.has(t.id) &&
      (t.always_required === 1 ||
        (t.clause_id && triggered.includes(t.clause_id)))
  );
  if (needed.length === 0) return;

  const insert = db.prepare(
    `INSERT INTO documents
     (application_id, type, title, content, auto_generated, template_id, source)
     VALUES (?, ?, ?, ?, 1, ?, 'auto')`
  );
  for (const t of needed) {
    // Templates are written first-person ("I hereby undertake…"), so the lead
    // "I" is dropped before the name goes in — otherwise every generated
    // document read "I, Neha Gupta, I hereby undertake…".
    //
    // And the guardian consent is the GUARDIAN speaking, so it carries their
    // name: "I, <minor>, As the parent or legal guardian…" named the wrong
    // person as the declarant.
    const declarant =
      t.clause_id === "CON-Parents-01"
        ? responses.guardian_name || "the parent or legal guardian"
        : learner;
    insert.run(
      applicationId,
      t.type,
      t.title,
      `I, ${declarant}, ${t.content.replace(/^I /, "")}`,
      t.id
    );
  }
  logEvent(
    applicationId,
    actorId,
    `${needed.length} new undertaking(s) attached after the change`,
    needed.map((t) => t.title).join("; ")
  );
  if (app.learner_id) {
    notify(
      app.learner_id,
      `Your change added ${needed.length} document(s) to sign before you can certify`,
      "/learner"
    );
  }
}
