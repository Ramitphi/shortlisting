// Central domain definitions: roles, application state machine, form fields, doc types.

export type Role = "learner" | "ac" | "ops" | "admin";

export function roleHome(role: Role): string {
  return { learner: "/learner", ac: "/ac", ops: "/ops", admin: "/admin" }[role];
}

export const ROLE_LABELS: Record<Role, string> = {
  learner: "Learner",
  ac: "Academic Counsellor",
  ops: "Ops Team",
  admin: "Admin",
};

// Application (eligibility form) state machine.
// draft        -> AC is filling the form on the call (Stage 1)
// under_review -> AC submitted; it is in Ops' vetting queue (Stage 2)
//                 There is no separate "submitted" state: submitting IS
//                 handing it to Ops, and nothing happens in between.
// reviewed     -> Ops finished vetting and attached programmes + forms (Stage 3)
// shortlisted  -> AC sent shortlisted programme(s) to the learner (Stage 4)
// completed    -> Learner certified, Ops released the offer letter (Stage 4)
//
// The path is one-way. Exactly one role owns the details at a time — the
// counsellor until they submit, then Ops. There is no loop back to an earlier
// status, because a form that can bounce between two editors bounces forever.
//
// The one thing that DOES come back is a learner editing their own details
// after vetting. That doesn't rewind the status; it raises a re-check flag on
// the application (`recheck_at`) which Ops has to clear before the learner
// can certify or the offer letter can go out. See `updateLearnerDetails` and
// `clearRecheck` in actions.ts.
export type AppStatus =
  | "draft"
  | "under_review"
  | "reviewed"
  | "shortlisted"
  | "completed";

/** The forward path. */
export const STATUS_FLOW: AppStatus[] = [
  "draft",
  "under_review",
  "reviewed",
  "shortlisted",
  "completed",
];

/** Every status — for filters and badges. Same as the flow now. */
export const ALL_STATUSES: AppStatus[] = [...STATUS_FLOW];

export function stageIndex(status: AppStatus): number {
  return STATUS_FLOW.indexOf(status);
}

/**
 * What the learner sees instead of the five internal statuses. Whether the
 * form is sitting with Ops or back with the counsellor is upGrad's business —
 * to the learner it is one span of "we're working on it", and surfacing the
 * internal handoffs only invites "why is it still with Ops?".
 */
export const LEARNER_STAGES = [
  { label: "In progress", hint: "We're preparing your options" },
  { label: "Programmes ready", hint: "Review, sign and certify" },
  { label: "Offer letter", hint: "Issued" },
] as const;

export function learnerStage(status: AppStatus): number {
  if (status === "completed") return 2;
  if (status === "shortlisted") return 1;
  return 0;
}

/** The status badge as the learner should read it. */
export function learnerStatus(
  status: AppStatus,
  certified = false,
  /** Their own edit is being re-checked — nothing is waiting on them. */
  recheck: RecheckState | null | boolean = null
): { label: string; className: string } {
  if (status === "completed")
    return { label: "Completed", className: STATUS_COLORS.completed };
  // Never "Action needed" while we are the ones holding it up.
  if (recheck)
    return { label: "Being checked", className: STATUS_COLORS.reviewed };
  if (status === "shortlisted")
    return certified
      ? { label: "With upGrad", className: STATUS_COLORS.reviewed }
      : { label: "Action needed", className: STATUS_COLORS.under_review };
  return { label: "In progress", className: STATUS_COLORS.draft };
}

export const STATUS_LABELS: Record<AppStatus, string> = {
  draft: "Draft",
  under_review: "Under Vetting",
  reviewed: "Reviewed by Ops",
  shortlisted: "Shortlisted",
  completed: "Completed",
};

/**
 * A re-check replaces the status chip while it is live — ONE chip, in a
 * colour no status uses (blue), so it never twins with Under Vetting's amber
 * and a row never wears two badges.
 */
export const RECHECK_CHIP =
  "bg-[#e7eef8] text-[#3b5e8e] border border-[#d3e0f0]";

export const STATUS_COLORS: Record<AppStatus, string> = {
  draft: "bg-cream text-body border border-cream-line",
  under_review: "bg-[#f6efdd] text-[#8a6d2f] border border-[#ecdfc0]",
  reviewed: "bg-[#efe9f6] text-[#6b4d8f] border border-[#e1d5ee]",
  shortlisted: "bg-[#e8f2e9] text-[#3f6c45] border border-[#d5e6d8]",
  completed: "bg-[#e2eee5] text-[#2f5e38] border border-[#cde1d2]",
};

