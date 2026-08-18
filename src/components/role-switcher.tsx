"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconUsers } from "./ui";
import {
  resetDemoData,
  toggleActivityView,
  toggleLearnerView,
} from "@/lib/actions";

const ACCOUNTS = [
  {
    key: "ac",
    email: "academic@upgrad.com",
    name: "Arjun Mehta",
    role: "Academic Counsellor",
    sees: "All seven learners, one per state",
  },
  {
    key: "ops",
    email: "ops@upgrad.com",
    name: "Omar Khan",
    role: "Ops Team",
    sees: "The vetting pipeline",
  },
  {
    key: "learner",
    email: "learner@upgrad.com",
    name: "Neha Gupta",
    role: "Learner",
    sees: "Shortlisted, ready to sign and certify",
  },
  {
    key: "admin",
    email: "admin@upgrad.com",
    name: "Asha Sharma",
    role: "Admin",
    sees: "Users and role assignment",
  },
];

/**
 * Prototype-only: hop between roles without signing out and back in, so the
 * same application can be seen from every side. Sits clear of the sticky
 * action bars rather than on top of their primary buttons.
 */
export function RoleSwitcher({
  currentRole,
  activityInline,
  learnerV2 = false,
}: {
  currentRole: string;
  /** Which of the two activity presentations is currently showing. */
  activityInline: boolean;
  /** Learner experience: false = redesigned flow, true = current-site v2. */
  learnerV2?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <>
      {open && (
        <div
          className="fixed inset-0 z-[70]"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div className="fixed bottom-24 right-6 z-[71] flex flex-col items-end gap-2">
        {open && (
          <div className="w-[19rem] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_28px_60px_-18px_rgba(49,48,43,0.4)]">
            <div className="border-b border-line px-4 py-2.5">
              <div className="text-[12.5px] font-semibold text-ink">
                View as
              </div>
              <div className="text-[11.5px] text-caption">
                Prototype shortcut — switches account instantly
              </div>
            </div>
            {ACCOUNTS.map((a) => {
              const active = a.key === currentRole;
              return (
                <a
                  key={a.email}
                  href={`/dev-login?email=${encodeURIComponent(a.email)}`}
                  className={`flex items-start gap-2.5 px-4 py-2.5 transition-colors ${
                    active ? "bg-cream/60" : "hover:bg-muted"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                      active ? "bg-ink text-paper" : "text-transparent"
                    }`}
                  >
                    <IconCheck className="h-2.5 w-2.5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium text-ink">
                      {a.role}
                    </span>
                    <span className="block text-[11.5px] text-caption">
                      {a.name} · {a.sees}
                    </span>
                  </span>
                </a>
              );
            })}

            <form action={resetDemoData} className="border-t border-line">
              <button className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-muted">
                <span className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-ink">
                    Reset demo data
                  </span>
                  <span className="block text-[11.5px] text-caption">
                    Put every learner back to their starting state
                  </span>
                </span>
              </button>
            </form>

            {/* Which learner experience the demo shows. Off = the redesigned
                Shortlisting flow; on = v2, built on the site's current
                My Applications pages with our flows mixed in. */}
            <form action={toggleLearnerView} className="border-t border-line">
              <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-muted">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink">
                    My Applications v2
                  </span>
                  <span className="block text-[11.5px] text-caption">
                    {learnerV2
                      ? "On — the site's current flow, list + tabs"
                      : "Off — showing the redesigned flow"}
                  </span>
                </span>
                <span
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    learnerV2 ? "bg-ink" : "bg-line-strong"
                  }`}
                  aria-hidden
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                      learnerV2 ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
            </form>

            {/* Two presentations of the same activity log, side by side for
                comparison. Off takes the timeline out of the layout entirely
                and puts it behind a button that fans out from the right. */}
            <form action={toggleActivityView} className="border-t border-line">
              <button className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-muted">
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink">
                    Activity timeline
                  </span>
                  <span className="block text-[11.5px] text-caption">
                    {activityInline
                      ? "Shown in the right column"
                      : "Hidden — opens from a button instead"}
                  </span>
                </span>
                {/* Switch, so the state reads at a glance rather than as prose */}
                <span
                  className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                    activityInline ? "bg-ink" : "bg-line-strong"
                  }`}
                  aria-hidden
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
                      activityInline ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </span>
              </button>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Switch role"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper shadow-[0_18px_36px_-10px_rgba(49,48,43,0.55)] transition-transform hover:scale-105"
        >
          <IconUsers className="h-5 w-5" />
        </button>
      </div>
    </>,
    document.body
  );
}
