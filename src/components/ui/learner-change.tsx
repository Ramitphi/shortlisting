import { IconRefresh } from "./icons";
import type { RecheckChange } from "@/lib/domain";

/**
 * How a learner's post-vetting edit shows on the staff boards.
 *
 * Shipped: the changed row wears an amber band all the time, and resting
 * the pointer on it slides the old answer in under the new one. One line
 * tall at rest, the diff one gesture away.
 *
 * Design mode (the designer's playground): the reference treatment from
 * Google's long forms — a vertical blue rule that spans the whole field
 * block, the CONTENT indented to sit beside it, and a "what changed"
 * helper line always visible beneath the value. No tint, no hover.
 */

/** The band (shipped) or rule (design mode) a changed row wears. */
export function changedRowClass(design: boolean, changed: boolean) {
  if (!changed) return "";
  if (design)
    // The rule INDENTS the content — bar, gap, then everything else a
    // step to the right, the helper line included, exactly like the
    // reference. The row keeps its own vertical padding so the bar has
    // height to span.
    return " border-l-[3px] border-[#3d5a80] py-2.5 pl-4";
  return " group/changed -mx-2.5 rounded-lg bg-[#faf3df] px-2.5 py-2 transition-colors hover:bg-[#f5ebcf]";
}

/**
 * The "what changed" line. Design mode states it plainly under the value;
 * shipped mode reveals it on hover. Without a recorded diff — a re-check
 * raised before the values were being recorded — both say who moved the
 * row and when, so a marked row never stays mute.
 */
export function LearnerWasLine({
  design,
  change,
  at,
}: {
  design: boolean;
  change?: RecheckChange;
  at?: string | null;
}) {
  if (design) {
    return (
      <div className="w-full basis-full mt-1.5">
        <div className="flex items-center gap-1.5 whitespace-nowrap text-[12px] leading-none text-caption">
          <IconRefresh className="h-3 w-3 shrink-0 text-[#3d5a80]" />
          <span className="min-w-0 truncate">
            {change ? (
              <>
                Changed by the learner — was{" "}
                <span className="line-through decoration-caption/50">
                  {change.from || "—"}
                </span>
              </>
            ) : (
              <>Changed by the learner{at ? ` · ${at.slice(0, 10)}` : ""}</>
            )}
          </span>
        </div>
      </div>
    );
  }

  // Shipped — a full-width SECOND line of the row, not a lodger inside
  // the value cell: the first line (label · value · icons) keeps its own
  // alignment and never re-centres when this slides in beneath it.
  return (
    <div className="w-full basis-full max-h-0 overflow-hidden opacity-0 transition-all duration-150 group-hover/changed:mt-1.5 group-hover/changed:max-h-7 group-hover/changed:opacity-100">
      <div className="flex items-center gap-1.5 whitespace-nowrap pb-0.5 text-[11.5px] leading-none text-[#8a6d2f]">
        <IconRefresh className="h-3 w-3 shrink-0" />
        <span className="min-w-0 truncate">
          {change ? (
            <>
              was{" "}
              <span className="line-through decoration-[#8a6d2f]/50">
                {change.from || "—"}
              </span>
            </>
          ) : (
            <>changed by the learner{at ? ` · ${at.slice(0, 10)}` : ""}</>
          )}
        </span>
      </div>
    </div>
  );
}
