"use client";

import { useDbVersion } from "@/components/db-provider";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/components/shell";
import { UpgradShell, type UgSection } from "@/components/upgrad-shell";
import {
  CardChip,
  DocumentDialog,
  DocumentTable,
  EmptyState,
  StatusBadge,
  UndertakingCard,
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
} from "@/lib/queries";
import {
  certifyDetails,
  removeLearnerDoc,
  signDocument,
  uploadLearnerDoc,
  verifyLearnerDoc,
} from "@/lib/actions";
import {
  DOC_CATEGORIES,
  DOC_TYPE_LABELS,
  FORM_FIELDS,
  FORM_SECTIONS,
  LEARNER_STAGES,
  learnerStage,
} from "@/lib/domain";
import { docRows, signeesFor } from "@/lib/documents";
import { CertifyDialog } from "../../certify-block";
import { DetailRows } from "../../detail-rows";
import { ProgrammeCard } from "../../programme-card";


/**
 * The learner's application, inside upgrad.com's profile area.
 *
 * Signing is the end of a PROCESS, not a tab: "Review & sign" opens a guided
 * walk — Your details → Your programme → Undertaking — and the signature and
 * certification controls exist only on the last step. The learner cannot sign
 * what they haven't just re-read; that ordering is the product rule, and the
 * walk is how the UI enforces it.
 */
const SECTIONS: Record<string, UgSection | "review"> = {
  application: "application",
  programs: "application", // legacy tab
  documents: "documents",
  docs: "documents", // used by the rejection notification
  review: "review",
};

const WALK = [
  { n: 1, label: "Your details" },
  { n: 2, label: "Your programme" },
  { n: 3, label: "Undertaking" },
] as const;

