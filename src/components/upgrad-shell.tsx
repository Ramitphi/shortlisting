"use client";

import { useState } from "react";
import Link from "next/link";
import { LearnerTour } from "./learner-tour";
import { RoleSwitcher } from "./role-switcher";
import { UgBody } from "./ug-body";
import { activityInline, learnerView, type User } from "@/lib/auth";
import { logout } from "@/lib/actions";
import { getApplication } from "@/lib/queries";
import { learnerCanSeeApplication } from "@/lib/domain";
import {
  IconBuilding,
  IconCap,
  IconDoc,
  IconInbox,
  IconLogout,
  IconSend,
  IconUsers,
} from "@/components/ui";

/**
 * The learner's world is upgrad.com, so their side of the prototype wears
 * that site's chrome: the header, the breadcrumb, and the profile page's
 * left-hand navigation — rebuilt from the saved "Profile | upGrad" captures.
 *
 * The nav itself is the designed one, not the capture's: Profile, one
 * application, Documents, Flying journey, Centres, Alumni — and the
 * counsellor's own card beneath it, with support behind it. The site's
 * courses/certificates/jobs rows are gone; they were set dressing, and the
 * design replaces them with rows that mean something here.
 *
 * The counsellor and Ops keep the internal tool's own shell — this one is
 * learner-only.
 */

/** The visa-to-departure tracker lives in PRISM, which signs in through LXP. */
const PRISM_URL: string = "https://lxp.upgrad.com/identity/login";
const SUPPORT_PHONE = "1800 210 2030";
const SUPPORT_EMAIL = "contactus@upgrad.com";

/**
 * Undertaking is deliberately NOT a section: signing is the end of a guided
 * walk (details → undertakings), never a place you can jump to. The walk
 * renders under "My application". "documents" is its own top-level section,
 * no longer a tab inside the application. "applications" is the v2 world —
 * the site's current My Applications pages.
 */
