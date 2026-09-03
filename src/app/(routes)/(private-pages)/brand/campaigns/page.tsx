"use client";

import { useMemo, useState } from "react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeadCell,
  TableCell,
} from "@/components/ui/freebiz-table";
import { Plus, Search, BarChart3 } from "lucide-react";
import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { AdCampaign, AdCampaignsResponse } from "@/types";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { GoLiveDialog } from "@/components/brand/go-live-dialog";
import { formatStatusLabel, STATUS_TONE } from "./campaign-status";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

const FILTERS = ["all", "DRAFT", "PENDING_PAYMENT", "ACTIVE", "PAUSED", "EXPIRED", "REJECTED"] as const;

// design/freebiz-mockup.html data-screen="b-dash" — same table this
// campaign's dashboard truncates, here shown in full with search + status
// filters (DECISIONS.md #13). GET /ad-campaigns/mine items now carry
// playsToday/completionRateToday (§2 Revamp 6) — restoring the mockup's
// "Plays" column as a lightweight glance, distinct from the Premium-only
// deep-analytics screen. Its Edit/Duplicate/"Read note" row actions still
// have no backing endpoint and stay dropped — the real per-status actions
// (View, Analytics for Premium, Go Live / Complete Payment via the existing
// GoLiveDialog) are kept as-is.
export default function BrandCampaignsPage() {
  const user = useAtomValue(userAtom);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdCampaign["status"]>("all");
  const [goLiveCampaign, setGoLiveCampaign] = useState<AdCampaign | null>(null);

  const {
    data: campaigns,
    error: campaignsError,
    isLoading: loadingCampaigns,
  } = useQuery<AdCampaign[]>({
    queryKey: ["ad-campaigns-mine", user?.id],
    queryFn: () =>
      api.get<AdCampaignsResponse>(ENDPOINTS.AD_CAMPAIGNS_MINE).then((res) => res.data.campaigns),
    enabled: !!user?.accessToken,
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

  if (loadingCampaigns) return <PageLoader withLayout={false} message="Loading campaigns..." />;

  if (campaignsError) {
    return (
      <PageError withLayout={false}
        title="Failed to Load Campaigns"
        message="Unable to load your campaigns. Please check your connection and try again."
      />
    );
  }

  const rowAction = (campaign: AdCampaign) => {
    if (campaign.status === "DRAFT") {
      return (
        <Button size="sm" variant="primary" onClick={() => setGoLiveCampaign(campaign)}>
          Go live
        </Button>
      );
    }
    if (campaign.status === "PENDING_PAYMENT") {
      return (
        <Button size="sm" variant="primary" onClick={() => setGoLiveCampaign(campaign)}>
          Complete payment
        </Button>
      );
    }
    if (campaign.tier === "premium") {
      return (
        <Link href={routes.BRAND.CAMPAIGN_ANALYTICS(campaign._id)}>
          <Button size="sm" variant="ghost">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics
          </Button>
        </Link>
      );
    }
    return (
      <Link href={`${routes.BRAND.CAMPAIGNS}/${campaign._id}`}>
        <Button size="sm" variant="ghost">View</Button>
      </Link>
    );
  };

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
            Brands / Campaigns
          </p>
          <h1
            className="mt-1"
            style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            All campaigns
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Create and manage your video ad campaigns.
          </p>
        </div>
        <Link href={routes.BRAND.CAMPAIGNS_CREATE}>
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            New campaign
          </Button>
        </Link>
      </div>

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

      {filteredCampaigns.length === 0 ? (
        <Card>
          <CardNote>
            {searchQuery || statusFilter !== "all"
              ? "No campaigns match your search or filters."
              : "No campaigns yet — create your first ad campaign to start reaching viewers."}
          </CardNote>
          {!searchQuery && statusFilter === "all" && (
            <Link href={routes.BRAND.CAMPAIGNS_CREATE} className="inline-block mt-3">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                Create first campaign
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <>
          <Card tight className="hidden md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Campaign</TableHeadCell>
                  <TableHeadCell>Video</TableHeadCell>
                  <TableHeadCell>Slot</TableHeadCell>
                  <TableHeadCell>Today</TableHeadCell>
                  <TableHeadCell>Created</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign._id}>
                    <TableCell>
                      <b style={{ color: "var(--txt)" }}>{campaign.title}</b>
                      {campaign.moderationStatus === "REJECTED" && campaign.moderationReason && (
                        <div className="fb-hint mt-0.5" style={{ color: "var(--spent)" }}>{campaign.moderationReason}</div>
                      )}
                    </TableCell>
                    <TableCell className="fb-hint" style={{ fontFamily: "var(--mono)" }}>
                      {formatDuration(campaign.videoDurationSeconds)}
                    </TableCell>
                    <TableCell>
                      <Pill tone={campaign.tier === "premium" ? "brandish" : "default"}>
                        {campaign.tier === "premium" ? "Premium" : "Basic"}
                      </Pill>
                    </TableCell>
                    <TableCell className="fb-hint">
                      {campaign.status === "ACTIVE" && campaign.playsToday !== undefined
                        ? `${campaign.playsToday} play${campaign.playsToday !== 1 ? "s" : ""}${
                            campaign.completionRateToday !== undefined
                              ? ` · ${Math.round(campaign.completionRateToday * 100)}%`
                              : ""
                          }`
                        : "—"}
                    </TableCell>
                    <TableCell className="fb-hint">{new Date(campaign.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Pill tone={STATUS_TONE[campaign.status]} dot>{formatStatusLabel(campaign.status)}</Pill>
                    </TableCell>
                    <TableCell style={{ textAlign: "right" }}>{rowAction(campaign)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="md:hidden space-y-2">
            {filteredCampaigns.map((campaign) => (
              <Card key={campaign._id} tight>
                <div className="flex items-start justify-between gap-2">
                  <b style={{ fontSize: 13.5, color: "var(--txt)" }}>{campaign.title}</b>
                  <Pill tone={STATUS_TONE[campaign.status]} dot>{formatStatusLabel(campaign.status)}</Pill>
                </div>
                <p className="fb-hint mt-1">
                  {campaign.tier === "premium" ? "Premium" : "Basic"} · {formatDuration(campaign.videoDurationSeconds)} ·{" "}
                  {new Date(campaign.createdAt).toLocaleDateString()}
                  {campaign.status === "ACTIVE" && campaign.playsToday !== undefined && (
                    <> · {campaign.playsToday} play{campaign.playsToday !== 1 ? "s" : ""} today</>
                  )}
                </p>
                {campaign.moderationStatus === "REJECTED" && campaign.moderationReason && (
                  <p className="fb-hint mt-1" style={{ color: "var(--spent)" }}>{campaign.moderationReason}</p>
                )}
                <div className="mt-2">{rowAction(campaign)}</div>
              </Card>
            ))}
          </div>
        </>
      )}

      <GoLiveDialog
        campaign={goLiveCampaign}
        open={!!goLiveCampaign}
        onOpenChange={(open) => !open && setGoLiveCampaign(null)}
      />
    </div>
  );
}
