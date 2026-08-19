import { getDb } from "./db";
import type {
  AppStatus,
  DocType,
  DocVerification,
  RecheckState,
} from "./domain";
export type { RecheckState };
import type { User } from "./auth";

export interface Application {
  id: number;
  learner_id: number;
  ac_id: number | null;
  ops_id: number | null;
  status: AppStatus;
  created_at: string;
  updated_at: string;
  /** When the learner certified their own details, if they have. */
  certified_at: string | null;
  /**
   * Set when the learner edits a detail after the form has been vetted: the
   * application is waiting on an Ops re-check. Cleared by `clearRecheck`.
   */
  recheck_at: string | null;
  /** The labels the learner changed, comma-separated — what Ops must re-read. */
  recheck_fields: string | null;
  /** Whose move it is: 'ops' to re-read, 'ac' to resolve Ops' comments. */
  recheck_state: RecheckState | null;
  learner_name?: string;
  learner_email?: string;
  ac_name?: string;
  ac_email?: string;
  ops_name?: string;
}

export interface Remark {
  id: number;
  application_id: number;
  field_key: string;
  author_id: number;
  author_name?: string;
  text: string;
  status: "open" | "resolved";
  created_at: string;
}

export interface Program {
  id: number;
  application_id: number;
  name: string;
  institute: string;
  duration: string | null;
  fee: string | null;
  notes: string | null;
  added_by: number;
  shortlisted: number;
  created_at: string;
  catalogue_id: number | null;
  /** 'ac' = recommended by the counsellor; 'ops'/'auto' = legacy rows. */
  source: "auto" | "ops" | "ac";
  /** Ops' verdict on the recommendation — 'pending' until they rule. */
  eligibility: "pending" | "eligible" | "not_eligible";
  /** The verdict was made before the learner changed the answers behind it. */
  eligibility_stale?: number;
}

