"use client";

import {
  Component,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  loadSnapshot,
  onDbChange,
  setNavigator,
  wrapDatabase,
} from "@/lib/browser-db";
import { initSchema, setDb } from "@/lib/db";
import { AuthRedirect } from "@/lib/auth";
import { clearSnapshot } from "@/lib/browser-db";
import { OfflineNotice } from "./offline-notice";
import { StateScreen } from "./ui/state-screen";
import { STATE_COPY } from "./ui/state-copy";

/**
 * Owns the browser database: loads the sql.js WASM engine, restores the
 * persisted image from IndexedDB (or creates and seeds a fresh one), and only
 * then renders the app. Every page below this is a client component that
 * queries SQLite synchronously during render — exactly like the
 * better-sqlite3 server components did — and re-renders when `dirty()` bumps
 * the change version.
 *
 * The server-side pass of all these client components renders the loading
 * shell only, so no page ever touches localStorage or the database during
 * SSR.
 */

const VersionContext = createContext(0);

/** Subscribe a component to database/session changes. */
export function useDbVersion(): number {
  return useContext(VersionContext);
}

function LoadingShell() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-paper">
      <div className="flex items-center gap-3 text-[14px] text-body">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-line-strong border-t-ink" />
        Loading the demo…
      </div>
    </div>
  );
}

/** Catches requireUser/requireRole throws and routes instead of crashing. */
class AuthBoundary extends Component<
  { children: ReactNode },
  { to: string | null }
> {
  state = { to: null as string | null };

  static getDerivedStateFromError(err: unknown) {
    if (err instanceof AuthRedirect) return { to: err.to };
    throw err;
  }

  render() {
    if (this.state.to) {
      return (
        <Redirector
          to={this.state.to}
          done={() => this.setState({ to: null })}
        />
      );
    }
    return this.props.children;
  }
}

function Redirector({ to, done }: { to: string; done: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const target = to.split("?")[0];
  useEffect(() => {
    router.replace(to);
  }, [router, to]);
  // Reset the boundary ONLY once the route has actually changed — resetting
  // on a timer made the still-mounted page throw again immediately, and the
  // catch–reset–throw loop ended in Next's root error screen.
  useEffect(() => {
    if (pathname === target) done();
  }, [pathname, target, done]);
  return <LoadingShell />;
}

/**
 * The database would not open, or took so long that "still loading" stopped
 * being believable. Rendered ABOVE the ready gate, so the person is never
 * left with a spinner and no door. Forces nothing about the reading: the
 * variant getter is guarded, so a broken localStorage falls to typographic.
 */
function DbFailed({ error }: { error: Error }) {
  const c = STATE_COPY["db-failed"];
  return (
    <div className="min-h-dvh bg-paper">
      <StateScreen
        kind="db-failed"
        title={c.title}
        bigTitle={c.bigTitle}
        body={
          <>
            {c.body}
            {error.message && (
              <span className="mt-3 block font-mono text-[12px] text-caption">
                {error.message.slice(0, 160)}
              </span>
            )}
          </>
        }
        actions={[
          { label: "Try again", onClick: () => window.location.reload(), primary: true },
          {
            label: "Start fresh",
            onClick: () => {
              clearSnapshot().finally(() => window.location.reload());
            },
          },
        ]}
      />
    </div>
  );
}

export function DbProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);
  const started = useRef(false);
  const settled = useRef(false);
  const router = useRouter();

  useEffect(() => {
    setNavigator((path) => router.push(path));
  }, [router]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      // sql.js ships a UMD loader; importing it dynamically keeps the WASM
      // engine out of the first paint.
      const initSqlJs = (await import("sql.js")).default;
      const SQL = await initSqlJs({ locateFile: () => "/sql-wasm.wasm" });
      const snapshot = await loadSnapshot();
      const raw = snapshot
        ? new SQL.Database(snapshot)
        : new SQL.Database();
      const db = wrapDatabase(raw);
      setDb(db);
      initSchema(db);
      if (!snapshot) {
        // First visit in this browser: install the full demo dataset, one
        // learner per state — same code as the Reset button.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { seedDemo } = require("@/lib/demo-seed.js");
        seedDemo(db);
      }
      settled.current = true;
      setReady(true);
    })().catch((e) => {
      settled.current = true;
      // eslint-disable-next-line no-console
      console.error("Failed to initialise the browser database", e);
      setFailure(e instanceof Error ? e : new Error(String(e)));
    });
    // A hang is not a rejection: an IndexedDB open that never fires, a WASM
    // fetch that stalls. Past this, "loading" is no longer the truth.
    const timer = window.setTimeout(() => {
      if (!settled.current) {
        settled.current = true;
        setFailure(new Error("Timed out waiting for the browser database to open."));
      }
    }, 20000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => onDbChange(() => setVersion((v) => v + 1)), []);

  if (failure) return <DbFailed error={failure} />;
  if (!ready) return <LoadingShell />;

  // No key on the boundary: a keyed remount would wipe client state (the
  // wizard's current step, open dialogs) on every write. Pages re-render via
  // the version context; the boundary resets itself after a redirect.
  return (
    <VersionContext.Provider value={version}>
      <OfflineNotice />
      <AuthBoundary>{children}</AuthBoundary>
    </VersionContext.Provider>
  );
}
