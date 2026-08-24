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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Search,
  Target,
  Clock,
  Ban,
  RotateCcw,
  Loader2,
  AlertTriangle,
  X,
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
} from "@/types";
import { apiErrorMessage } from "@/app/_utils/helper";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import {
  STATUS_STYLES,
  MODERATION_STYLES,
  daysLeft,
  formatStatusLabel,
  statusStyle,
} from "../../brand/campaigns/campaign-status";

const CAMPAIGNS_QUERY_KEY = ["ad-campaigns-admin"];

export default function AdminCampaignsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdCampaign["status"]>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deactivateOpen, setDeactivateOpen] = useState(false);
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

  const selectedCount = selectedIds.size;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    filteredCampaigns.length > 0 && filteredCampaigns.every((c) => selectedIds.has(c._id));

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredCampaigns.forEach((c) => next.delete(c._id));
      } else {
        filteredCampaigns.forEach((c) => next.add(c._id));
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const deactivateMutation = useMutation({
    mutationFn: () =>
      api
        .post<AdCampaignDeactivateResponse>(ENDPOINTS.AD_CAMPAIGNS_DEACTIVATE, {
          campaignIds: Array.from(selectedIds),
          reason: reason.trim() || undefined,
        })
        .then((res) => res.data),
    onSuccess: (data) => {
      toast.success(`Deactivated ${data.deactivated} of ${data.matched} selected campaign(s).`);
      queryClient.invalidateQueries({ queryKey: CAMPAIGNS_QUERY_KEY });
      clearSelection();
      setDeactivateOpen(false);
      setReason("");
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error, "Failed to deactivate campaigns. Please try again."));
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: () =>
      api
        .post<AdCampaignReactivateResponse>(ENDPOINTS.AD_CAMPAIGNS_REACTIVATE, {
          campaignIds: Array.from(selectedIds),
        })
        .then((res) => res.data),
    onSuccess: (data) => {
      toast.success(`Reactivated ${data.reactivated} of ${data.matched} selected campaign(s).`);
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

  if (loadingCampaigns) return <PageLoader message="Loading campaigns..." />;

  if (campaignsError) {
    return (
      <PageError
        title="Failed to Load Campaigns"
        message="Unable to load campaigns. Please check your connection and try again."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground font-sora">Campaign Moderation</h1>
        <p className="text-muted-foreground">
          Campaigns go live automatically once payment succeeds. Deactivate a campaign here if its
          video turns out to be inappropriate, or reactivate one taken down by mistake.
        </p>
      </div>

      {skippedExpired && skippedExpired.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span>{skippedExpired.length} campaign(s) couldn&apos;t be reactivated</span>
            <button
              onClick={() => setSkippedExpired(null)}
              className="text-destructive/70 hover:text-destructive">
              <X className="h-4 w-4" />
            </button>
          </AlertTitle>
          <AlertDescription>
            <p className="mb-2">
              Their activation window already expired, so switching them back on isn&apos;t enough
              — the brand needs to re-pay to go live again:
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              {skippedExpired.map((c) => (
                <li key={c._id}>{c.title}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

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
          {(["all", "DRAFT", "PENDING_PAYMENT", "ACTIVE", "PAUSED", "EXPIRED", "REJECTED"] as const).map(
            (key) => {
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
            }
          )}
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4">
          <span className="text-sm font-medium text-foreground">{selectedCount} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
            className="border-border text-foreground hover:bg-white/10">
            {reactivateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
            )}
            Reactivate
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeactivateOpen(true)}
            disabled={deactivateMutation.isPending}>
            <Ban className="h-3.5 w-3.5 mr-1.5" />
            Deactivate
          </Button>
          <Button size="sm" variant="ghost" onClick={clearSelection} className="text-muted-foreground">
            Clear selection
          </Button>
        </div>
      )}

      <Card className="bg-card/50 backdrop-blur-sm border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Checkbox checked={allVisibleSelected} onCheckedChange={toggleSelectAllVisible} />
            <CardTitle className="text-foreground font-sora text-base">
              {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? "s" : ""}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredCampaigns.map((campaign) => {
            const remaining = daysLeft(campaign.expiresAt);
            return (
              <div
                key={campaign._id}
                className="flex items-start gap-3 p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <Checkbox
                  checked={selectedIds.has(campaign._id)}
                  onCheckedChange={() => toggleSelected(campaign._id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge className={statusStyle(STATUS_STYLES, campaign.status)}>
                      {formatStatusLabel(campaign.status)}
                    </Badge>
                    <Badge className={statusStyle(MODERATION_STYLES, campaign.moderationStatus)}>
                      {formatStatusLabel(campaign.moderationStatus)}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">{campaign.tier}</Badge>
                    {campaign.status === "ACTIVE" && remaining !== null && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {remaining} day{remaining !== 1 ? "s" : ""} left
                      </span>
                    )}
                  </div>
                  <h4 className="text-foreground font-semibold truncate">{campaign.title}</h4>
                  <p className="text-sm text-muted-foreground line-clamp-1">{campaign.description}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                    <span>Brand: {campaign.brandId}</span>
                    <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
                    {campaign.moderationReason && (
                      <span className="text-destructive">Reason: {campaign.moderationReason}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {filteredCampaigns.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No campaigns found</h3>
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "No campaigns have been created yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sora text-xl flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              Deactivate {selectedCount} campaign{selectedCount !== 1 ? "s" : ""}
            </DialogTitle>
            <DialogDescription>
              This pulls the video off the billboard immediately, even if it&apos;s currently live
              and already paid for. The brand can be re-activated later if this was a mistake.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <label className="text-sm text-muted-foreground">Reason (optional)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Video contains inappropriate content"
              rows={3}
            />
          </div>
          <DialogFooter className="pt-4 gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeactivateOpen(false)}
              disabled={deactivateMutation.isPending}
              className="text-muted-foreground hover:text-foreground hover:bg-white/5">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deactivateMutation.mutate()}
              disabled={deactivateMutation.isPending}>
              {deactivateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
