"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { apiErrorCode, apiErrorMessage } from "@/app/_utils/helper";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Stat } from "@/components/ui/freebiz-stat";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { Progress } from "@/components/ui/freebiz-progress";
import { LimitRow } from "@/components/ui/freebiz-limit-row";
import { ArrowLeft, BarChart3, Clock, Rocket, Loader2, Pause, Play } from "lucide-react";
import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import {
  AdCampaign,
  AdCampaignAnalyticsBreakdownResponse,
  AdCampaignAnalyticsResponse,
  AdCampaignAnalyticsSummary,
  AdCampaignPauseResumeResponse,
  AdCampaignResponse,
} from "@/types";
import { GoLiveDialog } from "@/components/brand/go-live-dialog";
import { STATUS_TONE, MODERATION_TONE, daysLeft, formatStatusLabel } from "../campaign-status";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function BreakdownBars({ title, dimension, campaignId }: { title: string; dimension: "country" | "ageBand"; campaignId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["ad-campaign-analytics-breakdown", campaignId, dimension],
    queryFn: () =>
      api
        .get<AdCampaignAnalyticsBreakdownResponse>(
          `${ENDPOINTS.AD_CAMPAIGN_ANALYTICS_BREAKDOWN(campaignId)}?dimension=${dimension}`
        )
        .then((res) => res.data.breakdown),
    enabled: !!campaignId,
    retry: false,
  });

  const entries = useMemo(() => {
    if (!data) return [];
    const list = Object.entries(data).sort((a, b) => b[1] - a[1]);
    const max = Math.max(...list.map(([, v]) => v), 1);
    return list.map(([key, value]) => ({ key, value, pct: (value / max) * 100 }));
  }, [data]);

  return (
    <Card>
      <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>{title}</h3>
      <div className="mt-3 space-y-2.5">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--muted)" }} />
        ) : entries.length === 0 ? (
          <CardNote>No buckets meet the minimum cohort size yet.</CardNote>
        ) : (
          entries.map(({ key, value, pct }) => (
            <div key={key} className="flex items-center gap-3">
              <span style={{ fontSize: 12.5, color: "var(--muted)", width: 90, flexShrink: 0, textTransform: "capitalize" }}>
                {key}
              </span>
              <div className="flex-1">
                <Progress value={pct} />
              </div>
              <b style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--txt)", width: 48, textAlign: "right", flexShrink: 0 }}>
                {value}
              </b>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

// This route has no mockup screen — DECISIONS.md's "Campaign detail" spec
// builds it from parts of a-monitor (the video frame), b-analytics (the
// audience bars, Premium-gated the same way), and b-dash (the red-bordered
// status card), reusing only existing primitives.
//
// Pause/Resume (POST /ad-campaigns/:id/pause|resume, §2 Revamp 6) is now
// real — a brand can pause/resume their own live campaign penalty-free,
// distinct from an admin takedown (moderationStatus stays APPROVED, vs.
// REJECTED on a takedown, which only the admin's own reactivate can undo —
// a brand's own resume 403s ADMIN_TAKEDOWN in that case, handled distinctly
// below). No refund messaging anywhere for either pause or an admin
// takedown — CLAUDE.md is explicit nothing is refunded automatically.
// "Spend to date" is the flat one-time tier price already paid, not an
// accumulating figure, since campaigns aren't billed per day.
export default function ViewCampaignPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const queryClient = useQueryClient();
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

  const pauseMutation = useMutation({
    mutationFn: () =>
      api
        .post<AdCampaignPauseResumeResponse>(ENDPOINTS.AD_CAMPAIGN_PAUSE(campaignId))
        .then((res) => res.data.campaign),
    onSuccess: () => {
      toast.success("Campaign paused.");
      queryClient.invalidateQueries({ queryKey: ["ad-campaign", campaignId] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to pause campaign.")),
  });

  const resumeMutation = useMutation({
    mutationFn: () =>
      api
        .post<AdCampaignPauseResumeResponse>(ENDPOINTS.AD_CAMPAIGN_RESUME(campaignId))
        .then((res) => res.data.campaign),
    onSuccess: () => {
      toast.success("Campaign resumed.");
      queryClient.invalidateQueries({ queryKey: ["ad-campaign", campaignId] });
    },
    onError: (err) => {
      if (apiErrorCode(err) === "ADMIN_TAKEDOWN") {
        toast.error("An admin took this campaign down — contact support to resolve it.");
      } else {
        toast.error(apiErrorMessage(err, "Failed to resume campaign."));
      }
    },
  });

  const isPremium = campaign?.tier === "premium";

  const { data: analytics } = useQuery<AdCampaignAnalyticsSummary>({
    queryKey: ["ad-campaign-analytics", campaignId],
    queryFn: () =>
      api
        .get<AdCampaignAnalyticsResponse>(ENDPOINTS.AD_CAMPAIGN_ANALYTICS(campaignId))
        .then((res) => res.data.analytics),
    enabled: !!campaignId && isPremium,
    retry: false,
  });

  if (isLoading) return <PageLoader withLayout={false} message="Loading campaign details..." />;

  if (error) {
    return (
      <PageError withLayout={false}
        title="Failed to Load Campaign"
        message="Unable to load campaign details. Please check your connection and try again."
      />
    );
  }

  if (!campaign) {
    return <PageError withLayout={false} title="Campaign Not Found" message="The requested campaign could not be found." showRetry={false} />;
  }

  const remaining = daysLeft(campaign.expiresAt);
  const fullWatchPct =
    analytics && analytics.views > 0 ? Math.round((analytics.completions / analytics.views) * 100) : null;
  const spendToDate = campaign.paymentStatus === "paid" ? campaign.priceUSD : null;

  return (
    <div className="space-y-4">
      <div>
        <Link href={routes.BRAND.CAMPAIGNS} className="inline-block">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to campaigns
          </Button>
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3 mt-2">
          <div>
            <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 24, letterSpacing: "-0.02em", color: "var(--txt)" }}>
              {campaign.title}
            </h1>
            <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>{campaign.description}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {isPremium && (
              <Link href={routes.BRAND.CAMPAIGN_ANALYTICS(campaignId)}>
                <Button variant="ghost">
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Button>
              </Link>
            )}
            {campaign.status === "DRAFT" ? (
              <Button variant="primary" onClick={() => setShowGoLive(true)}>
                <Rocket className="h-4 w-4" />
                Go live
              </Button>
            ) : campaign.status === "PENDING_PAYMENT" ? (
              <Button variant="primary" onClick={() => setShowGoLive(true)}>
                <Rocket className="h-4 w-4" />
                Complete payment
              </Button>
            ) : campaign.status === "ACTIVE" ? (
              <Button variant="ghost" disabled={pauseMutation.isPending} onClick={() => pauseMutation.mutate()}>
                {pauseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                Pause
              </Button>
            ) : campaign.status === "PAUSED" && campaign.moderationStatus !== "REJECTED" ? (
              <Button variant="primary" disabled={resumeMutation.isPending} onClick={() => resumeMutation.mutate()}>
                {resumeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Resume
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3 p-3 rounded-lg" style={{ background: "var(--ink-800)", border: "1px solid var(--line)" }}>
          <Pill tone={STATUS_TONE[campaign.status]} dot>{formatStatusLabel(campaign.status)}</Pill>
          <Pill tone={MODERATION_TONE[campaign.moderationStatus]} dot>{formatStatusLabel(campaign.moderationStatus)}</Pill>
          <Pill tone={isPremium ? "brandish" : "default"}>{isPremium ? "Premium" : "Basic"}</Pill>
          <span className="fb-hint" style={{ fontFamily: "var(--mono)" }}>{formatDuration(campaign.videoDurationSeconds)}</span>
          {campaign.status === "ACTIVE" && remaining !== null && (
            <span className="flex items-center gap-1.5" style={{ fontSize: 12.5, color: "var(--txt)" }}>
              <Clock className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
              {remaining} day{remaining !== 1 ? "s" : ""} left
            </span>
          )}
        </div>

        {campaign.moderationStatus === "REJECTED" && campaign.moderationReason && (
          <Card className="mt-3" style={{ borderColor: "rgba(255,77,94,.3)" }}>
            <div className="flex items-start gap-3">
              <Pill tone="bad" dot>Taken down</Pill>
              <div>
                <h3 style={{ fontFamily: "var(--display)", fontSize: 14, color: "var(--txt)" }}>{campaign.title}</h3>
                <p className="fb-hint mt-1">{campaign.moderationReason}</p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {campaign.videoUrl && (
        <div className="rounded-2xl p-2" style={{ background: "var(--ink-800)", border: "1px solid var(--line)", boxShadow: "var(--shadow)" }}>
          <video src={campaign.videoUrl} controls className="w-full max-h-96 rounded-lg" style={{ background: "var(--ink-900)" }} />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isPremium && <Stat label="Plays" value={analytics?.views ?? "—"} />}
        {isPremium && <Stat label="Full watches" value={fullWatchPct !== null ? `${fullWatchPct}%` : "—"} valueColor="var(--live)" />}
        <Stat label="Spend to date" value={spendToDate !== null ? `$${spendToDate}` : "—"} />
        <Stat label="Days remaining" value={remaining ?? "—"} />
      </div>

      {isPremium && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <BreakdownBars title="Where they watched from" dimension="country" campaignId={campaignId} />
          <BreakdownBars title="Age" dimension="ageBand" campaignId={campaignId} />
        </div>
      )}

      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Schedule &amp; details</h3>
        <div className="mt-3">
          {campaign.brandUrl && (
            <LimitRow label="Brand URL" value={<a href={campaign.brandUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{campaign.brandUrl}</a>} />
          )}
          {campaign.campaignUrl && (
            <LimitRow label="Campaign URL" value={<a href={campaign.campaignUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>{campaign.campaignUrl}</a>} />
          )}
          {campaign.activatedAt && (
            <LimitRow label="Started" value={new Date(campaign.activatedAt).toLocaleDateString()} />
          )}
          {campaign.expiresAt && (
            <LimitRow label="Ends" value={new Date(campaign.expiresAt).toLocaleDateString()} />
          )}
          <LimitRow label="Cost" value={spendToDate !== null ? `$${spendToDate}` : "Not paid yet"} total />
        </div>
      </Card>

      <GoLiveDialog campaign={campaign} open={showGoLive} onOpenChange={setShowGoLive} />
    </div>
  );
}
