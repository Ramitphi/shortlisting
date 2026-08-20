"use client";

import { useDbVersion } from "@/components/db-provider";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell, requireRole } from "@/components/shell";
import { activityInline } from "@/lib/auth";
import {
  BackLink,
  EmptyState,
  FileValue,
  StatusBadge,
  Timeline,
  Meta,
  FieldComments,
  ChangedPin,
  DocumentDialog,
  DocumentTable,
  SideSheet,
  UndertakingCard,
  CardChip,
  CertifiedChip,
  DotStatus,
  RecheckNotice,
  IconBuilding,
  IconCalendar,
  IconCap,
  IconCheck,
  IconClock,
  IconDoc,
  IconRefresh,
  IconSignature,
  IconSparkle,
  IconWallet,
} from "@/components/ui";
import {
  getApplication,
  getEvents,
  getFormResponses,
  getPrograms,
  getRemarks,
  getDocuments,
  getLearnerDocs,
  getOfferLetter,
  listProgramCatalogue,
  recheckOf,
} from "@/lib/queries";
import {
  addProgram,
  openApplication,
  removeProgram,
  saveForm,
  submitForm,
  removeLearnerDoc,
  resolveRemark,
  returnRecheckToOps,
  shortlistProgram,
  syncFromLsq,
  updateFieldValue,
  uploadLearnerDoc,
  verifyLearnerDoc,
} from "@/lib/actions";
import {
  DOC_CATEGORIES,
  FORM_FIELDS,
  FORM_SECTIONS,
  DOC_TYPE_LABELS,
  MAX_RECOMMENDED_PROGRAMS,
  canEditDetails,
  matchScore,
  pendingFor,
} from "@/lib/domain";
import { docRows, signeesFor } from "@/lib/documents";
import { docInsight } from "@/lib/doc-insights";
import { OpenApplication } from "@/components/open-application";
import {
  CataloguePicker,
  type PickerItem,
} from "@/app/ops/application/[id]/catalogue-picker";
import { OpsField } from "@/app/ops/application/[id]/ops-field";
import { AiAdd, PickRemove } from "./ai-add";
import { CallForm, type StepRemark } from "./call-form";
import { AcFlowBar } from "./shortlist-button";