// Who is allowed to move an application from -> to.
export const TRANSITIONS: { from: AppStatus; to: AppStatus; by: Role }[] = [
  // Submitting hands it straight to Ops — there is no waiting room.
  { from: "draft", to: "under_review", by: "ac" },
  // Ops finished vetting: corrections made, programmes and undertakings attached.
  { from: "under_review", to: "reviewed", by: "ops" },
  { from: "reviewed", to: "shortlisted", by: "ac" },
  // Only once the learner has certified their details.
  { from: "shortlisted", to: "completed", by: "ops" },
];

/**
 * Where an open re-check sits — the one loop in an otherwise one-way flow.
 * 'ops': the learner changed something and it is waiting to be re-read.
 * 'ac':  Ops read it, left comments, and the counsellor is resolving them
 *        with the learner. The learner's next edit sends it back to 'ops'.
 */
export type RecheckState = "ops" | "ac";

export function canTransition(from: AppStatus, to: AppStatus, by: Role): boolean {
  return TRANSITIONS.some((t) => t.from === from && t.to === to && t.by === by);
}

/**
 * Who holds the application right now, and what that entitles them to.
 *
 * `draft` → the counsellor, who is filling the form on the call and is the
 * only role that ever writes the learner's answers.
 *
 * `under_review` → Ops. Holding it means reviewing: they comment on fields and
 * verify documents. They do **not** change the answers — a reviewer who edits
 * the thing under review leaves no record of what the learner actually said.
 *
 * After that, nobody holds it.
 *
 * The learner is separate: they always own their own details (see
 * `updateLearnerDetails`), which is a different thing from vetting the form.
 */
export function editorOf(status: AppStatus): Role | null {
  if (status === "draft") return "ac";
  if (status === "under_review") return "ops";
  return null;
}

export function canEditDetails(status: AppStatus, role: Role): boolean {
  return editorOf(status) === role;
}

// Eligibility form definitions — mirrors the product spec sheet.
// The AC call-form wizard hardcodes the conditional flow; these flat lists are
// the single source of truth for labels/sections used by the Ops vetting view
// and the learner's read-only view (both render generically from FORM_FIELDS).
export interface FieldDef {
  key: string;
  label: string;
  type:
    | "text"
    | "date"
    | "email"
    | "tel"
    | "number"
    | "select"
    | "textarea"
    | "month"
    | "file";
  section: string;
  options?: string[];
  required?: boolean;
  /** Fields Ops derives from uploaded documents during vetting. */
  filledBy?: "ops";
  /** Numeric bounds, enforced in the input AND in the save action —
   *  a percentage can't be 104 no matter which screen typed it. */
  min?: number;
  max?: number;
  /** Multi-pick chips over `options`; the value is the picks joined ", ". */
  multi?: boolean;
  /** Cap on picks for a multi field. */
  maxPick?: number;
}

export const FORM_SECTIONS = [
  "Profile Data",
  "Academic Data",
  "Financing",
] as const;

export const COUNTRIES = [
  "Australia",
  "Germany",
  "France",
  "Finland",
  "Other Europe",
  "USA",
] as const;

export const COUNTRY_FLAGS: Record<string, string> = {
  Australia: "\u{1F1E6}\u{1F1FA}",
  Germany: "\u{1F1E9}\u{1F1EA}",
  France: "\u{1F1EB}\u{1F1F7}",
  Finland: "\u{1F1EB}\u{1F1EE}",
  "Other Europe": "\u{1F1EA}\u{1F1FA}",
  USA: "\u{1F1FA}\u{1F1F8}",
};

export const DEGREE_LEVELS = ["Masters", "Bachelors", "Profile Building"] as const;

// Undertaking / acknowledgement clauses from the spec, triggered by answers.
export interface ClauseDef {
  id: string;
  title: string;
}

export const CLAUSES: Record<string, ClauseDef> = {
  "CON-Parents-01": {
    id: "CON-Parents-01",
    title: "Parent / legal-guardian consent — learner is under 18",
  },
  "ACK-Age/Visa-01": {
    id: "ACK-Age/Visa-01",
    title: "Visa-age acknowledgement (>30 Bachelors / >45 Masters)",
  },
  "UT-uG Doc-01": {
    id: "UT-uG Doc-01",
    title: "Class 12 pursuing — completion undertaking",
  },
  "UT-uG Doc/Result-03": {
    id: "UT-uG Doc/Result-03",
    title: "Class 12 marksheet to be submitted later",
  },
  "UT-PG Doc-02": {
    id: "UT-PG Doc-02",
    title: "Bachelor's / postgraduate documents pending undertaking",
  },
  "UT-PG Doc/Result-04": {
    id: "UT-PG Doc/Result-04",
    title: "Bachelor's marksheets incomplete — submission undertaking",
  },
  "UT-Backlog-01": {
    id: "UT-Backlog-01",
    title: "Backlog / ATKT declaration",
  },
  "UT/ACK-Loan-01": {
    id: "UT/ACK-Loan-01",
    title: "Financing undertaking (loan / self-funded)",
  },
};

