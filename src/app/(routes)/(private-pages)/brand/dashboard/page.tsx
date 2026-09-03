"use client";

import { useMemo } from "react";
import { Stat } from "@/components/ui/freebiz-stat";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeadCell,
  TableCell,
} from "@/components/ui/freebiz-table";
import { Plus } from "lucide-react";
import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { AdCampaign, AdCampaignsResponse, MarketplaceProduct, MarketplaceProductsResponse } from "@/types";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { formatStatusLabel, STATUS_TONE } from "../campaigns/campaign-status";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// design/freebiz-mockup.html data-screen="b-dash". Per DECISIONS.md #12,
// this route gets the stats grid + first 4 table rows, truncated with a
// "See all campaigns" link to /brand/campaigns (the full, filterable
// version of the same table — DECISIONS.md #13).
//
// The mockup's own 4 stats (Plays today, Watched to the end %, Spend
// today, In review) and its table's "Plays" column all need a per-day
// analytics rollup this endpoint doesn't return — GET /ad-campaigns/mine
// is just the raw campaign list, and per-campaign play/completion numbers
// only exist behind the Premium-gated analytics endpoint. Rather than fake
// numbers, the stats here are the ones actually derivable from the list
// (Active/Draft/Deactivated/Total/Products), matching what the dashboard
// already computed before this rebuild. The mockup's "In review" status
// and its whole reviewer-note/"Reply to reviewer" flow are also gone —
// BUSINESS_RULES.md is explicit that campaigns go live immediately on
// payment and there's no single-campaign approve/reject step anymore;
// moderation is only a reactive admin takedown, surfaced here as
// "Deactivated" (moderationStatus REJECTED).
export default function BrandDashboard() {
  const user = useAtomValue(userAtom);

  const { data: campaigns, error, isLoading } = useQuery<AdCampaign[]>({
    queryKey: ["ad-campaigns-mine", user?.id],
    queryFn: () =>
      api.get<AdCampaignsResponse>(ENDPOINTS.AD_CAMPAIGNS_MINE).then((res) => res.data.campaigns),
    enabled: !!user?.accessToken,
  });

  const { data: products } = useQuery<MarketplaceProduct[]>({
    queryKey: ["marketplace-products-mine"],
    queryFn: () =>
      api.get<MarketplaceProductsResponse>(ENDPOINTS.MARKETPLACE_PRODUCTS_MINE).then((res) => res.data.products),
    enabled: !!user?.accessToken,
  });

  const myProductCount = products?.length ?? 0;

  const stats = useMemo(() => {
    const list = campaigns ?? [];
    return {
      active: list.filter((c) => c.status === "ACTIVE").length,
      draft: list.filter((c) => c.status === "DRAFT").length,
      // Campaigns go live automatically on payment now — the only reason a
      // campaign stops running post-payment is an admin takedown for
      // inappropriate content, surfaced via moderationStatus REJECTED.
      rejected: list.filter((c) => c.moderationStatus === "REJECTED").length,
      total: list.length,
    };
  }, [campaigns]);

  const recentCampaigns = useMemo(
    () =>
      [...(campaigns ?? [])]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 4),
    [campaigns]
  );

  if (isLoading) return <PageLoader withLayout={false} message="Loading dashboard..." />;

  if (error) {
    return (
      <PageError withLayout={false} title="Failed to Load Dashboard" message="Unable to load dashboard data. Please try again." />
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
            Brands / Dashboard
          </p>
          <h1
            className="mt-1"
            style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            {user?.companyName || "Your dashboard"}
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Sixty seconds of attention, bought by the day. Here&apos;s how your ads are doing.
          </p>
        </div>
        <Link href={routes.BRAND.CAMPAIGNS_CREATE}>
          <Button variant="primary">
            <Plus className="h-4 w-4" />
            New campaign
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat label="Active" value={stats.active} valueColor="var(--live)" />
        <Stat label="Draft" value={stats.draft} />
        <Stat label="Deactivated" value={stats.rejected} valueColor="var(--spent)" />
        <Stat label="Total" value={stats.total} />
        <Stat label="Products" value={myProductCount} />
      </div>

      <Card tight>
        <div className="flex items-center justify-between px-3 pt-2">
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Recent campaigns</h3>
          <Link href={routes.BRAND.CAMPAIGNS}>
            <Button size="sm" variant="ghost">See all campaigns</Button>
          </Link>
        </div>

        {recentCampaigns.length > 0 ? (
          <>
            <div className="hidden md:block mt-2">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Campaign</TableHeadCell>
                    <TableHeadCell>Video</TableHeadCell>
                    <TableHeadCell>Slot</TableHeadCell>
                    <TableHeadCell>Created</TableHeadCell>
                    <TableHeadCell>Status</TableHeadCell>
                    <TableHeadCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentCampaigns.map((campaign) => (
                    <TableRow key={campaign._id}>
                      <TableCell>
                        <b style={{ color: "var(--txt)" }}>{campaign.title}</b>
                      </TableCell>
                      <TableCell className="fb-hint" style={{ fontFamily: "var(--mono)" }}>
                        {formatDuration(campaign.videoDurationSeconds)}
                      </TableCell>
                      <TableCell>
                        <Pill tone={campaign.tier === "premium" ? "brandish" : "default"}>
                          {campaign.tier === "premium" ? "Premium" : "Basic"}
                        </Pill>
                      </TableCell>
                      <TableCell className="fb-hint">{new Date(campaign.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Pill tone={STATUS_TONE[campaign.status]} dot>
                          {formatStatusLabel(campaign.status)}
                        </Pill>
                      </TableCell>
                      <TableCell style={{ textAlign: "right" }}>
                        <Link href={`${routes.BRAND.CAMPAIGNS}/${campaign._id}`}>
                          <Button size="sm" variant="ghost">View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="md:hidden mt-2 space-y-2 px-2 pb-2">
              {recentCampaigns.map((campaign) => (
                <Link
                  key={campaign._id}
                  href={`${routes.BRAND.CAMPAIGNS}/${campaign._id}`}
                  className="block p-2.5 rounded-lg"
                  style={{ border: "1px solid var(--line)" }}>
                  <div className="flex items-start justify-between gap-2">
                    <b style={{ fontSize: 13.5, color: "var(--txt)" }}>{campaign.title}</b>
                    <Pill tone={STATUS_TONE[campaign.status]} dot>{formatStatusLabel(campaign.status)}</Pill>
                  </div>
                  <p className="fb-hint mt-1">
                    {campaign.tier === "premium" ? "Premium" : "Basic"} · {formatDuration(campaign.videoDurationSeconds)} ·{" "}
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="px-3 pb-3">
            <CardNote>No campaigns yet.</CardNote>
            <Link href={routes.BRAND.CAMPAIGNS_CREATE} className="inline-block mt-3">
              <Button variant="primary">
                <Plus className="h-4 w-4" />
                Create your first campaign
              </Button>
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
