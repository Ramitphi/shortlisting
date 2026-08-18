import { cn } from "./cn";
import { IconInfo } from "./icons";

/** Icon + bold value + light label — the meta row used inside detail cards. */
export function Meta({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-caption">{icon}</span>
      <span className="text-[13px] font-medium text-ink">{value}</span>
      <span className="text-[13px] text-caption">{label}</span>
    </span>
  );
}

export type ChipTone =
  | "neutral"
  | "green"
  | "amber"
  | "accent"
  | "muted"
  | "red"
  | "outline";

/**
 * Small status pill — the only one in the app. Every status anywhere reads as
 * the same object with a different tone; a second implementation is how you
 * end up with an outlined chip beside a filled amber one meaning
 * substantially the same thing.
 *
 * outline = nothing here yet · muted = present, not confirmed ·
 * green = confirmed · red = rejected · amber = needs attention.
 */
export function CardChip({
  tone = "neutral",
  className,
  tooltip,
  children,
}: {
  tone?: ChipTone;
  className?: string;
  /**
   * The story behind the status — why it was rejected, who verified it. Shown
   * on hover behind an ⓘ rather than as a second line of text: the detail
   * matters when you ask for it, not on every row all the time.
   */
  tooltip?: string;
  children: React.ReactNode;
}) {
  const tones: Record<ChipTone, string> = {
    neutral: "border-cream-line bg-cream text-body",
    green: "border-[#d5e6d8] bg-[#e8f2e9] text-[#3f6c45]",
    amber: "border-[#ecdfc0] bg-[#f6efdd] text-[#8a6d2f]",
    accent: "border-accent/25 bg-accent/10 text-accent",
    muted: "border-line bg-muted text-caption",
    red: "border-[#f0d5d3] bg-[#fbeaea] text-[#c0392f]",
    outline: "border-line-strong bg-transparent text-caption",
  };

  const chip = (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-0.5 text-[11px] font-medium",
        tones[tone],
        className
      )}
    >
      {children}
      {tooltip && <IconInfo className="h-3 w-3 opacity-70" />}
    </span>
  );

  if (!tooltip) return chip;

  return (
    <span className="group relative inline-flex">
      {chip}
      {/* Left-aligned to the chip so it can't run past the column and get
          clipped by the content area's overflow. */}
      <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-1.5 w-max max-w-[220px] rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] font-normal leading-snug text-paper opacity-0 shadow-[0_10px_24px_-8px_rgba(49,48,43,0.6)] transition-opacity duration-150 group-hover:opacity-100">
        {tooltip}
      </span>
    </span>
  );
}

/** Coloured status dot + label, sitting under a card title. */
export function DotStatus({
  color,
  children,
}: {
  color: string;
  children: React.ReactNode;
}) {
  return (
    <span className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-body">
      <span className={cn("h-1.5 w-1.5 rounded-full", color)} />
      {children}
    </span>
  );
}

/** Two-letter badge from an institute name, e.g. "IIT Madras" → "IM". */
export function instituteInitials(name: string) {
  return name
    .split(/\s+/)
    .filter((w) => /[A-Za-z]/.test(w[0] ?? ""))
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
