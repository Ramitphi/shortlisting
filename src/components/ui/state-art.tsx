"use client";

/**
 * Placeholder line art for the v1 (illustrated) reading of the state screens.
 * Inline SVG on purpose: these render on the screens that exist precisely
 * because something failed to load, so they must not fetch anything.
 * The typographic v2 reading needs none of this and is the shipped default;
 * real artwork for v1 is the designer's to make in the art workflow.
 */

export type StateKind = "not-found" | "no-access" | "crashed" | "offline" | "db-failed";

function ArtNotFound() {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-auto w-[200px] max-w-full">
  <g transform="rotate(-5 71 76)">
    <rect x="46" y="42" width="50" height="68" rx="8" fill="#faf8f4" stroke="#21201d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
    <line x1="58" y1="64" x2="84" y2="64" stroke="#e6e2da" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="58" y1="76" x2="86" y2="76" stroke="#e6e2da" strokeWidth="2.5" strokeLinecap="round"/>
    <line x1="58" y1="88" x2="74" y2="88" stroke="#e6e2da" strokeWidth="2.5" strokeLinecap="round"/>
  </g>
  <rect x="104" y="48" width="50" height="68" rx="8" fill="none" stroke="#21201d" strokeWidth="3" strokeDasharray="7 7" strokeLinejoin="round" strokeLinecap="round" transform="rotate(5 129 82)"/>
  <path d="M34 70 Q28 80 34 90" stroke="#e8dcb8" strokeWidth="2.5" strokeLinecap="round"/>
  <circle cx="164" cy="36" r="4" fill="#d9a441" stroke="#21201d" strokeWidth="2.5"/>
</svg>
  );
}

function ArtNoAccess() {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-auto w-[200px] max-w-full">
  <path d="M 52 47 A 7 7 0 0 1 59 40 H 89 A 7 7 0 0 1 96 47 V 50 A 6 6 0 0 0 102 56 H 141 A 7 7 0 0 1 148 63 V 107 A 7 7 0 0 1 141 114 H 59 A 7 7 0 0 1 52 107 Z" fill="#e8dcb8" stroke="#21201d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
  <rect x="52" y="62" width="96" height="52" rx="7" fill="#f6efdd" stroke="#21201d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
  <path d="M 64 95 H 136" stroke="#e8dcb8" strokeWidth="2.5" strokeLinecap="round"/>
  <path d="M 92 86 V 77 A 8 8 0 0 1 108 77 V 86" stroke="#21201d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
  <rect x="85" y="83" width="30" height="24" rx="7" fill="#d9a441" stroke="#21201d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
  <circle cx="100" cy="92" r="3" fill="#8a6d2f"/>
  <path d="M 100 94 V 100" stroke="#8a6d2f" strokeWidth="2.5" strokeLinecap="round"/>
  <path d="M 36 64 A 14 14 0 0 1 44 51" stroke="#e8dcb8" strokeWidth="2.5" strokeLinecap="round"/>
  <circle cx="162" cy="56" r="3.5" fill="#e6e2da"/>
  <circle cx="44" cy="104" r="3" fill="#e6e2da"/>
</svg>
  );
}

function ArtCrashed() {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-auto w-[200px] max-w-full"><g stroke="#21201d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M 60,40 L 108,40 L 100,58 L 108,70 L 96,84 L 102,98 L 88,110 L 92,118 L 60,118 A 10,10 0 0 1 50,108 L 50,50 A 10,10 0 0 1 60,40 Z" fill="#f3efe7"/><path d="M 50,56 L 50,50 A 10,10 0 0 1 60,40 L 108,40 L 101,56 Z" fill="#e6e2da"/><circle cx="61" cy="48" r="4" fill="#d9a441" strokeWidth="2.5"/><path d="M 62,73 L 93,73" strokeWidth="2.5"/><path d="M 62,87 L 84,87" strokeWidth="2.5"/><path d="M 62,99 L 76,99" strokeWidth="2.5"/><g transform="translate(8,5) rotate(3.5 125 79)"><path d="M 108,40 L 140,40 A 10,10 0 0 1 150,50 L 150,108 A 10,10 0 0 1 140,118 L 92,118 L 88,110 L 102,98 L 96,84 L 108,70 L 100,58 Z" fill="#f3efe7"/><path d="M 108,40 L 140,40 A 10,10 0 0 1 150,50 L 150,56 L 101,56 Z" fill="#e6e2da"/><path d="M 113,74 L 141,74" strokeWidth="2.5"/><path d="M 106,90 L 133,90" strokeWidth="2.5"/></g><path d="M 110,34 L 117,25" stroke="#c0392b"/><rect x="65" y="127" width="11" height="11" rx="3" fill="#f6efdd" transform="rotate(-15 70.5 132.5)"/><path d="M 33,97 L 42,94 L 39,105 Z" fill="#e6e2da"/><circle cx="133" cy="29" r="3" fill="#21201d"/></g></svg>
  );
}

function ArtOffline() {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-auto w-[200px] max-w-full"><g stroke="#21201d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M38 78 C27 80 31 97 22 103" /><path d="M158 78 C171 81 170 97 177 102" /><path d="M80 71 L92 71" /><path d="M80 87 L92 87" /><rect x="36" y="68" width="14" height="20" rx="6" fill="#e6e2da" /><rect x="46" y="58" width="34" height="40" rx="10" fill="#e6e2da" /><rect x="120" y="56" width="40" height="44" rx="12" fill="#f3efe7" /></g><rect x="127" y="67" width="7" height="8" rx="3.5" fill="#21201d" /><rect x="127" y="83" width="7" height="8" rx="3.5" fill="#21201d" /><rect x="141" y="66" width="13" height="24" rx="5" fill="#f6efdd" stroke="#21201d" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" /><g stroke="#d9a441" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M97 70 Q102 78 97 86" /><path d="M104 65 Q111 78 104 91" /><path d="M116 71 Q111 78 116 85" /></g><rect x="146" y="32" width="11" height="11" rx="3.5" fill="#f6efdd" stroke="#21201d" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" transform="rotate(-12 151.5 37.5)" /><circle cx="58" cy="122" r="2.5" fill="#21201d" /><circle cx="70" cy="131" r="2" fill="#21201d" /></svg>
  );
}

function ArtDbFailed() {
  return (
    <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="h-auto w-[200px] max-w-full"><circle cx="84" cy="137" r="4" fill="#e6e2da"/><circle cx="112" cy="141" r="2.8" fill="#e6e2da"/><g stroke="#21201d" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"><path d="M60 42 L60 113 A40 12 0 0 0 140 113 L140 42 A40 12 0 0 0 60 42 Z" fill="#f3efe7"/><path d="M60 66 A40 12 0 0 0 140 66" fill="none"/><path d="M60 90 A40 12 0 0 0 140 90" fill="none"/><ellipse cx="100" cy="42" rx="40" ry="12" fill="#faf8f4"/><g transform="rotate(7 156 50)"><rect x="152" y="34" width="9" height="21" rx="4.5" fill="#d9a441"/><circle cx="156.5" cy="64.5" r="4.5" fill="#d9a441"/></g><path d="M54 78 L146 78" fill="none"/></g></svg>
  );
}

const ART: Record<StateKind, () => JSX.Element> = {
  "not-found": ArtNotFound,
  "no-access": ArtNoAccess,
  "crashed": ArtCrashed,
  "offline": ArtOffline,
  "db-failed": ArtDbFailed,
};

export function StateArt({ kind }: { kind: StateKind }) {
  const Art = ART[kind];
  return <Art />;
}
