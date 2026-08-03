"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { MainLayout } from "@/components/layout/main-layout";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BarChart3, Eye, Lock, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import { AdCampaignAnalytics, AdCampaignAnalyticsResponse } from "@/types";

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;

  const { data, error, isLoading } = useQuery<AdCampaignAnalytics>({
    queryKey: ["ad-campaign-analytics", campaignId],
    queryFn: () =>
      api
        .get<AdCampaignAnalyticsResponse>(ENDPOINTS.AD_CAMPAIGN_ANALYTICS(campaignId))
        .then((res) => res.data.analytics),
    enabled: !!campaignId,
    retry: false,
  });

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isLoading) return <PageLoader message="Loading analytics..." />;

  if (isForbidden) {
    return (
      <MainLayout maxWidth="2xl">
        <div className="text-center py-16 space-y-4">
          <Lock className="h-10 w-10 text-muted-foreground mx-auto" />
          <h1 className="font-sora text-2xl font-bold text-foreground">Analytics is a Premium feature</h1>
          <p className="text-muted-foreground">Upgrade this campaign&apos;s tier to unlock views, completions, and demographics.</p>
          <Link href={routes.BRAND.CAMPAIGNS}>
            <Button variant="outline" className="border-border text-foreground hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Campaigns
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <PageError title="Failed to Load Analytics" message="Unable to load campaign analytics. Please try again." />
    );
  }

  return (
    <MainLayout maxWidth="4xl">
      <div className="mb-6">
        <Link href={`${routes.BRAND.CAMPAIGNS}/${campaignId}`}>
          <Button variant="outline" className="border-border text-foreground hover:bg-white/10 mb-5">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaign
          </Button>
        </Link>
        <h1 className="font-sora text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-primary" />
          Campaign Analytics
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6 flex items-center gap-4">
            <Eye className="h-8 w-8 text-secondary" />
            <div>
              <p className="text-2xl font-bold text-foreground font-sora">{data.views}</p>
              <p className="text-sm text-muted-foreground">Views</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border">
          <CardContent className="pt-6 flex items-center gap-4">
            <TrendingUp className="h-8 w-8 text-success" />
            <div>
              <p className="text-2xl font-bold text-foreground font-sora">{data.completions}</p>
              <p className="text-sm text-muted-foreground">Completions</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 border-border mb-6">
        <CardHeader>
          <CardTitle className="text-foreground font-sora text-lg">
            Per-question first-attempt correctness
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.questionCorrectnessRates.map((rate, index) => (
            <div key={index}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Question {index + 1}</span>
                <span className="text-foreground font-medium">{Math.round(rate * 100)}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${rate * 100}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border">
        <CardHeader>
          <CardTitle className="text-foreground font-sora flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-secondary" />
            Demographics
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(
            [
              ["Country", data.demographics.country],
              ["Sex", data.demographics.sex],
              ["Age", data.demographics.ageBuckets],
            ] as const
          ).map(([label, breakdown]) => (
            <div key={label}>
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</p>
              <div className="space-y-1.5">
                {Object.entries(breakdown).map(([key, count]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">{key}</span>
                    <span className="text-foreground font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
