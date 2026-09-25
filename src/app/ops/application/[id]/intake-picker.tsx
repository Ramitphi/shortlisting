"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconCalendar, IconCheck } from "@/components/ui";
import { BatchCalendar, batchLabel, parseBatch } from "./batch-calendar";

/**
 * The batch this programme's seat is for, set by Ops while they vet.
 *
 * Same calendar the deferral uses, for the same reason: a batch starts on a
 * day, and the two places a date is set should not disagree about what a
 * batch is. Setting it here and moving it later are the same act at
 * different moments, so they read the same.
 *
 * Unlike a deferral, nothing has been promised yet — no letter is reissued
 * and nobody is told — so there is no confirm step. It opens under the row
 * rather than in a dialog: the choice is about the programme on this card,
 * and a modal would take the card away to ask about it.
 */
export function IntakePicker({
  intake,
  action,
}: {
  intake?: string | null;
  /** Bound to the programme; posts `intake` as a formatted label. */
  action: (formData: FormData) => void | Promise<void>;
}) {
  const current = parseBatch(intake);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | null>(current);
  const [busy, startTransition] = useTransition();
  const router = useRouter();

  // Nothing starts in the past. Unlike a deferral there is no floor of "after
  // the batch they already have" — this IS that batch, and Ops may be
  // correcting it rather than moving it.
  const min = (() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
  })();

  const save = () => {
    if (!date) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("intake", batchLabel(date));
      await action(fd);
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="mt-3 rounded-xl bg-paper px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="flex items-center gap-1.5 text-[12px] font-medium text-body">
          <IconCalendar className="h-3.5 w-3.5 text-caption" />
          Intake
        </span>
        <span className="text-[12.5px] text-ink">
          {current ? (
            <b className="font-semibold">{batchLabel(current)}</b>
          ) : (
            <span className="text-caption">
              Not set — the offer letter names this batch
            </span>
          )}
        </span>
        <button
          type="button"
          onClick={() => {
            setDate(current);
            setOpen((v) => !v);
          }}
          className="btn-secondary ml-auto !h-8 !px-3 !text-[12.5px]"
        >
          {open ? "Cancel" : current ? "Change" : "Set intake"}
        </button>
      </div>

      {open && (
        <div className="mt-3 border-t border-line pt-3">
          <BatchCalendar
            value={date}
            onChange={setDate}
            min={min}
            current={current}
          />
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[12.5px]">
              {date ? (
                <span className="text-ink">
                  Starts{" "}
                  <b>
                    {date.toLocaleDateString("en-GB", { weekday: "long" })},{" "}
                    {batchLabel(date)}
                  </b>
                </span>
              ) : (
                <span className="text-caption">
                  Pick the day this batch starts
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={save}
              disabled={!date || busy}
              className="btn-success !h-8 !px-3 !text-[12.5px] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconCheck className="h-3.5 w-3.5" />
              {busy ? "Saving…" : "Save intake"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
