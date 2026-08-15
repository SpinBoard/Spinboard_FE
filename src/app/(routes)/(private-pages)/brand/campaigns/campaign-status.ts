import { AdCampaignModerationStatus, AdCampaignStatus } from "@/types";

// `status` went from draft|active|inactive to a 6-value lifecycle — paying
// no longer puts a campaign live by itself, it moves to PENDING_PAYMENT then
// waits on moderation too.
export const STATUS_STYLES: Record<AdCampaignStatus, string> = {
  DRAFT: "bg-white/10 text-muted-foreground border-white/20",
  PENDING_PAYMENT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  ACTIVE: "bg-success/20 text-success border-success/30",
  PAUSED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  EXPIRED: "bg-white/10 text-muted-foreground border-white/20",
  REJECTED: "bg-destructive/20 text-destructive border-destructive/30",
};

export const MODERATION_STYLES: Record<AdCampaignModerationStatus, string> = {
  PENDING: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  APPROVED: "bg-success/20 text-success border-success/30",
  REJECTED: "bg-destructive/20 text-destructive border-destructive/30",
};

export function formatStatusLabel(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

export function daysLeft(expiresAt?: string): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
