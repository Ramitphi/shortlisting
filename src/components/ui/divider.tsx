import { cn } from "./cn";

export function Divider({
  label,
  dark = false,
  className,
}: {
  label?: string;
  dark?: boolean;
  className?: string;
}) {
  const line = dark ? "bg-charcoal-line" : "bg-line";
  const text = dark ? "text-caption" : "text-caption";
  if (!label) return <div className={cn("h-px w-full", line, className)} />;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("h-px flex-1", line)} />
      <span className={cn("text-xs", text)}>{label}</span>
      <div className={cn("h-px flex-1", line)} />
    </div>
  );
}
