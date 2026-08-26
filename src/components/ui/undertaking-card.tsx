import { IconCheck, IconDoc } from "./icons";

/**
 * One undertaking, one row: what it is, whether it is signed, and the action.
 *
 * It used to be a tall card carrying the learner's name, the counsellor's
 * name and the learner's email as four label/value pairs — every one of them
 * already on the page (in the header) or on the document itself, repeated
 * once per undertaking. Four rows of duplicated names buried the only thing
 * that varies between them: signed, or not.
 *
 * Rows stack; they do not tile. A list of documents is a list.
 */
export function UndertakingCard({
  title,
  signedAt,
  action,
  secondaryAction,
}: {
  title: string;
  signedAt?: string | null;
  /** The primary control, e.g. the document dialog trigger. */
  action: React.ReactNode;
  /** Optional extra control — Ops can remove what Ops attached. */
  secondaryAction?: React.ReactNode;
}) {
  const signed = Boolean(signedAt);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-white px-4 py-3">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          signed ? "bg-[#e8f2e9] text-[#3f6c45]" : "bg-cream text-caption"
        }`}
      >
        {signed ? (
          <IconCheck className="h-4 w-4" />
        ) : (
          <IconDoc className="h-4 w-4" />
        )}
      </span>

      <span className="min-w-[10rem] flex-1">
        <span className="block truncate text-[13.5px] font-medium text-ink">
          {title}
        </span>
        <span
          className={`block text-[12px] ${
            signed ? "text-[#3f6c45]" : "text-caption"
          }`}
        >
          {signed
            ? `Signed on ${signedAt?.slice(0, 10)}`
            : "Awaiting signature"}
        </span>
      </span>

      <span className="flex shrink-0 items-center gap-2">
        {action}
        {secondaryAction}
      </span>
    </div>
  );
}
