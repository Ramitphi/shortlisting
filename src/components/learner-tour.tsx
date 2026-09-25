"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { setTourSeen, tourSeen } from "@/lib/session";

/**
 * The first-visit walkthrough of the learner's side.
 *
 * A learner lands here once, from a link in an email, with no idea that their
 * side of this product has six sections. So the first visit walks them round
 * it: one placard at a time, anchored to the thing it is describing, with the
 * rest of the page dimmed so there is only ever one thing to read.
 *
 * It runs ONCE — the flag lives in localStorage beside the session, and
 * "Reset demo data" clears it so the walkthrough can be demonstrated again.
 *
 * Every step is anchored by `data-tour` on the real element, not by
 * coordinates: the nav can be reordered or re-styled and the tour follows it.
 * A step whose element is missing from this page is dropped before the tour
 * starts rather than pointing at nothing.
 */

type Step = { target: string; title: string; body: string };

const STEPS: Step[] = [
  {
    target: "dashboard",
    title: "Dashboard",
    body: "Universities worth a look, countries people go to, and learners who have already gone. Browse it while your application is with us.",
  },
  {
    target: "profile",
    title: "My profile",
    body: "The personal details upGrad holds for you. Read-only here — they change inside your application, so one set of answers stays true everywhere.",
  },
  {
    target: "application",
    title: "Your application",
    body: "The whole journey: check your details, sign your undertakings, and certify. It tells you what needs doing at every stage.",
  },
  {
    target: "documents",
    title: "My documents",
    body: "Everything you've uploaded, and anything still missing. We check each one and let you know if we need it again.",
  },
  {
    target: "flying",
    title: "Academic / Flying Journey",
    body: "Once you're admitted, track everything from application to visa in PRISM. Opens in a new tab.",
  },
  {
    target: "centres",
    title: "Centres",
    body: "Our walk-in offices, closest to you first. Allow location access and we'll rank them by how far away they are.",
  },
  {
    target: "alumni",
    title: "Alumni",
    body: "upGrad learners who have already made the move. Find someone who read what you're about to read, where you're about to read it.",
  },
  {
    target: "support",
    title: "Your team",
    body: "Everyone assigned to you — your counsellor, and your visa counsellor, buddy and loan advisor as they come on board. My support opens the helpline if you'd rather call us.",
  },
];

const PLACARD_W = 320;
const GAP = 14;

type Box = { top: number; left: number; width: number; height: number };

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d={dir === "left" ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"} />
    </svg>
  );
}

export function LearnerTour() {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);

  // Decide whether to run at all — after mount, because localStorage and the
  // DOM targets only exist on the client.
  useEffect(() => {
    if (tourSeen()) return;
    const present = STEPS.filter((s) =>
      document.querySelector(`[data-tour="${s.target}"]`)
    );
    if (present.length) setSteps(present);
  }, []);

  const step = steps?.[i];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    setBox({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // Measured before paint so the placard never shows at the previous step's
  // position for a frame.
  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    if (!step) return;
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, measure]);

  const finish = useCallback(() => {
    setTourSeen(true);
    setSteps(null);
  }, []);

  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight")
        setI((n) => (n + 1 < (steps?.length ?? 0) ? n + 1 : n));
      if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, steps, finish]);

  if (!steps || !step || !box) return null;

  const last = i === steps.length - 1;
  // Beside the target by default; flipped under it if the viewport is too
  // narrow to fit a placard to the right, and always held on screen.
  const room = window.innerWidth - (box.left + box.width) - GAP * 2;
  const beside = room >= PLACARD_W;
  const left = beside
    ? box.left + box.width + GAP
    : Math.max(GAP, Math.min(box.left, window.innerWidth - PLACARD_W - GAP));
  const top = beside
    ? Math.max(GAP, Math.min(box.top - 8, window.innerHeight - 260))
    : box.top + box.height + GAP;

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
      {/* The dim is the spotlight's own shadow, so the cut-out can never drift
          out of register with it. Clicks land on the backdrop, not the page
          beneath — a half-guided page is worse than a guided one. */}
      <div
        className="pointer-events-auto absolute rounded-xl ring-2 ring-white/70 transition-all duration-200"
        style={{
          top: box.top - 4,
          left: box.left - 4,
          width: box.width + 8,
          height: box.height + 8,
          boxShadow: "0 0 0 9999px rgba(16, 17, 20, 0.55)",
        }}
        onClick={finish}
      />

      <div
        className="pointer-events-auto absolute rounded-xl border-l-[3px] border-accent bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)] transition-all duration-200"
        style={{ top, left, width: PLACARD_W }}
      >
        <button
          type="button"
          onClick={finish}
          aria-label="Close walkthrough"
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg text-caption transition-colors hover:bg-muted hover:text-ink"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden>
            <path d="M6.5 6.5l11 11m0-11-11 11" />
          </svg>
        </button>

        <div className="pr-8 text-[12px] font-medium uppercase tracking-wide text-caption">
          {i + 1} of {steps.length}
        </div>
        <h2 className="mt-1.5 text-[16px] font-medium text-ink">{step.title}</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-body">
          {step.body}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-[13px] text-caption transition-colors hover:text-ink"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setI((n) => Math.max(0, n - 1))}
              disabled={i === 0}
              aria-label="Previous"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-body transition-colors hover:bg-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Chevron dir="left" />
            </button>
            {last ? (
              <button type="button" onClick={finish} className="btn-primary !h-8 !px-3.5 !text-[13px]">
                Done
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setI((n) => n + 1)}
                aria-label="Next"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white transition-opacity hover:opacity-90"
              >
                <Chevron dir="right" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
