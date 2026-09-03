"use client";

import { PlayCircle, Sparkles } from "lucide-react";

// A lightweight, static mockup of the billboard for the landing page hero —
// not live data, just the visual concept.
//
// Per explicit product feedback on the real board (perimeter-strip.tsx),
// freebie codes never hang pinned off a frame's corners — they only ever
// show up in the scrolling strip. This mockup used to have two chips
// absolutely positioned off its top/bottom corners; those are gone, and the
// ticker text points at the strip instead of "the edges."
export function HeroBillboard() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div
        className="relative aspect-video rounded-2xl overflow-hidden"
        style={{
          border: "4px solid var(--line-2)",
          background: "linear-gradient(135deg, rgba(124,92,255,.35), rgba(255,210,63,.25), rgba(61,220,151,.25))",
          boxShadow: "var(--shadow)",
        }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse" style={{ background: "rgba(255,255,255,.15)" }}>
            <PlayCircle className="h-9 w-9" style={{ color: "var(--txt)" }} />
          </div>
        </div>
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs" style={{ background: "rgba(0,0,0,.4)", color: "var(--txt)" }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "var(--spent)" }} />
          LIVE
        </div>
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden whitespace-nowrap py-1.5" style={{ background: "rgba(0,0,0,.4)" }}>
          <div className="inline-flex items-center gap-6 px-3 text-xs animate-[marquee_16s_linear_infinite]" style={{ color: "var(--muted)" }}>
            <span className="inline-flex items-center gap-2 flex-shrink-0">
              <Sparkles className="h-3 w-3 flex-shrink-0" style={{ color: "var(--brand)" }} />
              Eyes on the strip — that&apos;s where the money shows up.
            </span>
            <span className="inline-flex items-center gap-2 flex-shrink-0">
              <Sparkles className="h-3 w-3 flex-shrink-0" style={{ color: "var(--brand)" }} />
              Eyes on the screen — money shows up there too.
            </span>
          </div>
        </div>
      </div>

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
