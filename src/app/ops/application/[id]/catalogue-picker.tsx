"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { IconDoc, IconPlus, useToast } from "@/components/ui";

export interface PickerItem {
  id: number;
  title: string;
  subtitle: string;
  /** Small facts shown under the title, e.g. duration / fee / type. */
  facts: string[];
  note?: string | null;
  /** Shown in amber when the learner doesn't clear a prerequisite. */
  warning?: string | null;
  /** Extra text included in search matching. */
  keywords?: string;
  /** Full document text — rendered as a small page preview in card layout. */
  preview?: string;
}

/**
 * Ops can only attach things that already exist in a catalogue, so this is a
 * search-and-select dialog rather than a create form.
 */
export function CataloguePicker({
  label,
  title,
  hint,
  items,
  addedIds,
  disabled,
  disabledHint,
  action,
  idField,
  addedLabel,
  layout = "list",
}: {
  label: string;
  title: string;
  hint: string;
  items: PickerItem[];
  addedIds: number[];
  disabled?: boolean;
  disabledHint?: string;
  action: (formData: FormData) => void;
  idField: string;
  /** Shown in the toast once an item is attached. */
  addedLabel: string;
  /** "cards" shows a title + page preview + Add button, like the cards outside. */
  layout?: "list" | "cards";
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const toast = useToast();
  const router = useRouter();

  // The page's scroll container uses overflow-x: clip (so the sticky action bar
  // can run full-bleed), and clip DOES clip fixed-position descendants — so the
  // dialog has to be portalled to <body> to cover the whole viewport.

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((i) =>
      `${i.title} ${i.subtitle} ${i.facts.join(" ")} ${i.keywords ?? ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [items, q]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledHint : undefined}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong bg-paper py-3.5 text-[13px] font-medium text-body transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconPlus className="h-4 w-4" />
        {label}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/30 p-4 pt-[8vh] backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          >
          <div
            className="w-full max-w-[560px] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_32px_64px_-24px_rgba(49,48,43,0.4)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-line px-5 pb-4 pt-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-[15px] font-semibold tracking-tight text-ink">
                    {title}
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-body">{hint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption transition-colors hover:bg-muted hover:text-ink"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="input mt-3.5 !h-9"
              />
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-5">
              {results.length === 0 && (
                <p className="py-10 text-center text-[13px] text-caption">
                  Nothing matches “{q}”.
                </p>
              )}

              {layout === "cards" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {results.map((item) => {
                    const added = addedIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col rounded-2xl border border-line bg-white p-4"
                      >
                        <div className="flex items-center gap-2">
                          <IconDoc className="h-4 w-4 shrink-0 text-caption" />
                          <span className="truncate text-[13.5px] font-semibold text-ink">
                            {item.title}
                          </span>
                        </div>
                        <div className="mt-1 text-[12px] text-caption">
                          {item.subtitle}
                          {item.facts.length > 0 && ` · ${item.facts.join(" · ")}`}
                        </div>

                        {/* A small page of the document itself */}
                        <div className="mt-3 flex-1 rounded-lg border border-line bg-paper p-3">
                          <p className="line-clamp-5 text-[11.5px] leading-relaxed text-body">
                            {item.preview ?? item.note}
                          </p>
                        </div>

                        <div className="mt-3">
                          {added ? (
                            <div className="rounded-lg bg-muted py-2 text-center text-[12.5px] font-medium text-caption">
                              Added
                            </div>
                          ) : (
                            <form
                              action={async (formData: FormData) => {
                                setOpen(false);
                                // Announce it AFTER it lands: a server action
                                // can refuse, and a toast fired first turns
                                // every future guard mismatch into a silent
                                // no-op that claims success.
                                await action(formData);
                                toast(`${addedLabel} added`);
                                router.refresh();
                              }}
                            >
                              <input
                                type="hidden"
                                name={idField}
                                value={item.id}
                              />
                              <button className="btn-secondary w-full !h-9 !text-[12.5px]">
                                Add document
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="-mx-5 -my-5">
              {results.map((item) => {
                const added = addedIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 border-b border-line px-5 py-3.5 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium leading-snug text-ink">
                        {item.title}
                      </div>
                      <div className="mt-0.5 text-[12.5px] text-body">
                        {item.subtitle}
                      </div>
                      {item.facts.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {item.facts.map((f) => (
                            <span
                              key={f}
                              className="rounded-md border border-cream-line bg-cream px-2 py-0.5 text-[11px] text-body"
                            >
                              {f}
                            </span>
                          ))}
                        </div>
                      )}
                      {item.warning && (
                        <div className="mt-1.5 text-[11.5px] text-[#8a6d2f]">
                          ⚠ {item.warning}
                        </div>
                      )}
                      {item.note && (
                        <div className="mt-1 text-[11.5px] text-caption">
                          {item.note}
                        </div>
                      )}
                    </div>
                    {added ? (
                      <span className="shrink-0 rounded-md border border-cream-line bg-cream px-2.5 py-1 text-[11px] font-medium text-caption">
                        Added
                      </span>
                    ) : (
                      <form
                        action={async (formData: FormData) => {
                          setOpen(false);
                          await action(formData);
                          toast(`${addedLabel} added`);
                          router.refresh();
                        }}
                      >
                        <input type="hidden" name={idField} value={item.id} />
                        <button className="btn-secondary !h-8 !px-3 !text-[12.5px]">
                          Add
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
                </div>
              )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
