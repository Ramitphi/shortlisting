"use client";

import { useDbVersion } from "@/components/db-provider";
import { redirect } from "next/navigation";
import { LEARNER_V2_ENABLED } from "@/lib/auth";
import Link from "next/link";
import { requireRole } from "@/components/shell";
import { UpgradShell } from "@/components/upgrad-shell";
import {
  getDocuments,
  getOfferLetter,
  getPrograms,
  listApplications,
  recheckOf,
} from "@/lib/queries";
import { learnerStatus } from "@/lib/domain";


/**
 * v2 My Applications — the site's own page, built from the capture's OWN code.
 *
 * Every class string below is lifted verbatim from the saved
 * "My Application | Track Your Progress & Manage Submissions" HTML, and the
 * definitions come from the site's compiled stylesheet shipped at
 * /upgrad/site.css (fonts and icons rewritten to local files). The icons are
 * the capture's actual SVGs. Nothing here is a re-implementation — when the
 * real site changes, re-save the page and re-lift.
 *
 * Only the VALUES are ours: statuses map to the learner's coarse view.
 */

/** The capture's status row: branded icon + label + coloured caps value. */
function StatusRow({
  icon,
  alt,
  label,
  value,
  tone,
}: {
  icon: string;
  alt: string;
  label: string;
  value: string;
  /** green = the capture's good-news colour, urgent = its red, plain = dark. */
  tone: "green" | "urgent" | "plain";
}) {
  const valueCls =
    tone === "green"
      ? "text-labelNormal md:text-bodySmall font-semibold text-application-card-text-green"
      : tone === "urgent"
        ? "text-labelNormal md:text-bodySmall font-semibold text-application-card-ungency-text"
        : "text-labelNormal md:text-bodySmall font-semibold text-user-title-text";
  return (
    <div className="flex gap-spacing8 mb-spacing10 md:mb-spacing16 items-center ">
      <span className="branded-icon">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={alt} width={20} height={20} className="text-icon-md" src={icon} />
      </span>
      <p className="text-labelNormal md:text-bodySmall text-user-title-text">
        {label}
      </p>
      <p className={valueCls}>{value}</p>
    </div>
  );
}

