"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { AdNextResponse, AdQuizSubmitResponse } from "@/types";

// §3 of API_CONTRACT_ADS_REWARD_PLATFORM.md: GET /ads/next is optional-auth
// and works identically for anon (cookie-tracked) and authenticated callers.
// `country` is only a hint for logged-out/pre-profile viewers.
export function useAdNext(country?: string) {
  return useQuery({
    queryKey: ["ads-next", country],
    queryFn: () => api.get<AdNextResponse>(ENDPOINTS.ADS_NEXT(country)).then((res) => res.data),
    retry: false,
    staleTime: 0,
  });
}

export function useAdVideoStart() {
  return useMutation({
    mutationFn: (campaignId: string) => api.post(ENDPOINTS.AD_VIDEO_START(campaignId)),
  });
}

export function useAdVideoComplete() {
  return useMutation({
    // Rewatching is allowed — call again any time, no dedupe needed.
    mutationFn: (campaignId: string) => api.post(ENDPOINTS.AD_VIDEO_COMPLETE(campaignId)),
  });
}

export function useAdQuizSubmit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ campaignId, answers }: { campaignId: string; answers: number[] }) =>
      api
        .post<AdQuizSubmitResponse>(ENDPOINTS.AD_QUIZ_SUBMIT(campaignId), { answers })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ads-next"] });
    },
  });
}
