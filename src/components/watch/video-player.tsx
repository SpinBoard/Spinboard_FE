"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Volume2, VolumeX } from "lucide-react";
import { PlayingBar, PLAYING_BAR_WINDOW_SEC } from "./playing-bar";

interface VideoPlayerProps {
  src?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (watchedMs: number, durationMs: number) => void;
  // Expected duration hint from the queue slot, used to size the playing
  // bar before the video's own metadata has loaded.
  expectedDurationSec?: number;
  // "Now playing — Brand · Title" overlay, matching
  // design/freebiz-mockup.html's .screenface .face-top. Data the caller
  // already has from the queue slot — just moved into the frame instead of
  // rendered as a caption underneath it.
  brandLabel?: string;
  title?: string;
  className?: string;
  // AD-only click-through (2026-09-02) — present iff the slot carried a
  // clickUrl. The caller (watch/page.tsx) owns navigation + the
  // fire-and-forget click-tracking call; this component just renders the
  // affordance and invokes the callback, it never navigates itself.
  clickUrl?: string | null;
  onClickThrough?: () => void;
}

// Billboard playback surface: autoplaying, muted-by-default (so autoplay
// isn't blocked by the browser), no native scrub controls — just a mute
// toggle. Reports watch progress via onTimeUpdate for heartbeat/complete
// calls; the caller decides when a slot counts as "watched."
export function VideoPlayer({
  src,
  autoPlay = true,
  onEnded,
  onTimeUpdate,
  expectedDurationSec,
  brandLabel,
  title,
  className,
  clickUrl,
  onClickThrough,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setFailed(false);
    setProgress(0);
  }, [src]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;

    const durationSec =
      video.duration && isFinite(video.duration) ? video.duration : expectedDurationSec;
    const barWindow = Math.min(durationSec || PLAYING_BAR_WINDOW_SEC, PLAYING_BAR_WINDOW_SEC);
    setProgress(barWindow > 0 ? Math.min(video.currentTime / barWindow, 1) : 0);

    if (!onTimeUpdate) return;
    onTimeUpdate(video.currentTime * 1000, (video.duration || 0) * 1000);
  };

  const screenfaceStyle = {
    background: "radial-gradient(120% 90% at 50% 12%, var(--ink-600), var(--ink-700) 62%, var(--ink-900))",
  };

  if (!src || failed) {
    return (
      <div
        className={`relative aspect-video rounded-lg border overflow-hidden flex flex-col items-center justify-center gap-2 ${className ?? ""}`}
        style={{ ...screenfaceStyle, borderColor: "var(--line)", color: "var(--muted)" }}>
        <span className="text-sm">Video unavailable — moving on shortly</span>
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
            Now playing — <b style={{ color: "var(--txt)" }}>{brandLabel}</b>
            {title && <> · &quot;{title}&quot;</>}
          </span>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        onEnded={onEnded}
        onError={() => setFailed(true)}
        onTimeUpdate={handleTimeUpdate}
        className="w-full h-full object-contain"
      />

      <div
        className="absolute bottom-0 inset-x-0 px-4 pt-6 pb-3 z-10"
        style={{ background: "linear-gradient(to top, rgba(0,0,0,.55), transparent)" }}>
        <PlayingBar progress={progress} />
      </div>

      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute top-2.5 right-3 p-2 rounded-full z-10 transition-colors"
        style={{ background: "rgba(0,0,0,.5)", color: "var(--txt)" }}>
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

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
