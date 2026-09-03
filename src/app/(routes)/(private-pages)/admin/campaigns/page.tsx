"use client";

import { useMemo, useState } from "react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Stat } from "@/components/ui/freebiz-stat";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { Field } from "@/components/ui/freebiz-field";
import { Input, Textarea } from "@/components/ui/freebiz-input";
import { LimitRow } from "@/components/ui/freebiz-limit-row";
import {
  Search,
  Ban,
  RotateCcw,
  Loader2,
  AlertTriangle,
  X,
  ShieldAlert,
  ShieldOff,
  Flag,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import {
  AdCampaign,
  AdCampaignDeactivateResponse,
  AdCampaignReactivateResponse,
  AdCampaignsResponse,
  AdCampaignWarnResponse,
  AdminBrandSuspendResponse,
} from "@/types";
import { apiErrorMessage } from "@/app/_utils/helper";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { useAdminConfig } from "@/hooks/use-admin-config";
import {
  STATUS_TONE,
  MODERATION_TONE,
  daysLeft,
  formatStatusLabel,
} from "../../brand/campaigns/campaign-status";

const CAMPAIGNS_QUERY_KEY = ["ad-campaigns-admin"];
const FILTERS = ["all", "DRAFT", "PENDING_PAYMENT", "ACTIVE", "PAUSED", "EXPIRED", "REJECTED"] as const;

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function isToday(iso?: string): boolean {
  if (!iso) return false;
  return new Date(iso).toDateString() === new Date().toDateString();
}

// design/freebiz-mockup.html data-screen="a-monitor". Per DECISIONS.md's
// "Live monitor — split it in two": Stage 1 shipped the bulk-select
// moderation list restyled to the mockup's queue-rail / player /
// take-down-panel layout. This is Stage 2 — the full ad-moderation
// subsystem (docs/FRONTEND_IMPLEMENTATION_GUIDE.md §2 Revamp 6) is real
// now: GET /ad-campaigns items carry reportCount/reportCountLastHour/
// flagged/flagReasons/brandStrikeCount/brandSuspended, and Warn
// (POST /ad-campaigns/:id/warn) and Suspend/Unsuspend brand
// (POST /admin/brands/:id/suspend|unsuspend) are real actions replacing
// the former "coming soon" disabled pills. The mockup's brand names
// (QuickKash, Kilimanjaro, ...) still don't exist on AdCampaign — only the
// raw brandId — so the queue and detail panel show that instead of a
// fabricated company name.
//
// The two original bulk mutations (deactivate/reactivate) are unchanged
// except `reason` is now required on deactivate (also now adds a strike
// per campaign, server-side) — that's what lets the same real endpoint
// back both the bulk toolbar (multi-select) and the per-campaign "Take it
// down" panel (single id).
export default function AdminCampaignsPage() {
  const queryClient = useQueryClient();
  const { get } = useAdminConfig();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdCampaign["status"]>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [skippedExpired, setSkippedExpired] = useState<AdCampaign[] | null>(null);

  const {
    data: campaigns,
    error: campaignsError,
    isLoading: loadingCampaigns,
  } = useQuery<AdCampaign[]>({
    queryKey: CAMPAIGNS_QUERY_KEY,
    queryFn: () =>
      api.get<AdCampaignsResponse>(ENDPOINTS.AD_CAMPAIGNS).then((res) => res.data.campaigns),
  });

  const filteredCampaigns = useMemo(() => {
    if (!campaigns) return [];
    return campaigns
      .filter((c) => {
        const matchesSearch =
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || c.status === statusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [campaigns, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const list = campaigns ?? [];
    const suspendedBrands = new Set(list.filter((c) => c.brandSuspended).map((c) => c.brandId));
    return {
      live: list.filter((c) => c.status === "ACTIVE").length,
      flagged: list.filter((c) => c.flagged).length,
      takenDownToday: list.filter((c) => c.moderationStatus === "REJECTED" && isToday(c.moderatedAt)).length,
      brandsSuspended: suspendedBrands.size,
    };
  }, [campaigns]);

  const focused = filteredCampaigns.find((c) => c._id === focusedId) ?? filteredCampaigns[0] ?? null;

  const selectedCount = selectedIds.size;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const deactivateMutation = useMutation({
    mutationFn: (campaignIds: string[]) =>
      api
        .post<AdCampaignDeactivateResponse>(ENDPOINTS.AD_CAMPAIGNS_DEACTIVATE, {
          campaignIds,
          reason: reason.trim(),
        })
        .then((res) => res.data),
    onSuccess: (data) => {
      toast.success(`Deactivated ${data.deactivated} of ${data.matched} campaign(s). A strike was added to each brand.`);
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
      clearSelection();
      setReason("");
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, "Failed to deactivate campaigns. Please try again."));
    },
  });

  const requireReason = (campaignIds: string[]) => {
    if (!reason.trim()) {
      toast.error("A reason is required to take a campaign down.");
      return;
    }
    deactivateMutation.mutate(campaignIds);
  };

  const warnMutation = useMutation({
    mutationFn: ({ campaignId, note }: { campaignId: string; note: string }) =>
      api
        .post<AdCampaignWarnResponse>(ENDPOINTS.AD_CAMPAIGN_WARN(campaignId), { note: note.trim() || undefined })
        .then((res) => res.data),
    onSuccess: (data) => {
      toast.success(
        data.autoSuspended
          ? `Warned — this brand just crossed the strike threshold and every one of their active campaigns was auto-suspended.`
          : `Warned. Strike ${data.strikeCount} on this brand.`
      );
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Failed to warn this brand.")),
  });

  const suspendBrandMutation = useMutation({
    mutationFn: ({ brandId, reason }: { brandId: string; reason: string }) =>
      api
        .post<AdminBrandSuspendResponse>(ENDPOINTS.ADMIN_BRAND_SUSPEND(brandId), { reason: reason.trim() })
        .then((res) => res.data),
    onSuccess: (data) => {
      toast.success(`Brand suspended — ${data.pausedCampaigns} campaign(s) paused.`);
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Failed to suspend this brand.")),
  });

  const unsuspendBrandMutation = useMutation({
    mutationFn: (brandId: string) => api.post(ENDPOINTS.ADMIN_BRAND_UNSUSPEND(brandId)),
    onSuccess: () => {
      toast.success("Brand unsuspended. Strikes and paused campaigns are unchanged — resume/reactivate as needed.");
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Failed to unsuspend this brand.")),
  });

  const reactivateMutation = useMutation({
    mutationFn: (campaignIds: string[]) =>
      api
        .post<AdCampaignReactivateResponse>(ENDPOINTS.AD_CAMPAIGNS_REACTIVATE, { campaignIds })
        .then((res) => res.data),
    onSuccess: (data) => {
      toast.success(`Reactivated ${data.reactivated} of ${data.matched} campaign(s).`);
      if (data.skippedExpired.length > 0) {
        const skipped = (campaigns ?? []).filter((c) => data.skippedExpired.includes(c._id));
        setSkippedExpired(skipped);
      }
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
      clearSelection();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, "Failed to reactivate campaigns. Please try again."));
    },
  });

  if (loadingCampaigns) return <PageLoader withLayout={false} message="Loading campaigns..." />;

  if (campaignsError) {
    return (
      <PageError withLayout={false}
        title="Failed to Load Campaigns"
        message="Unable to load campaigns. Please check your connection and try again."
      />
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
            Admin / Live monitor
          </p>
          <h1
            className="mt-1"
            style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Live monitor
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Ads go live the moment a brand publishes them. Your job is to watch what&apos;s running
            and pull down anything that breaks the standards.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="live" dot>{stats.live} live</Pill>
          {stats.flagged > 0 && <Pill tone="bad" dot="pulse">{stats.flagged} flagged</Pill>}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Live on the board" value={stats.live} valueColor="var(--live)" />
        <Stat label="Flagged for a look" value={stats.flagged} valueColor={stats.flagged > 0 ? "var(--spent)" : undefined} />
        <Stat label="Taken down today" value={stats.takenDownToday} valueColor="var(--spent)" />
        <Stat label="Brands suspended" value={stats.brandsSuspended} valueColor={stats.brandsSuspended > 0 ? "var(--spent)" : undefined} />
      </div>

      {skippedExpired && skippedExpired.length > 0 && (
        <Card style={{ borderColor: "rgba(255,77,94,.3)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "var(--spent)" }} />
              <div>
                <b style={{ fontSize: 13.5, color: "var(--txt)" }}>
                  {skippedExpired.length} campaign{skippedExpired.length !== 1 ? "s" : ""} couldn&apos;t be reactivated
                </b>
                <p className="fb-hint mt-1">
                  Their activation window already expired, so switching them back on isn&apos;t
                  enough — the brand needs to re-pay to go live again:
                </p>
                <ul className="mt-1.5" style={{ fontSize: 12.5, color: "var(--muted)", listStyle: "disc", paddingLeft: 18 }}>
                  {skippedExpired.map((c) => (
                    <li key={c._id}>{c.title}</li>
                  ))}
                </ul>
              </div>
            </div>
            <button onClick={() => setSkippedExpired(null)} aria-label="Dismiss" style={{ color: "var(--faint)" }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Field label="Search" className="w-full sm:max-w-xs">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--faint)" }} />
            <Input
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: 34 }}
            />
          </div>
        </Field>
        <div className="flex flex-wrap gap-2 sm:mt-6">
          {FILTERS.map((key) => {
            const count = key === "all" ? campaigns?.length ?? 0 : campaigns?.filter((c) => c.status === key).length ?? 0;
            const active = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`fb-pill${active ? " fb-pill--live" : ""}`}
                style={{ cursor: "pointer" }}>
                {key === "all" ? "All" : formatStatusLabel(key)} {count}
              </button>
            );
          })}
        </div>
      </div>

      {selectedCount > 0 && (
        <Card tight>
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <span style={{ fontSize: 13, color: "var(--txt)" }}>{selectedCount} selected</span>
            <Button size="sm" variant="ghost" disabled={reactivateMutation.isPending} onClick={() => reactivateMutation.mutate(Array.from(selectedIds))}>
              {reactivateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Reactivate
            </Button>
            <Button size="sm" variant="danger" disabled={deactivateMutation.isPending} onClick={() => requireReason(Array.from(selectedIds))}>
              <Ban className="h-3.5 w-3.5" />
              Deactivate
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>Clear selection</Button>
          </div>
        </Card>
      )}

      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardNote>
            {searchQuery || statusFilter !== "all" ? "No campaigns match your search or filters." : "No campaigns have been created yet."}
          </CardNote>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
          <Card tight className="lg:max-h-[640px] lg:overflow-y-auto">
            <p className="fb-hint px-3 pt-2 pb-1">Campaigns ({filteredCampaigns.length})</p>
            <div>
              {filteredCampaigns.map((campaign) => (
                <div
                  key={campaign._id}
                  className="flex items-start gap-2 px-3 py-2.5 cursor-pointer"
                  style={{
                    borderTop: "1px solid var(--line)",
                    background: focused?._id === campaign._id ? "var(--accent-soft)" : undefined,
                  }}
                  onClick={() => setFocusedId(campaign._id)}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(campaign._id)}
                    onChange={() => toggleSelected(campaign._id)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <b style={{ fontSize: 13, color: "var(--txt)" }} className="block truncate">{campaign.title}</b>
                      {campaign.flagged && <Flag className="h-3 w-3 flex-shrink-0" style={{ color: "var(--spent)" }} />}
                    </div>
                    <span className="fb-hint">
                      {formatDuration(campaign.videoDurationSeconds)} · {formatStatusLabel(campaign.status)}
                      {!!campaign.reportCount && ` · ${campaign.reportCount} report${campaign.reportCount !== 1 ? "s" : ""}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4 min-w-0">
            {focused && (
              <Card style={focused.moderationStatus === "REJECTED" ? { borderColor: "rgba(255,77,94,.3)" } : undefined}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 style={{ fontFamily: "var(--display)", fontSize: 16, color: "var(--txt)" }}>{focused.title}</h3>
                    <p className="fb-hint mt-1">
                      Brand {focused.brandId} · {focused.tier === "premium" ? "Premium" : "Basic"} slot · created{" "}
                      {new Date(focused.createdAt).toLocaleDateString()}
                      {focused.status === "ACTIVE" && daysLeft(focused.expiresAt) !== null && (
                        <> · {daysLeft(focused.expiresAt)} day{daysLeft(focused.expiresAt) !== 1 ? "s" : ""} left</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Pill tone={STATUS_TONE[focused.status]} dot>{formatStatusLabel(focused.status)}</Pill>
                    <Pill tone={MODERATION_TONE[focused.moderationStatus]} dot>{formatStatusLabel(focused.moderationStatus)}</Pill>
                    {focused.flagged && <Pill tone="bad" dot="pulse">Flagged</Pill>}
                    {focused.brandSuspended && <Pill tone="bad" dot>Brand suspended</Pill>}
                  </div>
                </div>

                {focused.videoUrl && (
                  <div className="mt-3 rounded-xl p-2" style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
                    <video src={focused.videoUrl} controls className="w-full max-h-72 rounded-lg" />
                  </div>
                )}

                {focused.moderationStatus === "REJECTED" && focused.moderationReason && (
                  <p className="mt-3 fb-hint" style={{ color: "var(--spent)" }}>{focused.moderationReason}</p>
                )}

                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Pill tone={focused.flagged ? "bad" : "default"}>
                      {focused.reportCount ?? 0} report{focused.reportCount !== 1 ? "s" : ""}
                    </Pill>
                    {!!focused.reportCountLastHour && (
                      <Pill tone="warn">{focused.reportCountLastHour} in the last hour</Pill>
                    )}
                    {typeof focused.brandStrikeCount === "number" && (
                      <Pill tone={focused.brandStrikeCount > 0 ? "warn" : "default"}>
                        Brand: {focused.brandStrikeCount} strike{focused.brandStrikeCount !== 1 ? "s" : ""}
                      </Pill>
                    )}
                  </div>
                  {focused.flagReasons && focused.flagReasons.length > 0 && (
                    <p className="fb-hint mt-1.5">{focused.flagReasons.join(" · ")}</p>
                  )}
                </div>
              </Card>
            )}

            {focused && (
              <Card>
                <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Take it down</h3>
                <p className="fb-hint mt-1">
                  This pulls the video off the billboard immediately, even if it&apos;s currently live
                  and already paid for. It can be reactivated later if this was a mistake — nothing is
                  refunded automatically. A reason is required and adds a strike to the brand.
                </p>
                <Field label="Reason (required for takedown, sent as the warn note too)" className="mt-3">
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Video contains inappropriate content"
                    rows={2}
                  />
                </Field>
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <Button
                    variant="danger"
                    disabled={deactivateMutation.isPending}
                    onClick={() => requireReason([focused._id])}>
                    {deactivateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                    Deactivate this campaign
                  </Button>
                  {focused.moderationStatus === "REJECTED" && (
                    <Button
                      variant="ghost"
                      disabled={reactivateMutation.isPending}
                      onClick={() => reactivateMutation.mutate([focused._id])}>
                      {reactivateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      Reactivate
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    disabled={warnMutation.isPending}
                    onClick={() => warnMutation.mutate({ campaignId: focused._id, note: reason })}>
                    {warnMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                    Warn, leave running
                  </Button>
                  {focused.brandSuspended ? (
                    <Button
                      variant="ghost"
                      className="sm:ml-auto"
                      disabled={unsuspendBrandMutation.isPending}
                      onClick={() => unsuspendBrandMutation.mutate(focused.brandId)}>
                      {unsuspendBrandMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                      Unsuspend brand
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      className="sm:ml-auto"
                      disabled={suspendBrandMutation.isPending}
                      onClick={() => {
                        if (!reason.trim()) {
                          toast.error("A reason is required to suspend a brand.");
                          return;
                        }
                        suspendBrandMutation.mutate({ brandId: focused.brandId, reason });
                      }}>
                      {suspendBrandMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
                      Suspend brand
                    </Button>
                  )}
                </div>
              </Card>
            )}

            <Card>
              <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>What gets flagged automatically</h3>
              <div className="mt-2.5">
                <LimitRow
                  label="Viewer reports"
                  value={`${get("adModeration.autoFlagReportThreshold")} within ${get("adModeration.autoFlagWindowMinutes")} min`}
                />
                <LimitRow label="Auto-suspend" value={`${get("adModeration.suspendStrikeThreshold")} strikes on a brand`} />
              </div>
              <p className="fb-hint mt-2">
                Auto-flag is a signal, never an automatic takedown — it just surfaces the campaign here for a look.
                Auto-suspend pauses every active campaign that brand has and blocks new campaigns, going live,
                self-resume, and Promote &amp; Earn campaign creation.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
