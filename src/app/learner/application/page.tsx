"use client";

import { useDbVersion } from "@/components/db-provider";
import Link from "next/link";
import { requireRole } from "@/components/shell";
import { UpgradShell } from "@/components/upgrad-shell";
import {
  IconCalendar,
  IconCap,
  IconCheck,
  IconClock,
  IconDoc,
  IconSignature,
} from "@/components/ui";
import {
  getDocuments,
  getLearnerDocs,
  getOfferLetter,
  getPrograms,
  listApplications,
} from "@/lib/queries";
import { learnerStatus } from "@/lib/domain";
import { docRows } from "@/lib/documents";

/**
 * My applications → Applications: the card the learner lands on — the v2
 * capture's application card, rebuilt in this side's own design language.
 * The status story lives OUT HERE on the card; clicking through opens the
 * application itself (progress, details, the review walk).
 */
export default function LearnerApplicationsList() {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("learner");
  const apps = listApplications({ learnerId: user.id });

  return (
    <UpgradShell user={user} section="application" appId={apps[0]?.id ?? null}>
      <h1 className="text-[28px] font-medium tracking-tight">
        My applications
      </h1>

      {apps.length === 0 ? (
        <div className="card mt-5 px-6 py-10 text-center text-[15px] text-body">
          No application yet — your academic counsellor will set one up with
          you on a call.
        </div>
      ) : (
        apps.map((app) => {
          const programme = getPrograms(app.id).filter(
            (p) => p.shortlisted
          )[0];
          const docs = getDocuments(app.id);
          const offer = getOfferLetter(app.id);
          const locker = docRows(getLearnerDocs(app.id));
          const certified = Boolean(app.certified_at);
          const status = learnerStatus(app.status, certified);

          const toSign = docs.filter((d) => !d.signed_at).length;
          const signed = docs.length - toSign;
          const missingUploads = locker.filter(
            (r) => !r.filename && !r.optional
          ).length;
          const docsLine =
            app.status === "shortlisted" && !certified && toSign > 0
              ? `${toSign} to sign`
              : missingUploads > 0 && app.status !== "completed"
                ? `${missingUploads} to upload`
                : "All in";
          const docsUrgent = docsLine !== "All in";

          return (
            <div key={app.id} className="card mt-5 overflow-hidden">
              <div className="p-6">
                <div className="flex gap-6">
                  {/* The reference card's structure, exactly: graphic on the
                      LEFT — a landscape tile — info stacked on the right. */}
                  <div className="flex h-[150px] w-[220px] shrink-0 items-center justify-center rounded-xl bg-cream text-body">
                    <IconCap className="h-10 w-10" />
                  </div>

                  {/* Title, then label:value rows, then the CTA — the old
                      card's structure, kept deliberately. */}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-[19px] font-medium leading-snug">
                      {programme ? programme.name : "Your application"}
                    </h2>
                    {programme && (
                      <p className="mt-0.5 text-[13.5px] text-body">
                        {programme.institute}
                      </p>
                    )}

                    <div className="mt-4 space-y-2.5 text-[13.5px]">
                      <span className="flex items-center gap-2 text-body">
                        <IconClock className="h-4 w-4 shrink-0 text-caption" />
                        Application status:{" "}
                        <b
                          className={`font-semibold ${
                            status.label === "Action needed"
                              ? "text-accent"
                              : status.label === "Completed"
                                ? "text-[#3f6c45]"
                                : "text-ink"
                          }`}
                        >
                          {status.label}
                        </b>
                      </span>
                      <span className="flex items-center gap-2 text-body">
                        <IconSignature className="h-4 w-4 shrink-0 text-caption" />
                        Document status:{" "}
                        <b
                          className={`font-semibold ${
                            docsUrgent ? "text-accent" : "text-[#3f6c45]"
                          }`}
                        >
                          {docsLine}
                        </b>
                      </span>
                      <span className="flex items-center gap-2 text-body">
                        <IconDoc className="h-4 w-4 shrink-0 text-caption" />
                        Counsellor:{" "}
                        <b className="font-semibold text-ink">
                          {app.ac_name ?? "—"}
                        </b>
                      </span>
                      <span className="flex items-center gap-2 text-body">
                        <IconCalendar className="h-4 w-4 shrink-0 text-caption" />
                        Last updated:{" "}
                        <b className="font-semibold text-ink">
                          {app.updated_at.slice(0, 10)}
                        </b>
                      </span>
                    </div>

                    <div className="mt-5">
                      <Link
                        href={`/learner/application/${app.id}`}
                        className="btn-primary"
                      >
                        View application
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* Available documents — the strip from the site's own card. */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper px-6 py-3.5">
                <span className="text-[13.5px] font-medium text-body">
                  Available documents
                </span>
                {offer || signed > 0 ? (
                  <span className="flex flex-wrap items-center gap-4 text-[13px]">
                    {offer && (
                      <Link
                        href={`/learner/application/${app.id}`}
                        className="flex items-center gap-1.5 font-medium text-accent hover:underline"
                      >
                        <IconCheck className="h-3.5 w-3.5" />
                        Offer letter
                      </Link>
                    )}
                    {signed > 0 && (
                      <Link
                        href={`/learner/application/${app.id}`}
                        className="font-medium text-body hover:text-ink hover:underline"
                      >
                        {signed} signed document{signed === 1 ? "" : "s"}
                      </Link>
                    )}
                  </span>
                ) : (
                  <span className="text-[13px] text-caption">None yet</span>
                )}
              </div>
            </div>
          );
        })
      )}
    </UpgradShell>
  );
}
