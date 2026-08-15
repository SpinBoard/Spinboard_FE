"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { getOrCreateDeviceId } from "@/app/_utils/helper";
import { ApplyCodeResponse, MyClaimsResponse, StripFeedResponse } from "@/types";
import { useAdminConfig } from "./use-admin-config";

// Polls the perimeter strip at roughly the server's Cache-Control max-age
// (freebie.feedCacheTtlMs, default 3s) — polling faster gains nothing since
// the value doesn't change between cache windows, and there's a rate limit.
export function useStripFeed() {
  const { get } = useAdminConfig();
  const intervalMs = get("freebie.feedCacheTtlMs");

  return useQuery({
    queryKey: ["freebies-strip"],
    queryFn: () =>
      api.get<StripFeedResponse>(ENDPOINTS.FREEBIES_STRIP).then((res) => res.data),
    refetchInterval: intervalMs,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });
}

// One endpoint, one mutation — the backend disambiguates claim vs. redeem
// server-side. Idempotency-Key makes a retried claim safe; X-Device-Id
// feeds the anti-abuse device ceiling.
export function useApplyCode() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => {
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      return api
        .post<ApplyCodeResponse>(
          ENDPOINTS.FREEBIES_APPLY,
          { code },
          {
            headers: {
              "Idempotency-Key": idempotencyKey,
              "X-Device-Id": getOrCreateDeviceId(),
            },
          }
        )
        .then((res) => res.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freebies-strip"] });
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    },
  });
}

export function useMyClaims(enabled: boolean) {
  return useQuery({
    queryKey: ["my-claims"],
    queryFn: () =>
      api.get<MyClaimsResponse>(ENDPOINTS.ME_CLAIMS).then((res) => res.data.claims),
    enabled,
  });
}

export function useRedeemClaim() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (claimId: string) =>
      api
        .post<ApplyCodeResponse>(ENDPOINTS.ME_CLAIMS_REDEEM(claimId))
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-claims"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-balance"] });
    },
  });
}
