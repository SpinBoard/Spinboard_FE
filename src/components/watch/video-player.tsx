"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Volume2, VolumeX } from "lucide-react";

interface VideoPlayerProps {
  src?: string;
  autoPlay?: boolean;
  onEnded?: () => void;
  onTimeUpdate?: (watchedMs: number, durationMs: number) => void;
  className?: string;
}

// Billboard playback surface: autoplaying, muted-by-default (so autoplay
// isn't blocked by the browser), no native scrub controls — just a mute
// toggle. Reports watch progress via onTimeUpdate for heartbeat/complete
// calls; the caller decides when a slot counts as "watched."
export function VideoPlayer({ src, autoPlay = true, onEnded, onTimeUpdate, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !onTimeUpdate) return;
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
