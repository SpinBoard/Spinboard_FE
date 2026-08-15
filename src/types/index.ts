export interface UserData {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  fullName: string;
  email: string;
  leaderboardPosition?: number | null;
  avatar?: string;
  userType: "gamer" | "brand";
  isVerified: boolean;
  companyName?: string;
  profileComplete?: boolean;
  createdAt: string;
  accessToken: string;
  refreshToken: string;
}

export interface GamerProfileData {
  _id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  username: string;
  email: string;
  role: "gamer";
  isVerified: boolean;
  leaderboardPosition: number | null;
  // Optional to browse/watch the billboard, required to claim a freebie code
  age?: number;
  sex?: GamerSex;
  country?: string;
  state?: string;
  city?: string;
  profileComplete?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandProfileData {
  _id: string;
  name: string;
  email: string;
  role: "brand";
  companyName: string;
  avatar?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  brandDetails: {
    companyEmail: string;
    companyName: string;
    verified: boolean;
    totalCampaigns: number;
    // Required before POST /ad-campaigns will succeed
    businessCategories?: string[];
    country?: string;
    state?: string;
    city?: string;
    profileComplete?: boolean;
  };
}

// Generic Response Types
export interface ApiResponse {
  success: boolean;
  message: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: UserData;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user: UserData;
}

export interface ReferralSummaryRow {
  rank: number;
  user: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
  };
  successfulCount: number;
  referredUserIds: string[];
}

export interface ReferralSummaryResponse {
  success: true;
  month: string;
  summary: ReferralSummaryRow[];
}

export interface ReferralEvent {
  _id: string;
  type: "signup" | "first_puzzle" | string;
  referredUser?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
  };
  createdAt: string;
}

export interface ReferralEventsResponse {
  success: true;
  events: ReferralEvent[];
}

export interface ReferralLinkResponse {
  success?: boolean;
  referralLink: string;
}

export interface ReferralMyStatsResponse {
  success: true;
  month: string;
  stats: {
    totalReferrals: number;
    pendingReferrals: number;
    successfulReferralsThisMonth: number;
    referralPointsThisMonth: number;
    totalReferralPointsAllTime: number;
    referredUsersThisMonth: {
      userId: string;
      fullName: string;
      username: string;
      avatar?: string;
      successfulAt: string;
      pointsAwarded: number;
    }[];
  };
}

// Wallet & payouts
export interface WalletBalanceResponse {
  success?: boolean;
  balance: number;
  currency: string;
  payoutThreshold: number;
  amountToThreshold: number;
  nextPayoutDate: string;
}

export interface WalletTransaction {
  _id: string;
  userId: string;
  type: "credit" | "debit";
  amount: number;
  balanceAfter: number;
  reason:
    | "weekly_payout"
    | "withdrawal"
    | "withdrawal_reversal"
    | "admin_adjustment"
    | "spin_win"
    | "migration_payout"
    | "FREEBIE_CASH"
    | "PAYOUT_SETTLED"
    | "ADJUSTMENT"
    | "REVERSAL"
    | "REFERRAL_REWARD";
  referenceId?: string;
  status: "completed" | "reversed";
  createdAt: string;
}

export interface WalletTransactionsResponse {
  success: boolean;
  transactions: WalletTransaction[];
}

export interface BankAccount {
  _id: string;
  accountNumber: string;
  bankCode: string;
  bankName: string;
  accountName: string;
  verified?: boolean;
  isDefault?: boolean;
  createdAt: string;
}

export interface BankAccountsResponse {
  success: boolean;
  bankAccounts: BankAccount[];
}

export interface CreateBankAccountRequest {
  accountNumber: string;
  bankCode: string;
  bankName: string;
}

