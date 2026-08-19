"use client";

import Link from "next/link";
import { RoleSwitcher } from "./role-switcher";
import { UgBody } from "./ug-body";
import { activityInline, learnerView, type User } from "@/lib/auth";
import { logout } from "@/lib/actions";
import {
  IconBriefcase,
  IconDoc,
  IconInbox,
  IconLogout,
  IconMedal,
  IconUsers,
} from "@/components/ui";

/**
 * The learner's world is upgrad.com, so their side of the prototype wears
 * that site's chrome: the header, the breadcrumb, and the profile page's
 * left-hand navigation — rebuilt from the saved "Profile | upGrad" captures,
 * with one addition: a Shortlisting entry below My applications, which is
 * where this product lives.
 *
 * Everything on the real site that is not part of this prototype (courses,
 * certificates, jobs) is kept as set dressing so the page reads as the real
 * thing, but only Profile, Shortlisting and Logout actually go anywhere.
 * The counsellor and Ops keep the internal tool's own shell — this one is
 * learner-only.
 */

/**
 * Undertaking is deliberately NOT a section: signing is the end of a guided
 * walk (details → programme → undertakings), never a place you can jump to.
 * The walk renders under "My application". "applications" is the v2 world —
 * the site's current My Applications pages.
 */
export type UgSection =
  | "profile"
  | "application"
  | "details"
  | "documents"
  | "applications";

function SearchPill() {
  return (
    <div className="hidden h-10 w-[280px] items-center rounded-lg border border-line-strong pl-4 pr-1 md:flex">
      <span className="flex-1 text-[14px] text-caption">Explore Courses</span>
      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-white">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="h-4 w-4"
          aria-hidden
        >
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4.5 4.5" />
        </svg>
      </span>
    </div>
  );
}

function PersonGlyph({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="8.2" r="3.6" />
      <path d="M4.8 19.4c.9-3.4 3.8-5.2 7.2-5.2s6.3 1.8 7.2 5.2c.1.5-.3 1-.8 1H5.6c-.5 0-.9-.5-.8-1Z" />
    </svg>
  );
}

