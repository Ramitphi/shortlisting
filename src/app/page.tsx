"use client";

import { useDbVersion } from "@/components/db-provider";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/domain";

export default function Home() {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = getCurrentUser();
  if (!user) redirect("/login");
  redirect(roleHome(user.role));
}
