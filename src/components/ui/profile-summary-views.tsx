"use client";

import React, { useState } from "react";
import type { SummaryFact, SummaryGroup } from "./profile-summary-data";

/**
 * The alternative readings of the profile summary, switched from the demo
 * FAB. They all render the SAME resolved answers (see profile-summary-data)
 * — what changes is how much work the reader has to do to see them, which is
 * the only question actually under review.
 */

export interface ViewProps {
  /** The blocks the sheet asks about this learner, answers filled in. */
  groups: SummaryGroup[];
  /** Block titles this application never asks — named, not silently absent. */
  skipped: string[];
  /** The profile in a couple of sentences, from the same answers. */
  narrative: string;
  learnerName?: string | null;
}

export function ViewOneTap({ groups, skipped, narrative, learnerName }: ViewProps) {
  const [expanded, setExpanded] = useState<boolean>(true);

  const totalFacts = groups.reduce((n, g) => n + g.facts.length, 0);
  const totalOnFile = groups.reduce((n, g) => n + g.onFile, 0);

  return (
    <div className="min-w-0">
      <p className="break-words text-[13.5px] leading-relaxed text-body">{narrative}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
          {learnerName ? `${learnerName} · eligibility profile` : "Eligibility profile"}
        </span>
        <span className="rounded-md border border-cream-line bg-cream px-2 py-0.5 text-[11.5px] text-body">
          {totalOnFile} of {totalFacts} answers on file
        </span>
      </div>

      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <section key={group.id} className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-cream-line pb-2">
              <h3 className="min-w-0 break-words text-[13.5px] font-semibold text-ink">{group.title}</h3>
              <span className="shrink-0 text-[11.5px] text-caption">
                {group.onFile} of {group.facts.length}
              </span>
            </div>

            {expanded ? (
              <dl className="divide-y divide-cream-line">
                {group.facts.map((fact) => (
                  <div key={fact.key} className="grid gap-x-4 gap-y-0.5 py-2.5 sm:grid-cols-3">
                    <dt className="min-w-0 break-words text-[12px] text-caption">{fact.label}</dt>
                    <dd className="min-w-0 sm:col-span-2">
                      <span
                        className={
                          fact.value
                            ? "block break-words text-[13.5px] text-ink"
                            : "block text-[13.5px] text-caption"
                        }
                      >
                        {fact.value || "Not on file"}
                      </span>
                      {fact.note ? (
                        <span className="mt-0.5 block break-words text-[11.5px] text-caption">{fact.note}</span>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
        ))}
      </div>

      {skipped.length > 0 ? (
        <p className="mt-4 break-words text-[12px] text-caption">
          {skipped.join(", ")} {skipped.length === 1 ? "is" : "are"} not asked on this application.
        </p>
      ) : null}

      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-[12.5px] font-semibold text-ink hover:bg-paper"
      >
        {expanded ? "Collapse all" : "Expand all"}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`h-4 w-4 text-caption ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}

export function ViewOverview({ groups, skipped, narrative, learnerName }: ViewProps) {
  const [open, setOpen] = useState<boolean>(false);
  const panelId = React.useId();

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="h-4 w-4 shrink-0 text-accent">
          <path d="M12 2.6c.7 4.4 2.4 6.1 6.8 6.8-4.4.7-6.1 2.4-6.8 6.8-.7-4.4-2.4-6.1-6.8-6.8 4.4-.7 6.1-2.4 6.8-6.8Z" />
        </svg>
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">Profile overview</span>
        {learnerName ? (
          <span className="min-w-0 break-words text-[11.5px] text-caption">&middot; {learnerName}</span>
        ) : null}
      </div>

      <p className="mt-2.5 max-w-[70ch] break-words text-[13.5px] leading-relaxed text-ink">{narrative}</p>

      <div className="mt-4 border-t border-cream-line" />

      <div id={panelId} hidden={!open} className="mt-4 space-y-5">
        {groups.map((group) => (
          <div key={group.id} className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h4 className="min-w-0 break-words text-[13.5px] font-semibold text-ink">{group.title}</h4>
              <span className="shrink-0 text-[11px] text-caption">
                {group.onFile} of {group.facts.length} on file
              </span>
            </div>
            <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {group.facts.map((fact) => (
                <div key={fact.key} className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">{fact.label}</dt>
                  <dd className="mt-0.5 min-w-0">
                    <span className={`block break-words text-[13.5px] ${fact.value ? "text-ink" : "text-caption"}`}>
                      {fact.value || "Not on file"}
                    </span>
                    {fact.note ? (
                      <span className="mt-0.5 block break-words text-[11.5px] leading-snug text-caption">{fact.note}</span>
                    ) : null}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {skipped.length > 0 ? (
        <p className="mt-4 break-words text-[12px] text-caption">
          {skipped.join(", ")} {skipped.length === 1 ? "is" : "are"} not asked on this application.
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-controls={panelId}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-line bg-white py-3 text-[13.5px] font-medium text-accent transition-colors hover:bg-cream"
      >
        {open ? "Show less" : "Show more"}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="h-4 w-4 shrink-0"
        >
          <path d={open ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
        </svg>
      </button>
    </div>
  );
}

export function ViewOpenSheet({ groups, skipped, narrative, learnerName }: ViewProps) {
  return (
    <div className="min-w-0 space-y-6">
      {narrative ? (
        <div className="min-w-0 rounded-lg border border-cream-line bg-paper px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
            In brief{learnerName ? ` — ${learnerName}` : ""}
          </p>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-body break-words">{narrative}</p>
        </div>
      ) : null}

      {groups.length === 0 ? (
        <p className="text-[12.5px] text-caption">This application does not ask for any profile details.</p>
      ) : null}

      {groups.map((group) => (
        <section key={group.id} className="min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.07em] text-ink">
              {group.title}
            </h3>
            <span aria-hidden className="min-w-[16px] flex-1 border-t border-cream-line" />
            <span className="whitespace-nowrap text-[11px] tabular-nums text-caption">
              {group.onFile} of {group.facts.length}
            </span>
          </div>

          <div className="mt-2.5 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            {group.facts.map((fact) => (
              <div key={fact.key} className="min-w-0 border-t border-cream-line pt-2">
                <p className="break-words text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                  {fact.label}
                </p>
                <p
                  className={
                    fact.value
                      ? "mt-1 break-words text-[13.5px] font-medium leading-snug text-ink"
                      : "mt-1 text-[13.5px] leading-snug text-caption"
                  }
                >
                  {fact.value || "Not on file"}
                </p>
                {fact.note ? (
                  <p className="mt-0.5 break-words text-[11.5px] leading-snug text-caption">{fact.note}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ))}

      {skipped.length > 0 ? (
        <p className="border-t border-cream-line pt-3 text-[12px] text-caption break-words">
          {skipped.join(", ")} {skipped.length === 1 ? "is" : "are"} not asked on this application.
        </p>
      ) : null}
    </div>
  );
}

export function ViewKeyFacts({ groups, skipped, narrative, learnerName }: ViewProps) {
  const tileOrder = ["score_12", "bachelor_score", "backlogs", "work_exp_months", "score_10"];

  const firstByKey = new Map<string, SummaryFact>();
  for (const group of groups) {
    for (const fact of group.facts) {
      if (!firstByKey.has(fact.key)) firstByKey.set(fact.key, fact);
    }
  }

  const tiles = tileOrder
    .map((key) => firstByKey.get(key))
    .filter((fact): fact is SummaryFact => !!fact && fact.value !== "");

  // A promoted key is dropped from every block so the same fact never reads twice.
  const promoted = new Set(tiles.map((fact) => fact.key));
  const blocks = groups
    .map((group) => ({ ...group, facts: group.facts.filter((fact) => !promoted.has(fact.key)) }))
    .filter((group) => group.facts.length > 0);

  return (
    <div className="space-y-5">
      {tiles.length > 0 ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(136px,1fr))] gap-2">
          {tiles.map((fact) => (
            <div
              key={fact.key}
              className="min-w-0 rounded-lg border border-line bg-paper px-3 py-2.5"
            >
              <div className="break-words text-[18px] font-semibold leading-tight text-ink">
                {fact.value}
              </div>
              <div className="mt-1 break-words text-[11px] uppercase tracking-[0.07em] text-caption">
                {fact.label}
              </div>
              {fact.note ? (
                <div className="mt-0.5 break-words text-[11px] text-caption">{fact.note}</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-[#ecdfc0] bg-[#f6efdd] px-3 py-2 text-[12.5px] text-[#8a6d2f]">
          None of the decision figures are on file for {learnerName || "this learner"} yet.
        </p>
      )}

      {narrative ? (
        <p className="break-words text-[13.5px] leading-relaxed text-body">{narrative}</p>
      ) : null}

      {blocks.map((block) => (
        <div key={block.id} className="space-y-2.5 border-t border-cream-line pt-4">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
            {block.title}
          </h4>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {block.facts.map((fact) => (
              <div key={`${block.id}-${fact.key}`} className="min-w-0">
                <dt className="break-words text-[12px] text-caption">{fact.label}</dt>
                <dd className="break-words text-[13.5px] text-ink">
                  {fact.value || <span className="text-caption">Not on file</span>}
                </dd>
                {fact.note ? (
                  <dd className="mt-0.5 break-words text-[11.5px] text-caption">{fact.note}</dd>
                ) : null}
              </div>
            ))}
          </dl>
        </div>
      ))}

      {skipped.length > 0 ? (
        <p className="break-words text-[12px] text-caption">
          {skipped.join(", ")} {skipped.length === 1 ? "is" : "are"} not asked on this application.
        </p>
      ) : null}
    </div>
  );
}

export function ViewLedger({ groups, skipped, narrative, learnerName }: ViewProps) {
  const totalFacts = groups.reduce((n, g) => n + g.facts.length, 0);
  const totalOnFile = groups.reduce((n, g) => n + g.onFile, 0);

  // Split whole blocks across the two lg columns at the midpoint of total row
  // count (title band counts as a row) so both columns end at a similar height.
  const totalRows = groups.reduce((n, g) => n + g.facts.length + 1, 0);
  const left: SummaryGroup[] = [];
  const right: SummaryGroup[] = [];
  let filled = 0;
  for (const group of groups) {
    const rows = group.facts.length + 1;
    if (right.length === 0 && (left.length === 0 || filled + rows / 2 <= totalRows / 2)) {
      left.push(group);
      filled += rows;
    } else {
      right.push(group);
    }
  }

  const renderColumn = (column: SummaryGroup[]) =>
    column.map((group) => (
      <div key={group.id} className="min-w-0 border-t border-line first:border-t-0">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 bg-cream px-3 py-1.5">
          <span className="min-w-0 break-words text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
            {group.title}
          </span>
          <span className="text-[11px] tabular-nums text-caption">
            {group.onFile}/{group.facts.length}
          </span>
        </div>
        {group.facts.map((fact) => (
          <div
            key={fact.key}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] border-t border-cream-line"
          >
            <div className="min-w-0 break-words bg-paper px-3 py-2 text-[12px] leading-snug text-body">
              {fact.label}
            </div>
            <div className="min-w-0 break-words border-l border-cream-line bg-white px-3 py-2">
              <p className={fact.value ? "text-[13.5px] leading-snug text-ink" : "text-[13.5px] leading-snug text-caption"}>
                {fact.value || "Not on file"}
              </p>
              {fact.note ? (
                <p className="mt-0.5 text-[11.5px] leading-snug text-caption">{fact.note}</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    ));

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="min-w-0 break-words text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
          {learnerName ? `${learnerName} · eligibility ledger` : "Eligibility ledger"}
        </span>
        <span className="text-[11.5px] tabular-nums text-caption">
          {totalOnFile} of {totalFacts} answers on file
        </span>
      </div>

      <p className="min-w-0 break-words text-[13.5px] leading-relaxed text-body">{narrative}</p>

      {groups.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white">
          <div className="grid min-w-0 lg:grid-cols-2">
            <div className="min-w-0">{renderColumn(left)}</div>
            {right.length > 0 ? (
              <div className="min-w-0 border-t border-line lg:border-l lg:border-t-0">
                {renderColumn(right)}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="rounded-xl border border-line bg-paper px-3 py-3 text-[12.5px] text-caption">
          This application asks no eligibility blocks.
        </p>
      )}

      {skipped.length > 0 ? (
        <p className="min-w-0 break-words text-[12px] text-caption">
          {skipped.join(", ")} {skipped.length === 1 ? "is" : "are"} not asked on this application.
        </p>
      ) : null}
    </div>
  );
}

export function ViewJourney({ groups, skipped, narrative, learnerName }: ViewProps) {
  return (
    <div className="min-w-0">
      {narrative ? (
        <div className="rounded-lg border border-cream-line bg-paper p-3.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
            {learnerName ? `${learnerName} — in brief` : "In brief"}
          </p>
          <p className="mt-1.5 break-words text-[13.5px] leading-relaxed text-body">{narrative}</p>
        </div>
      ) : null}

      <ol className={narrative ? "mt-5" : ""}>
        {groups.map((group, index) => {
          const isLast = index === groups.length - 1;
          return (
            <li key={group.id} className={`relative min-w-0 pl-6 ${isLast ? "" : "pb-6"}`}>
              {/* the spine stops at the final dot rather than running past it */}
              {isLast ? null : (
                <span
                  aria-hidden
                  className="absolute bottom-0 left-[4px] top-[18px] border-l-2 border-line"
                />
              )}
              <span
                aria-hidden
                className="absolute left-0 top-[6px] h-2.5 w-2.5 rounded-full border-2 border-[#d3e0f0] bg-[#e7eef8]"
              />

              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <h4 className="min-w-0 break-words text-[13.5px] font-semibold text-ink">
                  {group.title}
                </h4>
                <span className="text-[11px] text-caption">
                  {group.onFile} of {group.facts.length}
                </span>
              </div>

              {group.facts.length > 0 ? (
                <div className="mt-2.5 grid gap-x-5 gap-y-3 sm:grid-cols-2">
                  {group.facts.map((fact) => (
                    <div key={fact.key} className="min-w-0">
                      <p className="break-words text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                        {fact.label}
                      </p>
                      <p
                        className={`mt-0.5 break-words text-[13.5px] ${
                          fact.value ? "text-ink" : "text-caption"
                        }`}
                      >
                        {fact.value || "Not on file"}
                      </p>
                      {fact.note ? (
                        <p className="mt-0.5 break-words text-[11.5px] text-caption">{fact.note}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {skipped.length > 0 ? (
        <p className="mt-5 break-words border-t border-cream-line pt-3 text-[12px] text-caption">
          {skipped.join(", ")} {skipped.length === 1 ? "is" : "are"} not asked on this application.
        </p>
      ) : null}
    </div>
  );
}

export function ViewCompact({ groups, skipped, narrative, learnerName }: ViewProps) {
  return (
    <div className="min-w-0 space-y-3">
      {narrative ? (
        <p className="break-words rounded-lg border border-cream-line bg-cream px-3 py-2.5 text-[12.5px] leading-relaxed text-body">
          {learnerName ? <span className="font-medium text-ink">{learnerName} — </span> : null}
          {narrative}
        </p>
      ) : null}

      {/* CSS columns keep the flow dense on wide screens; each panel opts out of column splitting. */}
      <div className="lg:columns-2 lg:gap-3">
        {groups.map((group) => {
          const total = group.facts.length;
          const complete = group.onFile === total;
          return (
            <section
              key={group.id}
              className="mb-3 break-inside-avoid rounded-lg border border-line bg-white px-3 py-2.5"
            >
              <header className="mb-2 flex items-baseline justify-between gap-2">
                <h4 className="min-w-0 break-words text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                  {group.title}
                </h4>
                <span
                  className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-medium ${
                    complete
                      ? "border-[#d5e6d8] bg-[#e8f2e9] text-[#3f6c45]"
                      : "border-[#ecdfc0] bg-[#f6efdd] text-[#8a6d2f]"
                  }`}
                >
                  {group.onFile} of {total}
                </span>
              </header>

              <div className="flex flex-wrap gap-1.5">
                {group.facts.map((fact) => (
                  <div
                    key={fact.key}
                    className="flex min-w-0 max-w-full items-center gap-2 rounded-md bg-paper px-2 py-1"
                  >
                    <span className="text-[11px] leading-tight text-caption">{fact.label}</span>
                    <div className="min-w-0 border-l border-line pl-2">
                      {fact.value ? (
                        <span className="block break-words text-[12.5px] font-medium leading-tight text-ink">
                          {fact.value}
                        </span>
                      ) : (
                        <span className="block text-[12px] leading-tight text-caption">Not on file</span>
                      )}
                      {fact.note ? (
                        <span className="mt-0.5 block break-words text-[11px] leading-tight text-caption">
                          {fact.note}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {skipped.length > 0 ? (
        <p className="break-words text-[12px] text-caption">
          {skipped.join(", ")} {skipped.length === 1 ? "is" : "are"} not asked on this application.
        </p>
      ) : null}
    </div>
  );
}
