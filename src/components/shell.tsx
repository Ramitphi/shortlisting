"use client";

import Link from "next/link";
import {
  activityInline,
  getCurrentUser,
  learnerView,
  AuthRedirect,
  type User,
} from "@/lib/auth";
import { ROLE_LABELS, roleHome, type AppStatus, type Role } from "@/lib/domain";
import {
  getNotifications,
  getUnreadCount,
  recentViews,
} from "@/lib/queries";
import { logout, markAllRead } from "@/lib/actions";
import { RoleSwitcher } from "./role-switcher";
import {
  CloudHero,
  IconBell,
  IconClock,
  IconHome,
  IconLayers,
  IconLogout,
  IconRoute,
  IconUsers,
  Wordmark,
} from "@/components/ui";

// Guards the route: redirects to /login when not authenticated and to the
// user's own home when they open another role's area.
export type NavKey =
  | "home"
  | "users"
  | "updates"
  | "application"
  | "profile"
  | "none";

export function requireRole(role: Role): User {
  const user = getCurrentUser();
  // Thrown, not redirected: the DbProvider's boundary catches these and
  // routes — pages keep their `const user = requireRole(…)` line unchanged.
  if (!user) throw new AuthRedirect("/login");
  if (user.role !== role) throw new AuthRedirect(roleHome(user.role));
  return user;
}

interface NavItem {
  key: NavKey;
  href: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  ac: [
    { key: "home", href: "/ac", label: "Home", icon: <IconHome /> },
    { key: "users", href: "/ac/users", label: "User Hub", icon: <IconUsers /> },
  ],
  ops: [
    { key: "home", href: "/ops", label: "Pipeline", icon: <IconLayers /> },
    { key: "users", href: "/ops/users", label: "User Hub", icon: <IconUsers /> },
  ],
  learner: [
    { key: "home", href: "/learner", label: "Home", icon: <IconHome /> },
    {
      key: "application",
      href: "/learner/application",
      label: "My Application",
      icon: <IconRoute />,
    },
  ],
  admin: [
    { key: "home", href: "/admin", label: "Users & Roles", icon: <IconUsers /> },
  ],
};

const STATUS_DOTS: Record<AppStatus, string> = {
  draft: "bg-[#b3b2af]",
  under_review: "bg-[#c19a3f]",
  reviewed: "bg-[#8a63b8]",
  shortlisted: "bg-[#4c9257]",
  completed: "bg-[#2f5e38]",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-caption">
      {children}
    </div>
  );
}

