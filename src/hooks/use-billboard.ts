"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import {
  BillboardCompleteResponse,
  BillboardQueueResponse,
  BillboardSessionResponse,
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
