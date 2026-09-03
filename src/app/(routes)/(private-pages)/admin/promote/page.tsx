"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban,
  Calendar,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { Field } from "@/components/ui/freebiz-field";
import { Input, Textarea } from "@/components/ui/freebiz-input";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { apiErrorMessage } from "@/app/_utils/helper";
import { usePromoteCampaignsModeration, usePromoteLeaderboard } from "@/hooks/use-promote";
import {
  PromoCampaign,
  PromoCampaignsResponse,
  PromoDisqualifiedPromoter,
  PromoDisqualifiedPromotersResponse,
  PromoPeriodSettleResponse,
  PromoPrizePeriod,
  PromoPrizePeriodResponse,
  PromoPrizePeriodsResponse,
} from "@/types";

const CAMPAIGNS_KEY = ["promote-campaigns-admin"];
const PERIODS_KEY = ["promote-periods-admin"];
const DISQUALIFIED_KEY = ["promote-disqualified-admin"];

// design/freebiz-mockup.html data-screen="a-contest" — visual reference
// only. The mockup's per-contest "pot held / release the pot" model doesn't
// exist (docs/FRONTEND_IMPLEMENTATION_GUIDE.md §2 Revamp 5): there's one
// platform-wide cumulative leaderboard and one admin-opened prize period at
// a time, settled once. Two admin actions here have no list-driven source
// in the API — GET /admin/promote/likes (to browse likes and find one to
// void) doesn't exist — so "Void a like" is a manual likeId entry, the same
// pattern as any other action this API only supports by ID. Disqualify
// reads real userIds off the live leaderboard; requalify reads real userIds
// off the disqualified-promoters list.
export default function AdminPromotePage() {
  const queryClient = useQueryClient();
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<"all" | "ACTIVE" | "PAUSED">("all");
  const [campaignReason, setCampaignReason] = useState("");
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(new Set());

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [prizeDescription, setPrizeDescription] = useState("");
  const [prizeAmount, setPrizeAmount] = useState("");
  const [currency, setCurrency] = useState("NGN");

  const [voidLikeId, setVoidLikeId] = useState("");
  const [voidReason, setVoidReason] = useState("");
  const [disqualifyReasons, setDisqualifyReasons] = useState<Record<string, string>>({});

  const {
    data: campaigns,
    error: campaignsError,
    isLoading: loadingCampaigns,
  } = useQuery<PromoCampaign[]>({
    queryKey: [...CAMPAIGNS_KEY, campaignStatusFilter],
    queryFn: () =>
      api
        .get<PromoCampaignsResponse>(
          `${ENDPOINTS.PROMOTE_CAMPAIGNS}${campaignStatusFilter !== "all" ? `?status=${campaignStatusFilter}` : ""}`
        )
        .then((res) => res.data.campaigns),
  });

  const { deactivate, reactivate } = usePromoteCampaignsModeration();

  const toggleCampaignSelected = (id: string) => {
    setSelectedCampaignIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { data: periods, isLoading: loadingPeriods } = useQuery<PromoPrizePeriod[]>({
    queryKey: PERIODS_KEY,
    queryFn: () => api.get<PromoPrizePeriodsResponse>(ENDPOINTS.ADMIN_PROMOTE_PERIODS).then((res) => res.data.periods),
  });

  const openPeriod = useMutation({
    mutationFn: () =>
      api
        .post<PromoPrizePeriodResponse>(ENDPOINTS.ADMIN_PROMOTE_PERIODS, {
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(periodEnd).toISOString(),
          prizeDescription: prizeDescription.trim(),
          prizeAmount: prizeAmount ? Number(prizeAmount) : undefined,
          currency: prizeAmount ? currency : undefined,
        })
        .then((res) => res.data.period),
    onSuccess: () => {
      toast.success("Prize period opened.");
      queryClient.invalidateQueries({ queryKey: PERIODS_KEY });
      queryClient.invalidateQueries({ queryKey: ["promote-leaderboard"] });
      setPeriodStart("");
      setPeriodEnd("");
      setPrizeDescription("");
      setPrizeAmount("");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to open prize period.")),
  });

  const settlePeriod = useMutation({
    mutationFn: (periodId: string) =>
      api.post<PromoPeriodSettleResponse>(ENDPOINTS.ADMIN_PROMOTE_PERIOD_SETTLE(periodId)).then((res) => res.data),
    onSuccess: (data) => {
      toast.success(
        data.winnerUserId
          ? `Settled — winning total ${data.winningLikeTotal?.toLocaleString() ?? "—"} likes.`
          : "Settled — no eligible winner."
      );
      queryClient.invalidateQueries({ queryKey: PERIODS_KEY });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to settle this period.")),
  });

  const cancelPeriod = useMutation({
    mutationFn: ({ periodId, reason }: { periodId: string; reason: string }) =>
      api.post(ENDPOINTS.ADMIN_PROMOTE_PERIOD_CANCEL(periodId), { reason }),
    onSuccess: () => {
      toast.success("Period cancelled.");
      queryClient.invalidateQueries({ queryKey: PERIODS_KEY });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to cancel this period.")),
  });

  const openPeriodRow = periods?.find((p) => p.status === "OPEN");
  const { data: leaderboard, isLoading: loadingLeaderboard } = usePromoteLeaderboard(openPeriodRow?._id);

  const voidLike = useMutation({
    mutationFn: () => api.post(ENDPOINTS.ADMIN_PROMOTE_LIKE_VOID(voidLikeId.trim()), { reason: voidReason.trim() }),
    onSuccess: () => {
      toast.success("Like voided.");
      queryClient.invalidateQueries({ queryKey: ["promote-leaderboard"] });
      setVoidLikeId("");
      setVoidReason("");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to void this like.")),
  });

  const disqualify = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      api.post(ENDPOINTS.ADMIN_PROMOTE_PROMOTER_DISQUALIFY(userId), { reason }),
    onSuccess: () => {
      toast.success("Promoter disqualified.");
      queryClient.invalidateQueries({ queryKey: DISQUALIFIED_KEY });
      queryClient.invalidateQueries({ queryKey: ["promote-leaderboard"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to disqualify this promoter.")),
  });

  const { data: disqualified, isLoading: loadingDisqualified } = useQuery<PromoDisqualifiedPromoter[]>({
    queryKey: DISQUALIFIED_KEY,
    queryFn: () =>
      api
        .get<PromoDisqualifiedPromotersResponse>(ENDPOINTS.ADMIN_PROMOTE_PROMOTERS_DISQUALIFIED)
        .then((res) => res.data.promoters),
  });

  const requalify = useMutation({
    mutationFn: (userId: string) => api.post(ENDPOINTS.ADMIN_PROMOTE_PROMOTER_REQUALIFY(userId)),
    onSuccess: () => {
      toast.success("Promoter requalified.");
      queryClient.invalidateQueries({ queryKey: DISQUALIFIED_KEY });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Failed to requalify this promoter.")),
  });

  if (loadingCampaigns) return <PageLoader withLayout={false} message="Loading Promote & Earn..." />;
  if (campaignsError) {
    return (
      <PageError withLayout={false}
        title="Failed to Load"
        message="Unable to load Promote & Earn campaigns. Please try again."
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
            Admin / Promote &amp; earn
          </p>
          <h1
            className="mt-1"
            style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Promote &amp; earn
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            One cumulative, platform-wide leaderboard. A daily job opens and settles the week&apos;s
            period automatically (Mon–Sun, platform timezone) — use the panel below only to
            override with a one-off prize, or to cancel/settle early.
          </p>
        </div>
        {openPeriodRow ? (
          <Pill tone="live" dot>Period open · {openPeriodRow.prizeDescription}</Pill>
        ) : (
          <Pill tone="default">No period open</Pill>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <Card>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4" style={{ color: "var(--free)" }} />
              <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>
                Live leaderboard{openPeriodRow ? "" : " (no period open)"}
              </h3>
            </div>
            {loadingLeaderboard ? (
              <Loader2 className="h-4 w-4 animate-spin mt-3" style={{ color: "var(--muted)" }} />
            ) : !leaderboard || leaderboard.entries.length === 0 ? (
              <CardNote className="mt-2">No likes recorded yet.</CardNote>
            ) : (
              <div className="mt-3 space-y-2">
                {leaderboard.entries.slice(0, 10).map((entry) => (
                  <div key={entry.promoterUserId} className="flex items-center justify-between gap-3" style={{ fontSize: 13 }}>
                    <span style={{ color: "var(--txt)" }}>
                      <b style={{ fontFamily: "var(--mono)" }}>#{entry.rank}</b> {entry.displayName}
                    </span>
                    <div className="flex items-center gap-2">
                      <b style={{ fontFamily: "var(--mono)", color: "var(--free)" }}>{entry.likeCount.toLocaleString()}</b>
                      <Input
                        placeholder="Reason"
                        value={disqualifyReasons[entry.promoterUserId] ?? ""}
                        onChange={(e) =>
                          setDisqualifyReasons((prev) => ({ ...prev, [entry.promoterUserId]: e.target.value }))
                        }
                        style={{ width: 110, height: 28, fontSize: 11.5 }}
                      />
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={disqualify.isPending}
                        onClick={() => {
                          const reason = disqualifyReasons[entry.promoterUserId]?.trim();
                          if (!reason) {
                            toast.error("A reason is required to disqualify a promoter.");
                            return;
                          }
                          disqualify.mutate({ userId: entry.promoterUserId, reason });
                        }}>
                        Disqualify
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Campaign moderation</h3>
              <div className="flex gap-1.5 ml-auto">
                {(["all", "ACTIVE", "PAUSED"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setCampaignStatusFilter(s)}
                    className={`fb-pill${campaignStatusFilter === s ? " fb-pill--live" : ""}`}
                    style={{ cursor: "pointer" }}>
                    {s === "all" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {!campaigns || campaigns.length === 0 ? (
              <CardNote className="mt-2">No campaigns match this filter.</CardNote>
            ) : (
              <>
                <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
                  {campaigns.map((campaign) => (
                    <label key={campaign._id} className="flex items-center gap-2.5 py-1.5" style={{ fontSize: 13 }}>
                      <input
                        type="checkbox"
                        checked={selectedCampaignIds.has(campaign._id)}
                        onChange={() => toggleCampaignSelected(campaign._id)}
                      />
                      <span style={{ color: "var(--txt)" }} className="flex-1 truncate">{campaign.title}</span>
                      <span className="fb-hint">{campaign.brandName}</span>
                      <Pill tone={campaign.status === "ACTIVE" ? "live" : "warn"} dot>
                        {campaign.status === "ACTIVE" ? "Active" : "Paused"}
                      </Pill>
                    </label>
                  ))}
                </div>

                <Field label="Reason (optional)" className="mt-3">
                  <Input value={campaignReason} onChange={(e) => setCampaignReason(e.target.value)} placeholder="e.g. Inappropriate media" />
                </Field>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={selectedCampaignIds.size === 0 || deactivate.isPending}
                    onClick={() =>
                      deactivate.mutate(
                        { campaignIds: Array.from(selectedCampaignIds), reason: campaignReason.trim() || undefined },
                        {
                          onSuccess: (data) => {
                            toast.success(`Paused ${data.affected} of ${data.matched} campaign(s).`);
                            setSelectedCampaignIds(new Set());
                            setCampaignReason("");
                          },
                          onError: (err) => toast.error(apiErrorMessage(err, "Failed to pause campaigns.")),
                        }
                      )
                    }>
                    <Ban className="h-3.5 w-3.5" />
                    Pause selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={selectedCampaignIds.size === 0 || reactivate.isPending}
                    onClick={() =>
                      reactivate.mutate(
                        { campaignIds: Array.from(selectedCampaignIds) },
                        {
                          onSuccess: (data) => {
                            toast.success(`Reactivated ${data.affected} of ${data.matched} campaign(s).`);
                            setSelectedCampaignIds(new Set());
                          },
                          onError: (err) => toast.error(apiErrorMessage(err, "Failed to reactivate campaigns.")),
                        }
                      )
                    }>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reactivate selected
                  </Button>
                </div>
              </>
            )}
          </Card>

          <Card>
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Void a like</h3>
            <p className="fb-hint mt-1">
              There&apos;s no browsable like list in this API yet — enter the likeId from your own
              investigation.
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Like ID">
                <Input value={voidLikeId} onChange={(e) => setVoidLikeId(e.target.value)} placeholder="likeId" />
              </Field>
              <Field label="Reason">
                <Input value={voidReason} onChange={(e) => setVoidReason(e.target.value)} placeholder="e.g. Bought likes" />
              </Field>
            </div>
            <Button
              variant="danger"
              className="mt-3"
              disabled={!voidLikeId.trim() || !voidReason.trim() || voidLike.isPending}
              onClick={() => voidLike.mutate()}>
              {voidLike.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldAlert className="h-4 w-4" />}
              Void like
            </Button>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Open a prize period</h3>
            <div className="mt-3 space-y-2.5">
              <Field label="Starts">
                <Input type="datetime-local" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              </Field>
              <Field label="Ends">
                <Input type="datetime-local" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
              </Field>
              <Field label="Prize description">
                <Textarea rows={2} value={prizeDescription} onChange={(e) => setPrizeDescription(e.target.value)} placeholder="e.g. ₦150,000 cash to the top promoter" />
              </Field>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Cash amount (optional)">
                  <Input type="number" value={prizeAmount} onChange={(e) => setPrizeAmount(e.target.value)} placeholder="150000" />
                </Field>
                <Field label="Currency">
                  <Input value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!prizeAmount} />
                </Field>
              </div>
            </div>
            <Button
              variant="primary"
              className="mt-3"
              disabled={!periodStart || !periodEnd || !prizeDescription.trim() || openPeriod.isPending}
              onClick={() => openPeriod.mutate()}>
              {openPeriod.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Open period
            </Button>
          </Card>

          <Card tight>
            <p className="fb-hint px-3 pt-2 pb-1">Periods</p>
            {loadingPeriods ? (
              <Loader2 className="h-4 w-4 animate-spin mx-3 my-2" style={{ color: "var(--muted)" }} />
            ) : !periods || periods.length === 0 ? (
              <CardNote className="px-3 pb-3">No prize periods yet.</CardNote>
            ) : (
              <div>
                {periods.map((period) => (
                  <div key={period._id} className="px-3 py-2.5" style={{ borderTop: "1px solid var(--line)" }}>
                    <div className="flex items-start justify-between gap-2">
                      <b style={{ fontSize: 13, color: "var(--txt)" }}>{period.prizeDescription}</b>
                      <div className="flex items-center gap-1.5">
                        {period.createdBy === "system" && <Pill tone="info">Automatic</Pill>}
                        <Pill tone={period.status === "OPEN" ? "live" : period.status === "SETTLED" ? "default" : "bad"} dot={period.status === "OPEN"}>
                          {period.status}
                        </Pill>
                      </div>
                    </div>
                    <p className="fb-hint mt-1">
                      {new Date(period.periodStart).toLocaleDateString()} – {new Date(period.periodEnd).toLocaleDateString()}
                      {period.prizeAmount ? ` · ${period.currency ?? ""} ${period.prizeAmount.toLocaleString()}` : ""}
                    </p>
                    {period.status === "SETTLED" && (
                      <p className="fb-hint mt-1">
                        Winner total: {period.winningLikeTotal?.toLocaleString() ?? "—"} likes
                        {period.settledAt
                          ? ` · settled ${new Date(period.settledAt).toLocaleDateString()} (${period.settledBy === "system" ? "automatic" : "by admin"})`
                          : ""}
                      </p>
                    )}
                    {period.status === "OPEN" && (
                      <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="primary" disabled={settlePeriod.isPending} onClick={() => settlePeriod.mutate(period._id)}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Settle
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={cancelPeriod.isPending}
                          onClick={() => cancelPeriod.mutate({ periodId: period._id, reason: "Cancelled by admin" })}>
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card tight>
            <p className="fb-hint px-3 pt-2 pb-1">Disqualified promoters</p>
            {loadingDisqualified ? (
              <Loader2 className="h-4 w-4 animate-spin mx-3 my-2" style={{ color: "var(--muted)" }} />
            ) : !disqualified || disqualified.length === 0 ? (
              <CardNote className="px-3 pb-3">No disqualified promoters.</CardNote>
            ) : (
              <div>
                {disqualified.map((p) => (
                  <div key={p.userId} className="flex items-center justify-between gap-2 px-3 py-2.5" style={{ borderTop: "1px solid var(--line)" }}>
                    <div className="min-w-0">
                      <b style={{ fontSize: 13, color: "var(--txt)" }} className="block truncate">{p.displayName}</b>
                      <span className="fb-hint">{p.reason}</span>
                    </div>
                    <Button size="sm" variant="ghost" disabled={requalify.isPending} onClick={() => requalify.mutate(p.userId)}>
                      Requalify
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
