"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconUsers } from "./ui";
import {
  resetDemoData,
  setRecheckVariantAction,
  setUndertakingVariantAction,
  toggleActivityView,
  toggleLearnerView,
} from "@/lib/actions";
import { LEARNER_V2_ENABLED, recheckView, undertakingVariant } from "@/lib/auth";
import { dbReady, getDb } from "@/lib/db";
import {
  RECHECK_VARIANT_META,
  STATUS_LABELS,
  UNDERTAKING_VARIANT_META,
  type AppStatus,
} from "@/lib/domain";

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
  currentEmail,
  activityInline,
  learnerV2 = false,
}: {
  currentRole: string;
  /** Signed-in user's email — highlights the matching learner case. */
  currentEmail?: string;
  /** Which of the two activity presentations is currently showing. */
  activityInline: boolean;
  /** Learner experience: false = redesigned flow, true = current-site v2. */
  learnerV2?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  // Every seeded learner, each parked at a different journey state — so the
  // learner side can be walked in ANY state, not just Neha's. The database
  // lives in this browser, so the FAB can just ask it.
  const learnerCases = dbReady()
    ? (getDb()
        .prepare(
          `SELECT u.email, u.name, a.id AS appId, a.status
           FROM users u LEFT JOIN applications a ON a.learner_id = u.id
           WHERE u.role = 'learner' ORDER BY a.id`
        )
        .all() as {
        email: string;
        name: string;
        appId: number | null;
        status: AppStatus | null;
      }[])
    : [];

  const caseHref = (l: (typeof learnerCases)[number]) =>
    `/dev-login?email=${encodeURIComponent(l.email)}&next=%2Flearner`;

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
          <div className="max-h-[calc(100dvh-11rem)] w-[19rem] overflow-y-auto overflow-x-hidden rounded-2xl border border-line bg-white shadow-[0_28px_60px_-18px_rgba(49,48,43,0.4)]">
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

            {/* Learner cases: the same learner side, one row per seeded
                journey state. Opens as a sub-list so the panel stays short. */}
            <div className="border-t border-line">
              <button
                type="button"
                onClick={() => setCases((c) => !c)}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium text-ink">
                    Learner cases
                  </span>
                  <span className="block text-[11.5px] text-caption">
                    One learner per journey state — view as any of them
                  </span>
                </span>
                <span
                  className={`text-caption transition-transform ${cases ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  ▾
                </span>
              </button>
              {cases && (
                <div className="max-h-56 overflow-y-auto border-t border-line/70 bg-paper/60 py-1">
                  {learnerCases.map((l) => {
                    const active = l.email === currentEmail;
                    return (
                      <a
                        key={l.email}
                        href={caseHref(l)}
                        className={`flex items-center gap-2 px-4 py-1.5 transition-colors ${
                          active ? "bg-cream/70" : "hover:bg-muted"
                        }`}
                      >
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                            active ? "bg-ink text-paper" : "text-transparent"
                          }`}
                        >
                          <IconCheck className="h-2 w-2" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">
                          {l.name}
                        </span>
                        <span className="shrink-0 text-[11px] text-caption">
                          {l.status ? STATUS_LABELS[l.status] : "No application"}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

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

            {/* v1 is the learner direction — the v2 comparison switch only
                returns if LEARNER_V2_ENABLED is flipped back on (auth.ts).
                The v2 build itself stays in the repo. */}
            {LEARNER_V2_ENABLED && (
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
            )}

            {/* The learner's undertaking-signing UI, six candidate
                treatments in our order of preference — v1 is the pick, v6
                is the inline-at-the-field reference kept for comparison. */}
            <div className="border-t border-line px-4 py-2.5">
              <div className="text-[12.5px] font-semibold text-ink">
                Undertaking signing
              </div>
              <div className="text-[11.5px] text-caption">
                Learner side — ranked, 1 is our pick
              </div>
            </div>
            <div>
              {UNDERTAKING_VARIANT_META.map((m, i) => {
                const active = undertakingVariant() === m.id;
                return (
                  <form
                    key={m.id}
                    action={setUndertakingVariantAction.bind(null, m.id)}
                  >
                    <button
                      className={`flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                        active ? "bg-cream/70" : "hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                          active ? "bg-ink text-paper" : "bg-cream text-caption"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-ink">
                          {m.name}
                        </span>
                        <span className="block truncate text-[11px] text-caption">
                          {m.hint}
                        </span>
                      </span>
                      {active && (
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#3f6c45]">
                          live
                        </span>
                      )}
                    </button>
                  </form>
                );
              })}
            </div>

            {/* How the staff boards show a learner's post-vetting edits —
                ranked candidates, r-marker-only is today's baseline. */}
            <div className="border-t border-line px-4 py-2.5">
              <div className="text-[12.5px] font-semibold text-ink">
                Learner-change display
              </div>
              <div className="text-[11.5px] text-caption">
                Staff boards — ranked, 1 is our pick
              </div>
            </div>
            <div>
              {RECHECK_VARIANT_META.map((m, i) => {
                const active = recheckView() === m.id;
                return (
                  <form
                    key={m.id}
                    action={setRecheckVariantAction.bind(null, m.id)}
                  >
                    <button
                      className={`flex w-full items-center gap-2.5 px-4 py-2 text-left transition-colors ${
                        active ? "bg-cream/70" : "hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                          active ? "bg-ink text-paper" : "bg-cream text-caption"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-ink">
                          {m.name}
                        </span>
                        <span className="block truncate text-[11px] text-caption">
                          {m.hint}
                        </span>
                      </span>
                      {active && (
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#3f6c45]">
                          live
                        </span>
                      )}
                    </button>
                  </form>
                );
              })}
            </div>

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
