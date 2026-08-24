"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Volume2, VolumeX } from "lucide-react";

// The playing-bar window: every ad video is capped at 60s
// (video.maxDurationSeconds), so this is the reference length WhatsApp-style
// status bars fill over. A shorter video just fills the same bar faster.
const PLAYING_BAR_WINDOW_SEC = 60;

interface VideoPlayerProps {
  src?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (watchedMs: number, durationMs: number) => void;
  // Expected duration hint from the queue slot, used to size the playing
  // bar before the video's own metadata has loaded.
  expectedDurationSec?: number;
  className?: string;
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
  className,
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

  if (!src || failed) {
    return (
      <div
        className={`aspect-video bg-card border border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground ${className ?? ""}`}>
        <AlertCircle className="h-6 w-6 text-destructive" />
        <span className="text-sm">Video unavailable — moving on shortly</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <video
        ref={videoRef}
        src={src}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        onEnded={onEnded}
        onError={() => setFailed(true)}
        onTimeUpdate={handleTimeUpdate}
        className="w-full aspect-video rounded-lg border border-border bg-black object-contain"
      />
      <div className="absolute top-2 left-2 right-2 h-1.5 rounded-full bg-black/40 overflow-hidden">
        <div
          className="h-full bg-yellow-400 rounded-full transition-[width] duration-150 ease-linear"
          style={{ width: `${progress * 100}%` }}
        />
      </div>
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
