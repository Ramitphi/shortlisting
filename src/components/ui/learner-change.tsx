import { IconRefresh } from "./icons";
import type { RecheckChange, RecheckVariant } from "@/lib/domain";

/**
 * How a learner's post-vetting edit shows on the staff boards.
 *
 * r1 — the finalised treatment: the changed row wears an amber band all
 * the time and resting the pointer on it slides the old answer in under
 * the new one. One line tall at rest, the diff one gesture away.
 *
 * r7 — the designer's WIP reference: a quiet blue rule beside the changed
 * rows with the old value always visible as helper text, the way Google's
 * long forms mark the fields that matter. No hover, no tint.
 */

/** The band (r1) or rule (r7) a changed row wears — also the hover scope. */
export function changedRowClass(variant: RecheckVariant, changed: boolean) {
  if (!changed) return "";
  if (variant === "r7")
    return " -ml-3 border-l-[3px] border-[#3d5a80] py-1.5 pl-3";
  return " group/changed -mx-2.5 rounded-lg bg-[#faf3df] px-2.5 py-2 transition-colors hover:bg-[#f5ebcf]";
}

/**
 * The old answer. r1 reveals it on hover; r7 states it plainly under the
 * row. Without a recorded diff — a re-check raised before the values were
 * being recorded — both fall back to who moved the row and when, so a
 * marked row never stays mute.
 */
export function LearnerWasLine({
  variant,
  change,
  at,
}: {
  variant: RecheckVariant;
  change?: RecheckChange;
  at?: string | null;
}) {
  const body = change ? (
    <>
      was{" "}
      <span
        className={
          variant === "r7"
            ? "line-through decoration-caption/50"
            : "line-through decoration-[#8a6d2f]/50"
        }
      >
        {change.from || "—"}
      </span>
    </>
  ) : (
    <>changed by the learner{at ? ` · ${at.slice(0, 10)}` : ""}</>
  );

  if (variant === "r7") {
    // Helper text, always on — the calm half of the reference: the rule
    // says "look here", the line says what moved.
    return (
      <div className="w-full basis-full mt-1">
        <div className="flex items-center gap-1.5 whitespace-nowrap text-[11.5px] leading-none text-caption">
          <IconRefresh className="h-3 w-3 shrink-0 text-[#3d5a80]" />
          <span className="min-w-0 truncate">
            Changed by the learner — {body}
          </span>
        </div>
      </div>
    );
  }

  // r1 — a full-width SECOND line of the row, not a lodger inside the
  // value cell: the first line (label · value · icons) keeps its own
  // alignment and never re-centres when this slides in beneath it.
  return (
    <div className="w-full basis-full max-h-0 overflow-hidden opacity-0 transition-all duration-150 group-hover/changed:mt-1.5 group-hover/changed:max-h-7 group-hover/changed:opacity-100">
      <div className="flex items-center gap-1.5 whitespace-nowrap pb-0.5 text-[11.5px] leading-none text-[#8a6d2f]">
        <IconRefresh className="h-3 w-3 shrink-0" />
        <span className="min-w-0 truncate">{body}</span>
      </div>
    </div>
  );
}
