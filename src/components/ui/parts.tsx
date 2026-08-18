import Link from "next/link";
import {
  STATUS_COLORS,
  STATUS_LABELS,
  learnerStatus,
  type AppStatus,
} from "@/lib/domain";
import type { AppEvent } from "@/lib/queries";

/**
 * `learner` collapses the five internal statuses into the three the learner is
 * told about. "Under Vetting" and "Reviewed by Ops" name a desk, and naming
 * the desk is how you get asked why it is still sitting on it.
 */
export function StatusBadge({
  status,
  learner = false,
  certified = false,
}: {
  status: AppStatus;
  learner?: boolean;
  certified?: boolean;
}) {
  const { label, className } = learner
    ? learnerStatus(status, certified)
    : { label: STATUS_LABELS[status], className: STATUS_COLORS[status] };
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}

export function StatCard({
  label,
  value,
  accent = "text-ink",
}: {
  label: string;
  value: number | string;
  accent?: string;
}) {
  return (
    <div className="card p-4">
      <div className={`font-display text-2xl font-semibold tracking-tight ${accent}`}>{value}</div>
      <div className="text-xs text-caption mt-1">{label}</div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center text-sm text-caption py-10">{text}</div>
  );
}

/** "2026-08-04 10:12:41" → "MONDAY, 4 AUGUST 2026" */
function dayHeading(stamp: string): string {
  return new Date(`${stamp.slice(0, 10)}T00:00:00Z`)
    .toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
    .toUpperCase();
}

export function Timeline({
  events,
  pending,
}: {
  events: AppEvent[];
  /** What the application is waiting on right now — no timestamp, it hasn't happened yet. */
  pending?: string | null;
}) {
  if (events.length === 0 && !pending)
    return <EmptyState text="No activity yet" />;

  // Newest first, grouped by day.
  const groups: { day: string; items: AppEvent[] }[] = [];
  for (const e of events) {
    const day = dayHeading(e.created_at);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(e);
    else groups.push({ day, items: [e] });
  }

  return (
    <div>
      {pending && (
        <div className="mb-4 flex gap-3">
          <span className="w-[52px] shrink-0" />
          <span className="flex w-3 shrink-0 justify-center pt-[7px]">
            <span className="relative flex h-[5px] w-[5px]">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3d5a80] opacity-75" />
              <span className="relative inline-flex h-[5px] w-[5px] rounded-full bg-[#3d5a80]" />
            </span>
          </span>
          <p className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug text-[#2f4a6b]">
            {pending}
          </p>
        </div>
      )}
      {groups.map((group, gi) => (
        <section key={group.day} className={gi > 0 ? "mt-6" : ""}>
          <h4 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-caption">
            {group.day}
          </h4>
          <ol className="mt-3">
            {group.items.map((e, i) => {
              const isLastOverall =
                gi === groups.length - 1 && i === group.items.length - 1;
              return (
                <li key={e.id} className="flex gap-3">
                  <time className="w-[52px] shrink-0 pt-[3px] text-right text-[11.5px] tabular-nums text-caption">
                    {e.created_at.slice(11, 16)}
                  </time>
                  {/* Rail */}
                  <div className="flex w-3 shrink-0 flex-col items-center">
                    <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-caption/70" />
                    {!isLastOverall && (
                      <span className="w-px flex-1 bg-line" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-5">
                    <p className="text-[13.5px] leading-snug text-ink">
                      {e.action}
                    </p>
                    {e.detail && (
                      <p className="mt-1 text-[12.5px] leading-snug text-body">
                        {e.detail}
                      </p>
                    )}
                    <p className="mt-1 text-[11.5px] text-caption">
                      {e.actor_name}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
      <p className="mt-1 pl-[67px] text-[10.5px] font-medium uppercase tracking-[0.08em] text-caption/70">
        Start of activity
      </p>
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-sm text-body hover:text-ink transition-colors">
      ← {label}
    </Link>
  );
}
