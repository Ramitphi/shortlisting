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
  StatusBadge,
  Timeline,
  IconBuilding,
  IconCalendar,
  IconCap,
  IconCheck,
  IconClock,
  IconDoc,
  IconPlus,
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
  getLearnerDocs,
  listDocTemplates,
  listProgramCatalogue,
} from "@/lib/queries";
import {
  addRemark,
  deleteRemark,
  addDocument,
  removeDocument,
  markReviewed,
  openApplication,
  removeLearnerDoc,
  resolveRemark,
  sendOfferLetter,
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
import {
  DOC_CATEGORIES,
  FORM_FIELDS,
  FORM_SECTIONS,
  DOC_TYPE_LABELS,
  matchScore,
  canEditDetails,
  pendingFor,
} from "@/lib/domain";


// One word each — see the note on the counsellor's TABS.
const TABS = [
  { key: "profile", label: "Profile" },
  { key: "documents", label: "Documents" },
  { key: "programs", label: "Programs" },
  { key: "undertaking", label: "Undertaking" },
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
  const uploadedKeys = new Set(
    locker.filter((r) => r.filename).map((r) => r.key)
  );

  // Ops holds the pen while vetting: they correct the fields, verify the
  // documents and note what they changed. See `editorOf` in domain.ts.
  const vetting = canEditDetails(app.status, "ops");
  // The form locks when vetting ends; the document locker does not. Files keep
  // arriving right up to the offer letter.
  const docsLive = app.status !== "completed";
  const opsPending = pendingFor(app.status, "ops", Boolean(app.certified_at));
  // Inline right rail, or behind a header button — switched from the FAB.
  const inlineActivity = activityInline();
  const lockerUploaded = locker.filter((r) => r.filename).length;
  const lockerVerified = locker.filter((r) => r.verification === "verified").length;
  const openRemarks = remarks.filter((r) => r.status === "open").length;
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
        actions:
          vetting && r.status === "open" ? (
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
  const readiness = [
    {
      key: "programs" as TabKey,
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
      key: "documents" as TabKey,
      blocking: false,
      done: lockerUnchecked === 0,
      todo: `${lockerUnchecked} document${lockerUnchecked === 1 ? "" : "s"} unchecked`,
      why: "Not blocking — but anything you don't check stays unchecked. Tap to review.",
    },
  ];

  const outstanding = readiness.filter((r) => !r.done);
  const blocked = outstanding.some((r) => r.blocking);

  const tabCount: Record<TabKey, string | undefined> = {
    profile: openRemarks > 0 ? String(openRemarks) : undefined,
    documents: `${lockerVerified}/${lockerUploaded}`,
    // "!" while empty — the one thing that will block the review, flagged on
    // the tab rather than discovered at the last step.
    // "!" until at least one is marked eligible — that's the review's gate.
    programs:
      eligibleCount > 0
        ? `${eligibleCount}/${programs.length}`
        : vetting
          ? "!"
          : programs.length > 0
            ? String(programs.length)
            : undefined,
    undertaking: docs.length > 0 ? `${signedCount}/${docs.length}` : undefined,
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
            </div>
            <p className="mt-1 text-[14.5px] text-body">
              {app.learner_email} · Counsellor: {app.ac_name ?? "—"}
            </p>
          </div>
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
                    className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
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
                {vetting
                  ? "Check each field against the documents. The counsellor's answers are theirs to fix — leave a comment on anything wrong. The fields marked ops (scores, university) are yours to fill from the documents."
                  : "Submitted learner details."}
              </p>
              {FORM_SECTIONS.map((section) => (
                <div key={section} className="mb-6">
                  <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                    {section}
                  </h3>
                  <div className="divide-y divide-line rounded-xl border border-line">
                    {FORM_FIELDS.filter((f) => f.section === section).map((f) => {
                      const fieldRemarks = remarks.filter(
                        (r) => r.field_key === f.key
                      );
                      return (
                        <div key={f.key} className="p-3.5">
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
                              ) : vetting && f.filledBy === "ops" ? (
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
                            {vetting && f.filledBy !== "ops" && (
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
                </div>
              ))}
              {openRemarks > 0 && (
                <p className="text-xs text-[#8a6d2f]">
                  {openRemarks} open remark(s) — these travel with the
                  application as a record of what you changed.
                </p>
              )}
            </div>
          )}

          {/* ── Documents: the learner's locker ── */}
          {tab === "documents" && (
            <div className="card fade-up p-6">
              <h2 className="font-display text-[15px] font-semibold tracking-tight">
                Documents
              </h2>
              <p className="mb-4 mt-1 text-sm text-body">
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
            </div>
          )}

          {/* ── Recommended Programs: the counsellor's picks, Ops' verdicts ── */}
          {tab === "programs" && (
            <div className="card fade-up p-6">
              <h2 className="font-display text-[15px] font-semibold tracking-tight">
                Recommended Programs
              </h2>
              <p className="mb-4 mt-1 text-sm text-body">
                {vetting
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
                      {p.shortlisted ? (
                        <CardChip tone="green">
                          <IconCheck className="h-3 w-3" />
                          Shortlisted by AC
                        </CardChip>
                      ) : vetting ? (
                        /* Ops' verdict — the pick from the counsellor's list. */
                        <span className="flex items-center gap-2">
                          <form action={setProgramEligibility.bind(null, p.id)}>
                            <input type="hidden" name="verdict" value="eligible" />
                            <button
                              className={
                                p.eligibility === "eligible"
                                  ? "btn-success !h-8 !px-3 !text-[12.5px]"
                                  : "btn-secondary !h-8 !px-3 !text-[12.5px]"
                              }
                            >
                              <IconCheck className="h-3.5 w-3.5" />
                              Eligible
                            </button>
                          </form>
                          <form action={setProgramEligibility.bind(null, p.id)}>
                            <input type="hidden" name="verdict" value="not_eligible" />
                            <button
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
                        </span>
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
            </div>
          )}

          {/* ── Undertaking & Acknowledgement ── */}
          {tab === "undertaking" && (
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
      {(vetting || (awaitingOffer && allSigned && certified)) && (
        <div className="sticky bottom-0 z-20 mt-auto py-3.5">
          <div className="pointer-events-none absolute inset-y-0 left-1/2 w-screen -translate-x-1/2 border-t border-line bg-white/90 backdrop-blur-md" />
          <div className="relative flex flex-wrap items-center gap-3">
            {vetting ? (
              <>
                {/* What's outstanding, as chips in the line the bar already
                    had — the chip IS the link, so there is no label-plus-CTA
                    pair to read. All neutral: the footer already carries the
                    disabled button, and colour-coding two chips beside it was
                    a third signal saying the same thing. The blocking one
                    keeps a small alert glyph, which costs no colour. */}
                {onLastTab && outstanding.length > 0 ? (
                  <span className="flex flex-wrap items-center gap-2">
                    {outstanding.map((r) => (
                      <Link
                        key={r.key}
                        href={`/ops/application/${app.id}?tab=${r.key}`}
                        scroll={false}
                        title={r.why}
                        className="transition-opacity hover:opacity-75"
                      >
                        <CardChip tone="muted">
                          {r.blocking && <IconAlert className="h-3 w-3" />}
                          {r.todo}
                        </CardChip>
                      </Link>
                    ))}
                  </span>
                ) : (
                <span className="text-xs text-caption">
                  {onLastTab
                    ? `${eligibleCount} of ${programs.length} programme(s) eligible · ${docs.length} undertaking(s)${
                        openRemarks > 0 ? ` · ${openRemarks} open comment(s)` : ""
                      } · ready to send`
                    : tab === "profile"
                      ? "Comment on the counsellor's answers, fill the ops fields — changes save as you go"
                      : tab === "documents"
                        ? `${lockerVerified} of ${lockerUploaded} uploaded document(s) verified`
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
                            ? "Recommend at least one programme first — see the note above"
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
            ) : (
              <form
                action={sendOfferLetter.bind(null, app.id)}
                className="flex w-full flex-wrap items-center gap-3"
              >
                <span className="text-xs text-caption">
                  Signed &amp; certified
                  {app.certified_at ? ` on ${app.certified_at.slice(0, 10)}` : ""}{" "}
                  · details auto-filled into the programme application
                </span>
                {/* The counsellor sends exactly one programme, so there is
                    nothing here to choose between — just say which one. */}
                {shortlistedPrograms[0] && (
                  <>
                    <input
                      type="hidden"
                      name="programId"
                      value={shortlistedPrograms[0].id}
                    />
                    <span className="ml-auto inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] text-ink">
                      <IconCap className="h-4 w-4 shrink-0 text-caption" />
                      {shortlistedPrograms[0].name} —{" "}
                      <span className="text-body">
                        {shortlistedPrograms[0].institute}
                      </span>
                    </span>
                  </>
                )}
                <button className="btn-primary shrink-0">
                  Send Offer Letter
                </button>
              </form>
            )}
          </div>
        </div>
      )}
      </div>
    </Shell>
  );
}
