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
  IconClipboardCheck,
  IconDoc,
  IconInbox,
  IconLayers,
  IconPen,
  IconRefresh,
  IconSend,
  IconSparkle,
} from "@/components/ui";
import { listApplications, type Application } from "@/lib/queries";
import { ALL_STATUSES, STATUS_LABELS, type AppStatus } from "@/lib/domain";


export default function OpsDashboard({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; reviewed?: string; recheck?: string };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("ops");
  const q = searchParams.q?.trim() ?? "";
  // Ops sees every application that has entered the pipeline (i.e. not drafts).
  // Applications waiting on an Ops action float to the top — including the
  // ones a learner has edited since vetting, whatever stage they reached.
  const OPS_ACTION_STATUSES: AppStatus[] = ["under_review"];
  // A re-check sitting with the counsellor is not Ops' move — it comes back
  // on its own, and floating it here would pad the queue with other people's
  // work.
  const opsRecheck = (a: Application) =>
    Boolean(a.recheck_at) && a.recheck_state !== "ac";
  const needsOpsAction = (a: Application) =>
    OPS_ACTION_STATUSES.includes(a.status) || opsRecheck(a);
  const all = listApplications()
    .filter((a) => a.status !== "draft")
    .sort((a, b) => Number(needsOpsAction(b)) - Number(needsOpsAction(a)));
  const statusFilter = ALL_STATUSES.includes(searchParams.status as AppStatus)
    ? (searchParams.status as AppStatus)
    : undefined;
  let apps = q
    ? all.filter((a) =>
        (a.learner_name + " " + a.learner_email)
          .toLowerCase()
          .includes(q.toLowerCase())
      )
    : all;
  if (statusFilter) apps = apps.filter((a) => a.status === statusFilter);
  const recheckFilter = Boolean(searchParams.recheck);
  if (recheckFilter) apps = apps.filter(opsRecheck);

  const count = (s: AppStatus) => all.filter((a) => a.status === s).length;
  const actionCount = all.filter(needsOpsAction).length;
  const recheckCount = all.filter(opsRecheck).length;

  // These two tiles used to run the identical query and so always showed the
  // same number twice. What actually separates them is whether anyone has
  // picked the application up: unclaimed is a new submission, claimed is
  // mid-review.
  const underReview = all.filter((a) => a.status === "under_review");
  const submittedCount = underReview.filter((a) => !a.ops_id).length;
  const vettingCount = underReview.filter((a) => a.ops_id).length;
  const shortlistedCount = count("shortlisted");
  const firstName = user.name.split(" ")[0];

  return (
    <Shell
      user={user}
      title="Ops Dashboard · Shortlisting"
      surface="white"
      hero={{
        title: `${greeting()}, ${firstName}`,
        subtitle: "The vetting pipeline at a glance.",
      }}
    >

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatTile icon={<IconLayers />} label="In Pipeline" value={all.length} />
        <StatTile
          icon={<IconInbox />}
          label="Needs Action"
          value={actionCount}
          tone="pink"
          delay={60}
        />
        <StatTile
          icon={<IconDoc />}
          label="New Submissions"
          value={submittedCount}
          tone="blue"
          delay={120}
        />
        <StatTile
          icon={<IconClipboardCheck />}
          label="Under Vetting"
          value={vettingCount}
          tone="amber"
          delay={180}
        />
        <StatTile
          icon={<IconCheck />}
          label="Reviewed"
          value={count("reviewed")}
          tone="purple"
          delay={240}
        />
        <StatTile
          icon={<IconSend />}
          label="Shortlisted+"
          value={count("shortlisted") + count("completed")}
          tone="green"
          delay={300}
        />
      </div>

      {(submittedCount > 0 ||
        vettingCount > 0 ||
        shortlistedCount > 0 ||
        recheckCount > 0) && (
        <section className="card fade-up mt-8 p-5">
          {/* One card of work, not a second wall of tiles — each to-do is a
              row with its count on the icon and one action. */}
          <h2 className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
            <IconSparkle className="h-3.5 w-3.5 text-accent" />
            For you today
          </h2>
          <p className="mb-2 mt-0.5 text-[12.5px] text-caption">
            What needs your attention, most urgent first.
          </p>
          <div className="divide-y divide-line">
            {/* First: a learner has changed something and is stuck until it
                is re-read — nothing else on this page is blocking anyone. */}
            {recheckCount > 0 && (
              <TaskRow
                href="/ops?recheck=1"
                icon={<IconRefresh />}
                count={recheckCount}
                label="Re-check changed details"
                caption="Learners who edited after vetting"
                tone="amber"
              />
            )}
            {submittedCount > 0 && (
              <TaskRow
                href="/ops/users?status=under_review&claimed=0"
                icon={<IconClipboardCheck />}
                count={submittedCount}
                label="Pick up & vet"
                caption="New submissions waiting"
                cta="Start"
              />
            )}
            {vettingCount > 0 && (
              <TaskRow
                href="/ops/users?status=under_review&claimed=1"
                icon={<IconPen />}
                count={vettingCount}
                label="Continue vetting"
                caption="Applications mid-review"
                cta="Continue"
                tone="amber"
              />
            )}
            {shortlistedCount > 0 && (
              <TaskRow
                href="/ops/users?status=shortlisted"
                icon={<IconSend />}
                count={shortlistedCount}
                label="Send offer letters"
                caption="Shortlisted — send once signed and certified"
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
            <h2 className="font-display font-semibold tracking-tight">Applications</h2>
            {statusFilter && (
              <Link
                href="/ops"
                className="inline-flex items-center gap-1 rounded-full border border-cream-line bg-cream px-2.5 py-0.5 text-xs font-medium text-body transition-colors hover:text-ink"
              >
                {STATUS_LABELS[statusFilter]} ✕
              </Link>
            )}
            {recheckFilter && (
              <Link
                href="/ops"
                className="inline-flex items-center gap-1 rounded-full border border-[#ecdfc0] bg-[#f6efdd] px-2.5 py-0.5 text-xs font-medium text-[#8a6d2f] transition-colors hover:text-ink"
              >
                Re-check needed ✕
              </Link>
            )}
          </div>
          <form className="flex gap-2" action="/ops">
            <input
              className="input !w-64"
              type="search"
              name="q"
              placeholder="Search learner…"
              defaultValue={q}
            />
            <button className="btn-secondary">Search</button>
          </form>
        </div>
        {apps.length === 0 ? (
          <EmptyState
            text={
              q
                ? `No applications matching "${q}"`
                : "No submissions yet — waiting for ACs"
            }
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
                    {/* No "Ops action" chip — the badge already says Under
                        Vetting, and the row's CTA is primary when it's ours.
                        A re-check is the exception: it can sit on ANY status,
                        so the badge alone would hide it. */}
                    {/* ONE chip: a live re-check replaces the status — its
                        own blue, so it reads as its own state. */}
                    <StatusBadge
                      status={a.status}
                      recheckLabel={a.recheck_at ? "Re-check" : null}
                    />
                  </td>
                  <td className="px-4 py-3 text-caption">{a.updated_at} UTC</td>
                  <td className="px-4 py-3 text-right">
                    {opsRecheck(a) ? (
                      <Link
                        href={`/ops/application/${a.id}`}
                        className="btn-primary !py-1.5"
                      >
                        Re-check Details
                      </Link>
                    ) : a.status === "under_review" ? (
                      <Link
                        href={`/ops/application/${a.id}`}
                        className="btn-primary !py-1.5"
                      >
                        {a.ops_name ? "Continue Vetting" : "View & Vet Details"}
                      </Link>
                    ) : (
                      <Link
                        href={`/ops/application/${a.id}`}
                        className="btn-secondary !py-1.5"
                      >
                        View
                      </Link>
                    )}
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
