"use client";

import { useDbVersion } from "@/components/db-provider";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Shell, requireRole } from "@/components/shell";
import { activityInline } from "@/lib/auth";
import {
  BackLink,
  CardChip,
  CertifiedChip,
  FieldComments,
  ChangedPin,
  AiInsightLine,
  DocumentDialog,
  DocumentTable,
  SideSheet,
  UndertakingCard,
  DotStatus,
  IconAlert,
  EmptyState,
  FileValue,
  Meta,
  ProfileSummary,
  RecheckNotice,
  ReviewGroupBlock,
  StatusBadge,
  Timeline,
  IconBuilding,
  IconCalendar,
  IconCap,
  IconCheck,
  IconClock,
  IconDoc,
  IconPlus,
  IconSend,
  IconShield,
  IconSignature,
  IconSparkle,
  IconTrash,
  IconX,
  IconWallet,
} from "@/components/ui";
import {
  getApplication,
  getEvents,
  getFormResponses,
  getOfferLetter,
  getPrograms,
  getRemarks,
  getDocuments,
  getGroupChecks,
  getLearnerDocs,
  recheckOf,
  listDocTemplates,
  listProgramCatalogue,
} from "@/lib/queries";
import {
  addRemark,
  deleteRemark,
  addDocument,
  clearRecheck,
  raiseRecheckRemarks,
  removeDocument,
  markReviewed,
  openApplication,
  opsAddProgram,
  removeLearnerDoc,
  resolveRemark,
  sendOfferLetter,
  setGroupReview,
  setProgramEligibility,
  updateFieldValue,
  uploadLearnerDoc,
  verifyLearnerDoc,
} from "@/lib/actions";
import { docRows, signeesFor } from "@/lib/documents";
import { docInsight, fieldInsight } from "@/lib/doc-insights";
import { OpenApplication } from "@/components/open-application";
import { CataloguePicker, type PickerItem } from "./catalogue-picker";
import { OpsField } from "./ops-field";
import { SendOfferDialog } from "./send-offer-dialog";
import {
  CLAUSES,
  DOC_CATEGORIES,
  FORM_FIELDS,
  OPS_REVIEW_GROUPS,
  reviewGroupsFor,
  REVIEW_GROUPS,
  DOC_TYPE_LABELS,
  MAX_RECOMMENDED_PROGRAMS,
  matchScore,
  canEditDetails,
  pendingFor,
} from "@/lib/domain";


