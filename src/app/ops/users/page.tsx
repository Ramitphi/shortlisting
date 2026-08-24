"use client";

import { useDbVersion } from "@/components/db-provider";
import Link from "next/link";
import { Shell, requireRole } from "@/components/shell";
import {
  EmptyState,
  StatTile,
  StatusBadge,
  IconCheck,
  IconClipboardCheck,
  IconDoc,
  IconLayers,
  IconSend,
} from "@/components/ui";
import { listApplications } from "@/lib/queries";
import {
  ALL_STATUSES,
  opsNeedsAction,
  STATUS_LABELS,
  type AppStatus,
} from "@/lib/domain";


const OPS_ACTION: AppStatus[] = ["under_review"];
const CLOSED: AppStatus[] = ["completed"];

export default function OpsUsersPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; view?: string; claimed?: string };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("ops");
  const q = searchParams.q?.trim() ?? "";

  // Ops sees everything that has entered the pipeline.
  let all = listApplications().filter((a) => a.status !== "draft");
  if (q) {
    const needle = q.toLowerCase();
    all = all.filter((a) =>
      `${a.learner_name} ${a.learner_email}`.toLowerCase().includes(needle)
    );
  }

  const view = searchParams.view ?? "all";
  const statusFilter = ALL_STATUSES.includes(searchParams.status as AppStatus)
    ? (searchParams.status as AppStatus)
    : undefined;

  let apps = all;
  if (view === "action") apps = apps.filter(opsNeedsAction);
  if (view === "closed") apps = apps.filter((a) => CLOSED.includes(a.status));
  if (statusFilter) apps = apps.filter((a) => a.status === statusFilter);
  // The dashboard splits under_review into "new" (nobody picked it up) and
  // "mid-review" (someone did) — this lets its two rows land on the list
  // they actually counted, instead of both landing on the combined one.
  if (searchParams.claimed === "0") apps = apps.filter((a) => !a.ops_id);
  if (searchParams.claimed === "1") apps = apps.filter((a) => a.ops_id);

  const count = (s: AppStatus) => all.filter((a) => a.status === s).length;
  const actionCount = all.filter(opsNeedsAction).length;

  const href = (params: Record<string, string | undefined>) => {
    const sp = new URLSearchParams();
    const merged = {
      q: q || undefined,
      view: view === "all" ? undefined : view,
      status: statusFilter,
      ...params,
    };
    for (const [k, val] of Object.entries(merged)) if (val) sp.set(k, val);
    const s = sp.toString();
    return s ? `/ops/users?${s}` : "/ops/users";
  };

  const Tab = ({
    label,
    active,
    to,
  }: {
    label: string;
    active: boolean;
    to: string;
  }) => (
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
    <Shell
      user={user}
      title="User Hub · Shortlisting"
      activeNav="users"
      surface="white"
    >
      <div className="pb-8 pt-6">
        <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-ink">
          User Hub
        </h1>
        <p className="mt-1 text-[14.5px] text-body">
          Every application in the pipeline — {actionCount} waiting on you.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile icon={<IconLayers />} label="In Pipeline" value={all.length} />
        <StatTile
          icon={<IconClipboardCheck />}
          label="Needs Action"
          value={actionCount}
          tone="pink"
          delay={60}
        />
        <StatTile
          icon={<IconDoc />}
          label="New Submissions"
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
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <div className="flex flex-wrap items-center gap-1 rounded-full bg-paper p-1">
            <Tab
              label="All"
              active={view === "all" && !statusFilter}
              to="/ops/users"
            />
            <Tab
              label="Needs action"
              active={view === "action"}
              to={href({ view: "action", status: undefined })}
            />
            <Tab
              label="Closed"
              active={view === "closed"}
              to={href({ view: "closed", status: undefined })}
            />
          </div>
          <form className="ml-auto flex gap-2" action="/ops/users">
            {view !== "all" && <input type="hidden" name="view" value={view} />}
            {statusFilter && (
              <input type="hidden" name="status" value={statusFilter} />
            )}
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

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
            Status
          </span>
          {ALL_STATUSES.filter((s) => s !== "draft").map((s) => {
            const active = statusFilter === s;
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
                <span className={active ? "text-paper/70" : "text-caption"}>
                  {count(s)}
                </span>
              </Link>
            );
          })}
          {(statusFilter || view !== "all" || q) && (
            <Link
              href="/ops/users"
              className="ml-1 text-xs font-medium text-accent hover:underline"
            >
              Clear all
            </Link>
          )}
        </div>

        {apps.length === 0 ? (
          <EmptyState
            text={q ? `No applications matching "${q}"` : "Nothing in this view"}
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-caption">
                <th className="px-4 py-2.5 font-medium">Learner</th>
                <th className="px-4 py-2.5 font-medium">Counsellor</th>
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
                  <td className="px-4 py-3 text-body">{a.ac_name ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 py-3 text-caption">{a.updated_at} UTC</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/ops/application/${a.id}`}
                      className={
                        opsNeedsAction(a)
                          ? "btn-primary !py-1.5"
                          : "btn-secondary !py-1.5"
                      }
                    >
                      {a.status === "under_review"
                        ? a.ops_name
                          ? "Continue Vetting"
                          : "View & Vet"
                        : "View"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Shell>
  );
}
