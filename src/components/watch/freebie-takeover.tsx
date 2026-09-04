"use client";

import { useEffect, useRef, useState } from "react";
import { Gift } from "lucide-react";
import { PlayingBar, PLAYING_BAR_WINDOW_SEC } from "./playing-bar";
import { VoucherChip } from "@/components/ui/freebiz-voucher-chip";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";

interface FreebieTakeoverProps {
  publicCode: string;
  valueLabel?: string;
  durationSec: number;
  onEnded?: () => void;
  onTimeUpdate?: (watchedMs: number, durationMs: number) => void;
  onClaim?: (code: string) => void;
  className?: string;
}

const TICK_MS = 200;

// A live freebie code takes over one billboard slot full-screen, at most
// once per session per code, and plays through the exact same
// heartbeat/complete loop as an AD/HOUSE banner slot — there's just no
// image being displayed, so a client-side timer stands in for the timing
// a real element's events would otherwise drive. Styled to match
// BannerPlayer's .screenface frame so both slot types read as one
// continuous board.
export function FreebieTakeover({
  publicCode,
  valueLabel,
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
      className={`relative aspect-video rounded-lg border overflow-hidden flex flex-col items-center justify-center gap-4 px-6 text-center ${
        className ?? ""
      }`}
      style={{
        background: "radial-gradient(120% 90% at 50% 15%, var(--ink-600), var(--ink-700) 62%, var(--ink-900))",
        borderColor: "var(--line)",
      }}>
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "var(--accent-soft)" }}>
        <Gift className="h-8 w-8" style={{ color: "var(--accent)" }} />
      </div>

      <div className="space-y-3">
        <Pill tone="live" dot>
          Cash code · live now
        </Pill>
        <div>
          <VoucherChip code={publicCode} value={valueLabel} />
        </div>
      </div>

      <Button type="button" variant="primary" onClick={() => onClaim?.(publicCode)}>
        Type it below before someone else does
      </Button>

      <div
        className="absolute bottom-0 inset-x-0 px-4 pt-6 pb-3"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,.55), transparent)" }}>
        <PlayingBar progress={progress} />
      </div>
    </div>
  );
}
