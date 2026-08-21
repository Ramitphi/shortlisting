"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { IconCheck, IconSparkle } from "./icons";

type ToastTone = "success" | "info";

interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
}

const ToastContext = createContext<(text: string, tone?: ToastTone) => void>(
  () => {}
);

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const push = useCallback((text: string, tone: ToastTone = "success") => {
    const id = nextId++;
    setToasts((t) => [...t, { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      {mounted &&
        createPortal(
          <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="toast-in pointer-events-auto flex items-center gap-2.5 rounded-full border border-line bg-white py-2.5 pl-3 pr-4 shadow-[0_16px_40px_-12px_rgba(49,48,43,0.35)]"
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    t.tone === "success"
                      ? "bg-[#e8f2e9] text-[#3f6c45]"
                      : "bg-accent/10 text-accent"
                  }`}
                >
                  {t.tone === "success" ? (
                    <IconCheck className="h-3.5 w-3.5" />
                  ) : (
                    <IconSparkle className="h-3.5 w-3.5" />
                  )}
                </span>
                <span className="text-[13px] font-medium text-ink">{t.text}</span>
              </div>
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

/**
 * Server actions that redirect can't call useToast, so they append ?toast=<key>.
 * This picks that up once, shows it, then strips the param from the URL.
 */
const MESSAGES: Record<string, string> = {
  submitted: "Eligibility form submitted — Ops notified",
  shortlisted: "Shortlist sent to the learner",
  reviewed: "Marked as reviewed — the counsellor has been notified",
  certified: "Details certified — Ops can now release your offer letter",
  returned: "Details changed — sent back to Ops for another look",
  reset: "Demo data reset — every learner is back to their starting state",
  offer: "Offer letter sent to the learner",
  vetting: "Vetting started",
  signed: "Document signed",
};

export function ToastFromParams() {
  const push = useToast();
  // Read through useSearchParams, not window.location: these redirects are
  // client-side navigations, so the layout never remounts and an effect that
  // only reads the URL once would never fire again.
  const key = useSearchParams().get("toast");

  useEffect(() => {
    if (!key) return;
    const message = MESSAGES[key];
    if (message) push(message);
    const url = new URL(window.location.href);
    url.searchParams.delete("toast");
    window.history.replaceState({}, "", url.toString());
  }, [key, push]);

  return null;
}
