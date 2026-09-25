"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  // Decide whether to run at all — after mount, because localStorage and the
  // DOM targets only exist on the client.
  //
  // It WAITS for the anchors rather than checking once. The database opens on
  // the client and the shell renders its loading state first, so this effect
  // fires before a single nav row exists; a one-shot check found nothing,
  // dropped every step and silently never ran the tour again for that page
  // load. Whether a first-time learner got introduced to their side came down
  // to a race, and on a cold start the nav can be seconds away — a timeout
  // only moved the race rather than ending it.
  useEffect(() => {
    if (tourSeen()) return;
    const look = () => {
      const present = STEPS.filter((s) =>
        document.querySelector(`[data-tour="${s.target}"]`)
      );
      if (!present.length) return false;
      setSteps(present);
      return true;
    };
    if (look()) return;
    const mo = new MutationObserver(() => {
      if (look()) mo.disconnect();
    });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  const step = steps?.[i];

  /**
   * The spotlight and placard are positioned by hand, not from state.
   *
   * Holding the rect in state went wrong three separate ways — measured once
   * and left stale when the page grew under it, rebuilt per step so a timer
   * kept a closure over the step before, and driven by requestAnimationFrame,
   * which does not fire in a hidden tab. Each bug wore the same face: a ring
   * sitting confidently on the row above the one being described.
   *
   * Writing straight to the nodes ends the whole class of it. There is no
   * second copy of the position to go stale, the loop reads whichever step is
   * showing now, and a plain timer runs whether or not anyone is watching.
   */
  const rootRef = useRef<HTMLDivElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<string | null>(null);
  targetRef.current = step?.target ?? null;

  useEffect(() => {
    const place = () => {
      const name = targetRef.current;
      const root = rootRef.current;
      const spot = spotRef.current;
      const card = cardRef.current;
      if (!name || !root || !spot || !card) return;
      const el = document.querySelector(`[data-tour="${name}"]`);
      if (!el) return;
      const r = el.getBoundingClientRect();

      // Coordinates are relative to THIS overlay, not the viewport. The
      // learner shell has a transformed ancestor, and a transform makes its
      // subtree the containing block for `fixed` — so an overlay that looks
      // pinned to the viewport is actually pinned to that element, and
      // viewport numbers written into it land a constant offset away. That
      // offset was the whole bug: the ring sat a few rows up from whatever it
      // was meant to be circling. Measuring the overlay itself makes this
      // correct whether an ancestor is transformed or not.
      const base = root.getBoundingClientRect();

      spot.style.top = `${r.top - base.top - 4}px`;
      spot.style.left = `${r.left - base.left - 4}px`;
      spot.style.width = `${r.width + 8}px`;
      spot.style.height = `${r.height + 8}px`;

      // Beside the target by default; under it when the viewport is too narrow
      // to fit a placard to the right, and always held on screen.
      const beside = window.innerWidth - (r.right + GAP * 2) >= PLACARD_W;
      const left = beside
        ? r.right + GAP
        : Math.max(GAP, Math.min(r.left, window.innerWidth - PLACARD_W - GAP));
      const top = beside
        ? Math.max(GAP, Math.min(r.top - 8, window.innerHeight - 260))
        : r.bottom + GAP;
      card.style.left = `${left - base.left}px`;
      card.style.top = `${top - base.top}px`;
      // Hidden until it has somewhere real to be, so nothing flashes at 0,0.
      spot.style.opacity = "1";
      card.style.opacity = "1";
    };

    place();
    const id = window.setInterval(place, 200);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const ro = new ResizeObserver(place);
    ro.observe(document.body);
    return () => {
      window.clearInterval(id);
      ro.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [steps]);

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

  if (!steps || !step) return null;

  const last = i === steps.length - 1;

  return (
    <div ref={rootRef} className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
      {/* The dim is the spotlight's own shadow, so the cut-out can never drift
          out of register with it. Clicks land on the backdrop, not the page
          beneath — a half-guided page is worse than a guided one. */}
      <div
        ref={spotRef}
        style={{ opacity: 0, boxShadow: "0 0 0 9999px rgba(16, 17, 20, 0.55)" }}
        className="pointer-events-auto absolute rounded-xl ring-2 ring-white/70 transition-[top,left,width,height] duration-200"
        onClick={finish}
      />

      <div
        ref={cardRef}
        style={{ opacity: 0, width: PLACARD_W }}
        className="pointer-events-auto absolute rounded-xl border-l-[3px] border-accent bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)] transition-[top,left] duration-200"
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
