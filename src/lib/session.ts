/**
 * The session, in the browser.
 *
 * The cookie-based mock auth becomes localStorage: a user id, plus the two
 * prototype presentation toggles. Reads are synchronous so the existing
 * `getCurrentUser()` / `activityInline()` / `learnerView()` call sites keep
 * their shapes; writes go through `dirty()` so every open page re-renders.
 *
 * Everything is guarded for the server pass — client components still render
 * once on the server for the initial HTML, where localStorage doesn't exist.
 * The DbProvider gates real content behind client init, so those SSR passes
 * only ever see the loading shell.
 */

import { dirty } from "./browser-db";

const UID_KEY = "shortlisting_uid";
const ACTIVITY_KEY = "shortlisting_activity_view";
const LEARNER_VIEW_KEY = "shortlisting_learner_view";

function read(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* private mode — session lasts the tab, which is fine for a demo */
  }
  dirty();
}

export function sessionUid(): number | null {
  const v = read(UID_KEY);
  return v ? Number(v) : null;
}

export function setSessionUid(uid: number | null): void {
  write(UID_KEY, uid === null ? null : String(uid));
}

export function activityViewRaw(): string | null {
  return read(ACTIVITY_KEY);
}

export function setActivityView(v: "inline" | "drawer"): void {
  write(ACTIVITY_KEY, v);
}

const STAFF_VIEW_KEY = "shortlisting_staff_view";

export function staffViewRaw(): string | null {
  return read(STAFF_VIEW_KEY);
}

export function setStaffView(v: "classic" | "deel"): void {
  write(STAFF_VIEW_KEY, v);
}

export function learnerViewRaw(): string | null {
  return read(LEARNER_VIEW_KEY);
}

export function setLearnerView(v: "v1" | "v2"): void {
  write(LEARNER_VIEW_KEY, v);
}