// Admin config — the subset the frontend reads rather than hardcoding.
// GET /admin/config is admin-only; most of these are read via
// feature-specific fallbacks until a public config subset endpoint exists.
export interface AdminConfigResponse {
  success: boolean;
  config: Record<string, { value: unknown; description?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────
// Billboard (continuous ad playback — no gate, no quiz, no cycle)
// ─────────────────────────────────────────────────────────────────────────

export interface BillboardSessionResponse {
  success: boolean;
  sessionId: string;
}

export interface BillboardQueueSlot {
  slotId: string; // opaque, single-use — pass back verbatim to heartbeat/complete
  type: "AD" | "HOUSE";
  campaignId?: string; // AD only
  brandName?: string; // AD only
  title: string;
  videoUrl: string;
  durationSec: number;
}

export interface BillboardQueueResponse {
  success: boolean;
  slots: BillboardQueueSlot[];
}

export interface BillboardCompleteResponse {
  success?: boolean;
  ok?: boolean;
  completed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Freebie codes, claims, phrases
// ─────────────────────────────────────────────────────────────────────────

export type FreebieType = "AIRTIME" | "CASH";
export type FreebiePositionHint = "TOP" | "BOTTOM" | "LEFT" | "RIGHT";

export interface StripFeedItem {
  kind: "FREEBIE" | "PROMO";
  display: "PINNED" | "SCROLLING";

  // FREEBIE only
  positionHint?: FreebiePositionHint;
  codeId?: string;
  publicCode?: string;
  valueLabel?: string;
  type?: FreebieType;
  state?: "AVAILABLE" | "TAKEN";
  liveUntil?: string;

  // PROMO only
  text?: string;
}

export interface StripFeedResponse {
  serverTime?: string;
  items: StripFeedItem[];
}

export interface Claim {
  claimId: string;
  type: FreebieType;
  valueLabel?: string;
  value?: number;
  currency?: string;
  status?: "ISSUED" | "REDEEMED" | "VOID";
  issuedAt?: string;
  redeemedAt?: string;
  secretCode?: string; // decrypted, visible to the owner forever — never expires
}

export interface MyClaimsResponse {
  success: boolean;
  claims: Claim[];
}

export interface ClaimedResult {
  success: boolean;
  action: "CLAIMED";
  claimId: string;
  type: FreebieType;
  valueLabel: string;
  secretCode: string;
}

export interface RedeemedCashResult {
  success: boolean;
  action: "REDEEMED";
  claimId: string;
  type: "CASH";
  walletBalance: number; // balance AFTER this credit
  redeemedAt: string;
}

export interface RedeemedAirtimeResult {
  success: boolean;
  action: "REDEEMED";
  claimId: string;
  type: "AIRTIME";
  display: string;
  rechargeString: string;
  redeemedAt: string;
}

export type ApplyCodeResponse =
  | ClaimedResult
  | RedeemedCashResult
  | RedeemedAirtimeResult;

export interface Phrase {
  _id: string;
  slot: "PROMO" | "FREEBIE_LIVE" | "FREEBIE_GONE" | "WELCOME" | "EMPTY_STATE";
  text: string;
  weight: number;
  active: boolean;
}

export interface PhrasesResponse {
  success: boolean;
  phrases: Phrase[];
}

// §4/§8 — the standard error shape, plus the one auth-header quirk
export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}

// §4 — ad campaigns (brand-facing)
export type AdCampaignTier = "basic" | "premium";
export type AdCampaignStatus =
  | "DRAFT"
  | "PENDING_PAYMENT"
  | "ACTIVE"
  | "PAUSED"
  | "EXPIRED"
  | "REJECTED";
export type AdCampaignModerationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface AdCampaign {
  _id: string;
  brandId: string;
  tier: AdCampaignTier;
  title: string;
  description: string;
  brandUrl?: string;
  campaignUrl?: string;
  videoUrl: string;
  videoDurationSeconds: number;
  videoSizeBytes?: number;
  videoMimeType?: string;
  priceUSD?: number;
  exchangeRateSnapshot?: number;
  priceLocal?: number;
  currency?: string;
  status: AdCampaignStatus;
  paymentStatus: "unpaid" | "paid";
  moderationStatus: AdCampaignModerationStatus;
  moderationReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  // Legacy-only — unset on anything created after the flat-pricing revamp
  numberOfWeeks?: number;
  activatedAt?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface AdCampaignsResponse {
  success: boolean;
  campaigns: AdCampaign[];
}

export interface AdCampaignResponse {
  success: boolean;
  campaign: AdCampaign;
}

export interface AdCampaignAnalyticsSummary {
  views: number;
  completions: number;
  timeSeries?: { date: string; views: number; completions: number }[];
}

export interface AdCampaignAnalyticsResponse {
  success: true;
  analytics: AdCampaignAnalyticsSummary;
}

export type AnalyticsBreakdownDimension =
  | "country"
  | "state"
  | "sex"
  | "ageBand"
  | "device"
  | "hour";

export interface AdCampaignAnalyticsBreakdownResponse {
  success: true;
  dimension: AnalyticsBreakdownDimension;
  breakdown: Record<string, number>;
}

// Flat $20 Basic / $30 Premium, 30-day activation — no per-week duration.
export interface AdPaymentInitializeRequest {
  campaignId: string;
  email: string;
}

export interface AdPaymentInitializeResponse {
  success: true;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
    amount: number;
    currency: string;
  };
}

// Error shape when go-live is blocked by an incomplete brand profile.
export interface ProfileIncompleteError {
  success: false;
  message: string;
  code: "PROFILE_INCOMPLETE";
}

// ─────────────────────────────────────────────────────────────────────────
// Marketplace — business directory (not a store; no checkout/order/discount)
// ─────────────────────────────────────────────────────────────────────────

export interface BusinessSocialLinks {
  website?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
  linkedin?: string;
  youtube?: string;
}

export interface BusinessProfile {
  brandId: string; // the brand's User _id — never a separate "business id"
  businessName: string;
  businessDescription?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  category: string[];
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  address?: string;
  country?: string;
  state?: string;
  city?: string;
  socialLinks: BusinessSocialLinks;
  isListed: boolean;
  // Only present on the brand's own "mine" read
  isListable?: boolean;
}

export interface BusinessProfileResponse {
  success: boolean;
  profile: BusinessProfile;
}

export interface BusinessDirectoryResponse {
  success: boolean;
  businesses: BusinessProfile[];
}

export interface MarketplaceProduct {
  _id: string;
  brandId: string;
  name: string;
  description: string;
  category: string;
  images: string[]; // empty array is valid
  priceLabel?: string; // free-form display text, never a charged amount
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MarketplaceProductsResponse {
  success: boolean;
  products: MarketplaceProduct[];
}

export interface MarketplaceProductResponse {
  success: boolean;
  product: MarketplaceProduct;
  business?: BusinessProfile;
}

export interface BusinessDetailResponse {
  success: boolean;
  business: BusinessProfile;
  products: MarketplaceProduct[];
}

// ─────────────────────────────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────────────────────────────

export interface SettingsNotificationPrefs {
  emailNotifications: boolean;
  referralBonusAlerts: boolean;
  leaderboardUpdates: boolean;
  newCampaignAlerts: boolean;
  weeklyDigest: boolean;
}

export interface BrandSettings {
  role: "brand";
  email: string;
  hasPassword: boolean;
  isVerified: boolean;
  notifications: SettingsNotificationPrefs;
  account: { companyName?: string; avatar?: string };
  profileComplete: boolean;
}

export interface GamerSettings {
  role: "gamer";
  email: string;
  hasPassword: boolean;
  isVerified: boolean;
  notifications: SettingsNotificationPrefs;
  account: { firstName?: string; lastName?: string; username?: string; avatar?: string };
  privacy: { showOnLeaderboard: boolean };
  profileComplete: boolean;
}

export type Settings = BrandSettings | GamerSettings;

export interface SettingsResponse {
  success: true;
  settings: Settings;
}

// §2 — profile completion additions
export type GamerSex = "man" | "woman" | "prefer_not_to_say";

export interface GamerProfileCompletionFields {
  age?: number;
  sex?: GamerSex;
  country?: string;
  state?: string;
  city?: string;
}

export interface BrandProfileCompletionFields {
  businessCategories?: string[];
  country?: string;
  state?: string;
  city?: string;
}