// Generic undertakings appended by degree tag (Section D of the spec).
export const GENERIC_CLAUSES: { title: string; appliesTo: string[] }[] = [
  { title: "YLP programme clause", appliesTo: ["Profile Building"] },
  { title: "Loan & financing terms", appliesTo: ["Masters", "Bachelors", "Profile Building"] },
  { title: "Visa, exams & others", appliesTo: ["Masters", "Bachelors"] },
];

export const FORM_FIELDS: FieldDef[] = [
  // ── Section A — Profile Data ─────────────────────────────────────────────
  { key: "full_name", label: "Name", type: "text", section: "Profile Data", required: true },
  { key: "mobile", label: "Mobile number", type: "tel", section: "Profile Data", required: true },
  { key: "gender", label: "Gender", type: "select", section: "Profile Data", options: ["Male", "Female", "Others"], required: true },
  { key: "dob", label: "Date of birth", type: "date", section: "Profile Data", required: true },
  { key: "guardian_name", label: "Parent / Legal Guardian Name", type: "text", section: "Profile Data" },
  { key: "guardian_email", label: "Parent / Legal Guardian Email", type: "email", section: "Profile Data" },
  { key: "guardian_phone", label: "Parent / Legal Guardian Phone", type: "tel", section: "Profile Data" },
  { key: "degree_level", label: "Degree to Pursue", type: "select", section: "Profile Data", options: [...DEGREE_LEVELS], required: true },
  { key: "countries", label: "Countries to Study In", type: "text", section: "Profile Data", required: true, options: [...COUNTRIES], multi: true, maxPick: 3 },
  // ── Section B — Academic Data ────────────────────────────────────────────
  { key: "marksheet_10", label: "Class 10 Marksheet", type: "file", section: "Academic Data", required: true },
  { key: "score_10", label: "Class 10 Score", type: "number", section: "Academic Data", filledBy: "ops", min: 0, max: 100 },
  { key: "completion_10", label: "Class 10 Completion Year", type: "number", section: "Academic Data", filledBy: "ops" },
  { key: "board_12", label: "Class 12 Board / Category", type: "select", section: "Academic Data", options: ["ISC", "CBSE", "10+3 Diploma", "NIOS", "State board", "International Baccalaureate", "A level"], required: true },
  { key: "status_12", label: "Class 12 Academic Status", type: "select", section: "Academic Data", options: ["Completed", "Pursuing"], required: true },
  { key: "completion_12", label: "Class 12 Completion (Month & Year)", type: "month", section: "Academic Data" },
  { key: "has_marksheet_12", label: "Class 12 Final Marksheet", type: "select", section: "Academic Data", options: ["Yes", "Not yet available"] },
  { key: "marksheet_12", label: "Class 12 Marksheet Upload", type: "file", section: "Academic Data" },
  { key: "school_name", label: "School Name", type: "text", section: "Academic Data", filledBy: "ops" },
  { key: "score_12", label: "Class 12 Score", type: "number", section: "Academic Data", filledBy: "ops", min: 0, max: 100 },
  { key: "mbbs_intent", label: "Applying for MBBS", type: "select", section: "Academic Data", options: ["Yes", "No"] },
  { key: "neet_status", label: "NEET Exam Status", type: "select", section: "Academic Data", options: ["Yes", "Applied"] },
  { key: "bachelor_status", label: "Bachelor's Degree Status", type: "select", section: "Academic Data", options: ["Completed", "Pursuing - Final Year", "Pursuing - Others"] },
  { key: "bachelor_completion", label: "Bachelor's Completion (Month & Year)", type: "month", section: "Academic Data" },
  { key: "bachelor_docs", label: "Bachelor's Marksheets (CMM / Transcript)", type: "select", section: "Academic Data", options: ["Yes - All Documents Available", "Yes - Partial Documents", "No"] },
  { key: "bachelor_files", label: "Bachelor's Documents Upload", type: "file", section: "Academic Data" },
  { key: "backlogs", label: "Backlogs / ATKTs (count)", type: "number", section: "Academic Data" },
  { key: "bachelor_score", label: "Bachelor's Score", type: "number", section: "Academic Data", filledBy: "ops", min: 0, max: 100 },
  { key: "bachelor_university", label: "Bachelor's University", type: "text", section: "Academic Data", filledBy: "ops" },
  { key: "bachelor_mode", label: "Bachelor's Degree Mode", type: "select", section: "Academic Data", options: ["Regular", "Distance Learning", "Online"], filledBy: "ops" },
  { key: "pg_status", label: "Degree After Bachelor's", type: "select", section: "Academic Data", options: ["No", "Currently Pursuing", "Completed"] },
  { key: "pg_docs", label: "Master's Marksheets (CMM / Transcript)", type: "select", section: "Academic Data", options: ["Yes - All Documents Available", "Yes - Partial Documents", "No"] },
  { key: "work_exp_months", label: "Work Experience After Bachelor's (months)", type: "number", section: "Academic Data" },
  { key: "cv_file", label: "Updated CV / Resume", type: "file", section: "Academic Data" },
  { key: "career_gap_months", label: "Career Gap (months)", type: "number", section: "Academic Data", filledBy: "ops" },
  // ── Section C — Financing ────────────────────────────────────────────────
  { key: "finance_plan", label: "On-campus Financing Plan", type: "select", section: "Financing", options: ["Education Loan (Partial/Full)", "Self-funded"], required: true },
];

