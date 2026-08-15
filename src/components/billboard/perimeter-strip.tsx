"use client";

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

function ScrollingPromo({ items }: { items: StripFeedItem[] }) {
  const texts = items.map((i) => i.text).filter(Boolean) as string[];
  if (texts.length === 0) return null;
  // Duplicate the run so the marquee loops seamlessly.
  const run = [...texts, ...texts];
  return (
    <div className="overflow-hidden whitespace-nowrap py-2 border-y border-border bg-white/5">
      <div className="inline-flex animate-marquee gap-10">
        {run.map((text, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-sm text-foreground/80">
            <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            {text}
          </span>
        ))}
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

      <ScrollingPromo items={promos} />
    </div>
  );
}
