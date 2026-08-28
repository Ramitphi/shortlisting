"use client";

import { useDbVersion } from "@/components/db-provider";
import Link from "next/link";
import { Shell, requireRole } from "@/components/shell";
import {
  EmptyState,
  StatusBadge,
  StatTile,
  TaskRow,
  greeting,
  IconCheck,
  IconInbox,
  IconPen,
  IconRefresh,
  IconSend,
  IconSignature,
  IconSparkle,
  IconUsers,
} from "@/components/ui";
import { listApplications, type Application } from "@/lib/queries";
import {
  ALL_STATUSES,
  STATUS_LABELS,
  acNeedsAction,
  type AppStatus,
} from "@/lib/domain";


export default function AcDashboard({
  searchParams,
}: {
  searchParams: {
    q?: string;
    status?: string;
    submitted?: string;
    shortlisted?: string;
    recheck?: string;
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
  // Ops sent comments on a learner's changed details back to this counsellor
  // — the learner is waiting on a phone call, so it counts as action needed
  // whatever status the application is at.
  const acRecheck = (a: Application) => a.recheck_state === "ac";
  const recheckCount = all.filter(acRecheck).length;

  let apps = q ? listApplications({ acId: user.id, search: q }) : all;
  if (statusFilter) apps = apps.filter((a) => a.status === statusFilter);
  const recheckFilter = Boolean(searchParams.recheck);
  if (recheckFilter) apps = apps.filter(acRecheck);

  const count = (s: AppStatus) => all.filter((a) => a.status === s).length;
  const actionNeeded = all.filter(
    (a) => a.status === "draft" || a.status === "reviewed" || acRecheck(a)
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

      {(draftCount > 0 ||
        reviewedCount > 0 ||
        shortlistedCount > 0 ||
        recheckCount > 0) && (
        <section className="card fade-up mt-8 p-5">
          {/* One card of work, not a second wall of tiles: each to-do is a
              row with its count on the icon and one action. */}
          <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
            <IconSparkle className="h-3.5 w-3.5 text-accent" />
            For you today
          </h2>
          <p className="mb-2 mt-0.5 text-[12.5px] text-caption">
            What needs your attention, most urgent first.
          </p>
          <div className="divide-y divide-line">
            {/* First: a learner is mid-application and stuck until this call
                happens. */}
            {recheckCount > 0 && (
              <TaskRow
                href="/ac?recheck=1"
                icon={<IconRefresh />}
                count={recheckCount}
                label="Resolve Ops' comments"
                caption="Ops has answered — changed details and appeals"
                tone="amber"
              />
            )}
            {draftCount > 0 && (
              <TaskRow
                href="/ac/users?status=draft"
                icon={<IconPen />}
                count={draftCount}
                label="Fill eligibility forms"
                caption="Still in draft"
                cta="Continue"
              />
            )}
            {reviewedCount > 0 && (
              <TaskRow
                href="/ac/users?status=reviewed"
                icon={<IconSend />}
                count={reviewedCount}
                label="Send shortlists"
                caption="Vetted by Ops — pick programmes"
                tone="purple"
              />
            )}
            {shortlistedCount > 0 && (
              <TaskRow
                href="/ac/users?status=shortlisted"
                icon={<IconSignature />}
                count={shortlistedCount}
                label="Awaiting signatures"
                caption="Shortlists with the learner to sign"
                cta="View"
                tone="green"
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
            {recheckFilter && (
              <Link
                href="/ac"
                className="inline-flex items-center gap-1 rounded-full border border-[#ecdfc0] bg-[#f6efdd] px-2.5 py-0.5 text-xs font-medium text-[#8a6d2f] transition-colors hover:text-ink"
              >
                Comments to resolve ✕
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
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
                    {/* A re-check rides on top of any status, so the badge
                        alone would hide the one row that needs a call. */}
                    {/* ONE chip: a live re-check replaces the status — its
                        own blue, so it reads as its own state. */}
                    <StatusBadge
                      status={a.status}
                      recheckLabel={
                        a.recheck_at
                          ? a.recheck_kind === "appeal"
                            ? "Appealed by you"
                            : "Re-check"
                          : null
                      }
                    />
                  </td>
                  <td className="px-4 py-3 text-caption">{a.updated_at} UTC</td>
                  <td className="px-4 py-3 text-right">
                    {/* Primary only when the move is the counsellor's —
                        the same rule the other three list screens use. A
                        table where every row is a solid black button says
                        nothing about which row to open first. */}
                    <Link
                      href={`/ac/application/${a.id}`}
                      className={
                        acNeedsAction(a)
                          ? "btn-primary !py-1.5"
                          : "btn-secondary !py-1.5"
                      }
                    >
                      {acRecheck(a)
                        ? "Resolve Comments"
                        : a.status === "draft"
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
            </div>
        )}
      </div>

      <p className="mt-4 text-xs text-caption">
        Status legend: {Object.values(STATUS_LABELS).join(" → ")}
      </p>
    </Shell>
  );
}
