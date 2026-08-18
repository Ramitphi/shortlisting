"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { cn } from "./cn";
import {
  IconCheck,
  IconDoc,
  IconDownload,
  IconShield,
  IconSignature,
  IconZoomIn,
  IconZoomOut,
} from "./icons";
import { useToast } from "./toast";

export interface Signee {
  role: string;
  name: string;
  email: string;
  /** Who they are signing for, e.g. themselves or the organisation. */
  onBehalfOf: string;
  /** Only the learner actually signs; others are listed for the record. */
  signs?: boolean;
  signedAt?: string | null;
  signatureName?: string | null;
}

/**
 * The document as a page — heading, body, signature line. Just the document.
 * Shared by the learner, counsellor and Ops so a change lands everywhere.
 */
export function DocumentSheet({
  docType,
  title,
  content,
  signees,
  typedSignature,
  zoom = 1,
}: {
  docType: string;
  title: string;
  content: string;
  /** Empty for an uploaded file — nobody signs a marksheet. */
  signees?: Signee[];
  /** Live preview of what the learner is typing, before submitting. */
  typedSignature?: string;
  zoom?: number;
}) {
  const signer = signees?.find((s) => s.signs);
  const hasSignature = Boolean(signees && signees.length > 0);
  const signatureLine = typedSignature || signer?.signatureName || "";

  return (
    <div
      className="mx-auto min-h-[900px] w-full max-w-[820px] rounded-xl border border-line bg-white p-12 shadow-sm transition-transform duration-150"
      style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
    >
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-caption">
        {docType}
      </div>
      <h2 className="mt-2 font-display text-[22px] font-semibold tracking-tight text-ink">
        {title}
      </h2>
      <div className="mt-5 h-px bg-line" />
      <p className="mt-6 whitespace-pre-wrap text-[14px] leading-[1.85] text-body">
        {content}
      </p>

      {hasSignature && (
      <div className="mt-12 border-t border-line pt-6">
        <div className="text-[11px] uppercase tracking-[0.08em] text-caption">
          Signature
        </div>
        <div
          className={`mt-2 min-h-[38px] font-display text-[20px] italic ${
            signatureLine ? "text-ink" : "text-line-strong"
          }`}
        >
          {signatureLine || "—"}
        </div>
      </div>
      )}
    </div>
  );
}

/**
 * Reading-and-signing view. `canSign` turns on the signature panel; everyone
 * else gets the same document, read-only, with zoom and download.
 */