/**
 * The answers an eligibility verdict actually rests on.
 *
 * `matchScore` below reads countries, degree level, score and experience; a
 * human verdict rests on more than that — how far through a degree they are,
 * whether the marksheets exist, backlogs, age against the visa rules, how it
 * is being paid for. When a learner changes one of these after Ops has ruled,
 * the ruling was made against answers that no longer exist and has to be made
 * again. Changing a phone number does not.
 *
 * Ops-filled fields (scores, university) are not here: the learner cannot
 * touch them, and Ops re-reading their own entry is not a re-check.
 */
export const ELIGIBILITY_INPUTS = [
  "dob",
  "degree_level",
  "countries",
  "board_12",
  "status_12",
  "has_marksheet_12",
  "mbbs_intent",
  "neet_status",
  "bachelor_status",
  "bachelor_docs",
  "backlogs",
  "pg_status",
  "pg_docs",
  "work_exp_months",
  "finance_plan",
] as const;

/** Does this set of changed field keys put the verdicts back in question? */
export function affectsEligibility(changedKeys: readonly string[]): boolean {
  return changedKeys.some((k) =>
    (ELIGIBILITY_INPUTS as readonly string[]).includes(k)
  );
}

export const MAX_RECOMMENDED_PROGRAMS = 5;

/**
 * The recco engine's matching score — how well a catalogue programme fits
 * what we know about the learner. Weights: country 40, degree level 25,
 * academic score 20, work experience 15. Deterministic and explainable on
 * purpose: every point lost names its reason, because the counsellor quotes
 * this to the learner and Ops second-guesses it during eligibility.
 */
export function matchScore(
  item: {
    country: string;
    degree_level: string;
    min_score: number | null;
    min_work_exp_months: number | null;
  },
  responses: Record<string, string>
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const countries = (responses.countries ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
  const degree = responses.degree_level ?? "";
  const learnerScore = Number(
    responses.bachelor_score || responses.score_12 || 0
  );
  const exp = Number(responses.work_exp_months || 0);

  let score = 0;

  if (countries.length === 0) score += 20;
  else if (countries.includes(item.country)) score += 40;
  else reasons.push(`Outside chosen countries (${item.country})`);

  if (!degree || degree === item.degree_level) score += 25;
  else reasons.push(`${item.degree_level} programme, learner wants ${degree}`);

  if (!item.min_score) score += 15;
  else if (!learnerScore) {
    score += 8;
    reasons.push(`Needs ${item.min_score}% — score not on file yet`);
  } else if (learnerScore >= item.min_score) score += 20;
  else reasons.push(`Needs ${item.min_score}%, learner has ${learnerScore}%`);

  if (!item.min_work_exp_months) score += 10;
  else if (exp >= item.min_work_exp_months) score += 15;
  else
    reasons.push(
      `Needs ${item.min_work_exp_months} months experience, learner has ${exp}`
    );

  return { score: Math.max(2, Math.min(99, score)), reasons };
}

/** Ops' verdict on a counsellor-recommended programme. */
export type ProgramEligibility = "pending" | "eligible" | "not_eligible";

export type DocType = "undertaking" | "acknowledgement";

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  undertaking: "Undertaking",
  acknowledgement: "Acknowledgement",
};

// ── The learner's document locker ────────────────────────────────────────────
// A fixed checklist, not free-form uploads: every learner carries the same
// slots, and a slot is either filled or visibly empty. That is the whole point
// of a checklist — "not uploaded" has to be as legible as "uploaded", which a
// list of whatever happens to have been attached can never show.
//
// `label` is the system's own identifier for the slot (10th_MARKSHEET_1), kept
// verbatim so it lines up with the records the Ops team already work from.

export const DOC_CATEGORIES = [
  "Educational",
  "Personal",
  "Visa Documents",
  "User Application",
  "Application Documents",
] as const;

export type DocCategory = (typeof DOC_CATEGORIES)[number];

export interface LearnerDocDef {
  /** Stable storage key. */
  key: string;
  /** What it is, in plain words. */
  type: string;
  /** The system label shown beside it. */
  label: string;
  category: DocCategory;
  /** Slots that only apply to some learners — never chased as missing. */
  optional?: boolean;
  /**
   * Asked for DURING shortlisting. The full checklist is the whole admissions
   * journey; this flow only ever shows the slots eligibility actually needs
   * (PM call: "during the shortlisting only few documents will be shown").
   * The rest stay defined so later stages can light them up.
   */
  shortlisting?: boolean;
}

