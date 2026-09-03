"use client";

import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { StripFeedItem } from "@/types";
import { VoucherChip } from "@/components/ui/freebiz-voucher-chip";
import { useNextDropWindow } from "@/hooks/use-freebies";

interface PerimeterStripProps {
  items: StripFeedItem[];
}

type MarqueeEntry =
  | { key: string; kind: "promo"; text: string }
  | { key: string; kind: "freebie"; code: string; value?: string };

// Fisher-Yates, seeded off a content signature rather than Math.random alone
// so the mix only reshuffles when the underlying feed actually changes, not
// on every ~3s poll tick that happens to return the same items.
function shuffled<T>(list: T[], seed: string): T[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const rand = () => {
    h = (h * 1103515245 + 12345) | 0;
    return (h >>> 0) / 0xffffffff;
  };
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// A live freebie code no longer only shows up pinned in the strip — it can
// also take over the billboard screen full-screen for a stretch of time.
// These client-side hints tell viewers to keep an eye on the screen itself,
// not just the strip, since that's easy to miss otherwise.
const WATCH_SCREEN_HINTS: MarqueeEntry[] = [
  { key: "hint-screen-takeover", kind: "promo", text: "Keep watching — a freebie code can take over your whole screen." },
  { key: "hint-screen-fullscreen", kind: "promo", text: "Freebies don't just show up on the strip — watch for a full-screen drop too." },
];

function formatWindowTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone });
}

// The calendar date of `date` as it reads in `timeZone`, not the browser's
// local zone — "today"/"tomorrow" have to be judged against the zone the
// window itself is anchored to (Africa/Lagos), not wherever the viewer is.
function dateKeyInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

// Bug found 2026-08-29: the ticker was showing only hour:minute
// (windowStart/windowEnd carry a full date, always did — the API never
// lost this, the frontend was just discarding it), so a window past
// midnight read as an ambiguous "8:00 AM-9:00 AM" with no way to tell it
// was tomorrow morning, not today. Frontend-only fix — no backend change.
function formatWindowDayLabel(windowStartIso: string, timeZone: string): string {
  const windowDate = new Date(windowStartIso);
  const now = new Date();
  const windowKey = dateKeyInZone(windowDate, timeZone);
  if (windowKey === dateKeyInZone(now, timeZone)) return "Today";
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  if (windowKey === dateKeyInZone(tomorrow, timeZone)) return "Tomorrow";
  // Defensive — the "next" window shouldn't ever be further out than
  // tomorrow given how frequently drops happen, but don't show a wrong
  // "Today"/"Tomorrow" label if it somehow is.
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "short", day: "numeric" }).format(windowDate);
}

// design/freebiz-mockup.html's .strip/.track — a thin, always-moving ticker.
// Promo phrases, live freebie codes, the static "watch the screen" hints,
// and the next-drop-window heads-up (added 2026-08-29, GET
// /freebies/next-drop-window — a fixed, clock-aligned window whose duration
// is server-config and has already changed once live (1h and 2h both
// observed — don't assume a fixed length), reversing BUSINESS_RULES.md's
// earlier "no way to see a future drop, unpredictability is the point"
// rule) are all mixed and shuffled together so the strip
// alternates between hype text and "here's a code, go type it" call-outs
// instead of separate lanes. This scrolling ticker is now the ONLY place a
// live freebie code shows up outside of its one full-screen billboard
// takeover — a separate row of static chips pinned to the video frame's
// edges (by positionHint: TOP/BOTTOM/LEFT/RIGHT) used to render underneath
// this and was pulled per explicit product feedback: it duplicated codes
// already in the ticker and visually looked like it was "hanging" off the
// player.
function Ticker({ promos, freebies }: { promos: StripFeedItem[]; freebies: StripFeedItem[] }) {
  const { data: nextDropWindow } = useNextDropWindow();

  const promoEntries: MarqueeEntry[] = promos
    .filter((i) => i.text)
    .map((i, idx) => ({ key: `promo-${idx}-${i.text}`, kind: "promo", text: i.text as string }));

  const freebieEntries: MarqueeEntry[] = freebies
    .filter((i) => i.state === "AVAILABLE" && i.publicCode)
    .map((i) => ({
      key: `freebie-${i.codeId}`,
      kind: "freebie",
      code: i.publicCode as string,
      value: i.valueLabel,
    }));

  // A fixed, clock-aligned window (duration is server-config, not assumed
  // here), never the exact scheduled instant or the prize type — see the
  // NextDropWindow comment in src/types/index.ts.
  const dropWindowEntries: MarqueeEntry[] = nextDropWindow
    ? [
        {
          key: `drop-window-${nextDropWindow.windowStart}`,
          kind: "promo",
          text: `Next freebie window: ${formatWindowDayLabel(nextDropWindow.windowStart, nextDropWindow.timeZone)} ${formatWindowTime(nextDropWindow.windowStart, nextDropWindow.timeZone)}–${formatWindowTime(nextDropWindow.windowEnd, nextDropWindow.timeZone)} (${nextDropWindow.timeZone})`,
        },
      ]
    : [];

  const signature =
    promoEntries.map((e) => e.key).join(",") +
    "|" +
    freebieEntries.map((e) => e.key).join(",") +
    "|" +
    dropWindowEntries.map((e) => e.key).join(",");

  const entries = useMemo(
    () => shuffled([...promoEntries, ...freebieEntries, ...WATCH_SCREEN_HINTS, ...dropWindowEntries], signature),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature]
  );

  if (entries.length === 0) return null;
  // Duplicate the run so the marquee loops seamlessly.
  const run = [...entries, ...entries];
  return (
    <div className="overflow-hidden whitespace-nowrap" style={{ background: "var(--ink-900)" }}>
      <div className="inline-flex animate-marquee items-center gap-8 py-1.5">
        {run.map((entry, i) =>
          entry.kind === "freebie" ? (
            <VoucherChip key={`${entry.key}-${i}`} code={entry.code} value={entry.value} />
          ) : (
            <span
              key={`${entry.key}-${i}`}
              className="inline-flex items-center gap-2 whitespace-nowrap"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10.5,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--free)",
                opacity: 0.85,
              }}>
              <Sparkles className="h-3 w-3 flex-shrink-0" />
              {entry.text}
            </span>
          )
        )}
      </div>
      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          animation: marquee 25s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

export function PerimeterStrip({ items }: PerimeterStripProps) {
  const freebies = items.filter((i) => i.kind === "FREEBIE");
  const promos = items.filter((i) => i.kind === "PROMO");

  return <Ticker promos={promos} freebies={freebies} />;
}
