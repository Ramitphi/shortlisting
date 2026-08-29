"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  DocumentDialog,
  IconCheck,
  IconFeather,
  IconSignature,
  useToast,
  type Signee,
} from "@/components/ui";
import {
  DOC_TYPE_LABELS,
  type UndertakingField,
  type UndertakingVariant,
} from "@/lib/domain";
import type { Doc } from "@/lib/queries";

/**
 * The learner's undertaking-signing UI, six ways.
 *
 * The undertakings are TRIGGERED by answers — a backlog count, a pursuing
 * status, a financing plan — and the design question the team is still
 * arguing is how visibly to tie the two together at signing time. These are
 * the candidates, in the order we prefer them (v1 first), switched live
 * from the demo FAB. v6 is the inline-at-the-field idea kept at the back
 * of the queue for reference.
 */

export interface UndertakingItem {
  doc: Doc;
  signees: Signee[];
  fields: UndertakingField[];
}

/* ---------- shared bits ---------- */

/** The answers behind a document, as quiet chips. */
function FieldChips({ fields }: { fields: UndertakingField[] }) {
  if (fields.length === 0) {
    return (
      <span className="inline-flex items-center rounded-md border border-line bg-cream px-2 py-0.5 text-[11.5px] text-caption">
        Covers your whole application
      </span>
    );
  }
  return (
    <span className="flex flex-wrap gap-1.5">
      {fields.map((f) => (
        <span
          key={f.key}
          className="inline-flex max-w-full items-center gap-1 rounded-md border border-line bg-cream px-2 py-0.5 text-[11.5px]"
        >
          <span className="text-caption">{f.label}</span>
          <span className="min-w-0 truncate font-medium text-ink">
            {f.value}
          </span>
        </span>
      ))}
    </span>
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

/** One line of why-this-exists copy, built from the triggering answers. */
function whyCopy(fields: UndertakingField[]): string {
  if (fields.length === 0)
    return "A standard declaration every application signs.";
  return `Added because of your answer${fields.length === 1 ? "" : "s"} below.`;
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

/* ---------- the variants ---------- */

export function UndertakingVariantView({
  variant,
  items,
  signable,
  learnerName,
  phone,
  signDoc,
  signAll,
}: {
  variant: UndertakingVariant;
  items: UndertakingItem[];
  /** Sign controls on — shortlisted and not yet certified. */
  signable: boolean;
  learnerName: string;
  phone?: string;
  /** Bound per document id by the page: (docId) => server action. */
  signDoc: (docId: number) => (formData: FormData) => void;
  /** One signature for everything unsigned. */
  signAll: (formData: FormData) => void;
}) {
  switch (variant) {
    case "v2":
      return <VariantContextSign {...{ items, signable, phone, signDoc }} />;
    case "v3":
      return <VariantGuided {...{ items, signable, phone, signDoc }} />;
    case "v4":
      return (
        <VariantTickOnce {...{ items, signable, learnerName, phone, signAll }} />
      );
    case "v5":
      return (
        <VariantFieldFirst {...{ items, signable, learnerName, phone, signAll }} />
      );
    case "v6":
      return (
        <VariantInline {...{ items, signable, learnerName, phone, signDoc }} />
      );
    default:
      return <VariantCards {...{ items, signable, phone, signDoc }} />;
  }
}

/** The dialog trigger every document-first variant shares. */
function docDialog(
  it: UndertakingItem,
  signable: boolean,
  phone: string | undefined,
  signDoc: (docId: number) => (formData: FormData) => void,
  certifying?: { label: string; value: string }[],
  triggerClassName?: string
) {
  const unsigned = signable && !it.doc.signed_at;
  return (
    <DocumentDialog
      docType={DOC_TYPE_LABELS[it.doc.type]}
      title={it.doc.title}
      content={it.doc.content}
      signees={it.signees}
      canSign={unsigned}
      otpPhone={phone}
      certifying={certifying}
      action={signDoc(it.doc.id)}
      triggerLabel={unsigned ? "Review & sign" : "View document"}
      triggerClassName={
        triggerClassName ??
        (unsigned ? "btn-primary !h-9" : "btn-secondary !h-9")
      }
    />
  );
}

/**
 * v1 — Signature cards (our pick). The card carries everything: the feather
 * mark, the title, why it exists, the answers it rests on, and the one
 * action. Nothing new to learn — it is the signing flow we have, with the
 * answers finally on the card.
 */
function VariantCards({
  items,
  signable,
  phone,
  signDoc,
}: {
  items: UndertakingItem[];
  signable: boolean;
  phone?: string;
  signDoc: (docId: number) => (formData: FormData) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((it) => {
        const signed = Boolean(it.doc.signed_at);
        return (
          <div
            key={it.doc.id}
            className="rounded-xl border border-line bg-white p-4"
          >
            <div className="flex flex-wrap items-start gap-3">
              <FeatherTile signed={signed} />
              <div className="min-w-0 flex-1">
                <div className="text-[14.5px] font-medium text-ink">
                  {it.doc.title}
                </div>
                <div className="mt-0.5 text-[12.5px] text-body">
                  {signed
                    ? `Signed on ${it.doc.signed_at?.slice(0, 10)}`
                    : whyCopy(it.fields)}
                </div>
              </div>
              <div className="shrink-0">
                {docDialog(it, signable, phone, signDoc)}
              </div>
            </div>
            <div className="mt-3 border-t border-line pt-3">
              <FieldChips fields={it.fields} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * v2 — Context at signing. The list stays minimal; the answers appear in
 * the sign panel at the exact moment the learner vouches for them.
 */
function VariantContextSign({
  items,
  signable,
  phone,
  signDoc,
}: {
  items: UndertakingItem[];
  signable: boolean;
  phone?: string;
  signDoc: (docId: number) => (formData: FormData) => void;
}) {
  return (
    <div className="divide-y divide-line rounded-xl border border-line bg-white">
      {items.map((it) => {
        const signed = Boolean(it.doc.signed_at);
        return (
          <div key={it.doc.id} className="flex items-center gap-3 p-4">
            <FeatherTile signed={signed} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium text-ink">
                {it.doc.title}
              </div>
              <div className="text-[12.5px] text-caption">
                {signed
                  ? `Signed on ${it.doc.signed_at?.slice(0, 10)}`
                  : "Awaiting signature"}
              </div>
            </div>
            <div className="shrink-0">
              {docDialog(
                it,
                signable,
                phone,
                signDoc,
                it.fields.map((f) => ({ label: f.label, value: f.value }))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * v3 — Guided, one at a time. The first unsigned document is the open one:
 * a readable excerpt, the answers, the sign action. The rest wait their
 * turn as quiet rows, and signing advances the walk on its own.
 */
function VariantGuided({
  items,
  signable,
  phone,
  signDoc,
}: {
  items: UndertakingItem[];
  signable: boolean;
  phone?: string;
  signDoc: (docId: number) => (formData: FormData) => void;
}) {
  const signedCount = items.filter((it) => it.doc.signed_at).length;
  const currentId = items.find((it) => !it.doc.signed_at)?.doc.id;
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream">
          <div
            className="h-full rounded-full bg-[#4c9257] transition-all"
            style={{ width: `${(signedCount / Math.max(1, items.length)) * 100}%` }}
          />
        </div>
        <span className="text-[12px] font-medium text-caption">
          {signedCount} of {items.length} signed
        </span>
      </div>
      <div className="space-y-2.5">
        {items.map((it) => {
          const signed = Boolean(it.doc.signed_at);
          const current = signable && it.doc.id === currentId;
          if (!current) {
            return (
              <div
                key={it.doc.id}
                className={`flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3 ${
                  signed ? "" : "opacity-60"
                }`}
              >
                <FeatherTile signed={signed} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-ink">
                    {it.doc.title}
                  </div>
                  <div className="text-[12px] text-caption">
                    {signed
                      ? `Signed on ${it.doc.signed_at?.slice(0, 10)}`
                      : "Up next"}
                  </div>
                </div>
                <div className="shrink-0">
                  {docDialog(it, false, phone, signDoc, undefined, "btn-secondary !h-8 !px-3 !text-[12.5px]")}
                </div>
              </div>
            );
          }
          return (
            <div
              key={it.doc.id}
              className="rounded-xl border-2 border-ink/70 bg-white p-4"
            >
              <div className="flex items-start gap-3">
                <FeatherTile signed={false} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-medium text-ink">
                    {it.doc.title}
                  </div>
                  <div className="mt-0.5 text-[12.5px] text-body">
                    {whyCopy(it.fields)}
                  </div>
                </div>
              </div>
              <div className="mt-3 max-h-36 overflow-y-auto rounded-lg border border-line bg-paper p-3 text-[12.5px] leading-relaxed text-body">
                {it.doc.content}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <FieldChips fields={it.fields} />
                <div className="shrink-0">
                  {docDialog(it, true, phone, signDoc)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * v4 — Read & tick, one OTP. Each undertaking is read and ticked in place;
 * one typed name and one OTP sign the lot. The fewest ceremonies that still
 * keep "I read each one" true.
 */
function VariantTickOnce({
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
  const [openId, setOpenId] = useState<number | null>(null);
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
          const open = openId === it.doc.id;
          return (
            <div key={it.doc.id} className="p-4">
              <div className="flex items-start gap-3">
                <FeatherTile signed={signed} />
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : it.doc.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="text-[14px] font-medium text-ink">
                    {it.doc.title}
                  </div>
                  <div className="mt-0.5 text-[12px] text-caption">
                    {signed
                      ? `Signed on ${it.doc.signed_at?.slice(0, 10)}`
                      : open
                        ? "Reading — tick below once it is right"
                        : "Tap to read"}
                  </div>
                </button>
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
              {open && (
                <div className="mt-3 space-y-3 pl-[52px]">
                  <div className="max-h-36 overflow-y-auto rounded-lg border border-line bg-paper p-3 text-[12.5px] leading-relaxed text-body">
                    {it.doc.content}
                  </div>
                  <FieldChips fields={it.fields} />
                </div>
              )}
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

/**
 * v5 — Field-first. The answer leads and its undertaking hangs under it,
 * the way the PM sketched it — but the commit is still one proper
 * signature block with an OTP, not a scatter of checkboxes.
 */
function VariantFieldFirst({
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
  const [agreed, setAgreed] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const unsigned = items.filter((it) => !it.doc.signed_at);
  const allAgreed =
    unsigned.length > 0 && unsigned.every((it) => agreed.has(it.doc.id));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      {items.map((it) => {
        const signed = Boolean(it.doc.signed_at);
        return (
          <div
            key={it.doc.id}
            className="rounded-xl border border-line bg-white p-4"
          >
            {it.fields.length > 0 ? (
              <div className="space-y-2">
                {it.fields.map((f) => (
                  <div key={f.key}>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                      {f.label}
                    </div>
                    <div className="mt-1 flex h-10 items-center rounded-lg border border-line bg-muted px-3 text-[13.5px] font-medium text-ink">
                      {f.value}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                Your application
              </div>
            )}
            <label
              className={`mt-3 flex items-start gap-2.5 ${
                signed || !signable ? "" : "cursor-pointer"
              }`}
            >
              {signed ? (
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#e8f2e9] text-[#3f6c45]">
                  <IconCheck className="h-3 w-3" />
                </span>
              ) : (
                <input
                  type="checkbox"
                  disabled={!signable}
                  checked={agreed.has(it.doc.id)}
                  onChange={(e) => {
                    const next = new Set(agreed);
                    if (e.target.checked) next.add(it.doc.id);
                    else next.delete(it.doc.id);
                    setAgreed(next);
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#4c9257]"
                />
              )}
              <span className="min-w-0 text-[13px] leading-snug text-body">
                <span className="font-medium text-ink">{it.doc.title}.</span>{" "}
                {it.doc.content.slice(0, 140)}
                {it.doc.content.length > 140 ? "…" : ""}
                {signed && (
                  <span className="block text-[11.5px] text-caption">
                    Signed on {it.doc.signed_at?.slice(0, 10)}
                  </span>
                )}
              </span>
            </label>
          </div>
        );
      })}

      {signable && unsigned.length > 0 && (
        <div className="rounded-xl border border-line bg-white p-4">
          <div className="text-[13.5px] font-medium text-ink">
            Digital signature
          </div>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                Full name
              </div>
              <div className="mt-1 flex h-10 items-center rounded-lg border border-line bg-muted px-3 font-display text-[15px] italic text-ink">
                {learnerName}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                Date
              </div>
              <div className="mt-1 flex h-10 items-center rounded-lg border border-line bg-muted px-3 text-[13.5px] text-ink">
                {today}
              </div>
            </div>
          </div>
          <label className="mt-3 flex cursor-pointer items-center gap-2.5 text-[13px] text-body">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="h-4 w-4 accent-[#4c9257]"
            />
            I agree to electronically sign the undertakings ticked above.
          </label>
          <button
            type="button"
            disabled={!allAgreed || !confirm}
            title={allAgreed ? "" : "Tick every undertaking first"}
            onClick={() => setOtpOpen(true)}
            className="btn-primary mt-3 !h-10"
          >
            <IconSignature className="h-4 w-4" />
            Sign with OTP
          </button>
        </div>
      )}

      <OtpConfirm
        open={otpOpen}
        phone={phone}
        what={`all ${unsigned.length} undertakings`}
        onCancel={() => setOtpOpen(false)}
        onVerify={async () => {
          setOtpOpen(false);
          const fd = new FormData();
          fd.set("signature", learnerName);
          toast("Documents signed");
          await signAll(fd);
          router.refresh();
        }}
      />
    </div>
  );
}

/**
 * v6 — Inline at the field: the reference for the idea the PMs floated,
 * kept last on purpose. The agreement rides directly on the answer —
 * checkbox, then an OTP right there in the row, one per undertaking. It
 * works; it also shows why a form that interrupts itself per answer is
 * heavier than it looks on a whiteboard.
 */
function VariantInline({
  items,
  signable,
  learnerName,
  phone,
  signDoc,
}: {
  items: UndertakingItem[];
  signable: boolean;
  learnerName: string;
  phone?: string;
  signDoc: (docId: number) => (formData: FormData) => void;
}) {
  const [armed, setArmed] = useState<Set<number>>(new Set());
  const [otps, setOtps] = useState<Record<number, string>>({});
  const toast = useToast();
  const router = useRouter();

  return (
    <div className="space-y-3">
      {items.map((it) => {
        const signed = Boolean(it.doc.signed_at);
        const isArmed = armed.has(it.doc.id);
        const otp = otps[it.doc.id] ?? "";
        return (
          <div
            key={it.doc.id}
            className="rounded-xl border border-line bg-white p-4"
          >
            {it.fields.map((f) => (
              <div key={f.key} className="mb-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                  {f.label}
                </div>
                <div className="mt-1 flex h-10 items-center rounded-lg border border-line bg-muted px-3 text-[13.5px] font-medium text-ink">
                  {f.value}
                </div>
              </div>
            ))}
            {signed ? (
              <div className="flex items-center gap-2 text-[13px] text-[#3f6c45]">
                <IconCheck className="h-4 w-4" />
                {it.doc.title} — confirmed on {it.doc.signed_at?.slice(0, 10)}
              </div>
            ) : (
              <>
                <label
                  className={`flex items-start gap-2.5 ${
                    signable ? "cursor-pointer" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={!signable}
                    checked={isArmed}
                    onChange={(e) => {
                      const next = new Set(armed);
                      if (e.target.checked) next.add(it.doc.id);
                      else next.delete(it.doc.id);
                      setArmed(next);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#4c9257]"
                  />
                  <span className="min-w-0 text-[13px] leading-snug text-body">
                    <span className="font-medium text-ink">
                      {it.doc.title}.
                    </span>{" "}
                    {it.doc.content.slice(0, 120)}
                    {it.doc.content.length > 120 ? "…" : ""}
                  </span>
                </label>
                {isArmed && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-[26px]">
                    <input
                      value={otp}
                      onChange={(e) =>
                        setOtps({
                          ...otps,
                          [it.doc.id]: e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4),
                        })
                      }
                      inputMode="numeric"
                      placeholder="OTP ••••"
                      className="input !h-9 w-28 text-center"
                    />
                    <button
                      type="button"
                      disabled={!/^\d{4}$/.test(otp)}
                      onClick={async () => {
                        const fd = new FormData();
                        fd.set("signature", learnerName);
                        toast(`${it.doc.title} confirmed`);
                        await signDoc(it.doc.id)(fd);
                        router.refresh();
                      }}
                      className="btn-secondary !h-9 !px-3 !text-[12.5px]"
                    >
                      Verify
                    </button>
                    <span className="text-[11.5px] text-caption">
                      Sent to{" "}
                      {phone
                        ? phone.replace(/\d(?=(?:\D*\d){4})/g, "•")
                        : "your number"}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
