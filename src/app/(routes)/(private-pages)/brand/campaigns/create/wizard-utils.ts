// Pure helpers for the ad-campaign creation wizard (API_CONTRACT_ADS_REWARD_PLATFORM.md
// §4), kept free of React/DOM dependencies (besides getVideoDuration, which
// needs the browser video element) so validation logic is easy to unit test.

export const QUIZ_QUESTION_COUNT = 3;
export const QUIZ_CHOICES_PER_QUESTION = 4;

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

export interface QuizQuestionInput {
  question: string;
  choices: string[];
  correctIndex: number;
}

export function validateQuizQuestions(
  questions: QuizQuestionInput[]
): ValidationResult {
  if (questions.length !== QUIZ_QUESTION_COUNT) {
    return {
      valid: false,
      message: `Exactly ${QUIZ_QUESTION_COUNT} quiz questions are required.`,
    };
  }
  for (const q of questions) {
    if (q.question.trim().length < 5) {
      return {
        valid: false,
        message: "Each question must be at least 5 characters.",
      };
    }
    if (
      q.choices.length !== QUIZ_CHOICES_PER_QUESTION ||
      q.choices.some((c) => !c.trim())
    ) {
      return {
        valid: false,
        message: `Each question needs ${QUIZ_CHOICES_PER_QUESTION} non-empty choices.`,
      };
    }
    if (q.correctIndex < 0 || q.correctIndex > QUIZ_CHOICES_PER_QUESTION - 1) {
      return {
        valid: false,
        message: "Select a valid correct answer for each question.",
      };
    }
  }
  return { valid: true };
}

export type AdCampaignTierId = "basic" | "premium" | "pro";

export interface TierMeta {
  id: AdCampaignTierId;
  name: string;
  priceUSD: number;
  displayWeight: string;
  analytics: boolean;
  globalToggle: boolean;
  blurb: string;
}

// Prices/weights here are display fallbacks — the wizard prefers live
// values from GET /admin/config (campaign.tierPrices / campaign.tierWeights)
// via useAdminConfig, never hardcoding what the contract calls out as
// admin-adjustable (§10).
export const TIER_META: TierMeta[] = [
  {
    id: "basic",
    name: "Basic",
    priceUSD: 20,
    displayWeight: "1x",
    analytics: false,
    globalToggle: false,
    blurb: "Standard rotation in your home country.",
  },
  {
    id: "premium",
    name: "Premium",
    priceUSD: 30,
    displayWeight: "2x",
    analytics: true,
    globalToggle: false,
    blurb: "2x display weight + full analytics.",
  },
  {
    id: "pro",
    name: "Pro",
    priceUSD: 50,
    displayWeight: "3x",
    analytics: true,
    globalToggle: true,
    blurb: "3x display weight, analytics, and optional global visibility.",
  },
];

export interface AdCampaignWizardData {
  title: string;
  description: string;
  brandUrl?: string;
  campaignUrl?: string;
  video: File;
  questions: QuizQuestionInput[];
  tier: AdCampaignTierId;
  global?: boolean;
}

// Builds the multipart body matching API_CONTRACT_ADS_REWARD_PLATFORM.md §4
// (POST /ad-campaigns). `global` is only meaningful (and only sent) for Pro.
export function buildAdCampaignFormData(data: AdCampaignWizardData): FormData {
  const formData = new FormData();
  formData.append("title", data.title);
  formData.append("description", data.description);
  if (data.brandUrl?.trim()) formData.append("brandUrl", data.brandUrl.trim());
  if (data.campaignUrl?.trim())
    formData.append("campaignUrl", data.campaignUrl.trim());
  formData.append("video", data.video);
  formData.append("questions", JSON.stringify(data.questions));
  formData.append("tier", data.tier);
  if (data.tier === "pro" && data.global) {
    formData.append("global", String(data.global));
  }
  return formData;
}
