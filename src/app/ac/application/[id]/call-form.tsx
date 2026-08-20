"use client";

import {
  useEffect,
  createContext,
  useContext,
  useMemo,
  useState,
  useTransition,
} from "react";
import {
  CLAUSES,
  COUNTRIES,
  COUNTRY_FLAGS,
  DEGREE_LEVELS,
} from "@/lib/domain";
import {
  RemarkCard,
  FileTile,
  IconCheck,
  IconDoc,
  IconFemale,
  IconGenderOther,
  IconMale,
  IconPlus,
  IconShield,
  IconSparkle,
} from "@/components/ui";

const GENDER_ICONS: Record<string, React.ReactNode> = {
  Male: <IconMale className="h-3.5 w-3.5" />,
  Female: <IconFemale className="h-3.5 w-3.5" />,
  Others: <IconGenderOther className="h-3.5 w-3.5" />,
};

type Values = Record<string, string>;

const STEPS = [
  { id: "profile", label: "Profile", hint: "Who the learner is" },
  { id: "academics", label: "Academics", hint: "Marks & scores" },
  { id: "documents", label: "Documents", hint: "What they've sent" },
  { id: "financing", label: "Financing", hint: "How they'll pay" },
  { id: "programmes", label: "Programmes", hint: "Pick from the AI's matches" },
  { id: "review", label: "Review", hint: "Confirm & submit" },
] as const;

/** Which FORM_FIELDS section each wizard step owns — used to route remarks. */
const SECTION_BY_STEP = [
  "Profile Data",
  "Academic Data",
  "Documents",
  "Financing",
  "Programmes",
  "Review",
] as const;

/** Keep only digits, spaces and a leading +, and cap at 15 digits (E.164). */
function sanitisePhone(raw: string): string {
  const plus = raw.trimStart().startsWith("+");
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  return (plus ? "+" : "") + digits;
}

