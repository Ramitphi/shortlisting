import { cn } from "./cn";

/** The ✳ brand mark + name, ShopOS-wordmark style. */
export function Wordmark({
  dark = false,
  className,
}: {
  dark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1.5 font-display font-semibold tracking-tight",
        dark ? "text-white" : "text-ink",
        className
      )}
    >
      Short<span className="text-accent">✳</span>listing
    </span>
  );
}
