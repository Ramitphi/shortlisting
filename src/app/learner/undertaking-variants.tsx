"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  IconCheck,
  IconFeather,
  IconSignature,
  useToast,
  type Signee,
} from "@/components/ui";
import { type UndertakingField } from "@/lib/domain";
import type { Doc } from "@/lib/queries";

/**
 * The learner signs their undertakings.
 *
 * Undertakings are TRIGGERED by answers — a backlog count, a pursuing
 * status, a financing plan — so each one opens to show the document AND the
 * answers it rests on, and the learner ticks it. One signature and one OTP
 * then commit every document at once: they are agreeing to one set of facts
 * about themselves, not signing five unrelated papers.
 *
 * Six treatments were built and walked; this is the one that won. The other
 * five are gone rather than parked behind a switch — a picker of dead
 * options is a maintenance cost and a demo hazard.
 */

export interface UndertakingItem {
  doc: Doc;
  signees: Signee[];
  fields: UndertakingField[];
}

/* ---------- shared bits ---------- */

/* ---------- shared bits ---------- */

/**
 * The answers that put this document in front of them.
 *
 * An undertaking is triggered BY an answer, so the answer belongs next to it
 * — otherwise the learner is agreeing to a paragraph of legal text with no
 * idea which of their own words called it up. Shown at rest, not on a hover
 * or a tap: this is the part they are most likely to want to check.
 */
function TriggerAnswers({ fields }: { fields: UndertakingField[] }) {
  if (fields.length === 0) {
    return (
      <p className="text-[12px] text-caption">
        This one covers your whole application.
      </p>
    );
  }
  return (
    <div className="rounded-lg border border-[#ecdfc0] bg-[#f6efdd]/60 px-3 py-2.5">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#8a6d2f]">
        Because you answered
      </div>
      <dl className="mt-1.5 space-y-1">
        {fields.map((f) => (
          <div
            key={f.key}
            className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
          >
            <dt className="text-[12px] text-body">{f.label}</dt>
            <dd className="min-w-0 break-words text-[12.5px] font-medium text-ink">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The feather-in-a-tile mark that names a thing-to-sign. */
function FeatherTile({ signed }: { signed: boolean }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
        signed ? "bg-[#e8f2e9] text-[#3f6c45]" : "bg-cream text-ink"
      }`}
    >
      {signed ? (
        <IconCheck className="h-[18px] w-[18px]" />
      ) : (
        <IconFeather className="h-[18px] w-[18px]" />
      )}
    </span>
  );
}

/**
 * The 4-digit confirmation the one-OTP variants share. Same contract as the
 * document dialog's own step: the name says who, the code says it's really
 * them — in this prototype any 4 digits verify.
 */
function OtpConfirm({
  open,
  phone,
  what,
  onCancel,
  onVerify,
}: {
  open: boolean;
  phone?: string;
  what: string;
  onCancel: () => void;
  onVerify: () => void;
}) {
  const [otp, setOtp] = useState("");
  useEffect(() => {
    if (open) setOtp("");
  }, [open]);
  const masked = phone ? phone.replace(/\d(?=(?:\D*\d){4})/g, "•") : "your number";
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[400px] rounded-2xl border border-line bg-white p-6 shadow-[0_32px_64px_-24px_rgba(49,48,43,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[16px] font-medium text-ink">Verify it&apos;s you</h3>
        <p className="mt-1 text-[13px] text-body">
          We&apos;ve sent a 4-digit OTP to {masked}. Enter it to sign {what}.
        </p>
        <input
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))}
          inputMode="numeric"
          placeholder="••••"
          autoFocus
          className="input mt-4 w-full text-center !text-[20px] tracking-[0.4em]"
        />
        <p className="mt-2 text-[11.5px] text-caption">
          Prototype — any 4-digit code verifies.
        </p>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button
            type="button"
            disabled={!/^\d{4}$/.test(otp)}
            onClick={onVerify}
            className="btn-primary flex-1"
          >
            Verify &amp; sign
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/**
 * The moment everything is signed — confetti once, then the one thing left
 * to do. Watches the signed count flip to complete during THIS visit; a
 * reload of an already-signed page stays quiet.
 */
export function AllSignedCelebration({
  allSigned,
  certified,
}: {
  allSigned: boolean;
  certified: boolean;
}) {
  const [open, setOpen] = useState(false);
  const prev = useRef<boolean | null>(null);
  useEffect(() => {
    if (prev.current === false && allSigned && !certified) setOpen(true);
    prev.current = allSigned;
  }, [allSigned, certified]);
  if (!open) return null;
  const colors = ["#e94a4f", "#f2b134", "#4c9257", "#3d5a80", "#6b4d8f", "#e88fb1"];
  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-ink/45 p-4 backdrop-blur-[2px]"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative w-full max-w-[440px] overflow-hidden rounded-2xl border border-line bg-white p-8 text-center shadow-[0_32px_64px_-24px_rgba(49,48,43,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {Array.from({ length: 28 }).map((_, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${(i * 37) % 100}%`,
              background: colors[i % colors.length],
              animationDelay: `${(i % 9) * 0.14}s`,
            }}
          />
        ))}
        <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f2e9] text-[#3f6c45]">
          <IconCheck className="h-7 w-7" />
        </span>
        <h3 className="relative mt-4 text-[20px] font-medium text-ink">
          Everything is signed
        </h3>
        <p className="relative mt-1.5 text-[13.5px] text-body">
          One step left — certify that your details are correct and your
          offer letter is on its way.
        </p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn-primary relative mt-5 !px-6"
        >
          Take me to certify
        </button>
      </div>
    </div>,
    document.body
  );
}

