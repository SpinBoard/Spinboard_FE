"use client";

import { Progress } from "@/components/ui/freebiz-progress";

// The playing-bar window — the reference length each slot's bar fills over
// (BannerPlayer/FreebieTakeover both clamp via
// `Math.min(durationSec, PLAYING_BAR_WINDOW_SEC)`, so this only needs to be
// at least as large as the longest slot type's real duration for every bar
// to still fill exactly at its own slot's end). AD/HOUSE display for a
// fixed Config: billboard.bannerDisplaySeconds (15s) — a static banner has
// no natural length of its own. FREEBIE takeover slots
// (Config: freebie.billboardSlotSeconds) briefly matched that at 15s too,
// but were bumped to 30s (2026-09-04) to give a freebie moment more air
// than a routine ad — the two are no longer the same duration, hence this
// constant tracking the larger of the two rather than one shared value.
export const PLAYING_BAR_WINDOW_SEC = 30;

// `progress` is 0–1. No countdown number is shown by design — the bar alone
// communicates "this is timed and will move on." Thin wrapper around the
// Progress primitive (design/freebiz-mockup.html's .progress inside
// .face-bottom) so every timed slot shares one visual definition.
export function PlayingBar({ progress }: { progress: number }) {
  return <Progress value={progress * 100} color="var(--live)" />;
}
