import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import {
  SponsoredAd,
  SponsoredAdsResponse,
  SponsoredAdResponse,
  SponsoredAdSubmitRequest,
  SponsoredAdSubmitResponse,
} from "@/types";

const SPONSORED_ADS_KEY = ["admin-sponsored-ads"];

// status omitted = everything; pass "PENDING" for just the brand-submitted
// review queue.
export function useAdminSponsoredAds(status?: string) {
  const user = useAtomValue(userAtom);
  return useQuery<SponsoredAd[]>({
    queryKey: [...SPONSORED_ADS_KEY, status ?? "all"],
    queryFn: () =>
      api
        .get<SponsoredAdsResponse>(ENDPOINTS.ADMIN_SPONSORED_ADS(status))
        .then((res) => res.data.sponsoredAds),
    enabled: !!user?.accessToken && user.userType === "admin",
  });
}

export interface SponsoredAdCreatePayload {
  image: File;
  advertiserName: string;
  clickUrl?: string;
}

function invalidateSponsoredAds(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: SPONSORED_ADS_KEY });
}

// Admin's own direct upload — goes live (status: "ACTIVE") immediately, the
// upload itself is the vetting step, no separate publish action after this.
export function useCreateSponsoredAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SponsoredAdCreatePayload) => {
      const formData = new FormData();
      formData.append("image", payload.image);
      formData.append("advertiserName", payload.advertiserName);
      if (payload.clickUrl?.trim()) formData.append("clickUrl", payload.clickUrl.trim());
      return api
        .post<SponsoredAdResponse>(ENDPOINTS.ADMIN_SPONSORED_ADS(), formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((res) => res.data.sponsoredAd);
    },
    onSuccess: () => invalidateSponsoredAds(queryClient),
  });
}

export function useActivateSponsoredAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(ENDPOINTS.ADMIN_SPONSORED_AD_ACTIVATE(id)),
    onSuccess: () => invalidateSponsoredAds(queryClient),
  });
}

export function useDeactivateSponsoredAd() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(ENDPOINTS.ADMIN_SPONSORED_AD_DEACTIVATE(id)),
    onSuccess: () => invalidateSponsoredAds(queryClient),
  });
}

// Public — any advertiser, on or off the platform, rate-limited per IP.
// Always lands PENDING; the response is deliberately thin, nothing to
// render beyond a confirmation.
export function useSubmitSponsoredAd() {
  return useMutation({
    mutationFn: (payload: SponsoredAdSubmitRequest) => {
      const formData = new FormData();
      formData.append("image", payload.image);
      formData.append("advertiserName", payload.advertiserName);
      formData.append("contactEmail", payload.contactEmail);
      if (payload.contactPhone?.trim()) formData.append("contactPhone", payload.contactPhone.trim());
      if (payload.message?.trim()) formData.append("message", payload.message.trim());
      if (payload.clickUrl?.trim()) formData.append("clickUrl", payload.clickUrl.trim());
      return api
        .post<SponsoredAdSubmitResponse>(ENDPOINTS.SPONSORED_ADS_SUBMIT, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((res) => res.data);
    },
  });
}
