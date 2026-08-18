/**
 * The database, in the browser.
 *
 * The whole prototype was written against better-sqlite3's synchronous API —
 * fifty-odd prepared statements across queries.ts, actions.ts and the seed.
 * Rather than rewrite them as JavaScript maps, the same SQLite runs as WASM
 * (sql.js) inside the browser, behind this thin adapter that mimics the
 * better-sqlite3 surface the code actually uses: prepare().run/get/all,
 * exec, pragma, transaction.
 *
 * Persistence is the browser's own: every write schedules a debounced export
 * of the database image into IndexedDB, so state survives reloads per
 * browser, and "Reset demo data" reseeds it. There is no server state at
 * all — which is the point: the app deploys anywhere Next.js static/edge
 * hosting runs (Vercel), with no database dependency.
 */

// sql.js's Database instance — typed loosely on purpose; we only touch a
// small, stable slice of its API.
type RawDb = {
  run(sql: string, params?: unknown[]): void;
  exec(sql: string): { columns: string[]; values: unknown[][] }[];
  prepare(sql: string): {
    bind(params?: unknown[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    free(): boolean;
  };
  export(): Uint8Array;
};

export interface RunResult {
  lastInsertRowid: number;
  changes: number;
}

export interface Statement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(...args: any[]): RunResult;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(...args: any[]): any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  all(...args: any[]): any[];
}

export interface BrowserDb {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pragma(directive: string): any;
  transaction<T extends (...args: never[]) => unknown>(fn: T): T;
}

// ── Change bus ───────────────────────────────────────────────────────────────
// Server-rendered pages used revalidatePath; client pages subscribe to this
// version instead. Any write bumps it; the provider re-renders everything
// that reads data.

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

export function dbVersion(): number {
  return version;
}

export function onDbChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Call after any write — the client-side revalidatePath. */
export function dirty(): void {
  version++;
  schedulePersist();
  if (tearingDown) return;
  for (const fn of Array.from(listeners)) fn();
}

/**
 * Reset and logout clear the session while a protected page is mounted; if
 * that page re-renders before the navigation lands it throws AuthRedirect
 * into a teardown race. So those two suppress re-render notifications, flush
 * the database image, and leave with a full page load — the next document
 * starts clean on /login.
 */
let tearingDown = false;

export async function hardGoto(path: string): Promise<void> {
  tearingDown = true;
  await flushPersist();
  if (typeof window !== "undefined") window.location.assign(path);
}

// ── Navigation hook ─────────────────────────────────────────────────────────
// Actions used to call next/navigation's redirect(); client-side they ask the
// router the provider registered. Falls back to a hard navigation so an
// action fired outside the provider (shouldn't happen) still lands somewhere.

let navigate: ((path: string) => void) | null = null;

export function setNavigator(fn: (path: string) => void): void {
  navigate = fn;
}

export function goto(path: string): void {
  flushPersist();
  if (navigate) navigate(path);
  else if (typeof window !== "undefined") window.location.assign(path);
}

// ── Persistence (IndexedDB) ─────────────────────────────────────────────────

const IDB_NAME = "shortlisting";
const IDB_STORE = "db";
const IDB_KEY = "main";

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadSnapshot(): Promise<Uint8Array | null> {
  try {
    const database = await idb();
    return await new Promise((resolve) => {
      const tx = database.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
      req.onsuccess = () => resolve((req.result as Uint8Array) ?? null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function saveSnapshot(bytes: Uint8Array): Promise<void> {
  try {
    const database = await idb();
    await new Promise<void>((resolve) => {
      const tx = database.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(bytes, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Private-mode browsers may refuse IndexedDB; the demo still runs, it
    // just starts fresh on each load.
  }
}

let raw: RawDb | null = null;
let persistTimer: ReturnType<typeof setTimeout> | undefined;

function schedulePersist(): void {
  if (!raw) return;
  clearTimeout(persistTimer);
  persistTimer = setTimeout(flushPersist, 400);
}

export function flushPersist(): Promise<void> {
  clearTimeout(persistTimer);
  if (!raw) return Promise.resolve();
  return saveSnapshot(raw.export());
}

// ── The adapter ─────────────────────────────────────────────────────────────

const WRITE_RE = /^\s*(INSERT|UPDATE|DELETE|REPLACE|CREATE|ALTER|DROP)\b/i;

function cleanArgs(args: unknown[]): unknown[] {
  // better-sqlite3 style: variadic scalars. Normalise undefined → null.
  return args.map((a) => (a === undefined ? null : a));
}

class Stmt implements Statement {
  constructor(
    private readonly db: RawDb,
    private readonly sql: string
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  run(...args: any[]): RunResult {
    this.db.run(this.sql, cleanArgs(args));
    const info = this.db.exec(
      "SELECT last_insert_rowid() AS id, changes() AS ch"
    );
    const [id, ch] = info[0]?.values[0] ?? [0, 0];
    dirty();
    return { lastInsertRowid: Number(id), changes: Number(ch) };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get(...args: any[]): any {
    const st = this.db.prepare(this.sql);
    try {
      st.bind(cleanArgs(args));
      return st.step() ? st.getAsObject() : undefined;
    } finally {
      st.free();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  all(...args: any[]): any[] {
    const st = this.db.prepare(this.sql);
    const rows: Record<string, unknown>[] = [];
    try {
      st.bind(cleanArgs(args));
      while (st.step()) rows.push(st.getAsObject());
    } finally {
      st.free();
    }
    return rows;
  }
}

class Adapter implements BrowserDb {
  constructor(private readonly db: RawDb) {}

  prepare(sql: string): Statement {
    return new Stmt(this.db, sql);
  }

  exec(sql: string): void {
    this.db.exec(sql);
    if (WRITE_RE.test(sql)) dirty();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pragma(directive: string): any {
    // WAL and checkpoints have no meaning in a WASM in-memory database.
    if (/journal_mode|wal_checkpoint/i.test(directive)) return [];
    const res = this.db.exec(`PRAGMA ${directive}`);
    if (!res[0]) return [];
    const { columns, values } = res[0];
    return values.map((v) =>
      Object.fromEntries(columns.map((c, i) => [c, v[i]]))
    );
  }

  transaction<T extends (...args: never[]) => unknown>(fn: T): T {
    const db = this.db;
    const wrapped = (...args: never[]) => {
      db.exec("BEGIN");
      try {
        const out = fn(...args);
        db.exec("COMMIT");
        dirty();
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    };
    return wrapped as T;
  }
}

/** Wrap a freshly opened sql.js database. The provider owns the lifecycle. */
export function wrapDatabase(database: unknown): BrowserDb {
  raw = database as RawDb;
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", flushPersist);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushPersist();
    });
  }
  return new Adapter(raw as RawDb);
}

/** Drop the persisted image (Reset demo data starts truly clean). */
export async function clearSnapshot(): Promise<void> {
  try {
    const database = await idb();
    await new Promise<void>((resolve) => {
      const tx = database.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    /* fine */
  }
}
