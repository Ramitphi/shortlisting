"use client";

import { useDbVersion } from "@/components/db-provider";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Shell } from "@/components/shell";
import { IconBell, IconCheck, IconSparkle } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { getNotifications, getUnreadCount } from "@/lib/queries";
import { markAllRead } from "@/lib/actions";
import type { Notification } from "@/lib/queries";


/** "2026-08-04 10:12:41" → "Today" / "Yesterday" / "4 August 2026" */
function dayLabel(stamp: string): string {
  const day = stamp.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function groupByDay(items: Notification[]) {
  const groups: { label: string; items: Notification[] }[] = [];
  for (const n of items) {
    const label = dayLabel(n.created_at);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(n);
    else groups.push({ label, items: [n] });
  }
  return groups;
}

export default function UpdatesPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = getCurrentUser();
  if (!user) redirect("/login");

  const all = getNotifications(user.id);
  const unread = getUnreadCount(user.id);
  const onlyUnread = searchParams.filter === "unread";
  const groups = groupByDay(onlyUnread ? all.filter((n) => !n.read) : all);

  return (
    <Shell user={user} title="Updates · Shortlisting" activeNav="updates" surface="white">
      <div className="mx-auto max-w-[720px] px-2 pt-6">
        <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-ink">
          Your updates
        </h1>
        {/* Deliberately generic: this page is shared by all four roles, and
            the learner has no idea what a remark or a vetting queue is. */}
        <p className="mt-1 max-w-[560px] text-[14.5px] leading-relaxed text-body">
          Everything that needs your attention, and everything that has moved
          since you last looked. Updates are in-app only.
        </p>

        {/* Controls */}
        <div className="mt-8 flex items-center gap-2">
          <Link
            href="/updates"
            className={`rounded-lg border px-4 py-1.5 text-[13px] font-medium transition-colors ${
              !onlyUnread
                ? "border-ink bg-ink text-paper"
                : "border-line-strong text-body hover:bg-muted"
            }`}
          >
            All
          </Link>
          <Link
            href="/updates?filter=unread"
            className={`inline-flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-[13px] font-medium transition-colors ${
              onlyUnread
                ? "border-ink bg-ink text-paper"
                : "border-line-strong text-body hover:bg-muted"
            }`}
          >
            Unread
            {unread > 0 && (
              <span
                className={`rounded-full px-1.5 text-[10px] font-semibold ${
                  onlyUnread ? "bg-white/20" : "bg-accent text-white"
                }`}
              >
                {unread}
              </span>
            )}
          </Link>
          {unread > 0 && (
            <form action={markAllRead} className="ml-auto">
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong px-4 py-1.5 text-[13px] font-medium text-body transition-colors hover:bg-muted">
                <IconCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            </form>
          )}
        </div>

        {/* Feed */}
        <div className="mt-10 pb-16">
          {groups.length === 0 && (
            <div className="flex flex-col items-center py-20 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-caption">
                <IconBell />
              </span>
              <p className="mt-4 text-[15px] font-medium text-ink">
                {onlyUnread ? "Nothing unread" : "No updates yet"}
              </p>
              <p className="mt-1 text-[13.5px] text-caption">
                You&apos;ll see activity here as your applications move.
              </p>
            </div>
          )}

          {groups.map((group, gi) => (
            <section key={group.label} className={gi > 0 ? "mt-12" : ""}>
              <div className="rounded-xl bg-paper px-5 py-3.5">
                <h2 className="text-[15px] font-semibold text-ink">
                  {group.label}
                </h2>
              </div>

              <div className="mt-2">
                {group.items.map((n) => (
                  <Link
                    key={n.id}
                    href={n.link ?? "#"}
                    className="group block border-b border-line px-5 py-6 transition-colors last:border-b-0 hover:bg-paper/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <IconSparkle
                        className={`h-4 w-4 ${n.read ? "text-caption" : "text-accent"}`}
                      />
                      <span className="text-[13.5px] text-body">
                        Shortlisting
                      </span>
                      {!n.read && (
                        <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-accent">
                          New
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-3 text-[15px] leading-snug ${
                        n.read ? "text-body" : "font-medium text-ink"
                      }`}
                    >
                      {n.text}
                    </p>
                    <p className="mt-2.5 text-[12.5px] text-caption">
                      {n.created_at.slice(11, 16)} UTC
                      {n.link && (
                        <>
                          {" · "}
                          <span className="text-body underline-offset-2 group-hover:underline">
                            Open
                          </span>
                        </>
                      )}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Shell>
  );
}
