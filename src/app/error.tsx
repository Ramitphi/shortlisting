"use client";

import { useEffect } from "react";
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
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Route error", error);
  }, [error]);

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
