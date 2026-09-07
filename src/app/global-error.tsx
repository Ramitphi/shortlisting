"use client";

import "./globals.css";
import { StateScreen } from "@/components/ui/state-screen";

/**
 * The last line. This replaces the root layout itself, so it has to bring
 * its own <html> and <body> — and cannot assume the database, the session,
 * or even localStorage. That is why it forces the typographic reading: big
 * type needs nothing but a stylesheet.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <StateScreen
          kind="crashed"
          forceVariant="v2"
          title="The app hit a problem"
          bigTitle="Sorry about that."
          body={
            <>
              Something broke before the page could load. Reloading usually
              clears it. If it keeps happening, tell the team what you were
              doing when it did — that is the fastest way to a fix.
              {error?.digest && (
                <span className="mt-3 block font-mono text-[12px] text-caption">
                  ref {error.digest}
                </span>
              )}
            </>
          }
          actions={[
            { label: "Reload", onClick: reset, primary: true },
            { label: "Go to the start", href: "/" },
          ]}
        />
      </body>
    </html>
  );
}
