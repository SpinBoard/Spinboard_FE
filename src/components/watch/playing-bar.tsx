"use client";

// The playing-bar window: every ad video is capped at 60s
// (video.maxDurationSeconds), so this is the reference length WhatsApp-style
// status bars fill over. A shorter slot just fills the same bar faster.
// Freebie takeover slots (Config: freebie.billboardSlotSeconds, default 60s)
// share this same window so every slot type — AD, HOUSE, or FREEBIE — plays
// through the identical visual loop.
export const PLAYING_BAR_WINDOW_SEC = 60;

// `progress` is 0–1. No countdown number is shown by design — the bar alone
// communicates "this is timed and will move on."
export function PlayingBar({ progress }: { progress: number }) {
  return (
    <div className="absolute top-2 left-2 right-2 h-1.5 rounded-full bg-black/40 overflow-hidden">
      <div
        className="h-full bg-yellow-400 rounded-full transition-[width] duration-150 ease-linear"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
