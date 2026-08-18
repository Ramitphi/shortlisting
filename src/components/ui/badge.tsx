import { cn } from "./cn";

export type BadgeTone =
  | "neutral"
  | "blue"
  | "amber"
  | "purple"
  | "green"
  | "pink";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-cream text-body border-cream-line",
  blue: "bg-[#e9eef6] text-[#3d5a80] border-[#d6e0ee]",
  amber: "bg-[#f6efdd] text-[#8a6d2f] border-[#ecdfc0]",
  purple: "bg-[#efe9f6] text-[#6b4d8f] border-[#e1d5ee]",
  green: "bg-[#e8f2e9] text-[#3f6c45] border-[#d5e6d8]",
  pink: "bg-accent/10 text-accent border-accent/25",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className
      )}
      {...props}
    />
  );
}
