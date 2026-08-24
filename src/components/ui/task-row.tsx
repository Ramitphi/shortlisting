import Link from "next/link";
import { cn } from "./cn";
import { TILE_TONES, type TileTone } from "./stat-tile";

/**
 * One to-do on a dashboard: a tinted icon carrying its count, what it is,
 * and a single action — the reference pattern's "for you today" row.
 *
 * This replaced a grid of action CARDS. Four cards next to five stat tiles
 * made nine boxes before the learner list began, every one with its own
 * icon and arrow; as rows inside one card, the to-dos read as a list of
 * work rather than a second wall of tiles. The count rides ON the icon —
 * where the eye already is — instead of being spelled out in the caption.
 */
export function TaskRow({
  href,
  icon,
  count,
  label,
  caption,
  cta = "Review",
  tone = "pink",
}: {
  href: string;
  icon: React.ReactNode;
  /** How many items are waiting — badged on the icon when > 0. */
  count?: number;
  label: string;
  caption?: string;
  /** The one action on the row. One verb, right-aligned, always a button. */
  cta?: string;
  tone?: TileTone;
}) {
  return (
    <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <span className="relative shrink-0">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:stroke-[1.9]",
            TILE_TONES[tone]
          )}
        >
          {icon}
        </span>
        {typeof count === "number" && count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-ink px-1 text-[9.5px] font-semibold leading-none text-paper">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium text-ink">
          {label}
        </div>
        {caption && (
          <div className="truncate text-[12px] text-caption">{caption}</div>
        )}
      </div>
      <Link
        href={href}
        className="btn-secondary !h-8 shrink-0 !px-3 !text-[12.5px]"
      >
        {cta}
      </Link>
    </div>
  );
}
