"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { MainLayout } from "@/components/layout/main-layout";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle, BarChart3, Clock, Rocket, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import { AdCampaign, AdCampaignResponse } from "@/types";
import { GoLiveDialog } from "@/components/brand/go-live-dialog";
import { STATUS_STYLES, MODERATION_STYLES, daysLeft, formatStatusLabel } from "../campaign-status";

export default function ViewCampaignPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [showGoLive, setShowGoLive] = useState(false);

  const {
    data: campaign,
    error,
    isLoading,
  } = useQuery<AdCampaign>({
    queryKey: ["ad-campaign", campaignId],
    queryFn: () =>
      api
        .get<AdCampaignResponse>(ENDPOINTS.AD_CAMPAIGN_DETAILS(campaignId))
        .then((res) => res.data.campaign),
    enabled: !!campaignId,
  });

  if (isLoading) return <PageLoader message="Loading campaign details..." />;

  if (error) {
    return (
      <PageError
        title="Failed to Load Campaign"
        message="Unable to load campaign details. Please check your connection and try again."
      />
    );
  }

  if (!campaign) {
    return <PageError title="Campaign Not Found" message="The requested campaign could not be found." showRetry={false} />;
  }

  const remaining = daysLeft(campaign.expiresAt);

  return (
    <MainLayout maxWidth="4xl">
      <div className="mb-6">
        <Link href={routes.BRAND.CAMPAIGNS}>
          <Button variant="outline" className="border-border text-foreground hover:bg-white/10 mb-5">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </Link>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground font-sora">{campaign.title}</h1>
            <p className="text-muted-foreground">{campaign.description}</p>
          </div>
          {campaign.tier === "premium" && (
            <Link href={routes.BRAND.CAMPAIGN_ANALYTICS(campaignId)}>
              <Button variant="outline" className="border-border text-foreground hover:bg-white/10">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
            </Link>
          )}
          {campaign.status === "DRAFT" && (
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setShowGoLive(true)}>
              <Rocket className="h-4 w-4 mr-2" />
              Go Live
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4">
          <Badge className={STATUS_STYLES[campaign.status]}>{formatStatusLabel(campaign.status)}</Badge>
          <Badge className={MODERATION_STYLES[campaign.moderationStatus]}>
            <ShieldCheck className="h-3 w-3 mr-1" />
            {formatStatusLabel(campaign.moderationStatus)}
          </Badge>
          <Badge variant="secondary" className="capitalize">{campaign.tier}</Badge>
          {campaign.status === "ACTIVE" && remaining !== null && (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Clock className="h-4 w-4 text-secondary" />
              {remaining} day{remaining !== 1 ? "s" : ""} left
            </div>
          )}
        </div>

        {campaign.moderationStatus === "REJECTED" && campaign.moderationReason && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">{campaign.moderationReason}</p>
          </div>
        )}
      </div>

      {campaign.videoUrl && (
        <video src={campaign.videoUrl} controls className="w-full max-h-96 rounded-lg border border-border mb-6" />
      )}

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-foreground font-sora text-lg">Campaign details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {campaign.brandUrl && (
            <div className="flex justify-between text-muted-foreground">
              <span>Brand URL</span>
              <a href={campaign.brandUrl} target="_blank" rel="noreferrer" className="text-secondary hover:underline truncate max-w-xs">
                {campaign.brandUrl}
              </a>
            </div>
          )}
          {campaign.campaignUrl && (
            <div className="flex justify-between text-muted-foreground">
              <span>Campaign URL</span>
              <a href={campaign.campaignUrl} target="_blank" rel="noreferrer" className="text-secondary hover:underline truncate max-w-xs">
                {campaign.campaignUrl}
              </a>
            </div>
          )}
          {campaign.activatedAt && (
            <div className="flex justify-between text-muted-foreground">
              <span>Activated</span>
              <span className="text-foreground">{new Date(campaign.activatedAt).toLocaleDateString()}</span>
            </div>
          )}
          {campaign.expiresAt && (
            <div className="flex justify-between text-muted-foreground">
              <span>Expires</span>
              <span className="text-foreground">{new Date(campaign.expiresAt).toLocaleDateString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <GoLiveDialog campaign={campaign} open={showGoLive} onOpenChange={setShowGoLive} />
    </MainLayout>
  );
}