function ageFrom(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/* ---------- small field primitives (call-form scale) ---------- */

/**
 * Ops remarks, keyed by the field they were left on. A remark belongs under
 * the input it's about — collecting them into a panel meant every remark had
 * to name its own field ("Bachelor's Score: ...") to make any sense.
 */
const RemarksContext = createContext<StepRemark[]>([]);

function FieldRemarks({ fieldKey }: { fieldKey: string }) {
  const all = useContext(RemarksContext);
  const mine = all.filter((r) => r.fieldKey === fieldKey);
  if (mine.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {mine.map((r) => (
        <RemarkCard
          key={r.id}
          author={r.author}
          at={r.at}
          text={r.text}
          resolved={r.resolved}
          locked={r.locked}
          action={
            r.resolved || r.locked ? null : (
              <button
                formAction={r.resolveAction}
                formNoValidate
                title="Mark resolved"
                aria-label="Mark resolved"
                className="flex h-6 w-6 items-center justify-center rounded-full border border-line-strong text-caption transition-colors hover:border-[#4c9257] hover:bg-[#e8f2e9] hover:text-[#3f6c45]"
              >
                <IconCheck className="h-3.5 w-3.5" />
              </button>
            )
          }
        />
      ))}
    </div>
  );
}

function Row({
  label,
  hint,
  required,
  children,
  wide,
  k,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  wide?: boolean;
  /** FORM_FIELDS key, so any Ops remark on it renders right here. */
  k?: string;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="mb-1.5 block text-[13px] font-medium text-ink">
        {label}
        {required && <span className="text-accent"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[12px] leading-snug text-caption">{hint}</p>}
      {k && <FieldRemarks fieldKey={k} />}
    </div>
  );
}

function Choice({
  name,
  value,
  options,
  onChange,
  iconFor,
}: {
  name: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  iconFor?: (option: string) => React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o;
        const icon = iconFor?.(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o)}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-1.5 text-[13px] transition-colors ${
              active
                ? "border-ink bg-ink text-paper"
                : "border-line-strong bg-white text-body hover:border-ink/40 hover:text-ink"
            }`}
          >
            {icon}
            {o}
          </button>
        );
      })}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

function MultiChoice({
  name,
  values,
  options,
  max,
  onChange,
  iconFor,
}: {
  name: string;
  values: string[];
  options: string[];
  max: number;
  onChange: (v: string[]) => void;
  iconFor?: (option: string) => string;
}) {
  const toggle = (o: string) => {
    if (values.includes(o)) onChange(values.filter((v) => v !== o));
    else if (values.length < max) onChange([...values, o]);
  };
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = values.includes(o);
          const full = !active && values.length >= max;
          return (
            <button
              key={o}
              type="button"
              disabled={full}
              onClick={() => toggle(o)}
              className={`rounded-xl border px-3.5 py-1.5 text-[13px] transition-colors ${
                active
                  ? "border-ink bg-ink text-paper"
                  : full
                    ? "cursor-not-allowed border-line bg-white text-caption/60"
                    : "border-line-strong bg-white text-body hover:border-ink/40 hover:text-ink"
              }`}
            >
              {iconFor?.(o) && (
                <span className="mr-1.5 text-[15px] leading-none">
                  {iconFor(o)}
                </span>
              )}
              {active && <span className="mr-1">✓</span>}
              {o}
            </button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={values.join(", ")} />
    </>
  );
}

/* ---------- the wizard ---------- */

export interface StepRemark {
  id: number;
  /** FORM_FIELDS key — the field this remark hangs under. */
  fieldKey: string;
  /** Which step owns that field, for the flag count on the tabs. */
  section: string;
  author: string;
  at: string;
  text: string;
  resolved: boolean;
  /** Shortlist sent — read-only history. */
  locked?: boolean;
  resolveAction: (formData: FormData) => void;
}

export function CallForm({
  initial,
  saveAction,
  submitAction,
  mode = "fill",
  remarks = [],
  documents,
  documentsDone = false,
  programmes,
  programmesCount = 0,
  sidebar,
  reviewBar,
}: {
  initial: Values;
  saveAction: (formData: FormData) => void;
  submitAction: (formData: FormData) => void;
  /** "review" = post-vetting: editable, remarks inline, page owns the footer. */
  mode?: "fill" | "review";
  remarks?: StepRemark[];
  /** The document checklist, rendered as its own step. */
  documents?: React.ReactNode;
  /** Every required slot filled — the page owns the checklist, so it decides. */
  documentsDone?: boolean;
  /** The programme recommendations step (engine-scored picker + picks). */
  programmes?: React.ReactNode;
  /** How many the counsellor has recommended so far — gates submission. */
  programmesCount?: number;
  /** Rendered in the right rail — inside the form so the footer stays full width. */
  sidebar?: React.ReactNode;
  /** review mode's sticky footer — the page's actions, inside the form so
   *  they can post the form's own data (Save, Save & send back). */
  reviewBar?: React.ReactNode;
}) {
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Values>(initial);
  const [pending, startTransition] = useTransition();
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));

  // Values can now arrive UNDERNEATH the wizard — "Auto-sync with LSQ" writes
  // straight to the application. Adopt fresh values for fields the counsellor
  // hasn't typed into yet, and only those: a merge limited to locally-empty
  // keys can never clobber in-progress typing.
  useEffect(() => {
    setV((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [k, val] of Object.entries(initial)) {
        if (val && !(next[k] ?? "").trim()) {
          next[k] = val;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [initial]);

  const age = ageFrom(v.dob ?? "");
  const isMinor = age !== null && age < 18;
  const countries = (v.countries ?? "").split(", ").filter(Boolean);
  const degree = v.degree_level ?? "";
  const isMasters = degree === "Masters";
  const isBachelors = degree === "Bachelors";
  // Ops chooses the programme now, so MBBS is asked outright — it is the only
  // thing that makes the NEET question relevant.
  const wantsMbbs = v.mbbs_intent === "Yes";


  // Clause engine — mirrors the trigger column of the spec.
  const clauses = useMemo(() => {
    const ids: string[] = [];
    if (isMinor) ids.push("CON-Parents-01");
    if (age !== null && ((isBachelors && age > 30) || (isMasters && age > 45)))
      ids.push("ACK-Age/Visa-01");
    if (v.status_12 === "Pursuing") ids.push("UT-uG Doc-01");
    if (v.has_marksheet_12 === "Not yet available")
      ids.push("UT-uG Doc/Result-03");
    if (isMasters) {
      if (v.bachelor_status?.startsWith("Pursuing")) ids.push("UT-PG Doc-02");
      if (
        v.bachelor_docs === "Yes - Partial Documents" ||
        v.bachelor_docs === "No"
      )
        ids.push("UT-PG Doc/Result-04");
      if (Number(v.backlogs ?? 0) > 0) ids.push("UT-Backlog-01");
      if (
        v.pg_docs === "Yes - Partial Documents" ||
        (v.pg_docs === "No" && v.pg_status && v.pg_status !== "No")
      )
        ids.push("UT-PG Doc-02");
    }
    if (v.finance_plan) ids.push("UT/ACK-Loan-01");
    return Array.from(new Set(ids));
  }, [v, age, isMinor, isMasters, isBachelors]);

  const missing = useMemo(() => {
    const need: string[] = [];
    if (!v.full_name) need.push("Learner name");
    if (!v.mobile) need.push("Mobile number");
    if (!v.gender) need.push("Gender");
    if (!v.dob) need.push("Date of birth");
    if (isMinor && !v.guardian_email) need.push("Guardian email");
    if (!degree) need.push("Degree level");
    if (!countries.length) need.push("Country");
    if (!v.marksheet_10) need.push("Class 10 marksheet");
    if (!v.board_12) need.push("Class 12 board");
    if (!v.status_12) need.push("Class 12 status");
    if (isMasters && !v.bachelor_status) need.push("Bachelor's status");
    if (!v.finance_plan) need.push("Financing plan");
    if (programmesCount === 0) need.push("Recommended programmes");
    return need;
  }, [v, isMinor, isMasters, degree, countries, programmesCount]);

  // A tick has to mean the step's required fields are filled. Ticking a step
  // just because you clicked Next claims work that hasn't happened.
  const stepDone = useMemo(() => {
    const profile =
      Boolean(v.full_name && v.mobile && v.gender && v.dob && degree) &&
      countries.length > 0 &&
      (!isMinor || Boolean(v.guardian_email));
    const academics =
      Boolean(v.marksheet_10 && v.board_12 && v.status_12) &&
      (!isMasters || Boolean(v.bachelor_status));
    const financing = Boolean(v.finance_plan);
    return [
      profile,
      academics,
      documentsDone,
      financing,
      programmesCount > 0,
      missing.length === 0,
    ];
  }, [v, degree, countries, isMinor, isMasters, missing, documentsDone, programmesCount]);

  const openCount = remarks.filter((r) => !r.resolved).length;
  const resolving = mode === "review";

  const inputCls =
    "h-10 w-full rounded-xl border border-line-strong bg-white px-3.5 text-[14px] text-ink placeholder:text-caption outline-none transition-colors focus:border-ink/40 focus:ring-4 focus:ring-ink/5";

  return (
    <RemarksContext.Provider value={remarks}>
    <form
      id="call-form"
      className="-mb-12 grid min-h-[calc(100dvh-12.2rem)] grid-rows-[1fr_auto] gap-6"
    >  {/* -mb-12 cancels main's bottom padding so the sticky bar can reach the viewport edge */}
      {/* Persist every value, including fields on steps not currently mounted */}
      {Object.entries(v).map(([k, val]) =>
        [
          "full_name",
          "mobile",
          "gender",
          "dob",
          "guardian_name",
          "guardian_email",
          "guardian_phone",
          "degree_level",
          "countries",
          "marksheet_10",
          "board_12",
          "status_12",
          "completion_12",
          "has_marksheet_12",
          "marksheet_12",
          "neet_status",
          "bachelor_status",
          "bachelor_completion",
          "bachelor_docs",
          "bachelor_files",
          "backlogs",
          "pg_status",
          "pg_docs",
          "work_exp_months",
          "cv_file",
          "finance_plan",
        ].includes(k) ? (
          <input key={`h-${k}`} type="hidden" name={k} value={val} />
        ) : null
      )}
      <input type="hidden" name="triggered_clauses" value={clauses.join("|")} />

      {/* Steps left, Activity in the right rail. */}
      <div
        className={`row-start-1 grid min-w-0 gap-6 ${
          sidebar ? "lg:grid-cols-3" : ""
        }`}
      >
      <div className={`min-w-0 space-y-5 self-start ${sidebar ? "lg:col-span-2" : ""}`}>
        {/* Stepper — paginated while filling on the call; after review the
            whole form is shown at once, so there is nothing to step through. */}
        {!resolving && (
        <div className="card p-1.5">
          <div className="flex gap-1">
            {STEPS.map((s, i) => {
              const active = i === step;
              const done = !resolving && stepDone[i];
              // Point the counsellor straight at the steps Ops flagged.
              const flags = remarks.filter(
                (r) => r.section === SECTION_BY_STEP[i] && !r.resolved
              ).length;
              return (
                <button
                  key={s.id}
                  formAction={saveAction}
                  formNoValidate
                  onClick={() => setStep(i)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-ink text-paper"
                      : done
                        ? "text-ink hover:bg-muted"
                        : "text-caption hover:bg-muted"
                  }`}
                >
                  {!resolving && (
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
                        active
                          ? "bg-white/20"
                          : done
                            ? "bg-accent/10 text-accent"
                            : "bg-cream"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                  )}
                  {s.label}
                  {flags > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                        active
                          ? "bg-white/20"
                          : "bg-[#f6efdd] text-[#8a6d2f]"
                      }`}
                    >
                      {flags}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        )}

        {/* ── Step 1: Profile ── */}
        {(resolving || step === 0) && (
          <>
          <div className="card fade-up p-6">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              Profile
            </h2>
            <p className="mb-5 mt-1 text-sm text-body">
              Confirm the details you have from the lead form while on the call.
            </p>

            <div className="grid gap-5 sm:grid-cols-2">
              <Row label="Full name" required k="full_name" hint="Exactly as on the passport or official ID.">
                <input
                  className={inputCls}
                  value={v.full_name ?? ""}
                  onChange={(e) => set("full_name", e.target.value)}
                  placeholder="John Doe"
                />
              </Row>
              <Row label="Mobile number" required k="mobile" hint="Used for application updates.">
                <input
                  className={inputCls}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={v.mobile ?? ""}
                  onChange={(e) => set("mobile", sanitisePhone(e.target.value))}
                  placeholder="+91 99999 99999"
                />
              </Row>
              <Row label="Gender" required k="gender">
                <Choice
                  name="_gender"
                  value={v.gender ?? ""}
                  options={["Male", "Female", "Others"]}
                  onChange={(val) => set("gender", val)}
                  iconFor={(g) => GENDER_ICONS[g]}
                />
              </Row>
              <Row
                label="Date of birth" k="dob"
                required
                hint={
                  age !== null
                    ? `Age ${age}${isMinor ? " — guardian consent required" : ""}`
                    : "As on the Class 10 marksheet."
                }
              >
                <input
                  type="date"
                  className={inputCls}
                  value={v.dob ?? ""}
                  onChange={(e) => set("dob", e.target.value)}
                />
              </Row>
            </div>

            {isMinor && (
              <div className="fade-up mt-5 rounded-2xl border border-[#ecdfc0] bg-[#f6efdd]/60 p-4">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-[#6b5525]">
                  <IconShield className="h-4 w-4" />
                  Learner is under 18 — guardian details required
                </div>
                <p className="mt-1 text-[12px] text-[#6b5525]/80">
                  All undertakings will be sent to the guardian&apos;s email for
                  signature.
                </p>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  <Row label="Guardian full name" required k="guardian_name">
                    <input
                      className={inputCls}
                      value={v.guardian_name ?? ""}
                      onChange={(e) => set("guardian_name", e.target.value)}
                      placeholder="Jack Doe"
                    />
                  </Row>
                  <Row label="Guardian email" required k="guardian_email">
                    <input
                      type="email"
                      className={inputCls}
                      value={v.guardian_email ?? ""}
                      onChange={(e) => set("guardian_email", e.target.value)}
                      placeholder="guardian@example.com"
                    />
                  </Row>
                  <Row label="Guardian phone" required k="guardian_phone">
                    <input
                      className={inputCls}
                      type="tel"
                      inputMode="numeric"
                      value={v.guardian_phone ?? ""}
                      onChange={(e) =>
                        set("guardian_phone", sanitisePhone(e.target.value))
                      }
                      placeholder="+91 99999 99999"
                    />
                  </Row>
                </div>
              </div>
            )}

            <div className="mt-6 space-y-5 border-t border-line pt-5">
              <Row label="Degree level" required k="degree_level" hint="Determines which academic details we collect.">
                <Choice
                  name="_degree"
                  value={degree}
                  options={[...DEGREE_LEVELS]}
                  onChange={(val) => set("degree_level", val)}
                />
              </Row>
              <Row
                label="Countries to study in" k="countries"
                required
                hint="Pick up to 3. Ops recommends the programmes from these."
              >
                <MultiChoice
                  name="_countries"
                  values={countries}
                  options={[...COUNTRIES]}
                  max={3}
                  iconFor={(c) => COUNTRY_FLAGS[c] ?? ""}
                  onChange={(vals) => set("countries", vals.join(", "))}
                />
              </Row>
            </div>
          </div>
          </>
        )}

        {/* ── Step 2: Academics ── */}
        {(resolving || step === 1) && (
          <>
          <div className="card fade-up p-6">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              Academics
            </h2>
            <p className="mb-5 mt-1 text-sm text-body">
              Ops will read scores off the documents — you only capture status
              and uploads.
            </p>

            <div className="space-y-6">
              <section>
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                  Class 10
                </h3>
                <FileTile
                  name="_marksheet_10"
                  label="Class 10 marksheet (front & back)"
                  value={v.marksheet_10 ?? ""}
                  onChange={(val) => set("marksheet_10", val)}
                />
              </section>

              <section className="border-t border-line pt-5">
                <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                  Class 12
                </h3>
                <div className="space-y-5">
                  <Row label="Board / category" required k="board_12">
                    <Choice
                      name="_board_12"
                      value={v.board_12 ?? ""}
                      options={[
                        "CBSE",
                        "ISC",
                        "State board",
                        "NIOS",
                        "10+3 Diploma",
                        "International Baccalaureate",
                        "A level",
                      ]}
                      onChange={(val) => set("board_12", val)}
                    />
                  </Row>
                  <Row label="Academic status" required k="status_12">
                    <Choice
                      name="_status_12"
                      value={v.status_12 ?? ""}
                      options={["Completed", "Pursuing"]}
                      onChange={(val) => set("status_12", val)}
                    />
                  </Row>
                  {v.status_12 === "Pursuing" && (
                    <Row
                      label="Expected completion" k="completion_12"
                      hint="A completion undertaking will be added."
                    >
                      <input
                        type="month"
                        className={inputCls}
                        value={v.completion_12 ?? ""}
                        onChange={(e) => set("completion_12", e.target.value)}
                      />
                    </Row>
                  )}
                  {v.status_12 === "Completed" && (
                    <>
                      <Row label="Is the final marksheet available?" k="has_marksheet_12">
                        <Choice
                          name="_has_marksheet_12"
                          value={v.has_marksheet_12 ?? ""}
                          options={["Yes", "Not yet available"]}
                          onChange={(val) => set("has_marksheet_12", val)}
                        />
                      </Row>
                      {v.has_marksheet_12 === "Yes" && (
                        <FileTile
                          name="_marksheet_12"
                          label="Class 12 marksheet (front & back)"
                          value={v.marksheet_12 ?? ""}
                          onChange={(val) => set("marksheet_12", val)}
                        />
                      )}
                    </>
                  )}
                  <Row
                    label="Applying for MBBS?"
                    k="mbbs_intent"
                    hint="NEET only applies to medical applicants."
                  >
                    <Choice
                      name="_mbbs_intent"
                      value={v.mbbs_intent ?? ""}
                      options={["Yes", "No"]}
                      onChange={(val) => set("mbbs_intent", val)}
                    />
                  </Row>
                  {wantsMbbs && (
                    <Row
                      label="NEET exam status" k="neet_status"
                      hint="NEET is mandatory for MBBS — this year or within the past 2 years."
                    >
                      <Choice
                        name="_neet"
                        value={v.neet_status ?? ""}
                        options={["Yes", "Applied"]}
                        onChange={(val) => set("neet_status", val)}
                      />
                    </Row>
                  )}
                </div>
              </section>

              {isMasters && (
                <>
                  <section className="border-t border-line pt-5">
                    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                      Bachelor&apos;s degree
                    </h3>
                    <div className="space-y-5">
                      <Row label="Status" required k="bachelor_status">
                        <Choice
                          name="_bachelor_status"
                          value={v.bachelor_status ?? ""}
                          options={[
                            "Completed",
                            "Pursuing - Final Year",
                            "Pursuing - Others",
                          ]}
                          onChange={(val) => set("bachelor_status", val)}
                        />
                      </Row>
                      {v.bachelor_status?.startsWith("Pursuing") && (
                        <Row label="Expected completion" k="bachelor_completion">
                          <input
                            type="month"
                            className={inputCls}
                            value={v.bachelor_completion ?? ""}
                            onChange={(e) =>
                              set("bachelor_completion", e.target.value)
                            }
                          />
                        </Row>
                      )}
                      {v.bachelor_status === "Completed" && (
                        <>
                          <Row
                            label="Semester marksheets (CMM) / consolidated transcript" k="bachelor_docs"
                            hint="Upload CMM, individual semester marksheets and the grading scale."
                          >
                            <Choice
                              name="_bachelor_docs"
                              value={v.bachelor_docs ?? ""}
                              options={[
                                "Yes - All Documents Available",
                                "Yes - Partial Documents",
                                "No",
                              ]}
                              onChange={(val) => set("bachelor_docs", val)}
                            />
                          </Row>
                          {v.bachelor_docs?.startsWith("Yes") && (
                            <FileTile
                              name="_bachelor_files"
                              label="CMM / transcript & grading scale"
                              value={v.bachelor_files ?? ""}
                              onChange={(val) => set("bachelor_files", val)}
                            />
                          )}
                        </>
                      )}
                      <Row
                        label="Backlogs / ATKTs as on date" k="backlogs"
                        hint="Include failed subjects, re-appears and absences. Enter 0 if none."
                      >
                        <input
                          type="number"
                          min={0}
                          className={`${inputCls} sm:w-40`}
                          value={v.backlogs ?? ""}
                          onChange={(e) => set("backlogs", e.target.value)}
                          placeholder="0"
                        />
                      </Row>
                    </div>
                  </section>

                  <section className="border-t border-line pt-5">
                    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                      After bachelor&apos;s
                    </h3>
                    <div className="space-y-5">
                      <Row
                        label="Any degree after bachelor's?" k="pg_status"
                        hint="Master's, PG diploma or PhD. Some universities restrict equivalent or higher qualifications."
                      >
                        <Choice
                          name="_pg_status"
                          value={v.pg_status ?? ""}
                          options={["No", "Currently Pursuing", "Completed"]}
                          onChange={(val) => set("pg_status", val)}
                        />
                      </Row>
                      {v.pg_status && v.pg_status !== "No" && (
                        <Row label="Master's marksheets / transcript" k="pg_docs">
                          <Choice
                            name="_pg_docs"
                            value={v.pg_docs ?? ""}
                            options={[
                              "Yes - All Documents Available",
                              "Yes - Partial Documents",
                              "No",
                            ]}
                            onChange={(val) => set("pg_docs", val)}
                          />
                        </Row>
                      )}
                      <Row
                        label="Work experience after bachelor's (months)" k="work_exp_months"
                        hint="Enter 0 if none."
                      >
                        <input
                          type="number"
                          min={0}
                          className={`${inputCls} sm:w-40`}
                          value={v.work_exp_months ?? ""}
                          onChange={(e) => set("work_exp_months", e.target.value)}
                          placeholder="0"
                        />
                      </Row>
                      {Number(v.work_exp_months ?? 0) > 0 && (
                        <FileTile
                          name="_cv"
                          label="Updated CV / resume"
                          value={v.cv_file ?? ""}
                          onChange={(val) => set("cv_file", val)}
                        />
                      )}
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
          </>
        )}

        {/* ── Step 3: Documents ──
            The counsellor is on the call with the learner, so this is where
            the documents actually get collected. The same checklist Ops vets
            against and the learner tops up later — one table, three roles. */}
        {(resolving || step === 2) && documents && (
          <div className="card fade-up p-6">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              Documents
            </h2>
            <p className="mb-4 mt-1 text-sm text-body">
              Collect what the learner has to hand. Anything still missing can
              be uploaded by them later — this doesn&apos;t block submitting.
            </p>
            {documents}
          </div>
        )}

        {/* ── Step 4: Financing ── */}
        {(resolving || step === 3) && (
          <>
          <div className="card fade-up p-6">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              Financing
            </h2>
            <p className="mb-5 mt-1 text-sm text-body">
              How the learner plans to fund tuition and living costs on campus.
            </p>
            <Row
              label="Financing plan" k="finance_plan"
              required
              hint="The final lending decision rests with the lender and depends on the profile."
            >
              <Choice
                name="_finance"
                value={v.finance_plan ?? ""}
                options={["Education Loan (Partial/Full)", "Self-funded"]}
                onChange={(val) => set("finance_plan", val)}
              />
            </Row>
            {v.finance_plan === "Education Loan (Partial/Full)" && (
              <p className="mt-4 rounded-xl border border-[#d6e0ee] bg-[#e9eef6] px-3.5 py-2.5 text-[12.5px] text-[#3d5a80]">
                An eligible co-applicant will be required. Ops will collect the
                co-applicant documents during vetting.
              </p>
            )}
          </div>
          </>
        )}

        {/* ── Step 5: Programmes — the AI vet recommends, the counsellor picks ── */}
        {(resolving || step === 4) && programmes && (
          <div className="card fade-up p-6">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              Recommended programmes
            </h2>
            <p className="mb-4 mt-1 text-sm text-body">
              The AI reads everything captured on this call and puts its best
              matches below — add the ones worth sending. Ops rules on the
              eligibility of each, and only the eligible ones can be
              shortlisted.
            </p>
            {programmes}
          </div>
        )}

        {/* ── Step 6: Review ── */}
        {(resolving || step === 5) && (
          <>
          <div className="card fade-up p-6">
            <h2 className="font-display text-[15px] font-semibold tracking-tight">
              Review & submit
            </h2>
            <p className="mb-5 mt-1 text-sm text-body">
              Read this back to the learner before submitting for Ops vetting.
            </p>

            {missing.length > 0 ? (
              <div className="rounded-xl border border-[#ecdfc0] bg-[#f6efdd]/60 p-4 text-[13px] text-[#6b5525]">
                <b>Still needed:</b> {missing.join(", ")}.
              </div>
            ) : (
              <div className="rounded-xl border border-[#d5e6d8] bg-[#e8f2e9]/60 p-4 text-[13px] text-[#2f5e38]">
                All required details captured — ready to submit.
              </div>
            )}

            <dl className="mt-5 divide-y divide-line rounded-xl border border-line">
              {[
                ["Name", v.full_name],
                ["Mobile", v.mobile],
                ["Gender", v.gender],
                ["Date of birth", v.dob && `${v.dob}${age !== null ? ` (age ${age})` : ""}`],
                isMinor ? ["Guardian", [v.guardian_name, v.guardian_email].filter(Boolean).join(" · ")] : null,
                ["Degree", degree],
                ["Countries", countries.join(", ")],
                ["Class 10 marksheet", v.marksheet_10],
                ["Class 12", [v.board_12, v.status_12].filter(Boolean).join(" · ")],
                isMasters ? ["Bachelor's", v.bachelor_status] : null,
                isMasters ? ["Backlogs", v.backlogs] : null,
                isMasters ? ["Work experience", v.work_exp_months && `${v.work_exp_months} months`] : null,
                ["Financing", v.finance_plan],
              ]
                .filter(Boolean)
                .map((entry) => {
                  const [k, val] = entry as [string, string];
                  return (
                    <div key={k} className="flex gap-4 px-4 py-2.5 text-[13px]">
                      <dt className="w-44 shrink-0 text-caption">{k}</dt>
                      <dd className="min-w-0 flex-1 text-ink">
                        {val || <span className="text-caption">—</span>}
                      </dd>
                    </div>
                  );
                })}
            </dl>
          </div>
          </>
        )}

      </div>

      {sidebar && <div className="space-y-6">{sidebar}</div>}
      </div>

      {/* Action bar — spans the whole page, not just the field column.
          Suppressed after review: the page owns a persistent bar there so it
          stays put across the Programmes and Undertaking tabs too. */}
      {resolving && reviewBar && (
        <div className="sticky bottom-0 z-20 py-3.5">
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 border-t border-line bg-white/90 backdrop-blur-md" />
          <div className="relative flex flex-wrap items-center gap-3">
            {reviewBar}
          </div>
        </div>
      )}

      {!resolving && (
      <div className="sticky bottom-0 z-20 py-3.5">
        {/* Backing spans the whole content column, not just the grid cell */}
        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 border-t border-line bg-white/90 backdrop-blur-md" />
        {/* Status on the left, one primary action on the right. */}
        <div className="relative flex flex-wrap items-center gap-3">

          <div className="flex items-center gap-2.5">
            <div className="hidden items-center gap-1 sm:flex">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i === step
                      ? "w-5 bg-ink"
                      : i < step
                        ? "w-1.5 bg-ink/40"
                        : "w-1.5 bg-line-strong"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-caption">
              Step {step + 1} of {STEPS.length}
            </span>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {step < STEPS.length - 1 ? (
              // Saves what's on screen and moves on — no separate Save CTA.
              <button
                className="btn-primary"
                formAction={saveAction}
                formNoValidate
                onClick={() => setStep((s) => s + 1)}
              >
                Next
              </button>
            ) : (
              <button className="btn-primary" formAction={submitAction}>
                Submit for Vetting
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </form>
    </RemarksContext.Provider>
  );
}
