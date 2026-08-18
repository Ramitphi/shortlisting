import { cn } from "./cn";

export type TileTone = "neutral" | "blue" | "amber" | "purple" | "green" | "pink";

// Light tone fill with the icon in a deeper shade of the same tone, so the
// glyph reads as solid rather than washed out. Used by QuickAction.
export const TILE_TONES: Record<TileTone, string> = {
  neutral: "bg-[#f9ecec] text-[#9c2f35]",
  blue: "bg-[#f8e6e7] text-[#9c2f35]",
  amber: "bg-[#f6e0e1] text-[#96272f]",
  purple: "bg-[#f3d7d8] text-[#8e2129]",
  green: "bg-[#f8e6e7] text-[#a02c34]",
  pink: "bg-accent/10 text-[#9c2f35]",
};

/**
 * Stat card — a 64px brand tile whose height matches the value + label block
 * beside it, carrying two flat tones split on the diagonal.
 */
export function StatTile({
  icon,
  label,
  value,
  badge,
  delay = 0,
  className,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  badge?: string;
  /** Kept for API compatibility; the tile always uses the brand tones now. */
  tone?: TileTone;
  delay?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card card-hover fade-up flex items-center gap-3 p-4",
        className
      )}
      style={delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-white"
        style={{
          backgroundImage:
            "linear-gradient(135deg, #bd2a39 0 50%, #c53e4c 50% 100%)",
        }}
      >
        <span className="[&_svg]:h-[18px] [&_svg]:w-[18px]">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-xl font-semibold leading-none tracking-tight text-ink">
          {value}
        </div>
        <div className="mt-1 truncate text-xs text-caption">{label}</div>
      </div>
      {badge && (
        <span className="shrink-0 rounded-md border border-cream-line bg-cream px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-body">
          {badge}
        </span>
      )}
    </div>
  );
}
