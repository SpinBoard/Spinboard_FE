import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import { AdminConfigResponse } from "@/types";

// Documented defaults from docs/CONFIG.md. GET /admin/config is admin-only;
// for non-admin users these defaults are the only source of truth until a
// public config-subset endpoint exists.
export const ADMIN_CONFIG_DEFAULTS = {
  // Still used by Promote & Earn's own campaign-media upload — that's a
  // separate system, unaffected by the 2026-09-03 billboard ad-campaign
  // video→banner switch below, and still supports video.
  "video.maxDurationSeconds": 60,
  "video.maxSizeBytes": 25 * 1024 * 1024,
  // Billboard ad campaigns moved from video to a static banner image
  // (2026-09-03) — hosting cost. Every campaign, both tiers, uploads a
  // banner now.
  "banner.targetWidthPx": 1200,
  "banner.targetHeightPx": 675,
  "banner.aspectRatioTolerance": 0.05,
  "banner.maxSizeBytes": 5 * 1024 * 1024,
  "billboard.bannerDisplaySeconds": 15,
  // Admin-curated sponsored-ad panel creative — image or GIF, no aspect
  // constraint (unlike the brand banner above).
  "sponsoredAd.maxSizeBytes": 5 * 1024 * 1024,
  "campaign.tiers": {
    basic: { price: 20, weight: 1, analytics: false },
    premium: { price: 30, weight: 2, analytics: true },
  } as Record<"basic" | "premium", { price: number; weight: number; analytics: boolean }>,
  "payment.usdToNgnRate": 1550,
  "campaign.activeDurationDays": 30,
  "billboard.completionWatchFraction": 0.95,
  "billboard.heartbeatToleranceMs": 3000,
  "billboard.defaultQueueSize": 5,
  // Freebies simplified to cash-only 2026-08-29 — live server value is 0
  // and stays 0 going forward; kept in the map since GET /admin/config
  // still returns the key.
  "freebie.dailyAirtimeCount": 0,
  "freebie.dailyCashCount": 5,
  "freebie.dailyClaimCap": { AIRTIME: 1, CASH: 1 } as Record<"AIRTIME" | "CASH", number>,
  "freebie.activeHours": { start: "08:00", end: "23:00", timeZone: "Africa/Lagos" },
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
  "freebie.recentCatchesFeedSize": 8,
  "adModeration.autoFlagReportThreshold": 3,
  "adModeration.autoFlagWindowMinutes": 60,
  "adModeration.suspendStrikeThreshold": 3,
  // Live value dropped from 24 to 0 on 2026-08-31 per product direction — a
  // fresh account can like a Promote & Earn campaign immediately now. This
  // is only the fallback used if GET /admin/config is unreachable.
  "promote.minAccountAgeHours": 0,
  "promote.deviceDailyLikeCap": 20,
  "promote.ipDailyLikeCap": 50,
  "promote.periodDurationDays": 7,
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
    // Fixed 2026-09-04 — GET /admin/config's `config` is a flat key→value
    // map, not each entry wrapped in `{value, description?}` (that wrapper
    // is only the PUT request body shape). Reading `?.value` here meant
    // `live` was always undefined and every single call silently fell
    // through to ADMIN_CONFIG_DEFAULTS, live backend config never actually
    // took effect anywhere in the app despite `isFromServer` reporting true.
    const live = query.data?.[key];
    return live !== undefined
      ? (live as (typeof ADMIN_CONFIG_DEFAULTS)[K])
      : ADMIN_CONFIG_DEFAULTS[key];
  };

  return { get, isLoading: query.isLoading, isFromServer: !!query.data };
}
