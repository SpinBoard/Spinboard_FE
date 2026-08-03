"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
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
import { Input } from "@/components/ui/input";
import { Loader2, Minus, Plus, Rocket, UserCog } from "lucide-react";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { useAdminConfig } from "@/hooks/use-admin-config";
import { userAtom } from "@/atom/user";
import { AdCampaign, AdPaymentInitializeResponse } from "@/types";

const MIN_WEEKS = 1;
const MAX_WEEKS = 12;

interface GoLiveDialogProps {
  campaign: AdCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Go-live/payment interface (AD_CAMPAIGN_PRICING_AND_GOLIVE_UPDATE.md §2-3).
// Tier is already fixed from creation — this only collects numberOfWeeks and
// hands off to Paystack. Profile completeness isn't pre-checked; the backend
// enforces it via a 403 { code: "PROFILE_INCOMPLETE" } on initialize, which
// we surface as an inline prompt instead of opening the checkout.
export function GoLiveDialog({ campaign, open, onOpenChange }: GoLiveDialogProps) {
  const user = useAtomValue(userAtom);
  const { get: getConfig } = useAdminConfig();
  const tierPrices = getConfig("campaign.tierPrices");
  const [numberOfWeeks, setNumberOfWeeks] = useState(MIN_WEEKS);
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const weeklyRate = campaign ? (tierPrices?.[campaign.tier] ?? 0) : 0;
  const estimatedTotal = weeklyRate * numberOfWeeks;

  const initializePayment = useMutation({
    mutationFn: async (payload: { campaignId: string; email: string; numberOfWeeks: number }) =>
      api.post<AdPaymentInitializeResponse>(ENDPOINTS.AD_PAYMENTS_INITIALIZE, payload),
    onSuccess: (response) => {
      const authorizationUrl = response.data?.data?.authorization_url;
      if (authorizationUrl) window.open(authorizationUrl, "_blank");
      onOpenChange(false);
    },
    onError: (error) => {
      const data = isAxiosError(error)
        ? (error.response?.data as { message?: string; code?: string } | undefined)
        : undefined;
      if (data?.code === "PROFILE_INCOMPLETE") {
        setProfileIncomplete(true);
        return;
      }
      setErrorMessage(data?.message || "Failed to start payment. Please try again.");
    },
  });

  const reset = () => {
    setNumberOfWeeks(MIN_WEEKS);
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
    initializePayment.mutate({ campaignId: campaign._id, email: user.email, numberOfWeeks });
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
                Go live
              </DialogTitle>
              <DialogDescription>
                Choose how many weeks to run &quot;{campaign?.title}&quot; ({campaign?.tier} —
                ${weeklyRate}/week).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <span className="text-sm text-muted-foreground">Weeks to run</span>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-border"
                    disabled={numberOfWeeks <= MIN_WEEKS}
                    onClick={() => setNumberOfWeeks((w) => Math.max(MIN_WEEKS, w - 1))}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <Input
                    type="number"
                    min={MIN_WEEKS}
                    max={MAX_WEEKS}
                    value={numberOfWeeks}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10);
                      if (Number.isNaN(value)) return;
                      setNumberOfWeeks(Math.min(MAX_WEEKS, Math.max(MIN_WEEKS, value)));
                    }}
                    className="w-16 text-center"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-border"
                    disabled={numberOfWeeks >= MAX_WEEKS}
                    onClick={() => setNumberOfWeeks((w) => Math.min(MAX_WEEKS, w + 1))}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-border pt-3">
                <span className="text-foreground font-semibold">Estimated Total</span>
                <span className="text-primary font-bold text-xl font-sora">${estimatedTotal}</span>
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
                Proceed to Payment
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
