"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IconCalendar, IconCheck } from "@/components/ui";
import { DEFER_REASONS } from "@/lib/domain";

/**
 * Ops moves a learner to a later batch.
 *
 * The reason is always somebody else's finding — BCT could not collect, or
 * DCT is still waiting on paperwork — so it is picked here rather than held
 * as a status of our own that could drift from Phoenix. Nothing about the
 * learner changed, so there is no eligibility step and nothing for them to
 * sign; the only outputs are a new date and a reissued letter.
 */
export function DeferBatchDialog({
  learnerName,
  programme,
  currentIntake,
  action,
}: {
  learnerName: string;
  programme: { name: string; institute: string };
  currentIntake?: string | null;
  /** Bound to the application; posts `reason`, `intake`, `note`. */
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [intake, setIntake] = useState("");
  const [note, setNote] = useState("");
  const [mounted, setMounted] = useState(false);
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => setMounted(true), []);

  const ready = Boolean(reason) && intake.trim().length > 0;

  const submit = () =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("reason", reason);
      fd.set("intake", intake.trim());
      fd.set("note", note.trim());
      await action(fd);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setReason("");
          setIntake("");
          setNote("");
          setOpen(true);
        }}
        className="btn-secondary shrink-0"
      >
        <IconCalendar className="h-4 w-4" />
        Defer batch
      </button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-ink/30 scrim-in"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div className="relative w-full max-w-[460px] rounded-2xl border border-line bg-white p-6 shadow-[0_28px_60px_-18px_rgba(49,48,43,0.45)] toast-in">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream text-ink">
                  <IconCalendar className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h4 className="font-display text-[15px] font-semibold tracking-tight text-ink">
                    Move {learnerName} to a later batch
                  </h4>
                  <p className="mt-1 text-[13px] leading-relaxed text-body">
                    {programme.name} · {programme.institute}
                    {currentIntake ? ` · currently ${currentIntake}` : ""}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-[12px] font-medium text-ink">Why</div>
                <div className="mt-1.5 space-y-1.5">
                  {DEFER_REASONS.map((r) => (
                    <label
                      key={r.id}
                      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors ${
                        reason === r.id
                          ? "border-line-strong bg-paper"
                          : "border-line hover:bg-paper"
                      }`}
                    >
                      <input
                        type="radio"
                        name="defer_reason"
                        checked={reason === r.id}
                        onChange={() => setReason(r.id)}
                        className="mt-0.5 h-4 w-4 accent-[#AE383E]"
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-ink">
                          {r.label}
                        </span>
                        <span className="block text-[12px] text-caption">
                          {r.hint}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="mt-4 block">
                <span className="text-[12px] font-medium text-ink">
                  New batch
                </span>
                <input
                  value={intake}
                  onChange={(e) => setIntake(e.target.value)}
                  placeholder="e.g. January 2027"
                  className="input mt-1.5 !h-10 w-full"
                />
              </label>

              <label className="mt-3 block">
                <span className="text-[12px] font-medium text-ink">
                  Anything to add{" "}
                  <span className="font-normal text-caption">(optional)</span>
                </span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Context the counsellor should have"
                  className="input mt-1.5 w-full !py-2"
                />
              </label>

              <p className="mt-3 text-[12px] leading-snug text-caption">
                A new offer letter goes out with the new date. Nothing needs
                re-signing — the undertakings already cover moving to the next
                available batch.
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!ready || busy}
                  onClick={submit}
                  className="btn-primary flex-1"
                >
                  <IconCheck className="h-4 w-4" />
                  Defer &amp; reissue
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
