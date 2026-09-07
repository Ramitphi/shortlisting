"use client";

import Link from "next/link";
import { useDbVersion } from "@/components/db-provider";
import { StateScreen, type StateContact } from "@/components/ui/state-screen";
import { STATE_COPY, counsellorContact } from "@/components/ui/state-copy";
import type { StateKind } from "@/components/ui/state-art";
import { getCurrentUser, errorStateVariant } from "@/lib/auth";
import { getApplication } from "@/lib/queries";
import { ERROR_STATE_VARIANT_META, STATE_PREVIEWS, roleHome } from "@/lib/domain";
import { setErrorStateVariantAction } from "@/lib/actions";

const KINDS = STATE_PREVIEWS.map((s) => s.kind) as readonly StateKind[];

/**
 * Two jobs, one route.
 *
 * With `app=`, it is the real no-access screen: the boards redirect here
 * when an application exists but is not the viewer's to open, and it names
 * who to ask. Without it, it is the FAB's previewer — every state on demand,
 * with the reading switch right there, so nobody has to break the app to
 * look at how it fails.
 */
export default function StatesPage({
  searchParams,
}: {
  searchParams: { kind?: string; app?: string; why?: string };
}) {
  useDbVersion();
  const kind: StateKind = (KINDS as readonly string[]).includes(searchParams.kind ?? "")
    ? (searchParams.kind as StateKind)
    : "not-found";
  const user = getCurrentUser();
  const home = user ? roleHome(user.role) : "/login";
  const app = searchParams.app ? getApplication(Number(searchParams.app)) : null;
  const real = kind === "no-access" && Boolean(app);

  const copy = STATE_COPY[kind];
  let body = copy.body;
  let contacts: StateContact[] = [];
  if (kind === "no-access") {
    if (app) {
      contacts = counsellorContact(app);
      body =
        searchParams.why === "draft" ? (
          <>
            {app.learner_name}&apos;s application is still being filled on
            the counsellor&apos;s call. It reaches your queue the moment they
            submit it — until then, it is theirs:
          </>
        ) : (
          <>
            {app.learner_name}&apos;s application is assigned to another
            counsellor. If you think it should be yours, ask them:
          </>
        );
    } else {
      contacts = [{ name: "Arjun Mehta", email: "arjun.ac@example.com", role: "Counsellor" }];
    }
  }

  const actions =
    kind === "crashed" || kind === "offline" || kind === "db-failed"
      ? [
          { label: "Try again", href: `/states?kind=${kind}`, primary: true },
          { label: user ? "Back to my desk" : "Sign in", href: home },
        ]
      : [{ label: user ? "Back to my desk" : "Sign in", href: home, primary: true }];

  return (
    <div className="min-h-dvh bg-paper">
      <StateScreen
        kind={kind}
        title={copy.title}
        bigTitle={copy.bigTitle}
        body={body}
        contacts={contacts}
        actions={actions}
      />

      {!real && (
        <div className="mx-auto mb-10 w-full max-w-3xl px-6">
          <div className="rounded-xl border border-line bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.07em] text-caption">
                Preview
              </span>
              {STATE_PREVIEWS.map((s) => (
                <Link
                  key={s.kind}
                  href={`/states?kind=${s.kind}`}
                  className={`rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    s.kind === kind
                      ? "border-ink bg-ink text-paper"
                      : "border-line bg-white text-body hover:bg-muted"
                  }`}
                >
                  {s.name}
                </Link>
              ))}
              <span className="mx-1 h-4 w-px bg-line" />
              {ERROR_STATE_VARIANT_META.map((m) => {
                const active = errorStateVariant() === m.id;
                return (
                  <form key={m.id} action={setErrorStateVariantAction.bind(null, m.id)}>
                    <button
                      className={`rounded-md border px-2.5 py-1 text-[12px] font-medium transition-colors ${
                        active
                          ? "border-[#d5e6d8] bg-[#e8f2e9] text-[#3f6c45]"
                          : "border-line bg-white text-body hover:bg-muted"
                      }`}
                    >
                      {m.name}
                    </button>
                  </form>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
