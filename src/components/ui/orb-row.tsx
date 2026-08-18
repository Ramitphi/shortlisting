/**
 * A row of overlapping frosted orbs, largest in the middle and tapering out.
 * Says "we span all of these" in one glance — use it for a small, fixed set
 * of peer things (people, destinations), never for a list that can grow.
 *
 * Every orb, its overlap and its glyph size derive from one `--orb` hero
 * diameter given in viewport units, so the row scales with its panel rather
 * than overflowing it at narrower widths.
 */
export function OrbRow({
  items,
  className = "",
}: {
  /** Odd count works best — the middle one becomes the hero. */
  items: { key: string; label: string; node: React.ReactNode }[];
  className?: string;
}) {
  const mid = (items.length - 1) / 2;
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ ["--orb" as string]: "min(19vw, 300px)" }}
    >
      {items.map((item, i) => {
        const step = Math.abs(i - mid); // 0 at the centre, growing outward
        const ratio = [1, 0.76, 0.575][Math.min(step, 2)];
        const size = `calc(var(--orb) * ${ratio})`;
        return (
          <div
            key={item.key}
            title={item.label}
            className="grid shrink-0 place-items-center rounded-full border-[3px] border-white bg-white/50 shadow-[0_24px_50px_-18px_rgba(60,20,24,0.3)] backdrop-blur-md"
            style={{
              width: size,
              height: size,
              marginLeft: i === 0 ? 0 : `calc(${size} * -0.15)`,
              // Centre orb sits on top; the rest stack outward behind it.
              zIndex: items.length - Math.round(step * 2),
              opacity: 1 - step * 0.06,
              animation: `fade-up 0.6s ease-out ${step * 90}ms backwards`,
            }}
          >
            <span
              className="grid h-full w-full place-items-center overflow-hidden rounded-full leading-none"
              style={{ fontSize: `calc(${size} * 0.42)` }}
            >
              {item.node}
            </span>
          </div>
        );
      })}
    </div>
  );
}
