"use client";

import { Fragment } from "react";
import { useDbVersion } from "@/components/db-provider";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/components/shell";
import { undertakingVariant } from "@/lib/auth";
import { UpgradShell, type UgSection } from "@/components/upgrad-shell";
import {
  CardChip,
  DocumentTable,
  EmptyState,
  IconCalendar,
  IconCap,
  IconCheck,
  IconClock,
  IconWallet,
} from "@/components/ui";
import {
  getDocuments,
  getFormResponses,
  getLearnerDocs,
  getOfferLetter,
  getPrograms,
  listApplications,
  recheckOf,
} from "@/lib/queries";
import {
  signAllDocuments,
  certifyDetails,
  removeLearnerDoc,
  signDocument,
  updateLearnerDetails,
  uploadLearnerDoc,
  verifyLearnerDoc,
} from "@/lib/actions";
import {
  undertakingFieldsFor,
  DOC_CATEGORIES,
  FORM_FIELDS,
  FORM_SECTIONS,
  LEARNER_STAGES,
  learnerStage,
  learnerCanSeeApplication,
} from "@/lib/domain";
import { docRows, signeesFor } from "@/lib/documents";
import { CertifyDialog } from "../../certify-block";
import { DetailRows } from "../../detail-rows";
import {
  AllSignedCelebration,
  UndertakingVariantView,
  type UndertakingItem,
} from "../../undertaking-variants";
import { ProfileSectionCards } from "../../profile-cards";


/**
 * The learner's application, inside upgrad.com's profile area.
 *
 * Signing is the end of a PROCESS, not a tab: "Review & sign" opens a guided
 * walk — Your details → Undertaking — and the signature and certification
 * controls exist only on the last step. The learner cannot sign what they
 * haven't just re-read; that ordering is the product rule, and the walk is
 * how the UI enforces it.
 *
 * There was a programme step between the two. It showed the learner the one
 * thing they already knew — they chose it, their counsellor rang them about
 * it — so it was a click that carried no decision. The programme still gates
 * certification; it just no longer needs a screen.
 */
const SECTIONS: Record<string, UgSection | "review"> = {
  // The walk IS the application view now — the old overview screen carried
  // no decision (PM: "the previous screen is mute"), so every legacy tab
  // lands on the stepper. Documents keeps its own tab.
  application: "review",
  programs: "review",
  details: "review",
  documents: "documents",
  docs: "documents", // used by the rejection notification
  review: "review",
};

const WALK = [
  { n: 1, label: "Your details" },
  { n: 2, label: "Undertaking" },
] as const;

