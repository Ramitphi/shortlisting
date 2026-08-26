"use client";

import { useDbVersion } from "@/components/db-provider";
import { LEARNER_V2_ENABLED } from "@/lib/auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/components/shell";
import { UpgradShell } from "@/components/upgrad-shell";
import {
  DocumentDialog,
  EmptyState,
  UndertakingCard,
  IconCalendar,
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
  certifyDetails,
  removeLearnerDoc,
  signDocument,
  updateLearnerDetails,
  uploadLearnerDoc,
} from "@/lib/actions";
import { DOC_TYPE_LABELS } from "@/lib/domain";
import { docRows, signeesFor } from "@/lib/documents";
import { ProfileSectionCards } from "../../profile-cards";
import { ProgrammeCard } from "../../programme-card";
import { V2Certify, V2DocsTable } from "./v2-bits";


/**
 * v2 inside view — the capture's page, extended. The site's current UI has a
 * Personal Details | Upload Documents toggle; our flow needs the programme
 * and the undertakings, so those slot in as two more tabs in the same strip:
 *
 *   Personal Details | Program | Undertaking | Upload Documents
 *
 * Signing lives on the Undertaking tab, and the capture's consent-checkbox +
 * Submit footer IS the certification — same actions as v1, different clothes.
 */
const TABS = [
  { key: "personal", label: "Personal Details" },
  { key: "program", label: "Program" },
  { key: "undertaking", label: "Undertaking" },
  { key: "documents", label: "Upload Documents" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** The capture's headline: first word dark, the rest brand red. */
function TwoTone({ text }: { text: string }) {
  const [first, ...rest] = text.split(" ");
  return (
    <h2 className="text-heading4 md:text-textLarge font-bold xs:pt-spacing12 xs:pb-spacing32 md:py-spacing2">
      {first} <span className="text-primary-main">{rest.join(" ")}</span>
    </h2>
  );
}

/** The capture's tab button, its own classes — selection styled by the
 *  site's ui-selected variants via data-headlessui-state. */
const TAB_BTN =
  "focus-visible:outline-none flex justify-start items-center flex-grow-0 flex-shrink-0 relative gap-spacing12 xs:py-spacing14 md:py-spacing10 before:ui-selected:border-b-3 before:ui-selected:w-full before:ui-selected:absolute before:ui-selected:-bottom-spacing2 before:ui-selected:border-primary-main font-450 md:-tracking-0.2 xs:-tracking-0.14";
const TAB_LABEL =
  " flex-grow-0 flex-shrink-0 xs:text-bodySmall md:text-title3 ui-selected:font-medium ui-not-selected:font-450 text-center ui-not-selected:text-greyscale-2 ui-selected:text-black md:-tracking-0.2 xs:-tracking-0.14 capitalize ";

export default function V2ApplicationInsidePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string; edit?: string };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  // v1 is the learner direction — these v2 routes stay in the repo but are
  // not part of the product until the flag in auth.ts turns them back on.
  if (!LEARNER_V2_ENABLED) redirect("/learner");
  const user = requireRole("learner");
  const app = listApplications({ learnerId: user.id }).find(
    (a) => a.id === Number(params.id)
  );
  if (!app) notFound();

  const tab: TabKey = TABS.some((t) => t.key === searchParams.tab)
    ? (searchParams.tab as TabKey)
    : "personal";

  const responses = getFormResponses(app.id);
  const programme = getPrograms(app.id).filter((p) => p.shortlisted)[0];
  const docs = getDocuments(app.id);
  const offer = getOfferLetter(app.id);
  const locker = docRows(getLearnerDocs(app.id));

  const canSign = app.status === "shortlisted";
  const pending = docs.filter((d) => !d.signed_at).length;
  const allSigned = docs.length > 0 && pending === 0;
  const certified = Boolean(app.certified_at);
  // A detail changed after vetting is being re-checked; Submit (which IS the
  // certification here) stays held until that clears. Same rule as v1 — only
  // the clothes differ.
  // Appeals are internal — see the note on the v1 page.
  const rawRecheck = recheckOf(app);
  const recheck = rawRecheck?.kind === "appeal" ? null : rawRecheck;
  const locked = app.status === "completed";
  const editing = !locked ? searchParams.edit : undefined;

  const heading =
    tab === "personal"
      ? "Personal Details"
      : tab === "program"
        ? "Your Program"
        : tab === "undertaking"
          ? "Undertaking & Acknowledgement"
          : "Upload Documents";

  // The tab strip is free navigation (that's the site's behaviour); the
  // Next/Back pair underneath walks the same tabs in order for the learner
  // who just follows the flow.
  const tabIndex = TABS.findIndex((t) => t.key === tab);
  const prevTab = TABS[tabIndex - 1];
  const nextTab = TABS[tabIndex + 1];
  const tabHref = (k: TabKey) => `/learner/applications/${app.id}?tab=${k}`;

  return (
    <UpgradShell user={user} section="applications" appId={app.id} bare>
      <p className="text-captionSmall md:text-title2">
        Welcome, <span className="text-primary-main">{user.name}</span>
      </p>
      <TwoTone text={heading} />

      {/* The capture's tab strip — its own buttons, its own selected state. */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex justify-start items-center w-max xs:gap-spacing24 md:gap-spacing32 border-0 border-b-1 border-greyscale-8">
          {TABS.map((t) => {
            const active = t.key === tab;
            return (
              <Link
                key={t.key}
                href={`/learner/applications/${app.id}?tab=${t.key}`}
                scroll={false}
                role="tab"
                aria-selected={active}
                data-headlessui-state={active ? "selected" : ""}
                className={TAB_BTN}
              >
                <p className={TAB_LABEL}>{t.label}</p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Personal Details: the SAME cards as Profile → Personal details,
             one shared component — only the edit-mode URL differs. ── */}
      {tab === "personal" && (
        <ProfileSectionCards
          responses={responses}
          locked={locked}
          editing={editing}
          hrefFor={(section) =>
            section
              ? `/learner/applications/${app.id}?tab=personal&edit=${encodeURIComponent(section)}`
              : `/learner/applications/${app.id}?tab=personal`
          }
          action={updateLearnerDetails.bind(null, app.id)}
        />
      )}

      {/* ── Program ── */}
      {tab === "program" && (
        <div className="card mt-5 p-6">
          <h2 className="text-[18px] font-medium">Program</h2>
          {programme ? (
            <ProgrammeCard programme={programme} />
          ) : (
            <EmptyState text="We're preparing your options — your programme appears here." />
          )}
        </div>
      )}

      {/* ── Undertaking: sign here, certify with the capture's footer ── */}
      {tab === "undertaking" && (
        <div className="card mt-5 p-6">
          <h2 className="text-[18px] font-medium">
            Undertaking &amp; Acknowledgement
          </h2>
          <p className="mb-4 mt-1 text-[13.5px] text-body">
            {pending > 0
              ? `${pending} document${pending === 1 ? " needs" : "s need"} your signature.`
              : docs.length > 0
                ? "Everything is signed."
                : "Nothing to sign yet."}
          </p>
          {docs.length === 0 ? (
            <EmptyState text="Documents appear once your details have been checked." />
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <UndertakingCard
                  key={d.id}
                  title={d.title}
                  signedAt={d.signed_at}
                  action={
                    <DocumentDialog
                      docType={DOC_TYPE_LABELS[d.type]}
                      title={d.title}
                      content={d.content}
                      signees={signeesFor(app, responses, d)}
                      canSign={canSign && !d.signed_at}
                      otpPhone={responses.mobile}
                      action={signDocument.bind(null, d.id)}
                      triggerLabel={
                        canSign && !d.signed_at ? "Review & sign" : "View document"
                      }
                      triggerClassName={
                        canSign && !d.signed_at
                          ? "btn-primary w-full !h-9"
                          : "btn-secondary w-full !h-9"
                      }
                    />
                  }
                />
              ))}
            </div>
          )}

          {offer && (
            <div className="mt-5 rounded-xl border border-[#cde1d2] bg-[#f2f8f3] p-5">
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

          {docs.length > 0 && canSign && (
            <V2Certify
              action={certifyDetails.bind(null, app.id)}
              allSigned={allSigned}
              recheckFields={recheck?.fields}
              recheckState={recheck?.state}
              certified={certified}
              certifiedAt={app.certified_at}
              backHref="/learner/applications"
            />
          )}
        </div>
      )}

      {/* ── Upload Documents: the capture's table on our locker ── */}
      {tab === "documents" && (
        <div className="card mt-5 p-6">
          <V2DocsTable
            rows={locker}
            canUpload={!locked}
            upload={uploadLearnerDoc.bind(null, app.id)}
            remove={removeLearnerDoc.bind(null, app.id)}
          />
        </div>
      )}

      {/* Walk the tabs in order without touching the strip. */}
      <div className="mt-5 flex items-center justify-between">
        {prevTab ? (
          <Link href={tabHref(prevTab.key)} scroll={false} className="btn-secondary">
            Back: {prevTab.label}
          </Link>
        ) : (
          <Link href="/learner/applications" className="btn-secondary">
            Go Back to My Application
          </Link>
        )}
        {nextTab && (
          <Link href={tabHref(nextTab.key)} scroll={false} className="btn-primary">
            Next: {nextTab.label}
          </Link>
        )}
      </div>
    </UpgradShell>
  );
}
