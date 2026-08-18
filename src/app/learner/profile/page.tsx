"use client";

import { useDbVersion } from "@/components/db-provider";
import { requireRole } from "@/components/shell";
import { UpgradShell } from "@/components/upgrad-shell";
import { getFormResponses, listApplications } from "@/lib/queries";
import { updateLearnerDetails } from "@/lib/actions";
import { ProfileSectionCards } from "../profile-cards";


/**
 * Profile → Personal details. The cards themselves live in ProfileSectionCards
 * and are shared with the v2 application's Personal Details tab — this page
 * only supplies the shell and the edit-mode URL.
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
  const locked = !app || app.status === "completed";
  const editing = !locked ? searchParams.edit : undefined;

  return (
    <UpgradShell user={user} section="profile" appId={app?.id ?? null}>
      <h1 className="text-[28px] font-medium tracking-tight">Profile</h1>

      {!app ? (
        <div className="card mt-5 px-6 py-10 text-center text-[15px] text-body">
          Your profile fills in once your academic counsellor sets up your
          application with you on a call.
        </div>
      ) : (
        <ProfileSectionCards
          responses={responses}
          locked={locked}
          editing={editing}
          hrefFor={(section) =>
            section
              ? `/learner/profile?edit=${encodeURIComponent(section)}`
              : "/learner/profile"
          }
          action={updateLearnerDetails.bind(null, app.id)}
        />
      )}
    </UpgradShell>
  );
}
