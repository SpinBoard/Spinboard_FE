"use client";

import { useEffect, useRef, useState } from "react";
import { Gift } from "lucide-react";
import { PlayingBar, PLAYING_BAR_WINDOW_SEC } from "./playing-bar";

interface FreebieTakeoverProps {
  publicCode: string;
  valueLabel?: string;
  freebieType?: "AIRTIME" | "CASH";
  durationSec: number;
  onEnded?: () => void;
  onTimeUpdate?: (watchedMs: number, durationMs: number) => void;
  onClaim?: (code: string) => void;
  className?: string;
}

const TICK_MS = 200;

// A live freebie code takes over one billboard slot full-screen, at most
// once per session per code, and plays through the exact same
// heartbeat/complete loop as an AD/HOUSE video slot — there's just no
// videoUrl to drive it, so a client-side timer stands in for the <video>
// element's own timeupdate/ended events.
export function FreebieTakeover({
  publicCode,
  valueLabel,
  freebieType,
  durationSec,
  onEnded,
  onTimeUpdate,
  onClaim,
  className,
}: FreebieTakeoverProps) {
  const [progress, setProgress] = useState(0);
  const endedRef = useRef(false);

  useEffect(() => {
    endedRef.current = false;
    setProgress(0);

    const durationMs = durationSec * 1000;
    const barWindow = Math.min(durationSec, PLAYING_BAR_WINDOW_SEC);
    const start = Date.now();

    const interval = setInterval(() => {
      const elapsedMs = Math.min(Date.now() - start, durationMs);
      setProgress(barWindow > 0 ? Math.min(elapsedMs / 1000 / barWindow, 1) : 0);
      onTimeUpdate?.(elapsedMs, durationMs);

      if (elapsedMs >= durationMs && !endedRef.current) {
        endedRef.current = true;
        onEnded?.();
      }
    }, TICK_MS);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicCode, durationSec]);

  return (
    <div
      className={`relative aspect-video rounded-lg border border-border bg-gradient-to-br from-primary/40 via-secondary/30 to-success/30 overflow-hidden flex flex-col items-center justify-center gap-4 px-6 text-center ${
        className ?? ""
      }`}>
      <PlayingBar progress={progress} />
      <div className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center">
        <Gift className="h-8 w-8 text-white" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-white/70 mb-2">
          A {freebieType === "CASH" ? "cash" : "freebie"} code just took over the screen
        </p>
        <p className="font-mono text-3xl sm:text-4xl font-bold text-white break-all">{publicCode}</p>
        {valueLabel && <p className="text-white/80 mt-1">{valueLabel}</p>}
      </div>
      <button
        type="button"
        onClick={() => onClaim?.(publicCode)}
        className="px-5 py-2.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-white/90 transition-colors">
        Type it below before someone else does
      </button>
    </div>
  );
}