// One word each. Anything longer wraps to two lines and makes the whole tab
// bar twice as tall — the headings inside each tab carry the full wording.
// There is deliberately NO Comments tab: Ops' remarks live as pins beside the
// fields they are about, and the counsellor fixes the field right there
// (PM: "remarks will be in place with the field which needs to be edited").
const TABS = [
  { key: "profile", label: "Profile" },
  { key: "documents", label: "Documents" },
  { key: "programs", label: "Programs" },
  { key: "undertaking", label: "Undertaking" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function AcApplicationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; sel?: string };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("ac");
  const app = getApplication(Number(params.id));
  if (!app || app.ac_id !== user.id) notFound();

  const responses = getFormResponses(app.id);
  const remarks = getRemarks(app.id);
  const programs = getPrograms(app.id);
  const docs = getDocuments(app.id);
  const offer = getOfferLetter(app.id);
  const events = getEvents(app.id);
  const locker = docRows(getLearnerDocs(app.id));

  // The counsellor fills the form on the call and submits it. That hands the
  // pen to Ops for good — from here they read, pick programmes and send the
  // shortlist. Ops corrects what Ops finds; nothing comes back for another
  // round of edits. See `editorOf` in domain.ts.
  const editable = canEditDetails(app.status, "ac");
  // Ops re-ruled the learner's programme not eligible after they changed a
  // detail, so the shortlist came off and there is a choice to make again.
  const shortlistWithdrawn =
    app.status === "shortlisted" && !programs.some((p) => p.shortlisted);
  const canShortlist = app.status === "reviewed" || shortlistWithdrawn;
  const openRemarks = remarks.filter((r) => r.status === "open");
  const certified = Boolean(app.certified_at);

  const resolvedRemarks = remarks.filter((r) => r.status === "resolved");

  // The learner changed something after it was vetted. Ops re-reads it
  // first; if they have comments it comes here, because the counsellor is
  // the one who talks to the learner. Either way it is never something they
  // should discover mid-call.
  const recheck = recheckOf(app);
  /** Ops' comments on THIS change — not every remark ever left open. */
  const recheckComments = recheck
    ? remarks.filter((r) => r.status === "open" && r.created_at >= recheck.at)
    : [];
  /** The labels the learner moved — marked wherever the fields are read. */
  const changedLabels = new Set(recheck?.fields ?? []);

  // A hand-back re-opens the edit board: somebody has to be able to ACT on
  // the change — fix fields, swap programme recommendations — and that
  // somebody is the counsellor, who talks to the learner.
  const recheckEditing = recheck?.state === "ac";
  const wizardRemarks: StepRemark[] = recheckEditing
    ? remarks.map((r) => ({
        id: r.id,
        fieldKey: r.field_key,
        section:
          FORM_FIELDS.find((f) => f.key === r.field_key)?.section ??
          "Profile Data",
        author: r.author_name ?? "Ops",
        at: r.created_at,
        text: r.text,
        resolved: r.status === "resolved",
        resolveAction: resolveRemark.bind(null, r.id),
      }))
    : [];

  /**
   * Ops' comments on a field. The counsellor is the one who acts on them, so
   * they get the tick — but only while the application is theirs; once the
   * shortlist is out the comments are history.
   *
   * The exception is a re-check handed back to them: those comments are the
   * live conversation with the learner, and ticking them off is what sends
   * the application back to Ops.
   */
  const canResolve = app.status === "reviewed" || recheck?.state === "ac";
  const commentsFor = (fieldKey: string) =>
    remarks
      .filter((r) => r.field_key === fieldKey)
      .map((r) => ({
        id: r.id,
        author: r.author_name ?? "Ops",
        at: r.created_at,
        text: r.text,
        resolved: r.status === "resolved",
        actions:
          canResolve && r.status === "open" ? (
            <form action={resolveRemark.bind(null, r.id)}>
              <button
                className="flex h-6 w-6 items-center justify-center rounded-md text-caption transition-colors hover:bg-[#e8f2e9] hover:text-[#3f6c45]"
                title="Mark resolved"
                aria-label="Mark resolved"
              >
                <IconCheck className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : null,
      }));

  // Nothing is recommended until Ops finishes, so while it's with them the
  // counsellor sees the details and the documents and nothing else. Ops'
  // comments only appear once they have finished — mid-vetting notes are a
  // work in progress, not something to act on.
  const withOps = app.status === "under_review";
  const visibleTabs = withOps
    ? TABS.filter((t) => t.key === "profile" || t.key === "documents")
    : TABS;
  const requested = searchParams.tab as TabKey | undefined;

  const tab: TabKey = visibleTabs.some((t) => t.key === requested)
    ? (requested as TabKey)
    : "profile";

  // The pick travels in the URL so it survives the tab navigations.
  const selected = Number(searchParams.sel) || null;
  // Ops ruled; the shortlist radio only offers what survived.
  const eligiblePrograms = programs.filter((p) => p.eligibility === "eligible");

  // The engine's view of the catalogue for THIS learner: every entry scored,
  // sorted best-first. The counsellor recommends from here on the call; the
  // same scores follow the recommendations onto Ops' screen.
  const catalogue = listProgramCatalogue();
  const scoredPicks = programs.map((p) => {
    const cat = catalogue.find((c) => c.id === p.catalogue_id);
    return { ...p, match: cat ? matchScore(cat, responses) : null };
  });
  const programItems: (PickerItem & { score: number })[] = catalogue
    .map((c) => {
      const { score, reasons } = matchScore(c, responses);
      return {
        id: c.id,
        title: c.name,
        subtitle: c.institute,
        facts: [
          `${score}% match`,
          c.country,
          c.degree_level,
          c.duration,
          c.fee,
        ].filter(Boolean) as string[],
        note: c.notes,
        warning: reasons.length > 0 ? reasons.join(" · ") : null,
        keywords: `${c.country} ${c.degree_level}`,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const signedCount = docs.filter((d) => d.signed_at).length;
  const lockerUploaded = locker.filter((r) => r.filename).length;
  const lockerVerified = locker.filter((r) => r.verification === "verified").length;
  const lockerMissing = locker.filter((r) => !r.filename && !r.optional).length;
  const tabCount: Record<TabKey, string | undefined> = {
    // Open comments surface on the Profile tab, where the pins are.
    profile: openRemarks.length > 0 ? String(openRemarks.length) : undefined,
    documents: `${lockerUploaded}/${locker.length}`,
    programs: programs.length > 0 ? String(programs.length) : undefined,
    undertaking: docs.length > 0 ? `${signedCount}/${docs.length}` : undefined,
  };

  // Two presentations, switched from the role-switcher FAB. Inline is the
  // built design (right rail); the drawer is the alternative being compared —
  // no column at all, opened from a button beside the learner's name.
  const pending = pendingFor(app.status, "ac", certified, recheck?.state ?? null);
  const inline = activityInline();
  const timeline = inline ? (
    <div className="card fade-up p-5" style={{ animationDelay: "120ms" }}>
      <h2 className="mb-3 font-display text-[15px] font-semibold tracking-tight">
        Activity Timeline
      </h2>
      <Timeline events={events} pending={pending} />
    </div>
  ) : null;

  const activityButton = inline ? null : (
    <SideSheet
      title="Activity"
      subtitle={app.learner_name}
      trigger={
        <>
          <IconClock className="h-4 w-4" />
          Check activity
        </>
      }
    >
      <Timeline events={events} pending={pending} />
    </SideSheet>
  );

  return (
    <Shell user={user} title="AC Dashboard · Shortlisting" activeAppId={app.id}>
      <OpenApplication action={openApplication.bind(null, app.id)} />
      <div className="pb-8 pt-6">
        <BackLink href="/ac" label="Back to my learners" />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-ink">
                {app.learner_name}
              </h1>
              <StatusBadge status={app.status} />
              <CertifiedChip at={app.certified_at} />
            </div>
            <p className="mt-1 text-[14.5px] text-body">{app.learner_email}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Draft only: pull whatever the LSQ lead already knows, so the
                call starts from a part-filled form. Fills EMPTY fields only. */}
            {app.status === "draft" && (
              <form action={syncFromLsq.bind(null, app.id)}>
                <button className="btn-secondary !h-8 !px-3 !text-[12.5px]">
                  <IconRefresh className="h-3.5 w-3.5" />
                  Auto-sync with LSQ
                </button>
              </form>
            )}
            {activityButton}
          </div>
        </div>
      </div>

      {recheck && (
        <RecheckNotice
          fields={recheck.fields}
          at={recheck.at}
          state={recheck.state}
          viewer="ac"
          learnerName={app.learner_name}
          openRemarks={recheckComments.length}
          staleVerdicts={programs.filter((p) => p.eligibility_stale).length}
        />
      )}

      {editable || recheckEditing ? (
        // The wizard owns the whole page so its footer runs edge to edge; the
        // timeline rides along inside it rather than in a column beside it.
        // A re-check handed back re-opens it as the EDIT BOARD (mode review):
        // every field editable with Ops' comments inline, programmes
        // re-recommendable against the changed answers.
        <CallForm
          initial={responses}
          mode={recheckEditing ? "review" : "fill"}
          remarks={recheckEditing ? wizardRemarks : []}
          reviewBar={
            recheckEditing ? (
              <>
                <span className="text-xs text-caption">
                  {recheckComments.length > 0
                    ? `${recheckComments.length} comment${recheckComments.length === 1 ? "" : "s"} from Ops to resolve — under the fields they're about`
                    : "All comments resolved — save and send it back to Ops"}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    formAction={saveForm.bind(null, app.id)}
                    formNoValidate
                    className="btn-secondary"
                  >
                    Save changes
                  </button>
                  <button
                    formAction={returnRecheckToOps.bind(null, app.id)}
                    formNoValidate
                    disabled={recheckComments.length > 0}
                    title={
                      recheckComments.length > 0
                        ? "Tick off Ops' comments first — they sit under the fields they are about"
                        : ""
                    }
                    className="btn-success"
                  >
                    <IconCheck className="h-4 w-4" />
                    Save &amp; send back to Ops
                  </button>
                </div>
              </>
            ) : undefined
          }
          saveAction={saveForm.bind(null, app.id)}
          submitAction={submitForm.bind(null, app.id)}
          documents={
            <DocumentTable
              rows={locker}
              categories={DOC_CATEGORIES}
              insightFor={(key) => docInsight(key, responses, app.learner_name ?? "")}
              canUpload
              canVerify={false}
              upload={uploadLearnerDoc.bind(null, app.id)}
              remove={removeLearnerDoc.bind(null, app.id)}
              verify={verifyLearnerDoc.bind(null, app.id)}
            />
          }
          documentsDone={lockerMissing === 0}
          programmes={
            <>
              {programs.length > 0 && (
                <div className="mb-4 space-y-2">
                  {scoredPicks.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-2.5"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cream text-body">
                        <IconCap className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium text-ink">
                          {p.name}
                        </div>
                        <div className="truncate text-[12px] text-caption">
                          {p.institute}
                        </div>
                      </div>
                      {p.match && (
                        <CardChip
                          tone={
                            p.match.score >= 70
                              ? "green"
                              : p.match.score >= 45
                                ? "amber"
                                : "muted"
                          }
                          tooltip={
                            p.match.reasons.length > 0
                              ? p.match.reasons.join(" · ")
                              : "Meets every catalogue requirement on file"
                          }
                        >
                          {p.match.score}% match
                        </CardChip>
                      )}
                      <PickRemove action={removeProgram.bind(null, p.id)} />
                    </div>
                  ))}
                </div>
              )}
              {/* Google-style AI overview: the AI's few best matches sit right
                  here on the step, each one addable in a click — the full
                  catalogue stays behind the (perfectly normal) modal below. */}
              {(() => {
                const addedIds = programs
                  .map((p) => p.catalogue_id)
                  .filter((id): id is number => id !== null);
                const aiPicks = programItems
                  .filter((i) => !addedIds.includes(i.id))
                  .slice(0, 3);
                const full = programs.length >= MAX_RECOMMENDED_PROGRAMS;
                return aiPicks.length > 0 && !full ? (
                  <div className="mb-4 rounded-xl border border-line bg-paper p-4">
                    <div className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
                      <IconSparkle className="h-4 w-4 text-accent" />
                      AI recommendations
                    </div>
                    <p className="mb-3 mt-0.5 text-[12px] text-caption">
                      Read from the details captured so far — scores update as
                      the form saves.
                    </p>
                    <div className="space-y-2">
                      {aiPicks.map((i) => (
                        <div
                          key={i.id}
                          className="flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[13px] font-medium text-ink">
                              {i.title}
                            </div>
                            <div className="truncate text-[12px] text-caption">
                              {i.subtitle}
                              {i.warning ? ` · ${i.warning}` : ""}
                            </div>
                          </div>
                          <CardChip
                            tone={
                              i.score >= 70
                                ? "green"
                                : i.score >= 45
                                  ? "amber"
                                  : "muted"
                            }
                            tooltip={
                              i.warning ??
                              "Meets every catalogue requirement on file"
                            }
                          >
                            {i.score}% match
                          </CardChip>
                          <AiAdd
                            action={addProgram.bind(null, app.id)}
                            catalogueId={i.id}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
              <CataloguePicker
                label={`Browse the full catalogue (${programs.length}/${MAX_RECOMMENDED_PROGRAMS})`}
                title="Programme catalogue — scored for this learner"
                hint="Sorted by the AI's matching score against the details captured so far."
                items={programItems}
                addedIds={programs
                  .map((p) => p.catalogue_id)
                  .filter((id): id is number => id !== null)}
                disabled={programs.length >= MAX_RECOMMENDED_PROGRAMS}
                disabledHint={`Maximum ${MAX_RECOMMENDED_PROGRAMS} programmes`}
                action={addProgram.bind(null, app.id)}
                idField="catalogueId"
                addedLabel="Programme"
              />
            </>
          }
          programmesCount={programs.length}
          sidebar={timeline}
        />
      ) : (
        <>
        <div className={canShortlist ? "-mb-12 flex min-h-[calc(100dvh-13.5rem)] flex-col" : ""}>
        {/* Content left, Activity in the right rail — unless the timeline is
            switched off, in which case the content takes the whole width and
            the log lives behind the header button. */}
        <div className={`grid flex-1 gap-6 ${timeline ? "lg:grid-cols-3" : ""}`}>
          <div className={`space-y-5 ${timeline ? "lg:col-span-2" : ""}`}>
            {/* Tabs — a single tab isn't a tab bar, so hide it while Ops has it */}
            {visibleTabs.length > 1 && (
            <div className="card p-1.5">
              <div className="flex gap-1">
                {visibleTabs.map((t) => {
                  const active = t.key === tab;
                  const count = tabCount[t.key];
                  return (
                    <Link
                      key={t.key}
                      href={`/ac/application/${app.id}?tab=${t.key}${
                        searchParams.sel ? `&sel=${searchParams.sel}` : ""
                      }`}
                      scroll={false}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-ink text-paper"
                          : "text-body hover:bg-muted"
                      }`}
                    >
                      {t.label}
                      {count && (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                            active
                              ? "bg-white/20"
                              : t.key === "profile" && openRemarks.length > 0
                                ? "bg-[#f6efdd] text-[#8a6d2f]"
                                : "bg-cream text-caption"
                          }`}
                        >
                          {count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
            )}

          {/* ── Profile ──
              With Ops: read-only, the counsellor had their turn. Once Ops has
              reviewed: editable again, because the comment pins land here and
              "how will AC resolve these remarks" if the field is locked? The
              remark sits beside the field, the fix happens in the field, the
              tick on the pin closes it — no separate Comments screen. */}
          {tab === "profile" && (
              <div className="card fade-up p-6">
                <h2 className="font-display text-[15px] font-semibold tracking-tight">
                  Eligibility Form
                </h2>
                <p className="mb-5 mt-1 text-sm text-body">
                  {recheck?.state === "ac"
                    ? "The learner changed the fields marked below and Ops has commented on them. These are not yours to edit — call the learner, and anything they change goes straight back to Ops. Tick a comment off once you've settled it."
                    : recheck
                      ? "The learner changed the fields marked below; Ops is re-reading them."
                      : canShortlist
                        ? openRemarks.length > 0
                          ? "Vetted by Ops. Flagged fields carry a marker — read the comment, fix the field right there, then tick it off."
                          : "Vetted by Ops. Your answers are editable if anything needs a correction before you shortlist."
                        : "Submitted on the call and now with the Ops team."}
                </p>
                {FORM_SECTIONS.map((section) => (
                  <div key={section} className="mb-6">
                    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                      {section}
                    </h3>
                    <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
                      {FORM_FIELDS.filter((f) => f.section === section).map(
                        (f) => (
                          <div key={f.key}>
                            {/* The marker sits beside the label, so a flagged
                                field is findable by scanning rather than by
                                reading a comment under every field. */}
                            <div className="flex items-center gap-2">
                              <span className="label !mb-0">
                                {f.label}
                                {f.filledBy === "ops" && (
                                  <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                                    ops
                                  </span>
                                )}
                              </span>
                              {changedLabels.has(f.label) && (
                                <ChangedPin at={recheck?.at} />
                              )}
                              <FieldComments comments={commentsFor(f.key)} />
                            </div>
                            {f.type === "file" ? (
                              <div className="mt-1 text-sm">
                                <FileValue label={f.label} value={responses[f.key]} />
                              </div>
                            ) : canShortlist && f.filledBy !== "ops" ? (
                              <OpsField
                                field={f}
                                value={responses[f.key] ?? ""}
                                action={updateFieldValue.bind(null, app.id, f.key)}
                              />
                            ) : (
                              <div className="mt-1 text-sm">
                                {responses[f.key] || (
                                  <span className="text-caption">—</span>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          {/* ── Documents: the learner's locker ── */}
          {tab === "documents" && (
            <div className="card fade-up p-6">
              <h2 className="font-display text-[15px] font-semibold tracking-tight">
                Documents
              </h2>
              <p className="mb-4 mt-1 text-sm text-body">
                {editable
                  ? "Collect what you can on the call. Anything missing can still be uploaded by the learner or by Ops."
                  : "Everything on file for this learner. Ops verifies these during vetting."}
              </p>
              <DocumentTable
                rows={locker}
                categories={DOC_CATEGORIES}
                insightFor={(key) => docInsight(key, responses, app.learner_name ?? "")}
                canUpload={editable}
                canVerify={false}
                upload={uploadLearnerDoc.bind(null, app.id)}
                remove={removeLearnerDoc.bind(null, app.id)}
                verify={verifyLearnerDoc.bind(null, app.id)}
                note={
                  editable
                    ? undefined
                    : "Read-only — Ops holds the application from here."
                }
              />
            </div>
          )}

          {/* ── Recommended Programs: pick and send the shortlist ── */}
            {tab === "programs" && (
              <div className="card fade-up p-6">
                <h2 className="font-display text-[15px] font-semibold tracking-tight">
                  Recommended Programs
                </h2>
                <p className="mb-4 mt-1 text-sm text-body">
                  {shortlistWithdrawn
                    ? "The learner's own change made them ineligible for the programme they were sent, so it has come off. Pick another from what Ops still rules eligible — the learner is told the programme has changed."
                    : canShortlist
                      ? "Your recommendations, ruled on by Ops. Pick the one ELIGIBLE programme the learner is going ahead with."
                      : "Your recommendations and Ops' eligibility verdicts."}
                </p>

                {programs.length === 0 ? (
                  <EmptyState text="No programmes were recommended on the call." />
                ) : canShortlist ? (
                  <form id="shortlist-form" action={shortlistProgram.bind(null, app.id)}>
                    <div className="space-y-3">
                      {/* Ops said no — visible but not selectable. */}
                      {eligiblePrograms.length === 0 && (
                        <EmptyState text="Ops marked none of your recommendations eligible — speak to the Ops team." />
                      )}
                      {eligiblePrograms.map((p) => (
                        <label
                          key={p.id}
                          className="group relative block cursor-pointer rounded-2xl border border-line bg-white p-4 transition-all hover:border-line-strong hover:shadow-[0_8px_20px_-14px_rgba(49,48,43,0.3)] has-[:checked]:border-ink has-[:checked]:bg-cream/40"
                        >
                          {/* Radio, not checkbox: exactly one programme goes
                              to the learner. */}
                          <input
                            type="radio"
                            name="programId"
                            value={p.id}
                            defaultChecked={selected === p.id}
                            className="peer sr-only"
                          />
                          {/* Header */}
                          <span className="flex items-start gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream text-body">
                              <IconCap />
                            </span>
                            <span className="min-w-0 flex-1 pr-7">
                              <span className="block text-[14.5px] font-semibold leading-snug text-ink">
                                {p.name}
                              </span>
                              <DotStatus color="bg-caption/50">
                                {p.institute}
                              </DotStatus>
                            </span>
                            <span className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border border-line-strong text-transparent transition-colors group-has-[:checked]:border-ink group-has-[:checked]:bg-ink group-has-[:checked]:text-paper">
                              <IconCheck className="h-3 w-3" />
                            </span>
                          </span>

                          {/* Meta */}
                          <span className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                            {p.duration && (
                              <Meta
                                icon={<IconClock className="h-3.5 w-3.5" />}
                                value={p.duration}
                                label="Duration"
                              />
                            )}
                            {p.fee && (
                              <Meta
                                icon={<IconWallet className="h-3.5 w-3.5" />}
                                value={p.fee}
                                label="Total fee"
                              />
                            )}
                          </span>

                          {/* Footer */}
                          <span className="mt-3.5 flex items-center justify-between gap-3 border-t border-line pt-3">
                            <span className="flex min-w-0 items-center gap-1.5 text-[12px] text-caption">
                              {p.notes ? (
                                <>
                                  <IconSparkle className="h-3.5 w-3.5 shrink-0 text-accent" />
                                  <span className="truncate">{p.notes}</span>
                                </>
                              ) : (
                                <>
                                  <IconBuilding className="h-3.5 w-3.5 shrink-0" />
                                  <span className="truncate">
                                    From the programme catalogue
                                  </span>
                                </>
                              )}
                            </span>
                            <CardChip tone="green">
                              <IconCheck className="h-3 w-3" />
                              Eligible
                            </CardChip>
                          </span>
                        </label>
                      ))}

                      {/* Ops' rejections stay visible so the shortlist choice
                          reads as "one of what survived", not a mystery. */}
                      {programs
                        .filter((p) => p.eligibility !== "eligible")
                        .map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 rounded-2xl border border-line bg-paper p-4 opacity-70"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream text-caption">
                              <IconCap />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-[14.5px] font-semibold leading-snug text-body">
                                {p.name}
                              </div>
                              <DotStatus color="bg-caption/50">
                                {p.institute}
                              </DotStatus>
                            </div>
                            <CardChip tone={p.eligibility === "not_eligible" ? "red" : "muted"}>
                              {p.eligibility === "not_eligible"
                                ? "Not eligible — Ops"
                                : "Eligibility pending"}
                            </CardChip>
                          </div>
                        ))}
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    {programs.map((p) => (
                      <div
                        key={p.id}
                        className={`rounded-2xl border p-4 ${
                          p.shortlisted
                            ? "border-[#d5e6d8] bg-[#e8f2e9]/30"
                            : "border-line bg-white"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              p.shortlisted
                                ? "bg-[#e8f2e9] text-[#3f6c45]"
                                : "bg-cream text-body"
                            }`}
                          >
                            <IconCap />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[14.5px] font-semibold leading-snug text-ink">
                              {p.name}
                            </div>
                            <DotStatus
                              color={
                                p.shortlisted ? "bg-[#4c9257]" : "bg-caption/50"
                              }
                            >
                              {p.institute}
                            </DotStatus>
                          </div>
                        </div>

                        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2">
                          {p.duration && (
                            <Meta
                              icon={<IconClock className="h-3.5 w-3.5" />}
                              value={p.duration}
                              label="Duration"
                            />
                          )}
                          {p.fee && (
                            <Meta
                              icon={<IconWallet className="h-3.5 w-3.5" />}
                              value={p.fee}
                              label="Total fee"
                            />
                          )}
                        </div>

                        <div className="mt-3.5 flex items-center justify-end gap-3 border-t border-line pt-3">
                          {p.shortlisted ? (
                            <CardChip tone="green">
                              <IconCheck className="h-3 w-3" />
                              Shortlisted
                            </CardChip>
                          ) : (
                            <CardChip>Not sent</CardChip>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Undertaking: documents + offer letter ── */}
            {tab === "undertaking" && (
              <div className="card fade-up p-6">
                <h2 className="font-display text-[15px] font-semibold tracking-tight">
                  Undertaking & Acknowledgement
                </h2>
                <p className="mb-4 mt-1 text-sm text-body">
                  Auto-generated by Ops from the declarations triggered on the
                  call. The learner signs these once shortlisted.
                </p>

                {docs.length === 0 ? (
                  <EmptyState text="Documents are generated when Ops starts vetting." />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                      {docs.map((d) => (
                        <UndertakingCard
                          key={d.id}
                          title={d.title}
                          learnerName={responses.full_name || app.learner_name || "—"}
                          counsellorName={app.ac_name ?? "—"}
                          email={app.learner_email ?? "—"}
                          signedAt={d.signed_at}
                              action={
                            <DocumentDialog
                              docType={DOC_TYPE_LABELS[d.type]}
                              title={d.title}
                              content={d.content}
                              signees={signeesFor(app, responses, d)}
                              triggerLabel="View document"
                              triggerClassName="btn-secondary w-full !h-9"
                            />
                          }
                        />
                      ))}
                </div>
                )}

                {offer && (
                  <div className="mt-4 rounded-xl border border-[#cde1d2] bg-[#e2eee5] p-3.5 text-sm text-[#1f3d26]">
                    🎉 Offer letter sent for <b>{offer.program_name}</b> (
                    {offer.institute}) on {offer.created_at} UTC.
                  </div>
                )}
              </div>
            )}
          </div>

          {timeline && <div className="space-y-6">{timeline}</div>}
        </div>

        {/* Persistent while the counsellor holds it — the shortlist action
            shouldn't be buried inside one tab. */}
        {canShortlist && (
          <div className="sticky bottom-0 z-20 mt-auto py-3.5">
            <div className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 border-t border-line bg-white/90 backdrop-blur-md" />
            <div className="relative flex flex-wrap items-center gap-3">
              <span className="text-xs text-caption">
                {programs.length === 0
                  ? "No eligible programmes — speak to the Ops team"
                  : tab === "profile"
                    ? openRemarks.length > 0
                      ? `${openRemarks.length} open comment${openRemarks.length === 1 ? "" : "s"} from Ops — fix the flagged fields, then tick them off`
                      : "Check the details, then pick a programme to send"
                    : tab === "documents"
                      ? `${lockerVerified} of ${lockerUploaded} uploaded document(s) verified by Ops`
                      : tab === "programs"
                        ? `Pick one of ${eligiblePrograms.length} eligible programme(s)`
                        : selected
                          ? "Programme selected — ready to send"
                          : "Go back and pick a programme"}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <AcFlowBar
                  appId={app.id}
                  tabs={visibleTabs.map((t) => t.key)}
                  tab={tab}
                  selected={selected}
                  hasPrograms={eligiblePrograms.length > 0}
                  action={shortlistProgram.bind(null, app.id)}
                />
              </div>
            </div>
          </div>
        )}
        </div>
        </>
      )}
    </Shell>
  );
}
