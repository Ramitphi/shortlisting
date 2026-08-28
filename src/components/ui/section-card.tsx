import { cn } from "./cn";

/**
 * One stacked section of an application page — the reference pattern's
 * card anatomy (Healthcare, Life Insurance): a filled glyph naming the
 * section, the title beside it, the one action on the right, and the
 * section's own content below. The stack of these replaced the tab walk:
 * every section is on screen, in reading order, each one self-titled.
 *
 * The glyph sits in a soft tile rather than bare — bare black marks in a
 * five-card stack read as bullets, and the tile is the shape our stat
 * tiles and task rows already taught the reader.
 */
export function SectionCard({
  id,
  icon,
  title,
  subtitle,
  action,
  className,
  children,
}: {
  /** Scroll anchor, so footer chips and notices can point at a section. */
  id?: string;
  icon: React.ReactNode;
  title: React.ReactNode;
  /** One short line under the title. Longer guidance belongs in content. */
  subtitle?: React.ReactNode;
  /** Right-aligned header control(s) — at most one decision per section. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // scroll-mt clears the sticky footer's opposite number: anchored jumps
    // land with the header visible instead of flush under the viewport top.
    <section id={id} className={cn("card scroll-mt-6 p-6", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <span className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream text-ink [&_svg]:h-[17px] [&_svg]:w-[17px]">
            {icon}
          </span>
          <span className="min-w-0">
            <h2 className="font-display text-[15px] font-semibold leading-tight tracking-tight text-ink">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[12.5px] leading-snug text-body">
                {subtitle}
              </p>
            )}
          </span>
        </span>
        {action && (
          <span className="flex shrink-0 flex-wrap items-center gap-2">
            {action}
          </span>
        )}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
