"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";

/**
 * The counsellor walks the tabs in order and only sends at the end, so the
 * programme selection has to survive every tab change in between.
 *
 * Tabs are server navigations, so the choice is carried in the URL (?sel=1,2)
 * rather than held in state that a navigation would discard. The final send
 * reads it back from there.
 *
 * The order comes in as a prop rather than being hardcoded here: this bar has
 * already been broken once by a tab being inserted into the middle of a walk
 * it thought it knew.
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
            if (tab !== "programs") return go(next);
            const form = document.getElementById("shortlist-form") as
              | HTMLFormElement
              | null;
            const picked = Number(
              form ? new FormData(form).get("programId") : 0
            );
            if (!picked) {
              toast("Pick a programme to send", "info");
              return;
            }
            go(next, picked);
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
        disabled={!hasPrograms || !selected || busy}
        title={!selected ? "Go back and pick a programme" : ""}
        className="btn-primary"
        onClick={async () => {
          setBusy(true);
          const data = new FormData();
          data.set("programId", String(selected));
          await action(data);
          router.refresh();
        }}
      >
        Send Shortlist to Learner
      </button>
    </>
  );
}
