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

export function DbProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [version, setVersion] = useState(0);
  const started = useRef(false);
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
      setReady(true);
    })().catch((e) => {
      // eslint-disable-next-line no-console
      console.error("Failed to initialise the browser database", e);
    });
  }, []);

  useEffect(() => onDbChange(() => setVersion((v) => v + 1)), []);

  if (!ready) return <LoadingShell />;

  // No key on the boundary: a keyed remount would wipe client state (the
  // wizard's current step, open dialogs) on every write. Pages re-render via
  // the version context; the boundary resets itself after a redirect.
  return (
    <VersionContext.Provider value={version}>
      <AuthBoundary>{children}</AuthBoundary>
    </VersionContext.Provider>
  );
}