/* ---------- the signing surface ---------- */

export function UndertakingSigning({
  items,
  signable,
  learnerName,
  phone,
  signAll,
}: {
  items: UndertakingItem[];
  signable: boolean;
  learnerName: string;
  phone?: string;
  signAll: (formData: FormData) => void;
}) {
  const [ticked, setTicked] = useState<Set<number>>(new Set());
  const [name, setName] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const unsigned = items.filter((it) => !it.doc.signed_at);
  const allTicked =
    unsigned.length > 0 && unsigned.every((it) => ticked.has(it.doc.id));
  const matches =
    name.trim().toLowerCase() === learnerName.trim().toLowerCase();

  return (
    <div>
      <div className="divide-y divide-line rounded-xl border border-line bg-white">
        {items.map((it) => {
          const signed = Boolean(it.doc.signed_at);
          return (
            <div key={it.doc.id} className="p-4">
              <div className="flex items-start gap-3">
                <FeatherTile signed={signed} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-ink">
                    {it.doc.title}
                  </div>
                  <div className="mt-0.5 text-[12px] text-caption">
                    {signed
                      ? `Signed on ${it.doc.signed_at?.slice(0, 10)}`
                      : "Read it, then tick below"}
                  </div>
                </div>
                {!signed && signable && (
                  <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[13px] text-body">
                    <input
                      type="checkbox"
                      checked={ticked.has(it.doc.id)}
                      onChange={(e) => {
                        const next = new Set(ticked);
                        if (e.target.checked) next.add(it.doc.id);
                        else next.delete(it.doc.id);
                        setTicked(next);
                      }}
                      className="h-4 w-4 accent-[#4c9257]"
                    />
                    I agree
                  </label>
                )}
              </div>
              {/* Open at rest. Asking someone to tap before they can read what
                  they are signing puts the reading behind a door. */}
              <div className="mt-3 space-y-2.5 sm:pl-[52px]">
                <div className="max-h-44 overflow-y-auto whitespace-pre-line rounded-lg border border-line bg-paper p-3 text-[12.5px] leading-relaxed text-body">
                  {it.doc.content}
                </div>
                <TriggerAnswers fields={it.fields} />
              </div>
            </div>
          );
        })}
      </div>

      {signable && unsigned.length > 0 && (
        <div className="mt-3 rounded-xl border border-line bg-white p-4">
          <div className="text-[13.5px] font-medium text-ink">
            Sign everything above
          </div>
          <p className="mt-0.5 text-[12.5px] text-body">
            {allTicked
              ? "Type your full name — one OTP signs all of them."
              : `Tick "I agree" on each undertaking first (${
                  unsigned.filter((it) => ticked.has(it.doc.id)).length
                }/${unsigned.length}).`}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={learnerName}
              disabled={!allTicked}
              className="input !h-10 w-full max-w-[280px]"
            />
            <button
              type="button"
              disabled={!allTicked || !matches}
              onClick={() => setOtpOpen(true)}
              className="btn-primary !h-10"
            >
              <IconSignature className="h-4 w-4" />
              Sign {unsigned.length} document{unsigned.length === 1 ? "" : "s"}
            </button>
          </div>
          {name && !matches && (
            <p className="mt-1.5 text-[11.5px] text-[#8a6d2f]">
              Must match your name exactly: {learnerName}
            </p>
          )}
        </div>
      )}

      <OtpConfirm
        open={otpOpen}
        phone={phone}
        what={`all ${unsigned.length} documents`}
        onCancel={() => setOtpOpen(false)}
        onVerify={async () => {
          setOtpOpen(false);
          const fd = new FormData();
          fd.set("signature", name);
          toast("Documents signed");
          await signAll(fd);
          router.refresh();
        }}
      />
    </div>
  );
}
