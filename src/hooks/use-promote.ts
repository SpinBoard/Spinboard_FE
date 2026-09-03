"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import {
  PromoCampaign,
  PromoCampaignResponse,
  PromoCampaignsModerationRequest,
  PromoCampaignsModerationResponse,
  PromoCampaignsResponse,
  PromoLeaderboardResponse,
  PromoLikeResponse,
  PromoLink,
  PromoLinkResponse,
  PromoLinksMineResponse,
} from "@/types";

// Promote & Earn (docs/FRONTEND_IMPLEMENTATION_GUIDE.md §2 Revamp 5) — a
// cumulative platform-wide leaderboard, not a per-campaign pot. See
// src/types/index.ts's header comment on PromoCampaign for the full
// rationale on why this diverges from the mockup's v-promote/b-contest/
// a-contest screens.

// Verified live 2026-08-30 against a real backend instance: GET
// /promote/campaigns returns the full campaign list (title, description,
// media, brandName) for any signed-in role, not just brands — auth
// required (401 without a token), but not role-gated the way
// /promote/campaigns/mine is. FRONTEND_IMPLEMENTATION_GUIDE.md and this
// hook file's own header comment previously said no such endpoint existed;
// that was true when written and is no longer true. Powers the "Browse
// campaigns" section on /user/promote.
export function usePromoteCampaigns(enabled: boolean) {
  return useQuery({
    queryKey: ["promote-campaigns"],
    queryFn: () =>
      api.get<PromoCampaignsResponse>(ENDPOINTS.PROMOTE_CAMPAIGNS).then((res) => res.data.campaigns),
    enabled,
  });
}

export function usePromoteCampaignsMine(enabled: boolean) {
  return useQuery({
    queryKey: ["promote-campaigns-mine"],
    queryFn: () =>
      api.get<PromoCampaignsResponse>(ENDPOINTS.PROMOTE_CAMPAIGNS_MINE).then((res) => res.data.campaigns),
    enabled,
  });
}

export function usePromoteCampaign(campaignId: string | null) {
  return useQuery<PromoCampaign>({
    queryKey: ["promote-campaign", campaignId],
    queryFn: () =>
      api
        .get<PromoCampaignResponse>(ENDPOINTS.PROMOTE_CAMPAIGN_DETAILS(campaignId as string))
        .then((res) => res.data.campaign),
    enabled: !!campaignId,
  });
}

export function useCreatePromoteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      api
        .post<PromoCampaignResponse>(ENDPOINTS.PROMOTE_CAMPAIGNS, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((res) => res.data.campaign),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promote-campaigns-mine"] });
    },
  });
}

export function usePromoteCampaignsModeration() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["promote-campaigns-admin"] });

  const deactivate = useMutation({
    mutationFn: (payload: PromoCampaignsModerationRequest) =>
      api
        .post<PromoCampaignsModerationResponse>(ENDPOINTS.PROMOTE_CAMPAIGNS_DEACTIVATE, payload)
        .then((res) => res.data),
    onSuccess: invalidate,
  });

  const reactivate = useMutation({
    mutationFn: (payload: { campaignIds: string[] }) =>
      api
        .post<PromoCampaignsModerationResponse>(ENDPOINTS.PROMOTE_CAMPAIGNS_REACTIVATE, payload)
        .then((res) => res.data),
    onSuccess: invalidate,
  });

  return { deactivate, reactivate };
}

// Auth required — mint/fetch this viewer's share link for a campaign,
// idempotent (safe to call on every visit rather than caching client-side).
export function useCreatePromoteLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) =>
      api
        .post<PromoLinkResponse>(ENDPOINTS.PROMOTE_CAMPAIGN_LINKS(campaignId))
        .then((res) => res.data.link),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promote-links-mine"] });
    },
  });
}

export function usePromoteLinksMine(enabled: boolean) {
  return useQuery<PromoLink[]>({
    queryKey: ["promote-links-mine"],
    queryFn: () =>
      api.get<PromoLinksMineResponse>(ENDPOINTS.PROMOTE_LINKS_MINE).then((res) => res.data.links),
    enabled,
  });
}

// The "Like this campaign" button's endpoint — looks up the campaign by
// slug and records the like in one call, auth required.
export function useLikePromoCampaign() {
  return useMutation({
    mutationFn: (slug: string) =>
      api.post<PromoLikeResponse>(ENDPOINTS.PROMOTE_LIKE(slug)).then((res) => res.data),
  });
}

// Public — platform-wide, cumulative across every campaign each promoter
// has shared. Omit periodId for the current OPEN period.
export function usePromoteLeaderboard(periodId?: string) {
  return useQuery({
    queryKey: ["promote-leaderboard", periodId],
    queryFn: () =>
      api.get<PromoLeaderboardResponse>(ENDPOINTS.PROMOTE_LEADERBOARD(periodId)).then((res) => res.data),
  });
}
