"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck } from "./icons";

/**
 * A dropdown multi-select. Use it where the option list is long enough that a
 * row of chips becomes a wall — a handful of fixed options still reads better
 * as chips.
 *
 * The panel is portalled and positioned against the trigger: the content column
 * sets `overflow-x: clip`, which would otherwise crop a plain absolute dropdown.
 */
export function MultiSelect({
  values,
  options,
  max,
  onChange,
  name,
  placeholder = "Select…",
  emptyText = "Nothing to choose from yet",
  iconFor,
  disabled,
}: {
  values: string[];
  options: string[];
  max?: number;
  onChange: (next: string[]) => void;
  /** Posts the joined value with the form. */
  name?: string;
  placeholder?: string;
  /** Shown when there are no options to offer. */
  emptyText?: string;
  iconFor?: (option: string) => string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<DOMRect | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const reposition = () => setBox(trigger.current?.getBoundingClientRect() ?? null);

  useEffect(() => {
    if (!open) return;
    reposition();
    const close = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open]);

  const isDisabled = disabled || options.length === 0;
  const full = max !== undefined && values.length >= max;

  const toggle = (o: string) => {
    if (values.includes(o)) onChange(values.filter((v) => v !== o));
    else if (!full) onChange([...values, o]);
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        disabled={isDisabled}
        onClick={() => setOpen((o) => !o)}
        className={`flex w-full items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-[13px] transition-colors ${
          isDisabled
            ? "cursor-not-allowed border-dashed border-line-strong text-caption"
            : "border-line-strong bg-white hover:border-ink/40"
        }`}
      >
        <span className="min-w-0 flex-1">
          {isDisabled ? (
            emptyText
          ) : values.length === 0 ? (
            <span className="text-caption">{placeholder}</span>
          ) : (
            <span className="flex flex-wrap gap-1.5">
              {values.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 rounded-lg bg-cream px-2 py-0.5 text-[12.5px] text-ink"
                >
                  {iconFor?.(v) && <span>{iconFor(v)}</span>}
                  {v}
                </span>
              ))}
            </span>
          )}
        </span>
        {!isDisabled && (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            className={`h-4 w-4 shrink-0 text-caption transition-transform ${
              open ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            <path d="m6 9.5 6 6 6-6" />
          </svg>
        )}
      </button>

      {name && <input type="hidden" name={name} value={values.join(", ")} />}

      {open &&
        box &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} />
            <div
              className="fixed z-[56] overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_50px_-16px_rgba(49,48,43,0.35)]"
              style={{
                top: box.bottom + 6,
                left: box.left,
                width: box.width,
                maxHeight: `min(18rem, ${window.innerHeight - box.bottom - 24}px)`,
              }}
            >
              <div className="max-h-[18rem] overflow-y-auto py-1">
                {options.map((o) => {
                  const on = values.includes(o);
                  const blocked = !on && full;
                  return (
                    <button
                      key={o}
                      type="button"
                      disabled={blocked}
                      onClick={() => toggle(o)}
                      className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] transition-colors ${
                        blocked
                          ? "cursor-not-allowed text-caption/60"
                          : "text-ink hover:bg-muted"
                      }`}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          on
                            ? "border-ink bg-ink text-paper"
                            : "border-line-strong text-transparent"
                        }`}
                      >
                        <IconCheck className="h-2.5 w-2.5" />
                      </span>
                      {iconFor?.(o) && (
                        <span className="text-[15px] leading-none">{iconFor(o)}</span>
                      )}
                      <span className="min-w-0 flex-1">{o}</span>
                    </button>
                  );
                })}
              </div>
              {max !== undefined && (
                <div className="border-t border-line px-3.5 py-1.5 text-[11.5px] text-caption">
                  {values.length} of {max} selected
                </div>
              )}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
