import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import { AdminConfigResponse } from "@/types";

// Documented defaults from docs/CONFIG.md. GET /admin/config is admin-only,
// and this app has no admin user type, so for everyone else these defaults
// are the only source of truth until a public config-subset endpoint exists.
export const ADMIN_CONFIG_DEFAULTS = {
  "video.maxDurationSeconds": 60,
  "video.maxSizeBytes": 25 * 1024 * 1024,
  "campaign.tiers": {
    basic: { price: 20, weight: 1, analytics: false },
    premium: { price: 30, weight: 2, analytics: true },
  } as Record<"basic" | "premium", { price: number; weight: number; analytics: boolean }>,
  "payment.usdToNgnRate": 1550,
  "campaign.activeDurationDays": 30,
  "billboard.completionWatchFraction": 0.95,
  "billboard.heartbeatToleranceMs": 3000,
  "billboard.defaultQueueSize": 5,
  "freebie.dailyAirtimeCount": 5,
  "freebie.dailyCashCount": 5,
  "freebie.dailyClaimCap": { AIRTIME: 1, CASH: 1 } as Record<"AIRTIME" | "CASH", number>,
  "freebie.minGapMinutes": 20,
  "freebie.liveWindowMinutes": { AIRTIME: 10, CASH: 10 } as Record<"AIRTIME" | "CASH", number>,
  "freebie.redDisplaySeconds": 60,
  "freebie.maxConcurrentLive": 3,
  "freebie.feedCacheTtlMs": 3000,
  "freebie.deviceDailyCap": 3,
  "freebie.ipDailyCap": 10,
  "rateLimit.claim": { limit: 20, windowSeconds: 60 },
  "rateLimit.redeem": { limit: 5, windowSeconds: 60 },
  "rateLimit.feed": { limit: 30, windowSeconds: 60 },
  "payout.threshold": 1500,
  "payout.weekday": 5,
  "analytics.minCohort": 10,
  "referral.qualifiedThresholds": { "20": 1000, "40": 2500 } as Record<string, number>,
  "referral.pointsThreshold": 21,
  "referral.referrerBonusPoints": 5,
} as const;

export type AdminConfigKey = keyof typeof ADMIN_CONFIG_DEFAULTS;

/**
 * Resolves config values that are admin-adjustable server-side (pricing,
 * payout threshold, claim caps, etc.) rather than hardcoding them. Attempts
 * the live GET /admin/config endpoint and merges any values it returns
 * over the documented defaults; silently falls back to defaults on any
 * error (401/403 for non-admins, network failure, etc.) since there's
 * currently no public equivalent endpoint.
 */
export function useAdminConfig() {
  const user = useAtomValue(userAtom);

  const query = useQuery({
    queryKey: ["admin-config"],
    queryFn: async () => {
      const res = await api.get<AdminConfigResponse>(ENDPOINTS.ADMIN_CONFIG);
      return res.data.config;
    },
    enabled: !!user?.accessToken,
    retry: false,
    staleTime: 5 * 60 * 1000,
    throwOnError: false,
  });

  const get = <K extends AdminConfigKey>(
    key: K
  ): (typeof ADMIN_CONFIG_DEFAULTS)[K] => {
    const live = query.data?.[key]?.value;
    return live !== undefined
      ? (live as (typeof ADMIN_CONFIG_DEFAULTS)[K])
      : ADMIN_CONFIG_DEFAULTS[key];
  };

  return { get, isLoading: query.isLoading, isFromServer: !!query.data };
}
