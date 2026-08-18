"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Opening an application is a user action, not a render.
 *
 * Doing it during render looked fine until a router refetch (`?_rsc=`) or a
 * revalidatePath re-rendered a page nobody was looking at — which quietly put
 * a learner into vetting and logged a "recently opened" that never happened.
 * Header sniffing can't fix it: a real click and a background refetch are both
 * RSC GETs. An effect only runs in a real browser, on a real navigation.
 */
export function OpenApplication({
  action,
  /** Set when the open changes what's on screen, e.g. vetting starts. */
  refresh = false,
}: {
  action: () => Promise<void>;
  refresh?: boolean;
}) {
  const router = useRouter();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return; // StrictMode double-invokes effects in dev
    fired.current = true;
    action().then(() => {
      if (refresh) router.refresh();
    });
  }, [action, refresh, router]);

  return null;
}
