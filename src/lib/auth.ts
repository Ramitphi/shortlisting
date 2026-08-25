import { getDb, dbReady } from "./db";
import {
  sessionUid,
  activityViewRaw,
  learnerViewRaw,
  staffViewRaw,
} from "./session";
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
 * v1 is the learner experience — the decision has been made. The v2 build
 * (the one on the site's My Applications capture code) stays in the repo as
 * reference, but nothing surfaces it: this flag pins `learnerView()` to v1,
 * hides the FAB switch, and bounces the /learner/applications routes home.
 * Flip it to true to bring v2 back for a comparison.
 */
/**
 * Prototype-only: which structure the AC/Ops application journeys render in.
 * "classic" is the built design; "deel" is the reference restructure — no
 * Profile/Eligibility tabs, one working column with the rail carrying what's
 * missing and a capped timeline. Toggled from the role-switcher FAB so the
 * two can be compared live.
 */
export function staffView(): "classic" | "deel" {
  return staffViewRaw() === "deel" ? "deel" : "classic";
}

export const LEARNER_V2_ENABLED = false;

export function learnerView(): "v1" | "v2" {
  if (!LEARNER_V2_ENABLED) return "v1";
  return learnerViewRaw() === "v2" ? "v2" : "v1";
}
