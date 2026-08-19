import { cn } from "./cn";

/**
 * Minimal 1.5px-stroke line icons. Size with className (default h-4 w-4).
 *
 * The default is withheld when the caller passes their own height, because
 * `cn` is a plain join with no Tailwind conflict resolution: emitting both
 * "h-4" and "h-3" leaves the winner to stylesheet order, and h-4 wins. Every
 * icon asking to be smaller than the default was silently staying 16px.
 */
const HAS_HEIGHT = /(?:^|\s)h-(?:\d|\[|px)/;

function Icon({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(HAS_HEIGHT.test(className ?? "") ? null : "h-4 w-4", className)}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function IconHome({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 10.5 12 4l8 6.5V20h-5.5v-5h-5v5H4z" />
    </Icon>
  );
}

export function IconLayers({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m12 4 8 4.5-8 4.5-8-4.5z" />
      <path d="m4.5 13.3 7.5 4.2 7.5-4.2" />
    </Icon>
  );
}

export function IconUsers({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="9.5" cy="8.5" r="3" />
      <path d="M4 19c.6-3.2 2.7-4.8 5.5-4.8S14.4 15.8 15 19" />
      <path d="M15.5 5.9a3 3 0 0 1 0 5.2M17.5 14.5c1.6.7 2.6 2.2 3 4.5" />
    </Icon>
  );
}

export function IconRoute({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="5.5" cy="18" r="2" />
      <circle cx="18.5" cy="6" r="2" />
      <path d="M7.5 18H14a3.5 3.5 0 0 0 0-7h-4a3 3 0 0 1 0-6h6.5" />
    </Icon>
  );
}

export function IconBell({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6 15.5V11a6 6 0 0 1 12 0v4.5l1.5 2.5h-15z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </Icon>
  );
}

export function IconLogout({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M13 5H5v14h8" />
      <path d="M17 8.5 20.5 12 17 15.5" />
      <path d="M9.5 12h11" />
    </Icon>
  );
}

export function IconSparkle({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m12 4 1.7 4.8L18.5 10l-4.8 1.2L12 16l-1.7-4.8L5.5 10l4.8-1.2z" />
    </Icon>
  );
}

export function IconPen({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m5 19 1-4L16.5 4.5a2.12 2.12 0 0 1 3 3L9 18l-4 1z" />
      <path d="m14 6.5 3.5 3.5" />
    </Icon>
  );
}

export function IconSend({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 11.5 20 4l-4.5 16-4-6.5z" />
      <path d="M20 4 11.5 13.5" />
    </Icon>
  );
}

export function IconSignature({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 17.5c2.4 0 2.8-7 5-7s1.6 7 3.8 7 1.5-3.5 3.7-3.5c1.5 0 2 1.75 3.5 1.75" />
    </Icon>
  );
}

export function IconClipboardCheck({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="6" y="5" width="12" height="15.5" rx="2" />
      <path d="M9.5 5V3.5h5V5" />
      <path d="m9.25 13 2 2 3.5-3.75" />
    </Icon>
  );
}

export function IconCheck({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </Icon>
  );
}

export function IconPlus({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function IconShield({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 3.5 19 6v6c0 4.4-2.9 7.4-7 8.5-4.1-1.1-7-4.1-7-8.5V6z" />
    </Icon>
  );
}

export function IconDoc({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M7 3.5h7L19 8v12.5H7z" />
      <path d="M14 3.5V8h5" />
    </Icon>
  );
}

export function IconInbox({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 13 6.5 5h11L20 13v6H4z" />
      <path d="M4 13h5a3 3 0 0 0 6 0h5" />
    </Icon>
  );
}

export function IconMale({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="10" cy="14" r="5" />
      <path d="M14 10l6-6M15.5 4H20v4.5" />
    </Icon>
  );
}

export function IconFemale({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="9.5" r="5" />
      <path d="M12 14.5V21M9 18.5h6" />
    </Icon>
  );
}

export function IconGenderOther({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="13" r="4.5" />
      <path d="M12 8.5V3M9.5 5.5 12 3l2.5 2.5" />
      <path d="m15.6 9.4 3.4-3.4M16.4 6H19v2.6" />
    </Icon>
  );
}

export function IconWallet({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H18v3" />
      <path d="M4 8.5V17a2 2 0 0 0 2 2h13v-4" />
      <path d="M20 11h-4a2 2 0 0 0 0 4h4z" />
    </Icon>
  );
}

export function IconCalendar({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M4 10h16M9 4v3M15 4v3" />
    </Icon>
  );
}

export function IconCap({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M2.5 9 12 5l9.5 4-9.5 4z" />
      <path d="M6.5 11v4.2c0 1 2.5 2.3 5.5 2.3s5.5-1.3 5.5-2.3V11" />
    </Icon>
  );
}

export function IconBuilding({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5 20V5.5A1.5 1.5 0 0 1 6.5 4h7A1.5 1.5 0 0 1 15 5.5V20" />
      <path d="M15 10h3.5A1.5 1.5 0 0 1 20 11.5V20M3.5 20h17" />
      <path d="M8 8h4M8 12h4M8 16h4" />
    </Icon>
  );
}

export function IconZoomIn({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4M8.5 11h5M11 8.5v5" />
    </Icon>
  );
}

export function IconZoomOut({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4 4M8.5 11h5" />
    </Icon>
  );
}

export function IconDownload({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M12 4v11" />
      <path d="m8 11.5 4 4 4-4" />
      <path d="M4.5 19.5h15" />
    </Icon>
  );
}

export function IconMail({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4 7 8 5.5L20 7" />
    </Icon>
  );
}

export function IconTrash({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2" />
      <path d="M6.5 6.5 7.5 20h9l1-13.5" />
      <path d="M10.5 10v6M13.5 10v6" />
    </Icon>
  );
}

export function IconClock({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </Icon>
  );
}

/** The brand ✳ — six spokes through a common centre. */
export function IconAsterisk({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={cn("h-4 w-4", className)}
      aria-hidden
    >
      <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9" />
    </svg>
  );
}

export function IconMedal({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="9" r="5.5" />
      <path d="M8.6 13.7 7.2 21l4.8-2.5 4.8 2.5-1.4-7.3" />
    </Icon>
  );
}

/* Study domains. */

export function IconBriefcase({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M3.5 8.5h17V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18z" />
      <path d="M9 8.5V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5v2" />
      <path d="M3.5 13h17" />
    </Icon>
  );
}

export function IconChart({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4.5 4v15.5H20" />
      <path d="M8.5 19.5V14M12.5 19.5V9M16.5 19.5v-3.5" />
    </Icon>
  );
}

/** AI / ML — a die with its pins out. */
export function IconChip({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M5.5 5.5h13v13h-13z" />
      <path d="M9.5 9.5h5v5h-5z" />
      <path d="M9.5 5.5V3M14.5 5.5V3M9.5 21v-2.5M14.5 21v-2.5" />
      <path d="M5.5 9.5H3M5.5 14.5H3M21 9.5h-2.5M21 14.5h-2.5" />
    </Icon>
  );
}

export function IconGear({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      {/* The hub has to sit close under the teeth — leave a gap and this
          reads as a sun rather than a cog. */}
      <circle cx="12" cy="12" r="4.8" />
      <path d="M12 2.8v3.4M12 17.8V21.2M2.8 12h3.4M17.8 12h3.4" />
      <path d="m5.3 5.3 2.4 2.4M16.3 16.3l2.4 2.4M18.7 5.3l-2.4 2.4M7.7 16.3l-2.4 2.4" />
    </Icon>
  );
}

export function IconPulse({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M3 12h3.5L9 6.5l3.5 11L15 12h6" />
    </Icon>
  );
}

export function IconArrowRight({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4.5 12H19" />
      <path d="M14 6.5 19.5 12 14 17.5" />
    </Icon>
  );
}

export function IconCloudUpload({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M7 17.5a4 4 0 0 1-.4-7.98 5.5 5.5 0 0 1 10.6-1.3A4.25 4.25 0 0 1 17.5 17.5" />
      <path d="M12 20.5V11m0 0-2.75 2.75M12 11l2.75 2.75" />
    </Icon>
  );
}

export function IconEye({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

/** Replace — one out, one in. */
export function IconSwap({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M4 8.5h13.5m0 0-3-3m3 3-3 3" />
      <path d="M20 15.5H6.5m0 0 3-3m-3 3 3 3" />
    </Icon>
  );
}

export function IconImage({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m4.5 17 4.2-4.2a2 2 0 0 1 2.8 0l3 3m0 0 1.7-1.7a2 2 0 0 1 2.8 0l1.5 1.4" />
    </Icon>
  );
}

/** Alert — a field someone has flagged for attention. */
export function IconAlert({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M10.7 4.3 3.3 17.2A1.5 1.5 0 0 0 4.6 19.5h14.8a1.5 1.5 0 0 0 1.3-2.3L13.3 4.3a1.5 1.5 0 0 0-2.6 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 16.3v.2" />
    </Icon>
  );
}

/** Information — "there is more to this, hover me". */
export function IconInfo({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <path d="M12 8.2v.2" />
    </Icon>
  );
}

/** Dismiss / reject — the counterpart to IconCheck. */
export function IconX({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M6.5 6.5l11 11m0-11-11 11" />
    </Icon>
  );
}

export function IconRefresh({ className }: { className?: string }) {
  return (
    <Icon className={className}>
      <path d="M20.5 12a8.5 8.5 0 1 1-2.6-6.1" />
      <path d="M20.5 2.8v3.4h-3.4" />
    </Icon>
  );
}
