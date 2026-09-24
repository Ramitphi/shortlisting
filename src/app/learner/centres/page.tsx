"use client";

import { useEffect, useState } from "react";
import { useDbVersion } from "@/components/db-provider";
import { requireRole } from "@/components/shell";
import { UpgradShell } from "@/components/upgrad-shell";
import { listApplications } from "@/lib/queries";

/**
 * Centres — the walk-in offices, nearest one first.
 *
 * The page opens on ONE centre, sized to the top third of the screen: the one
 * the learner could actually reach today. Which that is depends on where they
 * are standing, so the browser is asked for coordinates and the list is sorted
 * by great-circle distance. Everything below is the full estate, shuffled, so
 * no city is permanently top of the page for reasons nobody chose.
 *
 * Location is asked for, never required. Refused, unavailable or still being
 * decided, the hero falls back to a named default and says so — the page is
 * never blocked on a permission dialog.
 *
 * Demo records. The three Punjab/Himachal entries follow the live listings;
 * the rest are city-level stand-ins on one real helpline number, so nothing
 * here dials a number that was invented.
 */

const HELPLINE = "0731 440 9045";

type Centre = {
  id: string;
  city: string;
  address: string;
  hours: string;
  phone: string;
  rating: number;
  reviews: number;
  lat: number;
  lng: number;
};

const HOURS = "10:00 AM to 8:00 PM | Monday to Sunday";

const CENTRES: Centre[] = [
  { id: "chandigarh", city: "Chandigarh", address: "Second Floor, SCO 364-365-366, Sector 34A, Sector 34, Chandigarh, Punjab", hours: HOURS, phone: HELPLINE, rating: 4.8, reviews: 42, lat: 30.7236, lng: 76.7693 },
  { id: "ludhiana", city: "Ludhiana", address: "Bhai Wala Chowk, Ghumar Mandi, Ludhiana, Punjab 141001", hours: HOURS, phone: "0731 440 9075", rating: 4.8, reviews: 18, lat: 30.8998, lng: 75.8573 },
  { id: "shimla", city: "Shimla", address: "74, Sanjauli Engine Ghar, Shimla, Himachal Pradesh", hours: HOURS, phone: "07314623895", rating: 4.5, reviews: 11, lat: 31.1048, lng: 77.1734 },
  { id: "delhi", city: "New Delhi", address: "Connaught Place, New Delhi, Delhi 110001", hours: HOURS, phone: HELPLINE, rating: 4.7, reviews: 96, lat: 28.6304, lng: 77.2177 },
  { id: "gurugram", city: "Gurugram", address: "Sector 44, Gurugram, Haryana 122003", hours: HOURS, phone: HELPLINE, rating: 4.6, reviews: 74, lat: 28.4595, lng: 77.0266 },
  { id: "mumbai", city: "Mumbai", address: "Andheri East, Mumbai, Maharashtra 400069", hours: HOURS, phone: HELPLINE, rating: 4.7, reviews: 130, lat: 19.1136, lng: 72.8697 },
  { id: "pune", city: "Pune", address: "Baner Road, Pune, Maharashtra 411045", hours: HOURS, phone: HELPLINE, rating: 4.6, reviews: 58, lat: 18.559, lng: 73.7868 },
  { id: "bengaluru", city: "Bengaluru", address: "Koramangala, Bengaluru, Karnataka 560034", hours: HOURS, phone: HELPLINE, rating: 4.8, reviews: 112, lat: 12.9352, lng: 77.6245 },
  { id: "hyderabad", city: "Hyderabad", address: "HITEC City, Hyderabad, Telangana 500081", hours: HOURS, phone: HELPLINE, rating: 4.6, reviews: 67, lat: 17.4435, lng: 78.3772 },
  { id: "ahmedabad", city: "Ahmedabad", address: "CG Road, Ahmedabad, Gujarat 380009", hours: HOURS, phone: HELPLINE, rating: 4.5, reviews: 39, lat: 23.0225, lng: 72.5714 },
  { id: "jaipur", city: "Jaipur", address: "C-Scheme, Jaipur, Rajasthan 302001", hours: HOURS, phone: HELPLINE, rating: 4.6, reviews: 44, lat: 26.9124, lng: 75.7873 },
  { id: "kolkata", city: "Kolkata", address: "Salt Lake City, Kolkata, West Bengal 700091", hours: HOURS, phone: HELPLINE, rating: 4.5, reviews: 51, lat: 22.5726, lng: 88.3639 },
  { id: "chennai", city: "Chennai", address: "T. Nagar, Chennai, Tamil Nadu 600017", hours: HOURS, phone: HELPLINE, rating: 4.6, reviews: 63, lat: 13.0418, lng: 80.2341 },
  { id: "indore", city: "Indore", address: "Vijay Nagar, Indore, Madhya Pradesh 452010", hours: HOURS, phone: HELPLINE, rating: 4.7, reviews: 29, lat: 22.7196, lng: 75.8577 },
];

