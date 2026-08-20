"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconX } from "./icons";

/**
 * A panel that fans out from the right edge, over the page.
 *
 * Used for content that is worth having but not worth a permanent column —
 * the activity log being the case it was built for. The trigger sits inline
 * wherever it is relevant; the panel itself is portalled to the body so the
 * content column's `overflow-x: clip` cannot crop it.
 */
export function SideSheet({
  title,
  subtitle,
  trigger,
  triggerClassName = "btn-secondary !h-9",
  size = "default",
  children,
}: {
  title: string;
  subtitle?: string;
  /** Button contents. */
  trigger: React.ReactNode;
  triggerClassName?: string;
  /** "wide" for tabular content — the document locker needs the room. */
  size?: "default" | "wide";
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Escape closes, and the page behind must not scroll under the panel.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {trigger}
      </button>

      {open &&
        mounted &&
        createPortal(
          <>
            <div
              className="scrim-in fixed inset-0 z-[70] bg-ink/40 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className={`sheet-in fixed right-0 top-0 z-[71] flex h-dvh w-full flex-col border-l border-line bg-white shadow-[-24px_0_60px_-30px_rgba(49,48,43,0.5)] ${
                size === "wide" ? "max-w-[860px]" : "max-w-[440px]"
              }`}
            >
              <div className="flex items-start gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink">
                    {title}
                  </h2>
                  {subtitle && (
                    <p className="mt-0.5 truncate text-[12.5px] text-body">
                      {subtitle}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-caption transition-colors hover:bg-muted hover:text-ink"
                >
                  <IconX className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                {children}
              </div>

              <div className="border-t border-line px-5 py-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary w-full !h-9"
                >
                  Back to the application
                </button>
              </div>
            </aside>
          </>,
          document.body
        )}
    </>
  );
}
