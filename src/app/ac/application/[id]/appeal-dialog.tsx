"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconSearch, IconSparkle } from "@/components/ui";

/**
 * The counsellor's push-back on an Ops verdict.
 *
 * Ops decides what is eligible and the counsellor picks from what survives —
 * which left the counsellor with nothing to say when they think a rejection
 * is wrong, except a conversation off the system. Two shapes, because those
 * are the two things they actually want to say:
 *
 *   "look at this one again"  — the rejected programme goes back for a verdict
 *   "try this one instead"    — a catalogue programme goes over as a suggestion
 *
 * Same dialog shape as the section reject: a question, a required note, one
 * confirm. The note is the whole point — an appeal with no argument is just a
 * disagreement — so it gates the button.
 */
export function AppealDialog({
  action,
  rejected,
  catalogue,
  disabledReason,
}: {
  action: (formData: FormData) => Promise<void>;
  /** Programmes Ops ruled out — what "reconsider" can point at. */
  rejected: { id: number; name: string; institute: string }[];
  /** What can be suggested instead, already filtered of what is on the list. */
  catalogue: { id: number; name: string; institute: string }[];
  /** Set when an appeal cannot be raised right now, and why. */
  disabledReason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [kind, setKind] = useState<"reconsider" | "suggest">(
    rejected.length > 0 ? "reconsider" : "suggest"
  );
  // The suggest branch's search: what's typed, and what's been picked.
  // Rejected programmes are searchable here too — picking one turns the
  // appeal into a reconsider, so the counsellor never has to know which
  // branch a programme technically belongs to.
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<{
    kind: "reconsider" | "suggest";
    id: number;
    name: string;
    institute: string;
  } | null>(null);
  useEffect(() => setMounted(true), []);

  const q = query.trim().toLowerCase();
  const hits = [
    ...rejected.map((r) => ({
      kind: "reconsider" as const,
      id: r.id,
      name: r.name,
      institute: r.institute,
    })),
    ...catalogue.map((c) => ({
      kind: "suggest" as const,
      id: c.id,
      name: c.name,
      institute: c.institute,
    })),
  ].filter(
    (h) => !q || `${h.name} ${h.institute}`.toLowerCase().includes(q)
  );

  // Nothing to appeal and nothing to suggest — no control at all.
  if (rejected.length === 0 && catalogue.length === 0) return null;

  return (
    <>
      <button
        type="button"
        disabled={Boolean(disabledReason)}
        title={disabledReason ?? "Ask Ops to look at a programme again"}
        onClick={() => setOpen(true)}
        className="btn-secondary !h-8 !px-3 !text-[12.5px]"
      >
        <IconSparkle className="h-3.5 w-3.5" />
        Appeal to Ops
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          >
            <form
              // Closes only once the appeal has actually landed — the same
              // rule as the section reject dialog, for the same reason.
              action={async (fd: FormData) => {
                await action(fd);
                setOpen(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[480px] rounded-2xl border border-line bg-white p-5 shadow-[0_28px_60px_-18px_rgba(49,48,43,0.45)]"
            >
              {/* "Look again" is only true of a programme Ops has already
                  ruled on — a suggestion is one they have never seen. */}
              <h3 className="font-display text-[16px] font-semibold tracking-tight text-ink">
                {kind === "reconsider"
                  ? "Ask Ops to look again"
                  : "Put another programme to Ops"}
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-body">
                {kind === "reconsider"
                  ? "This goes back to the Ops team for a fresh verdict, and the application waits with them until they answer."
                  : "Ops rules on it like any other, and the application waits with them until they have."}
              </p>

              <div className="mt-4 flex gap-2">
                {rejected.length > 0 && (
                  <label
                    className={`flex-1 cursor-pointer rounded-xl border p-3 transition-colors ${
                      kind === "reconsider"
                        ? "border-ink bg-paper"
                        : "border-line hover:border-ink/40"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={kind === "reconsider"}
                      onChange={() => setKind("reconsider")}
                      className="sr-only"
                    />
                    <span className="block text-[13px] font-semibold text-ink">
                      Reconsider one
                    </span>
                    <span className="mt-0.5 block text-[12px] text-caption">
                      Ops ruled it out — say why it should stand
                    </span>
                  </label>
                )}
                {catalogue.length > 0 && (
                  <label
                    className={`flex-1 cursor-pointer rounded-xl border p-3 transition-colors ${
                      kind === "suggest"
                        ? "border-ink bg-paper"
                        : "border-line hover:border-ink/40"
                    }`}
                  >
                    <input
                      type="radio"
                      checked={kind === "suggest"}
                      onChange={() => setKind("suggest")}
                      className="sr-only"
                    />
                    <span className="block text-[13px] font-semibold text-ink">
                      Suggest another
                    </span>
                    <span className="mt-0.5 block text-[12px] text-caption">
                      Put a different programme in front of them
                    </span>
                  </label>
                )}
              </div>

              {/* Only the active branch's picker is mounted, so the browser
                  can enforce `required` on it without the hidden one
                  blocking the submit. */}
              {kind === "reconsider" && rejected.length > 0 && (
                <label className="mt-4 block">
                  <span className="label">Programme</span>
                  <input type="hidden" name="kind" value="reconsider" />
                  <select name="programId" required className="input w-full">
                    {rejected.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {p.institute}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {kind === "suggest" && catalogue.length > 0 && (
                <div className="mt-4">
                  <span className="label">Programme</span>
                  <span className="relative block">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-caption">
                      <IconSearch className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value);
                        setPicked(null);
                      }}
                      placeholder="Search courses…"
                      aria-label="Search courses"
                      className="input w-full !pl-9"
                    />
                  </span>

                  {/* What the appeal will actually send. A rejected pick
                      posts a reconsider — the search doesn't care which
                      list the programme came from, only the payload does. */}
                  {picked && (
                    <>
                      <input type="hidden" name="kind" value={picked.kind} />
                      <input
                        type="hidden"
                        name={
                          picked.kind === "reconsider"
                            ? "programId"
                            : "catalogueId"
                        }
                        value={picked.id}
                      />
                    </>
                  )}

                  <div className="mt-2 max-h-44 overflow-y-auto rounded-xl border border-line">
                    {hits.length === 0 ? (
                      <p className="px-3.5 py-3 text-[12.5px] text-caption">
                        Nothing matches &ldquo;{query.trim()}&rdquo; — try
                        fewer words.
                      </p>
                    ) : (
                      hits.map((h) => {
                        const active =
                          picked?.id === h.id && picked.kind === h.kind;
                        return (
                          <button
                            key={`${h.kind}-${h.id}`}
                            type="button"
                            onClick={() => setPicked(h)}
                            className={`flex w-full items-center gap-2 border-b border-line px-3.5 py-2.5 text-left transition-colors last:border-b-0 ${
                              active ? "bg-cream/60" : "hover:bg-paper"
                            }`}
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[13px] font-medium text-ink">
                                {h.name}
                              </span>
                              <span className="block truncate text-[11.5px] text-caption">
                                {h.institute}
                              </span>
                            </span>
                            {h.kind === "reconsider" && (
                              <span className="shrink-0 rounded-md bg-[#f6efdd] px-1.5 py-0.5 text-[10px] font-semibold text-[#8a6d2f]">
                                Ruled out — asks Ops to reconsider
                              </span>
                            )}
                            <span
                              className={`flex h-4.5 w-4.5 h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${
                                active
                                  ? "border-ink bg-ink text-paper"
                                  : "border-line-strong text-transparent"
                              }`}
                            >
                              <IconCheck className="h-2.5 w-2.5" />
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              <label className="mt-3 block">
                <span className="label">Your note to Ops</span>
                <textarea
                  name="note"
                  required
                  rows={3}
                  placeholder="e.g. the learner's backlogs were cleared last term — the transcript in the locker shows it"
                  className="input !h-auto w-full !py-2 !text-[13px]"
                />
              </label>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  className="btn-primary flex-1"
                  disabled={kind === "suggest" && !picked}
                  title={
                    kind === "suggest" && !picked
                      ? "Pick a programme from the search first"
                      : ""
                  }
                >
                  Send appeal
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}
    </>
  );
}