export function DocumentDialog({
  docType,
  title,
  content,
  signees,
  canSign = false,
  action,
  otpPhone,
  triggerLabel,
  triggerClassName,
}: {
  docType: string;
  title: string;
  content: string;
  signees?: Signee[];
  canSign?: boolean;
  action?: (formData: FormData) => void;
  /**
   * The signer's registered mobile, for the OTP step. Signing is name +
   * OTP-on-phone: after the typed name matches, a one-time code stands in
   * for "it is really them holding the phone".
   */
  otpPhone?: string;
  triggerLabel?: React.ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [signature, setSignature] = useState("");
  const [zoom, setZoom] = useState(1);
  const [confirming, setConfirming] = useState(false);
  const [otp, setOtp] = useState("");
  useEffect(() => setMounted(true), []);
  const toast = useToast();
  const router = useRouter();

  const signer = signees?.find((s) => s.signs);
  const matches =
    signature.trim().toLowerCase() === (signer?.name ?? "").trim().toLowerCase();
  const otpOk = /^\d{4}$/.test(otp);
  // "+91 98765 43210" → "+91 ••••• 43210"
  const maskedPhone = otpPhone
    ? otpPhone.replace(/\d(?=(?:\D*\d){4})/g, "•")
    : "your registered mobile number";

  const download = () => {
    const body = [
      docType.toUpperCase(),
      title,
      "",
      content,
      "",
      "———————————————— AGREED ————————————————",
      ...(signees ?? []).flatMap((s) => [
        `${s.role}: ${s.name} (${s.email})`,
        `On behalf of: ${s.onBehalfOf}`,
        s.signs
          ? s.signedAt
            ? `Signed as: ${s.signatureName} on ${s.signedAt}`
            : "Signed as: ______________________"
          : "No signature required",
        "",
      ]),
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([body], { type: "text/plain;charset=utf-8" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Document downloaded");
  };

  const ToolButton = ({
    onClick,
    label,
    disabled,
    children,
  }: {
    onClick: () => void;
    label: string;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md text-caption transition-colors hover:bg-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          triggerClassName ??
          (canSign
            ? "btn-primary mt-3 !h-9"
            : "btn-secondary mt-3 !h-8 !text-[12.5px]")
        }
      >
        {triggerLabel ?? (canSign ? "Review & sign" : "Review document")}
      </button>

      {open &&
        mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3 backdrop-blur-[2px] sm:p-5"
            onClick={() => setOpen(false)}
          >
            <div
              className="flex h-[92vh] w-full max-w-[1440px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-[0_32px_64px_-24px_rgba(49,48,43,0.45)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cream text-body">
                  <IconDoc className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold text-ink">
                    {title}
                  </div>
                  <div className="text-[12px] text-caption">{docType}</div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <ToolButton
                    label="Zoom out"
                    onClick={() =>
                      setZoom((z) => Math.max(0.7, +(z - 0.1).toFixed(2)))
                    }
                    disabled={zoom <= 0.7}
                  >
                    <IconZoomOut className="h-4 w-4" />
                  </ToolButton>
                  <span className="w-10 text-center text-[11.5px] tabular-nums text-caption">
                    {Math.round(zoom * 100)}%
                  </span>
                  <ToolButton
                    label="Zoom in"
                    onClick={() =>
                      setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))
                    }
                    disabled={zoom >= 1.6}
                  >
                    <IconZoomIn className="h-4 w-4" />
                  </ToolButton>
                  <span className="mx-1 h-4 w-px bg-line" />
                  <ToolButton label="Download" onClick={download}>
                    <IconDownload className="h-4 w-4" />
                  </ToolButton>
                  <ToolButton label="Close" onClick={() => setOpen(false)}>
                    ✕
                  </ToolButton>
                </div>
              </div>

              <div
                className={cn(
                  "grid min-h-0 flex-1",
                  canSign && "md:grid-cols-[1fr_360px]"
                )}
              >
                <div className="overflow-auto bg-paper p-6 sm:p-8">
                  <DocumentSheet
                    docType={docType}
                    title={title}
                    content={content}
                    signees={signees}
                    typedSignature={canSign ? signature : undefined}
                    zoom={zoom}
                  />
                </div>

                {canSign && signer && (
                  <div className="flex flex-col gap-4 overflow-y-auto border-t border-line p-5 md:border-l md:border-t-0">
                    <div>
                      <h3 className="text-[14px] font-semibold text-ink">
                        Signature details
                      </h3>
                      <p className="mt-0.5 text-[12.5px] text-body">
                        Type your full name exactly as shown to sign.
                      </p>
                    </div>

                    <dl className="rounded-xl border border-line bg-paper p-3.5 text-[12.5px]">
                      <div className="flex justify-between gap-3">
                        <dt className="text-caption">Name</dt>
                        <dd className="font-medium text-ink">{signer.name}</dd>
                      </div>
                      <div className="mt-2 flex justify-between gap-3">
                        <dt className="text-caption">Email</dt>
                        <dd className="min-w-0 truncate font-medium text-ink">
                          {signer.email}
                        </dd>
                      </div>
                    </dl>

                    <form
                      action={async (formData: FormData) => {
                        setConfirming(false);
                        setOpen(false);
                        toast("Document signed");
                        await action?.(formData);
                        router.refresh();
                      }}
                      className="flex flex-col gap-3"
                    >
                      <input type="hidden" name="signature" value={signature} />
                      <div>
                        <label className="mb-1.5 block text-[12.5px] font-medium text-ink">
                          Sign as
                        </label>
                        <input
                          value={signature}
                          onChange={(e) => setSignature(e.target.value)}
                          placeholder={signer.name}
                          className="input !h-10"
                          autoFocus
                        />
                        {signature && !matches && (
                          <p className="mt-1.5 text-[11.5px] text-[#8a6d2f]">
                            Must match your name exactly: {signer.name}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setOtp("");
                          setConfirming(true);
                          toast(`OTP sent to ${maskedPhone}`);
                        }}
                        className="btn-primary !h-10 w-full"
                        disabled={!matches}
                      >
                        <IconSignature className="h-4 w-4" />
                        Sign document
                      </button>

                      {/* Signing is irreversible, so it is never one click:
                          the typed name says who, the OTP says it's really
                          them. The code "arrives" on their registered number —
                          in this prototype any 6 digits verify. */}
                      {confirming && (
                        <div
                          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[2px]"
                          onClick={() => setConfirming(false)}
                        >
                          <div
                            className="w-full max-w-[420px] rounded-2xl border border-line bg-white p-6 shadow-[0_32px_64px_-24px_rgba(49,48,43,0.5)]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                                <IconShield className="h-4 w-4" />
                              </span>
                              <div className="min-w-0">
                                <h4 className="font-display text-[15px] font-semibold tracking-tight text-ink">
                                  Verify it&apos;s you
                                </h4>
                                <p className="mt-1 text-[13px] leading-relaxed text-body">
                                  We&apos;ve sent a 4-digit OTP to{" "}
                                  <b className="whitespace-nowrap text-ink">
                                    {maskedPhone}
                                  </b>
                                  . Enter it to sign{" "}
                                  <b className="text-ink">{title}</b> as{" "}
                                  <b className="text-ink">{signature}</b>.
                                </p>
                              </div>
                            </div>

                            <input
                              value={otp}
                              onChange={(e) =>
                                setOtp(e.target.value.replace(/\D/g, "").slice(0, 4))
                              }
                              inputMode="numeric"
                              autoComplete="one-time-code"
                              placeholder="••••"
                              autoFocus
                              className="input mt-4 text-center !text-[20px] font-semibold tracking-[0.6em]"
                            />
                            <div className="mt-2 flex items-center justify-between text-[12px]">
                              <span className="text-caption">
                                Prototype — any 4-digit code verifies.
                              </span>
                              <button
                                type="button"
                                onClick={() => toast("OTP re-sent")}
                                className="font-medium text-accent hover:underline"
                              >
                                Resend OTP
                              </button>
                            </div>

                            <div className="mt-3 rounded-xl border border-line bg-paper p-3.5 text-[12.5px] leading-relaxed text-body">
                              Your name and the current time are recorded against
                              this document. This cannot be undone.
                            </div>
                            <div className="mt-5 flex gap-2">
                              <button
                                type="button"
                                onClick={() => setConfirming(false)}
                                className="btn-secondary flex-1"
                              >
                                Cancel
                              </button>
                              <button className="btn-primary flex-1" disabled={!otpOk}>
                                Verify &amp; sign
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      <p className="flex items-start gap-1.5 text-[11.5px] leading-snug text-caption">
                        <IconCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Signing records your name and a timestamp against this
                        document.
                      </p>
                    </form>
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
