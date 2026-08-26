import { IconAlert, IconCheck } from "./icons";

/**
 * The rail card that says what stands between this application and its next
 * step — the reference pattern's right-column checklist, in our language.
 *
 * The footer bar spreads this across chips and a status line; here it is
 * one card, top items first, so the reader knows what to fix before they
 * have scrolled anything. Empty is worth showing too: "nothing missing" is
 * the answer the reader came for.
 */
export function NeedsFixing({
  items,
  doneText = "Nothing outstanding — this can move on.",
}: {
  /** What is missing, most blocking first. */
  items: { label: string; detail?: string }[];
  doneText?: string;
}) {
  return (
    <div className="card p-5">
      <h2 className="text-[14px] font-semibold text-ink">Needs fixing</h2>
      {items.length === 0 ? (
        <p className="mt-2.5 flex items-center gap-2 text-[12.5px] text-[#3f6c45]">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e8f2e9]">
            <IconCheck className="h-3 w-3" />
          </span>
          {doneText}
        </p>
      ) : (
        <ul className="mt-2.5 space-y-2.5">
          {items.slice(0, 3).map((it) => (
            <li key={it.label} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f6efdd] text-[#8a6d2f]">
                <IconAlert className="h-3 w-3" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-snug text-ink">
                  {it.label}
                </span>
                {it.detail && (
                  <span className="block text-[12px] leading-snug text-caption">
                    {it.detail}
                  </span>
                )}
              </span>
            </li>
          ))}
          {items.length > 3 && (
            <li className="pl-7 text-[12px] text-caption">
              +{items.length - 3} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