export const LEARNER_DOCS: LearnerDocDef[] = [
  // ── Educational ──────────────────────────────────────────────────────────
  { key: "doc_10_marksheet", type: "10th Marksheet", label: "10th_MARKSHEET_1", category: "Educational", shortlisting: true },
  { key: "doc_10_certificate", type: "10th Certificate", label: "10th_CERTIFICATE_1", category: "Educational" },
  { key: "doc_12_marksheet", type: "12th Marksheet", label: "12th_MARKSHEET_1", category: "Educational", shortlisting: true },
  { key: "doc_12_marksheet_prov", type: "12th Marksheet (Provisional)", label: "12th_MARKSHEET_PROVISIONAL_1", category: "Educational", optional: true },
  { key: "doc_12_certificate", type: "12th Certificate", label: "12th_CERTIFICATE_1", category: "Educational" },
  { key: "doc_ug_degree", type: "UG Degree", label: "UG_DEGREE_1", category: "Educational", shortlisting: true },
  { key: "doc_ug_marksheet", type: "UG Marksheet", label: "UG_MARKSHEET_1", category: "Educational", shortlisting: true },
  { key: "doc_work_ex", type: "Work Experience Document", label: "WORK_EXPERIENCE_CERTIFICATE_1", category: "Educational", optional: true, shortlisting: true },
  { key: "doc_score_card", type: "IELTS / TOEFL / PTE / Duolingo Scorecard", label: "SCORE_CARD_1", category: "Educational", shortlisting: true },
  { key: "doc_sop_1", type: "Statement of Purpose / Letter of Motivation", label: "SOP_DOCUMENT_1", category: "Educational", shortlisting: true },
  { key: "doc_sop_2", type: "Statement of Purpose / Letter of Motivation", label: "SOP_DOCUMENT_2", category: "Educational", optional: true },
  { key: "doc_lor_1", type: "Letter of Recommendation (LOR)", label: "LOR_DOCUMENT_1", category: "Educational" },
  { key: "doc_gre", type: "GRE / GMAT / SAT / ACT", label: "GRE_GMAT_SAT_ACT_1", category: "Educational", optional: true, shortlisting: true },
  // ── Personal ─────────────────────────────────────────────────────────────
  { key: "doc_passport", type: "Passport (front & back)", label: "PASSPORT_1", category: "Personal", shortlisting: true },
  { key: "doc_aadhaar", type: "Aadhaar Card", label: "AADHAAR_CARD_1", category: "Personal", shortlisting: true },
  { key: "doc_pan", type: "PAN Card", label: "PAN_CARD_1", category: "Personal", optional: true },
  { key: "doc_photo", type: "Passport-size Photograph", label: "PHOTOGRAPH_1", category: "Personal" },
  { key: "doc_birth_certificate", type: "Birth Certificate", label: "BIRTH_CERTIFICATE_1", category: "Personal", optional: true },
  // ── Visa Documents ───────────────────────────────────────────────────────
  { key: "doc_bank_statement", type: "Bank Statement / Proof of Funds", label: "FINANCIAL_DOCUMENT_1", category: "Visa Documents" },
  { key: "doc_loan_sanction", type: "Loan Sanction Letter", label: "LOAN_SANCTION_LETTER_1", category: "Visa Documents", optional: true },
  { key: "doc_affidavit", type: "Affidavit of Support", label: "AFFIDAVIT_OF_SUPPORT_1", category: "Visa Documents", optional: true },
  { key: "doc_insurance", type: "Health / Medical Insurance", label: "HEALTH_INSURANCE_1", category: "Visa Documents", optional: true },
  { key: "doc_pcc", type: "Police Clearance Certificate", label: "PCC_1", category: "Visa Documents", optional: true },
  // ── User Application ─────────────────────────────────────────────────────
  { key: "doc_application_form", type: "Signed Application Form", label: "APPLICATION_FORM_1", category: "User Application" },
  { key: "doc_moi", type: "Medium of Instruction Certificate", label: "MOI_CERTIFICATE_1", category: "User Application", optional: true },
  { key: "doc_gap_letter", type: "Gap Justification Letter", label: "GAP_JUSTIFICATION_1", category: "User Application", optional: true },
  // ── Application Documents ────────────────────────────────────────────────
  { key: "doc_offer_letter", type: "University Offer Letter", label: "OFFER_LETTER_1", category: "Application Documents", optional: true },
  { key: "doc_fee_receipt", type: "Fee Receipt", label: "FEE_RECEIPT_1", category: "Application Documents", optional: true },
  { key: "doc_visa_copy", type: "Visa Application Copy", label: "VISA_APPLICATION_1", category: "Application Documents", optional: true },
];

