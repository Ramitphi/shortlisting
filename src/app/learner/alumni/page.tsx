"use client";

import { useDbVersion } from "@/components/db-provider";
import { requireRole } from "@/components/shell";
import { UpgradShell } from "@/components/upgrad-shell";
import { instituteInitials } from "@/components/ui";
import { listApplications } from "@/lib/queries";
import { ALUMNI } from "@/lib/showcase";

/**
 * Alumni — the repository, as a grid.
 *
 * The site's own alumni-connect page is a wall of people you can scan: face,
 * name, what they read, where, and the two facts you filter on — country and
 * level. This is that, rebuilt in this side's design so it sits inside the
 * shell rather than throwing the learner out to the marketing site.
 *
 * The records live in lib/showcase.ts — the dashboard shows the first few of
 * them, and two copies of the same list is how they drift apart. The LinkedIn
 * mark is a badge on the card, not a link to an account. The real repository
 * is a page on the main site, and the header's CTA goes there.
 */

/** The live alumni repository on upgrad.com. */
const ALUMNI_URL = "https://www.upgrad.com/study-abroad/alumni-connect/";


/** The site's badge: a circle of initials, LinkedIn mark clipped to its edge. */
function Avatar({ name }: { name: string }) {
  return (
    <div className="relative">
      <span className="flex h-[92px] w-[92px] items-center justify-center rounded-full bg-muted text-[24px] font-medium text-body">
        {instituteInitials(name)}
      </span>
      <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#0a66c2] text-white">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
          <path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9.5h4v11H3v-11Zm6.5 0h3.8v1.5h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.5 4.78 5.75v5.7h-4v-5.05c0-1.2-.02-2.75-1.8-2.75-1.8 0-2.07 1.3-2.07 2.66v5.14h-4v-11Z" />
        </svg>
      </span>
      <span className="sr-only">LinkedIn profile</span>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md bg-muted px-3 py-1.5 text-[13px] text-body">
      {children}
    </span>
  );
}

export default function LearnerAlumniPage() {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("learner");
  // The shell's counsellor card needs the application, even though this page
  // has nothing to do with it.
  const app = listApplications({ learnerId: user.id })[0];

  return (
    <UpgradShell user={user} section="alumni" appId={app?.id ?? null}>
      {/* The CTA sits level with the title, not under the copy — it is the
          way OUT of this preview and into the full repository, so it reads as
          a peer of the heading rather than a step in the page. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-medium tracking-tight">Alumni</h1>
        <a
          href={ALUMNI_URL}
          target="_blank"
          rel="noreferrer"
          className="btn-primary shrink-0"
        >
          Visit alumni page
        </a>
      </div>
      <p className="mt-1 text-[14px] text-body">
        upGrad learners who have already made the move. Find someone who read
        what you are about to read, where you are about to read it.
      </p>

      {/* An auto-fill track, NOT `grid-cols-1 sm:grid-cols-2`. The site's own
          stylesheet loads after Tailwind's and defines a bare `.grid-cols-1`,
          which beats `sm:grid-cols-2` on equal specificity — every card ended
          up full width. An arbitrary track has no counterpart in that sheet
          to lose to, and it reflows without breakpoints. */}
      {/* The grid scrolls, the page does not: the header, the count and the
          CTA stay put while the wall moves under them. The scrollbar itself
          is hidden (see .scroll-quiet) — the half-row showing at the bottom
          edge is what says there is more. */}
      <div className="scroll-quiet mt-6 max-h-[620px] overflow-y-auto">
        <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
          {ALUMNI.map((a) => (
            <div
              key={a.name}
              className="card flex flex-col items-center px-5 py-7 text-center"
            >
              <Avatar name={a.name} />

              <h2 className="mt-4 text-[16px] font-medium leading-snug">
                {a.name}
              </h2>
              {/* Fixed height so the university rows line up across a row of
                  cards — programme names run to one line or three. */}
              <p className="mt-1.5 min-h-[44px] text-[14px] leading-snug text-body">
                {a.programme}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-[10px] font-semibold text-body">
                  {instituteInitials(a.university)}
                </span>
                <span className="text-[13px] uppercase tracking-wide text-ink">
                  {a.university}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Chip>{a.country}</Chip>
                <Chip>{a.degree}</Chip>
              </div>
            </div>
          ))}
        </div>
      </div>
    </UpgradShell>
  );
}
