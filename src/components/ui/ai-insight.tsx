import type { DocInsight } from "@/lib/doc-insights";

/**
 * The Google-style AI one-liner: a small gradient star and one quiet
 * sentence. The star carries the shortlisting brand gradient; the text stays
 * grey so the insight reads as a helpful aside, not another status.
 */
export function AiStar({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <linearGradient id="ai-star-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bd2a39" />
          <stop offset="55%" stopColor="#e33f42" />
          <stop offset="100%" stopColor="#f2685f" />
        </linearGradient>
      </defs>
      <path
        fill="url(#ai-star-grad)"
        d="M12 2.6c.3 0 .57.19.66.48l1.5 4.62a3.4 3.4 0 0 0 2.18 2.18l4.62 1.5a.7.7 0 0 1 0 1.33l-4.62 1.5a3.4 3.4 0 0 0-2.18 2.18l-1.5 4.62a.7.7 0 0 1-1.33 0l-1.5-4.62a3.4 3.4 0 0 0-2.18-2.18l-4.62-1.5a.7.7 0 0 1 0-1.33l4.62-1.5a3.4 3.4 0 0 0 2.18-2.18l1.5-4.62a.7.7 0 0 1 .67-.48Z"
      />
    </svg>
  );
}

export function AiInsightLine({ insight }: { insight: DocInsight }) {
  return (
    <div className="mb-1 mt-3 flex items-start gap-1.5">
      <AiStar className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p
        className={`text-[12px] leading-snug ${
          insight.tone === "warn" ? "text-[#8a6d2f]" : "text-body"
        }`}
      >
        {insight.text}
      </p>
    </div>
  );
}