/** Where the hero lands before the browser says where the learner is. */
const DEFAULT_CENTRE = CENTRES[0];

/** Great-circle distance in km — close enough to rank offices by. */
function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const embedSrc = (c: Centre) =>
  `https://maps.google.com/maps?q=${c.lat},${c.lng}&z=15&output=embed`;
const mapsLink = (c: Centre) =>
  `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lng}`;

function IconPin({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

function IconPhone({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />
    </svg>
  );
}

function IconClockSmall({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

/** Five stars, filled to the rating — halves included, as the listings show. */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rating - i));
        return (
          <span key={i} className="relative inline-block h-4 w-4">
            <svg viewBox="0 0 24 24" className="absolute inset-0 h-4 w-4 text-line-strong" fill="currentColor" aria-hidden>
              <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 9.7l5.8-.8z" />
            </svg>
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#f5a623]" fill="currentColor" aria-hidden>
                <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 9.7l5.8-.8z" />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}

function DetailRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 text-[14px] leading-relaxed text-body">
      <span className="mt-0.5 shrink-0 text-caption">{icon}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

type Located =
  | { state: "asking" }
  | { state: "ok"; lat: number; lng: number }
  | { state: "off"; why: string };

export default function LearnerCentresPage({
  searchParams,
}: {
  /** `?at=lat,lng` stands in for the browser's location — see below. */
  searchParams: { at?: string };
}) {
  // Re-render on any browser-db or session change.
  useDbVersion();
  const user = requireRole("learner");
  const app = listApplications({ learnerId: user.id })[0];

  const [located, setLocated] = useState<Located>({ state: "asking" });
  // Shuffled AFTER mount, never during render: a random order computed while
  // rendering differs between the server pass and the client one, and React
  // throws away the markup over it.
  const [shuffled, setShuffled] = useState<Centre[]>(CENTRES);

  useEffect(() => {
    const list = [...CENTRES];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    setShuffled(list);
  }, []);

  // A demo needs to be able to stand somewhere. Real GPS can't be faked on a
  // laptop in a meeting room, and the interesting half of this page is the
  // half that only appears once a location is known — so `?at=19.1,72.87`
  // pins the learner there. Nothing in the UI offers it; it is for showing
  // the page, and the live path below is untouched by it.
  const pinned = (() => {
    const raw = searchParams.at;
    if (!raw) return null;
    const [lat, lng] = raw.split(",").map(Number);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  })();

  useEffect(() => {
    if (pinned) {
      setLocated({ state: "ok", lat: pinned.lat, lng: pinned.lng });
      return;
    }
    if (!("geolocation" in navigator)) {
      setLocated({ state: "off", why: "This browser can't share a location." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setLocated({
          state: "ok",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () =>
        setLocated({
          state: "off",
          why: "Allow location access to see the centre closest to you.",
        }),
      { timeout: 8000, maximumAge: 300000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.at]);

  const ranked =
    located.state === "ok"
      ? [...CENTRES]
          .map((c) => ({ c, km: distanceKm(located, c) }))
          .sort((a, b) => a.km - b.km)
      : null;

  const nearest = ranked ? ranked[0].c : DEFAULT_CENTRE;
  const nearestKm = ranked ? ranked[0].km : null;

  return (
    <UpgradShell user={user} section="centres" appId={app?.id ?? null}>
      {/* ── The one centre that matters right now ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[28px] font-medium tracking-tight">
          upGrad Study Abroad Helpline in{" "}
          <span className="text-accent">{nearest.city}</span>
        </h1>
        {nearestKm !== null && (
          <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-[13px] text-body">
            {nearestKm < 1
              ? "Less than a km away"
              : `${nearestKm.toFixed(nearestKm < 10 ? 1 : 0)} km away`}
          </span>
        )}
      </div>
      <p className="mt-1 text-[14px] text-body">
        {located.state === "asking"
          ? "Finding the centre closest to you…"
          : located.state === "ok"
            ? "Your closest centre, by your current location."
            : located.why}
      </p>

      {/* Sized to a QUARTER of the screen, give or take: the nearest centre
          leads the page, but the estate under it has to be visible without
          scrolling or the ranking is the only thing anyone sees. The map is
          measured in vh so the band holds on a laptop and a large monitor
          alike, with pixel bounds either side to stop it collapsing or
          ballooning. */}
      <div className="card mt-4 flex flex-col gap-6 p-5 md:flex-row">
        <iframe
          src={embedSrc(nearest)}
          title={`Map of the upGrad Study Abroad centre in ${nearest.city}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-[20vh] max-h-[210px] min-h-[155px] w-full shrink-0 rounded-xl border border-line md:w-[46%]"
        />

        <div className="flex min-w-0 flex-col justify-center gap-3">
          <DetailRow icon={<IconPin />}>{nearest.address}</DetailRow>
          <DetailRow icon={<IconClockSmall />}>{nearest.hours}</DetailRow>
          <DetailRow icon={<IconPhone />}>
            <a href={`tel:${nearest.phone.replace(/\s/g, "")}`} className="hover:text-ink hover:underline">
              {nearest.phone}
            </a>
          </DetailRow>

          <div className="flex flex-wrap items-center gap-2.5">
            <Stars rating={nearest.rating} />
            <span className="text-[15px] font-medium text-ink">{nearest.rating}</span>
            <span className="text-[13.5px] text-body">
              from {nearest.reviews} Google reviews
            </span>
          </div>

          {/* Directions, not "Book a free visit" — there is no booking flow
              behind this prototype, and a button that does nothing is worse
              than one that does the useful thing. */}
          <div className="mt-1 flex flex-wrap gap-3">
            <a href={mapsLink(nearest)} target="_blank" rel="noreferrer" className="btn-primary">
              Get directions
            </a>
            <a href={`tel:${nearest.phone.replace(/\s/g, "")}`} className="btn-secondary">
              Call this centre
            </a>
          </div>
        </div>
      </div>

      {/* ── The whole estate ── */}
      <h2 className="mt-6 text-[22px] font-medium tracking-tight">
        All upGrad Study Abroad Centres
      </h2>
      <p className="mt-1 text-[14px] text-body">
        Walk into any of them for counselling on universities, courses,
        applications and visas.
      </p>

      {/* The estate scrolls inside its own frame; the nearest centre above it
          never moves. Same quiet scrollbar as the alumni wall — the clipped
          row at the bottom edge is what says there is more. */}
      <div className="scroll-quiet mt-4 max-h-[34vh] overflow-y-auto">
        <div className="grid gap-5 grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
          {shuffled.map((c) => (
            <div key={c.id} className="card overflow-hidden">
              <div className="relative">
                <iframe
                  src={embedSrc(c)}
                  title={`Map of the upGrad Study Abroad centre in ${c.city}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  className="h-[128px] w-full border-b border-line"
                />
                <a
                  href={mapsLink(c)}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute left-3 top-3 rounded-lg bg-white px-2.5 py-1.5 text-[12.5px] font-medium text-ink shadow-sm hover:bg-muted"
                >
                  Open in Maps
                </a>
              </div>

              <div className="flex flex-col gap-2 p-5">
                <h3 className="text-[16px] font-medium leading-snug">
                  upGrad Study Abroad Consultant Helpline in {c.city}
                </h3>
                <DetailRow icon={<IconPin />}>{c.address}</DetailRow>
                <DetailRow icon={<IconClockSmall />}>{c.hours}</DetailRow>
                <DetailRow icon={<IconPhone />}>
                  <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="hover:text-ink hover:underline">
                    {c.phone}
                  </a>
                </DetailRow>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-medium text-ink">{c.rating}</span>
                  <Stars rating={c.rating} />
                  <span className="text-[12.5px] text-body">
                    from {c.reviews} Google reviews
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </UpgradShell>
  );
}
