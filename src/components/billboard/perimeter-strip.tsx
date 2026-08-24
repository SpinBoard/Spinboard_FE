"use client";

import { useMemo } from "react";
import { Gift, Sparkles } from "lucide-react";
import { StripFeedItem } from "@/types";

interface PerimeterStripProps {
  items: StripFeedItem[];
}

// Freebie codes only ever exist in the feed once they're actually live —
// no "coming soon" state exists anywhere. AVAILABLE renders static/pinned
// (it needs to be readable and typeable); TAKEN renders red for a short
// grace window before it drops out of the feed entirely.
function FreebiePill({ item }: { item: StripFeedItem }) {
  const taken = item.state === "TAKEN";
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-mono font-semibold transition-colors ${
        taken
          ? "bg-destructive/10 border-destructive/40 text-destructive line-through"
          : "bg-secondary/10 border-secondary/40 text-secondary"
      }`}>
      <Gift className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="whitespace-nowrap">{item.publicCode}</span>
      <span className="text-xs font-normal text-muted-foreground whitespace-nowrap">
        {item.valueLabel}
      </span>
    </div>
  );
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

// Promo phrases and live freebie codes, mixed and shuffled together so the
// strip alternates between hype text and "here's a code, go type it"
// call-outs instead of two separate lanes. The pinned strips (positioned
// around the video frame) remain the actual click-to-type surface for a
// freebie — this is just extra visibility for it while it scrolls by.
function ScrollingPromo({ promos, freebies }: { promos: StripFeedItem[]; freebies: StripFeedItem[] }) {
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

  const signature =
    promoEntries.map((e) => e.key).join(",") + "|" + freebieEntries.map((e) => e.key).join(",");

  const entries = useMemo(
    () => shuffled([...promoEntries, ...freebieEntries], signature),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature]
  );

  if (entries.length === 0) return null;
  // Duplicate the run so the marquee loops seamlessly.
  const run = [...entries, ...entries];
  return (
    <div className="overflow-hidden whitespace-nowrap py-2 border-y border-border bg-white/5">
      <div className="inline-flex animate-marquee gap-10">
        {run.map((entry, i) =>
          entry.kind === "freebie" ? (
            <span
              key={`${entry.key}-${i}`}
              className="inline-flex items-center gap-2 text-sm font-mono font-semibold text-secondary">
              <Gift className="h-3.5 w-3.5 flex-shrink-0" />
              {entry.code}
              {entry.value && (
                <span className="text-xs font-normal font-sans text-muted-foreground">
                  {entry.value}
                </span>
              )}
            </span>
          ) : (
            <span
              key={`${entry.key}-${i}`}
              className="inline-flex items-center gap-2 text-sm text-foreground/80">
              <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
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
      `}</style>
    </div>
  );
}

export function PerimeterStrip({ items }: PerimeterStripProps) {
  const freebies = items.filter((i) => i.kind === "FREEBIE");
  const promos = items.filter((i) => i.kind === "PROMO");

  const byPosition = (hint: string) =>
    freebies.filter((i) => i.positionHint === hint);

  const top = byPosition("TOP");
  const bottom = byPosition("BOTTOM");
  const left = byPosition("LEFT");
  const right = byPosition("RIGHT");

  return (
    <div className="space-y-3">
      {top.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 justify-center">
          {top.map((item) => (
            <FreebiePill key={item.codeId} item={item} />
          ))}
        </div>
      )}

      {(left.length > 0 || right.length > 0) && (
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {left.map((item) => (
              <FreebiePill key={item.codeId} item={item} />
            ))}
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            {right.map((item) => (
              <FreebiePill key={item.codeId} item={item} />
            ))}
          </div>
        </div>
      )}

      {bottom.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 justify-center">
          {bottom.map((item) => (
            <FreebiePill key={item.codeId} item={item} />
          ))}
        </div>
      )}

      <ScrollingPromo promos={promos} freebies={freebies} />
    </div>
  );
}
