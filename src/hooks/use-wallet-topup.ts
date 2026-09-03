import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import {
  WalletTopupInitializeRequest,
  WalletTopupInitializeResponse,
  WalletTopupVerifyResponse,
} from "@/types";

// Same Paystack-checkout pattern as ad-campaign payment (see
// AD_PAYMENTS_INITIALIZE/GoLiveDialog): open authorization_url in a new
// tab, then routes.WALLET_TOPUP_VERIFY (a public page, since Paystack's
// callback can land in a tab with no session) calls WALLET_TOPUP_VERIFY.
export function useInitializeWalletTopup() {
  return useMutation({
    mutationFn: (payload: WalletTopupInitializeRequest) =>
      api.post<WalletTopupInitializeResponse>(ENDPOINTS.WALLET_TOPUP_INITIALIZE, payload).then((res) => res.data),
  });
}

export function useVerifyWalletTopup(reference: string | null) {
  return useMutation({
    mutationFn: () => api.get<WalletTopupVerifyResponse>(ENDPOINTS.WALLET_TOPUP_VERIFY(reference!)).then((res) => res.data),
  });
}
