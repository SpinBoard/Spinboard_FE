"use client";

import { Gift, PlayCircle, Sparkles } from "lucide-react";

const PINNED_CODES = [
  { code: "PZL7K2Q9", value: "₦500 Airtime", position: "-top-4 left-6" },
  { code: "PZL3M8R4", value: "₦1,000 Cash", position: "-bottom-4 right-6" },
];

// A lightweight, static mockup of the billboard + pinned freebie-code strip
// for the landing page hero — not live data, just the visual concept.
export function HeroBillboard() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div className="relative aspect-video rounded-2xl border-4 border-white/10 bg-gradient-to-br from-primary/40 via-secondary/30 to-success/30 overflow-hidden shadow-2xl">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center animate-pulse">
            <PlayCircle className="h-9 w-9 text-white" />
          </div>
        </div>
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/40 text-xs text-white/80">
          <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
          LIVE
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden whitespace-nowrap py-1.5 bg-black/40">
          <div className="inline-flex items-center gap-2 px-3 text-xs text-white/70 animate-[marquee_12s_linear_infinite]">
            <Sparkles className="h-3 w-3 text-secondary flex-shrink-0" />
            Eyes on the edges — that&apos;s where the money shows up.
          </div>
        </div>
      </div>

      {PINNED_CODES.map((item) => (
        <div
          key={item.code}
          className={`absolute ${item.position} hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-secondary/40 bg-secondary/10 backdrop-blur-sm shadow-lg`}>
          <Gift className="h-3.5 w-3.5 text-secondary flex-shrink-0" />
          <span className="font-mono text-xs font-semibold text-secondary">{item.code}</span>
          <span className="text-[10px] text-white/60">{item.value}</span>
        </div>
      ))}

      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(-100%);
          }
        }
      `}</style>
    </div>
  );
}
