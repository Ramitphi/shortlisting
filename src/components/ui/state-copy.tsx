import type { StateKind } from "./state-art";
import type { StateContact } from "./state-screen";

/**
 * What each state says, in one place, so the real screen and its FAB
 * preview can never drift apart. The big title is the v2 line that carries
 * the page on its own; the title is the v1 headline that names the thing.
 */
export interface StateCopy {
  title: string;
  bigTitle: string;
  body: React.ReactNode;
}

export const STATE_COPY: Record<StateKind, StateCopy> = {
  "not-found": {
    title: "That page isn't here",
    bigTitle: "Nothing here.",
    body: (
      <>
        The link may be out of date, or the address has a typo in it. Nothing
        has been lost. The application you were after is still where it was.
      </>
    ),
  },
  "no-access": {
    title: "This one isn't yours to open",
    bigTitle: "Not yours to open.",
    body: (
      <>
        This application exists, but it sits with someone else right now. If
        you think you should be able to see it, ask them:
      </>
    ),
  },
  crashed: {
    title: "Something went wrong on this page",
    bigTitle: "Sorry about that.",
    body: (
      <>
        This screen hit an error it couldn&apos;t recover from. Your data is
        safe and nothing you did was lost. Try the page again, or head back
        and come at it fresh.
      </>
    ),
  },
  offline: {
    title: "You're offline",
    bigTitle: "No connection.",
    body: (
      <>
        Everything you&apos;ve done is saved on this device, so nothing is
        lost. The page you asked for needs a connection to load. Try again
        once you&apos;re back on.
      </>
    ),
  },
  "db-failed": {
    title: "The demo couldn't start",
    bigTitle: "Couldn't start.",
    body: (
      <>
        The browser database that holds the demo didn&apos;t open. A reload
        usually clears it. If it keeps happening, start fresh. That wipes
        this browser&apos;s copy of the demo and seeds it again.
      </>
    ),
  },
};

/** The counsellor to ask, for a no-access screen about a real application. */
export function counsellorContact(app: {
  ac_name?: string | null;
  ac_email?: string | null;
}): StateContact[] {
  if (!app.ac_name) return [];
  return [{ name: app.ac_name, email: app.ac_email, role: "Counsellor" }];
}
