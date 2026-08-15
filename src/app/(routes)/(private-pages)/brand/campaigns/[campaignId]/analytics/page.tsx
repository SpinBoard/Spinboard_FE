"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, BarChart3, Download, Eye, Lock, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import {
  AdCampaignAnalyticsBreakdownResponse,
  AdCampaignAnalyticsResponse,
  AdCampaignAnalyticsSummary,
  AnalyticsBreakdownDimension,
} from "@/types";

const DIMENSIONS: { id: AnalyticsBreakdownDimension; label: string }[] = [
  { id: "country", label: "Country" },
  { id: "state", label: "State" },
  { id: "sex", label: "Sex" },
  { id: "ageBand", label: "Age band" },
  { id: "device", label: "Device" },
  { id: "hour", label: "Hour of day" },
];

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const [dimension, setDimension] = useState<AnalyticsBreakdownDimension>("country");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get(ENDPOINTS.AD_CAMPAIGN_ANALYTICS_EXPORT(campaignId), {
        responseType: "blob",
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `campaign-${campaignId}-analytics.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const { data, error, isLoading } = useQuery<AdCampaignAnalyticsSummary>({
    queryKey: ["ad-campaign-analytics", campaignId],
    queryFn: () =>
      api
        .get<AdCampaignAnalyticsResponse>(ENDPOINTS.AD_CAMPAIGN_ANALYTICS(campaignId))
        .then((res) => res.data.analytics),
    enabled: !!campaignId,
    retry: false,
  });

  const { data: breakdown, isLoading: loadingBreakdown } = useQuery({
    queryKey: ["ad-campaign-analytics-breakdown", campaignId, dimension],
    queryFn: () =>
      api
        .get<AdCampaignAnalyticsBreakdownResponse>(
          `${ENDPOINTS.AD_CAMPAIGN_ANALYTICS_BREAKDOWN(campaignId)}?dimension=${dimension}`
        )
        .then((res) => res.data.breakdown),
    enabled: !!campaignId && !!data,
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
          <p className="text-muted-foreground">Upgrade this campaign&apos;s tier to unlock views, completions, and the demographic breakdown.</p>
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
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
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
        <Button
          variant="outline"
          disabled={exporting}
          onClick={handleExport}
          className="border-border text-foreground hover:bg-white/10">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
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
              <p className="text-sm text-muted-foreground">Completions (verified Billboard views)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {data.timeSeries && data.timeSeries.length > 0 && (
        <Card className="bg-card/50 border-border mb-6">
          <CardHeader>
            <CardTitle className="text-foreground font-sora text-lg">Views over time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {data.timeSeries.map((point) => {
                const max = Math.max(...data.timeSeries!.map((p) => p.views), 1);
                return (
                  <div key={point.date} className="flex-1 flex flex-col items-center justify-end gap-1" title={point.date}>
                    <div
                      className="w-full bg-primary/70 rounded-t"
                      style={{ height: `${Math.max(4, (point.views / max) * 100)}%` }}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-card/50 border-border">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle className="text-foreground font-sora flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-secondary" />
            Breakdown
          </CardTitle>
          <Select value={dimension} onValueChange={(v) => setDimension(v as AnalyticsBreakdownDimension)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIMENSIONS.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {loadingBreakdown ? (
            <p className="text-sm text-muted-foreground">Loading breakdown...</p>
          ) : !breakdown || Object.keys(breakdown).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No buckets meet the minimum cohort size yet for this dimension.
            </p>
          ) : (
            <div className="space-y-1.5">
              {Object.entries(breakdown).map(([key, count]) => (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{key}</span>
                  <span className="text-foreground font-medium">{count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
