"use client";

import Link from "next/link";
import { StateArt, type StateKind } from "./state-art";
import { errorStateVariant } from "@/lib/auth";

/**
 * The screens nobody is supposed to see.
 *
 * A 404, a locked door, a crash, a dead connection and a database that would
 * not open are the same problem wearing five hats: the person is somewhere
 * they cannot use, and the only thing that matters is that they understand
 * why and can get out. So they share one component, one voice, and one way
 * back — and never a dead end.
 *
 * Two readings, switched from the demo FAB:
 *
 * v1 "Illustrated" — a drawing, a headline, a line of explanation, one way
 *    out. Centred and calm.
 * v2 "Typographic" — the Qatalog treatment: oversized display type carrying
 *    the apology, everything else set quietly beneath it, left-aligned. It
 *    also needs NO artwork, which is why it is the fallback the crash and
 *    database screens fall back to when even the illustration may not load.
 */

export interface StateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  primary?: boolean;
}

export interface StateContact {
  name: string;
  email?: string | null;
  role?: string;
}

export interface StateScreenProps {
  kind: StateKind;
  /** The v1 headline. Short. */
  title: string;
  /** The v2 headline — the big type. Kept separate because "Sorry about
   *  that." carries a whole page on its own, where a v1 headline should
   *  name the thing that happened. */
  bigTitle?: string;
  body: React.ReactNode;
  actions?: StateAction[];
  /** Who to ask, when being stuck is somebody else's to unlock. */
  contacts?: StateContact[];
  /** Forces a reading regardless of the FAB — the crash and database screens
   *  cannot rely on the session being readable. */
  forceVariant?: "v1" | "v2";
  /** Fills the viewport (a route-level state) vs sitting inside a page. */
  full?: boolean;
}

function Actions({ actions }: { actions: StateAction[] }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-2.5">
      {actions.map((a) => {
        const cls = a.primary ? "btn-primary" : "btn-secondary";
        if (a.href) {
          return (
            <Link key={a.label} href={a.href} className={cls}>
              {a.label}
            </Link>
          );
        }
        return (
          <button key={a.label} type="button" onClick={a.onClick} className={cls}>
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

function Contacts({ contacts }: { contacts: StateContact[] }) {
  return (
    <ul className="mt-4 space-y-1">
      {contacts.map((c) => (
        <li key={c.name} className="text-[13.5px] text-body">
          {c.email ? (
            <a
              className="underline decoration-line underline-offset-[3px] hover:text-ink"
              href={`mailto:${c.email}`}
            >
              {c.name}
            </a>
          ) : (
            <span>{c.name}</span>
          )}
          {c.role && <span className="text-caption"> · {c.role}</span>}
        </li>
      ))}
    </ul>
  );
}

export function StateScreen({
  kind,
  title,
  bigTitle,
  body,
  actions = [],
  contacts = [],
  forceVariant,
  full = true,
}: StateScreenProps) {
  const variant = forceVariant ?? errorStateVariant();
  const shell = full
    ? "flex min-h-[calc(100dvh-8rem)] w-full items-center px-6 py-16"
    : "w-full px-2 py-10";

  if (variant === "v2") {
    return (
      <div className={shell}>
        <div className="mx-auto w-full max-w-3xl">
          <h1 className="font-display text-[clamp(2.75rem,9vw,5.5rem)] font-bold leading-[0.95] tracking-[-0.03em] text-accent">
            {bigTitle ?? title}
          </h1>
          <div className="mt-7 max-w-[52ch] text-[14.5px] leading-relaxed text-body">
            {body}
          </div>
          {contacts.length > 0 && <Contacts contacts={contacts} />}
          {actions.length > 0 && <Actions actions={actions} />}
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <StateArt kind={kind} />
        <h1 className="mt-6 font-display text-[22px] font-semibold tracking-tight text-ink">
          {title}
        </h1>
        <div className="mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-body">
          {body}
        </div>
        {contacts.length > 0 && (
          <div className="w-full">
            <Contacts contacts={contacts} />
          </div>
        )}
        {actions.length > 0 && <Actions actions={actions} />}
      </div>
    </div>
  );
}
