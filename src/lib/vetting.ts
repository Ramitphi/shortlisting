import { getDb } from "./db";
import { getApplication, getDocuments, getFormResponses, logEvent } from "./queries";

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
    insert.run(applicationId, t.type, t.title, `I, ${learner}, ${t.content}`, t.id);
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
