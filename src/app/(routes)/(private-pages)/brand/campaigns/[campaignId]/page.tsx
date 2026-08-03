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
import { ArrowLeft, BarChart3, Clock, Globe2, HelpCircle, Rocket } from "lucide-react";
import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import { AdCampaign, AdCampaignResponse } from "@/types";
import { GoLiveDialog } from "@/components/brand/go-live-dialog";

function daysLeft(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

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
          {campaign.status === "draft" && (
            <Button
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={() => setShowGoLive(true)}>
              <Rocket className="h-4 w-4 mr-2" />
              Go Live
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4">
          <Badge className="capitalize">{campaign.status}</Badge>
          <Badge variant="secondary" className="capitalize">{campaign.tier}</Badge>
          {campaign.status === "active" && remaining !== null && (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Clock className="h-4 w-4 text-secondary" />
              {remaining} day{remaining !== 1 ? "s" : ""} left
            </div>
          )}
          {campaign.global && (
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Globe2 className="h-4 w-4 text-secondary" />
              Global visibility
            </div>
          )}
        </div>
      </div>

      {campaign.videoUrl && (
        <video src={campaign.videoUrl} controls className="w-full max-h-96 rounded-lg border border-border mb-6" />
      )}

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-foreground font-sora flex items-center gap-2 text-lg">
            <HelpCircle className="h-5 w-5 text-secondary" />
            Quiz Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaign.questions.map((question, index) => (
              <div key={index} className="border border-border rounded p-3">
                <h4 className="text-foreground font-semibold text-sm mb-2">Question {index + 1}</h4>
                <p className="text-muted-foreground text-sm mb-2">{question.question}</p>
                <div className="space-y-1">
                  {question.choices.map((choice, choiceIndex) => (
                    <div
                      key={choiceIndex}
                      className={`text-xs p-2 rounded ${
                        choiceIndex === question.correctIndex
                          ? "bg-success/20 text-success border border-success/30"
                          : "bg-white/5 text-muted-foreground border border-border"
                      }`}>
                      {String.fromCharCode(65 + choiceIndex)}. {choice}
                      {choiceIndex === question.correctIndex && " ✓"}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <GoLiveDialog campaign={campaign} open={showGoLive} onOpenChange={setShowGoLive} />
    </MainLayout>
  );
}
