"use client";

import { useEffect, useState } from "react";
import { login } from "@/lib/actions";
import {
  Button,
  Divider,
  IconArrowRight,
  IconBriefcase,
  IconCap,
  IconChart,
  IconChip,
  IconDoc,
  IconGear,
  IconLayers,
  IconMedal,
  IconPulse,
  IconSend,
  IconShield,
  IconUsers,
  IconWallet,
  Wordmark,
} from "@/components/ui";

const DEMO_ACCOUNTS = [
  { role: "Academic Counsellor", email: "academic@upgrad.com" },
  { role: "Ops Team", email: "ops@upgrad.com" },
  { role: "Learner", email: "learner@upgrad.com" },
  { role: "Admin", email: "admin@upgrad.com" },
];

const DARK_FIELD =
  "h-12 w-full rounded-full border border-charcoal-line bg-charcoal-surface px-5 text-[15px] text-white placeholder:text-[#77766f] outline-none transition-colors focus:border-[#55544f] focus:ring-4 focus:ring-white/5";

/**
 * Showcase surfaces. Each slide gets a real piece of product UI on a floating
 * white panel, not a tilted business card — the point is to show the thing.
 */
function Panel({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={style}
      className={`rounded-2xl bg-white/95 p-5 shadow-[0_28px_60px_-22px_rgba(60,20,24,0.3)] backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function Pill({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${tone}`}
    >
      {children}
    </span>
  );
}

const TONE = {
  vetting: "bg-[#f6efdd] text-[#8a6d2f] border-[#ecdfc0]",
  completed: "bg-[#e2eee5] text-[#2f5e38] border-[#cde1d2]",
};

/**
 * Concept 1 — "The smartest way to study abroad". A side-by-side of the two
 * routes: the old one is stated plainly and left translucent, the pathway sits
 * on a solid white panel so the eye lands there first. The comparison carries
 * the argument; the chips underneath carry the proof.
 */
