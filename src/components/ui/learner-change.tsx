import { IconRefresh } from "./icons";
import type { RecheckChange } from "@/lib/domain";

/**
 * How a learner's post-vetting edit shows on the staff boards — the
 * finalised treatment, chosen from six candidates: the changed row wears
 * an amber band all the time, and resting the pointer on it slides the
 * old answer in under the new one. One line tall at rest, the diff one
 * gesture away.
 */

/** The amber band a changed row wears — also the hover scope. */
export function changedRowClass(changed: boolean) {
  return changed
    ? " group/changed -mx-2.5 rounded-lg bg-[#faf3df] px-2.5 transition-colors hover:bg-[#f5ebcf]"
    : "";
}

/**
 * The reveal. With the recorded diff it reads "was <old>"; without one —
 * a re-check raised before the values were being recorded — it still says
 * WHO moved the row and when, so a banded row never stays mute on hover.
 */
export function LearnerWasLine({
  change,
  at,
}: {
  change?: RecheckChange;
  at?: string | null;
}) {
  return (
    <div className="max-h-0 overflow-hidden opacity-0 transition-all duration-150 group-hover/changed:mt-1 group-hover/changed:max-h-6 group-hover/changed:opacity-100">
      <div className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px] leading-none text-[#8a6d2f]">
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
