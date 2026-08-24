import type { BrowserDb } from "./browser-db";

/**
 * The database lives IN THE BROWSER — a sql.js (WASM SQLite) instance opened
 * and owned by <DbProvider>, persisted to IndexedDB. This module only holds
 * the handle plus the schema; there is no file, no server, no native driver.
 * Every query and action below imports getDb() exactly as it did when this
 * was better-sqlite3 — the adapter speaks the same API.
 */

let _db: BrowserDb | null = null;

export function setDb(db: BrowserDb): void {
  _db = db;
}

export function dbReady(): boolean {
  return _db !== null;
}

export function getDb(): BrowserDb {
  if (!_db) {
    throw new Error(
      "Database not initialised — is this running outside <DbProvider>?"
    );
  }
  return _db;
}

/** Run once against a fresh or loaded image; everything is idempotent. */
export function initSchema(db: BrowserDb): void {
  db.pragma("foreign_keys = ON");
  migrate(db);
  migrateColumns(db);
  seed(db);
  seedCatalogues(db);
}

function migrate(db: BrowserDb) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('learner','ac','ops','admin')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      learner_id INTEGER NOT NULL REFERENCES users(id),
      ac_id INTEGER REFERENCES users(id),
      ops_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS form_responses (
      application_id INTEGER NOT NULL REFERENCES applications(id),
      field_key TEXT NOT NULL,
      value TEXT NOT NULL DEFAULT '',
      PRIMARY KEY (application_id, field_key)
    );

    CREATE TABLE IF NOT EXISTS remarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES applications(id),
      field_key TEXT NOT NULL,
      author_id INTEGER NOT NULL REFERENCES users(id),
      text TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES applications(id),
      name TEXT NOT NULL,
      institute TEXT NOT NULL,
      duration TEXT,
      fee TEXT,
      notes TEXT,
      added_by INTEGER NOT NULL REFERENCES users(id),
      shortlisted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES applications(id),
      type TEXT NOT NULL CHECK (type IN ('undertaking','acknowledgement')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      auto_generated INTEGER NOT NULL DEFAULT 0,
      signed_at TEXT,
      signature_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- The learner's document locker. One row per FILLED slot only: the
    -- checklist itself lives in domain.ts (LEARNER_DOCS), so empty slots are
    -- rendered from the definition rather than pre-seeded as blank rows.
    CREATE TABLE IF NOT EXISTS learner_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES applications(id),
      doc_key TEXT NOT NULL,
      filename TEXT NOT NULL,
      uploaded_by INTEGER NOT NULL REFERENCES users(id),
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
      -- Ops alone verifies. 'pending' until they look at it.
      verification TEXT NOT NULL DEFAULT 'pending'
        CHECK (verification IN ('pending','verified','rejected')),
      verified_by INTEGER REFERENCES users(id),
      verified_at TEXT,
      reason TEXT,
      UNIQUE (application_id, doc_key)
    );

    -- How each review group stands, for BOTH sides of the desk: the
    -- counsellor ticks a group as correct, Ops rules it verified or not with
    -- a comment. One row per (application, group, role) — the two verdicts
    -- are independent and both are worth keeping.
    CREATE TABLE IF NOT EXISTS group_checks (
      application_id INTEGER NOT NULL REFERENCES applications(id),
      group_key TEXT NOT NULL,
      actor_role TEXT NOT NULL CHECK (actor_role IN ('ac','ops')),
      state TEXT NOT NULL CHECK (state IN ('checked','verified','not_verified')),
      comment TEXT,
      by_id INTEGER REFERENCES users(id),
      at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (application_id, group_key, actor_role)
    );

    -- Ops' verdict on a SINGLE answer. The section verdict (group_checks) says
    -- whether a block of the form holds up; this says which individual answer
    -- inside it is right or wrong. A note is not a state — notes are remarks,
    -- so that they keep behaving like every other comment.
    -- A remark is the opening message; this is the conversation under it.
    -- It used to be a single reply column, which meant the second reply
    -- overwrote the first and nobody could actually talk.
    CREATE TABLE IF NOT EXISTS remark_replies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      remark_id INTEGER NOT NULL REFERENCES remarks(id) ON DELETE CASCADE,
      author_id INTEGER NOT NULL REFERENCES users(id),
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS field_checks (
      application_id INTEGER NOT NULL REFERENCES applications(id),
      field_key TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('correct','incorrect')),
      by_id INTEGER REFERENCES users(id),
      at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (application_id, field_key)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      text TEXT NOT NULL,
      link TEXT,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES applications(id),
      actor_id INTEGER NOT NULL REFERENCES users(id),
      action TEXT NOT NULL,
      detail TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Master catalogue of programmes Ops may recommend. Ops picks from here;
    -- they cannot invent a programme, so every recommendation carries real
    -- institute, cost and eligibility data.
    CREATE TABLE IF NOT EXISTS program_catalogue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      institute TEXT NOT NULL,
      country TEXT NOT NULL,
      degree_level TEXT NOT NULL,
      duration TEXT,
      fee TEXT,
      min_score INTEGER,
      min_work_exp_months INTEGER,
      notes TEXT
    );

    -- Master catalogue of undertaking / acknowledgement forms.
    CREATE TABLE IF NOT EXISTS document_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('undertaking','acknowledgement')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      clause_id TEXT,
      always_required INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS page_views (
      user_id INTEGER NOT NULL REFERENCES users(id),
      application_id INTEGER NOT NULL REFERENCES applications(id),
      viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, application_id)
    );

    CREATE TABLE IF NOT EXISTS offer_letters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL REFERENCES applications(id),
      program_id INTEGER NOT NULL REFERENCES programs(id),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

