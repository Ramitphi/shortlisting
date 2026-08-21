import { cn } from "./cn";
import { IconCheck } from "./icons";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * A remark left on a form field, built like a comment rather than a status row.
 *
 * The state lives in the affordance, not in prose: an open remark shows a
 * resolve control, a resolved one shows a filled tick, a locked one shows
 * neither. Badges reading "Open" next to a "Mark resolved" button said the
 * same thing twice.
 */
export function RemarkCard({
  remarkId,
  author,
  at,
  text,
  resolved = false,
  locked = false,
  action,
  reply,
  acknowledged = false,
  replyAction,
  children,
}: {
  /** Names this card's reply box, so sibling cards in one form don't collide. */
  remarkId?: number;
  author: string;
  /** "2026-08-04 13:40:12" */
  at: string;
  text: string;
  resolved?: boolean;
  /** The shortlist has gone out — this is permanent history now. */
  locked?: boolean;
  /** The resolve/delete control, rendered top-right as an icon. */
  action?: React.ReactNode;
  /** The counsellor's written answer, once they have given one. */
  reply?: string | null;
  /** They thumbed it up — seen and agreed, nothing to type. */
  acknowledged?: boolean;
  /** Posts a written answer back to Ops. */
  replyAction?: (formData: FormData) => void;
  /** Extra controls under the note. */
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mt-2 rounded-xl border p-3",
        locked
          ? "border-line bg-paper"
          : resolved
            ? "border-[#dbe9dd] bg-white"
            : "border-[#ecdfc0] bg-white"
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
            locked || resolved
              ? "bg-cream text-caption"
              : "bg-[#f2e4c2] text-[#6b5525]"
          )}
        >
          {initials(author)}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "truncate text-[12.5px] font-semibold",
                locked ? "text-caption" : "text-ink"
              )}
            >
              {author}
            </span>
            <span className="text-[11.5px] text-caption">
              {at.slice(11, 16)}
            </span>
          </div>
          <p
            className={cn(
              "mt-1 text-[12.5px] leading-relaxed",
              locked ? "text-caption" : "text-body"
            )}
          >
            {text}
          </p>
          {/* Answering is not resolving: a thumbs-up or a written reply
              tells Ops it was read without closing anything. */}
          {acknowledged && (
            <p className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-[#3f6c45]">
              <IconCheck className="h-3 w-3" />
              Acknowledged by the counsellor
            </p>
          )}
          {reply && (
            <p className="mt-1.5 rounded-lg bg-paper px-2.5 py-1.5 text-[12px] leading-relaxed text-body">
              <b className="font-semibold text-ink">Reply:</b> {reply}
            </p>
          )}
          {!resolved && !locked && replyAction && !reply && (
            <span className="mt-2 flex items-center gap-1.5">
              <input
                name={remarkId ? `reply_${remarkId}` : "text"}
                placeholder="Reply to Ops…"
                className="input !h-7 !w-full !py-0 !text-[12px]"
              />
              <button
                formAction={replyAction}
                formNoValidate
                className="btn-secondary !h-7 shrink-0 !px-2.5 !text-[12px]"
              >
                Send
              </button>
            </span>
          )}
          {children}
        </div>

        {/* Resolved reads as a filled tick; open offers the control to become one. */}
        {resolved ? (
          <span
            title="Resolved"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4c9257] text-white"
          >
            <IconCheck className="h-3.5 w-3.5" />
          </span>
        ) : (
          !locked && action && <span className="shrink-0">{action}</span>
        )}
      </div>
    </div>
  );
}