function LearnerLink({
  appId,
  base,
  name,
  status,
  active,
  icon,
}: {
  appId: number;
  base: string;
  name: string;
  status: AppStatus;
  active: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={`${base}/application/${appId}`}
      className={`flex items-center gap-2.5 rounded-xl px-2.5 py-[7px] text-[13px] transition-colors ${
        active ? "bg-muted font-medium text-ink" : "text-body hover:bg-muted"
      }`}
    >
      {icon ?? (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOTS[status]}`}
        />
      )}
      <span className="truncate">{name}</span>
    </Link>
  );
}

export function NotificationBell({ user }: { user: User }) {
  const unread = getUnreadCount(user.id);
  const notifications = getNotifications(user.id);
  return (
    <details className="relative">
      <summary className="flex h-9 cursor-pointer select-none list-none items-center gap-1.5 rounded-full border border-line bg-white px-3 text-body shadow-sm transition-colors hover:bg-muted">
        <IconBell className="h-4 w-4" />
        {unread > 0 && (
          <span className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
            {unread}
          </span>
        )}
      </summary>
      <div className="absolute right-0 z-40 mt-2 max-h-96 w-96 overflow-y-auto rounded-2xl border border-line bg-white p-2 shadow-[0_24px_48px_-16px_rgba(49,48,43,0.25)]">
        <div className="flex items-center justify-between px-2.5 py-1.5">
          <span className="text-xs font-semibold text-caption">
            Notifications
          </span>
          {unread > 0 && (
            <form action={markAllRead}>
              <button className="text-xs font-medium text-accent hover:underline">
                Mark all read
              </button>
            </form>
          )}
        </div>
        {notifications.length === 0 && (
          <p className="px-2 py-5 text-center text-sm text-caption">
            Nothing yet
          </p>
        )}
        {notifications.map((n) => (
          <Link
            key={n.id}
            href={n.link ?? "#"}
            className={`block rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-muted ${
              n.read ? "text-body" : "font-medium text-ink"
            }`}
          >
            {!n.read && (
              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />
            )}
            {n.text}
            <span className="mt-0.5 block text-[11px] font-normal text-caption">
              {n.created_at} UTC
            </span>
          </Link>
        ))}
      </div>
    </details>
  );
}

export function Shell({
  user,
  title,
  hero,
  activeAppId,
  activeNav = activeAppId ? "none" : "home",
  surface = "paper",
  children,
}: {
  user: User;
  title: string;
  hero?: { title: string; subtitle?: string };
  activeAppId?: number;
  /** Which sidebar entry to highlight. Defaults to Home. */
  activeNav?: NavKey;
  /** "white" gives reading-style pages a plain white canvas. */
  surface?: "paper" | "white";
  children: React.ReactNode;
}) {
  const nav = NAV_BY_ROLE[user.role];
  // AC and Ops share the same shape: workspace links + last opened applications.
  const hasHub = user.role === "ac" || user.role === "ops";
  const base = user.role === "ops" ? "/ops" : "/ac";
  const recents = hasHub ? recentViews(user.id, 2) : [];
  const unread = getUnreadCount(user.id);

  return (
    <div className="flex h-screen overflow-hidden bg-paper">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white sm:flex">
        <div className="px-5 pb-4 pt-6">
          <Link href={roleHome(user.role)} aria-label={title}>
            <Wordmark className="text-[19px]" />
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pt-1">
          <SectionLabel>Workspace</SectionLabel>
          {nav.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
                activeNav === item.key
                  ? "bg-muted text-ink"
                  : "text-body hover:bg-muted"
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}

          <Link
            href="/updates"
            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition-colors ${
              activeNav === "updates" ? "bg-muted text-ink" : "text-body hover:bg-muted"
            }`}
          >
            <IconBell />
            Updates
            {unread > 0 && (
              <span className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 py-0.5 text-[10px] font-semibold leading-none text-white">
                {unread}
              </span>
            )}
          </Link>

          {hasHub && recents.length > 0 && (
            <div className="pt-5">
              <SectionLabel>Recently opened</SectionLabel>
              {recents.map((r) => (
                <LearnerLink
                  key={r.application_id}
                  appId={r.application_id}
                  base={base}
                  name={r.learner_name}
                  status={r.status}
                  active={activeAppId === r.application_id}
                  icon={<IconClock className="h-3.5 w-3.5 shrink-0 text-caption" />}
                />
              ))}
            </div>
          )}

        </nav>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-paper">
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-medium text-ink">
                {user.name}
              </div>
              <div className="text-[11px] text-caption">
                {ROLE_LABELS[user.role]}
              </div>
            </div>
            <form action={logout}>
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full text-caption transition-colors hover:bg-muted hover:text-ink"
                title="Logout"
                aria-label="Logout"
              >
                <IconLogout />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Content */}
      <div
        className={`relative flex-1 overflow-y-auto overflow-x-clip ${
          surface === "white" ? "bg-white" : ""
        }`}
      >
        <div className="absolute right-6 top-5 z-30">
          <NotificationBell user={user} />
        </div>
        {hero ? (
          <>
            <CloudHero title={hero.title} subtitle={hero.subtitle} surface={surface} />
            <main className="relative z-10 mx-auto -mt-14 max-w-6xl px-8 pb-12">
              {children}
            </main>
          </>
        ) : (
          <main className="mx-auto max-w-6xl px-8 pb-12 pt-8">{children}</main>
        )}
      </div>
      <RoleSwitcher
        currentRole={user.role}
        currentEmail={user.email}
        activityInline={activityInline()}
        learnerV2={learnerView() === "v2"}
      />
    </div>
  );
}
