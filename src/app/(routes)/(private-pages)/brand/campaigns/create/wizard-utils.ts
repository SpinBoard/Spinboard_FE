// Pure helpers for the ad-campaign creation wizard (docs/openapi.yaml
// POST /ad-campaigns), kept free of React/DOM dependencies (besides
// getImageDimensions, which needs a browser Image element) so validation
// logic is easy to unit test.

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

// Ad campaigns moved from video to a static banner image (2026-09-03) —
// video upload/hosting was consuming too much production cost. No
// duration concept applies anymore; validation is mime type, file size,
// and a target aspect ratio with tolerance instead.
export interface BannerValidationConfig {
  maxSizeBytes: number;
  targetWidthPx: number;
  targetHeightPx: number;
  aspectRatioTolerance: number;
}

const ACCEPTED_BANNER_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateBannerFile(
  file: File,
  dimensions: { width: number; height: number },
  config: BannerValidationConfig
): ValidationResult {
  if (!ACCEPTED_BANNER_MIME_TYPES.includes(file.type)) {
    return { valid: false, message: "Please upload a JPEG, PNG, or WEBP image." };
  }
  if (file.size > config.maxSizeBytes) {
    return {
      valid: false,
      message: `Banner must be under ${Math.round(config.maxSizeBytes / (1024 * 1024))}MB.`,
    };
  }
  const targetRatio = config.targetWidthPx / config.targetHeightPx;
  const actualRatio = dimensions.width / dimensions.height;
  if (Math.abs(actualRatio - targetRatio) / targetRatio > config.aspectRatioTolerance) {
    return {
      valid: false,
      message: `Banner should be close to ${config.targetWidthPx}×${config.targetHeightPx} (16:9).`,
    };
  }
  return { valid: true };
}

// Reads image dimensions client-side via a detached <img> element.
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Could not read image dimensions. Try a different file."));
    };
    img.src = URL.createObjectURL(file);
  });
}

// Video validation — NOT used by the ad-campaign wizard above anymore
// (banners replaced video there 2026-09-03), but still imported by
// brand/promote/page.tsx for Promote & Earn's own campaign media upload,
// a completely separate system that still accepts video for its share-card
// media. Kept here rather than deleted since that's the only reason either
// of these two exports still exist.
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
  banner: File;
  tier: AdCampaignTierId;
}

// Builds the multipart body matching openapi.yaml's POST /ad-campaigns
// exactly: title, description, tier, banner, and two optional URLs. No
// quiz questions, no geo-target flag — neither field exists anymore.
export function buildAdCampaignFormData(data: AdCampaignWizardData): FormData {
  const formData = new FormData();
  formData.append("title", data.title);
  formData.append("description", data.description);
  if (data.brandUrl?.trim()) formData.append("brandUrl", data.brandUrl.trim());
  if (data.campaignUrl?.trim())
    formData.append("campaignUrl", data.campaignUrl.trim());
  formData.append("banner", data.banner);
  formData.append("tier", data.tier);
  return formData;
}
