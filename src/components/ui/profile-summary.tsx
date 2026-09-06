"use client";

import { SectionCard } from "./section-card";
import { IconClipboardFill } from "./icons";
import {
  summaryGroups,
  summaryNarrative,
  summarySkipped,
} from "./profile-summary-data";
import {
  ViewCompact,
  ViewJourney,
  ViewKeyFacts,
  ViewLedger,
  ViewOneTap,
  ViewOpenSheet,
  ViewOverview,
  type ViewProps,
} from "./profile-summary-views";
import { profileVariant } from "@/lib/auth";
import type { ProfileVariant } from "@/lib/domain";

/**
 * What we know about the learner — its own card in the stack, ahead of the
 * programme sections, because both the counsellor and Ops are about to decide
 * which programme to put in front of this person and that decision is only as
 * good as the profile behind it.
 *
 * The question set comes from the eligibility sheet, and the sheet asks
 * different things depending on what the learner is going for (see
 * profile-summary-data). How much of it is visible at rest is the open
 * question — so the reading is switchable from the demo FAB, and every view
 * renders the same resolved answers.
 */

const VIEWS: Record<ProfileVariant, (p: ViewProps) => JSX.Element> = {
  v1: ViewSections,
  v2: ViewOneTap,
  v3: ViewOverview,
  v4: ViewOpenSheet,
  v5: ViewKeyFacts,
  v6: ViewLedger,
  v7: ViewJourney,
  v8: ViewCompact,
};

/** The disclosure arrow — points right when shut, down when open. */
function Caret() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0 text-caption transition-transform duration-150 group-open/block:rotate-90"
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

/**
 * v1 — what shipped. Every block collapses; the first is open. Ops and the
 * counsellor come here for one or two answers at a time, so the card stays
 * small until asked. The complaint that produced the other views is that a
 * summary you have to open is not a summary.
 */
function ViewSections({ groups, skipped }: ViewProps) {
  return (
    <>
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {groups.map((g, i) => (
          <details
            key={g.id}
            open={i === 0}
            className="group/block bg-white open:bg-paper/40"
          >
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 text-[13.5px] font-semibold text-ink">
                {g.title}
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-2.5">
                <span className="text-[11.5px] text-caption">
                  {g.onFile} of {g.facts.length}
                </span>
                <Caret />
              </span>
            </summary>
            <div className="grid gap-x-5 gap-y-3.5 border-t border-line px-4 pb-4 pt-3.5 sm:grid-cols-3">
              {g.facts.map((f) => (
                <div key={f.key} className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                    {f.label}
                  </div>
                  <div
                    className={`mt-0.5 break-words text-[13.5px] ${
                      f.value ? "font-medium text-ink" : "text-caption"
                    }`}
                  >
                    {f.value || "Not on file"}
                  </div>
                  {f.note && (
                    <div className="mt-0.5 text-[12px] text-caption">
                      {f.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
      {skipped.length > 0 && (
        <p className="mt-2.5 text-[12px] text-caption">
          {skipped.join(", ")} {skipped.length === 1 ? "is" : "are"} not asked
          on this application.
        </p>
      )}
    </>
  );
}

export function ProfileSummary({
  responses,
  learnerName,
}: {
  responses: Record<string, string>;
  learnerName?: string | null;
}) {
  const View = VIEWS[profileVariant()] ?? ViewSections;
  return (
    <SectionCard
      id="profile-summary"
      className="fade-up"
      icon={<IconClipboardFill />}
      title="Profile summary"
      subtitle={`What is on file for ${learnerName ?? "this learner"} before a programme is recommended.`}
    >
      <View
        groups={summaryGroups(responses)}
        skipped={summarySkipped(responses)}
        narrative={summaryNarrative(responses, learnerName)}
        learnerName={learnerName}
      />
    </SectionCard>
  );
}
