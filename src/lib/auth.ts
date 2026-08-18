import { getDb, dbReady } from "./db";
import { sessionUid, activityViewRaw, learnerViewRaw } from "./session";
import type { Role } from "./domain";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
}

/**
 * Mock auth, browser edition: the session is a user id in localStorage,
 * chosen on the login page or via the role-switcher FAB. Same function
 * shapes as the old cookie version so no call site changed.
 */
export function getCurrentUser(): User | null {
  if (!dbReady()) return null;
  const uid = sessionUid();
  if (!uid) return null;
  const user = getDb()
    .prepare("SELECT id, name, email, role FROM users WHERE id = ?")
    .get(uid) as User | undefined;
  return user ?? null;
}

/**
 * Thrown instead of redirecting: pages call requireUser/requireRole during
 * render, and the DbProvider's boundary catches this and sends the visitor
 * to the right place. That keeps every page's `const user = requireRole(…)`
 * line exactly as it was.
 */
export class AuthRedirect extends Error {
  constructor(public readonly to: string) {
    super(`redirect:${to}`);
  }
}

export function requireUser(role?: Role): User {
  const user = getCurrentUser();
  if (!user) throw new AuthRedirect("/login");
  if (role && user.role !== role) throw new AuthRedirect("/login");
  return user;
}

/**
 * Prototype-only: which of the two activity presentations to render.
 * "inline" = the timeline sits in the application's right rail (the built
 * design). "drawer" = the rail is gone and the same log fans out from the
 * right edge behind a button. Toggled from the role-switcher FAB.
 */
export function activityInline(): boolean {
  return activityViewRaw() !== "drawer";
}

/**
 * Prototype-only: which learner experience to show, toggled from the FAB so
 * the two can be compared live in front of an audience.
 */
export function learnerView(): "v1" | "v2" {
  return learnerViewRaw() === "v2" ? "v2" : "v1";
}