/** SQLite lacks ADD COLUMN IF NOT EXISTS — check pragma first. */
function addColumn(db: BrowserDb, table: string, column: string, decl: string) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${decl}`);
  }
}

function migrateColumns(db: BrowserDb) {
  // 'auto' = attached by the system for this learner (Ops cannot remove it);
  // 'ops'  = added by Ops, and therefore removable by Ops.
  addColumn(db, "programs", "catalogue_id", "INTEGER");
  addColumn(db, "programs", "source", "TEXT NOT NULL DEFAULT 'ops'");
  // The counsellor recommends; Ops rules on each recommendation. 'pending'
  // until Ops has looked.
  addColumn(db, "programs", "eligibility", "TEXT NOT NULL DEFAULT 'pending'");
  // Set when a learner edit changed one of the answers the verdict rested on:
  // the ruling still reads on screen, but it was made against details that
  // have since moved, and Ops has to make it again before the re-check closes.
  addColumn(db, "programs", "eligibility_stale", "INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "documents", "template_id", "INTEGER");
  addColumn(db, "documents", "source", "TEXT NOT NULL DEFAULT 'auto'");
  // When the learner certified their own details. Ops cannot release the
  // offer letter until this is set.
  addColumn(db, "applications", "certified_at", "TEXT");
  // A learner edit lands the details back in front of Ops. Not a status —
  // the pipeline is one-way — but a flag Ops has to clear: `recheck_at` is
  // when the edit happened, `recheck_fields` the labels that moved, so Ops
  // re-reads exactly what changed rather than the whole form again.
  addColumn(db, "applications", "recheck_at", "TEXT");
  addColumn(db, "applications", "recheck_fields", "TEXT");
  // Whose move the re-check is: 'ops' = waiting to be re-read, 'ac' = Ops
  // raised comments and the counsellor is resolving them with the learner.
  addColumn(db, "applications", "recheck_state", "TEXT");
  // Why a programme was ruled in or out — the verdict without the reason is
  // an argument nobody can have.
  addColumn(db, "programs", "eligibility_note", "TEXT");
  // The counsellor's push-back on a "not eligible": why they think it should
  // stand, or the note that came with a programme they suggested instead.
  addColumn(db, "programs", "appeal_note", "TEXT");
  addColumn(db, "programs", "appeal_at", "TEXT");
  // Why a re-check is open. A learner changing their details and a counsellor
  // appealing a verdict both put the application back on Ops' desk, but they
  // are different questions and the screens have to say which.
  addColumn(db, "applications", "recheck_kind", "TEXT");
  // Not every comment is a job. 'info' is context to read; 'action' is
  // something the counsellor has to do before the shortlist goes out.
  addColumn(db, "remarks", "kind", "TEXT NOT NULL DEFAULT 'action'");
  // A comment can be answered two ways: a thumbs-up that says "seen and
  // agreed", or a written reply. Both leave a trace; neither is a resolve.
  addColumn(db, "remarks", "acknowledged_at", "TEXT");
  addColumn(db, "remarks", "reply", "TEXT");
  addColumn(db, "remarks", "replied_at", "TEXT");
}

function seedCatalogues(db: BrowserDb) {
  const progCount = db.prepare("SELECT COUNT(*) AS c FROM program_catalogue").get() as { c: number };
  if (progCount.c === 0) {
    const ins = db.prepare(
      `INSERT INTO program_catalogue
       (name, institute, country, degree_level, duration, fee, min_score, min_work_exp_months, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const rows: [string, string, string, string, string, string, number | null, number | null, string][] = [
      ["MS in Data Science", "University of Melbourne", "Australia", "Masters", "24 months", "₹32L", 70, 0, "STEM background required"],
      ["Master of Business Analytics", "Monash University", "Australia", "Masters", "18 months", "₹28L", 65, 12, "Quantitative background preferred"],
      ["Bachelor of IT", "RMIT University", "Australia", "Bachelors", "36 months", "₹24L", 60, null, "Direct entry after Class 12"],
      ["MS in Computer Science", "TU Munich", "Germany", "Masters", "24 months", "₹8L", 70, 0, "Anabin H+ institutions only"],
      ["MS in Mechanical Engineering", "RWTH Aachen", "Germany", "Masters", "24 months", "₹9L", 68, 0, "Requires B.Tech in Mechanical"],
      ["BSc in Business Informatics", "SRH Berlin", "Germany", "Bachelors", "36 months", "₹18L", 60, null, "English-taught track"],
      ["MSc in Management", "ESСP Business School", "France", "Masters", "18 months", "₹26L", 65, 24, "Work experience strongly weighted"],
      ["MS in Artificial Intelligence", "EURECOM", "France", "Masters", "24 months", "₹19L", 70, 0, "Strong maths prerequisite"],
      ["MS in Software Engineering", "Aalto University", "Finland", "Masters", "24 months", "₹14L", 68, 0, "Portfolio reviewed"],
      ["MBBS", "Tbilisi State Medical University", "Other Europe", "Bachelors", "72 months", "₹35L", 60, null, "NEET qualification mandatory"],
      ["MS in Data Engineering", "University of Warsaw", "Other Europe", "Masters", "24 months", "₹12L", 65, 0, "Good value option"],
      ["MS in Computer Science", "Northeastern University", "USA", "Masters", "24 months", "₹48L", 70, 0, "GRE optional for 2026 intake"],
      ["MBA", "Purdue University", "USA", "Masters", "21 months", "₹52L", 65, 36, "Minimum 3 years work experience"],
      ["PG Certificate in Data Analytics", "Great Learning", "Other Europe", "Profile Building", "8 months", "₹1.8L", null, null, "Profile-building track before a Masters"],
      ["Profile Accelerator Programme", "upGrad", "Other Europe", "Profile Building", "6 months", "₹1.2L", null, null, "For applicants strengthening their profile"],
    ];
    const tx = db.transaction(() => { for (const r of rows) ins.run(...r); });
    tx();
  }

  const docCount = db.prepare("SELECT COUNT(*) AS c FROM document_templates").get() as { c: number };
  if (docCount.c === 0) {
    const ins = db.prepare(
      "INSERT INTO document_templates (type, title, content, clause_id, always_required) VALUES (?, ?, ?, ?, ?)"
    );
    const rows: [string, string, string, string | null, number][] = [
      ["undertaking", "Program Eligibility Undertaking", "I hereby undertake that all details provided in my eligibility form are true and correct to the best of my knowledge. I understand that any misrepresentation may lead to cancellation of my application or admission.", null, 1],
      ["acknowledgement", "Process Acknowledgement", "I acknowledge that I have been informed about the program structure, fee details, and admission process. I understand the shortlisting decision is based on the eligibility details submitted on my behalf by my academic counsellor.", null, 1],
      ["acknowledgement", "Parent / Legal Guardian Consent", "As the parent or legal guardian of the applicant, I consent to this application being submitted and accept responsibility for all declarations made within it.", "CON-Parents-01", 0],
      ["acknowledgement", "Visa Age Acknowledgement", "I acknowledge that my age may affect the student visa assessment for my chosen destination, and that the decision rests solely with the visa authority.", "ACK-Age/Visa-01", 0],
      ["undertaking", "Class 12 Completion Undertaking", "I undertake to submit my Class 12 final marksheet immediately upon publication of results, and understand my application remains provisional until then.", "UT-uG Doc-01", 0],
      ["undertaking", "Class 12 Marksheet Submission Undertaking", "I undertake to submit my Class 12 marksheet within the timeline communicated to me, and understand that failure to do so may void my application.", "UT-uG Doc/Result-03", 0],
      ["undertaking", "Academic Documents Pending Undertaking", "I undertake to submit all remaining academic documents, including consolidated marksheets and transcripts, before the university deadline.", "UT-PG Doc-02", 0],
      ["undertaking", "Bachelor's Marksheet Submission Undertaking", "I undertake to submit my complete set of bachelor's semester marksheets and grading scale before the offer is confirmed.", "UT-PG Doc/Result-04", 0],
      ["undertaking", "Backlog Declaration", "I declare that the number of backlogs / ATKTs stated in my application is accurate and complete, and I will disclose any change immediately.", "UT-Backlog-01", 0],
      ["undertaking", "Financing Undertaking", "I confirm the financing route stated in my application and understand that the final lending decision rests with the lender and depends on my profile.", "UT/ACK-Loan-01", 0],
      ["undertaking", "Medium of Instruction Undertaking", "I undertake to provide a medium-of-instruction certificate from my previous institution where required by the university.", null, 0],
      ["acknowledgement", "Accommodation & Living Costs Acknowledgement", "I acknowledge that accommodation and living costs are additional to tuition and are my own responsibility.", null, 0],
    ];
    const tx = db.transaction(() => { for (const r of rows) ins.run(...r); });
    tx();
  }
}

