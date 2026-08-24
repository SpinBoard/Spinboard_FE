import { AdCampaignModerationStatus, AdCampaignStatus } from "@/types";

const FALLBACK_STYLE = "bg-white/10 text-muted-foreground border-white/20";

// `status` is a 6-value lifecycle. Paying moves a campaign through
// PENDING_PAYMENT straight to ACTIVE (moderationStatus: APPROVED) the
// instant payment succeeds — there's no review wait. Moderation now only
// happens after the fact: admin can deactivate a live campaign (moving it
// off ACTIVE, moderationStatus: REJECTED) if its video turns out to be
// inappropriate, and reactivate it later if that was a mistake.
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

// Looks up a style for a status value that isn't guaranteed to be present
// or to match the known enum — e.g. a legacy campaign fetched from the live
// API without a moderationStatus set. Falls back to a neutral style instead
// of crashing the whole list.
export function statusStyle(
  map: Record<string, string>,
  status: string | undefined | null
): string {
  return (status && map[status]) || FALLBACK_STYLE;
}

export function formatStatusLabel(status: string | undefined | null): string {
  if (!status) return "Unknown";
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
