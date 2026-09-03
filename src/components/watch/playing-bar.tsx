"use client";

import { Progress } from "@/components/ui/freebiz-progress";

// The playing-bar window: every ad video is capped at 60s
// (video.maxDurationSeconds), so this is the reference length WhatsApp-style
// status bars fill over. A shorter slot just fills the same bar faster.
// Freebie takeover slots (Config: freebie.billboardSlotSeconds, default 60s)
// share this same window so every slot type — AD, HOUSE, or FREEBIE — plays
// through the identical visual loop.
export const PLAYING_BAR_WINDOW_SEC = 60;

// `progress` is 0–1. No countdown number is shown by design — the bar alone
// communicates "this is timed and will move on." Thin wrapper around the
// Progress primitive (design/freebiz-mockup.html's .progress inside
// .face-bottom) so every timed slot shares one visual definition.
export function PlayingBar({ progress }: { progress: number }) {
  return <Progress value={progress * 100} color="var(--live)" />;
}
