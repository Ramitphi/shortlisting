"use client";

import { useDbVersion } from "@/components/db-provider";
import { requireRole } from "@/components/shell";
import { UpgradShell } from "@/components/upgrad-shell";
import { DocumentTable } from "@/components/ui";
import { getLearnerDocs, listApplications } from "@/lib/queries";
import { DOC_CATEGORIES, learnerCanSeeApplication } from "@/lib/domain";
import { docRows } from "@/lib/documents";
import {
  removeLearnerDoc,
  uploadLearnerDoc,
  verifyLearnerDoc,
} from "@/lib/actions";

/**
 * Documents — a section of the site, not a tab inside the application.
 *
 * The learner's papers are theirs, not the application's: they are collected
 * before there is anything to see, they are asked for again after it closes,
 * and they outlive whichever programme they were first attached to. So the
 * left nav reaches them directly and the application no longer carries a
 * documents tab. The table itself is unchanged — same rows, same rules.
 */
export default function LearnerDocumentsPage() {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("learner");
  const app = listApplications({ learnerId: user.id })[0];

  // Before the first shortlist nothing of the application reaches the
  // learner — including what it is holding. The counsellor collected these
  // on the call and is the route until then.
  if (!app || !learnerCanSeeApplication(app.status)) {
    return (
      <UpgradShell user={user} section="documents" appId={app?.id ?? null}>
        <h1 className="text-[28px] font-medium tracking-tight">My documents</h1>
        <div className="card mt-5 px-6 py-10 text-center">
          <p className="text-[15px] text-body">
            Nothing to show here yet.
          </p>
          <p className="mx-auto mt-1.5 max-w-[420px] text-[13.5px] text-caption">
            Your academic counsellor collects your documents on the call.
            They&rsquo;ll appear here once your application is ready for you.
          </p>
        </div>
      </UpgradShell>
    );
  }

  const locker = docRows(getLearnerDocs(app.id));
  const locked = app.status === "completed";
  // Rejected counts as outstanding — the learner has been asked to replace it.
  const missing = locker.filter(
    (r) => (!r.filename || r.verification === "rejected") && !r.optional
  ).length;

  return (
    <UpgradShell user={user} section="documents" appId={app.id}>
      <div className="flex flex-wrap items-baseline gap-2">
        <h1 className="text-[28px] font-medium tracking-tight">My documents</h1>
        {missing > 0 && !locked && (
          <span className="text-[13.5px] font-medium text-accent">
            ({missing} document{missing === 1 ? "" : "s"} missing)
          </span>
        )}
      </div>
      <p className="mt-1 text-[14px] text-body">
        {locked
          ? "Everything on file for your application."
          : "Upload anything still missing. We'll check each one and let you know if we need it again."}
      </p>

      <div className="card mt-5 p-6">
        <DocumentTable
          rows={locker}
          categories={DOC_CATEGORIES}
          canUpload={!locked}
          canVerify={false}
          upload={uploadLearnerDoc.bind(null, app.id)}
          remove={removeLearnerDoc.bind(null, app.id)}
          verify={verifyLearnerDoc.bind(null, app.id)}
          note={locked ? "Your application is complete." : undefined}
        />
      </div>
    </UpgradShell>
  );
}
