"use client";

import { useDbVersion } from "@/components/db-provider";
import { LoginForm } from "./login-form";


export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  return <LoginForm error={Boolean(searchParams.error)} />;
}
