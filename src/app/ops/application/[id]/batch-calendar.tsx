"use client";

import { useMemo, useState } from "react";
import { IconArrowRight } from "@/components/ui";

/**
 * The batch start date, picked from a real calendar.
 *
 * The browser's month input could only say "March 2027" and looked different
 * in every browser. A batch starts on a day, so Ops picks the day: one month
 * at a time, earlier days closed off, the learner's current batch marked so
 * the move is always read against where they are now.
 */

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());
const sameDay = (a: Date | null, b: Date | null) =>
  Boolean(a && b) &&
  a!.getFullYear() === b!.getFullYear() &&
  a!.getMonth() === b!.getMonth() &&
  a!.getDate() === b!.getDate();
const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

/** "12 March 2027" — the one form the letter and the learner's card show. */
export function batchLabel(d: Date) {
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Reads a stored batch back into a date. Older batches were held as a month
 * ("March 2027"), so those read as the first of that month.
 */
export function parseBatch(value?: string | null): Date | null {
  if (!value) return null;
  const withDay = /^\d{1,2} \w+ \d{4}$/.test(value.trim());
  const d = new Date(withDay ? value : `1 ${value}`);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

export function BatchCalendar({
  value,
  onChange,
  min,
  current,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  /** First day that can be picked. */
  min: Date;
  /** The learner's current batch, marked on the grid. */
  current: Date | null;
}) {
  const today = startOfDay(new Date());
  const [view, setView] = useState(() =>
    addMonths(value ?? current ?? min, 0)
  );

  const days = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    // Monday-first grid.
    const lead = (first.getDay() + 6) % 7;
    const count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = Array(lead).fill(null);
    for (let i = 1; i <= count; i++)
      cells.push(new Date(view.getFullYear(), view.getMonth(), i));
    while (cells.length % 7) cells.push(null);
    return cells;
  }, [view]);

  const canGoBack = addMonths(view, 0) > addMonths(min, 0);

  // Quick moves from the current batch — the usual asks are "a month later",
  // "next quarter", "next half".
  const base = current ?? min;
  const quick = [1, 3, 6].map((n) => {
    const d = new Date(base.getFullYear(), base.getMonth() + n, base.getDate());
    return { n, d: d < min ? min : d };
  });

  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setView(addMonths(view, -1))}
          disabled={!canGoBack}
          aria-label="Previous month"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink transition-colors hover:bg-paper disabled:pointer-events-none disabled:opacity-30"
        >
          <IconArrowRight className="h-4 w-4 rotate-180" />
        </button>
        <div className="text-[13.5px] font-semibold text-ink">
          {view.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </div>
        <button
          type="button"
          onClick={() => setView(addMonths(view, 1))}
          aria-label="Next month"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink transition-colors hover:bg-paper"
        >
          <IconArrowRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 text-center text-[11px] font-medium uppercase tracking-[0.04em] text-caption">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d, i) => {
          if (!d) return <div key={i} />;
          const disabled = d < min;
          const selected = sameDay(d, value);
          const isCurrent = sameDay(d, current);
          const isToday = sameDay(d, today);
          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => onChange(d)}
              title={isCurrent ? "Current batch" : undefined}
              className={`relative mx-auto flex h-9 w-9 items-center justify-center rounded-full text-[13px] transition-colors ${
                selected
                  ? "bg-[#AE383E] font-semibold text-white"
                  : disabled
                    ? "text-caption/40"
                    : "text-ink hover:bg-paper"
              } ${isToday && !selected ? "ring-1 ring-line-strong" : ""}`}
            >
              {d.getDate()}
              {isCurrent && (
                <span
                  className={`absolute bottom-1 h-1 w-1 rounded-full ${
                    selected ? "bg-white" : "bg-[#AE383E]"
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
        {quick.map(({ n, d }) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              onChange(d);
              setView(addMonths(d, 0));
            }}
            className={`rounded-full border px-2.5 py-1 text-[12px] transition-colors ${
              sameDay(d, value)
                ? "border-[#AE383E] bg-[#AE383E]/5 text-[#AE383E]"
                : "border-line text-body hover:bg-paper"
            }`}
          >
            +{n} month{n === 1 ? "" : "s"}
          </button>
        ))}
        {current && (
          <span className="ml-auto flex items-center gap-1.5 text-[11.5px] text-caption">
            <span className="h-1.5 w-1.5 rounded-full bg-[#AE383E]" />
            Current batch
          </span>
        )}
      </div>
    </div>
  );
}
