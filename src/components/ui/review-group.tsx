"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { CardChip } from "./card-bits";
import { IconAlert, IconCheck, IconDoc, IconShield, IconX } from "./icons";
import type { DocRow } from "./document-table";
import type { GroupCheck } from "@/lib/queries";
import type { ReviewGroup } from "@/lib/domain";

/**
 * One review group — "Class 10", "Bachelor's degree" — with everything that
 * belongs to it in one place: the counsellor's "this is correct" tick, Ops'
 * verified / not-verified verdict, the documents that evidence it, and the
 * undertakings its answers trigger.
 *
 * Nobody ticks thirty fields. They confirm the group they just read.
 *
 * One component, both desks: the counsellor gets the tick, Ops gets the
 * verdict, and each sees the other's state on the same header.
 */
export function ReviewGroupBlock({
  group,
  acCheck,
  opsCheck,
  viewer,
  inForm = false,
  canTick = false,
  canReview = false,
  toggleAction,
  reviewAction,
  docs = [],
  triggered = [],
  children,
}: {
  group: ReviewGroup;
  acCheck?: GroupCheck;
  opsCheck?: GroupCheck;
  viewer: "ac" | "ops";
  /** Rendered INSIDE the call wizard's form — a nested <form> is invalid
   *  HTML and makes React throw the server render away, so the tick posts
   *  through formAction instead. */
  inForm?: boolean;
  /** The counsellor may tick this group right now. */
  canTick?: boolean;
  /** Ops may rule on this group right now. */
  canReview?: boolean;
  toggleAction?: () => void | Promise<void>;
  reviewAction?: (formData: FormData) => void | Promise<void>;
  /** The group's own documents, already joined to what is uploaded. */
  docs?: DocRow[];
  /** Titles of the undertakings these answers trigger. */
  triggered?: string[];
  children: React.ReactNode;
}) {
  const verified = opsCheck?.state === "verified";
  const rejected = opsCheck?.state === "not_verified";
  const ticked = acCheck?.state === "checked";
  const [rejecting, setRejecting] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    // overflow-hidden so the header's fill is clipped by the radius — without
    // it the tinted bar squares off the top corners and pokes past the border.
    <section className="overflow-hidden rounded-xl border border-line">
      {/* Header, two fixed zones: identity and state on the left, the
          actions on the right — never interleaved, so the eye always knows
          where to look. State chips stay small next to the title; the
          buttons are the only button-shaped things in the row. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line bg-paper px-4 py-3">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
        <h3 className="text-[13.5px] font-semibold text-ink">{group.label}</h3>

        {ticked && (
          <CardChip
            tone="muted"
            tooltip={`Confirmed by ${acCheck?.by_name ?? "the counsellor"}${
              acCheck?.at ? ` on ${acCheck.at.slice(0, 10)}` : ""
            }`}
          >
            <IconCheck className="h-3 w-3" />
            Confirmed
          </CardChip>
        )}
        {verified && (
          <CardChip
            tone="green"
            tooltip={`Verified by ${opsCheck?.by_name ?? "Ops"}${
              opsCheck?.at ? ` on ${opsCheck.at.slice(0, 10)}` : ""
            }`}
          >
            <IconCheck className="h-3 w-3" />
            Verified
          </CardChip>
        )}
        {rejected && (
          <CardChip tone="amber" tooltip={opsCheck?.comment ?? undefined}>
            <IconAlert className="h-3 w-3" />
            Not verified
          </CardChip>
        )}

        </span>

        <span className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          {/* The counsellor's one click: this group is right. */}
          {viewer === "ac" &&
            canTick &&
            toggleAction &&
            (() => {
              const button = (
                <button
                  formAction={inForm ? toggleAction : undefined}
                  formNoValidate={inForm || undefined}
                  className={
                    ticked
                      ? "flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-medium text-caption transition-colors hover:bg-muted hover:text-ink"
                      : "btn-secondary !h-7 !px-2.5 !text-[12px]"
                  }
                  // The section name is right beside this, so the button does
                  // not repeat it: "Profile details … Confirm". It also pairs
                  // with the Confirmed chip the tick turns into, and stays
                  // distinct from Ops' "Verified" — the counsellor confirms
                  // what they hold, Ops verifies it against the documents.
                  title={ticked ? "Undo" : "These details are correct"}
                >
                  <IconCheck className="h-3.5 w-3.5" />
                  {ticked ? "Undo" : "Confirm"}
                </button>
              );
              return inForm ? button : <form action={toggleAction}>{button}</form>;
            })()}

          {/* Ops' verdict. Two forms rather than one, so "not verified"
              carries its reason and can never be filed without one. */}
          {viewer === "ops" && canReview && reviewAction && (
            <>
              <form action={reviewAction}>
                <input type="hidden" name="verdict" value="verified" />
                <button
                  className={
                    verified
                      ? "btn-success !h-7 !px-2.5 !text-[12px]"
                      : "btn-secondary !h-7 !px-2.5 !text-[12px]"
                  }
                >
                  <IconCheck className="h-3.5 w-3.5" />
                  Verified
                </button>
              </form>
              {/* The reason is asked for when it is needed, not parked in an
                  input on every section header — and it is optional: the
                  verdict is the point, the note is a courtesy. */}
              <button
                type="button"
                onClick={() => setRejecting(true)}
                className={
                  rejected
                    ? "!h-7 !px-2.5 !text-[12px] btn-secondary !border-[#ecdfc0] !bg-[#f6efdd] !text-[#8a6d2f]"
                    : "btn-secondary !h-7 !px-2.5 !text-[12px]"
                }
              >
                <IconX className="h-3.5 w-3.5" />
                Not verified
              </button>
            </>
          )}
        </span>
      </div>

      {rejecting &&
        mounted &&
        reviewAction &&
        createPortal(
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
            onClick={() => setRejecting(false)}
          >
            <form
              // The dialog closes AFTER the verdict lands, from the action
              // itself. Closing it from the submit button's onClick unmounted
              // the form before the browser finished submitting — an empty
              // textarea closed with no validation bubble, a filled one could
              // lose the verdict while looking like success.
              action={async (fd: FormData) => {
                await reviewAction(fd);
                setRejecting(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[440px] rounded-2xl border border-line bg-white p-5 shadow-[0_28px_60px_-18px_rgba(49,48,43,0.45)]"
            >
              <input type="hidden" name="verdict" value="not_verified" />
              <h3 className="font-display text-[16px] font-semibold tracking-tight text-ink">
                What&apos;s wrong with {group.label}?
              </h3>
              <p className="mt-1 text-[13px] leading-relaxed text-body">
                Every field below gets marked incorrect — flip back any that
                are fine. A note reaches the counsellor as a comment, or
                leave it blank and just mark it.
              </p>
              <textarea
                name="comment"
                autoFocus
                rows={3}
                defaultValue={rejected ? opsCheck?.comment ?? "" : ""}
                placeholder="Optional — e.g. the marksheet is a photo of a photocopy, ask for a clean scan"
                className="input mt-3 !h-auto w-full !py-2 !text-[13px]"
              />
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setRejecting(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button className="btn-primary flex-1">
                  Mark not verified
                </button>
              </div>
            </form>
          </div>,
          document.body
        )}

      <div className="p-4">{children}</div>

      {/* What backs this group up, and what it commits the learner to. */}
      {(docs.length > 0 || triggered.length > 0 || rejected) && (
        <div className="space-y-2 border-t border-line px-4 py-3">
          {rejected && opsCheck?.comment && (
            <p className="flex items-start gap-1.5 text-[12.5px] leading-snug text-[#8a6d2f]">
              <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {opsCheck.comment}
            </p>
          )}

          {docs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex items-center gap-1.5 text-[12px] text-caption">
                <IconDoc className="h-3.5 w-3.5" />
                Documents
              </span>
              {docs.map((d) => (
                <CardChip
                  key={d.key}
                  tone={
                    !d.filename
                      ? "outline"
                      : d.verification === "verified"
                        ? "green"
                        : d.verification === "rejected"
                          ? "amber"
                          : "muted"
                  }
                  tooltip={d.filename ?? "Not uploaded yet"}
                >
                  {d.type}
                </CardChip>
              ))}
            </div>
          )}

          {/* A triggered undertaking is a consequence of the answers above —
              a document the learner is now legally required to sign — so it
              gets a tint rather than sitting in grey with everything else.
              Purple, not amber: amber is what an open comment looks like, and
              this is not a problem to fix. */}
          {triggered.length > 0 && (
            <p className="flex items-start gap-2 rounded-lg border border-[#e1d5ee] bg-[#efe9f6] px-3 py-2 text-[12.5px] leading-snug text-[#5c4279]">
              <IconShield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6b4d8f]" />
              <span>
                These answers trigger{" "}
                <b className="font-semibold text-[#4b3563]">
                  {triggered.join(", ")}
                </b>{" "}
                — the learner signs {triggered.length === 1 ? "it" : "them"}{" "}
                before the offer letter.
              </span>
            </p>
          )}
        </div>
      )}
    </section>
  );
}