export interface CatalogueProgram {
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

export interface DocTemplate {
  id: number;
  type: DocType;
  title: string;
  content: string;
  clause_id: string | null;
  always_required: number;
}

export interface Doc {
  id: number;
  application_id: number;
  type: DocType;
  title: string;
  content: string;
  auto_generated: number;
  signed_at: string | null;
  signature_name: string | null;
  created_at: string;
  template_id: number | null;
  source: "auto" | "ops";
}

/** One filled slot in the learner's document locker. */
export interface LearnerDoc {
  id: number;
  application_id: number;
  doc_key: string;
  filename: string;
  uploaded_by: number;
  uploaded_by_name?: string;
  uploaded_at: string;
  verification: DocVerification;
  verified_by: number | null;
  verified_by_name?: string | null;
  verified_at: string | null;
  reason: string | null;
}

export interface Notification {
  id: number;
  user_id: number;
  text: string;
  link: string | null;
  read: number;
  created_at: string;
}

export interface AppEvent {
  id: number;
  application_id: number;
  actor_id: number;
  actor_name?: string;
  action: string;
  detail: string | null;
  created_at: string;
}

const APP_SELECT = `
  SELECT a.*,
    l.name AS learner_name, l.email AS learner_email,
    ac.name AS ac_name, ac.email AS ac_email, ops.name AS ops_name
  FROM applications a
  JOIN users l ON l.id = a.learner_id
  LEFT JOIN users ac ON ac.id = a.ac_id
  LEFT JOIN users ops ON ops.id = a.ops_id
`;

export function getApplication(id: number): Application | undefined {
  return getDb().prepare(`${APP_SELECT} WHERE a.id = ?`).get(id) as Application | undefined;
}

export function listApplications(filter: { acId?: number; learnerId?: number; search?: string } = {}): Application[] {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filter.acId) {
    clauses.push("a.ac_id = ?");
    params.push(filter.acId);
  }
  if (filter.learnerId) {
    clauses.push("a.learner_id = ?");
    params.push(filter.learnerId);
  }
  if (filter.search) {
    clauses.push("(l.name LIKE ? OR l.email LIKE ?)");
    params.push(`%${filter.search}%`, `%${filter.search}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDb()
    .prepare(`${APP_SELECT} ${where} ORDER BY a.updated_at DESC`)
    .all(...params) as Application[];
}

export function getFormResponses(applicationId: number): Record<string, string> {
  const rows = getDb()
    .prepare("SELECT field_key, value FROM form_responses WHERE application_id = ?")
    .all(applicationId) as { field_key: string; value: string }[];
  return Object.fromEntries(rows.map((r) => [r.field_key, r.value]));
}

export function getRemarks(applicationId: number): Remark[] {
  return getDb()
    .prepare(
      `SELECT r.*, u.name AS author_name FROM remarks r
       JOIN users u ON u.id = r.author_id
       WHERE r.application_id = ? ORDER BY r.created_at ASC`
    )
    .all(applicationId) as Remark[];
}

export function getPrograms(applicationId: number): Program[] {
  return getDb()
    .prepare("SELECT * FROM programs WHERE application_id = ? ORDER BY created_at ASC")
    .all(applicationId) as Program[];
}

export function getDocuments(applicationId: number): Doc[] {
  return getDb()
    .prepare("SELECT * FROM documents WHERE application_id = ? ORDER BY created_at ASC")
    .all(applicationId) as Doc[];
}

/**
 * The uploaded rows only. Callers pair this against LEARNER_DOCS to render the
 * full checklist — a slot with no row here is an empty slot, which is exactly
 * as meaningful as a filled one.
 */
export function getLearnerDocs(
  applicationId: number
): Record<string, LearnerDoc> {
  const rows = getDb()
    .prepare(
      `SELECT d.*, u.name AS uploaded_by_name, v.name AS verified_by_name
       FROM learner_documents d
       JOIN users u ON u.id = d.uploaded_by
       LEFT JOIN users v ON v.id = d.verified_by
       WHERE d.application_id = ?`
    )
    .all(applicationId) as LearnerDoc[];
  return Object.fromEntries(rows.map((r) => [r.doc_key, r]));
}

export function getOfferLetter(applicationId: number) {
  return getDb()
    .prepare(
      `SELECT ol.*, p.name AS program_name, p.institute
       FROM offer_letters ol JOIN programs p ON p.id = ol.program_id
       WHERE ol.application_id = ?`
    )
    .get(applicationId) as
    | { id: number; content: string; program_name: string; institute: string; created_at: string }
    | undefined;
}

export function getEvents(applicationId: number): AppEvent[] {
  return getDb()
    .prepare(
      `SELECT e.*, u.name AS actor_name FROM events e
       JOIN users u ON u.id = e.actor_id
       WHERE e.application_id = ? ORDER BY e.created_at DESC, e.id DESC`
    )
    .all(applicationId) as AppEvent[];
}

export function getNotifications(userId: number): Notification[] {
  return getDb()
    .prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 50")
    .all(userId) as Notification[];
}

export function getUnreadCount(userId: number): number {
  const row = getDb()
    .prepare("SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND read = 0")
    .get(userId) as { c: number };
  return row.c;
}

export function listUsers(role?: string): User[] {
  if (role) {
    return getDb()
      .prepare("SELECT id, name, email, role FROM users WHERE role = ? ORDER BY name")
      .all(role) as User[];
  }
  return getDb()
    .prepare("SELECT id, name, email, role FROM users ORDER BY role, name")
    .all() as User[];
}

// --- catalogues Ops picks from (Ops cannot invent programmes or forms) ---

export function listProgramCatalogue(): CatalogueProgram[] {
  return getDb()
    .prepare("SELECT * FROM program_catalogue ORDER BY country, name")
    .all() as CatalogueProgram[];
}

export function listDocTemplates(): DocTemplate[] {
  return getDb()
    .prepare(
      "SELECT * FROM document_templates ORDER BY always_required DESC, type, title"
    )
    .all() as DocTemplate[];
}

// --- recently opened (sidebar) ---

export interface RecentView {
  application_id: number;
  learner_name: string;
  status: AppStatus;
  viewed_at: string;
}

export function recordView(userId: number, applicationId: number) {
  getDb()
    .prepare(
      `INSERT INTO page_views (user_id, application_id, viewed_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT (user_id, application_id) DO UPDATE SET viewed_at = datetime('now')`
    )
    .run(userId, applicationId);
}

export function recentViews(userId: number, limit = 3): RecentView[] {
  return getDb()
    .prepare(
      `SELECT pv.application_id, l.name AS learner_name, a.status, pv.viewed_at
       FROM page_views pv
       JOIN applications a ON a.id = pv.application_id
       JOIN users l ON l.id = a.learner_id
       WHERE pv.user_id = ?
       ORDER BY pv.viewed_at DESC
       LIMIT ?`
    )
    .all(userId, limit) as RecentView[];
}

// --- write helpers used by actions ---

export function notify(userId: number, text: string, link?: string) {
  getDb()
    .prepare("INSERT INTO notifications (user_id, text, link) VALUES (?, ?, ?)")
    .run(userId, text, link ?? null);
}

export function notifyRole(role: string, text: string, link?: string) {
  for (const u of listUsers(role)) notify(u.id, text, link);
}

export function logEvent(applicationId: number, actorId: number, action: string, detail?: string) {
  getDb()
    .prepare("INSERT INTO events (application_id, actor_id, action, detail) VALUES (?, ?, ?, ?)")
    .run(applicationId, actorId, action, detail ?? null);
}

/**
 * Is this application waiting on a re-check, of what, and with whom? Every
 * screen asks through here so "the learner changed something" is one
 * condition, not a null test repeated in eight files.
 */
export function recheckOf(
  app: Pick<Application, "recheck_at" | "recheck_fields" | "recheck_state">
): { at: string; fields: string[]; state: RecheckState } | null {
  if (!app.recheck_at) return null;
  return {
    at: app.recheck_at,
    fields: (app.recheck_fields ?? "").split(", ").filter(Boolean),
    // Rows written before the column existed are waiting on Ops.
    state: app.recheck_state === "ac" ? "ac" : "ops",
  };
}

export function setStatus(applicationId: number, status: AppStatus) {
  getDb()
    .prepare("UPDATE applications SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, applicationId);
}
