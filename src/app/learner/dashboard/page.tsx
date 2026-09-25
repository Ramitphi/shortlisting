"use client";

import { useRef } from "react";
import Link from "next/link";
import { useDbVersion } from "@/components/db-provider";
import { requireRole } from "@/components/shell";
import { UpgradShell } from "@/components/upgrad-shell";
import { instituteInitials } from "@/components/ui";
import { listApplications } from "@/lib/queries";
import { DESTINATIONS, UNIVERSITIES } from "@/lib/showcase";

/**
 * The learner's dashboard — the browsing half of their side.
 *
 * Everything else in this nav is their own application: what they filled in,
 * what they signed, where they are. This is the other thing upgrad.com does
 * for them — universities to look at, countries to consider, people who have
 * already gone. It is rails of cards, the way the live site presents them,
 * and it is deliberately not personalised: nothing here depends on the state
 * of their application, so it reads the same on day one as on day ninety.
 *
 * Successful learners are NOT here: that wall is its own nav entry, and a
 * second, shorter copy of it on the page above only split the same content
 * across two places.
 */

/** A horizontally scrolling row with its own arrows and no scrollbar. */
function Rail({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  // A card and its gap. Paging by a fixed amount rather than by element keeps
  // the arrows honest when the cards are different widths.
  const page = (dir: -1 | 1) =>
    ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

  const arrow =
    "absolute top-1/2 z-10 flex h-[40px] w-[40px] -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-body shadow-[0_2px_10px_rgba(0,0,0,0.12)] transition-colors hover:bg-muted hover:text-ink";

  return (
    <div className="relative">
      <div
        ref={ref}
        className="scroll-quiet flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-1"
      >
        {children}
      </div>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => page(-1)}
        className={`${arrow} -left-3`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <path d="m14.5 6-6 6 6 6" />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => page(1)}
        className={`${arrow} -right-3`}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <path d="m9.5 6 6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}

function RailHeading({
  title,
  href,
}: {
  title: string;
  /** "View all" only exists where there is somewhere to go. */
  href?: string;
}) {
  return (
    <div className="mb-4 mt-10 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-[22px] font-medium tracking-tight">{title}</h2>
      {href && (
        <Link
          href={href}
          className="flex items-center gap-1 text-[13px] font-semibold uppercase tracking-wide text-body hover:text-ink"
        >
          View all
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="m9.5 6 6 6-6 6" />
          </svg>
        </Link>
      )}
    </div>
  );
}

export default function LearnerDashboardPage() {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("learner");
  const app = listApplications({ learnerId: user.id })[0];
  const firstName = user.name.split(" ")[0];

  return (
    <UpgradShell user={user} section="dashboard" appId={app?.id ?? null}>
      <h1 className="text-[28px] font-medium tracking-tight">
        Hello, {firstName}
      </h1>
      <p className="mt-1 text-[14px] text-body">
        Universities, destinations and people to look at while your application
        is with us.
      </p>

      {/* ── Universities ── */}
      <RailHeading title="View Popular University" />
      <Rail>
        {UNIVERSITIES.map((u) => (
          <div
            key={u.name}
            className="card flex w-[220px] shrink-0 snap-start flex-col items-center px-5 py-6 text-center"
          >
            {/* No logos ship with the prototype, so the crest is initials. */}
            <span className="flex h-[64px] w-[64px] items-center justify-center rounded-xl border border-line bg-white text-[18px] font-semibold text-body">
              {instituteInitials(u.name)}
            </span>
            <h3 className="mt-4 min-h-[44px] text-[15px] font-medium leading-snug">
              {u.name}
            </h3>
            <span className="mt-2 truncate rounded-full bg-[#f6efdd] px-3 py-1.5 text-[12.5px] text-[#8a6d2f]">
              {u.rank}
            </span>
            <span className="mt-4 text-[14px] font-medium text-accent">
              View courses
            </span>
          </div>
        ))}
      </Rail>

      {/* ── Destinations ── */}
      <RailHeading title="Popular Study Abroad Destinations" />
      <Rail>
        {DESTINATIONS.map((d) => (
          <div
            key={d.country}
            className="relative flex h-[200px] w-[230px] shrink-0 snap-start items-end overflow-hidden rounded-2xl"
            style={{ background: d.sky }}
          >
            {/* A wash at the foot so the words hold whatever is behind them —
                a gradient today, a photograph the day there is one. */}
            <div className="w-full bg-gradient-to-t from-black/55 to-transparent px-5 pb-4 pt-10">
              <div className="text-[14px] text-white/90">Study in</div>
              <div className="text-[24px] font-semibold leading-tight text-white">
                {d.country}
              </div>
            </div>
          </div>
        ))}
      </Rail>

    </UpgradShell>
  );
}
