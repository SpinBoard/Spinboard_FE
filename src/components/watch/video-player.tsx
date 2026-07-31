"use client";

import { useRef, useState } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoPlayerProps {
  src?: string;
  onEnded?: () => void;
  className?: string;
}

export function VideoPlayer({ src, onEnded, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  const handleReplay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {});
  };

  if (!src || failed) {
    return (
      <div
        className={`aspect-video bg-card border border-border rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground ${className ?? ""}`}>
        <AlertCircle className="h-6 w-6 text-destructive" />
        <span className="text-sm">Video unavailable — try again shortly</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
      <video
        ref={videoRef}
        src={src}
        controls
        onEnded={onEnded}
        onError={() => setFailed(true)}
        className="w-full aspect-video rounded-lg border border-border bg-black"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleReplay}
        className="border-border text-foreground hover:bg-white/10">
        <RotateCcw className="h-4 w-4 mr-2" />
        Replay video
      </Button>
    </div>
  );
}
