"use client";

import { useDbVersion } from "@/components/db-provider";
import { requireRole } from "@/components/shell";
import { UpgradShell } from "@/components/upgrad-shell";
import { getFormResponses, listApplications } from "@/lib/queries";
import { learnerCanSeeApplication } from "@/lib/domain";
import { updateLearnerDetails } from "@/lib/actions";
import { ProfileSectionCards } from "../profile-cards";


/**
 * Profile → Personal details, edited HERE.
 *
 * It used to be read-only, pointing at the application for every change:
 * "to change anything here, edit it inside your application". That made the
 * learner's own name and phone number a thing they had to open an
 * application to correct — and the page they landed on then asked them to
 * re-read and re-certify a form, to fix a typo in their mobile.
 *
 * So the section edits in place, on the same per-section form the application
 * uses. The consequence is unchanged and deliberate: `updateLearnerDetails`
 * still sends the change back for a re-check, because these are the answers
 * the undertakings certify — it does not matter which screen they were
 * changed on.
 *
 * Two things still hold it shut: a completed application (nothing moves after
 * the offer) and the period before the first shortlist, when the counsellor
 * is collecting the details and is the route for changing them.
 */
export default function LearnerProfilePage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("learner");
  const app = listApplications({ learnerId: user.id })[0];
  const responses = app ? getFormResponses(app.id) : {};

  const visible = app ? learnerCanSeeApplication(app.status) : false;
  const locked = !app || !visible || app.status === "completed";

  return (
    <UpgradShell user={user} section="profile" appId={app?.id ?? null}>
      <h1 className="text-[28px] font-medium tracking-tight">My profile</h1>

      {!app ? (
        <div className="card mt-5 px-6 py-10 text-center text-[15px] text-body">
          Your profile fills in once your academic counsellor sets up your
          application with you on a call.
        </div>
      ) : (
        <>
          {/* Only said when it is NOT editable — an instruction about how to
              change something, on a page where you can just change it, is
              noise. */}
          {locked && (
            <p className="mt-1 text-[14px] text-body">
              {app.status === "completed"
                ? "Your application is complete — these are view only."
                : "To change anything here, speak to your academic counsellor."}
            </p>
          )}
          {/* Personal details ONLY. This is the site's personal-details page;
              the academic and financing answers belong to the application,
              and that is where they are read and changed. */}
          <ProfileSectionCards
            responses={responses}
            locked={locked}
            editing={locked ? undefined : searchParams.edit}
            sections={["Profile Data"]}
            /* Only what is theirs to correct. Name, date of birth, degree and
               countries were established on the call and checked against
               documents; those move through the counsellor, not quietly from
               here. Email and phone are contact details — if they change, the
               learner is the one who knows. */
            editableKeys={["email", "mobile"]}
            hrefFor={(sec) =>
              sec
                ? `/learner/profile?edit=${encodeURIComponent(sec)}`
                : "/learner/profile"
            }
            action={updateLearnerDetails.bind(null, app.id)}
          />
        </>
      )}
    </UpgradShell>
  );
}
