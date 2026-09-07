"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { StateScreen } from "@/components/ui/state-screen";
import { STATE_COPY } from "@/components/ui/state-copy";

/**
 * The boundary AuthBoundary deliberately isn't. A throw during render lands
 * here instead of replacing the whole document with Next's white screen.
 * The demo database survives (it lives above this boundary), so "Try again"
 * genuinely retries — it is not a reload.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  // A signed-out visitor, or a learner who typed an Ops URL, reaches a page
  // that throws an AuthRedirect on purpose — a routing instruction, not a
  // crash. This boundary sits BELOW the one that handles those, so without
  // this it would catch them first and show a stranger an apology for a
  // redirect that was working correctly.
  const redirectTo =
    typeof error?.message === "string" && error.message.startsWith("redirect:")
      ? error.message.slice("redirect:".length)
      : null;

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
      return;
    }
    // eslint-disable-next-line no-console
    console.error("Route error", error);
  }, [error, redirectTo, router]);

  // Nothing to apologise for while the redirect is in flight.
  if (redirectTo) return null;

  return (
    <StateScreen
      kind="crashed"
      title={STATE_COPY.crashed.title}
      bigTitle={STATE_COPY.crashed.bigTitle}
      body={STATE_COPY.crashed.body}
      actions={[
        { label: "Try again", onClick: reset, primary: true },
        { label: "Go to the start", href: "/" },
      ]}
    />
  );
}
