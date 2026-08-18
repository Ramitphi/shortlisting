import { cn } from "./cn";

const FIELD_BASE =
  "w-full border border-line-strong bg-surface text-sm text-ink placeholder:text-caption transition-colors focus:outline-none focus:border-ink/40 focus:ring-4 focus:ring-ink/5";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={cn(FIELD_BASE, "h-9 rounded-xl px-4", className)} {...props} />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(FIELD_BASE, "rounded-2xl px-4 py-2.5", className)}
      {...props}
    />
  );
}

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(FIELD_BASE, "h-9 rounded-full pl-4 pr-9", className)}
      {...props}
    />
  );
}
