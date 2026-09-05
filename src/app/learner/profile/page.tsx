"use client";

import { useDbVersion } from "@/components/db-provider";
import Link from "next/link";
import { requireRole } from "@/components/shell";
import { UpgradShell } from "@/components/upgrad-shell";
import { getFormResponses, listApplications } from "@/lib/queries";
import { learnerCanSeeApplication } from "@/lib/domain";
import { updateLearnerDetails } from "@/lib/actions";
import { ProfileSectionCards } from "../profile-cards";


/**
 * Profile → Personal details, READ-ONLY. Editing is application-specific
 * (My applications → My details) — the PM's call: the profile page shows
 * what is on file, the application is where it changes.
 */
export default function LearnerProfilePage() {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("learner");
  const app = listApplications({ learnerId: user.id })[0];
  const responses = app ? getFormResponses(app.id) : {};

  return (
    <UpgradShell user={user} section="profile" appId={app?.id ?? null}>
      <h1 className="text-[28px] font-medium tracking-tight">Profile</h1>

      {!app ? (
        <div className="card mt-5 px-6 py-10 text-center text-[15px] text-body">
          Your profile fills in once your academic counsellor sets up your
          application with you on a call.
        </div>
      ) : (
        <>
          {/* Their own details stay readable throughout — this is the
              learner's personal data, not the application. But until the
              application is theirs to see, there is nowhere to send them to
              change it, so the counsellor is the route. */}
          {learnerCanSeeApplication(app.status) ? (
            <p className="mt-1 text-[14px] text-body">
              To change anything here, edit it inside{" "}
              <Link
                href={`/learner/application/${app.id}`}
                className="font-medium text-accent hover:underline"
              >
                your application
              </Link>
              .
            </p>
          ) : (
            <p className="mt-1 text-[14px] text-body">
              To change anything here, speak to your academic counsellor.
            </p>
          )}
          <ProfileSectionCards
            responses={responses}
            locked
            hrefFor={() =>
              learnerCanSeeApplication(app.status)
                ? `/learner/application/${app.id}`
                : "/learner/application"
            }
            action={updateLearnerDetails.bind(null, app.id)}
          />
        </>
      )}
    </UpgradShell>
  );
}
