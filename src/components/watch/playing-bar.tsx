"use client";

import { Progress } from "@/components/ui/freebiz-progress";

// The playing-bar window. Ad campaigns moved from video to a static banner
// image (2026-09-03) — every AD/HOUSE slot now displays for a fixed
// Config: billboard.bannerDisplaySeconds (15s), like a slide sliding away
// rather than a video playing. Freebie takeover slots
// (Config: freebie.billboardSlotSeconds) were dropped to match, also 15s,
// so every slot type — AD, HOUSE, or FREEBIE — still plays through the
// identical visual loop.
export const PLAYING_BAR_WINDOW_SEC = 15;

// `progress` is 0–1. No countdown number is shown by design — the bar alone
// communicates "this is timed and will move on." Thin wrapper around the
// Progress primitive (design/freebiz-mockup.html's .progress inside
// .face-bottom) so every timed slot shares one visual definition.
export function PlayingBar({ progress }: { progress: number }) {
  return <Progress value={progress * 100} color="var(--live)" />;
}
