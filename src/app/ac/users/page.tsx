"use client";

import { useDbVersion } from "@/components/db-provider";
import Link from "next/link";
import { Shell, requireRole } from "@/components/shell";
import {
  EmptyState,
  StatTile,
  StatusBadge,
  IconCheck,
  IconInbox,
  IconPen,
  IconSend,
  IconUsers,
} from "@/components/ui";
import { listApplications } from "@/lib/queries";
import {
  acNeedsAction,
  ALL_STATUSES,
  STATUS_LABELS,
  type AppStatus,
} from "@/lib/domain";


type Bucket = "all" | "active" | "closed" | AppStatus;

const CLOSED: AppStatus[] = ["completed"];

export default function AcUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; view?: string };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("ac");
  const q = searchParams.q?.trim() ?? "";
  const all = q
    ? listApplications({ acId: user.id, search: q })
    : listApplications({ acId: user.id });

  const view = (searchParams.view ?? "all") as Bucket;
  const statusFilter = ALL_STATUSES.includes(searchParams.status as AppStatus)
    ? (searchParams.status as AppStatus)
    : undefined;

  let apps = all;
  if (view === "active") apps = apps.filter((a) => !CLOSED.includes(a.status));
  if (view === "closed") apps = apps.filter((a) => CLOSED.includes(a.status));
  if (statusFilter) apps = apps.filter((a) => a.status === statusFilter);

  const count = (s: AppStatus) => all.filter((a) => a.status === s).length;
  const activeCount = all.filter((a) => !CLOSED.includes(a.status)).length;

  const href = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { q: q || undefined, view: view === "all" ? undefined : view, status: statusFilter, ...params };
    for (const [k, val] of Object.entries(merged)) if (val) sp.set(k, val);
    const s = sp.toString();
    return s ? `/ac/users?${s}` : "/ac/users";
  };

  const Tab = ({ label, active, to }: { label: string; active: boolean; to: string }) => (
    <Link
      href={to}
      className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
        active ? "bg-ink text-paper" : "text-body hover:bg-muted"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <Shell user={user} title="User Hub · Shortlisting" activeNav="users" surface="white">
      {/* Header — matches the homepage hero's rhythm */}
      <div className="pb-8 pt-6">
        <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-ink">
          User Hub
        </h1>
        <p className="mt-1 text-[14.5px] text-body">
          Every learner assigned to you — {activeCount} active,{" "}
          {all.length - activeCount} closed.
        </p>
      </div>

      {/* Overview */}
      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile icon={<IconUsers />} label="All Learners" value={all.length} />
        <StatTile
          icon={<IconPen />}
          label="Needs Action"
          // Same rule as the dashboard: a re-check handed back is their move
          // too, and omitting it made the hub disagree with /ac.
          value={all.filter(acNeedsAction).length}
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

      <div className="card fade-up">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-1 rounded-full bg-paper p-1">
            <Tab label="All" active={view === "all" && !statusFilter} to="/ac/users" />
            <Tab label="Active" active={view === "active"} to={href({ view: "active", status: undefined })} />
            <Tab label="Closed" active={view === "closed"} to={href({ view: "closed", status: undefined })} />
          </div>

          <form className="ml-auto flex gap-2" action="/ac/users">
            {view !== "all" && <input type="hidden" name="view" value={view} />}
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <input
              className="input !w-64"
              type="search"
              name="q"
              placeholder="Search name or email…"
              defaultValue={q}
            />
            <button className="btn-secondary">Search</button>
          </form>
        </div>

        {/* Status chips */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
            Status
          </span>
          {ALL_STATUSES.map((s) => {
            const active = statusFilter === s;
            const n = count(s);
            return (
              <Link
                key={s}
                href={active ? href({ status: undefined }) : href({ status: s })}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-white text-body hover:border-ink/40 hover:text-ink"
                }`}
              >
                {STATUS_LABELS[s]}
                <span className={active ? "text-paper/70" : "text-caption"}>{n}</span>
              </Link>
            );
          })}
          {(statusFilter || view !== "all" || q) && (
            <Link
              href="/ac/users"
              className="ml-1 text-xs font-medium text-accent hover:underline"
            >
              Clear all
            </Link>
          )}
        </div>

        {apps.length === 0 ? (
          <EmptyState
            text={
              q
                ? `No learners matching "${q}"`
                : "No learners in this view"
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
                    <StatusBadge
                      status={a.status}
                      // Any live re-check, wherever it is sitting — the
                      // dashboard's rule. Keying this off recheck_state
                      // hid "Appealed by you" entirely, because an appeal
                      // is with Ops by definition.
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
                    <Link
                      href={`/ac/application/${a.id}`}
                      className={
                        a.status === "draft" || a.status === "reviewed"
                          ? "btn-primary !py-1.5"
                          : "btn-secondary !py-1.5"
                      }
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
            </div>
        )}
      </div>
    </Shell>
  );
}
