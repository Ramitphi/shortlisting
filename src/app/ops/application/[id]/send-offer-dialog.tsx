"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IconCap, IconCheck, useToast } from "@/components/ui";

/**
 * The last click of the journey gets a pause: a small confirmation naming
 * exactly who the offer letter goes to and for which programme, with an
 * explicit "I've checked" tick before Send. No details preview — Ops is
 * already on the page that shows everything; this is just the handbrake.
 */
export function SendOfferDialog({
  learnerName,
  learnerEmail,
  programme,
  action,
}: {
  learnerName: string;
  learnerEmail: string;
  programme: {
    id: number;
    name: string;
    institute: string;
    duration?: string | null;
    fee?: string | null;
  };
  /** Bound to the application; posts `programId`. */
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [sure, setSure] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [busy, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();
  useEffect(() => setMounted(true), []);

  const send = () =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("programId", String(programme.id));
      toast("Offer letter sent");
      await action(fd);
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSure(false);
          setOpen(true);
        }}
        className="btn-primary shrink-0"
      >
        Send Offer Letter
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
            <div className="relative w-full max-w-[440px] rounded-2xl border border-line bg-white p-6 shadow-[0_28px_60px_-18px_rgba(49,48,43,0.45)] toast-in">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <IconCap className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h4 className="font-display text-[15px] font-semibold tracking-tight text-ink">
                    Send the offer letter?
                  </h4>
                  <p className="mt-1 text-[13px] leading-relaxed text-body">
                    This offer letter goes to{" "}
                    <b className="text-ink">{learnerName}</b>{" "}
                    <span className="whitespace-nowrap">({learnerEmail})</span>{" "}
                    for:
                  </p>
                </div>
              </div>

              {/* The programme it commits to — the one the counsellor sent. */}
              <div className="mt-4 rounded-xl border border-line bg-paper px-4 py-3">
                <div className="text-[14px] font-medium text-ink">
                  {programme.name}
                </div>
                <div className="mt-0.5 text-[12.5px] text-body">
                  {programme.institute}
                  {programme.duration ? ` · ${programme.duration}` : ""}
                  {programme.fee ? ` · ${programme.fee}` : ""}
                </div>
              </div>

              <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl border border-line px-3.5 py-3 text-[13px] leading-snug text-body transition-colors hover:bg-paper">
                <input
                  type="checkbox"
                  checked={sure}
                  onChange={(e) => setSure(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#AE383E]"
                />
                I have checked the certified details and this offer letter
                should be sent. This notifies the learner immediately.
              </label>

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
                  disabled={!sure || busy}
                  onClick={send}
                  className="btn-primary flex-1"
                >
                  <IconCheck className="h-4 w-4" />
                  Send offer letter
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