export const LEARNER_DOC_BY_KEY: Record<string, LearnerDocDef> =
  Object.fromEntries(LEARNER_DOCS.map((d) => [d.key, d]));

/**
 * What the shortlisting flow actually shows: 10 slots (8 required, 2
 * conditional), not the full 29-slot admissions checklist. Every screen in
 * this prototype renders from this list.
 */
export const SHORTLISTING_DOCS: LearnerDocDef[] = LEARNER_DOCS.filter(
  (d) => d.shortlisting
);

/** Verification is Ops' call — nobody else marks a document good. */
export type DocVerification = "pending" | "verified" | "rejected";

/**
 * What the application is waiting on right now, phrased for whoever is
 * looking. Rendered as the live item at the top of the Activity Timeline, so
 * "nothing to do yet" never needs a banner of its own. Returns null when the
 * chain is closed, or when the viewer is the one being waited on — their
 * sticky action bar already says so.
 */
/**
 * Ops' move: a status they own, or a re-check that has not been handed to the
 * counsellor. The dashboard and the user hub both need this — the hub used to
 * count statuses only, so an open re-check sat top of the dashboard while the
 * hub said "0 waiting on you".
 */
export function opsNeedsAction(a: {
  status: AppStatus;
  recheck_at?: string | null;
  recheck_state?: RecheckState | null;
}): boolean {
  const recheck = Boolean(a.recheck_at) && a.recheck_state !== "ac";
  return a.status === "under_review" || recheck;
}

/** The counsellor's move: a status they own, or a re-check handed to them. */
export function acNeedsAction(a: {
  status: AppStatus;
  recheck_state?: RecheckState | null;
}): boolean {
  return (
    a.status === "draft" ||
    a.status === "reviewed" ||
    a.recheck_state === "ac"
  );
}

export function pendingFor(
  status: AppStatus,
  role: Role,
  certified = false,
  /** An open re-check, and whose move it is — null when there isn't one. */
  recheck: RecheckState | null = null,
  /**
   * Whether a programme is still shortlisted. Ops ruling the shortlisted one
   * out during a re-check takes the shortlist off while the status stays
   * `shortlisted` — and nothing is then waiting on the learner, whatever the
   * status says. The counsellor has to choose again.
   */
  hasShortlist = true
): string | null {
  // The learner is told what is happening, never who is holding it. "With the
  // Ops team" is an internal handoff and reads to them as a delay to chase.
  if (role === "learner") {
    if (recheck === "ops") return "We're checking the details you changed";
    if (recheck === "ac")
      return "Your counsellor is going through a few of your details with you";
    if (status === "shortlisted" && !certified) return null;
    if (status === "completed") return null;
    return "upGrad is preparing your options";
  }
  // A re-check outranks the status: whatever stage the application reached,
  // the thing it is actually waiting on is somebody re-reading what moved.
  if (recheck === "ops") {
    return role === "ops"
      ? null
      : "Learner changed their details — with Ops for a re-check";
  }
  if (recheck === "ac") {
    return role === "ac"
      ? null
      : "With the counsellor — Ops' comments to resolve with the learner";
  }
  switch (status) {
    case "draft":
      return role === "ac" ? null : "Counsellor is still filling the form";
    case "under_review":
      return role === "ops"
        ? null
        : "With the Ops team for vetting";
    case "reviewed":
      return role === "ac"
        ? null
        : "Waiting for the counsellor to send the shortlist";
    case "shortlisted":
      if (!hasShortlist)
        return role === "ac"
          ? null
          : "Shortlist withdrawn — waiting for the counsellor to choose another programme";
      return certified
        ? "Learner certified their details — ready for the offer letter"
        : "Waiting for the learner to sign and certify their details";
    case "completed":
      return null;
  }
}

// ── Review groups ───────────────────────────────────────────────────────────
// The form is not reviewed a field at a time — nobody ticks thirty boxes. It
// is reviewed in the groups a person actually thinks in: "Class 10" is the
// marksheet AND the score AND the year, confirmed once.
//
// One structure carries four things that were previously scattered:
//   · what the counsellor ticks off as correct (after an LSQ sync or by hand)
//   · which groups Ops actually has to verify — only a few do
//   · the documents that evidence the group, shown against it
//   · the undertakings those answers trigger, shown at the point of cause

export interface ReviewGroup {
  key: string;
  label: string;
  /** FORM_FIELDS keys this group covers. */
  fields: string[];
  /** LEARNER_DOCS keys that evidence it. */
  docs: string[];
  /** CLAUSES ids these answers can trigger. */
  clauses: string[];
  /** Ops verifies this group. Most groups are the counsellor's alone. */
  opsReview: boolean;
}

