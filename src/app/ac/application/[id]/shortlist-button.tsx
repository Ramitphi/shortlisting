"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";

/**
 * The one commit on the counsellor's page: send the shortlist.
 *
 * The pick is read off the radios at click time. It used to be carried in
 * the URL (?sel=) by a tab walk that no longer exists — reading the form at
 * the moment of the click has no dependency on navigation, and a stale URL
 * can no longer smuggle in a programme the radios never offered.
 */
export function AcFlowBar({
  hasPrograms,
  action,
}: {
  hasPrograms: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  /** The radio the counsellor has ticked, read live from the form. */
  const pickedNow = () => {
    const form = document.getElementById("shortlist-form") as
      | HTMLFormElement
      | null;
    return Number(form ? new FormData(form).get("programId") : 0) || null;
  };

  return (
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
  );
}
