"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  ageFrom,
  CLAUSES,
  FORM_FIELDS,
  triggeredClausesFor,
  COUNTRIES,
  COUNTRY_FLAGS,
  DEGREE_LEVELS,
  missingForSubmit,
} from "@/lib/domain";
import {
  RemarkCard,
  ChangedPin,
  FieldVerdictMark,
  FileTile,
  IconCheck,
  IconDoc,
  IconFemale,
  IconGenderOther,
  IconMale,
  IconPlus,
  IconShield,
  IconSparkle,
  IconThumbUp,
  IconUserFill,
  IconCapFill,
  IconWalletFill,
  IconLayersFill,
  IconNoteFill,
  SectionCard,
} from "@/components/ui";

const GENDER_ICONS: Record<string, React.ReactNode> = {
  Male: <IconMale className="h-3.5 w-3.5" />,
  Female: <IconFemale className="h-3.5 w-3.5" />,
  Others: <IconGenderOther className="h-3.5 w-3.5" />,
};

type Values = Record<string, string>;

// The stepper survives the stacked layout as NAVIGATION, not pagination:
// every section is open below, the strip shows how far each is and jumps to
// it. Review is gone — that job moved into the submit confirmation dialog.
const STEPS = [
  { id: "profile", label: "Profile", hint: "Who the learner is" },
  { id: "academics", label: "Academics", hint: "Marks & scores" },
  { id: "financing", label: "Financing", hint: "How they'll pay" },
  { id: "programmes", label: "Programmes", hint: "Pick from the AI's matches" },
] as const;

/** Which FORM_FIELDS section each step owns — used to route remark flags. */
const SECTION_BY_STEP = [
  "Profile Data",
  "Academic Data",
  "Financing",
  "Programmes",
] as const;

/** Keep only digits, spaces and a leading +, and cap at 15 digits (E.164). */
function sanitisePhone(raw: string): string {
  const plus = raw.trimStart().startsWith("+");
  const digits = raw.replace(/\D/g, "").slice(0, 15);
  return (plus ? "+" : "") + digits;
}

/* ---------- small field primitives (call-form scale) ---------- */

/**
 * Ops remarks, keyed by the field they were left on. A remark belongs under
 * the input it's about — collecting them into a panel meant every remark had
 * to name its own field ("Bachelor's Score: ...") to make any sense.
 */
const RemarksContext = createContext<StepRemark[]>([]);

/**
 * The field keys the learner changed after vetting. The re-check notice tells
 * the counsellor the changed fields are marked — so on the edit board they
 * have to actually be marked, not just in the read-only view.
 */
const ChangedContext = createContext<ReadonlySet<string>>(new Set());

/**
 * Which field slots are actually on screen right now.
 *
 * Half this form is conditional — guardian details only for a minor, the whole
 * bachelor block only for a Masters applicant, Class 12 completion only while
 * it is being pursued. Ops can comment on any of those fields from their own
 * screen, where every field renders unconditionally. When the field they
 * chose is one the counsellor's board does not mount, the comment used to
 * simply not appear: the counsellor could not resolve it, so they could not
 * hand the re-check back, and Ops could no longer touch it either. A stalled
 * application with nothing on screen to explain why.
 *
 * So every slot registers itself, and anything left over is rendered in a
 * catch-all block instead of being silently dropped.
 */
const RenderedFieldsContext = createContext<(key: string) => () => void>(
  () => () => {}
);

/**
 * Ops' per-field verdicts, so the counsellor sees which individual answer was
 * called wrong while they are standing on the field fixing it — not only in
 * the read-only cards further down the stack.
 */
const FieldChecksContext = createContext<
  Record<string, { state: "correct" | "incorrect"; by_name?: string | null; at?: string }>
>({});

