"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { PlayingBar, PLAYING_BAR_WINDOW_SEC } from "./playing-bar";

interface BannerPlayerProps {
  src?: string;
  onEnded?: () => void;
  onTimeUpdate?: (watchedMs: number, durationMs: number) => void;
  // Fixed platform-wide display length (Config: billboard.bannerDisplaySeconds,
  // 15s) — every AD/HOUSE slot uses the same value, but this is still passed
  // in from the queue slot rather than hardcoded, same as VideoPlayer took
  // expectedDurationSec.
  durationSec: number;
  // "Now playing — Brand · Title" overlay, matching
  // design/freebiz-mockup.html's .screenface .face-top.
  brandLabel?: string;
  title?: string;
  className?: string;
  // AD-only click-through — present iff the slot carried a clickUrl.
  clickUrl?: string | null;
  onClickThrough?: () => void;
}

const TICK_MS = 200;

// Renamed from VideoPlayer (2026-09-03) — ad campaigns moved from video to
// a static banner image, consuming too much hosting cost. There's no
// <video> element to drive timing anymore, so this mirrors
// FreebieTakeover's client-side interval timer against a known
// durationSec instead of listening for onTimeUpdate/onEnded DOM events.
// No mute button — a static image has no audio track.
export function BannerPlayer({
  src,
  onEnded,
  onTimeUpdate,
  durationSec,
  brandLabel,
  title,
  className,
  clickUrl,
  onClickThrough,
}: BannerPlayerProps) {
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const endedRef = useRef(false);

  useEffect(() => {
    setFailed(false);
    setProgress(0);
    endedRef.current = false;

    if (!src) return;

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
  }, [src, durationSec]);

  const screenfaceStyle = {
    background: "radial-gradient(120% 90% at 50% 12%, var(--ink-600), var(--ink-700) 62%, var(--ink-900))",
  };

  if (!src || failed) {
    return (
      <div
        className={`relative aspect-video rounded-lg border overflow-hidden flex flex-col items-center justify-center gap-2 ${className ?? ""}`}
        style={{ ...screenfaceStyle, borderColor: "var(--line)", color: "var(--muted)" }}>
        <span className="text-sm">Banner unavailable — moving on shortly</span>
      </div>
    );
  }

  return (
    <div
      className={`relative aspect-video rounded-lg border overflow-hidden ${className ?? ""}`}
      style={{ ...screenfaceStyle, borderColor: "var(--line)" }}>
      {(brandLabel || title) && (
        <div
          className="absolute top-0 inset-x-0 px-4 py-2.5 z-10"
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.55), transparent)" }}>
          <span className="text-xs sm:text-[13px]" style={{ color: "var(--muted)" }}>
            Now showing — <b style={{ color: "var(--txt)" }}>{brandLabel}</b>
            {title && <> · &quot;{title}&quot;</>}
          </span>
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={title ?? brandLabel ?? "Sponsored banner"}
        onError={() => setFailed(true)}
        className="w-full h-full object-contain"
      />

      <div
        className="absolute bottom-0 inset-x-0 px-4 pt-6 pb-3 z-10"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,.55), transparent)" }}>
        <PlayingBar progress={progress} />
      </div>

      {clickUrl && (
        <button
          type="button"
          onClick={onClickThrough}
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
          style={{ background: "var(--accent)", color: "var(--ink-900)", fontSize: 12.5, fontWeight: 700 }}>
          Visit site
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