// One word each — see the note on the counsellor's TABS.
const TABS = [
  { key: "profile", label: "Profile" },
  { key: "eligibility", label: "Eligibility" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function OpsApplicationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("ops");
  const app = getApplication(Number(params.id));
  if (!app || app.status === "draft") notFound();

  const responses = getFormResponses(app.id);
  const remarks = getRemarks(app.id);
  const programs = getPrograms(app.id);
  const docs = getDocuments(app.id);
  const events = getEvents(app.id);
  const offer = getOfferLetter(app.id);
  const locker = docRows(getLearnerDocs(app.id));
  // Which document slots are filled — the AI vet only speaks about a field
  // when its counterpart document is actually there to compare against.
  const groupChecks = getGroupChecks(app.id);
  // Only the sections this learner's degree actually has — see reviewGroupsFor.
  const opsGroups = reviewGroupsFor(responses, OPS_REVIEW_GROUPS);
  const verifiedGroups = opsGroups.filter(
    (g) => groupChecks[g.key]?.ops?.state === "verified"
  ).length;
  const allGroupsVerified = verifiedGroups === opsGroups.length;
  // Ruled on either way — a "not verified" section is finished business too.
  const ruledGroups = opsGroups.filter((g) =>
    ["verified", "not_verified"].includes(groupChecks[g.key]?.ops?.state ?? "")
  ).length;
  const triggeredClauses = (responses.triggered_clauses ?? "")
    .split("|")
    .filter(Boolean);
  const uploadedKeys = new Set(
    locker.filter((r) => r.filename).map((r) => r.key)
  );

  // Ops holds the pen while vetting: they correct the fields, verify the
  // documents and note what they changed. See `editorOf` in domain.ts.
  const vetting = canEditDetails(app.status, "ops");
  // The form locks when vetting ends; the document locker does not. Files keep
  // arriving right up to the offer letter.
  const docsLive = app.status !== "completed";
  // The learner changed something after vetting — this outranks everything
  // else on the page, so it is read before the readiness checklist is built.
  const recheck = recheckOf(app);
  // Commenting is not only a vetting-time thing: a re-check is Ops reading
  // changed fields and saying what's wrong with them, which is the same act
  // on a later day. Filling ops-owned fields stays vetting-only.
  const canComment = Boolean(recheck?.state === "ops") || vetting;
  // Verdicts made against answers the learner has since changed. Ops rules
  // again — on the shortlisted programme too — before the re-check can close.
  const reRuling = Boolean(recheck?.state === "ops");
  const staleVerdicts = programs.filter((p) => p.eligibility_stale).length;
  // Comments raised since the learner's change — the only ones that are about
  // it. `openRemarks` is every open comment on the application, which during
  // a re-check can include leftovers from vetting.
  const recheckComments = recheck
    ? remarks.filter(
        (r) =>
          r.status === "open" && r.kind !== "info" && r.created_at >= recheck.at
      )
        .length
    : 0;
  // The labels the learner moved, for the "changed" marks on the fields.
  const changedLabels = new Set(recheck?.fields ?? []);

  const opsPending = pendingFor(
    app.status,
    "ops",
    Boolean(app.certified_at),
    recheck?.state ?? null
  );
  // Inline right rail, or behind a header button — switched from the FAB.
  const inlineActivity = activityInline();
  const lockerUploaded = locker.filter((r) => r.filename).length;
  const lockerVerified = locker.filter((r) => r.verification === "verified").length;
  // Info remarks are context Ops left for the counsellor, not a task —
  // they never count towards "open remark(s)" or gate the review CTA.
  const openRemarks = remarks.filter(
    (r) => r.status === "open" && r.kind !== "info"
  ).length;
  const certified = Boolean(app.certified_at);
  const shortlistedPrograms = programs.filter((p) => p.shortlisted);
  const allSigned = docs.length > 0 && docs.every((d) => d.signed_at);
  const signedCount = docs.filter((d) => d.signed_at).length;
  const awaitingOffer =
    (app.status === "shortlisted" || app.status === "completed") && !offer;

  // Programmes now arrive recommended by the counsellor; Ops rules on each.
  // The matching score and its reasons come from the same engine the
  // counsellor recommended with, so both sides argue from the same number.
  const catalogue = listProgramCatalogue();
  const templates = listDocTemplates();
  const scored = programs.map((p) => {
    const cat = catalogue.find((c) => c.id === p.catalogue_id);
    return {
      ...p,
      match: cat ? matchScore(cat, responses) : null,
      country: cat?.country,
      degreeLevel: cat?.degree_level,
    };
  });

  // The catalogue, scored for THIS learner — the same engine and the same
  // list the counsellor recommends from, so both desks argue from one number.
  const programItems: (PickerItem & { score: number })[] = catalogue
    .map((c) => {
      const { score, reasons } = matchScore(c, responses);
      return {
        id: c.id,
        title: c.name,
        subtitle: c.institute,
        facts: [`${score}% match`, c.country, c.degree_level, c.duration, c.fee]
          .filter(Boolean) as string[],
        note: c.notes,
        warning: reasons.length > 0 ? reasons.join(" · ") : null,
        keywords: `${c.country} ${c.degree_level}`,
        score,
      };
    })
    .sort((a, b) => b.score - a.score);

  const docItems: PickerItem[] = templates.map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: DOC_TYPE_LABELS[t.type],
    facts: t.always_required ? ["Always required"] : [],
    preview: `I, ${responses.full_name || app.learner_name}, ${t.content}`,
    keywords: t.clause_id ?? "",
  }));

  // Every tab is always available: a remark is a note Ops leaves behind, not
  // a gate that takes the rest of their work away.
  const visibleTabs = TABS;
  const tab: TabKey = visibleTabs.some((t) => t.key === searchParams.tab)
    ? (searchParams.tab as TabKey)
    : "profile";

  const tabIndex = visibleTabs.findIndex((t) => t.key === tab);
  const nextTab = visibleTabs[tabIndex + 1];
  const prevTab = visibleTabs[tabIndex - 1];
  const onLastTab = tabIndex === visibleTabs.length - 1;

  /**
   * Comments on a field, with Ops' own controls folded into the popover so a
   * thirty-field form doesn't carry thirty expanded comment threads.
   */
  const commentsFor = (fieldKey: string) =>
    remarks
      .filter((r) => r.field_key === fieldKey)
      .map((r) => ({
        id: r.id,
        author: r.author_name ?? "Ops",
        at: r.created_at,
        text: r.text,
        resolved: r.status === "resolved",
        kind: r.kind ?? "action",
        acknowledgedAt: r.acknowledged_at,
        reply: r.reply,
        actions:
          canComment && r.status === "open" ? (
            <span className="flex items-center gap-0.5">
              <form action={resolveRemark.bind(null, r.id)}>
                <button
                  className="flex h-6 w-6 items-center justify-center rounded-md text-caption transition-colors hover:bg-[#e8f2e9] hover:text-[#3f6c45]"
                  title="Mark resolved"
                  aria-label="Mark resolved"
                >
                  <IconCheck className="h-3.5 w-3.5" />
                </button>
              </form>
              {r.author_id === user.id && (
                <form action={deleteRemark.bind(null, r.id)}>
                  <button
                    className="flex h-6 w-6 items-center justify-center rounded-md text-caption transition-colors hover:bg-accent/10 hover:text-accent"
                    title="Delete comment"
                    aria-label="Delete comment"
                  >
                    <IconTrash className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </span>
          ) : null,
      }));

  /**
   * What still stands between Ops and marking this reviewed.
   *
   * A greyed-out button with a hover tooltip tells you nothing until you go
   * looking for it — and only after you have walked to the last tab. This is
   * the same information stated plainly, with a link to the tab that fixes it.
   *
   * Only the programme is a hard gate (see `markReviewed`); unchecked
   * documents are surfaced because they are the job, not because they block.
   */
  const lockerUnchecked = locker.filter(
    (r) => r.filename && r.verification === "pending"
  ).length;

  const eligibleCount = programs.filter(
    (p) => p.eligibility === "eligible"
  ).length;
  // Not the same as "ruled out": a programme nobody has ruled on yet is
  // pending, and telling Ops to add a new one when they simply have not
  // finished ruling sends them off to fix the wrong thing.
  const unruledCount = programs.filter(
    (p) => p.eligibility !== "eligible" && p.eligibility !== "not_eligible"
  ).length;
  const readiness = [
    {
      key: "eligibility" as TabKey,
      blocking: true,
      done: eligibleCount > 0,
      todo:
        programs.length === 0
          ? "No recommendations from the counsellor"
          : "No programme marked eligible",
      why:
        programs.length === 0
          ? "The counsellor recommends programmes on the call; there is nothing to rule on yet."
          : "The counsellor shortlists only among the eligible, so mark at least one. Tap to review.",
    },
    {
      // Every section has to carry a verdict before this goes back. "Not
      // verified" is a perfectly good answer — it is *no* answer that leaves
      // the counsellor holding a profile nobody actually ruled on.
      key: "profile" as TabKey,
      blocking: true,
      done: ruledGroups === opsGroups.length,
      todo: `${opsGroups.length - ruledGroups} section${
        opsGroups.length - ruledGroups === 1 ? "" : "s"
      } not ruled on`,
      why: "Mark each section Verified or Not verified — the counsellor sees the verdicts, not your intentions. Tap to review.",
    },
    {
      // The locker lives in the header now, so this one states the fact
      // rather than linking: `href: null` keeps it a plain chip.
      key: null,
      blocking: false,
      done: lockerUnchecked === 0,
      todo: `${lockerUnchecked} document${lockerUnchecked === 1 ? "" : "s"} unchecked`,
      why: "Not blocking — but anything you don't check stays unchecked. Documents are in the header.",
    },
  ];

  const outstanding = readiness.filter((r) => !r.done);
  const blocked = outstanding.some((r) => r.blocking);

  const tabCount: Record<TabKey, string | undefined> = {
    profile: openRemarks > 0 ? String(openRemarks) : undefined,
    // "!" until at least one programme is marked eligible — that's the
    // review's gate — and a stale verdict outranks the count, because the
    // count reads fine while the verdicts behind it are out of date.
    eligibility:
      staleVerdicts > 0
        ? "!"
        : eligibleCount > 0
          ? `${eligibleCount}/${programs.length}`
          : vetting
            ? "!"
            : programs.length > 0
              ? String(programs.length)
              : undefined,
  };

  return (
    <Shell user={user} title="Ops Dashboard · Shortlisting">
      {/* Opening a new submission IS picking it up — see the component note */}
      <OpenApplication
        action={openApplication.bind(null, app.id)}
      />
      <div className="pb-8 pt-6">
        <BackLink href="/ops" label="Back to applications" />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-ink">
                {app.learner_name}
              </h1>
              <StatusBadge status={app.status} />
              <CertifiedChip at={app.certified_at} />
              {/* Instagram-style: one mark beside the name that says whether
                  this learner's details have actually been checked. Green
                  only when every group Ops owns is verified. */}
              <CardChip
                tone={allGroupsVerified ? "green" : "muted"}
                tooltip={
                  allGroupsVerified
                    ? "Every section Ops verifies has been verified"
                    : `${verifiedGroups} of ${opsGroups.length} sections verified`
                }
              >
                {allGroupsVerified ? (
                  <IconCheck className="h-3 w-3" />
                ) : (
                  <IconShield className="h-3 w-3" />
                )}
                {allGroupsVerified
                  ? "Verified"
                  : `${verifiedGroups}/${opsGroups.length} verified`}
              </CardChip>
            </div>
            <p className="mt-1 text-[14.5px] text-body">
              {app.learner_email} · Counsellor: {app.ac_name ?? "—"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
          {/* The locker is reference material Ops keeps coming back to, not a
              stage of the review — one click from the header, any tab. */}
          <SideSheet
            title="Documents"
            subtitle={`${app.learner_name} · ${lockerVerified} of ${lockerUploaded} verified`}
            size="wide"
            triggerClassName="btn-secondary !h-8 !px-3 !text-[12.5px]"
            trigger={
              <>
                <IconDoc className="h-3.5 w-3.5" />
                Documents
                <span className="ml-0.5 rounded-full bg-cream px-1.5 py-0.5 text-[10px] font-semibold leading-none text-caption">
                  {lockerVerified}/{lockerUploaded}
                </span>
              </>
            }
          >
            <p className="mb-4 text-[13px] text-body">
              {docsLive
                ? "Check each document against the details, then mark it verified or reject it with a reason. Rejecting notifies the learner to re-upload."
                : "Everything on file for this learner."}
            </p>
            {/* Unlike the form, this stays open past vetting: visa papers and
                loan letters arrive later, and a document nobody can verify is
                a row nobody can act on. */}
            <DocumentTable
              rows={locker}
              categories={DOC_CATEGORIES}
              insightFor={(key) => docInsight(key, responses, app.learner_name ?? "")}
              canUpload={docsLive}
              canVerify={docsLive}
              upload={uploadLearnerDoc.bind(null, app.id)}
              remove={removeLearnerDoc.bind(null, app.id)}
              verify={verifyLearnerDoc.bind(null, app.id)}
              note={
                docsLive
                  ? vetting
                    ? undefined
                    : "Vetting is finished — you can still verify anything that arrives late."
                  : "This application is complete."
              }
            />
          </SideSheet>
          {!inlineActivity && (
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
              <Timeline events={events} pending={opsPending} />
            </SideSheet>
          )}
          </div>
        </div>
      </div>

      {/* A learner edit after vetting sits above everything — the tabs below
          are showing values that changed since anyone last read them. */}
      {recheck && (
        <RecheckNotice
          fields={recheck.fields}
          at={recheck.at}
          state={recheck.state}
          viewer="ops"
          learnerName={app.learner_name}
          openRemarks={recheckComments}
          staleVerdicts={staleVerdicts}
          verdictHref={`/ops/application/${app.id}?tab=eligibility`}
        />
      )}

      <div className="-mb-12 flex min-h-[calc(100dvh-13.5rem)] flex-col">
      {/* Content left, Activity in the right rail — unless the timeline is
          switched off, in which case the content takes the whole width and the
          log lives behind the header button. */}
      <div
        className={`grid flex-1 gap-6 ${inlineActivity ? "lg:grid-cols-3" : ""}`}
      >
        <div className={`space-y-5 ${inlineActivity ? "lg:col-span-2" : ""}`}>
          {/* Tabs — a single tab isn't a tab bar */}
          {visibleTabs.length > 1 && (
          <div className="card p-1.5">
            <div className="flex gap-1">
              {visibleTabs.map((t) => {
                const active = t.key === tab;
                const count = tabCount[t.key];
                return (
                  <Link
                    key={t.key}
                    href={`/ops/application/${app.id}?tab=${t.key}`}
                    scroll={false}
                    className={`flex min-w-0 flex-1 basis-0 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                      active ? "bg-ink text-paper" : "text-body hover:bg-muted"
                    }`}
                  >
                    {t.label}
                    {count && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                          active
                            ? "bg-white/20"
                            : t.key === "profile" || count === "!"
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

          {/* ── Profile: field-by-field vetting ── */}
          {tab === "profile" && (
            <div className="card fade-up p-6">
              <h2 className="font-display text-[15px] font-semibold tracking-tight">
                Eligibility Details
              </h2>
              <p className="mb-5 mt-1 text-sm text-body">
                {recheck?.state === "ops"
                  ? "The learner changed the fields marked below after this was vetted. Re-read those against the documents — comment on anything wrong and send it to the counsellor, or clear the re-check."
                  : recheck
                    ? "The learner changed the fields marked below; the counsellor is taking your comments to them. It comes back here once they have."
                    : vetting
                      ? "Check each field against the documents. The counsellor's answers are theirs to fix — leave a comment on anything wrong. The fields marked ops (scores, university) are yours to fill from the documents."
                      : "Submitted learner details."}
              </p>
              {/* Grouped, because that is how a person reads a form: "Class 10"
                  is the marksheet AND the score AND the year, ruled on once.
                  Only a few groups are Ops' to verify — the rest are the
                  counsellor's own confirmation, shown but not touched. */}
              <div className="space-y-4">
              {reviewGroupsFor(responses).map((group) => (
                <ReviewGroupBlock
                  key={group.key}
                  group={group}
                  acCheck={groupChecks[group.key]?.ac}
                  opsCheck={groupChecks[group.key]?.ops}
                  viewer="ops"
                  canReview={group.opsReview && canComment}
                  reviewAction={setGroupReview.bind(null, app.id, group.key)}
                  docs={locker.filter((r) => group.docs.includes(r.key))}
                  triggered={group.clauses
                    .filter((c) => triggeredClauses.includes(c))
                    .map((c) => CLAUSES[c]?.title ?? c)}
                >
                  <div className="divide-y divide-line">
                    {group.fields
                      .map((k) => FORM_FIELDS.find((f) => f.key === k))
                      .filter((f): f is (typeof FORM_FIELDS)[number] => Boolean(f))
                      .map((f) => {
                      const fieldRemarks = remarks.filter(
                        (r) => r.field_key === f.key
                      );
                      return (
                        <div key={f.key} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                            <div className="min-w-0 flex-1">
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
                              {/* The split the PM drew: the counsellor's
                                  answers are read-only here — Ops comments on
                                  them, never overwrites them. Only the
                                  ops-owned fields (scores, university — read
                                  off the documents) are Ops' to fill. */}
                              {f.type === "file" ? (
                                <div className="mt-0.5 break-words text-sm">
                                  <FileValue label={f.label} value={responses[f.key]} />
                                </div>
                              ) : (vetting || reRuling) && f.filledBy === "ops" ? (
                                <OpsField
                                  field={f}
                                  value={responses[f.key] ?? ""}
                                  action={updateFieldValue.bind(null, app.id, f.key)}
                                />
                              ) : (
                                <div className="mt-0.5 break-words text-sm">
                                  {responses[f.key] || (
                                    <span className="text-caption">—</span>
                                  )}
                                </div>
                              )}
                              {/* The AI vet's field remark: doc vs field,
                                  only while Ops is actually vetting. */}
                              {vetting &&
                                f.type !== "file" &&
                                (() => {
                                  const ai = fieldInsight(
                                    f.key,
                                    responses,
                                    uploadedKeys
                                  );
                                  return ai ? <AiInsightLine insight={ai} /> : null;
                                })()}
                            </div>
                            {/* Ops fills these from the documents themselves,
                                so there is nothing to flag to anyone else. */}
                            {canComment && f.filledBy !== "ops" && (
                              <form
                                key={`${f.key}-${fieldRemarks.length}`}
                                action={addRemark.bind(null, app.id, f.key)}
                                className="flex shrink-0 gap-2"
                              >
                                <input
                                  name="text"
                                  className="input !h-8 !w-52 !py-0 !text-[12.5px]"
                                  placeholder="Leave a comment…"
                                />
                                {/* Unchecked posts nothing, so the action
                                    defaults to 'action' — a job. Checked
                                    makes it an 'info' note: context to read,
                                    nothing to do, never counted as open. */}
                                <label
                                  className="flex shrink-0 items-center gap-1 text-[11.5px] text-caption"
                                  title="Info only — context, nothing for the counsellor to action"
                                >
                                  <input
                                    type="checkbox"
                                    name="kind"
                                    value="info"
                                    className="h-3.5 w-3.5 accent-[#AE383E]"
                                  />
                                  info
                                </label>
                                <button className="btn-secondary !h-8 !px-3 !text-[12.5px]">
                                  Add
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ReviewGroupBlock>
              ))}
              </div>
              {openRemarks > 0 && (
                <p className="text-xs text-[#8a6d2f]">
                  {openRemarks} open remark(s) — these travel with the
                  application as a record of what you changed.
                </p>
              )}
            </div>
          )}

          {/* ── Eligibility ──
              One tab, three parts in the order the decision is actually made:
              what we know about the learner, what they will have to sign, and
              the programmes to rule on. */}
          {tab === "eligibility" && (
            <ProfileSummary
              responses={responses}
              locker={locker}
              learnerName={app.learner_name}
            />
          )}


          {/* ── Undertaking & Acknowledgement ── */}
          {tab === "eligibility" && (
            <div className="card fade-up p-6">
              <h2 className="font-display text-[15px] font-semibold tracking-tight">
                Undertaking &amp; Acknowledgement
              </h2>
              <p className="mb-4 mt-1 text-sm text-body">
                Auto-generated when vetting starts, including any declarations
                triggered on the call. Attach more if this learner needs them.
              </p>

              {docs.length === 0 ? (
                <EmptyState text="Documents are generated when you start vetting." />
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
                      secondaryAction={
                        vetting ? (
                          d.source === "ops" && !d.signed_at ? (
                            <form action={removeDocument.bind(null, d.id)}>
                              <button className="btn-secondary w-full !h-9">
                                Delete
                              </button>
                            </form>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Required document — cannot be deleted"
                              className="btn-secondary w-full !h-9"
                            >
                              Delete
                            </button>
                          )
                        ) : null
                      }
                      action={
                        <DocumentDialog
                          docType={DOC_TYPE_LABELS[d.type]}
                          title={d.title}
                          content={d.content}
                          signees={signeesFor(app, responses, d)}
                          triggerLabel="View"
                          triggerClassName="btn-secondary w-full !h-9"
                        />
                      }
                    />
                  ))}
                </div>
              )}

              {vetting && (
                <CataloguePicker
                  label="Add undertaking from the form library"
                  title="Undertaking & acknowledgement forms"
                  hint="Attach a form for this learner to sign. Required forms are already attached and cannot be removed."
                  items={docItems}
                  addedIds={docs
                    .map((d) => d.template_id)
                    .filter((id): id is number => id !== null)}
                  action={addDocument.bind(null, app.id)}
                  idField="templateId"
                  addedLabel="Undertaking"
                  layout="cards"
                />
              )}

              {offer && (
                <div className="mt-4 rounded-2xl border border-[#cde1d2] bg-[#e2eee5] p-4">
                  <p className="text-sm font-medium text-[#1f3d26]">
                    🎉 Offer letter sent for {offer.program_name} (
                    {offer.institute}) on {offer.created_at} UTC.
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#1f3d26]/85">
                    {offer.content}
                  </p>
                </div>
              )}

              {awaitingOffer && !(allSigned && certified) && (
                <p className="mt-4 rounded-xl border border-line bg-paper px-3.5 py-2.5 text-[12.5px] text-body">
                  {!allSigned
                    ? "Waiting for the learner to sign their documents."
                    : "Signed — now waiting for the learner to certify that their details are correct."}{" "}
                  The offer letter can only be released once they have done both.
                </p>
              )}
            </div>
          )}
          {/* ── Recommended Programs: the counsellor's picks, Ops' verdicts ── */}
          {tab === "eligibility" && (
            <div className="card fade-up p-6">
              <h2 className="font-display text-[15px] font-semibold tracking-tight">
                Recommended Programs
              </h2>
              <p className="mb-4 mt-1 text-sm text-body">
                {staleVerdicts > 0
                  ? "The learner changed answers these verdicts were based on. Rule again on each one — including the programme they were shortlisted for, which comes off their application if it is no longer open to them."
                  : vetting
                    ? "Recommended by the counsellor with the matching score beside each. Check eligibility against the documents and mark each one — the counsellor shortlists only among the eligible."
                    : "The counsellor's recommendations and your eligibility verdicts."}
              </p>

              <div className="space-y-3">
                {scored.length === 0 && (
                  <EmptyState text="The counsellor hasn't recommended any programmes yet." />
                )}
                {scored.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-2xl border p-4 ${
                      p.shortlisted
                        ? "border-[#d5e6d8] bg-[#e8f2e9]/30"
                        : p.eligibility === "not_eligible"
                          ? "border-line bg-paper opacity-80"
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
                          color={p.shortlisted ? "bg-[#4c9257]" : "bg-caption/50"}
                        >
                          {p.institute}
                        </DotStatus>
                      </div>
                      {/* The engine's number, with its reasons on hover. */}
                      {p.match && (
                        <CardChip
                          tone={p.match.score >= 70 ? "green" : p.match.score >= 45 ? "amber" : "muted"}
                          tooltip={
                            p.match.reasons.length > 0
                              ? p.match.reasons.join(" · ")
                              : "Meets every catalogue requirement on file"
                          }
                        >
                          {p.match.score}% match
                        </CardChip>
                      )}
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

                    {/* No "recommended by" attribution — the card is about
                        the programme and the verdict, not the sender. */}
                    <div className="mt-3.5 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-3">
                      {p.eligibility_stale ? (
                        <CardChip tone="amber">
                          <IconAlert className="h-3 w-3" />
                          Verdict out of date
                        </CardChip>
                      ) : null}
                      {/* Boolean(), not the raw column: SQLite hands booleans
                          back as 0/1, and `0 && <chip/>` renders a literal 0
                          on the card. */}
                      {Boolean(p.shortlisted) && (
                        <CardChip tone="green">
                          <IconCheck className="h-3 w-3" />
                          Shortlisted by AC
                        </CardChip>
                      )}
                      {p.shortlisted && !reRuling ? null : vetting || reRuling ? (
                        /* Ops' verdict — the pick from the counsellor's list. */
                        /* Ops' verdict — the pick from the counsellor's
                           list, with the reason beside it. ONE form: both
                           buttons post it, and which button was pressed is
                           what decides the verdict. */
                        <form
                          action={setProgramEligibility.bind(null, p.id)}
                          className="flex flex-wrap items-center gap-2"
                        >
                          <input
                            name="note"
                            defaultValue={p.eligibility_note ?? ""}
                            placeholder="Why (optional)…"
                            className="input !h-8 !w-44 !py-0 !text-[12.5px]"
                          />
                          <button
                            name="verdict"
                            value="eligible"
                            className={
                              p.eligibility === "eligible"
                                ? "btn-success !h-8 !px-3 !text-[12.5px]"
                                : "btn-secondary !h-8 !px-3 !text-[12.5px]"
                            }
                          >
                            <IconCheck className="h-3.5 w-3.5" />
                            Eligible
                          </button>
                          <button
                            name="verdict"
                            value="not_eligible"
                            className={
                              p.eligibility === "not_eligible"
                                ? "btn !h-8 bg-accent !px-3 !text-[12.5px] text-white"
                                : "btn-secondary !h-8 !px-3 !text-[12.5px]"
                            }
                          >
                            <IconX className="h-3.5 w-3.5" />
                            Not eligible
                          </button>
                        </form>
                      ) : p.eligibility === "eligible" ? (
                        <CardChip tone="green">
                          <IconCheck className="h-3 w-3" />
                          Eligible
                        </CardChip>
                      ) : p.eligibility === "not_eligible" ? (
                        <CardChip tone="red">
                          <IconX className="h-3 w-3" />
                          Not eligible
                        </CardChip>
                      ) : (
                        <CardChip tone="muted">Eligibility pending</CardChip>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* The dead-end guard. If the learner's own change knocked out
                  everything the counsellor recommended, somebody has to be
                  able to put a live option back — and Ops is the one holding
                  the catalogue and the verdicts. */}
              {/* The cap is on how many LIVE options a learner is offered. With
                  nothing eligible there are none, and this picker is the only
                  way back — so the cap does not apply in that state. */}
              {(vetting || reRuling) &&
                (programs.length < MAX_RECOMMENDED_PROGRAMS ||
                  eligibleCount === 0) && (
                  <div className="mt-4">
                    <CataloguePicker
                      label={
                        eligibleCount === 0
                          ? "Nothing is eligible — add a programme that is"
                          : "Add a programme from the catalogue"
                      }
                      title="Programme catalogue — scored for this learner"
                      hint="Anything you add is marked eligible and goes straight to the counsellor to shortlist."
                      items={programItems}
                      addedIds={programs
                        .map((p) => p.catalogue_id)
                        .filter((id): id is number => id !== null)}
                      action={opsAddProgram.bind(null, app.id)}
                      idField="catalogueId"
                      addedLabel="Programme"
                    />
                  </div>
                )}
            </div>
          )}
        </div>

        {inlineActivity && (
          <div className="space-y-6">
            <div className="card fade-up p-5" style={{ animationDelay: "120ms" }}>
              <h2 className="mb-3 font-display text-[15px] font-semibold tracking-tight">
                Activity Timeline
              </h2>
              <Timeline events={events} pending={opsPending} />
            </div>
          </div>
        )}
      </div>

      {/* Sticky action bar — mirrors the counsellor's wizard footer */}
      {(vetting || reRuling || (awaitingOffer && allSigned && certified)) && (
        <div className="sticky bottom-0 z-20 mt-auto py-3.5">
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 border-t border-line bg-white/90 backdrop-blur-md" />
          <div className="relative flex flex-wrap items-center gap-3">
            {/* A learner change can land mid-vetting; the re-check has to take
                precedence or its two exits never render and Ops is stuck with
                the vetting bar on an application nobody can move. */}
            {vetting && !reRuling ? (
              <>
                {/* What's outstanding, as chips in the line the bar already
                    had — the chip IS the link, so there is no label-plus-CTA
                    pair to read. All neutral: the footer already carries the
                    disabled button, and colour-coding two chips beside it was
                    a third signal saying the same thing. The blocking one
                    keeps a small alert glyph, which costs no colour. */}
                {onLastTab && outstanding.length > 0 ? (
                  <span className="flex flex-wrap items-center gap-2">
                    {outstanding.map((r) => {
                      const chip = (
                        <CardChip tone="muted">
                          {r.blocking && <IconAlert className="h-3 w-3" />}
                          {r.todo}
                        </CardChip>
                      );
                      // Documents have no tab any more — that one states the
                      // fact and points at the header instead of linking.
                      return r.key ? (
                        <Link
                          key={r.todo}
                          href={`/ops/application/${app.id}?tab=${r.key}`}
                          scroll={false}
                          title={r.why}
                          className="transition-opacity hover:opacity-75"
                        >
                          {chip}
                        </Link>
                      ) : (
                        <span key={r.todo} title={r.why}>
                          {chip}
                        </span>
                      );
                    })}
                  </span>
                ) : (
                <span className="text-xs text-caption">
                  {onLastTab
                    ? `${eligibleCount} of ${programs.length} programme(s) eligible · ${docs.length} undertaking(s)${
                        openRemarks > 0 ? ` · ${openRemarks} open comment(s)` : ""
                      } · ready to send`
                    : tab === "profile"
                      ? "Comment on the counsellor's answers, fill the ops fields — changes save as you go"
                      : `${eligibleCount} of ${programs.length} recommendation(s) marked eligible`}
                </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  {prevTab && (
                    <Link
                      href={`/ops/application/${app.id}?tab=${prevTab.key}`}
                      scroll={false}
                      className="btn-secondary"
                    >
                      Back
                    </Link>
                  )}
                  {onLastTab ? (
                    <form action={markReviewed.bind(null, app.id)}>
                      <button
                        className="btn-success"
                        disabled={blocked}
                        title={
                          blocked
                            ? // Name the actual blocker. There is more than one
                              // now, and "see the note above" sent Ops looking
                              // for the wrong thing.
                              outstanding
                                .filter((r) => r.blocking)
                                .map((r) => r.todo)
                                .join(" · ")
                            : ""
                        }
                      >
                        Mark as Reviewed &amp; Notify AC
                      </button>
                    </form>
                  ) : (
                    <Link
                      href={`/ops/application/${app.id}?tab=${nextTab.key}`}
                      scroll={false}
                      className="btn-primary"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </>
            ) : reRuling ? (
              /* The re-check's two exits, both explicit — in the bar where
                 every other primary action lives, not inside the notice. */
              <div className="flex w-full flex-wrap items-center gap-3">
                <span className="text-xs text-caption">
                  {staleVerdicts > 0
                    ? `${staleVerdicts} verdict${staleVerdicts === 1 ? "" : "s"} to re-rule on the Eligibility tab`
                    : unruledCount > 0
                      ? `${unruledCount} programme(s) still to rule on — Eligibility tab`
                      : eligibleCount === 0
                        ? "Nothing is eligible — add a programme from the catalogue on the Eligibility tab"
                        : recheckComments > 0
                          ? `${recheckComments} comment${recheckComments === 1 ? "" : "s"} raised on the change`
                          : "Re-read the marked fields — comment on what's wrong, or close the re-check"}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <form action={raiseRecheckRemarks.bind(null, app.id)}>
                    <button
                      className="btn-secondary whitespace-nowrap"
                      disabled={recheckComments === 0}
                      title={
                        recheckComments === 0
                          ? "Comment on the fields that are wrong first — the counsellor needs something to act on"
                          : ""
                      }
                    >
                      <IconSend className="h-4 w-4" />
                      Send {recheckComments > 0 ? `${recheckComments} ` : ""}comment
                      {recheckComments === 1 ? "" : "s"} to AC
                    </button>
                  </form>
                  <form action={clearRecheck.bind(null, app.id)}>
                    <button
                      className="btn-success whitespace-nowrap"
                      disabled={
                        staleVerdicts > 0 ||
                        unruledCount > 0 ||
                        eligibleCount === 0
                      }
                      title={
                        staleVerdicts > 0
                          ? "Rule on the programmes again first — the change moved the answers your verdicts were based on"
                          : unruledCount > 0
                            ? `Rule on the remaining ${unruledCount} programme(s) first — Eligible or Not eligible`
                            : eligibleCount === 0
                              ? "Nothing is eligible any more — add a programme that is from the catalogue on the Eligibility tab, or the application has nowhere left to go"
                              : ""
                      }
                    >
                      <IconCheck className="h-4 w-4" />
                      Re-check done
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div className="flex w-full flex-wrap items-center gap-3">
                <span className="text-xs text-caption">
                  Signed &amp; certified
                  {app.certified_at ? ` on ${app.certified_at.slice(0, 10)}` : ""}{" "}
                  · details auto-filled into the programme application
                </span>
                {/* The counsellor sends exactly one programme, so there is
                    nothing here to choose between — just say which one. The
                    button opens a confirmation naming learner + programme. */}
                {shortlistedPrograms[0] && (
                  <>
                    <span className="ml-auto inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] text-ink">
                      <IconCap className="h-4 w-4 shrink-0 text-caption" />
                      {shortlistedPrograms[0].name} —{" "}
                      <span className="text-body">
                        {shortlistedPrograms[0].institute}
                      </span>
                    </span>
                    <SendOfferDialog
                      learnerName={app.learner_name ?? "the learner"}
                      learnerEmail={app.learner_email ?? "—"}
                      programme={{
                        id: shortlistedPrograms[0].id,
                        name: shortlistedPrograms[0].name,
                        institute: shortlistedPrograms[0].institute,
                        duration: shortlistedPrograms[0].duration,
                        fee: shortlistedPrograms[0].fee,
                      }}
                      action={sendOfferLetter.bind(null, app.id)}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </Shell>
  );
}
