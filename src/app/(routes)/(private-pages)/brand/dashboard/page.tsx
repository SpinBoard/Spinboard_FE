"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Clock, FileEdit, Package, Plus, Target } from "lucide-react";
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
import { STATUS_STYLES, formatStatusLabel } from "../campaigns/campaign-status";

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
      pendingReview: list.filter((c) => c.moderationStatus === "PENDING" && c.status !== "DRAFT").length,
      total: list.length,
    };
  }, [campaigns]);

  const recentCampaigns = useMemo(
    () =>
      [...(campaigns ?? [])]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5),
    [campaigns]
  );

  if (isLoading) return <PageLoader message="Loading dashboard..." />;

  if (error) {
    return (
      <PageError title="Failed to Load Dashboard" message="Unable to load dashboard data. Please try again." />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-sora">Dashboard</h1>
          <p className="text-muted-foreground">Track your ad campaigns and product listings</p>
        </div>
        <Link href={routes.BRAND.CAMPAIGNS_CREATE}>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            Create Campaign
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/20 rounded-lg">
                <Activity className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-sora">{stats.active}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <FileEdit className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-sora">{stats.draft}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Draft</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-sora">{stats.total}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 backdrop-blur-sm border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/20 rounded-lg">
                <Package className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground font-sora">{myProductCount}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground font-sora text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-secondary" />
              Recent Campaigns
            </CardTitle>
            <Link href={routes.BRAND.CAMPAIGNS}>
              <Button variant="outline" size="sm" className="border-border text-foreground hover:bg-white/10">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentCampaigns.length > 0 ? (
              recentCampaigns.map((campaign) => (
                <Link
                  key={campaign._id}
                  href={`${routes.BRAND.CAMPAIGNS}/${campaign._id}`}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div>
                    <h4 className="text-foreground font-semibold">{campaign.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <Badge className={`${STATUS_STYLES[campaign.status]} text-xs`}>
                        {formatStatusLabel(campaign.status)}
                      </Badge>
                      <span className="text-muted-foreground text-sm capitalize">{campaign.tier}</span>
                    </div>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </span>
                </Link>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No campaigns found</p>
                <Link href={routes.BRAND.CAMPAIGNS_CREATE}>
                  <Button className="mt-3 bg-primary hover:bg-primary/90 text-primary-foreground">
                    Create Your First Campaign
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
