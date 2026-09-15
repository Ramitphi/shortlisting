"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IconCap, IconCheck, IconSearch } from "@/components/ui";

/**
 * The counsellor moves a learner onto a different programme after the offer
 * has gone out.
 *
 * Two steps, because they are two different questions. Why they are moving
 * is the part that has to survive the call — the decision was made on the
 * phone and nothing else in the product will remember it. Which programme
 * is the part the catalogue can help with, so it is scored against the
 * profile exactly as it was the first time round.
 */
const REASONS = [
  "Learner changed their mind on the country",
  "Learner wants a different specialisation",
  "Fees or funding no longer work",
  "Intake timing does not suit them",
  "Something else",
];

export interface ChangeCandidate {
  id: number;
  name: string;
  institute: string;
  country?: string | null;
  score: number;
}

export function ChangeProgrammeDialog({
  learnerName,
  currentProgramme,
  candidates,
  action,
}: {
  learnerName: string;
  currentProgramme: string;
  /** Catalogue entries not already on this application, best match first. */
  candidates: ChangeCandidate[];
  /** Bound to the application; posts `note` and `catalogueId`. */
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"why" | "which">("why");
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<ChangeCandidate | null>(null);
  const [mounted, setMounted] = useState(false);
  const [busy, startTransition] = useTransition();
  const router = useRouter();
  useEffect(() => setMounted(true), []);

  const note = [reason, detail.trim()].filter(Boolean).join(" — ");
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? candidates.filter((c) =>
          `${c.name} ${c.institute}`.toLowerCase().includes(q)
        )
      : candidates;
    return list.slice(0, 8);
  }, [candidates, query]);

  const reset = () => {
    setStep("why");
    setReason("");
    setDetail("");
    setQuery("");
    setPicked(null);
  };

  const submit = () =>
    startTransition(async () => {
      if (!picked) return;
      const fd = new FormData();
      fd.set("note", note);
      fd.set("catalogueId", String(picked.id));
      await action(fd);
      setOpen(false);
      reset();
      router.refresh();
    });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen(true);
        }}
        className="btn-secondary shrink-0 !h-8 !px-3 !text-[12.5px]"
      >
        <IconCap className="h-3.5 w-3.5" />
        Change programme
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
            <div className="relative w-full max-w-[520px] rounded-2xl border border-line bg-white p-6 shadow-[0_28px_60px_-18px_rgba(49,48,43,0.45)] toast-in">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cream text-ink">
                  <IconCap className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h4 className="font-display text-[15px] font-semibold tracking-tight text-ink">
                    Move {learnerName} to another programme
                  </h4>
                  <p className="mt-1 text-[13px] leading-relaxed text-body">
                    Currently on {currentProgramme}
                  </p>
                </div>
              </div>

              {step === "why" ? (
                <>
                  <div className="mt-4">
                    <div className="text-[12px] font-medium text-ink">
                      Why are they moving?
                    </div>
                    <div className="mt-1.5 space-y-1.5">
                      {REASONS.map((r) => (
                        <label
                          key={r}
                          className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] transition-colors ${
                            reason === r
                              ? "border-line-strong bg-paper text-ink"
                              : "border-line text-body hover:bg-paper"
                          }`}
                        >
                          <input
                            type="radio"
                            name="change_reason"
                            checked={reason === r}
                            onChange={() => setReason(r)}
                            className="h-4 w-4 accent-[#AE383E]"
                          />
                          {r}
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="mt-3 block">
                    <span className="text-[12px] font-medium text-ink">
                      In their words{" "}
                      <span className="font-normal text-caption">
                        (optional)
                      </span>
                    </span>
                    <textarea
                      value={detail}
                      onChange={(e) => setDetail(e.target.value)}
                      rows={2}
                      placeholder="What they said on the call"
                      className="input mt-1.5 w-full !py-2"
                    />
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
                      disabled={!reason}
                      onClick={() => setStep("which")}
                      className="btn-primary flex-1"
                    >
                      Pick a programme
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative mt-4">
                    <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-caption" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search the catalogue"
                      className="input !h-10 w-full !pl-9"
                    />
                  </div>

                  <div className="mt-2 max-h-[280px] space-y-1.5 overflow-y-auto">
                    {results.length === 0 ? (
                      <p className="px-1 py-4 text-center text-[13px] text-caption">
                        Nothing matches that.
                      </p>
                    ) : (
                      results.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setPicked(c)}
                          className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                            picked?.id === c.id
                              ? "border-line-strong bg-paper"
                              : "border-line hover:bg-paper"
                          }`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13.5px] font-medium text-ink">
                              {c.name}
                            </span>
                            <span className="block truncate text-[12px] text-caption">
                              {c.institute}
                              {c.country ? ` · ${c.country}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-md border border-[#d5e6d8] bg-[#e8f2e9] px-2 py-0.5 text-[11px] font-medium text-[#3f6c45]">
                            {c.score}% match
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <p className="mt-3 text-[12.5px] leading-snug text-caption">
                    Ops rules on it next, then you send it. The learner keeps
                    their current offer until the new one replaces it.
                  </p>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStep("why")}
                      className="btn-secondary flex-1"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!picked || busy}
                      onClick={submit}
                      className="btn-primary flex-1"
                    >
                      <IconCheck className="h-4 w-4" />
                      Send to Ops
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
