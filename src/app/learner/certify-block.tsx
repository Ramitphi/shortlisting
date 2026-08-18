"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IconCheck, IconShield, useToast } from "@/components/ui";

/**
 * The learner's own sign-off, asked for as a dialogue at the end of the walk
 * through their application rather than as a block sitting in a tab.
 *
 * Signing the undertakings says "I agree to these". This says "and the details
 * behind them are mine and correct" — it is the moment the form closes, so it
 * interrupts deliberately instead of being another thing to scroll past.
 */
export function CertifyDialog({
  action,
  ready,
  reason,
}: {
  action: () => Promise<void>;
  /** Everything signed — you can't certify what you haven't signed. */
  ready: boolean;
  /** Why it isn't available yet, shown on the disabled trigger. */
  reason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setMounted(true), []);
  const toast = useToast();
  const router = useRouter();

  return (
    <>
      <button
        type="button"
        disabled={!ready}
        title={ready ? "" : reason}
        onClick={() => setOpen(true)}
        className="btn-primary"
      >
        Certify &amp; finish
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-[520px] rounded-2xl border border-line bg-white p-6 shadow-[0_32px_64px_-24px_rgba(49,48,43,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <IconShield className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-[18px] font-semibold tracking-tight text-ink">
                    Certify your details
                  </h3>
                  <p className="mt-1 text-[13.5px] leading-relaxed text-body">
                    This is the last step. Once you certify, your application is
                    complete and we can release your offer letter.
                  </p>
                </div>
              </div>

              <label className="group mt-5 flex cursor-pointer gap-3 rounded-xl border border-line-strong bg-paper p-4 transition-colors hover:border-ink/40">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="peer sr-only"
                  autoFocus
                />
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-line-strong text-transparent transition-colors group-has-[:checked]:border-ink group-has-[:checked]:bg-ink group-has-[:checked]:text-paper">
                  <IconCheck className="h-3 w-3" />
                </span>
                <span className="text-[13.5px] leading-relaxed text-ink">
                  I certify that all the information I have submitted is correct,
                  that I have verified it, and that the undertakings I have
                  signed are accurate and may be relied upon.
                </span>
              </label>

              <p className="mt-3 text-[12px] leading-relaxed text-caption">
                You can still edit your details afterwards — but doing so
                withdraws this certification and it will need to be given again.
              </p>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Not yet
                </button>
                <button
                  type="button"
                  disabled={!agreed || busy}
                  onClick={async () => {
                    setBusy(true);
                    setOpen(false);
                    toast("Details certified");
                    await action();
                    router.refresh();
                  }}
                  className="btn-primary flex-1"
                >
                  Submit certification
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
