"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";

/**
 * The counsellor walks the tabs in order and only sends at the end.
 *
 * The pick is read off the radios at click time. It used to be carried in the
 * URL (?sel=) by the step that left the old Programmes tab — when that tab was
 * folded into Eligibility, nothing wrote ?sel any more and the send button
 * could never enable. Reading the form at the moment of the click has no such
 * dependency on which tabs happen to exist.
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
  /** The single programme id carried through from the Programmes tab. */
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

  const go = (to: string, sel?: number | null) => {
    const q = new URLSearchParams({ tab: to });
    const carry = sel === undefined ? selected : sel;
    if (carry) q.set("sel", String(carry));
    router.push(`/ac/application/${appId}?${q}`, { scroll: false });
  };

  /** The radio the counsellor has ticked, read live rather than from the URL. */
  const pickedNow = () => {
    const form = document.getElementById("shortlist-form") as
      | HTMLFormElement
      | null;
    return Number(form ? new FormData(form).get("programId") : 0) || selected;
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
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            // Leaving the programmes tab is the only moment the radios exist —
            // read the choice now, because after the navigation they're gone.
            // Carry the pick if one has been made; picking happens on the
            // last tab now, so mid-walk there is usually nothing to carry.
            go(next, pickedNow());
          }}
        >
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
