"use client";

import { useDbVersion } from "@/components/db-provider";
import Link from "next/link";
import { Shell, requireRole } from "@/components/shell";
import {
  EmptyState,
  StatusBadge,
  StatTile,
  QuickAction,
  greeting,
  IconCheck,
  IconInbox,
  IconPen,
  IconSend,
  IconSignature,
  IconSparkle,
  IconUsers,
} from "@/components/ui";
import { listApplications } from "@/lib/queries";
import { ALL_STATUSES, STATUS_LABELS, type AppStatus } from "@/lib/domain";


export default function AcDashboard({
  searchParams,
}: {
  searchParams: {
    q?: string;
    status?: string;
    submitted?: string;
    shortlisted?: string;
  };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("ac");
  const all = listApplications({ acId: user.id });
  const q = searchParams.q?.trim() ?? "";
  const statusFilter = ALL_STATUSES.includes(searchParams.status as AppStatus)
    ? (searchParams.status as AppStatus)
    : undefined;
  let apps = q ? listApplications({ acId: user.id, search: q }) : all;
  if (statusFilter) apps = apps.filter((a) => a.status === statusFilter);

  const count = (s: AppStatus) => all.filter((a) => a.status === s).length;
  const actionNeeded = all.filter(
    (a) => a.status === "draft" || a.status === "reviewed"
  ).length;

  const draftCount = count("draft");
  const reviewedCount = count("reviewed");
  const shortlistedCount = count("shortlisted");
  const firstName = user.name.split(" ")[0];

  return (
    <Shell
      user={user}
      title="AC Dashboard · Shortlisting"
      surface="white"
      hero={{
        title: `${greeting()}, ${firstName}`,
        subtitle: "Here’s where every learner stands today.",
      }}
    >
      {searchParams.submitted && (
        <div className="mb-4 rounded-xl border border-[#d6e0ee] bg-[#e9eef6] px-4 py-2.5 text-sm text-[#3d5a80]">
          Eligibility form submitted — the Ops team has been notified.
        </div>
      )}
      {searchParams.shortlisted && (
        <div className="mb-4 rounded-xl border border-[#d5e6d8] bg-[#e8f2e9] px-4 py-2.5 text-sm text-[#3f6c45]">
          Shortlist sent to the learner — they can now sign their documents.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile icon={<IconUsers />} label="My Learners" value={all.length} />
        <StatTile
          icon={<IconPen />}
          label="Needs Action"
          value={actionNeeded}
          tone="amber"
          delay={60}
        />
        <StatTile
          icon={<IconInbox />}
          label="With Ops"
          value={count("under_review")}
          tone="blue"
          delay={120}
        />
        <StatTile
          icon={<IconSend />}
          label="Shortlisted"
          value={count("shortlisted")}
          tone="green"
          delay={180}
        />
        <StatTile
          icon={<IconCheck />}
          label="Completed"
          value={count("completed")}
          tone="purple"
          delay={240}
        />
      </div>

      {(draftCount > 0 || reviewedCount > 0 || shortlistedCount > 0) && (
        <section className="mt-8">
          <div className="flex items-center gap-1.5 text-[13px] font-medium text-body">
            <IconSparkle className="h-3.5 w-3.5 text-accent" />
            Quick actions
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {draftCount > 0 && (
              <QuickAction
                href="/ac/users?status=draft"
                icon={<IconPen />}
                title="Fill eligibility forms"
                sub={`${draftCount} learner${draftCount === 1 ? "" : "s"} still in draft`}
                tone="pink"
              />
            )}
            {reviewedCount > 0 && (
              <QuickAction
                href="/ac/users?status=reviewed"
                icon={<IconSend />}
                title="Send shortlists"
                sub={`${reviewedCount} vetted by Ops — pick programmes`}
                tone="purple"
                delay={60}
              />
            )}
            {shortlistedCount > 0 && (
              <QuickAction
                href="/ac/users?status=shortlisted"
                icon={<IconSignature />}
                title="Awaiting signatures"
                sub={`${shortlistedCount} shortlisted learner${shortlistedCount === 1 ? "" : "s"}`}
                tone="green"
                delay={120}
              />
            )}
          </div>
        </section>
      )}

      <div className="card fade-up mt-8" style={{ animationDelay: "180ms" }}>
        <div className="flex items-center justify-between border-b border-line p-4">
          <div className="flex items-center gap-2.5">
            <h2 className="font-display font-semibold tracking-tight">My Learners</h2>
            {statusFilter && (
              <Link
                href="/ac"
                className="inline-flex items-center gap-1 rounded-full border border-cream-line bg-cream px-2.5 py-0.5 text-xs font-medium text-body transition-colors hover:text-ink"
              >
                {STATUS_LABELS[statusFilter]} ✕
              </Link>
            )}
          </div>
          <form className="flex gap-2" action="/ac">
            <input
              className="input !w-64"
              type="search"
              name="q"
              placeholder="Search learner by name or email…"
              defaultValue={q}
            />
            <button className="btn-secondary">Search</button>
          </form>
        </div>
        {apps.length === 0 ? (
          <EmptyState
            text={
              q
                ? `No learners matching "${q}"`
                : statusFilter
                  ? `No learners in "${STATUS_LABELS[statusFilter]}" right now`
                  : "No learners assigned yet"
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-caption">
                <th className="px-4 py-2.5 font-medium">Learner</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Last Updated</th>
                <th className="px-4 py-2.5 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-line/60 transition-colors hover:bg-muted"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium">{a.learner_name}</div>
                    <div className="text-xs text-caption">{a.learner_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-caption">{a.updated_at} UTC</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/ac/application/${a.id}`}
                      className="btn-primary !py-1.5"
                    >
                      {a.status === "draft"
                        ? "Fill Details"
                        : a.status === "reviewed"
                          ? "Review & Shortlist"
                          : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="mt-4 text-xs text-caption">
        Status legend: {Object.values(STATUS_LABELS).join(" → ")}
      </p>
    </Shell>
  );
}
