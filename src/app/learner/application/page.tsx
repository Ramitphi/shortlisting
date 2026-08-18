"use client";

import { useDbVersion } from "@/components/db-provider";
import { redirect } from "next/navigation";
import { requireRole } from "@/components/shell";
import { listApplications } from "@/lib/queries";


/**
 * A learner only ever has one application, so a list of one is just a step in
 * the way. This exists so the sidebar has a stable href and opens it directly.
 */
export default function MyApplicationRedirect() {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("learner");
  const [app] = listApplications({ learnerId: user.id });
  if (!app) redirect("/learner");
  redirect(`/learner/application/${app.id}`);
}
