"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IconArrowRight, IconCalendar, IconCheck } from "@/components/ui";
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
  // Two steps on purpose. Moving a batch reissues the offer letter and tells
  // the learner immediately, so the last click states the change in words
  // rather than leaving it implied by three fields.
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [reason, setReason] = useState<string>("");
  const [intake, setIntake] = useState("");
  const [note, setNote] = useState("");
  const [mounted, setMounted] = useState(false);
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => setMounted(true), []);

  const ready = Boolean(reason) && intake.length > 0;

  /**
   * The picker speaks "2027-05"; the offer letter and the learner's start
   * line speak "May 2027". Converting here keeps one readable form in the
   * data — a batch typed by hand arrived as Jan 2027, January 2027 and
   * 01/2027 and none of them sorted or compared.
   */
  const intakeLabel = (() => {
    const m = /^(\d{4})-(\d{2})$/.exec(intake);
    if (!m) return intake;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    return Number.isNaN(d.getTime())
      ? intake
      : d.toLocaleString("en-GB", { month: "long", year: "numeric" });
  })();

  // Nothing is deferred into the past.
  const thisMonth = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  })();

  const submit = () =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("reason", reason);
      fd.set("intake", intakeLabel);
      fd.set("note", note.trim());
      await action(fd);
      setOpen(false);
      setStep("form");
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
          setStep("form");
          setOpen(true);
        }}
        className="btn-secondary shrink-0 !h-8 !px-3 !text-[12.5px]"
      >
        <IconCalendar className="h-3.5 w-3.5" />
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

              {step === "form" ? (
                <>
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
                  type="month"
                  value={intake}
                  min={thisMonth}
                  onChange={(e) => setIntake(e.target.value)}
                  className="input mt-1.5 !h-10 w-full"
                />
                {intakeLabel && intakeLabel !== intake && (
                  <span className="mt-1 block text-[12px] text-caption">
                    Moves to {intakeLabel}
                  </span>
                )}
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
                re-signing: the undertakings already cover moving to the next
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
                  disabled={!ready}
                  onClick={() => setStep("confirm")}
                  className="btn-primary flex-1"
                >
                  Review
                </button>
              </div>
                </>
              ) : (
                <>
                  <div className="mt-4 rounded-xl border border-line bg-paper px-4 py-3.5">
                    {/* The move itself, as a move: two dates with the
                        direction drawn between them. A struck-through word
                        beside a plain one left the reader to infer which
                        way it went. */}
                    <div className="flex items-stretch gap-2.5">
                      {currentIntake && (
                        <>
                          <div className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-caption">
                              From
                            </div>
                            <div className="mt-0.5 truncate text-[13.5px] text-caption">
                              {currentIntake}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center text-caption">
                            <IconArrowRight className="h-4 w-4" />
                          </div>
                        </>
                      )}
                      <div className="min-w-0 flex-1 rounded-lg border border-[#d5e6d8] bg-[#e8f2e9] px-3 py-2">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[#3f6c45]">
                          To
                        </div>
                        <div className="mt-0.5 truncate text-[13.5px] font-semibold text-[#1f3d26]">
                          {intakeLabel}
                        </div>
                      </div>
                    </div>
                    <dl className="mt-3 space-y-1 text-[12.5px]">
                      <div className="flex gap-2">
                        <dt className="text-caption">Reason</dt>
                        <dd className="text-ink">
                          {DEFER_REASONS.find((r) => r.id === reason)?.label}
                        </dd>
                      </div>
                      {note && (
                        <div className="flex gap-2">
                          <dt className="shrink-0 text-caption">Note</dt>
                          <dd className="min-w-0 text-ink">{note}</dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <p className="mt-3.5 text-[12.5px] leading-snug text-body">
                    <b className="text-ink">{learnerName}</b> is told straight
                    away and a fresh offer letter replaces the current one. The
                    old letter is kept as a record.
                  </p>

                  <div className="mt-5 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep("form")}
                      className="btn-secondary flex-1"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={submit}
                      className="btn-primary flex-1"
                    >
                      <IconCheck className="h-4 w-4" />
                      Confirm &amp; reissue
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
