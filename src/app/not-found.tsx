"use client";

import { StateScreen } from "@/components/ui/state-screen";
import { STATE_COPY } from "@/components/ui/state-copy";
import { getCurrentUser } from "@/lib/auth";
import { roleHome } from "@/lib/domain";

/**
 * Where every notFound() and every mistyped URL lands. Renders inside the
 * root layout, so the database is already open and we know who is looking —
 * which is what turns a dead end into a way back to their own desk.
 */
export default function NotFound() {
  const user = getCurrentUser();
  const home = user ? roleHome(user.role) : "/login";
  return (
    <StateScreen
      kind="not-found"
      title={STATE_COPY["not-found"].title}
      bigTitle={STATE_COPY["not-found"].bigTitle}
      body={STATE_COPY["not-found"].body}
      actions={[
        { label: user ? "Back to my desk" : "Sign in", href: home, primary: true },
      ]}
    />
  );
}
