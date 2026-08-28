"use client";

import { useEffect, useRef, useState } from "react";
import { IconCheck, MultiSelect } from "@/components/ui";
import { COUNTRY_FLAGS, type FieldDef } from "@/lib/domain";

/**
 * A single eligibility field, editable in place while Ops holds the
 * application. Per the journey diagram, Ops "edits, fills and comments":
 * corrections where the documents contradict the form, and the Ops-derived
 * fields (scores, university) read off the documents. The comment pin beside
 * the field carries the why; this carries the what.
 *
 * Saves on blur (or immediately for a dropdown) — thirty fields with thirty
 * Save buttons is a screen nobody finishes.
 */
export function OpsField({
  field,
  value,
  action,
}: {
  field: FieldDef;
  value: string;
  /** Bound to the application and field key; posts a single `value`. */
  action: (formData: FormData) => void | Promise<void>;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(value);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // The server is the source of truth: once the action revalidates, take
  // whatever came back. Without this a rejected write would leave the input
  // showing an edit that never landed.
  useEffect(() => setDraft(value), [value]);
  useEffect(() => () => clearTimeout(timer.current), []);

  // A score is a percentage — 104 is a typo, not a value. Checked here so the
  // typist hears about it, and again in the action so it can never land.
  const problem = (next: string): string | null => {
    if (field.type !== "number" || next === "") return null;
    const n = Number(next);
    if (Number.isNaN(n)) return "Numbers only";
    if (field.min !== undefined && n < field.min) return `Min ${field.min}`;
    if (field.max !== undefined && n > field.max) return `Max ${field.max}`;
    return null;
  };

  const commit = (next: string) => {
    const err = problem(next);
    setError(err);
    if (err || next === value) return;
    form.current?.requestSubmit();
    setSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), 1800);
  };

  const cls = `input !h-9 !w-full !py-0 !text-[13px]${
    error ? " !border-accent" : ""
  }`;

  // Multi-pick values live as a ", "-joined string; the dropdown edits the
  // list — same silhouette as the single-pick selects around it.
  const picks = field.multi ? draft.split(", ").filter(Boolean) : [];
  const hidden = useRef<HTMLInputElement>(null);

  return (
    <form
      ref={form}
      action={action}
      // Grows into the cell up to the cap but never claims the whole line —
      // the verdict beside it stays on the same row.
      className="min-w-[10rem] max-w-[260px] flex-1 basis-0"
    >
      {field.multi && field.options ? (
        <>
          {/* A DOM write, not React state — requestSubmit runs before the
              re-render, so the form has to carry the value already. */}
          <input ref={hidden} type="hidden" name="value" defaultValue={draft} />
          <MultiSelect
            values={picks}
            options={[...field.options]}
            max={field.maxPick}
            iconFor={(o) => COUNTRY_FLAGS[o] ?? ""}
            onChange={(next) => {
              const joined = next.join(", ");
              setDraft(joined);
              if (hidden.current) hidden.current.value = joined;
              commit(joined);
            }}
          />
        </>
      ) : field.type === "select" ? (
        <select
          name="value"
          value={draft}
          className={cls}
          onChange={(e) => {
            setDraft(e.target.value);
            commit(e.target.value);
          }}
        >
          <option value="">—</option>
          {field.options?.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          name="value"
          type={
            field.type === "month"
              ? "month"
              : field.type === "number"
                ? "number"
                : field.type === "date"
                  ? "date"
                  : "text"
          }
          min={field.min}
          max={field.max}
          value={draft}
          className={cls}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />
      )}

      {/* In normal flow under the input, not hung off its right edge — the
          review sections clip overflow for their rounded corners, and a
          "not saved" warning that gets clipped is worse than none. */}
      {error ? (
        <span className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-accent">
          {error} — not saved
        </span>
      ) : (
        saved && (
          <span className="mt-1 flex items-center gap-1 text-[11.5px] font-medium text-[#3f6c45]">
            <IconCheck className="h-3 w-3" />
            Saved
          </span>
        )
      )}
    </form>
  );
}
