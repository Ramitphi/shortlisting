"use client";

import { useState } from "react";
import { IconCheck, IconNote, IconX } from "./icons";

/**
 * Ops' three moves on a single answer: it is right, it is wrong, or there is
 * something to say about it.
 *
 * This replaced a comment box sitting open on every field. A box asks for
 * prose on thirty answers that are almost all simply fine — so the two verdicts
 * are one click each, and the note stays behind the third icon for the answers
 * that actually need words. Clicking the verdict a field already has clears it.
 *
 * The note is NOT a third verdict. It posts an ordinary remark, so it keeps
 * behaving like every other comment: the counsellor can reply, thumbs-up or
 * resolve it, and an info note never counts as work.
 */
export function FieldVerdict({
  state,
  correctAction,
  incorrectAction,
  byName,
  at,
  children,
  className = "",
}: {
  /** Ops' current verdict, if they have given one. */
  state?: "correct" | "incorrect" | null;
  /**
   * One bound action per verdict. Two actions rather than one reading a
   * `verdict` field, because the page that renders this is a Client Component
   * and cannot declare an inline server action to do the reading.
   */
  correctAction: () => void;
  incorrectAction: () => void;
  byName?: string | null;
  at?: string | null;
  /** The note form — rendered under the icons once the note icon is on. */
  children?: React.ReactNode;
  /** Extra classes on the icon cluster (e.g. ml-auto to pin it right). */
  className?: string;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const stamp = `${byName ?? "Ops"}${at ? ` · ${at.slice(0, 10)}` : ""}`;

  // Quiet until used. A page of thirty rows cannot afford three bordered
  // buttons per row — the verdicts sit as bare icons and only the one that
  // has been given carries a tint.
  const base =
    "flex h-7 w-7 items-center justify-center rounded-lg transition-colors";
  const idle = "text-caption hover:bg-muted hover:text-ink";

  return (
    <>
      <div className={`flex shrink-0 items-center gap-0.5 ${className}`}>
        <form action={correctAction}>
          <button
            title={
              state === "correct"
                ? `Marked correct by ${stamp} — click to clear`
                : "Mark correct"
            }
            aria-label="Mark correct"
            className={`${base} ${
              state === "correct" ? "bg-[#e8f2e9] text-[#3f6c45]" : idle
            }`}
          >
            <IconCheck className="h-4 w-4" />
          </button>
        </form>
        <form action={incorrectAction}>
          <button
            title={
              state === "incorrect"
                ? `Marked incorrect by ${stamp} — click to clear`
                : "Mark incorrect"
            }
            aria-label="Mark incorrect"
            className={`${base} ${
              state === "incorrect" ? "bg-[#f7ebec] text-[#9c3b41]" : idle
            }`}
          >
            <IconX className="h-4 w-4" />
          </button>
        </form>
        {children && (
          <button
            type="button"
            onClick={() => setNoteOpen((o) => !o)}
            title="Add a note for the counsellor"
            aria-label="Add a note"
            aria-expanded={noteOpen}
            className={`${base} ${noteOpen ? "bg-ink text-paper" : idle}`}
          >
            <IconNote className="h-4 w-4" />
          </button>
        )}
      </div>
      {/* The note form opens on its own full-width line under the row — the
          row is a key-value line now, and a form crammed into its tail cell
          broke the column rhythm. `basis-full` wraps it inside the row flex. */}
      {noteOpen && children && (
        <div className="basis-full pt-1.5">{children}</div>
      )}
    </>
  );
}

/**
 * The same verdict, read-only — what the counsellor sees against a field Ops
 * has ruled on. Nothing to click: it is Ops' call, not theirs.
 */
export function FieldVerdictMark({
  state,
  byName,
  at,
  className = "",
}: {
  state?: "correct" | "incorrect" | null;
  byName?: string | null;
  at?: string | null;
  /** Extra classes on the chip (e.g. ml-auto to pin it right). */
  className?: string;
}) {
  if (!state) return null;
  const stamp = `${byName ?? "Ops"}${at ? ` on ${at.slice(0, 10)}` : ""}`;
  return (
    <span
      title={`Marked ${state} by ${stamp}`}
      aria-label={`Ops marked this ${state}`}
      className={`inline-flex h-[18px] shrink-0 items-center gap-1 rounded-full border px-1.5 text-[10.5px] font-semibold ${className} ${
        state === "correct"
          ? "border-[#cfe3d2] bg-[#e8f2e9] text-[#3f6c45]"
          : "border-[#e6cdcf] bg-[#f7ebec] text-[#9c3b41]"
      }`}
    >
      {state === "correct" ? (
        <IconCheck className="h-2.5 w-2.5" />
      ) : (
        <IconX className="h-2.5 w-2.5" />
      )}
      {state === "correct" ? "Correct" : "Incorrect"}
    </span>
  );
}