export default function LearnerApplicationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; step?: string; edit?: string };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("learner");
  // Scoped to this learner so an id from elsewhere can't be opened.
  const app = listApplications({ learnerId: user.id }).find(
    (a) => a.id === Number(params.id)
  );
  if (!app) notFound();
  // Before the first shortlist there is nothing here for them — a bookmarked
  // or notification link lands on the waiting state instead of the
  // application. notFound() would be a lie: it does exist, it isn't theirs to
  // see yet.
  if (!learnerCanSeeApplication(app.status)) redirect("/learner/application");

  // Details are edited INSIDE the application — the profile tab of old (and
  // the site's Profile page) only read them now.
  if (searchParams.tab === "profile" || searchParams.tab === "undertaking")
    redirect(`/learner/application/${app.id}?tab=review&step=1`);

  const responses = getFormResponses(app.id);
  const programs = getPrograms(app.id).filter((p) => p.shortlisted);
  const docs = getDocuments(app.id);
  const offer = getOfferLetter(app.id);
  const locker = docRows(getLearnerDocs(app.id));

  const canSign = app.status === "shortlisted";
  const programmeVisible =
    app.status === "shortlisted" || app.status === "completed";
  const stage = learnerStage(app.status);
  const pending = docs.filter((d) => !d.signed_at).length;
  const allSigned = docs.length > 0 && pending === 0;
  const certified = Boolean(app.certified_at);
  // They changed something after it had been vetted, so it has gone back for
  // a check. The learner is told their details are being checked, never that
  // they are sitting with Ops — which desk holds the file is not their
  // business (see LEARNER_STAGES). What they do need is to stop waiting on a
  // Certify button that would be refused.
  // An appeal is the counsellor and Ops arguing about a programme. Nothing
  // the learner filled in is in question, so as far as every screen on this
  // side is concerned there is no re-check running at all.
  const rawRecheck = recheckOf(app);
  const recheck = rawRecheck?.kind === "appeal" ? null : rawRecheck;
  const detailsLocked = app.status === "completed";
  // Rejected counts as outstanding — the learner has been asked to replace it.
  const lockerMissing = locker.filter(
    (r) => (!r.filename || r.verification === "rejected") && !r.optional
  ).length;
  const programme = programs[0];

  const section = SECTIONS[searchParams.tab ?? ""] ?? "review";
  const step = Math.min(2, Math.max(1, Number(searchParams.step) || 1));
  const walkHref = (s: number) =>
    `/learner/application/${app.id}?tab=review&step=${s}`;

  const shellSection: UgSection = section === "review" ? "application" : section;


  // Six candidate treatments of this list, switched from the demo FAB —
  // see undertaking-variants.tsx for the ranking and the reasoning.
  const variant = undertakingVariant();
  const undertakingItems: UndertakingItem[] = docs.map((d) => ({
    doc: d,
    signees: signeesFor(app, responses, d),
    fields: undertakingFieldsFor(d.clause_id, responses),
  }));
  const undertakingGrid = (signable: boolean) => (
    <UndertakingVariantView
      variant={variant}
      items={undertakingItems}
      signable={signable}
      learnerName={responses.full_name || app.learner_name || "the learner"}
      phone={responses.mobile}
      signDoc={(docId) => signDocument.bind(null, docId)}
      signAll={signAllDocuments.bind(null, app.id)}
    />
  );

  return (
    <UpgradShell user={user} section={shellSection} appId={app.id}>
      <Link
        href="/learner/application"
        className="text-[13.5px] font-medium text-body hover:text-ink"
      >
        ← All applications
      </Link>
      {/* No status chip beside the title. The walk under it already says
          what to do — the stepper, the re-check notice, the sign and
          certify controls — so the chip was a label for a state the page
          spends its whole length explaining. */}
      <h1 className="mt-2 text-[28px] font-medium tracking-tight">
        My application
      </h1>
      <p className="mt-1 text-[14px] text-body">
        Last updated {app.updated_at.slice(0, 10)}
        {app.ac_name && (
          <>
            {" · "}Counsellor:{" "}
            <a
              href={`mailto:${app.ac_email ?? ""}?subject=${encodeURIComponent(
                "Question about my application"
              )}`}
              className="font-medium text-accent hover:underline"
            >
              {app.ac_name}
            </a>
          </>
        )}
      </p>

      {/* ── Documents ── */}
      {section === "documents" && (
        <div className="card mt-5 p-6">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-[18px] font-medium">Documents</h2>
            {lockerMissing > 0 && !detailsLocked && (
              <span className="text-[13px] font-medium text-accent">
                ({lockerMissing} document{lockerMissing === 1 ? "" : "s"} missing)
              </span>
            )}
          </div>
          <p className="mb-4 mt-1 text-[13.5px] text-body">
            {detailsLocked
              ? "Everything on file for your application."
              : "Upload anything still missing. We'll check each one and let you know if we need it again."}
          </p>
          <DocumentTable
            rows={locker}
            categories={DOC_CATEGORIES}
            canUpload={!detailsLocked}
            canVerify={false}
            upload={uploadLearnerDoc.bind(null, app.id)}
            remove={removeLearnerDoc.bind(null, app.id)}
            verify={verifyLearnerDoc.bind(null, app.id)}
            note={detailsLocked ? "Your application is complete." : undefined}
          />
        </div>
      )}

      {/* ── The review walk: read, then sign, then certify ── */}
      {section === "review" && (
        <>
          {/* Stepper */}
          <div className="card mt-5 p-6">
            <div className="flex items-center">
              {WALK.map((w, i) => {
                const done = w.n < step;
                const active = w.n === step;
                return (
                  // The step does NOT stretch — only the rail between two
                  // steps does. Stretching the wrapper split the row into
                  // equal thirds, so the two rails came out different
                  // lengths and the last step trailed dead space.
                  <Fragment key={w.n}>
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-medium ${
                          done
                            ? "bg-accent text-white"
                            : active
                              ? "border-2 border-accent text-accent"
                              : "border border-line-strong text-caption"
                        }`}
                      >
                        {done ? <IconCheck className="h-4 w-4" /> : w.n}
                      </span>
                      <span
                        className={`truncate text-[14px] ${
                          active
                            ? "font-medium text-ink"
                            : done
                              ? "text-body"
                              : "text-caption"
                        }`}
                      >
                        {w.label}
                      </span>
                    </div>
                    {i < WALK.length - 1 && (
                      <span
                        className={`mx-4 h-px flex-1 ${done ? "bg-accent" : "bg-line"}`}
                        aria-hidden
                      />
                    )}
                  </Fragment>
                );
              })}
            </div>
          </div>

          {/* Their change is being checked. Said once, at the top of the
              walk — the edit happens on step 1 and the held Certify button
              is on step 2, so neither place alone would explain it. */}
          {recheck && canSign && (
            <div className="card mt-4 flex items-start gap-3 bg-paper p-5">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-body">
                <IconClock className="h-4 w-4" />
              </span>
              <div>
                <div className="text-[14.5px] font-medium text-ink">
                  {recheck.state === "ac"
                    ? "Your counsellor will get in touch about these"
                    : "We’re checking the details you changed"}
                </div>
                <p className="mt-1 text-[13.5px] leading-relaxed text-body">
                  {recheck.fields.length > 0 && (
                    <>You updated {recheck.fields.slice(0, 3).join(", ")}
                    {recheck.fields.length > 3
                      ? ` and ${recheck.fields.length - 3} more`
                      : ""}
                    . </>
                  )}
                  {recheck.state === "ac" ? (
                    <>
                      There are a couple of things to go through together.
                      {app.ac_name ? ` ${app.ac_name} will call you` : " We'll call you"}
                      {" "}— you can carry on signing in the meantime.
                    </>
                  ) : (
                    <>
                      This usually takes a day. You can carry on signing in the
                      meantime — we&rsquo;ll let you know when you can certify.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Step 1 — the details they are about to vouch for, editable in
              place: the walk IS the application, so the fix happens right
              here. Every change notifies the counsellor and Ops; editing
              after certifying withdraws the certification. */}
          {step === 1 && (
            <>
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-[18px] font-medium">Your details</h2>
                <span className="text-[12.5px] text-caption">
                  {detailsLocked
                    ? "Your application is complete — view only."
                    : "These are what your undertakings certify. Change one and we check it again before your application can finish."}
                </span>
              </div>
              <ProfileSectionCards
                responses={responses}
                locked={detailsLocked}
                editing={detailsLocked ? undefined : searchParams.edit}
                hrefFor={(sec) =>
                  sec
                    ? `/learner/application/${app.id}?tab=review&step=1&edit=${encodeURIComponent(sec)}`
                    : `/learner/application/${app.id}?tab=review&step=1`
                }
                action={updateLearnerDetails.bind(null, app.id)}
              />
            </>
          )}

          {/* The last step — only here can anything be signed or certified,
              and the close of the journey (certified note, offer letter)
              lives here too now that the overview screen is gone. */}
          {step === 2 && (
            <>
              <AllSignedCelebration allSigned={allSigned} certified={certified} />
              <div className="card mt-4 p-6">
                <h2 className="text-[18px] font-medium">
                  Undertaking &amp; Acknowledgement
                </h2>
                <p className="mb-4 mt-1 text-[13.5px] text-body">
                  {docs.length === 0
                    ? "Nothing to sign yet."
                    : !canSign
                      ? // The documents exist from the moment the counsellor
                        // submits, but signDocument only accepts them once the
                        // programme is shortlisted — so until then this is a
                        // preview, not a to-do list with no way to do it.
                        "These are the undertakings your application needs. We'll ask you to sign them once your programme is confirmed."
                      : pending > 0
                        ? `${pending} document${pending === 1 ? " needs" : "s need"} your signature.`
                        : "Everything is signed."}
                </p>
                {docs.length === 0 ? (
                  <EmptyState text="Your undertakings appear here once your details have been checked." />
                ) : (
                  undertakingGrid(canSign && !certified)
                )}
              </div>

              {docs.length > 0 && !certified && canSign && (
                <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 p-6">
                  <div className="text-[13.5px] text-body">
                    {recheck
                      ? recheck.state === "ac"
                        ? "Your counsellor is going through a few of these with you. You can keep signing — certifying opens up once that's settled."
                        : "We're checking the details you changed. You can keep signing — certifying opens up once the check is done."
                      : !programme
                        ? "Your programme is being re-confirmed — we'll let you know as soon as you can certify."
                        : pending > 0
                          ? `Sign the remaining ${pending} document${pending === 1 ? "" : "s"} to finish.`
                          : "All signed — certify that your details are correct to complete your application."}
                  </div>
                  <CertifyDialog
                    action={certifyDetails.bind(null, app.id)}
                    ready={allSigned && !recheck && Boolean(programme)}
                    reason={
                      recheck
                        ? recheck.state === "ac"
                          ? "Your counsellor is going through these with you"
                          : "We're still checking the details you changed"
                        : !programme
                          ? "We're still finalising your programme — your counsellor will be in touch"
                          : "Sign every document first"
                    }
                  />
                </div>
              )}

              {certified && !offer && (
                <div className="card mt-4 flex items-center gap-3 p-6 text-[14px] text-body">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f2e9] text-[#3f6c45]">
                    <IconCheck className="h-4 w-4" />
                  </span>
                  Certified on {app.certified_at?.slice(0, 10)} — your offer
                  letter is on its way.
                </div>
              )}

              {offer && (
                <div className="card mt-4 border-[#cde1d2] bg-[#f2f8f3] p-6">
                  <p className="text-[15px] font-medium text-[#1f3d26]">
                    🎉 Your offer letter is ready
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#1f3d26]/90">
                    {offer.content}
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-[#2f5e38]">
                    <IconCalendar className="h-3.5 w-3.5" />
                    Issued {offer.created_at} UTC
                  </p>
                </div>
              )}
            </>
          )}

          {/* Walk navigation — forward is earned by reading, not by default. */}
          <div className="mt-4 flex items-center justify-between">
            <Link
              href={step === 1 ? "/learner/application" : walkHref(step - 1)}
              className="btn-secondary"
            >
              Back
            </Link>
            {step < 2 ? (
              <Link href={walkHref(step + 1)} className="btn-primary">
                These are correct — continue
              </Link>
            ) : (
              <span className="text-[12.5px] text-caption">
                {canSign && !certified
                  ? "Step 2 of 2 — sign above, then certify"
                  : "Step 2 of 2"}
              </span>
            )}
          </div>
        </>
      )}
    </UpgradShell>
  );
}
