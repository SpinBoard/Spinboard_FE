// Pure helpers for the ad-campaign creation wizard (docs/openapi.yaml
// POST /ad-campaigns), kept free of React/DOM dependencies (besides
// getVideoDuration, which needs the browser video element) so validation
// logic is easy to unit test.

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

export interface VideoValidationConfig {
  maxDurationSeconds: number;
  maxSizeBytes: number;
}

export function validateVideoFile(
  file: File,
  durationSeconds: number,
  config: VideoValidationConfig
): ValidationResult {
  if (!file.type.startsWith("video/")) {
    return { valid: false, message: "Please upload a video file." };
  }
  if (file.size > config.maxSizeBytes) {
    return {
      valid: false,
      message: `Video must be under ${Math.round(
        config.maxSizeBytes / (1024 * 1024)
      )}MB.`,
    };
  }
  if (durationSeconds > config.maxDurationSeconds) {
    return {
      valid: false,
      message: `Video must be under ${Math.round(
        config.maxDurationSeconds
      )} seconds long.`,
    };
  }
  return { valid: true };
}

// Reads video duration client-side via a detached <video> element.
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      reject(new Error("Could not read video metadata. Try a different file."));
    };
    video.src = URL.createObjectURL(file);
  });
}

export type AdCampaignTierId = "basic" | "premium";

export interface TierMeta {
  id: AdCampaignTierId;
  name: string;
  priceUSD: number; // flat, one-time — 30-day activation
  analytics: boolean;
  blurb: string;
}

// Prices here are display fallbacks — the wizard prefers live values from
// GET /admin/config (campaign.tiers) via useAdminConfig, never hardcoding
// what CONFIG.md calls out as admin-adjustable. Flat pricing, no per-week
// duration to choose — activation is a fixed 30 days from payment.
export const TIER_META: TierMeta[] = [
  {
    id: "basic",
    name: "Basic",
    priceUSD: 20,
    analytics: false,
    blurb: "Standard rotation in the billboard, 30-day activation.",
  },
  {
    id: "premium",
    name: "Premium",
    priceUSD: 30,
    analytics: true,
    blurb: "Higher rotation weight, plus the full analytics dashboard.",
  },
];

export interface AdCampaignWizardData {
  title: string;
  description: string;
  brandUrl?: string;
  campaignUrl?: string;
  video: File;
  tier: AdCampaignTierId;
}

// Builds the multipart body matching openapi.yaml's POST /ad-campaigns
// exactly: title, description, tier, video, and two optional URLs. No
// quiz questions, no geo-target flag — neither field exists anymore.
export function buildAdCampaignFormData(data: AdCampaignWizardData): FormData {
  const formData = new FormData();
  formData.append("title", data.title);
  formData.append("description", data.description);
  if (data.brandUrl?.trim()) formData.append("brandUrl", data.brandUrl.trim());
  if (data.campaignUrl?.trim())
    formData.append("campaignUrl", data.campaignUrl.trim());
  formData.append("video", data.video);
  formData.append("tier", data.tier);
  return formData;
}
