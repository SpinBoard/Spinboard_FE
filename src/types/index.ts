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
  // §2 — optional to browse/watch ads, required to spin (§6)
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
    // §2 — required before POST /ad-campaigns will succeed
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

// Wallet & withdrawals
export interface WalletBalanceResponse {
  balance: number;
  currency: string;
}

export interface WalletTransaction {
  _id: string;
  type: string;
  amount: number;
  status?: string;
  description?: string;
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

export type WithdrawalStatus = "pending" | "processing" | "paid" | "failed";

export interface Withdrawal {
  _id: string;
  bankAccountId: string;
  amount: number;
  status: WithdrawalStatus;
  idempotencyKey: string;
  createdAt: string;
  updatedAt?: string;
  failureReason?: string;
}

export interface WithdrawalsResponse {
  success: boolean;
  withdrawals: Withdrawal[];
}

export interface CreateWithdrawalRequest {
  bankAccountId: string;
  amount: number;
  idempotencyKey: string;
}

// Admin config — the subset the frontend reads rather than hardcoding
// (see API_CONTRACT_ADS_REWARD_PLATFORM.md §10). GET /admin/config is
// admin-only; most of these are read via feature-specific fallbacks
// until a public config subset endpoint exists.
export interface AdminConfigResponse {
  success: boolean;
  config: Record<string, { value: unknown; description?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────
// Ads-watching & reward platform types (API_CONTRACT_ADS_REWARD_PLATFORM.md)
// ─────────────────────────────────────────────────────────────────────────

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

// §3 — ad-watching flow (optional auth: works for anon + authenticated)
export interface AdQuestion {
  question: string;
  choices: string[];
}

export interface AdNextItem {
  campaignId: string;
  title: string;
  description: string;
  brandUrl: string;
  videoUrl: string;
  videoDurationSeconds: number;
  questions: AdQuestion[]; // never includes correctIndex
}

export interface AdNextResponse {
  success: true;
  adsWatchedSoFar: number;
  ad: AdNextItem;
}

export interface AdQuizSubmitRequest {
  answers: number[]; // exactly 3, submitted all at once
}

export interface AdQuizSubmitResponse {
  success: true;
  allCorrect: boolean;
  attemptsSoFar: number;
  cycleCompleted: boolean;
  spinCreditGranted: boolean; // only true for authenticated users
}

// §4 — ad campaigns (brand-facing)
// Per AD_CAMPAIGN_PRICING_AND_GOLIVE_UPDATE.md §1 — `pro` tier removed entirely.
export type AdCampaignTier = "basic" | "premium";
export type AdCampaignStatus = "draft" | "active" | "inactive";

export interface AdCampaignQuestionInput {
  question: string;
  choices: string[];
  correctIndex: number;
}

export interface AdCampaign {
  _id: string;
  brandId: string;
  title: string;
  description: string;
  brandUrl?: string;
  campaignUrl?: string;
  videoUrl: string;
  videoDurationSeconds: number;
  questions: AdCampaignQuestionInput[]; // exactly 3
  tier: AdCampaignTier;
  global?: boolean; // premium only (was pro only, pre-migration)
  status: AdCampaignStatus;
  // Unset on a fresh draft — only snapshotted once go-live payment succeeds
  // (AD_CAMPAIGN_PRICING_AND_GOLIVE_UPDATE.md §2-3).
  tierPriceUSD?: number;
  usdToNgnRateSnapshot?: number;
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

export interface AdCampaignAnalytics {
  views: number;
  completions: number;
  questionCorrectnessRates: number[]; // first-attempt only, length 3
  demographics: {
    country: Record<string, number>;
    sex: Record<string, number>;
    ageBuckets: Record<string, number>;
  };
}

export interface AdCampaignAnalyticsResponse {
  success: true;
  analytics: AdCampaignAnalytics;
}

// Go-live payment — AD_CAMPAIGN_PRICING_AND_GOLIVE_UPDATE.md §3. Tier is fixed
// at creation time; only the number of weeks (and resulting cost) is chosen here.
export interface AdPaymentInitializeRequest {
  campaignId: string;
  email: string;
  numberOfWeeks: number;
}

export interface AdPaymentInitializeResponse {
  success: true;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
    numberOfWeeks: number;
    amount: number;
    currency: string;
  };
}

// Error shape when go-live is blocked by an incomplete brand profile (§3, §6).
export interface ProfileIncompleteError {
  success: false;
  message: string;
  code: "PROFILE_INCOMPLETE";
}

// §5 — spin & prize system
// discount20 only ever comes from the 50-try-again-benchmark special board
// (POST /spins/try-again/spend) — a normal POST /spins roll never produces
// it (its win-type distribution only has discount30/discount50 buckets).
export type SpinOutcomeType =
  | "cash"
  | "brand_product"
  | "discount30"
  | "discount50"
  | "discount20"
  | "try_again";

export type SpinDecision = "pending" | "redeem" | "decline";

export interface SpinResult {
  _id: string;
  outcomeType: SpinOutcomeType;
  prizePoolItemId?: string;
  decision: SpinDecision;
}

export interface TryAgainStatus {
  tryAgainCount: number;
  distanceToNextBenchmarks: { "50": number; "100": number };
}

export interface SpinResponse {
  success: true;
  spin: SpinResult;
  tryAgainStatus: TryAgainStatus;
}

export interface SpinWinDecisionRequest {
  decision: "redeem" | "decline";
}

export type TryAgainBenchmark = 50 | 100;

export interface TryAgainSpendRequest {
  benchmark: TryAgainBenchmark;
}

export interface TryAgainStatusResponse {
  success: true;
  tryAgainCount: number;
  distanceToNextBenchmarks: { "50": number; "100": number };
}

export interface SpinVerifyResponse {
  success: true;
  spinResultId: string;
  outcomeType: SpinOutcomeType;
  verification: { valid: boolean; seed?: string };
}

// §7 — marketplace
export interface MarketplaceProduct {
  _id: string;
  brandId: string;
  name: string;
  description: string;
  priceUSD: number;
  category: string;
  deliveryAsset?: string;
  fulfillmentInstructions?: string;
  createdAt: string;
}

export interface MarketplaceProductsResponse {
  success: boolean;
  products: MarketplaceProduct[];
}

export interface MarketplaceProductResponse {
  success: boolean;
  product: MarketplaceProduct;
}

export interface MarketplaceCheckoutRequest {
  productId: string;
  discountCode?: string;
  email: string;
}

export interface MarketplaceCheckoutResponse {
  success: true;
  authorizationUrl?: string; // absent when a 100%-off code delivers immediately
  deliveredImmediately?: boolean;
  reference: string;
}

export interface MarketplaceOrder {
  _id: string;
  productId: string;
  productName: string;
  reference: string;
  amountPaid: number;
  discountCode?: string;
  deliveredAt?: string;
  deliveryPayload?: { deliveryAsset?: string; fulfillmentInstructions?: string };
  createdAt: string;
}

export interface MarketplaceOrdersResponse {
  success: boolean;
  orders: MarketplaceOrder[];
}

export interface MarketplaceOrderVerifyResponse {
  success: true;
  order: MarketplaceOrder;
}

// ─────────────────────────────────────────────────────────────────────────
// Settings — AD_CAMPAIGN_PRICING_AND_GOLIVE_UPDATE.md §5 (GET /settings)
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