export type UgSection =
  | "profile"
  | "application"
  | "documents"
  | "centres"
  | "alumni"
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
  external = false,
  tour,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  active?: boolean;
  /** Leaves upgrad.com — the alumni repository is a page on the main site. */
  external?: boolean;
  /** Anchors a first-visit walkthrough step to this row. */
  tour?: string;
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
  if (href && external)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls} data-tour={tour}>
        {body}
      </a>
    );
  return href ? (
    <Link href={href} className={cls} data-tour={tour}>
      {body}
    </Link>
  ) : (
    <span className={`${cls} cursor-default`} data-tour={tour}>
      {body}
    </span>
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

/**
 * Flying journey promises something its label doesn't say, so the row says it
 * on hover — the tooltip from the design: the site's own card, the brand's
 * red spine, a plane. CSS-only, opening on focus as well as hover so it is
 * reachable from the keyboard.
 */
function FlyingJourneyRow() {
  const body = (
    <>
      <span className="text-body">
        <IconSend className="h-5 w-5" />
      </span>
      Flying journey
    </>
  );
  const cls =
    "flex items-center gap-3 border-l-[3px] border-transparent px-5 py-3 text-[15px] text-ink transition-colors hover:bg-muted";

  return (
    <div className="group relative" data-tour="flying">
      {PRISM_URL ? (
        <a href={PRISM_URL} target="_blank" rel="noreferrer" className={cls}>
          {body}
        </a>
      ) : (
        <span className={`${cls} cursor-default`} tabIndex={0}>
          {body}
        </span>
      )}
      <div
        role="tooltip"
        className="pointer-events-none absolute left-full top-1 z-50 ml-3 hidden w-[280px] rounded-[10px] border-l-[3px] border-accent bg-white p-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)] group-hover:block group-focus-within:block"
      >
        <div className="flex items-start gap-2.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 h-5 w-5 shrink-0 text-accent"
            aria-hidden
          >
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
          <p className="text-[13px] leading-relaxed text-body">
            Fly abroad in your preferred intake — track your entire process
            from application till visa.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * The counsellor's own card, under the nav: who is looking after this
 * learner, and the one button that reaches everyone else. Support is folded
 * away until asked for — it is a fallback, not a call to action, and the
 * named counsellor above it is the better first move.
 */
function CounsellorCard({
  name,
  email,
}: {
  name?: string | null;
  email?: string | null;
}) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <div className="mt-5 rounded-xl border border-line p-5" data-tour="support">
      {name ? (
        <>
          <div className="text-[12px] font-medium uppercase tracking-wide text-caption">
            Counsellor details
          </div>
          <div className="mt-2 text-[15px] font-medium text-ink">{name}</div>
          {email && (
            <a
              href={`mailto:${email}?subject=${encodeURIComponent(
                "Question about my application"
              )}`}
              className="text-[13.5px] text-accent hover:underline"
            >
              {email}
            </a>
          )}
        </>
      ) : (
        // No counsellor on the card before the first shortlist — the whole
        // application is still private at that point, and that includes who
        // is working on it.
        <div className="text-[13.5px] leading-relaxed text-body">
          Your counsellor&rsquo;s details appear here once your application is
          ready for you.
        </div>
      )}

      <button
        type="button"
        onClick={() => setHelpOpen((v) => !v)}
        aria-expanded={helpOpen}
        className="mt-4 w-full rounded-lg border border-line-strong px-4 py-2.5 text-[14px] font-medium text-ink transition-colors hover:bg-muted"
      >
        My support
      </button>

      {helpOpen && (
        <div className="mt-4 border-t border-line pt-4">
          <div className="text-[15px] font-medium">Help</div>
          <a
            href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
            className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 transition-colors hover:bg-line"
          >
            <span className="min-w-0">
              <span className="block text-[12px] text-caption">Call</span>
              <span className="block truncate text-[14px] text-ink">
                {SUPPORT_PHONE}
              </span>
            </span>
          </a>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 transition-colors hover:bg-line"
          >
            <span className="min-w-0">
              <span className="block text-[12px] text-caption">Email</span>
              <span className="block truncate text-[14px] text-ink">
                {SUPPORT_EMAIL}
              </span>
            </span>
            <span className="shrink-0 text-caption">&rsaquo;</span>
          </a>
        </div>
      )}
    </div>
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
  // Who the counsellor is, for the card under the nav. Looked up here rather
  // than passed in, so every screen wearing this shell gets the same answer
  // without having to remember to ask — and withheld until the application
  // is the learner's to see, like everything else on it.
  const shellApp = appId ? getApplication(appId) : undefined;
  const appVisible = Boolean(
    shellApp && learnerCanSeeApplication(shellApp.status)
  );

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
            {onProfile
              ? "Profile"
              : section === "documents"
                ? "Documents"
                : section === "alumni"
                  ? "Alumni"
                  : section === "centres"
                    ? "Centres"
                    : "My application"}
          </span>
        </div>
      </div>

      {/* ── Sidebar + content ── */}
      <div className="mx-auto flex max-w-[1360px] items-start gap-8 px-6 pb-16 pt-4">
        <div className="hidden w-[300px] shrink-0 md:block">
          <aside className="rounded-xl border border-line">
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
                tour="profile"
              />
              {/* One sub-row, because the page has one section. The site's
                  other three led nowhere, and with the academic and
                  financing cards gone they would point at nothing at all. */}
              {onProfile && (
                <div className="pb-2">
                  <SubRow label="Personal details" href="/learner/profile" active />
                </div>
              )}

              {/* ONE application row, not two. The site separates the
                  admission application from the post-enrolment one; here there
                  is only ever the shortlisting application, so a second tab
                  would have been a tab with nothing behind it. */}
              <NavRow
                icon={<IconInbox className="h-5 w-5" />}
                label="My application"
                href={v2 ? "/learner/applications" : "/learner/application"}
                active={section === "application" || section === "applications"}
                tour="application"
              />

              {/* Documents sits BESIDE the application, not inside it. The
                  learner's papers are a section of the site in their own
                  right — reachable without first opening an application, and
                  still there after one closes. */}
              <NavRow
                icon={<IconDoc className="h-5 w-5" />}
                label="Documents"
                href="/learner/documents"
                active={section === "documents"}
                tour="documents"
              />

              {/* Off to PRISM, so it opens in its own tab — the learner is
                  not leaving their application behind to get there. */}
              <FlyingJourneyRow />

              {/* The walk-in offices, nearest first — the page asks the
                  browser where the learner is. */}
              <NavRow
                icon={<IconBuilding className="h-5 w-5" />}
                label="Centres"
                href="/learner/centres"
                active={section === "centres"}
                tour="centres"
              />

              {/* The alumni repository, rebuilt here rather than linked out —
                  the learner never leaves the site they are already on. */}
              <NavRow
                icon={<IconCap className="h-5 w-5" />}
                label="Alumni"
                href="/learner/alumni"
                active={section === "alumni"}
                tour="alumni"
              />

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

          <CounsellorCard
            name={appVisible ? shellApp?.ac_name : null}
            email={appVisible ? shellApp?.ac_email : null}
          />
        </div>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
      </>
      )}

      {!bare && <LearnerTour />}

      <RoleSwitcher
        currentRole={user.role}
        currentEmail={user.email}
        activityInline={activityInline()}
        learnerV2={v2}
      />
    </div>
  );
}
