import { ProjectStatus, QuotationStatus } from "@/types";

export const PROJECT_STATUS_TONE: Record<ProjectStatus, "live" | "default" | "bad"> = {
  open: "live",
  closed: "default",
  cancelled: "bad",
};

export const QUOTATION_STATUS_TONE: Record<QuotationStatus, "live" | "default"> = {
  submitted: "live",
  withdrawn: "default",
};

export function formatProjectStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatBudgetRange(min?: number, max?: number, currency: string = "NGN"): string | null {
  const symbol = currency === "NGN" ? "₦" : `${currency} `;
  if (min !== undefined && max !== undefined) return `${symbol}${min.toLocaleString()} – ${symbol}${max.toLocaleString()}`;
  if (min !== undefined) return `From ${symbol}${min.toLocaleString()}`;
  if (max !== undefined) return `Up to ${symbol}${max.toLocaleString()}`;
  return null;
}