function PathwaySurface() {
  // Kept short and parallel line-for-line — the two columns are ~380px at the
  // lg breakpoint, and a wrapped bullet breaks the read-across comparison.
  const traditional = [
    "2 years fully on campus",
    "GRE / GMAT required",
    "Full international tuition",
  ];
  const pathway = [
    "6 months online, from India",
    "Then on campus abroad",
    "Credits carry to 18 universities",
  ];
  return (
    <div
      className="-mx-6 w-[calc(100%+3rem)]"
      style={{ animation: "fade-up 0.7s ease-out backwards" }}
    >
      <div className="flex items-stretch gap-3">
        {/* Traditional route — present, but deliberately unlit */}
        <div className="flex-1 rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white/55">
            Traditional path
          </div>
          <div className="mt-3 font-display text-[30px] font-semibold leading-none tracking-tight text-white/75">
            ₹50L+
          </div>
          <div className="mt-1 text-[13px] text-white/50">total outlay</div>
          <ul className="mt-4 space-y-2 border-t border-white/10 pt-3">
            {traditional.map((t) => (
              <li
                key={t}
                className="flex gap-2 text-[13.5px] leading-snug text-white/60"
              >
                <span className="mt-[3px] text-[11px] leading-none">✕</span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        {/* Pathway route — the answer, on the brand's white surface */}
        <Panel className="relative flex-1 !p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a6d2f]">
              Pathway model
            </div>
            <Pill tone={TONE.completed}>98% admit rate</Pill>
          </div>
          <div className="mt-3 font-display text-[30px] font-semibold leading-none tracking-tight text-[#2c3038]">
            ₹20–50L
          </div>
          <div className="mt-1 text-[13px] text-[#2f5e38]">saved</div>
          <ul className="mt-4 space-y-2 border-t border-[#eceae4] pt-3">
            {pathway.map((t) => (
              <li
                key={t}
                className="flex gap-2 text-[13.5px] leading-snug text-[#2c3038]/80"
              >
                <span className="mt-[3px] text-[11px] leading-none text-[#3f6c45]">
                  ✓
                </span>
                {t}
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* The entry barriers that quietly disappear */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {["No GRE / GMAT", "EPT waivers", "300+ universities", "Monthly intakes"].map(
          (chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[12.5px] font-medium text-white/85 backdrop-blur-sm"
            >
              {chip}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

/**
 * Coarse equirectangular land mask, one entry per row of the dot grid, each
 * holding inclusive [startCol, endCol] runs of land. 48×24 cells covers
 * 180°W–180°E and 84°N–56°S, so a cell is 7.5° of longitude by 5.83° of
 * latitude — deliberately blocky. It only has to read as "the world".
 */
const LAND: [number, [number, number][]][] = [
  [0, [[5, 8], [17, 20]]],
  [1, [[3, 10], [17, 21], [33, 44]]],
  [2, [[2, 12], [17, 21], [25, 45]]],
  [3, [[2, 13], [17, 20], [22, 22], [25, 45]]],
  [4, [[2, 14], [23, 23], [25, 45]]],
  [5, [[3, 15], [23, 45]]],
  [6, [[4, 15], [23, 45]]],
  [7, [[4, 15], [23, 33], [36, 44]]],
  // Cols 25–26 left as water — without the Mediterranean, Africa and Europe
  // fuse into one mass and the map stops being readable.
  [8, [[5, 14], [22, 24], [27, 33], [36, 44]]],
  [9, [[6, 12], [22, 33], [34, 42]]],
  [10, [[7, 12], [22, 33], [34, 41]]],
  [11, [[9, 13], [22, 32], [34, 36], [38, 41]]],
  [12, [[14, 18], [22, 31], [35, 35], [38, 42]]],
  [13, [[14, 19], [23, 31], [39, 43]]],
  [14, [[14, 19], [24, 30], [39, 44]]],
  [15, [[14, 19], [24, 30], [40, 44]]],
  [16, [[15, 19], [24, 29], [41, 45]]],
  [17, [[15, 19], [24, 29], [40, 44]]],
  [18, [[15, 18], [24, 28], [39, 45]]],
  [19, [[15, 18], [25, 27], [39, 45]]],
  [20, [[15, 17], [40, 44]]],
  [21, [[15, 16], [46, 46]]],
  [22, [[15, 16], [46, 46]]],
  [23, [[15, 15]]],
];

/** Grid cell → viewBox point. Cells are 10 units apart, dots sit centred. */
const px = (col: number) => col * 10 + 5;
const py = (row: number) => row * 10 + 5;

// Destinations, placed on the same grid. `dx`/`dy` nudge the label clear of
// its own pin — UK and Germany land ~16 units apart, so one goes up and the
// other goes down or the two labels sit on top of each other.
const PINS = [
  { id: "Canada", col: 9.9, row: 4.8, dx: 0, dy: -13, anchor: "middle" },
  { id: "USA", col: 10.9, row: 7.7, dx: -12, dy: 4, anchor: "end" },
  { id: "UK", col: 23.7, row: 5.1, dx: -10, dy: -8, anchor: "end" },
  { id: "Germany", col: 25.3, row: 6.4, dx: 10, dy: 10, anchor: "start" },
  { id: "Australia", col: 41.9, row: 18.7, dx: 0, dy: 17, anchor: "middle" },
] as const;

// The other four destinations. Unlabelled and smaller — they make the "nine
// countries" headline true without crowding Europe with five more labels.
const MINOR_PINS = [
  { id: "France", col: 24.3, row: 6.3 },
  { id: "Finland", col: 27.5, row: 3.4 },
  { id: "Ireland", col: 22.9, row: 5.3 },
  { id: "Hungary", col: 26.5, row: 6.3 },
];

const HOME = { col: 34.4, row: 10.8 }; // India — where every route starts

/** Lift the midpoint of each route so it reads as a flight path, not a ruler. */
function arc(col: number, row: number) {
  const x1 = px(HOME.col);
  const y1 = py(HOME.row);
  const x2 = px(col);
  const y2 = py(row);
  const lift = Math.hypot(x2 - x1, y2 - y1) * 0.28;
  return `M${x1} ${y1} Q${(x1 + x2) / 2} ${(y1 + y2) / 2 - lift} ${x2} ${y2}`;
}

/**
 * Concept 2 — "Global destinations & career hubs". A dot-matrix world with the
 * five destinations pinned and routes drawn out of India, then the career
 * argument for each in three cards underneath. The map carries the reach; the
 * cards carry the reason.
 */
function DestinationsSurface() {
  const cards = [
    { place: "USA", stat: "3.5M", detail: "STEM jobs open, in the world's #1 economy" },
    { place: "Germany", stat: "1M+", detail: "jobs — and public universities charge little to nothing" },
    { place: "UK & Australia", stat: "5 yrs", detail: "post-study work, after a 1-year Master's" },
  ];
  return (
    <div
      className="-mx-6 w-[calc(100%+3rem)]"
      style={{ animation: "fade-up 0.7s ease-out backwards" }}
    >
      <div className="rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm">
        <svg viewBox="0 0 480 240" className="w-full" aria-hidden>
          {LAND.flatMap(([row, runs]) =>
            runs.flatMap(([from, to]) =>
              Array.from({ length: to - from + 1 }, (_, i) => (
                <circle
                  key={`${row}-${from + i}`}
                  cx={px(from + i)}
                  cy={py(row)}
                  r="1.7"
                  fill="rgba(255,255,255,0.28)"
                />
              )),
            ),
          )}

          {PINS.map((p) => (
            <path
              key={`arc-${p.id}`}
              d={arc(p.col, p.row)}
              fill="none"
              stroke="rgba(255,255,255,0.35)"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          ))}

          {MINOR_PINS.map((p) => (
            <circle
              key={p.id}
              cx={px(p.col)}
              cy={py(p.row)}
              r="2.2"
              fill="rgba(255,255,255,0.6)"
            />
          ))}

          {/* Origin */}
          <circle cx={px(HOME.col)} cy={py(HOME.row)} r="4.5" fill="rgba(255,255,255,0.35)" />
          <circle cx={px(HOME.col)} cy={py(HOME.row)} r="2.2" fill="#fff" />
          {/* Down-left: every route but Australia's leaves to the upper-left,
              and Australia's leaves to the lower-right. */}
          <text
            x={px(HOME.col) - 8}
            y={py(HOME.row) + 14}
            textAnchor="end"
            fontSize="9"
            fill="rgba(255,255,255,0.75)"
          >
            India
          </text>

          {PINS.map((p) => (
            <g key={p.id}>
              <circle cx={px(p.col)} cy={py(p.row)} r="6" fill="rgba(255,255,255,0.25)" />
              <circle cx={px(p.col)} cy={py(p.row)} r="3" fill="#fff" />
              <text
                x={px(p.col) + p.dx}
                y={py(p.row) + p.dy}
                textAnchor={p.anchor}
                fontSize="10"
                fontWeight="600"
                fill="#fff"
              >
                {p.id}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-3 flex items-stretch gap-3">
        {cards.map((c) => (
          <Panel key={c.place} className="flex-1 !p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8a6d2f]">
              {c.place}
            </div>
            <div className="mt-2 font-display text-[26px] font-semibold leading-none tracking-tight text-[#2c3038]">
              {c.stat}
            </div>
            <p className="mt-1.5 text-[12.5px] leading-snug text-[#2c3038]/70">
              {c.detail}
            </p>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/**
 * Concept 3 — "Programs for every global ambition". Domains as a plain grid,
 * then the one thing no single-university route can offer: two alumni networks
 * off one degree. The grid establishes breadth; the panel lands the hook.
 */
function DomainsSurface() {
  const domains = [
    { icon: IconBriefcase, label: "MBA & Management" },
    { icon: IconChart, label: "Data Science" },
    { icon: IconChip, label: "AI & Machine Learning" },
    { icon: IconGear, label: "Engineering" },
    { icon: IconPulse, label: "Healthcare" },
  ];
  return (
    <div
      className="-mx-6 w-[calc(100%+3rem)]"
      style={{ animation: "fade-up 0.7s ease-out backwards" }}
    >
      <div className="grid grid-cols-3 gap-2.5">
        {domains.map((d) => (
          <div
            key={d.label}
            className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
          >
            <d.icon className="h-6 w-6 text-white/90" />
            <div className="mt-3 text-[14px] font-medium leading-snug text-white">
              {d.label}
            </div>
          </div>
        ))}
        {/* Sixth cell — the grid is 3×2, and five domains would leave a hole. */}
        <div className="flex flex-col justify-between rounded-2xl border border-dashed border-white/25 p-4">
          <IconArrowRight className="h-6 w-6 text-white/70" />
          <div className="mt-3 text-[14px] font-medium leading-snug text-white/70">
            And more
          </div>
        </div>
      </div>

      {/* Dual alumni — the claim a single-university route can't make */}
      <Panel className="mt-3 !p-4">
        <div className="flex items-center gap-4">
          {/* Overlapping crests: two institutions, one degree */}
          <div className="flex shrink-0 items-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f6efdd] text-[11px] font-bold text-[#8a6d2f]">
              IIM
            </span>
            <span className="-ml-3 flex h-11 w-11 items-center justify-center rounded-full border-2 border-white bg-[#efe9f6] text-[#6b4d8f]">
              <IconCap className="h-5 w-5" />
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-[18px] font-semibold tracking-tight text-[#2c3038]">
              Dual alumni status
            </div>
            <p className="mt-0.5 text-[13px] leading-snug text-[#2c3038]/70">
              Graduate from IIM Udaipur <em>and</em> your university abroad — two
              networks, one degree.
            </p>
          </div>
          <Pill tone={TONE.vetting}>Intakes every month</Pill>
        </div>
      </Panel>
    </div>
  );
}

/**
 * Concept 4 — "Your 360° support system". The roadmap goes on the white panel
 * because it's the spine of the slide; the three pillars sit under it as
 * translucent cards. Slide 2 runs the opposite arrangement (translucent field,
 * white cards) so the two don't read as the same layout twice.
 */
function SupportSurface() {
  const steps = [
    { icon: IconUsers, label: "First call" },
    { icon: IconLayers, label: "Shortlist" },
    { icon: IconDoc, label: "Apply & admit" },
    { icon: IconWallet, label: "Fees & funding" },
    { icon: IconSend, label: "Visa & fly", end: true },
  ];
  const pillars = [
    {
      icon: IconUsers,
      lead: "1:1 counselling",
      detail: "A counsellor reads your profile and shortlists universities with you.",
    },
    {
      icon: IconWallet,
      lead: "Up to 40% scholarships",
      detail: "Plus education-loan assistance from people who arrange them daily.",
    },
    {
      icon: IconShield,
      lead: "Visa, end to end",
      detail: "Documentation guidance and mock interviews before the real one.",
    },
  ];
  return (
    <div
      className="-mx-6 w-[calc(100%+3rem)]"
      style={{ animation: "fade-up 0.7s ease-out backwards" }}
    >
      <Panel className="!px-5 !py-6">
        <div className="relative flex items-start justify-between">
          {/* Rail, inset so it spans node centres rather than the full width.
              Painted first; the nodes' solid fill covers it where they sit. */}
          <div className="absolute left-[10%] right-[10%] top-5 h-px bg-[#eceae4]" />
          {steps.map((s, i) => (
            <div
              key={s.label}
              className="relative flex flex-1 flex-col items-center gap-2.5"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full border ${
                  s.end
                    ? "border-[#cde1d2] bg-[#e2eee5] text-[#2f5e38]"
                    : "border-[#eceae4] bg-white text-[#8a6d2f]"
                }`}
              >
                <s.icon className="h-[18px] w-[18px]" />
              </span>
              <span className="text-center text-[12.5px] font-medium leading-snug text-[#2c3038]">
                {s.label}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9b9a97]">
                Step {i + 1}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      <div className="mt-3 flex items-stretch gap-3">
        {pillars.map((p) => (
          <div
            key={p.lead}
            className="flex-1 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
          >
            <p.icon className="h-5 w-5 text-white/90" />
            <div className="mt-2.5 text-[14px] font-semibold leading-snug text-white">
              {p.lead}
            </div>
            <p className="mt-1 text-[12.5px] leading-snug text-white/65">
              {p.detail}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Concept 5 — "Join a global community of achievers". The faces run as a tight
 * avatar stack ending in the headcount, so the row itself states the scale
 * rather than needing a stat beside it — and it leaves room for the proof
 * panel underneath, which a hero-sized portrait row would not.
 */
function CommunitySurface() {
  const awards = [
    "Edtech Company of the Year",
    "Best Employability Award",
    "Silver Feather Award",
  ];
  return (
    <div
      className="-mx-6 w-[calc(100%+3rem)]"
      style={{ animation: "fade-up 0.7s ease-out backwards" }}
    >
      <div className="flex items-center justify-center">
        {["f1", "f2", "f3", "f4", "f5"].map((f, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={f}
            src={`/showcase/faces/${f}.png`}
            alt=""
            aria-hidden
            className="h-14 w-14 shrink-0 rounded-full border-2 border-white/85 object-cover shadow-[0_12px_28px_-10px_rgba(60,20,24,0.35)]"
            style={{
              marginLeft: i === 0 ? 0 : "-0.875rem",
              zIndex: 5 - i, // earlier faces sit in front, so the stack reads left-to-right
              animation: `fade-up 0.6s ease-out ${i * 70}ms backwards`,
            }}
          />
        ))}
        {/* The headcount closes the stack — the row itself becomes the stat */}
        <span
          className="-ml-3.5 flex h-14 items-center rounded-full border-2 border-white/85 bg-white/15 px-5 text-[15px] font-semibold text-white backdrop-blur-sm"
          style={{ animation: "fade-up 0.6s ease-out 350ms backwards" }}
        >
          +3,00,000
        </span>
      </div>

      <Panel className="mt-5 !p-5">
        {/* Centred as one unit — the awards are short enough that a flex-1
            list leaves the whole right half of the panel empty. */}
        <div className="flex items-center justify-center gap-6">
          <div className="shrink-0">
            <div className="font-display text-[38px] font-semibold leading-none tracking-tight text-[#2c3038]">
              98%
            </div>
            <div className="mt-1.5 text-[13px] leading-snug text-[#2c3038]/60">
              admit rate for
              <br />
              enrolled learners
            </div>
          </div>

          <div className="h-16 w-px shrink-0 bg-[#eceae4]" />

          <ul className="min-w-0 space-y-2">
            {awards.map((a) => (
              <li key={a} className="flex items-center gap-2.5">
                <IconMedal className="h-[18px] w-[18px] shrink-0 text-[#8a6d2f]" />
                <span className="text-[13.5px] leading-snug text-[#2c3038]/80">
                  {a}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Panel>
    </div>
  );
}

const SLIDES: {
  title: string;
  sub: string;
  visual: React.ReactNode;
}[] = [
  {
    title: "The smartest way to study abroad.",
    sub: "Start online in India, finish on campus abroad — and save ₹20–50 lakhs getting there.",
    visual: <PathwaySurface />,
  },
  {
    title: "Nine countries. One starting point.",
    sub: "Pick the destination that fits the career you want — and switch it later if it doesn’t.",
    visual: <DestinationsSurface />,
  },
  {
    title: "Programs for every global ambition.",
    sub: "MBA to AI — and you come out an alum of both institutions, not just one.",
    visual: <DomainsSurface />,
  },
  {
    title: "From the first call to the flight out.",
    sub: "1:1 counselling, scholarships and loan help, visa mocks — support the whole way through.",
    visual: <SupportSurface />,
  },
  {
    title: "Three lakh learners got here first.",
    sub: "A 98% admit rate, and an award shelf to match — you’re in good company.",
    visual: <CommunitySurface />,
  },
];

export function LoginForm({ error }: { error: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slide, setSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="flex h-screen gap-3 overflow-hidden bg-charcoal p-3 font-sans lg:p-4">
      {/* Left — auto-shifting showcase carousel */}
      <section
        className="relative hidden w-[56%] overflow-hidden rounded-[28px] bg-[#8c1f28] text-white lg:block"
      >
        {/* Same brand sky as the dashboard, blurred back so it reads as a
            surface rather than a photograph. */}
        <div className="cloud-pan cloud-front">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/showcase/clouds-red.png"
            alt=""
            aria-hidden
            className="scale-[1.45] blur-[34px]"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#8f1d26]/30 via-[#6b111c]/25 to-[#3a0810]/65" />


        <div className="absolute right-9 top-9 z-20 flex items-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === slide
                  ? "w-6 bg-white"
                  : "w-1.5 bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>

        {SLIDES.map((s, i) => (
          <div
            key={i}
            className={`absolute inset-0 flex flex-col justify-between p-12 transition-all duration-700 ease-out ${
              i === slide
                ? "translate-y-0 opacity-100"
                : "pointer-events-none translate-y-3 opacity-0"
            }`}
          >
            <div className="max-w-md">
              <h2 className="font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-white drop-shadow-[0_2px_16px_rgba(50,8,16,0.5)]">
                {s.title}
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-white/80 drop-shadow-[0_1px_10px_rgba(50,8,16,0.45)]">
                {s.sub}
              </p>
            </div>
            <div className="flex flex-1 items-center justify-center">
              {s.visual}
            </div>
          </div>
        ))}
      </section>

      {/* Right — auth (scrolls internally only if the screen is very short) */}
      <section className="flex flex-1 overflow-y-auto px-4 py-6">
        <div className="m-auto w-full max-w-[400px]">
          <div className="text-center">
            <Wordmark dark className="text-[26px]" />
            <h1 className="mt-6 text-[19px] font-semibold text-white">
              Sign in to Shortlisting
            </h1>
            <p className="mt-1.5 text-[14px] text-[#a3a29e]">
              Welcome back! Please sign in to continue
            </p>
          </div>

          <form action={login} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-[13px] font-medium text-[#d6d5d1]"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className={DARK_FIELD}
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-[13px] font-medium text-[#d6d5d1]"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={DARK_FIELD}
              />
            </div>

            {error && (
              <p className="text-[13px] text-[#f2968a]">
                Incorrect email or password.
              </p>
            )}

            <Button type="submit" variant="inverse" size="lg" className="w-full">
              Continue <span className="text-[10px] leading-none">▶</span>
            </Button>
          </form>

          <Divider dark label="or use a demo account" className="mt-7" />

          <div className="mt-3.5 overflow-hidden rounded-2xl border border-[#33322f] bg-[#222220]">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => {
                  setEmail(account.email);
                  setPassword("12345");
                }}
                className="flex w-full items-center justify-between border-b border-[#2c2b29] px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-white/[0.04]"
              >
                <span className="text-[13px] font-medium text-[#e8e7e3]">
                  {account.role}
                </span>
                <span className="text-[12px] text-[#77766f]">
                  {account.email}
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2.5 text-center text-[12px] text-[#77766f]">
            Click a row to fill the form. The password is 12345 for everyone.
          </p>

          <p className="mt-6 text-center text-[12px] text-[#5f5e58]">
            Internal prototype — demo data can be reset anytime.
          </p>
        </div>
      </section>
    </main>
  );
}
