"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Rocket, UserCog } from "lucide-react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { useAdminConfig } from "@/hooks/use-admin-config";
import { apiErrorCode, apiErrorMessage } from "@/app/_utils/helper";
import { userAtom } from "@/atom/user";
import { AdCampaign, AdPaymentInitializeResponse } from "@/types";

interface GoLiveDialogProps {
  campaign: AdCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Go-live/payment interface. Tier is already fixed from creation; pricing is
// flat (no weeks to choose) — a single "Proceed to Payment" action hands off
// to Paystack for the tier's flat price. Profile completeness isn't
// pre-checked; the backend enforces it via a 403 { code: "PROFILE_INCOMPLETE" }
// on initialize, which we surface as an inline prompt instead of opening
// checkout.
export function GoLiveDialog({ campaign, open, onOpenChange }: GoLiveDialogProps) {
  const user = useAtomValue(userAtom);
  const { get: getConfig } = useAdminConfig();
  const tiers = getConfig("campaign.tiers");
  const activeDurationDays = getConfig("campaign.activeDurationDays");
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const price = campaign ? (tiers?.[campaign.tier]?.price ?? 0) : 0;
  const isResuming = campaign?.status === "PENDING_PAYMENT";

  const initializePayment = useMutation({
    mutationFn: async (payload: { campaignId: string; email: string }) =>
      api.post<AdPaymentInitializeResponse>(ENDPOINTS.AD_PAYMENTS_INITIALIZE, payload),
    onSuccess: (response) => {
      const authorizationUrl = response.data?.data?.authorization_url;
      if (authorizationUrl) window.open(authorizationUrl, "_blank");
      onOpenChange(false);
    },
    onError: (error) => {
      if (apiErrorCode(error) === "PROFILE_INCOMPLETE") {
        setProfileIncomplete(true);
        return;
      }
      setErrorMessage(apiErrorMessage(error, "Failed to start payment. Please try again."));
    },
  });

  const reset = () => {
    setProfileIncomplete(false);
    setErrorMessage("");
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleProceed = () => {
    if (!campaign || !user?.email) return;
    setErrorMessage("");
    initializePayment.mutate({ campaignId: campaign._id, email: user.email });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {profileIncomplete ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-sora text-xl flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" />
                Complete your profile first
              </DialogTitle>
              <DialogDescription>
                Company name, business categories, country, state, and city are required before
                a campaign can go live.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-4">
              <Link
                href={`${routes.BRAND.PROFILE_COMPLETE}?returnTo=${encodeURIComponent(routes.BRAND.CAMPAIGNS)}`}>
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                  Complete Profile
                </Button>
              </Link>
              <Button
                onClick={() => handleOpenChange(false)}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground hover:bg-white/5">
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="font-sora text-xl flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                {isResuming ? "Complete payment" : "Go live"}
              </DialogTitle>
              <DialogDescription>
                {isResuming
                  ? `A previous payment attempt for "${campaign?.title}" (${campaign?.tier}) wasn't completed. Finish checkout to activate it — a flat $${price} for ${activeDurationDays} days.`
                  : `"${campaign?.title}" (${campaign?.tier}) — a flat $${price} activates it for ${activeDurationDays} days. It then enters pending review before appearing on the billboard.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-foreground font-semibold">Total</span>
                <span className="text-primary font-bold text-xl font-sora">${price}</span>
              </div>

              {errorMessage && (
                <p className="text-destructive text-sm">{errorMessage}</p>
              )}

              <Button
                onClick={handleProceed}
                disabled={initializePayment.isPending}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 flex items-center justify-center gap-3">
                {initializePayment.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4" />
                )}
                {isResuming ? "Retry Payment" : "Proceed to Payment"}
              </Button>
              <Button
                onClick={() => handleOpenChange(false)}
                disabled={initializePayment.isPending}
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground hover:bg-white/5">
                Cancel
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
