"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconAlert, IconCheck } from "./icons";

export interface FieldComment {
  id: number;
  author: string;
  /** "2026-08-04 13:40:12" */
  at: string;
  text: string;
  resolved: boolean;
  /** Resolve / delete controls, for whoever is allowed them. */
  actions?: React.ReactNode;
}

/**
 * A comment marker on a form field, the way a review comment sits on a Figma
 * frame: a small pin at the edge of the field, and the thread only when you
 * ask for it.
 *
 * Ops leaves these against fields they cannot change themselves, so on a form
 * of thirty fields the comments have to be findable at a glance without each
 * one printing a paragraph under its field and doubling the height of the
 * page.
 */
export function FieldComments({ comments }: { comments: FieldComment[] }) {
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState<DOMRect | null>(null);
  const pin = useRef<HTMLButtonElement>(null);

  const openCount = comments.filter((c) => !c.resolved).length;

  const reposition = () => setBox(pin.current?.getBoundingClientRect() ?? null);

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

  if (comments.length === 0) return null;

  const allResolved = openCount === 0;

  return (
    <>
      <button
        ref={pin}
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={`${comments.length} comment${comments.length === 1 ? "" : "s"} from Ops`}
        aria-label={`${comments.length} comment${comments.length === 1 ? "" : "s"} from Ops`}
        className={`flex h-6 shrink-0 items-center gap-1 rounded-full border px-1.5 text-[11px] font-semibold transition-colors ${
          allResolved
            ? "border-line bg-muted text-caption hover:bg-line"
            : "border-[#ecdfc0] bg-[#f6efdd] text-[#8a6d2f] hover:bg-[#f0e5c9]"
        }`}
      >
        {allResolved ? (
          <IconCheck className="h-3 w-3" />
        ) : (
          <IconAlert className="h-3.5 w-3.5" />
        )}
        {comments.length > 1 && comments.length}
      </button>

      {/* Portalled and fixed-positioned: the content column sets
          `overflow-x: clip`, which would crop a plain absolute popover. */}
      {open &&
        box &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[75]"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-[76] w-[280px] overflow-hidden rounded-xl border border-line bg-white shadow-[0_24px_50px_-16px_rgba(49,48,43,0.35)]"
              style={{
                top: Math.min(box.bottom + 8, window.innerHeight - 200),
                // Hang left of the pin so it can't run off the right edge.
                left: Math.max(12, box.right - 280),
              }}
            >
              <div className="border-b border-line px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                {openCount > 0
                  ? `${openCount} open comment${openCount === 1 ? "" : "s"}`
                  : "Resolved"}
              </div>
              <div className="max-h-[260px] overflow-y-auto">
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className="border-b border-line px-3.5 py-2.5 last:border-0"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[12px] font-semibold text-ink">
                        {c.author}
                      </span>
                      <span className="text-[11px] text-caption">
                        {c.at.slice(11, 16)}
                      </span>
                      {c.resolved ? (
                        <span className="ml-auto flex h-4 w-4 items-center justify-center rounded-full bg-[#4c9257] text-white">
                          <IconCheck className="h-2.5 w-2.5" />
                        </span>
                      ) : (
                        c.actions && (
                          <span className="ml-auto shrink-0">{c.actions}</span>
                        )
                      )}
                    </div>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-body">
                      {c.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>,
          document.body
        )}
    </>
  );
}
