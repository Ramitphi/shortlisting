import { IconAsterisk } from "./icons";

/** Time-of-day greeting, computed on the server per request. */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Animated sunset header — plum-to-ember sky with drifting cloud banks that
 * fade into the page background. CSS-only (blurred blobs on slow loops).
 */
export function CloudHero({
  title,
  subtitle,
  surface = "paper",
}: {
  title: string;
  subtitle?: string;
  surface?: "paper" | "white";
}) {
  // The sky must resolve to whatever the page sits on, or a seam shows.
  const base = surface === "white" ? "#ffffff" : "rgb(var(--paper))";
  // Same colour at varying alpha, so the fade never shifts hue.
  const fade = (a: number) =>
    surface === "white"
      ? `rgba(255,255,255,${a})`
      : `rgb(var(--paper) / ${a})`;
  return (
    <div className="relative overflow-hidden">
      {/* Sky — the brand cloud image, slowly panning left↔right */}
      <div className="cloud-pan cloud-front">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/showcase/clouds.png" alt="" aria-hidden />
      </div>

      {/* Fade into the page. A plain two-stop gradient leaves a visible start
          line, so ease it: barely-there for the first third, then accelerate. */}
      <div
        className="absolute inset-x-0 bottom-0 h-32"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${fade(0)} 0%, ${fade(0.06)} 30%, ${fade(0.3)} 55%, ${fade(0.72)} 78%, ${fade(1)} 100%)`,
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-8 pb-24 pt-14">
        <h1 className="flex items-center gap-3 font-display text-[30px] font-semibold tracking-[-0.02em] text-white drop-shadow-[0_1px_12px_rgba(120,15,30,0.35)]">
          {title}
          <IconAsterisk className="spin-mark h-6 w-6 shrink-0 text-white/90" />
        </h1>
        {subtitle && (
          <p className="mt-1 text-[14.5px] text-white/90 drop-shadow-[0_1px_8px_rgba(120,15,30,0.3)]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