export default function LearnerApplicationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; step?: string };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("learner");
  // Scoped to this learner so an id from elsewhere can't be opened.
  const app = listApplications({ learnerId: user.id }).find(
    (a) => a.id === Number(params.id)
  );
  if (!app) notFound();

  // "My details" lives under Profile, where the site keeps personal data.
  if (searchParams.tab === "profile") redirect("/learner/profile");
  // The old Undertaking tab is now the walk — reading comes first.
  if (searchParams.tab === "undertaking")
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
  const detailsLocked = app.status === "completed";
  const lockerMissing = locker.filter((r) => !r.filename && !r.optional).length;
  const programme = programs[0];

  let section = SECTIONS[searchParams.tab ?? ""] ?? "application";
  // The walk only exists while there is something to sign or certify.
  if (section === "review" && (!canSign || certified))
    redirect(`/learner/application/${app.id}?tab=application`);
  const step = Math.min(3, Math.max(1, Number(searchParams.step) || 1));
  const walkHref = (s: number) =>
    `/learner/application/${app.id}?tab=review&step=${s}`;

  const shellSection: UgSection = section === "review" ? "application" : section;

  const programmeCard = programme && <ProgrammeCard programme={programme} />;

  const undertakingGrid = (signable: boolean) => (
    <div className="grid gap-3 sm:grid-cols-2">
      {docs.map((d) => (
        <UndertakingCard
          key={d.id}
          title={d.title}
          learnerName={responses.full_name || user.name}
          counsellorName={app.ac_name ?? "—"}
          email={user.email}
          signedAt={d.signed_at}
          action={
            <DocumentDialog
              docType={DOC_TYPE_LABELS[d.type]}
              title={d.title}
              content={d.content}
              signees={signeesFor(app, responses, d)}
              canSign={signable && !d.signed_at}
              otpPhone={responses.mobile}
              action={signDocument.bind(null, d.id)}
              triggerLabel={
                signable && !d.signed_at ? "Review & sign" : "View document"
              }
              triggerClassName={
                signable && !d.signed_at
                  ? "btn-primary w-full !h-9"
                  : "btn-secondary w-full !h-9"
              }
            />
          }
        />
      ))}
    </div>
  );

  return (
    <UpgradShell user={user} section={shellSection} appId={app.id}>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[28px] font-medium tracking-tight">Shortlisting</h1>
        <StatusBadge status={app.status} learner certified={certified} />
      </div>
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

      {/* ── My application ── */}
      {section === "application" && (
        <>
          <div className="card mt-5 p-6">
            <h2 className="text-[18px] font-medium">My application</h2>
            {/* Three coarse stages — never the internal pipeline. */}
            <div className="mt-5 flex items-center gap-2">
              {LEARNER_STAGES.map((s, i) => (
                <div key={s.label} className="flex-1">
                  <div
                    className={`h-1.5 rounded-full ${
                      i <= stage ? "bg-accent" : "bg-line"
                    }`}
                  />
                  <div
                    className={`mt-2 text-[13px] ${
                      i <= stage ? "font-medium text-ink" : "text-caption"
                    }`}
                  >
                    {s.label}
                  </div>
                  <div className="text-[12px] text-caption">{s.hint}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card mt-4 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[18px] font-medium">Programme</h2>
              {programme && (
                <CardChip tone="green">
                  <IconCheck className="h-3 w-3" />
                  Shortlisted for you
                </CardChip>
              )}
            </div>
            {!programmeVisible || !programme ? (
              <EmptyState text="We're preparing your options — your programme appears here." />
            ) : (
              programmeCard
            )}
          </div>

          {/* One next step, and it is the walk — reading before signing. */}
          {canSign && !certified && (
            <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 p-6">
              <div>
                <div className="text-[15px] font-medium">
                  {pending > 0
                    ? `${pending} document${pending === 1 ? "" : "s"} awaiting your signature`
                    : "Everything is signed — one last step"}
                </div>
                <div className="mt-0.5 text-[13.5px] text-body">
                  First review your details and your programme — signing and
                  certifying come at the end.
                </div>
              </div>
              <Link href={walkHref(1)} className="btn-primary">
                {pending > 0 ? "Review & sign" : "Review & certify"}
              </Link>
            </div>
          )}

          {certified && !offer && (
            <div className="card mt-4 flex items-center gap-3 p-6 text-[14px] text-body">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8f2e9] text-[#3f6c45]">
                <IconCheck className="h-4 w-4" />
              </span>
              Certified on {app.certified_at?.slice(0, 10)} — your offer letter
              is on its way.
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

          {/* Signed papers stay readable — viewing only, signing lives in the walk. */}
          {allSigned && (
            <div className="card mt-4 p-6">
              <h2 className="text-[18px] font-medium">
                Undertaking &amp; Acknowledgement
              </h2>
              <p className="mb-4 mt-1 text-[13.5px] text-body">
                Signed on {docs[0]?.signed_at?.slice(0, 10)} — open any document
                to re-read it.
              </p>
              {undertakingGrid(false)}
            </div>
          )}
        </>
      )}

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
                  <div key={w.n} className="flex flex-1 items-center">
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
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 1 — the details they are about to vouch for */}
          {step === 1 && (
            <div className="card mt-4 p-6">
              <h2 className="text-[18px] font-medium">Your details</h2>
              <p className="mt-1 text-[13.5px] text-body">
                These are the details your undertakings certify, so read them
                before you sign. Something wrong?{" "}
                <Link
                  href="/learner/profile"
                  className="font-medium text-accent hover:underline"
                >
                  Edit them in your Profile
                </Link>{" "}
                first.
              </p>
              {FORM_SECTIONS.map((s) => (
                <div key={s} className="mt-5">
                  <h3 className="text-[15px] font-medium">{s}</h3>
                  <DetailRows
                    fields={FORM_FIELDS.filter(
                      (f) => f.section === s && f.type !== "file"
                    )}
                    responses={responses}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Step 2 — the programme those details earned */}
          {step === 2 && (
            <div className="card mt-4 p-6">
              <h2 className="text-[18px] font-medium">Your programme</h2>
              <p className="mt-1 text-[13.5px] text-body">
                The programme you have been shortlisted for.
              </p>
              {programme ? (
                programmeCard
              ) : (
                <EmptyState text="Nothing shortlisted yet." />
              )}
            </div>
          )}

          {/* Step 3 — only here can anything be signed or certified */}
          {step === 3 && (
            <>
              <div className="card mt-4 p-6">
                <h2 className="text-[18px] font-medium">
                  Undertaking &amp; Acknowledgement
                </h2>
                <p className="mb-4 mt-1 text-[13.5px] text-body">
                  {pending > 0
                    ? `${pending} document${pending === 1 ? "" : "s"} need your signature.`
                    : "Everything is signed."}
                </p>
                {docs.length === 0 ? (
                  <EmptyState text="Documents appear once your details have been checked." />
                ) : (
                  undertakingGrid(canSign)
                )}
              </div>

              {docs.length > 0 && (
                <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 p-6">
                  <div className="text-[13.5px] text-body">
                    {pending > 0
                      ? `Sign the remaining ${pending} document${pending === 1 ? "" : "s"} to finish.`
                      : "All signed — certify that your details are correct to complete your application."}
                  </div>
                  <CertifyDialog
                    action={certifyDetails.bind(null, app.id)}
                    ready={allSigned}
                    reason="Sign every document first"
                  />
                </div>
              )}
            </>
          )}

          {/* Walk navigation — forward is earned by reading, not by default. */}
          <div className="mt-4 flex items-center justify-between">
            <Link
              href={step === 1 ? `/learner/application/${app.id}` : walkHref(step - 1)}
              className="btn-secondary"
            >
              Back
            </Link>
            {step < 3 ? (
              <Link href={walkHref(step + 1)} className="btn-primary">
                {step === 1 ? "These are correct — continue" : "Continue"}
              </Link>
            ) : (
              <span className="text-[12.5px] text-caption">
                Step 3 of 3 — sign above, then certify
              </span>
            )}
          </div>
        </>
      )}
    </UpgradShell>
  );
}
