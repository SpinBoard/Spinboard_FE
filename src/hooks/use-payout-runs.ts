import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import {
  PayoutRunCreateRequest,
  PayoutRunResponse,
  PayoutRunsResponse,
  PayoutRunItem,
  PayoutRunItemsResponse,
  PayoutItemMarkPaidRequest,
  PayoutItemsMarkPaidBulkRequest,
  PayoutItemSkipFailRequest,
} from "@/types";

const RUNS_KEY = ["admin-payout-runs"];

export function useAdminPayoutRuns() {
  const user = useAtomValue(userAtom);
  return useQuery<PayoutRunsResponse>({
    queryKey: RUNS_KEY,
    queryFn: () => api.get<PayoutRunsResponse>(ENDPOINTS.ADMIN_PAYOUT_RUNS).then((res) => res.data),
    enabled: !!user?.accessToken && user.userType === "admin",
  });
}

export function useOpenPayoutRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PayoutRunCreateRequest) =>
      api.post<PayoutRunResponse>(ENDPOINTS.ADMIN_PAYOUT_RUNS, payload).then((res) => res.data.run),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RUNS_KEY }),
  });
}

export function usePayoutRunItems(runId: string | null) {
  const user = useAtomValue(userAtom);
  return useQuery<PayoutRunItem[]>({
    queryKey: ["admin-payout-run-items", runId],
    queryFn: () =>
      api.get<PayoutRunItemsResponse>(ENDPOINTS.ADMIN_PAYOUT_RUN_ITEMS(runId!)).then((res) => res.data.items),
    enabled: !!user?.accessToken && user.userType === "admin" && !!runId,
  });
}

function invalidateRun(queryClient: ReturnType<typeof useQueryClient>, runId: string) {
  queryClient.invalidateQueries({ queryKey: RUNS_KEY });
  queryClient.invalidateQueries({ queryKey: ["admin-payout-run-items", runId] });
}

// Freezes the snapshotted amounts — a credit after locking rolls to the
// next run, not this one.
export function useLockPayoutRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) =>
      api.post<PayoutRunResponse>(ENDPOINTS.ADMIN_PAYOUT_RUN_LOCK(runId)).then((res) => res.data.run),
    onSuccess: (_data, runId) => invalidateRun(queryClient, runId),
  });
}

export function useMarkPayoutItemPaid(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, ...payload }: { itemId: string } & PayoutItemMarkPaidRequest) =>
      api.post(ENDPOINTS.ADMIN_PAYOUT_RUN_ITEM_PAID(runId, itemId), payload),
    onSuccess: () => invalidateRun(queryClient, runId),
  });
}

export function useMarkPayoutItemsPaidBulk(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: PayoutItemsMarkPaidBulkRequest) =>
      api.post(ENDPOINTS.ADMIN_PAYOUT_RUN_ITEMS_PAID_BULK(runId), payload),
    onSuccess: () => invalidateRun(queryClient, runId),
  });
}

export function useSkipPayoutItem(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, ...payload }: { itemId: string } & PayoutItemSkipFailRequest) =>
      api.post(ENDPOINTS.ADMIN_PAYOUT_RUN_ITEM_SKIP(runId, itemId), payload),
    onSuccess: () => invalidateRun(queryClient, runId),
  });
}

export function useFailPayoutItem(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, ...payload }: { itemId: string } & PayoutItemSkipFailRequest) =>
      api.post(ENDPOINTS.ADMIN_PAYOUT_RUN_ITEM_FAIL(runId, itemId), payload),
    onSuccess: () => invalidateRun(queryClient, runId),
  });
}

// Requires every item resolved (paid/skipped/failed) — the backend
// enforces this, surfaced here as a plain mutation error rather than a
// pre-check, since the item list is the source of truth.
export function useCompletePayoutRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) =>
      api.post<PayoutRunResponse>(ENDPOINTS.ADMIN_PAYOUT_RUN_COMPLETE(runId)).then((res) => res.data.run),
    onSuccess: (_data, runId) => invalidateRun(queryClient, runId),
  });
}