function FieldRemarks({ fieldKey }: { fieldKey: string }) {
  const all = useContext(RemarksContext);
  const register = useContext(RenderedFieldsContext);
  // Layout effect, not a passive one: `stranded` is computed from this
  // registry, and a passive effect leaves the first commit thinking nothing
  // is mounted — which paints every open remark in the catch-all AND under
  // its own field for one frame. This tree never renders on the server, so
  // there is no hydration cost to paying it before paint.
  useLayoutEffect(() => register(fieldKey), [fieldKey, register]);
  const mine = all.filter((r) => r.fieldKey === fieldKey);
  if (mine.length === 0) return null;
  return <RemarkList items={mine} />;
}

/** The cards themselves — shared by the per-field slot and the catch-all. */
function RemarkList({ items }: { items: StepRemark[] }) {
  return (
    <div className="mt-2 space-y-2">
      {items.map((r) => (
        <RemarkCard
          key={r.id}
          remarkId={r.id}
          author={r.author}
          at={r.at}
          text={r.text}
          resolved={r.resolved}
          locked={r.locked}
          // The counsellor answers a comment; they do not close it. Closing is
          // Ops' call, so the only control here is the thumb — the label lives
          // on hover rather than in a sentence under the note.
          action={
            r.locked || !r.acknowledgeAction ? null : (
              <button
                formAction={r.acknowledgeAction}
                formNoValidate
                title={
                  r.acknowledgedAt ? "Acknowledged" : "Acknowledge"
                }
                aria-label={
                  r.acknowledgedAt ? "Acknowledged" : "Acknowledge"
                }
                className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
                  r.acknowledgedAt
                    ? "border-[#4c9257] bg-[#e8f2e9] text-[#3f6c45]"
                    : "border-line-strong text-caption hover:border-[#4c9257] hover:bg-[#e8f2e9] hover:text-[#3f6c45]"
                }`}
              >
                <IconThumbUp className="h-3.5 w-3.5" />
              </button>
            )
          }
          thread={r.thread}
          acknowledged={Boolean(r.acknowledgedAt)}
          replyAction={r.replyAction}
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
  const changed = useContext(ChangedContext);
  const checks = useContext(FieldChecksContext);
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="mb-1.5 flex items-center gap-2 text-[13px] font-medium text-ink">
        <span>
          {label}
          {required && <span className="text-accent"> *</span>}
        </span>
        {k && changed.has(k) && <ChangedPin />}
        {k && (
          <FieldVerdictMark
            state={checks[k]?.state}
            byName={checks[k]?.by_name}
            at={checks[k]?.at}
          />
        )}
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
  /** Human label, for the catch-all when the field itself isn't on screen. */
  fieldLabel?: string;
  /** The FORM_FIELDS section that owns the field. */
  section: string;
  author: string;
  at: string;
  text: string;
  resolved: boolean;
  /** 'info' is context to read, not work to do — never counted as open work. */
  kind?: "action" | "info";
  acknowledgedAt?: string | null;
  /** The conversation under this remark, oldest first. */
  thread?: { id: number; author: string; at: string; text: string }[];
  acknowledgeAction?: (formData: FormData) => void;
  replyAction?: (formData: FormData) => void;
  /** Shortlist sent — read-only history. */
  locked?: boolean;
}

/** Every field the counsellor owns — the ops-filled ones are theirs to type. */
const AC_FIELD_KEYS = new Set(
  FORM_FIELDS.filter((f) => f.filledBy !== "ops").map((f) => f.key)
);

export function CallForm({
  initial,
  saveAction,
  submitAction,
  mode = "fill",
  remarks = [],
  programmes,
  programmesCount = 0,
  sidebar,
  reviewBar,
  changedFields = [],
  fieldChecks,
  groupBlock,
}: {
  initial: Values;
  saveAction: (formData: FormData) => void;
  submitAction: (formData: FormData) => void;
  /** "review" = post-vetting: editable, remarks inline, page owns the footer. */
  mode?: "fill" | "review";
  remarks?: StepRemark[];
  /** The programme recommendations section (engine-scored picker + picks). */
  programmes?: React.ReactNode;
  /** How many the counsellor has recommended so far — gates submission. */
  programmesCount?: number;
  /** Rendered in the right rail — inside the form so the footer stays full width. */
  sidebar?: React.ReactNode;
  /** review mode's sticky footer — the page's actions, inside the form so
   *  they can post the form's own data (Save, Save & send back). */
  reviewBar?: React.ReactNode;
  /** FORM_FIELDS keys the learner changed after vetting — marked on the row. */
  changedFields?: readonly string[];
  /** Ops' verdict per field, shown beside the label they ruled on. */
  fieldChecks?: Record<
    string,
    { state: "correct" | "incorrect"; by_name?: string | null; at?: string }
  >;
  /**
   * Wraps a section in its review group — the counsellor's "mark correct"
   * tick, the group's documents and the undertakings it triggers. Supplied by
   * the page, which owns the data; the wizard just says which group a block
   * of fields belongs to.
   */
  groupBlock?: (
    groupKey: string,
    label: string,
    children: React.ReactNode
  ) => React.ReactNode;
}) {
  // The submit confirmation — the old Review step, as a dialog on top of
  // the stacked form instead of a fifth screen of its own.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const changedSet = useMemo(() => new Set(changedFields), [changedFields]);
  const checksValue = useMemo(() => fieldChecks ?? {}, [fieldChecks]);
  const [v, setV] = useState<Values>(initial);
  const [pending, startTransition] = useTransition();
  // Every key the counsellor has touched, including ones they deliberately
  // cleared — "empty" and "not filled in yet" are different things and the
  // merge below has to be able to tell them apart.
  // Which field slots are mounted right now (refcounted — a key can appear on
  // more than one step). `mountVersion` exists only to re-run the leftovers
  // calculation when that set changes.
  const mountedKeys = useRef(new Map<string, number>());
  const [mountVersion, setMountVersion] = useState(0);
  const registerField = useCallback((key: string) => {
    const m = mountedKeys.current;
    m.set(key, (m.get(key) ?? 0) + 1);
    setMountVersion((x) => x + 1);
    return () => {
      const left = (m.get(key) ?? 1) - 1;
      if (left <= 0) m.delete(key);
      else m.set(key, left);
      setMountVersion((x) => x + 1);
    };
  }, []);

  const touched = useRef(new Set<string>());
  const set = (k: string, val: string) => {
    touched.current.add(k);
    setV((p) => ({ ...p, [k]: val }));
  };

  // Values can now arrive UNDERNEATH the wizard — "Auto-sync with LSQ" writes
  // straight to the application. Adopt fresh values for fields the counsellor
  // hasn't typed into yet, and only those: a merge limited to untouched keys
  // can neither clobber in-progress typing nor undo a deliberate clear.
  useEffect(() => {
    setV((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [k, val] of Object.entries(initial)) {
        if (val && !(next[k] ?? "").trim() && !touched.current.has(k)) {
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


  // Clause engine — shared with the server so a learner's own edit triggers
  // the same declarations this call does. See triggeredClausesFor.
  const clauses = useMemo(() => triggeredClausesFor(v), [v]);

  // Anything still open that no mounted slot claimed. Recomputed whenever the
  // mounted set changes, so answers that mount or unmount conditional blocks
  // move remarks in and out of the catch-all as their fields appear.
  const stranded = useMemo(
    () =>
      remarks.filter(
        (r) =>
          !r.resolved &&
          !r.locked &&
          !mountedKeys.current.has(r.fieldKey)
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remarks, mountVersion]
  );

  // Same rule the server enforces on submit — see missingForSubmit.
  const missing = useMemo(
    () => missingForSubmit(v, programmesCount),
    [v, programmesCount]
  );

  // A tick has to mean the step's required fields are filled — the strip is
  // a live progress read, not a record of where you clicked.
  const stepDone = useMemo(() => {
    const profile =
      Boolean(v.full_name && v.mobile && v.gender && v.dob && degree) &&
      countries.length > 0 &&
      (!isMinor || Boolean(v.guardian_email));
    const academics =
      Boolean(v.marksheet_10 && v.board_12 && v.status_12) &&
      (!isMasters || Boolean(v.bachelor_status));
    const financing = Boolean(v.finance_plan);
    return [profile, academics, financing, programmesCount > 0];
  }, [v, degree, countries, isMinor, isMasters, programmesCount]);

  // Where the counsellor is in the walk. Driven by the controls ONLY — the
  // strip used to follow the scroll position, which meant reading ahead (or
  // a stray trackpad nudge) silently moved them to a section they had not
  // finished, and the footer's next step moved with it. Scrolling reads;
  // clicking a step or Next is what advances.
  const [activeStep, setActiveStep] = useState(0);

  /** Move the walk to a section and bring it under the sticky strip. */
  const goToStep = (i: number) => {
    setActiveStep(i);
    document
      .getElementById(`step-${STEPS[i].id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Group wrapper: the page's block when it supplies one, else a heading. */
  const group = (key: string, label: string, children: React.ReactNode) =>
    groupBlock ? (
      groupBlock(key, label, children)
    ) : (
      <section className="border-t border-line pt-5">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
          {label}
        </h3>
        {children}
      </section>
    );

  const resolving = mode === "review";

  const inputCls =
    "h-10 w-full rounded-xl border border-line-strong bg-white px-3.5 text-[14px] text-ink placeholder:text-caption outline-none transition-colors focus:border-ink/40 focus:ring-4 focus:ring-ink/5";

  return (
    <ChangedContext.Provider value={changedSet}>
    <RemarksContext.Provider value={remarks}>
    <FieldChecksContext.Provider value={checksValue}>
    <RenderedFieldsContext.Provider value={registerField}>
    <form
      id="call-form"
      className="-mb-12 grid min-h-[calc(100dvh-12.2rem)] grid-rows-[1fr_auto] gap-6"
      // Enter in a text field fires the form's FIRST submit button, which here
      // is a section's "Mark correct" tick — so a stray Enter confirmed a
      // section nobody had read. Enter does nothing; the bar's buttons do.
      onKeyDown={(e) => {
        const el = e.target as HTMLElement;
        if (e.key === "Enter" && el.tagName === "INPUT") e.preventDefault();
      }}
    >  {/* -mb-12 cancels main's bottom padding so the sticky bar can reach the viewport edge */}
      {/* Persist every value, including fields on steps not currently mounted.
          Derived from FORM_FIELDS rather than a hand-kept list — the list
          silently lost "Applying for MBBS", so that answer was never saved. */}
      {Object.entries(v).map(([k, val]) =>
        AC_FIELD_KEYS.has(k) ? (
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
        {/* Stepper — a nav strip over the open stack, not pagination: the
            tick is live progress, the flag is open Ops comments, the click
            is a smooth jump. Sticky, because a jump strip that scrolls away
            with the top of the page can never be jumped from. */}
        {!resolving && (
        <div className="sticky top-3 z-30">
        <div className="card p-1.5 shadow-[0_10px_30px_-18px_rgba(49,48,43,0.35)]">
          <div className="flex gap-1">
            {STEPS.map((st, i) => {
              const active = i === activeStep;
              const done = stepDone[i];
              const flags = remarks.filter(
                (r) =>
                  r.section === SECTION_BY_STEP[i] &&
                  !r.resolved &&
                  r.kind !== "info"
              ).length;
              return (
                <button
                  key={st.id}
                  type="button"
                  title={st.hint}
                  onClick={() => goToStep(i)}
                  className={`flex min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? "bg-ink text-paper"
                      : done
                        ? "text-ink hover:bg-muted"
                        : "text-caption hover:bg-muted"
                  }`}
                >
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
                  <span className="truncate">{st.label}</span>
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
        </div>
        )}

        {/* Comments Ops left on a field this board does not currently show —
            a guardian detail for an adult, a bachelor field for a Bachelors
            applicant. They render here so they can always be answered; without
            this the re-check could never be handed back. */}
        {stranded.length > 0 && (
          <SectionCard
            className="fade-up border-[#ecdfc0]"
            icon={<IconNoteFill />}
            title="Other comments from Ops"
            subtitle="About details this form isn't asking for right now. Answer or resolve them here."
          >
            {stranded.map((r) => (
              <div key={r.id} className="mt-3 first:mt-0">
                <div className="text-[12px] font-semibold uppercase tracking-[0.06em] text-caption">
                  {r.fieldLabel ?? r.fieldKey}
                </div>
                <RemarkList items={[r]} />
              </div>
            ))}
          </SectionCard>
        )}

        {/* ── Profile ── */}
          <SectionCard
            id="step-profile"
            className="fade-up !scroll-mt-20"
            icon={<IconUserFill />}
            title="Profile"
            subtitle="Confirm the details you have from the lead form while on the call."
          >
            {group("profile", "Profile details", (
              <>

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
              </>
            ))}
          </SectionCard>

        {/* ── Academics ── */}
          <SectionCard
            id="step-academics"
            className="fade-up !scroll-mt-20"
            icon={<IconCapFill />}
            title="Academics"
            subtitle="Ops will read scores off the documents — you only capture status and uploads."
          >
            <div className="space-y-6">
              {group("class10", "Class 10", (
                <>
                <FileTile
                  name="_marksheet_10"
                  label="Class 10 marksheet (front & back)"
                  value={v.marksheet_10 ?? ""}
                  onChange={(val) => set("marksheet_10", val)}
                />
                {/* File tiles carry remarks too. Every Class 10 field is
                    either an upload or ops-filled, so without this an Ops
                    comment on that section had nowhere to land. */}
                <FieldRemarks fieldKey="marksheet_10" />
                </>
              ))}

              {group("class12", "Class 12", (
                <>
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
                        <>
                        <FileTile
                          name="_marksheet_12"
                          label="Class 12 marksheet (front & back)"
                          value={v.marksheet_12 ?? ""}
                          onChange={(val) => set("marksheet_12", val)}
                        />
                        <FieldRemarks fieldKey="marksheet_12" />
                        </>
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
                </>
              ))}

              {isMasters && (
                <>
                  {group("bachelor", "Bachelor's degree", (
                    <>
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
                            <>
                            <FileTile
                              name="_bachelor_files"
                              label="CMM / transcript & grading scale"
                              value={v.bachelor_files ?? ""}
                              onChange={(val) => set("bachelor_files", val)}
                            />
                            <FieldRemarks fieldKey="bachelor_files" />
                            </>
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
                    </>
                  ))}

                  {group("after_bachelor", "After bachelor's", (
                    <>
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
                        <>
                        <FileTile
                          name="_cv"
                          label="Updated CV / resume"
                          value={v.cv_file ?? ""}
                          onChange={(val) => set("cv_file", val)}
                        />
                        <FieldRemarks fieldKey="cv_file" />
                        </>
                      )}
                    </div>
                    </>
                  ))}
                </>
              )}
            </div>
          </SectionCard>

        {/* ── Financing ── */}
          <SectionCard
            id="step-financing"
            className="fade-up !scroll-mt-20"
            icon={<IconWalletFill />}
            title="Financing"
            subtitle="How the learner plans to fund tuition and living costs on campus."
          >
            {group("financing", "Financing", (
              <>
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
              </>
            ))}
          </SectionCard>

        {/* ── Programmes — the AI vet recommends, the counsellor picks ── */}
        {programmes && (
          <SectionCard
            id="step-programmes"
            className="fade-up !scroll-mt-20"
            icon={<IconLayersFill />}
            title="Requested programmes"
            subtitle="The AI reads everything captured on this call and puts its best matches below — add the ones worth sending. Ops rules on the eligibility of each, and only the eligible ones can be shortlisted."
          >
            {programmes}
          </SectionCard>
        )}

      </div>

      {sidebar && <div className="space-y-6">{sidebar}</div>}
      </div>

      {/* Action bar — spans the whole page, not just the field column.
          Suppressed after review: the page owns its own persistent bar. */}
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
        {/* Status on the left, one primary action on the right. There is no
            walk any more — the whole form is on screen — so the bar carries
            what the old Review step carried: how far from submittable, and
            where in the walk the counsellor has got to. */}
        <div className="relative flex flex-wrap items-center gap-3">
          <span className="text-xs text-caption">
            <span className="mr-2 font-medium text-body">
              Step {activeStep + 1} of {STEPS.length}
            </span>
            {missing.length > 0
              ? `${missing.length} required detail${
                  missing.length === 1 ? "" : "s"
                } still missing`
              : "All required details captured — ready to submit"}
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              className="btn-secondary"
              formAction={saveAction}
              formNoValidate
            >
              Save draft
            </button>
            {/* The walk's one forward control. Every section is on screen —
                this is what MOVES the walk, so reading ahead never advances
                it and the counsellor reaches Submit by finishing, not by
                scrolling past. Saves on the way, like the old step buttons. */}
            {activeStep < STEPS.length - 1 ? (
              <button
                className="btn-primary"
                formAction={saveAction}
                formNoValidate
                onClick={() => goToStep(activeStep + 1)}
              >
                Next
              </button>
            ) : (
              /* Saves what is on screen AND opens the confirmation, so
                 nothing typed is lost if the dialog is cancelled. */
              <button
                className="btn-primary"
                formAction={saveAction}
                formNoValidate
                onClick={() => setConfirmOpen(true)}
              >
                Submit for Vetting
              </button>
            )}
          </div>
        </div>
      </div>
      )}

      {/* ── The old Review step, as a confirmation dialog ──
          Everything the counsellor used to walk to a fifth screen for:
          what is still missing, the read-back summary, and the one commit
          button. Inside the <form> (no portal) so Confirm can post the
          form's own data through formAction. */}
      {confirmOpen && !resolving && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
          onClick={() => setConfirmOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[85dvh] w-full max-w-[600px] flex-col rounded-2xl border border-line bg-white shadow-[0_28px_60px_-18px_rgba(49,48,43,0.45)]"
          >
            <div className="border-b border-line px-5 py-4">
              <h3 className="font-display text-[16px] font-semibold tracking-tight text-ink">
                Ready to submit for vetting?
              </h3>
              <p className="mt-0.5 text-[13px] text-body">
                Read this back to the learner — it goes to the Ops team
                exactly as it stands.
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {missing.length > 0 ? (
                <div className="rounded-xl border border-[#ecdfc0] bg-[#f6efdd]/60 p-4 text-[13px] text-[#6b5525]">
                  <b>Still needed:</b> {missing.join(", ")}.
                </div>
              ) : (
                <div className="rounded-xl border border-[#d5e6d8] bg-[#e8f2e9]/60 p-4 text-[13px] text-[#2f5e38]">
                  All required details captured.
                </div>
              )}

              <dl className="mt-4 divide-y divide-line rounded-xl border border-line">
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
                  ["Programmes requested", programmesCount > 0 ? String(programmesCount) : ""],
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

            <div className="flex gap-2 border-t border-line px-5 py-4">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="btn-secondary flex-1"
              >
                Keep editing
              </button>
              <button
                className="btn-primary flex-1"
                formAction={submitAction}
                disabled={missing.length > 0}
                title={
                  missing.length > 0
                    ? `Still needed: ${missing.join(", ")}`
                    : ""
                }
              >
                Confirm &amp; Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
    </RenderedFieldsContext.Provider>
    </FieldChecksContext.Provider>
    </RemarksContext.Provider>
    </ChangedContext.Provider>
  );
}
