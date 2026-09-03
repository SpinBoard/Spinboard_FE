import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import {
  BusinessKyc,
  KycMeResponse,
  KycSubmitResponse,
  KycQueueResponse,
  KycDetailResponse,
} from "@/types";

export interface KycSubmitPayload {
  rcNumber: string;
  legalBusinessName: string;
  businessType?: "RC" | "BN" | "IT";
  repIdType?: "NIN" | "drivers_license" | "passport" | "voters_card";
  cacCertificate?: File;
  repId?: File;
}

function buildKycFormData(values: KycSubmitPayload): FormData {
  const formData = new FormData();
  formData.append("rcNumber", values.rcNumber);
  formData.append("legalBusinessName", values.legalBusinessName);
  if (values.businessType) formData.append("businessType", values.businessType);
  if (values.repIdType) formData.append("repIdType", values.repIdType);
  if (values.cacCertificate) formData.append("cacCertificate", values.cacCertificate);
  if (values.repId) formData.append("repId", values.repId);
  return formData;
}

// Brand's own KYC record — "not_submitted"/null both mean the same thing
// (never submitted). This is the full record; Brand.kycStatus on the
// profile response is the lighter-weight mirror most gating checks should
// read instead of fetching this.
export function useKycMe() {
  const user = useAtomValue(userAtom);
  return useQuery<BusinessKyc | null>({
    queryKey: ["kyc-me"],
    queryFn: () => api.get<KycMeResponse>(ENDPOINTS.KYC_ME).then((res) => res.data.kyc),
    enabled: !!user?.accessToken && user.userType === "brand",
  });
}

export function useSubmitKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: KycSubmitPayload) =>
      api
        .post<KycSubmitResponse>(ENDPOINTS.KYC_SUBMIT, buildKycFormData(values), {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((res) => res.data.kyc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-me"] });
      queryClient.invalidateQueries({ queryKey: ["brand-profile"] });
    },
  });
}

// Only valid while status is "rejected" — a fresh submission attempt while
// pending/verified/revoked is what KYC_ALREADY_PENDING/KYC_RESUBMIT_NOT_ALLOWED
// are for; the caller should already be gating the button on status.
export function useResubmitKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: KycSubmitPayload) =>
      api
        .post<KycSubmitResponse>(ENDPOINTS.KYC_RESUBMIT, buildKycFormData(values), {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((res) => res.data.kyc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kyc-me"] });
      queryClient.invalidateQueries({ queryKey: ["brand-profile"] });
    },
  });
}

// ── Admin: KYC review queue ──

export function useAdminKycQueue() {
  const user = useAtomValue(userAtom);
  return useQuery<BusinessKyc[]>({
    queryKey: ["admin-kyc-queue"],
    queryFn: () => api.get<KycQueueResponse>(ENDPOINTS.ADMIN_KYC_QUEUE).then((res) => res.data.queue),
    enabled: !!user?.accessToken && user.userType === "admin",
  });
}

export function useAdminKycDetail(id: string | null) {
  const user = useAtomValue(userAtom);
  return useQuery<BusinessKyc>({
    queryKey: ["admin-kyc-detail", id],
    queryFn: () => api.get<KycDetailResponse>(ENDPOINTS.ADMIN_KYC_DETAILS(id!)).then((res) => res.data.kyc),
    enabled: !!user?.accessToken && user.userType === "admin" && !!id,
  });
}

function invalidateKycAdminQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin-kyc-queue"] });
  queryClient.invalidateQueries({ queryKey: ["admin-kyc-detail"] });
}

export function useApproveKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(ENDPOINTS.ADMIN_KYC_APPROVE(id)),
    onSuccess: () => invalidateKycAdminQueries(queryClient),
  });
}

export function useRejectKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      api.post(ENDPOINTS.ADMIN_KYC_REJECT(id), { reason }),
    onSuccess: () => invalidateKycAdminQueries(queryClient),
  });
}

// Lives on a brand detail view, not the queue — revokes a previously
// "verified" brand back to gated, e.g. after a compliance issue surfaces
// later. 404 KYC_NOT_VERIFIED if the brand isn't currently verified.
export function useRevokeKyc() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ brandId, reason }: { brandId: string; reason: string }) =>
      api.post(ENDPOINTS.ADMIN_BRAND_KYC_REVOKE(brandId), { reason }),
    onSuccess: () => invalidateKycAdminQueries(queryClient),
  });
}