export const REVIEW_GROUPS: ReviewGroup[] = [
  {
    key: "profile",
    label: "Profile details",
    fields: [
      "full_name",
      "mobile",
      "gender",
      "dob",
      "guardian_name",
      "guardian_email",
      "guardian_phone",
      "degree_level",
      "countries",
      "mbbs_intent",
      "neet_status",
    ],
    docs: ["doc_passport", "doc_aadhaar"],
    clauses: ["CON-Parents-01", "ACK-Age/Visa-01"],
    opsReview: true,
  },
  {
    key: "class10",
    label: "Class 10",
    fields: ["marksheet_10", "score_10", "completion_10"],
    docs: ["doc_10_marksheet"],
    clauses: [],
    opsReview: true,
  },
  {
    key: "class12",
    label: "Class 12",
    fields: [
      "board_12",
      "status_12",
      "completion_12",
      "has_marksheet_12",
      "marksheet_12",
      "school_name",
      "score_12",
    ],
    docs: ["doc_12_marksheet"],
    clauses: ["UT-uG Doc-01", "UT-uG Doc/Result-03"],
    opsReview: true,
  },
  {
    key: "bachelor",
    label: "Bachelor's degree",
    fields: [
      "bachelor_status",
      "bachelor_completion",
      "bachelor_docs",
      "bachelor_files",
      "backlogs",
      "bachelor_score",
      "bachelor_university",
      "bachelor_mode",
    ],
    docs: ["doc_ug_degree", "doc_ug_marksheet"],
    clauses: ["UT-PG Doc-02", "UT-PG Doc/Result-04", "UT-Backlog-01"],
    opsReview: true,
  },
  {
    key: "after_bachelor",
    label: "After graduation",
    fields: [
      "pg_status",
      "pg_docs",
      "work_exp_months",
      "cv_file",
      "career_gap_months",
    ],
    docs: ["doc_work_ex", "doc_score_card"],
    // pg_docs / pg_status trigger this in triggeredClausesFor, so the section
    // has to say so — the "these answers trigger" line is read as complete.
    clauses: ["UT-PG Doc-02"],
    opsReview: false,
  },
  {
    key: "financing",
    label: "Financing",
    fields: ["finance_plan"],
    docs: ["doc_bank_statement"],
    clauses: ["UT/ACK-Loan-01"],
    opsReview: false,
  },
];

export const REVIEW_GROUP_BY_KEY: Record<string, ReviewGroup> =
  Object.fromEntries(REVIEW_GROUPS.map((g) => [g.key, g]));

/** The groups Ops has to rule on — the gate for "everything verified". */
export const OPS_REVIEW_GROUPS = REVIEW_GROUPS.filter((g) => g.opsReview);

export function groupOfField(fieldKey: string): ReviewGroup | undefined {
  return REVIEW_GROUPS.find((g) => g.fields.includes(fieldKey));
}

/**
 * The field to pin a group-level comment to: the first one in the group the
 * counsellor's board actually renders a comment slot on. File tiles and
 * ops-owned fields don't have one, so a remark left there is invisible — and
 * an invisible remark the counsellor cannot resolve deadlocks the re-check
 * (Class 10's first field is a file upload, which is how this was found).
 */
export function commentableFieldOf(group: ReviewGroup): string {
  const field = group.fields.find((key) => {
    const f = FORM_FIELDS.find((x) => x.key === key);
    return f && f.type !== "file" && f.filledBy !== "ops";
  });
  return field ?? group.fields[0];
}

/** How a group stands, for the chip that says so. */
export type GroupState = "checked" | "verified" | "not_verified";

/** A remark is either something to act on, or something to know. */
export type RemarkKind = "action" | "info";

