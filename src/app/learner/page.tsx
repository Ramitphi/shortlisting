"use client";

import { useDbVersion } from "@/components/db-provider";
import { redirect } from "next/navigation";
import { requireRole } from "@/components/shell";
import { UpgradShell } from "@/components/upgrad-shell";
import { learnerView } from "@/lib/auth";
import { listApplications } from "@/lib/queries";


/**
 * The learner's landing point, dispatched by the FAB's version toggle:
 * v1 lands on the redesigned application page, v2 on the site's current
 * My Applications list. They have exactly one application, so home IS that
 * application — no dashboard in between.
 */
export default function LearnerHome() {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("learner");
  const app = listApplications({ learnerId: user.id })[0];
  if (learnerView() === "v2") redirect("/learner/applications");
  if (app) redirect(`/learner/application/${app.id}`);

  return (
    <UpgradShell user={user} section="application" appId={null}>
      <h1 className="text-[28px] font-medium tracking-tight">Shortlisting</h1>
      <div className="card mt-5 px-6 py-10 text-center text-[15px] text-body">
        No application yet — your academic counsellor will set one up with you
        on a call.
      </div>
    </UpgradShell>
  );
}