function Chevron({ open = false }: { open?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-4 w-4 shrink-0 text-body transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

/** A left-nav row. Real links navigate; set dressing renders identically but goes nowhere. */
function NavRow({
  icon,
  label,
  href,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  active?: boolean;
}) {
  const cls = `flex items-center gap-3 border-l-[3px] px-5 py-3 text-[15px] transition-colors ${
    active
      ? "border-accent bg-accent/5 font-medium text-accent"
      : "border-transparent text-ink hover:bg-muted"
  }`;
  const body = (
    <>
      <span className={active ? "text-accent" : "text-body"}>{icon}</span>
      {label}
    </>
  );
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <span className={`${cls} cursor-default`}>{body}</span>
  );
}

function SubRow({
  label,
  href,
  active = false,
}: {
  label: string;
  href?: string;
  active?: boolean;
}) {
  const cls = `block py-2 pl-[52px] pr-4 text-[14px] transition-colors ${
    active ? "font-medium text-accent" : "text-body hover:text-ink"
  }`;
  return href ? (
    <Link href={href} className={cls}>
      {label}
    </Link>
  ) : (
    <span className={`${cls} cursor-default`}>{label}</span>
  );
}

export function UpgradShell({
  user,
  section,
  appId,
  bare = false,
  children,
}: {
  user: User;
  section: UgSection;
  /** The learner's one application, when it exists — sub-nav needs its id. */
  appId?: number | null;
  /**
   * Header only, content full width — no breadcrumb, no profile sidebar. The
   * site's My Applications pages (the v2 captures) are laid out this way.
   */
  bare?: boolean;
  children: React.ReactNode;
}) {
  const firstName = user.name.split(" ")[0];
  const onProfile = section === "profile";
  const v2 = learnerView() === "v2";
  const appHref = (tab: string) =>
    appId ? `/learner/application/${appId}?tab=${tab}` : "/learner/application";

  return (
    <div className="ug-app min-h-dvh bg-white text-ink">
      {/* The site's OWN compiled stylesheet (from the saved captures, fonts
          rewritten to local files). v2 components use the capture's literal
          markup, and these are the classes that markup is written in. Loaded
          on the learner shell only — the internal tool never sees it. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/upgrad/site.css" />
      {/* Theme the body too, so portalled components (dialogs, toasts) keep
          the upGrad skin — see the note in ug-body.tsx. */}
      <UgBody />
      {/* ── Header ── */}
      <header className="border-b border-line">
        <div className="mx-auto flex h-[72px] max-w-[1360px] items-center gap-6 px-6">
          <Link href="/learner" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/upgrad/upgrad-logo.svg" alt="upGrad" className="h-9 w-auto" />
          </Link>
          <SearchPill />
          {/* Set dressing from the live site — present, inert. */}
          <nav className="ml-auto hidden items-center gap-6 text-[15px] text-ink lg:flex">
            {["All courses", "Certifications", "Study abroad", "More"].map((l) => (
              <span key={l} className="flex cursor-default items-center gap-1">
                {l}
                {(l.endsWith("courses") || l === "Certifications" || l === "More") && (
                  <Chevron />
                )}
              </span>
            ))}
            <span className="cursor-default rounded-lg border border-ink px-3 py-1.5 text-[14px] font-medium">
              IIT/IIM Courses
            </span>
          </nav>
          {/* No notifications on the learner side — the application page
              itself says what needs doing. The bell stays internal-tool only. */}
          <div className="ml-auto flex items-center gap-3 lg:ml-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-body">
              <PersonGlyph className="h-5 w-5" />
            </span>
          </div>
        </div>
      </header>

      {/* The v2 My Applications pages are full-width under the header — no
          breadcrumb, no profile sidebar — exactly like the captures. */}
      {bare ? (
        <main className="mx-auto max-w-[1360px] px-6 pb-16 pt-8">{children}</main>
      ) : (
      <>
      {/* ── Breadcrumb ── */}
      <div className="mx-auto max-w-[1360px] px-6 pb-2 pt-5">
        <div className="flex items-center gap-2 text-[14px]">
          <Link href="/learner" className="text-body hover:text-ink">
            Home
          </Link>
          <span className="text-caption">›</span>
          <span className="font-medium text-ink">
            {onProfile ? "Profile" : "My applications"}
          </span>
        </div>
      </div>

      {/* ── Sidebar + content ── */}
      <div className="mx-auto flex max-w-[1360px] items-start gap-8 px-6 pb-16 pt-4">
        <aside className="hidden w-[300px] shrink-0 rounded-xl border border-line md:block">
          <div className="flex flex-col items-center px-6 pb-5 pt-8 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-body">
              <PersonGlyph className="h-9 w-9" />
            </span>
            <div className="mt-4 text-[22px] font-medium tracking-tight">
              Hello, {firstName}!
            </div>
            <div className="mt-1 text-[13.5px] text-body">
              Complete your profile
            </div>
          </div>
          <div className="mx-5 border-t border-line" />

          <nav className="py-2">
            {/* Profile expands exactly like the live site; only Personal
                details is live — it holds the learner's real data. */}
            <NavRow
              icon={<IconUsers className="h-5 w-5" />}
              label="Profile"
              href="/learner/profile"
              active={onProfile}
            />
            {onProfile && (
              <div className="pb-2">
                <SubRow label="Personal details" href="/learner/profile" active />
                <SubRow label="Educational details" />
                <SubRow label="Professional experience" />
                <SubRow label="Aspirations and Preference" />
              </div>
            )}

            {/* The product lives where the site already has it — under
                My applications. No Shortlisting entry of its own (PM call);
                the application, its editable details and its documents are
                all sub-pages of My applications. */}
            {v2 ? (
              <NavRow
                icon={<IconInbox className="h-5 w-5" />}
                label="My applications"
                href="/learner/applications"
                active={section === "applications"}
              />
            ) : (
              <>
                <NavRow
                  icon={<IconInbox className="h-5 w-5" />}
                  label="My applications"
                  href={appHref("application")}
                  active={!onProfile}
                />
                {!onProfile && (
                  <div className="pb-2">
                    <SubRow
                      label="My application"
                      href={appHref("application")}
                      active={section === "application"}
                    />
                    <SubRow
                      label="My details"
                      href={appHref("details")}
                      active={section === "details"}
                    />
                    <SubRow
                      label="Documents"
                      href={appHref("documents")}
                      active={section === "documents"}
                    />
                  </div>
                )}
              </>
            )}

            <NavRow icon={<IconDoc className="h-5 w-5" />} label="My courses" />
            <NavRow icon={<IconDoc className="h-5 w-5" />} label="My external courses" />
            <NavRow icon={<IconMedal className="h-5 w-5" />} label="My certificates" />
            <NavRow icon={<IconBriefcase className="h-5 w-5" />} label="Applied jobs" />

            <form action={logout}>
              <button className="flex w-full items-center gap-3 border-l-[3px] border-transparent px-5 py-3 text-left text-[15px] text-ink transition-colors hover:bg-muted">
                <span className="text-body">
                  <IconLogout className="h-5 w-5" />
                </span>
                Logout
              </button>
            </form>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
      </>
      )}

      <RoleSwitcher
        currentRole={user.role}
        activityInline={activityInline()}
        learnerV2={v2}
      />
    </div>
  );
}
