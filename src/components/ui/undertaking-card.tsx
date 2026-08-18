import { IconDoc } from "./icons";

/**
 * One undertaking, one small card: title, the parties as label/value pairs,
 * and the action in a tinted footer. Shared by the learner, counsellor and Ops.
 */
export function UndertakingCard({
  title,
  learnerName,
  counsellorName,
  email,
  signedAt,
  action,
  secondaryAction,
}: {
  title: string;
  learnerName: string;
  counsellorName: string;
  email: string;
  signedAt?: string | null;
  /** The primary control, e.g. the document dialog trigger. */
  action: React.ReactNode;
  /** Optional extra control — Ops can remove what Ops attached. */
  secondaryAction?: React.ReactNode;
}) {
  const signed = Boolean(signedAt);
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-white">
      <div className="flex items-center gap-2 px-4 pt-4">
        <IconDoc className="h-4 w-4 shrink-0 text-caption" />
        <span className="truncate text-[14px] font-semibold text-ink">
          {title}
        </span>
      </div>

      <dl className="flex-1 space-y-3 px-4 py-4">
        <div>
          <dt className="text-[12.5px] text-caption">Learner representative</dt>
          <dd className="text-[14px] font-medium text-ink">{learnerName}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-caption">Academic representative</dt>
          <dd className="text-[14px] font-medium text-ink">{counsellorName}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-caption">Email</dt>
          <dd className="truncate text-[14px] font-medium text-ink">{email}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-caption">Status</dt>
          <dd
            className={`text-[14px] font-medium ${
              signed ? "text-[#3f6c45]" : "text-[#8a6d2f]"
            }`}
          >
            {signed
              ? `Signed · ${signedAt?.slice(0, 10)}`
              : "Awaiting learner signature"}
          </dd>
        </div>
      </dl>

      <div className="flex gap-2 border-t border-line bg-paper px-4 py-3">
        <div className="flex-1">{action}</div>
        {secondaryAction && <div className="flex-1">{secondaryAction}</div>}
      </div>
    </div>
  );
}
