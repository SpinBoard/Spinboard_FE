import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import {
  BusinessRating,
  BusinessRatingCreateRequest,
  BusinessRatingResponse,
  BusinessRatingsForBusinessResponse,
  BusinessRatingReportResponse,
  AdminBusinessRatingFlagsResponse,
} from "@/types";

// Public — no auth required, shown on a business's directory listing.
export function useBusinessRatings(brandId: string | null) {
  return useQuery<BusinessRatingsForBusinessResponse>({
    queryKey: ["business-ratings", brandId],
    queryFn: () =>
      api
        .get<BusinessRatingsForBusinessResponse>(ENDPOINTS.BUSINESS_RATINGS_FOR_BUSINESS(brandId!))
        .then((res) => res.data),
    enabled: !!brandId,
  });
}

// "Rate" only ever makes sense from inside an existing contact thread —
// CONTACT_REQUIRED (403) fires otherwise, so callers should only surface
// this action there. Once per (project, rater, rated) direction — 409 on a
// repeat for the same project.
export function useCreateRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BusinessRatingCreateRequest) =>
      api.post<BusinessRatingResponse>(ENDPOINTS.BUSINESS_RATINGS, payload).then((res) => res.data.rating),
    onSuccess: (rating) => {
      queryClient.invalidateQueries({ queryKey: ["business-ratings", rating.ratedBrandId] });
    },
  });
}

// Idempotent per reporting user, same pattern as ad-campaign reporting.
export function useReportRating() {
  return useMutation({
    mutationFn: ({ ratingId, reason }: { ratingId: string; reason: string }) =>
      api
        .post<BusinessRatingReportResponse>(ENDPOINTS.BUSINESS_RATING_REPORT(ratingId), { reason })
        .then((res) => res.data),
  });
}

// ── Admin moderation ──

const ADMIN_FLAGS_KEY = ["admin-business-ratings-flags"];

export function useAdminRatingFlags() {
  const user = useAtomValue(userAtom);
  return useQuery<BusinessRating[]>({
    queryKey: ADMIN_FLAGS_KEY,
    queryFn: () =>
      api
        .get<AdminBusinessRatingFlagsResponse>(ENDPOINTS.ADMIN_BUSINESS_RATINGS_FLAGS)
        .then((res) => res.data.ratings),
    enabled: !!user?.accessToken && user.userType === "admin",
  });
}

// Hides the rating — never deletes it.
export function useHideRating() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ratingId, reason }: { ratingId: string; reason: string }) =>
      api.post(ENDPOINTS.ADMIN_BUSINESS_RATING_HIDE(ratingId), { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_FLAGS_KEY }),
  });
}

// Dismisses the report only — not a permanent resolution, the rating can
// be reported and resurface again later.
export function useDismissRatingReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => api.post(ENDPOINTS.ADMIN_BUSINESS_RATING_REPORT_DISMISS(reportId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ADMIN_FLAGS_KEY }),
  });
}