function seed(db: BrowserDb) {
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get() as { c: number };
  if (count.c > 0) return;

  const insertUser = db.prepare(
    "INSERT INTO users (name, email, role) VALUES (?, ?, ?)"
  );
  const users: [string, string, string][] = [
    ["Asha Sharma", "asha.admin@example.com", "admin"],
    ["Arjun Mehta", "arjun.ac@example.com", "ac"],
    ["Anita Rao", "anita.ac@example.com", "ac"],
    ["Omar Khan", "omar.ops@example.com", "ops"],
    ["Olivia D'Souza", "olivia.ops@example.com", "ops"],
    ["Ravi Kumar", "ravi.learner@example.com", "learner"],
    ["Priya Singh", "priya.learner@example.com", "learner"],
    ["Sneha Patel", "sneha.learner@example.com", "learner"],
    ["Vikram Joshi", "vikram.learner@example.com", "learner"],
    ["Neha Gupta", "neha.learner@example.com", "learner"],
    ["Aman Verma", "aman.learner@example.com", "learner"],
  ];
  const tx = db.transaction(() => {
    for (const u of users) insertUser.run(...u);
    // Every learner starts with a draft application assigned to an AC
    // (learner ids 6-11, ACs alternate between Arjun (2) and Anita (3)).
    const insertApp = db.prepare(
      "INSERT INTO applications (learner_id, ac_id, status) VALUES (?, ?, 'draft')"
    );
    for (let learnerId = 6; learnerId <= 11; learnerId++) {
      insertApp.run(learnerId, learnerId % 2 === 0 ? 2 : 3);
    }
  });
  tx();
}
