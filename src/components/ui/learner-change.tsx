import { ChangedPin } from "./field-comments";
import { IconRefresh } from "./icons";
import type { RecheckChange, RecheckVariant } from "@/lib/domain";

/**
 * How a learner's post-vetting edit shows on the staff boards — six
 * treatments (see RECHECK_VARIANT_META), switched from the demo FAB.
 *
 * The pieces compose per variant: the MARK sits at the label, the WAS line
 * under the value, the FOOTER inside the section, the PANEL above the
 * board, and the row band tints the whole line. Each variant turns on the
 * pieces that belong to it and the pages stay ignorant of the ranking.
 */

/** The marker beside a changed field's label. r1's band speaks instead. */
export function LearnerChangeMark({
  variant,
  change,
  at,
}: {
  variant: RecheckVariant;
  change?: RecheckChange;
  at?: string | null;
}) {
  if (variant === "r1") return null;
  if (change && (variant === "r2" || variant === "r4" || variant === "r5")) {
    // The pin carries the diff on hover where the layout does not show it.
    return (
      <span
        title={`Changed by the learner after vetting — was "${change.from || "—"}", now "${change.to || "—"}".${at ? ` Changed ${at} UTC.` : ""}`}
        className="flex h-5 w-5 shrink-0 cursor-help items-center justify-center rounded-full bg-[#f6efdd] text-[#8a6d2f]"
        aria-label="Changed by the learner — re-check"
      >
        <IconRefresh className="h-3 w-3" />
      </span>
    );
  }
  return <ChangedPin at={at} />;
}

/**
 * r1 — the old answer, revealed on hover. The band says "this moved";
 * resting the pointer on the row slides the was-line in under the value,
 * so the diff is one gesture away without every changed row running two
 * lines tall all the time.
 */
export function LearnerWasLine({
  variant,
  change,
}: {
  variant: RecheckVariant;
  change?: RecheckChange;
}) {
  if (variant !== "r1" || !change) return null;
  return (
    <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-150 group-hover/changed:mt-1 group-hover/changed:max-h-6 group-hover/changed:opacity-100">
      <div className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px] leading-none text-[#8a6d2f]">
        <IconRefresh className="h-3 w-3 shrink-0" />
        <span className="min-w-0 truncate">
          was{" "}
          <span className="line-through decoration-[#8a6d2f]/50">
            {change.from || "—"}
          </span>
        </span>
      </div>
    </div>
  );
}

/** The amber band a changed row wears under r1 — also the hover scope. */
export function changedRowClass(variant: RecheckVariant, changed: boolean) {
  return variant === "r1" && changed
    ? " group/changed -mx-2.5 rounded-lg bg-[#faf3df] px-2.5 transition-colors hover:bg-[#f5ebcf]"
    : "";
}

/**
 * r6 — the section speaks, in the voice Ops' own comments use: an amber
 * footer line inside the section that owns the changed fields.
 */
export function LearnerChangesFooter({
  variant,
  changes,
  labels,
  at,
}: {
  variant: RecheckVariant;
  changes: Record<string, RecheckChange>;
  /** The changed labels that belong to THIS section. */
  labels: string[];
  at?: string | null;
}) {
  if (variant !== "r6" || labels.length === 0) return null;
  return (
    <div className="mt-3 space-y-1.5 border-t border-line pt-3">
      {labels.map((label) => {
        const ch = changes[label];
        return (
          <p
            key={label}
            className="flex items-start gap-1.5 text-[12.5px] leading-snug text-[#8a6d2f]"
          >
            <IconRefresh className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              The learner changed <b className="font-semibold">{label}</b>
              {ch ? (
                <>
                  {" "}
                  — was{" "}
                  <span className="line-through decoration-[#8a6d2f]/50">
                    {ch.from || "—"}
                  </span>
                  , now <b className="font-semibold">{ch.to || "—"}</b>
                </>
              ) : (
                " after vetting"
              )}
              {at ? ` · ${at.slice(0, 10)}` : ""}.
            </span>
          </p>
        );
      })}
    </div>
  );
}

/**
 * r2 — one card listing every change, old → new; r4 — the same facts as a
 * compact chip strip. Anything else renders nothing.
 */
export function LearnerChangesPanel({
  variant,
  changes,
  labels,
  at,
}: {
  variant: RecheckVariant;
  changes: Record<string, RecheckChange>;
  labels: string[];
  at?: string | null;
}) {
  if (labels.length === 0) return null;

  if (variant === "r4") {
    return (
      <div className="card flex flex-wrap items-center gap-2 p-3.5">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-caption">
          <IconRefresh className="h-3.5 w-3.5 text-[#8a6d2f]" />
          Changed by the learner
        </span>
        {labels.map((label) => {
          const ch = changes[label];
          return (
            <span
              key={label}
              title={
                ch
                  ? `Was "${ch.from || "—"}", now "${ch.to || "—"}"`
                  : "Changed after vetting"
              }
              className="inline-flex cursor-help items-center gap-1 rounded-md border border-[#ecdfc0] bg-[#f6efdd] px-2 py-0.5 text-[11.5px] font-medium text-[#8a6d2f]"
            >
              {label}
            </span>
          );
        })}
      </div>
    );
  }

  if (variant === "r2") {
    return (
      <div className="card p-4">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
          <IconRefresh className="h-3.5 w-3.5 text-[#8a6d2f]" />
          What the learner changed
          {at && (
            <span className="font-normal text-caption">
              · {at.slice(0, 10)}
            </span>
          )}
        </div>
        <dl className="mt-2.5 divide-y divide-line">
          {labels.map((label) => {
            const ch = changes[label];
            return (
              <div
                key={label}
                className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-1.5 first:pt-0 last:pb-0 text-[12.5px]"
              >
                <dt className="min-w-[11rem] text-caption">{label}</dt>
                <dd className="min-w-0 flex-1">
                  {ch ? (
                    <>
                      <span className="text-caption line-through decoration-caption/50">
                        {ch.from || "—"}
                      </span>
                      <span className="mx-1.5 text-caption">→</span>
                      <span className="font-medium text-ink">
                        {ch.to || "—"}
                      </span>
                    </>
                  ) : (
                    <span className="text-body">changed after vetting</span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    );
  }

  return null;
}
