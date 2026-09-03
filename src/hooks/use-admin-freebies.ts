"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import {
  FreebieBatchCashRequest,
  FreebieBatchCashResponse,
  FreebieForceLiveResponse,
  FreebieLowInventoryAlert,
  FreebiePrizeItem,
  FreebiePrizeRevealPinResponse,
  FreebiePrizeStatus,
  FreebiePrizeVoidResponse,
  FreebieScheduleCancelResponse,
  FreebieScheduleSlot,
  FreebieScheduleGenerateResponse,
  FreebieType,
} from "@/types";

const PRIZES_QUERY_KEY = ["admin-freebie-prizes"] as const;
const LOW_INVENTORY_QUERY_KEY = ["admin-freebie-prizes-low-inventory"] as const;
const SCHEDULE_QUERY_KEY = (date: string) => ["admin-freebies-schedule", date] as const;

// Was returning `{success:true, prizes:[]}` unconditionally on 2026-08-29 —
// backend fixed it same day; re-verified live (unfiltered call, and both
// `type`/`status` filters individually) before this comment was updated.
export function useAdminFreebiePrizes(filters: { type?: FreebieType; status?: FreebiePrizeStatus | "all" }) {
  const type = filters.type;
  const status = filters.status && filters.status !== "all" ? filters.status : undefined;
  return useQuery({
    queryKey: [...PRIZES_QUERY_KEY, type, status],
    queryFn: () =>
      api
        .get<{ prizes: FreebiePrizeItem[] }>(ENDPOINTS.ADMIN_FREEBIE_PRIZES(type, status))
        .then((res) => res.data.prizes),
  });
}

export function useAdminFreebieLowInventory() {
  return useQuery({
    queryKey: LOW_INVENTORY_QUERY_KEY,
    queryFn: () =>
      api
        .get<{ alerts: FreebieLowInventoryAlert[] }>(ENDPOINTS.ADMIN_FREEBIE_PRIZES_LOW_INVENTORY)
        .then((res) => res.data.alerts),
    refetchInterval: 60000,
  });
}

// Verified 2026-08-29 against a live instance: the envelope key is
// `schedule`, not `codes`. Each slot now inlines `resolvedCode` (a backend
// fix, same day) — see the FreebieScheduleSlot comment in src/types/index.ts.
export function useAdminFreebieSchedule(date: string) {
  return useQuery({
    queryKey: SCHEDULE_QUERY_KEY(date),
    queryFn: () =>
      api
        .get<{ date: string; schedule: FreebieScheduleSlot[] }>(ENDPOINTS.ADMIN_FREEBIES_SCHEDULE(date))
        .then((res) => res.data.schedule),
  });
}

function invalidatePrizeQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: PRIZES_QUERY_KEY });
  queryClient.invalidateQueries({ queryKey: LOW_INVENTORY_QUERY_KEY });
}

export function useAddCashPrizes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: FreebieBatchCashRequest) =>
      api
        .post<FreebieBatchCashResponse>(ENDPOINTS.ADMIN_FREEBIE_PRIZES_BATCH_CASH, payload)
        .then((res) => res.data),
    onSuccess: () => invalidatePrizeQueries(queryClient),
  });
}

export function useVoidFreebiePrize() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ prizeItemId, reason }: { prizeItemId: string; reason: string }) =>
      api
        .post<FreebiePrizeVoidResponse>(ENDPOINTS.ADMIN_FREEBIE_PRIZE_VOID(prizeItemId), { reason })
        .then((res) => res.data),
    onSuccess: () => invalidatePrizeQueries(queryClient),
  });
}

// Audit-logged — the one explicit path a PIN is ever exposed outside a real
// redemption. Caller is responsible for not holding the result any longer
// than the confirmation UI needs it.
export function useRevealFreebiePin() {
  return useMutation({
    mutationFn: (prizeItemId: string) =>
      api
        .post<FreebiePrizeRevealPinResponse>(ENDPOINTS.ADMIN_FREEBIE_PRIZE_REVEAL_PIN(prizeItemId))
        .then((res) => res.data),
  });
}

export function useGenerateFreebieSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (date: string) =>
      api
        .post<FreebieScheduleGenerateResponse>(ENDPOINTS.ADMIN_FREEBIES_SCHEDULE_GENERATE, { date })
        .then((res) => res.data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY(data.date) });
      invalidatePrizeQueries(queryClient);
    },
  });
}

export function useCancelFreebieSchedule(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scheduleId, reason }: { scheduleId: string; reason: string }) =>
      api
        .post<FreebieScheduleCancelResponse>(ENDPOINTS.ADMIN_FREEBIES_SCHEDULE_CANCEL(scheduleId), { reason })
        .then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY(date) }),
  });
}

export function useForceFreebieLive(date: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (type: FreebieType) =>
      api
        .post<FreebieForceLiveResponse>(ENDPOINTS.ADMIN_FREEBIES_FORCE_LIVE, { type })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SCHEDULE_QUERY_KEY(date) });
      invalidatePrizeQueries(queryClient);
    },
  });
}
