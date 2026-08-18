import { IconShield } from "./icons";

/**
 * The learner's own sign-off, shown to whoever is looking at the application.
 * Ops cannot release the offer letter without it, so it needs to read as a
 * gate that has been passed rather than as decoration.
 */
export function CertifiedChip({ at }: { at?: string | null }) {
  if (!at) return null;
  return (
    <span
      title={`Certified by the learner on ${at}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-[#cde1d2] bg-[#e2eee5] px-2.5 py-0.5 text-xs font-medium text-[#2f5e38]"
    >
      <IconShield className="h-3.5 w-3.5" />
      Certified by learner
    </span>
  );
}
