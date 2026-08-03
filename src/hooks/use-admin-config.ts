import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import { AdminConfigResponse } from "@/types";

// Documented defaults from API_CONTRACT_ADS_REWARD_PLATFORM.md §10.
// GET /admin/config is admin-only, and this app has no admin user type,
// so for everyone else these defaults are the only source of truth
// until a public config-subset endpoint exists.
export const ADMIN_CONFIG_DEFAULTS = {
  "video.maxDurationSeconds": 95,
  "video.maxSizeBytes": 100 * 1024 * 1024,
  // USD per week now (AD_CAMPAIGN_PRICING_AND_GOLIVE_UPDATE.md §1) — `pro`
  // tier removed. Total cost = rate × numberOfWeeks, chosen at go-live time.
  "campaign.tierPrices": { basic: 10, premium: 15 } as Record<
    "basic" | "premium",
    number
  >,
  "payment.usdToNgnRate": 1600,
  "campaign.activeDays": 30,
  "campaign.tierWeights": { basic: 1, premium: 2 } as Record<
    "basic" | "premium",
    number
  >,
  "spin.adsPerCycle": 5,
  "spin.winTypeDistribution": {
    cash: 0.4,
    brand_product: 0.2,
    discount30: 0.25,
    discount50: 0.15,
  } as Record<string, number>,
  "spin.tryAgainBenchmarks": { "50": "discount20", "100": "discount50" } as Record<
    string,
    string
  >,
  "referral.qualifiedThresholds": {
    "20": "discount20",
    "40": "discount50",
  } as Record<string, string>,
  "prizePool.defaultDailyCount": 100,
} as const;

export type AdminConfigKey = keyof typeof ADMIN_CONFIG_DEFAULTS;

/**
 * Resolves config values that are admin-adjustable server-side (pricing,
 * payout split, thresholds, etc.) rather than hardcoding them. Attempts
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
