"use client";

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Eye,
  Target,
  Clock,
  Rocket,
  BarChart3,
} from "lucide-react";
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
import { STATUS_STYLES, MODERATION_STYLES, daysLeft, formatStatusLabel } from "./campaign-status";

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

  if (loadingCampaigns) return <PageLoader message="Loading campaigns..." />;

  if (campaignsError) {
    return (
      <PageError
        title="Failed to Load Campaigns"
        message="Unable to load your campaigns. Please check your connection and try again."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-sora">Ad Campaigns</h1>
          <p className="text-muted-foreground">Create and manage your video ad campaigns</p>
        </div>
        <Link href={routes.BRAND.CAMPAIGNS_CREATE}>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {(["all", "DRAFT", "PENDING_PAYMENT", "ACTIVE", "PAUSED", "EXPIRED", "REJECTED"] as const).map((key) => {
            const count =
              key === "all" ? campaigns?.length ?? 0 : campaigns?.filter((c) => c.status === key).length ?? 0;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  statusFilter === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/5 text-muted-foreground hover:bg-white/10 border border-border"
                }`}>
                {key === "all" ? "All" : formatStatusLabel(key)}
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCampaigns.map((campaign) => {
          const remaining = daysLeft(campaign.expiresAt);
          return (
            <Card key={campaign._id} className="bg-card/50 backdrop-blur-sm border-border flex flex-col">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={STATUS_STYLES[campaign.status]}>{formatStatusLabel(campaign.status)}</Badge>
                  <Badge className={MODERATION_STYLES[campaign.moderationStatus]}>
                    {formatStatusLabel(campaign.moderationStatus)}
                  </Badge>
                  <Badge variant="secondary" className="capitalize">{campaign.tier}</Badge>
                </div>
                <CardTitle className="text-foreground font-sora text-lg mt-2">{campaign.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">{campaign.description}</p>

                <div className="space-y-2 text-xs text-muted-foreground">
                  {campaign.status === "ACTIVE" && remaining !== null && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-secondary" />
                      {remaining} day{remaining !== 1 ? "s" : ""} left
                    </div>
                  )}
                  {campaign.moderationStatus === "REJECTED" && campaign.moderationReason && (
                    <p className="text-destructive">{campaign.moderationReason}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-border">
                  <Link href={`${routes.BRAND.CAMPAIGNS}/${campaign._id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full border-border text-foreground hover:bg-white/10">
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      View
                    </Button>
                  </Link>
                  {campaign.tier === "premium" && (
                    <Link href={routes.BRAND.CAMPAIGN_ANALYTICS(campaign._id)} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full border-border text-foreground hover:bg-white/10">
                        <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                        Analytics
                      </Button>
                    </Link>
                  )}
                  {campaign.status === "DRAFT" && (
                    <Button
                      size="sm"
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => setGoLiveCampaign(campaign)}>
                      <Rocket className="h-3.5 w-3.5 mr-1.5" />
                      Go Live
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No campaigns found</h3>
          <p className="text-muted-foreground mb-6">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your search or filters"
              : "Create your first ad campaign to start reaching viewers"}
          </p>
          <Link href={routes.BRAND.CAMPAIGNS_CREATE}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-4 w-4 mr-2" />
              Create First Campaign
            </Button>
          </Link>
        </div>
      )}

      <GoLiveDialog
        campaign={goLiveCampaign}
        open={!!goLiveCampaign}
        onOpenChange={(open) => !open && setGoLiveCampaign(null)}
      />
    </div>
  );
}
