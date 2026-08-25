"use client";

import { useState } from "react";
import { Timeline } from "./parts";
import type { AppEvent } from "@/lib/queries";

/**
 * The activity timeline, cut to a readable height.
 *
 * A full history runs to dozens of entries on any application that has been
 * worked, and rendering it all made the rail a column that scrolled forever —
 * the recent activity (the only part anyone reads in passing) drowned in the
 * archive. The first handful shows; one "See all" opens the rest, all of it
 * at once — a second click for a second slice would just be a slower scroll.
 */
export function CappedTimeline({
  events,
  pending,
  limit = 6,
}: {
  events: AppEvent[];
  pending?: string | null;
  /** How many of the newest entries show before the fold. */
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? events : events.slice(0, limit);
  const hidden = events.length - shown.length;

  return (
    <>
      <Timeline events={shown} pending={pending} />
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 w-full rounded-lg py-1.5 text-center text-[12.5px] font-medium text-body transition-colors hover:bg-muted hover:text-ink"
        >
          See all {events.length} events
        </button>
      )}
      {expanded && events.length > limit && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mt-1 w-full rounded-lg py-1.5 text-center text-[12.5px] font-medium text-caption transition-colors hover:bg-muted hover:text-ink"
        >
          Show less
        </button>
      )}
    </>
  );
}
