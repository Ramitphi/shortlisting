import Link from "next/link";
import { cn } from "./cn";
import { IconArrowRight } from "./icons";
import { TILE_TONES, type TileTone } from "./stat-tile";

/** Reference-style action card: tinted icon square, title with slide-in arrow, subtitle. */
export function QuickAction({
  href,
  icon,
  title,
  sub,
  tone = "pink",
  delay = 0,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  sub: string;
  tone?: TileTone;
  delay?: number;
}) {
  return (
    <Link
      href={href}
      className="card card-hover fade-up group block p-5"
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl [&_svg]:stroke-[1.9]",
          TILE_TONES[tone]
        )}
      >
        {icon}
      </span>
      {/* Arrow sits at the right edge of the card and is always visible, so the
          card reads as clickable without needing a hover. */}
      <span className="mt-3.5 flex items-center justify-between gap-3">
        <span className="text-[14px] font-semibold text-ink">{title}</span>
        <IconArrowRight className="h-4 w-4 shrink-0 text-caption" />
      </span>
      <span className="mt-0.5 block text-[13px] text-body">{sub}</span>
    </Link>
  );
}
