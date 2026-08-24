import { IconCheck } from "./icons";

/**
 * The verification mark that sits against the learner's name, read the way a
 * verified badge is read anywhere else: a seal, not a sentence.
 *
 * It replaced a chip spelling out "3/4 verified" beside the title. At that
 * position nobody needs the arithmetic — they need to know at a glance whether
 * this profile has been checked. The count lives in the tooltip, and on the
 * section headers where it is actually actionable.
 *
 * Green once every section Ops owns is verified; grey until then. Grey is a
 * real state and is shown, because "not checked yet" is the thing a counsellor
 * most needs to notice before they act on a profile.
 */
export function VerifiedSeal({
  verified,
  label,
  className = "",
}: {
  verified: boolean;
  /** What the mark means, spelled out on hover. */
  label: string;
  className?: string;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      className={`inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full ${
        verified ? "bg-[#4c9257] text-white" : "bg-line-strong text-white"
      } ${className}`}
    >
      <IconCheck className="h-3 w-3" />
    </span>
  );
}
