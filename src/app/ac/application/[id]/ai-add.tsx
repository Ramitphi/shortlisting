"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui";

/**
 * Add / remove controls for the wizard's Programmes step. They live INSIDE
 * the call wizard's one big <form>, so they cannot be forms themselves — a
 * nested form is invalid HTML and makes React discard the server render on
 * hydration. Same rule, same pattern as DocumentTable: call the server
 * action directly.
 */
export function AiAdd({
  action,
  catalogueId,
}: {
  action: (formData: FormData) => void | Promise<void>;
  catalogueId: number;
}) {
  const [busy, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() =>
        start(async () => {
          const fd = new FormData();
          fd.set("catalogueId", String(catalogueId));
          toast("Programme recommended");
          await action(fd);
          router.refresh();
        })
      }
      className="btn-secondary !h-8 !px-3 !text-[12.5px]"
    >
      Add
    </button>
  );
}

export function PickRemove({
  action,
}: {
  action: () => void | Promise<void>;
}) {
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() =>
        start(async () => {
          await action();
          router.refresh();
        })
      }
      className="shrink-0 rounded-lg px-2 py-1 text-[12px] text-caption transition-colors hover:bg-accent/10 hover:text-accent"
    >
      Remove
    </button>
  );
}
