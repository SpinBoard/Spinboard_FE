"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import {
  BillboardCompleteResponse,
  BillboardMyStreakResponse,
  BillboardQueueResponse,
  BillboardSessionResponse,
  BillboardStatsResponse,
} from "@/types";

// The billboard plays continuously — no gate, no auth requirement. Every
// route here works logged-in or logged-out (optionalAuth server-side).

export function useBillboardSession() {
  return useMutation({
    mutationFn: () =>
      api
        .post<BillboardSessionResponse>(ENDPOINTS.BILLBOARD_SESSION)
        .then((res) => res.data.sessionId),
  });
}

export function useBillboardQueue(sessionId: string | null, size: number = 5) {
  return useQuery({
    queryKey: ["billboard-queue", sessionId, size],
    queryFn: () =>
      api
        .get<BillboardQueueResponse>(ENDPOINTS.BILLBOARD_QUEUE(sessionId as string, size))
        .then((res) => res.data.slots),
    enabled: !!sessionId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useBillboardHeartbeat() {
  return useMutation({
    mutationFn: (payload: { sessionId: string; slotId: string; watchedMs: number }) =>
      api.post(ENDPOINTS.BILLBOARD_HEARTBEAT, payload),
  });
}

export function useBillboardComplete() {
  return useMutation({
    mutationFn: (payload: { sessionId: string; slotId: string; watchedMs: number }) =>
      api
        .post<BillboardCompleteResponse>(ENDPOINTS.BILLBOARD_COMPLETE, payload)
        .then((res) => res.data),
  });
}

// Click-through tracking (2026-09-02) — fire-and-forget, idempotent, same
// pattern as heartbeat/complete. Never gates the actual navigation: the
// caller should already have navigated to clickUrl before this resolves.
export function useBillboardClick() {
  return useMutation({
    mutationFn: (payload: { sessionId: string; slotId: string }) =>
      api.post(ENDPOINTS.BILLBOARD_CLICK, payload),
  });
}

// Public, cheap to poll on any cadence — headline numbers around the player.
export function useBillboardStats() {
  return useQuery({
    queryKey: ["billboard-stats"],
    queryFn: () =>
      api.get<BillboardStatsResponse>(ENDPOINTS.BILLBOARD_STATS).then((res) => res.data.stats),
    refetchInterval: 15000,
  });
}

// Auth required (hard 401) — fetch once per load, no polling needed.
export function useBillboardMyStreak(enabled: boolean) {
  return useQuery({
    queryKey: ["billboard-my-streak"],
    queryFn: () =>
      api
        .get<BillboardMyStreakResponse>(ENDPOINTS.BILLBOARD_MY_STREAK)
        .then((res) => res.data.streakDays),
    enabled,
    retry: false,
  });
}
