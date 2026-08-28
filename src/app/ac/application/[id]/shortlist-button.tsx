"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";

/**
 * The counsellor's footer walk: Profile → Eligibility → send.
 *
 * The pick is read off the radios at click time, never off the URL — the
 * radios only offer what Ops ruled eligible, so a stale ?sel can no longer
 * smuggle in a programme they never did. The URL still CARRIES the pick
 * between tabs (?sel=), but only to re-tick the radio it came from.
 */
export function AcFlowBar({
  appId,
  tabs,
  tab,
  selected,
  hasPrograms,
  action,
}: {
  appId: number;
  /** The visible tab keys, in the order they are walked. */
  tabs: readonly string[];
  tab: string;
  /** The pick carried in the URL — seeds the radio, never the submit. */
  selected: number | null;
  hasPrograms: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const index = tabs.indexOf(tab);
  const prev = tabs[index - 1];
  const next = tabs[index + 1];

  /** The radio the counsellor has ticked, read live from the form. */
  const pickedNow = () => {
    const form = document.getElementById("shortlist-form") as
      | HTMLFormElement
      | null;
    return Number(form ? new FormData(form).get("programId") : 0) || null;
  };

  const go = (to: string) => {
    const q = new URLSearchParams({ tab: to });
    // Carry the live pick if the radios are on screen, else what the URL
    // already held — stepping back and forward must not clear the tick.
    const carry = pickedNow() ?? selected;
    if (carry) q.set("sel", String(carry));
    router.push(`/ac/application/${appId}?${q}`, { scroll: false });
  };

  const back = prev ? (
    <button type="button" className="btn-secondary" onClick={() => go(prev)}>
      Back
    </button>
  ) : null;

  if (next) {
    return (
      <>
        {back}
        <button type="button" className="btn-primary" onClick={() => go(next)}>
          Next
        </button>
      </>
    );
  }

  return (
    <>
      {back}
      <button
        type="button"
        disabled={!hasPrograms || busy}
        title={hasPrograms ? "" : "No eligible programme to send"}
        className="btn-primary"
        onClick={async () => {
          const picked = pickedNow();
          if (!picked) {
            toast("Pick a programme to send", "info");
            return;
          }
          setBusy(true);
          const data = new FormData();
          data.set("programId", String(picked));
          await action(data);
          router.refresh();
        }}
      >
        Send Shortlist to Learner
      </button>
    </>
  );
}