export default function V2ApplicationsPage() {
  // Re-render on any browser-db or session change.
  useDbVersion();
  // v1 is the learner direction — these v2 routes stay in the repo but are
  // not part of the product until the flag in auth.ts turns them back on.
  if (!LEARNER_V2_ENABLED) redirect("/learner");
  const user = requireRole("learner");
  const app = listApplications({ learnerId: user.id })[0];

  const programme = app
    ? getPrograms(app.id).filter((p) => p.shortlisted)[0]
    : undefined;
  const docs = app ? getDocuments(app.id) : [];
  const offer = app ? getOfferLetter(app.id) : undefined;
  const pending = docs.filter((d) => !d.signed_at).length;
  const certified = Boolean(app?.certified_at);
  const enrolled = app?.status === "completed" ? 1 : 0;

  const rawRecheck = app ? recheckOf(app) : null;
  // Appeals are internal — the learner's card must not react to one.
  const recheck = rawRecheck?.kind === "appeal" ? null : rawRecheck;
  const status = app
    ? learnerStatus(app.status, certified, Boolean(recheck))
    : null;
  const statusGood = app?.status === "completed" || certified;
  const docStatus = !app
    ? ""
    : offer
      ? "OFFER LETTER ISSUED"
      : certified
        ? "CERTIFIED"
        : docs.length === 0
          ? "BEING PREPARED"
          : pending > 0
            ? `${pending} TO SIGN`
            : "ALL SIGNED";

  return (
    <UpgradShell user={user} section="applications" appId={app?.id ?? null} bare>
      {/* Welcome + heading — capture markup */}
      <div className="relative">
        <p className="text-captionSmall md:text-title2">
          Welcome, <span className="text-primary-main">{user.name}</span>
        </p>
        <h2 className="text-heading4 md:text-textLarge font-bold xs:pt-spacing12 xs:pb-spacing32 md:py-spacing2">
          My <span className="text-primary-main">Applications</span>
        </h2>
      </div>

      {/* All / Enrolled tabs — capture markup; data-headlessui-state drives
          the site's own ui-selected styling (red underline, bold). */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex justify-start items-center w-max xs:gap-spacing24 md:gap-spacing32 border-0 border-b-1 border-greyscale-8">
          <button
            className="focus-visible:outline-none flex justify-start items-center flex-grow-0 flex-shrink-0 relative gap-spacing12 xs:py-spacing14 md:py-spacing10 before:ui-selected:border-b-3 before:ui-selected:w-full before:ui-selected:absolute before:ui-selected:-bottom-spacing2 before:ui-selected:border-primary-main font-450 md:-tracking-0.2 xs:-tracking-0.14"
            role="tab"
            type="button"
            aria-selected="true"
            data-headlessui-state="selected"
          >
            <p className=" flex-grow-0 flex-shrink-0 xs:text-bodySmall md:text-title3 ui-selected:font-medium ui-not-selected:font-450 text-center ui-not-selected:text-greyscale-2 ui-selected:text-black md:-tracking-0.2 xs:-tracking-0.14 capitalize ">
              All ({app ? 1 : 0})
            </p>
          </button>
          <button
            className="focus-visible:outline-none flex justify-start items-center flex-grow-0 flex-shrink-0 relative gap-spacing12 xs:py-spacing14 md:py-spacing10 before:ui-selected:border-b-3 before:ui-selected:w-full before:ui-selected:absolute before:ui-selected:-bottom-spacing2 before:ui-selected:border-primary-main font-450 md:-tracking-0.2 xs:-tracking-0.14"
            role="tab"
            type="button"
            aria-selected="false"
            data-headlessui-state=""
          >
            <p className=" flex-grow-0 flex-shrink-0 xs:text-bodySmall md:text-title3 ui-selected:font-medium ui-not-selected:font-450 text-center ui-not-selected:text-greyscale-2 ui-selected:text-black md:-tracking-0.2 xs:-tracking-0.14 capitalize ">
              Enrolled ({enrolled})
            </p>
          </button>
        </div>
      </div>

      {!app ? (
        <div className="border border-greyscale-8 rounded-16 bg-white p-spacing40 mt-spacing24 text-center text-bodySmall text-user-title-text">
          No application yet — your academic counsellor will set one up with
          you on a call.
        </div>
      ) : (
        <div className="border border-greyscale-8 rounded-16 bg-white mt-spacing24">
          <div className="flex flex-col md:flex-row gap-spacing24 p-spacing16 md:p-spacing40 md:pb-spacing24">
            {/* Programme image area (the capture carries programme art we
                don't have) */}
            <div className="bg-light-grey-5 rounded-lg w-full md:w-232 h-140 shrink-0" />
            <div className="flex flex-col justify-between min-w-0">
              <div className="pt-spacing14 md:py-0">
                <p
                  className="text-bodySmall md:text-title1 line-clamp-2 mb-spacing24 md:mb-spacing16 font-medium"
                  title={programme?.name ?? "Shortlisting"}
                >
                  {programme
                    ? programme.name
                    : "Shortlisting — programme being prepared"}
                </p>
                <div className="min-h-102px h-auto">
                  <StatusRow
                    icon="/upgrad/site/clock.svg"
                    alt="calender"
                    label="Application Status:"
                    value={(status?.label ?? "").toUpperCase()}
                    tone={statusGood ? "green" : recheck ? "plain" : "urgent"}
                  />
                  <StatusRow
                    icon="/upgrad/site/document.svg"
                    alt="document"
                    label="Document Status:"
                    value={docStatus}
                    tone={offer || certified ? "green" : docs.length === 0 ? "plain" : "urgent"}
                  />
                  <StatusRow
                    icon="/upgrad/site/calendar.svg"
                    alt="calender"
                    label="Last Updated:"
                    value={app.updated_at.slice(0, 10)}
                    tone="plain"
                  />
                </div>
              </div>
              <div className="flex flex-col ">
                <div className="flex  gap-spacing10 md:gap-spacing28">
                  <Link
                    href={`/learner/applications/${app.id}`}
                    className="md:h-spacing44 xs:h-45px xs:text-buttonSmall md:text-buttonNormal justify-center items-center gap-spacing8 inline-flex whitespace-nowrap bg-white rounded-lg border border-branding-secondary text-branding-secondary font-medium px-spacing24 py-spacing14 md:py-spacing10 xs:grow md:grow-0 xs:w-232 md:w-232 md:-tracking-0.18 md:!text-buttonNormal xs:!text-labelNormal xs:!text-[14px] "
                  >
                    View Application
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Available Documents strip — capture markup */}
          <div className="mt-spacing12 md:mt-spacing16 flex flex-col md:flex-row md:items-center md:justify-between gap-spacing8 bg-[#EBF2FF] p-spacing16 py-spacing20 md:py-spacing12 md:px-spacing40 rounded-b-16">
            <div className="">
              <span className="text-title3 text-highlight-text-blue">
                Available Documents
              </span>
            </div>
            <div className="flex-col md:flex-row gap-spacing28 md:gap-spacing56 flex-wrap md:grow items-start md:items-center md:justify-end mt-spacing16 md:mt-0 flex">
              {offer ? (
                <div role="button" tabIndex={0} className="cursor-pointer flex justify-center items-center">
                  <Link
                    href={`/learner/applications/${app.id}?tab=undertaking`}
                    className="text-labelNormal md:text-bodySmall text-highlight-text-blue "
                  >
                    <span className="flex items-center gap-[4px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        alt="Offer Letter"
                        width={20}
                        height={20}
                        className="text-icon-md"
                        src="/upgrad/site/download.svg"
                      />
                      Offer Letter
                    </span>
                  </Link>
                </div>
              ) : (
                <span className="text-labelNormal md:text-bodySmall text-greyscale-2">
                  None yet
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </UpgradShell>
  );
}