/** Age from a yyyy-mm-dd date of birth; null when it isn't a real date. */
export function ageFrom(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/**
 * What is still missing before an application can go to Ops — the one list
 * behind both the disabled Submit button and the server action that refuses
 * the submit. Ops cannot recommend programmes or invent a date of birth, so
 * an application that arrives without these is one they can only send back.
 */
export function missingForSubmit(
  responses: Record<string, string>,
  programmesCount: number
): string[] {
  const v = (k: string) => (responses[k] ?? "").trim();
  const age = ageFrom(v("dob"));
  const isMinor = age !== null && age < 18;
  const degree = v("degree_level");

  const need: string[] = [];
  if (!v("full_name")) need.push("Name");
  if (!v("mobile")) need.push("Mobile number");
  if (!v("gender")) need.push("Gender");
  if (!v("dob")) need.push("Date of birth");
  if (isMinor && !v("guardian_email")) need.push("Guardian email");
  if (!degree) need.push("Degree level");
  if (!v("countries")) need.push("Country");
  if (!v("marksheet_10")) need.push("Class 10 marksheet");
  if (!v("board_12")) need.push("Class 12 board");
  if (!v("status_12")) need.push("Class 12 status");
  if (degree === "Masters" && !v("bachelor_status"))
    need.push("Bachelor's status");
  if (!v("finance_plan")) need.push("Financing plan");
  if (programmesCount === 0) need.push("Requested programmes");
  return need;
}

/**
 * Which declarations the answers trigger — the trigger column of the spec.
 *
 * Shared because it has to run twice: the counsellor's wizard computes it live
 * on the call, and the learner's own later edit has to recompute it, or a
 * change that newly requires an undertaking would never produce one.
 */
export function triggeredClausesFor(responses: Record<string, string>): string[] {
  const v = (k: string) => (responses[k] ?? "").trim();
  const age = ageFrom(v("dob"));
  const degree = v("degree_level");
  const isMasters = degree === "Masters";
  const isBachelors = degree === "Bachelors";
  const isMinor = age !== null && age < 18;

  const ids: string[] = [];
  if (isMinor) ids.push("CON-Parents-01");
  if (age !== null && ((isBachelors && age > 30) || (isMasters && age > 45)))
    ids.push("ACK-Age/Visa-01");
  if (v("status_12") === "Pursuing") ids.push("UT-uG Doc-01");
  if (v("has_marksheet_12") === "Not yet available")
    ids.push("UT-uG Doc/Result-03");
  if (isMasters) {
    if (v("bachelor_status").startsWith("Pursuing")) ids.push("UT-PG Doc-02");
    const bDocs = v("bachelor_docs");
    if (bDocs === "Yes - Partial Documents" || bDocs === "No")
      ids.push("UT-PG Doc/Result-04");
    if (Number(v("backlogs") || 0) > 0) ids.push("UT-Backlog-01");
    const pgDocs = v("pg_docs");
    const pgStatus = v("pg_status");
    if (
      pgDocs === "Yes - Partial Documents" ||
      (pgDocs === "No" && pgStatus && pgStatus !== "No")
    )
      ids.push("UT-PG Doc-02");
  }
  if (v("finance_plan")) ids.push("UT/ACK-Loan-01");
  return Array.from(new Set(ids));
}

/**
 * Which answers each clause rests on — the other half of the trigger table
 * above. `triggeredClausesFor` reads answers and produces clauses; this maps
 * a clause back to the answers that produced it, so the learner can be shown
 * WHAT they are certifying, not just a legal title.
 */
export const CLAUSE_FIELDS: Record<string, string[]> = {
  "CON-Parents-01": ["dob", "guardian_name", "guardian_email"],
  "ACK-Age/Visa-01": ["dob", "degree_level"],
  "UT-uG Doc-01": ["status_12", "completion_12"],
  "UT-uG Doc/Result-03": ["has_marksheet_12"],
  "UT-PG Doc-02": ["bachelor_status", "pg_status", "pg_docs"],
  "UT-PG Doc/Result-04": ["bachelor_docs"],
  "UT-Backlog-01": ["backlogs"],
  "UT/ACK-Loan-01": ["finance_plan"],
};

/** One answer behind an undertaking, ready to render. */
export interface UndertakingField {
  key: string;
  label: string;
  value: string;
}

/**
 * The answers a document certifies, with their current values. Generic
 * documents (process acknowledgement, the degree-tag clauses) have no
 * clause id and rest on the whole application rather than one answer —
 * they return an empty list and the UI says so in words.
 */
export function undertakingFieldsFor(
  clauseId: string | null,
  responses: Record<string, string>
): UndertakingField[] {
  const keys = clauseId ? (CLAUSE_FIELDS[clauseId] ?? []) : [];
  return keys
    .map((key) => {
      const f = FORM_FIELDS.find((x) => x.key === key);
      if (!f) return null;
      return { key, label: f.label, value: (responses[key] ?? "").trim() };
    })
    .filter((x): x is UndertakingField => x !== null)
    .filter((x) => x.value !== "");
}

/**
 * The learner-side undertaking UI, in the order the team prefers them —
 * v1 first. Switched live from the demo FAB so the variants can be walked
 * in one sitting. v6 is the inline-at-the-field reference the PM floated,
 * kept at the back of the queue on purpose.
 */
export const UNDERTAKING_VARIANT_META = [
  { id: "v1", name: "Signature cards", hint: "Answers on the card, sign with OTP" },
  { id: "v2", name: "Context at signing", hint: "Answers inside the sign panel" },
  { id: "v3", name: "Guided, one at a time", hint: "Walks document by document" },
  { id: "v4", name: "Read & tick, one OTP", hint: "Tick each, one OTP signs all" },
  { id: "v5", name: "Field-first agreements", hint: "Grouped under the answer" },
  { id: "v6", name: "Inline at the field", hint: "Checkbox + OTP at the field (PM ref)" },
] as const;

export type UndertakingVariant = (typeof UNDERTAKING_VARIANT_META)[number]["id"];

