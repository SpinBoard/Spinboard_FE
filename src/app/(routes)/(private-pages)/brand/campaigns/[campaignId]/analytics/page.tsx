"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Stat } from "@/components/ui/freebiz-stat";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { Progress } from "@/components/ui/freebiz-progress";
import { ArrowLeft, Download, Lock, Loader2 } from "lucide-react";
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

// design/freebiz-mockup.html data-screen="b-analytics". Per DECISIONS.md
// #16, this keeps the app's real per-campaign route (not the mockup's
// "/brands/audience" naming). "Unique viewers" and "Cost per completed
// view" (§2 Revamp 6) are both now real fields on this same endpoint's
// response — uniqueViewers was already present but unread, costPerCompletedView
// is new — restoring the mockup's stats that were previously dropped for
// lack of a source. "Full watches %" is kept because it's honestly
// derivable from the two original real numbers (completions ÷ views).
//
// The mockup shows three breakdown panels (country/age/gender) at once;
// the real screen only ever fetches one dimension at a time via the
// existing dropdown — showing three simultaneously would mean firing two
// breakdown queries this screen doesn't already make, which is adding a
// fetch, not restyling one. The single-dimension result is shown with the
// mockup's own horizontal-bar look instead of a plain key/value list.
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

  const breakdownEntries = useMemo(() => {
    if (!breakdown) return [];
    const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return entries.map(([key, value]) => ({ key, value, pct: (value / max) * 100 }));
  }, [breakdown]);

  const fullWatchPct =
    data && data.views > 0 ? Math.round((data.completions / data.views) * 100) : null;

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

  if (isLoading) return <PageLoader withLayout={false} message="Loading analytics..." />;

  if (isForbidden) {
    return (
      <div className="text-center py-16 space-y-4">
        <Lock className="h-10 w-10 mx-auto" style={{ color: "var(--faint)" }} />
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 22, color: "var(--txt)" }}>
          Analytics is a Premium feature
        </h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Upgrade this campaign&apos;s tier to unlock views, completions, and the demographic breakdown.
        </p>
        <Link href={routes.BRAND.CAMPAIGNS} className="inline-block">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4" />
            Back to campaigns
          </Button>
        </Link>
      </div>
    );
  }

  if (error || !data) {
    return (
      <PageError withLayout={false} title="Failed to Load Analytics" message="Unable to load campaign analytics. Please try again." />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--faint)",
            }}>
            Brands / Analytics
          </p>
          <Link href={`${routes.BRAND.CAMPAIGNS}/${campaignId}`} className="inline-block mt-1">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to campaign
            </Button>
          </Link>
          <h1
            className="mt-2"
            style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Who watched you
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Aggregated from viewer profiles. Premium plans only. No individual viewer is ever
            identified.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="brandish">Premium</Pill>
          <Button variant="ghost" disabled={exporting} onClick={handleExport}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Stat label="Plays" value={data.views} />
        <Stat label="Full watches" value={fullWatchPct !== null ? `${fullWatchPct}%` : "—"} valueColor="var(--live)" />
        <Stat label="Completions" value={data.completions} />
        <Stat label="Unique viewers" value={data.uniqueViewers ?? "—"} />
        <Stat
          label="Cost per completed view"
          value={data.costPerCompletedView !== undefined ? `$${data.costPerCompletedView.toFixed(2)}` : "—"}
        />
        {/* Click-through (2026-09-02) — only meaningful for a campaign with
            a brandUrl/campaignUrl set; a campaign with neither will just
            show 0 clicks / 0% CTR, which is correct, not a loading state. */}
        <Stat label="Clicks" value={data.clicks ?? "—"} />
        <Stat
          className="col-span-2 sm:col-span-1"
          label="Click-through rate"
          value={data.clickThroughRate !== undefined ? `${(data.clickThroughRate * 100).toFixed(1)}%` : "—"}
        />
      </div>

      {data.timeSeries && data.timeSeries.length > 0 && (
        <Card>
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Plays over time</h3>
          <div className="flex items-end gap-1 h-28 mt-3">
            {data.timeSeries.map((point) => {
              const max = Math.max(...data.timeSeries!.map((p) => p.views), 1);
              return (
                <div key={point.date} className="flex-1 flex flex-col items-center justify-end" title={point.date}>
                  <div
                    className="w-full rounded-t"
                    style={{ height: `${Math.max(4, (point.views / max) * 100)}%`, background: "var(--accent)", opacity: 0.75 }}
                  />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Where they watched from</h3>
          <select
            className="fb-input"
            style={{ width: "auto" }}
            value={dimension}
            onChange={(e) => setDimension(e.target.value as AnalyticsBreakdownDimension)}>
            {DIMENSIONS.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="mt-3 space-y-2.5">
          {loadingBreakdown ? (
            <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--muted)" }} />
          ) : breakdownEntries.length === 0 ? (
            <CardNote>No buckets meet the minimum cohort size yet for this dimension.</CardNote>
          ) : (
            breakdownEntries.map(({ key, value, pct }) => (
              <div key={key} className="flex items-center gap-3">
                <span style={{ fontSize: 12.5, color: "var(--muted)", width: 110, flexShrink: 0, textTransform: "capitalize" }}>
                  {key}
                </span>
                <div className="flex-1">
                  <Progress value={pct} />
                </div>
                <b style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--txt)", width: 56, textAlign: "right", flexShrink: 0 }}>
                  {value}
                </b>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
