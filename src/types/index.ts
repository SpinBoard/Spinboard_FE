export interface UserData {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  fullName: string;
  email: string;
  avatar?: string;
  userType: "viewer" | "brand" | "admin";
  isVerified: boolean;
  companyName?: string;
  profileComplete?: boolean;
  createdAt: string;
  accessToken: string;
  refreshToken: string;
}

// GET /me — cached session user, auth required, works for any role. There's
// no role-specific GET /profile/admin, so this is what builds an admin's
// UserData after login.
export interface MeResponse {
  success?: boolean;
  user: {
    _id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    email: string;
    avatar?: string;
    role: "viewer" | "brand" | "admin";
    isVerified: boolean;
    createdAt: string;
  };
}

// Renamed from GamerProfileData — the backend's role enum and DB field are
// now "viewer", not "gamer" (see docs/CHANGELOG_FOR_FRONTEND.md history of
// the SpinBoard→continuous-billboard rename; "gamer" was the last leftover
// of that and has now been fixed at the source too).
export interface ViewerProfileData {
  _id: string;
  firstName: string;
  lastName: string;
  avatar: string;
  username: string;
  email: string;
  role: "viewer";
  isVerified: boolean;
  // leaderboardPosition removed 2026-09-03 — live-verified via
  // GET /profile/viewer that the backend no longer returns it at all
  // (consistent with the 2026-09-02 doc pass that also dropped 7 dead
  // legacy points/leaderboard Config keys). It was never rendered
  // anywhere in this codebase.
  // Optional to browse/watch the billboard, required to claim a freebie code
  age?: number;
  sex?: ViewerSex;
  country?: string;
  state?: string;
  city?: string;
  // Display/contact only — never used for auth. New alongside the
  // gamer→viewer rename batch (docs/FRONTEND_IMPLEMENTATION_GUIDE.md §2
  // Revamp 6), settable via PUT /profile/viewer.
  phone?: string;
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
    // New alongside the ad-moderation subsystem (§2 Revamp 6) — settable via
    // PUT /profile/brand; strikeCount/suspended/suspendedReason are
    // read-only, driven by admin warn/suspend actions.
    registrationNumber?: string;
    strikeCount?: number;
    suspended?: boolean;
    suspendedReason?: string;
    // Business KYC (2026-09-02 batch) — the quick field every KYC gate
    // should read (API_GUIDE.md). Earlier the same day this was live-
    // verified as never populated by GET /profile/brand; re-verified
    // 2026-09-02 after a backend fix and it's now present and correct.
    // Existing gates in this codebase still read GET /kyc/me
    // (useKycMe()) instead — that's fine, it's a superset of this field —
    // no urgent need to migrate them.
    kycStatus?: KycStatus;
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
    // Legacy-only — the referral feature was removed 2026-08-29 (frontend
    // and backend both). Kept so a pre-existing wallet transaction from a
    // referral reward still renders with a sensible label; nothing writes
    // this reason going forward.
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
// Verified live 2026-09-04: `config` is a flat key→value map (every key
// merged, DB override if set else the default) — NOT each entry wrapped in
// `{value, description?}`. That wrapper shape is only the PUT request
// body, not what GET returns. This was previously modeled wrong here,
// which meant useAdminConfig().get() always silently fell through to the
// hardcoded ADMIN_CONFIG_DEFAULTS — see the fix note in use-admin-config.ts.
export interface AdminConfigResponse {
  success: boolean;
  config: Record<string, unknown>;
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
  type: "AD" | "HOUSE" | "FREEBIE";
  // Now always Config: billboard.bannerDisplaySeconds (15s) for AD/HOUSE —
  // videos were retired 2026-09-03 in favor of a static banner image, "like
  // a slide sliding away, not a video player." Still read from the slot
  // rather than hardcoded.
  durationSec: number;

  // AD/HOUSE only
  campaignId?: string; // AD only
  brandName?: string; // AD only
  title?: string;
  bannerImageUrl?: string; // was videoUrl before the 2026-09-03 banner switch
  // AD only (2026-09-02) — server-resolved campaignUrl || brandUrl || null.
  // HOUSE/FREEBIE never carry this: no campaign to click through to.
  // Navigate immediately on tap using this value; don't wait on a server
  // call — separately fire useBillboardClick for tracking.
  clickUrl?: string | null;

  // FREEBIE only — a live freebie code taking over this slot full-screen,
  // exactly like a real ad, at most once per session per code. No banner.
  codeId?: string;
  publicCode?: string;
  valueLabel?: string;
  freebieType?: "AIRTIME" | "CASH";
  liveUntil?: string;
}

// Admin-curated sponsored ad (2026-09-03) — a small, deliberately minimal
// side-panel placement, entirely separate from brand self-serve AdCampaign
// banners. An admin negotiates off-platform and uploads the already-agreed
// creative directly; the upload IS the vetting step, no review queue.
// null for long stretches — starts empty, render a house placeholder.
export interface SponsoredAdSlot {
  id: string;
  imageUrl: string;
  clickUrl: string | null;
}

export interface BillboardQueueResponse {
  success: boolean;
  sponsoredAd?: SponsoredAdSlot | null;
  slots: BillboardQueueSlot[];
}

export interface BillboardCompleteResponse {
  success?: boolean;
  ok?: boolean;
  completed: boolean;
}

// Public — no auth required, cheap to poll on any cadence.
export interface BillboardStatsResponse {
  stats: {
    watchingNow: number;
    codesToday: number;
    adsInRotation: number;
  };
}

// Auth required (hard 401, unlike the rest of the billboard routes).
// Consecutive days with a completed view — doesn't zero out just because
// today's empty so far, only breaks on an actual gap day.
export interface BillboardMyStreakResponse {
  streakDays: number;
}

// ─────────────────────────────────────────────────────────────────────────
// Freebie codes, claims, phrases
// ─────────────────────────────────────────────────────────────────────────

// Simplified to cash-only 2026-08-29 — freebie.dailyAirtimeCount is 0
// server-side, no new airtime drops/prizes are created. "AIRTIME" is kept
// in this union only because historical claims/prizes from before the
// cutover still carry it and must keep rendering (nothing a user has won
// ever expires — see BUSINESS_RULES.md). Never offer AIRTIME in any new
// creation/selection UI (imports, config messaging, drop-type pickers).
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
  // The board code as it appeared when won — GET /me/claims only, new
  // alongside §2 Revamp 6.
  publicCode?: string;
  status?: "ISSUED" | "REDEEMED" | "VOID";
  issuedAt?: string;
  redeemedAt?: string;
  secretCode?: string; // decrypted, visible to the owner forever — never expires
}

export interface MyClaimsResponse {
  success: boolean;
  claims: Claim[];
}

// Public.
export interface RecentCatch {
  displayName: string;
  type: FreebieType;
  valueLabel: string;
  takenAt: string;
}

export interface RecentCatchesResponse {
  catches: RecentCatch[];
}

// Auth required — today's per-type claim-cap usage, so the wallet/claims
// screens can surface a limit proactively instead of only via a 403.
export interface FreebieLimitStatus {
  type: FreebieType;
  cap: number;
  claimedToday: number;
  remaining: number;
  resetsAt?: string;
}

export interface FreebieLimitsResponse {
  limits: FreebieLimitStatus[];
}

// Public, no auth. Verified 2026-08-29 against a live instance. A fixed,
// clock-aligned window (e.g. 10:00-11:00 or 10:00-12:00 Lagos, depending on
// current server config — don't assume a fixed duration client-side, just
// render whatever windowStart/windowEnd say), never the exact scheduled
// instant and never the prize type — this is a deliberate reversal of the
// earlier "no way to see a future/scheduled drop through any endpoint...
// unpredictability is the point" rule in BUSINESS_RULES.md, so don't try to
// narrow this further client-side (e.g. cross-referencing against other
// data) — display exactly the bucket given, nothing sharper.
// `nextDropWindow` is null when there's nothing to show.
export interface NextDropWindow {
  windowStart: string;
  windowEnd: string;
  timeZone: string;
}

export interface NextDropWindowResponse {
  success: boolean;
  nextDropWindow: NextDropWindow | null;
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

// Legacy-only — a user redeeming a secret code they won before the
// 2026-08-29 cash-only cutover. No new AIRTIME claims are issued, but an
// old, already-won-but-not-yet-redeemed one must still redeem correctly
// forever (nothing a user has won ever expires).
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

// ─────────────────────────────────────────────────────────────────────────
// Admin: freebie prize inventory & schedule
//
// docs/openapi.yaml leaves these response bodies as untyped "200: OK", so
// every shape below was verified 2026-08-29 against a live instance
// (localhost:4000) rather than trusted from prose — several differed from
// the documented/inferred guess (see individual comments below for what
// changed).
//
// Two real backend bugs/gaps were found and flagged during that pass, and
// both are now confirmed FIXED (re-verified live, same day): (1)
// GET /admin/freebie-prizes was returning `prizes: []` unconditionally —
// fixed, filters re-verified working too. (2) the schedule endpoint had no
// way to resolve a fired slot's code — fixed via the inlined `resolvedCode`
// field, see FreebieScheduleSlot below.
//
// Still unverified: FreebieLowInventoryAlert's inner shape. The live
// instance never had a low-stock condition to observe one, and a backend
// summary claiming a fixed/documented shape arrived with corrupted text
// (garbled field names) — rather than guess between the possible readings,
// this is left as the original inferred guess. Get a clean example response
// (or trigger a real low-stock condition) before trusting field names here.
// ─────────────────────────────────────────────────────────────────────────

export type FreebiePrizeStatus =
  | "PENDING"
  | "ASSIGNED"
  | "CLAIMED"
  | "REDEEMED"
  | "EXHAUSTED"
  | "VOID";

// Admin-only — the raw PIN/cash stock behind a live FreebieCode. The PIN
// itself is never on this shape; it's readable only via the audit-logged
// reveal-pin call.
export interface FreebiePrizeItem {
  _id: string;
  batchId: string;
  type: FreebieType;
  value: number;
  currency: string;
  carrier?: string; // AIRTIME only, informational
  country?: string; // AIRTIME only, informational
  status: FreebiePrizeStatus;
  timesAssigned: number;
  createdBy: string;
  voidedReason?: string;
  voidedBy?: string;
  voidedAt?: string;
}

export interface FreebiePrizesResponse {
  success: boolean;
  prizes: FreebiePrizeItem[];
}

export interface FreebieLowInventoryAlert {
  type: FreebieType;
  carrier?: string;
  inStock: number;
  dailyTarget: number;
}

export interface FreebieLowInventoryResponse {
  success: boolean;
  alerts: FreebieLowInventoryAlert[];
}

// The airtime CSV batch-import endpoint/types were removed 2026-08-29 —
// freebies are cash-only going forward, no new airtime PINs are ever
// imported. See git history if a resolve endpoint for legacy airtime stock
// is ever needed again.

export interface FreebieBatchCashRequest {
  prizes: { value: number; currency?: string }[];
}

// Verified 2026-08-29 — the created-prizes key is `prizes`, not `created`.
export interface FreebieBatchCashResponse {
  success: boolean;
  batchId: string;
  count: number;
  prizes: FreebiePrizeItem[];
}

export interface FreebiePrizeVoidRequest {
  reason: string;
}

// Verified 2026-08-29 — returns the updated prize, not a bare success flag.
export interface FreebiePrizeVoidResponse {
  success: boolean;
  prize: FreebiePrizeItem;
}

// Verified 2026-08-29 — matches the pre-verification guess exactly.
export interface FreebiePrizeRevealPinResponse {
  success: boolean;
  pin: string;
  rechargeString?: string;
}

// The resolved code behind a FIRED schedule slot — a subset of the full
// FreebieCode shape. `null` on a still-PENDING slot by construction (no
// code exists yet to resolve) — the "never expose a future drop" guarantee
// holds. takenBy/takenAt weren't observed in verification (no TAKEN example
// existed in the test data) but are typed optional per the underlying
// FreebieCode model in DATA_MODELS.md.
export interface FreebieScheduleResolvedCode {
  _id: string;
  valueLabel: string;
  publicCode: string;
  status: "AVAILABLE" | "TAKEN" | "ROTATED";
  liveFrom: string;
  liveUntil: string;
  takenBy?: string;
  takenAt?: string;
}

// Admin-only — verified 2026-08-29 against a live instance, re-verified
// 2026-08-29 after a backend fix added `resolvedCode`. Originally this
// endpoint returned only a bare `freebieCodeId` pointer with no way to
// resolve it (flagged to backend as a gap); backend has since fixed this by
// inlining `resolvedCode` directly on each fired slot.
export interface FreebieScheduleSlot {
  _id: string;
  date: string;
  type: FreebieType;
  scheduledFor: string;
  status: "PENDING" | "FIRED" | "CANCELLED";
  freebieCodeId?: string; // present once status is FIRED
  resolvedCode: FreebieScheduleResolvedCode | null; // null until FIRED
  cancelledReason?: string; // present once status is CANCELLED
  createdAt: string;
  updatedAt: string;
}

export interface FreebieScheduleResponse {
  success: boolean;
  date: string;
  schedule: FreebieScheduleSlot[];
}

// Verified 2026-08-29 — the created-count key is `created`, not `generated`.
export interface FreebieScheduleGenerateResponse {
  success: boolean;
  date: string;
  created: number;
}

export interface FreebieScheduleCancelRequest {
  reason: string;
}

// Verified 2026-08-29 — returns the updated slot, not a bare success flag.
export interface FreebieScheduleCancelResponse {
  success: boolean;
  schedule: FreebieScheduleSlot;
}

export interface FreebieForceLiveRequest {
  type: FreebieType;
}

// Admin-only — the fully-resolved code a force-live (or a fired schedule
// slot, if a resolve endpoint is ever added) actually produces. Verified
// 2026-08-29: unlike FreebieScheduleSlot, this DOES match DATA_MODELS.md's
// documented FreebieCode shape.
export interface FreebieLiveCode {
  _id: string;
  prizeItemId: string;
  type: FreebieType;
  valueLabel: string;
  publicCode: string;
  status: "AVAILABLE" | "TAKEN" | "ROTATED";
  liveFrom: string;
  liveUntil: string;
  positionHint: FreebiePositionHint;
  takenBy?: string;
  takenAt?: string;
  createdAt: string;
  updatedAt: string;
}

// Verified 2026-08-29 against a live instance (this call has a real,
// visible side effect — it pushes a code live on the board — so it wasn't
// exercised until explicitly approved).
export interface FreebieForceLiveResponse {
  success: boolean;
  code: FreebieLiveCode;
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
  // Banner image (2026-09-03) — replaced video entirely; every campaign,
  // both tiers, now uploads a static banner instead. A campaign with
  // neither a banner nor a legacy video simply isn't shown in rotation
  // until the brand uploads one (POST /ad-campaigns/:campaignId/banner).
  bannerImageUrl?: string;
  bannerWidthPx?: number;
  bannerHeightPx?: number;
  bannerSizeBytes?: number;
  bannerMimeType?: string;
  // Legacy-only (2026-09-03) — pre-cutover campaigns only. Every existing
  // paid campaign's video file was deleted from storage to reclaim hosting
  // cost; these fields are now optional and never set on a new campaign.
  // Don't build any new UI around them beyond rendering historical data if
  // it happens to still be present.
  videoUrl?: string;
  videoDurationSeconds?: number;
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
  // New alongside the ad-moderation subsystem (§2 Revamp 6) — set once a
  // campaign crosses Config: adModeration.autoFlagReportThreshold reports.
  flagged?: boolean;
  flaggedAt?: string;
  flagReasons?: string[];
  // GET /ad-campaigns/mine only
  playsToday?: number;
  completionRateToday?: number;
  // GET /ad-campaigns (admin) only
  reportCount?: number;
  reportCountLastHour?: number;
  brandStrikeCount?: number;
  brandSuspended?: boolean;
}

export interface AdCampaignsResponse {
  success: boolean;
  campaigns: AdCampaign[];
}

// §4 — admin bulk moderation (campaigns go live automatically on payment now;
// admin only steps in after the fact to pull down inappropriate ones, or to
// undo a mistaken takedown).
export interface AdCampaignDeactivateRequest {
  campaignIds: string[];
  reason?: string;
}

export interface AdCampaignDeactivateResponse {
  success: boolean;
  matched: number;
  deactivated: number;
}

export interface AdCampaignReactivateRequest {
  campaignIds: string[];
}

export interface AdCampaignReactivateResponse {
  success: boolean;
  matched: number;
  reactivated: number;
  // Campaigns whose activation window already lapsed — reactivate skips
  // these rather than reviving them for free. The brand has to re-pay.
  skippedExpired: string[];
}

export interface AdCampaignResponse {
  success: boolean;
  campaign: AdCampaign;
}

// Brand self-serve pause/resume — independent of admin moderation, no
// penalty, no refund. Reuses AdCampaignResponse's shape.
export type AdCampaignPauseResumeResponse = AdCampaignResponse;

// Any signed-in role, idempotent per user+campaign.
export interface AdCampaignReportResponse {
  reported: boolean;
  flagged: boolean;
}

// Admin — campaign stays live; autoSuspended true means every one of that
// brand's active campaigns just got paused.
export interface AdCampaignWarnResponse {
  campaign: AdCampaign;
  strikeCount: number;
  autoSuspended: boolean;
}

export interface AdminBrandSuspendResponse {
  pausedCampaigns: number;
}

export interface AdCampaignAnalyticsSummary {
  views: number;
  completions: number;
  uniqueViewers?: number;
  costPerCompletedView?: number;
  // Click-through (2026-09-02) — real counts, populated from
  // POST /billboard/impressions/click tracking. clickThroughRate is
  // clicks/impressions, 0 if no impressions yet.
  clicks?: number;
  clickThroughRate?: number;
  timeSeries?: { date: string; views: number; completions: number; clicks?: number }[];
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

export interface ViewerSettings {
  role: "viewer";
  email: string;
  hasPassword: boolean;
  isVerified: boolean;
  notifications: SettingsNotificationPrefs;
  account: { firstName?: string; lastName?: string; username?: string; avatar?: string };
  privacy: { showOnLeaderboard: boolean };
  profileComplete: boolean;
}

export type Settings = BrandSettings | ViewerSettings;

export interface SettingsResponse {
  success: true;
  settings: Settings;
}

// §2 — profile completion additions
export type ViewerSex = "man" | "woman" | "prefer_not_to_say";

export interface ViewerProfileCompletionFields {
  age?: number;
  sex?: ViewerSex;
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

// ─────────────────────────────────────────────────────────────────────────
// Promote & Earn (docs/FRONTEND_IMPLEMENTATION_GUIDE.md §2 Revamp 5)
//
// A completely separate mechanic from the mockup's v-promote/b-contest/
// a-contest screens: there is no per-campaign prize pot and no per-campaign
// winner. A promoter's likes are cumulative across every campaign they've
// shared a link for — one running total, one platform-wide leaderboard, one
// grand prize per admin-opened prize period. Treat the mockup only as
// layout/visual reference (card shapes, the share box, the like button).
// ─────────────────────────────────────────────────────────────────────────

export interface PromoCampaign {
  _id: string;
  brandId: string;
  brandName: string;
  title: string;
  description: string;
  mediaUrl: string;
  mediaType: "image" | "video";
  videoDurationSeconds?: number; // video only
  status: "ACTIVE" | "PAUSED";
  // all-time, informational — not any prize period's total. Optional
  // because GET /promote/campaigns (the list) omits it live, even though
  // GET /promote/campaigns/:id (detail) includes it — verified 2026-08-30.
  likeCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCampaignsResponse {
  campaigns: PromoCampaign[];
}

export interface PromoCampaignResponse {
  campaign: PromoCampaign;
}

export interface PromoCampaignsModerationRequest {
  campaignIds: string[];
  reason?: string; // deactivate only
}

export interface PromoCampaignsModerationResponse {
  matched: number;
  affected: number;
}

// A viewer's personal share link for one campaign.
export interface PromoLink {
  linkId: string;
  campaignId: string;
  // Only on GET /promote/links/mine
  campaign?: { title: string; mediaUrl: string; mediaType: "image" | "video"; status: "ACTIVE" | "PAUSED" };
  slug: string;
  shareUrl: string;
  likeCount: number; // likes attributed to THIS link specifically
  createdAt: string;
}

export interface PromoLinkResponse {
  link: PromoLink;
}

export interface PromoLinksMineResponse {
  links: PromoLink[];
}

export interface PromoLikeResponse {
  alreadyLiked?: boolean;
  likeCount?: number;
}

export interface PromoPrizePeriod {
  _id: string;
  periodStart: string;
  periodEnd: string;
  prizeDescription: string;
  prizeAmount?: number; // unset = non-cash prize, admin fulfills manually
  currency?: string;
  status: "OPEN" | "SETTLED" | "CANCELLED";
  winnerUserId?: string;
  winningLikeTotal?: number;
  settledAt?: string;
  // A daily job now auto-opens/auto-settles the week's period by default
  // (2026-09-02) — these hold the literal string "system" instead of a
  // real admin userId when that job did it, rather than a manual admin
  // action. Render "system" as "Automatic," not a broken user lookup.
  createdBy?: string;
  settledBy?: string;
}

export interface PromoPrizePeriodsResponse {
  periods: PromoPrizePeriod[];
}

export interface PromoPrizePeriodResponse {
  period: PromoPrizePeriod;
}

// One row in GET /promote/leaderboard's entries. likeCount here is the
// cumulative total across every campaign that promoter shared within the
// period's window — this is the number that decides the grand prize, not
// any single campaign's own likeCount.
export interface LeaderboardEntry {
  rank: number;
  promoterUserId: string;
  displayName: string;
  likeCount: number;
}

export interface PromoLeaderboardResponse {
  period: PromoPrizePeriod | null;
  entries: LeaderboardEntry[];
}

export interface PromoDisqualifiedPromoter {
  userId: string;
  displayName: string;
  reason: string;
  disqualifiedAt: string;
}

export interface PromoDisqualifiedPromotersResponse {
  promoters: PromoDisqualifiedPromoter[];
}

export interface PromoPeriodSettleResponse {
  period: PromoPrizePeriod;
  winnerUserId?: string;
  winningLikeTotal?: number;
}

// §New (2026-09-02) — Business KYC verification (/kyc/*, /admin/kyc/*).
// Brand-only. An automated CAC pre-check runs but never decides the
// outcome — a human admin always makes the final call via approve/reject.
// Interswitch's real API isn't wired yet, so automatedCheck.result is
// "provider_error" on effectively every submission right now; that's
// expected, not a bug (docs/frontend/README.md). Read Brand.kycStatus
// (BrandProfileData.brandDetails.kycStatus above) for gating UI — GET
// /kyc/me is only needed on the KYC screen itself, for the full record.
export type KycStatus = "not_submitted" | "pending_review" | "verified" | "rejected" | "revoked";
export type KycBusinessType = "RC" | "BN" | "IT";
export type KycRepIdType = "NIN" | "drivers_license" | "passport" | "voters_card";
export type KycAutomatedCheckResult = "not_run" | "match" | "no_match" | "provider_error";

export interface BusinessKyc {
  _id: string;
  brandId: string;
  rcNumber: string;
  businessType?: KycBusinessType;
  legalBusinessName: string;
  automatedCheck: {
    result: KycAutomatedCheckResult;
    checkedAt?: string;
    // Admin-only — present on GET /admin/kyc/:id, never on GET /kyc/me.
    providerRawResponse?: unknown;
    providerError?: string;
  };
  // Verified live 2026-09-02 — omitted entirely (not even `{}`) when no
  // files were attached on submit, not just an object with empty fields.
  documents?: {
    cacCertificateUrl?: string;
    repIdUrl?: string;
    repIdType?: KycRepIdType;
    uploadedAt?: string;
  };
  status: KycStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  revokedReason?: string;
  revokedBy?: string;
  revokedAt?: string;
  submittedAt: string;
  attemptNumber: number;
  createdAt: string;
  updatedAt: string;
}

export interface KycMeResponse {
  kyc: BusinessKyc | null;
}
export interface KycSubmitResponse {
  kyc: BusinessKyc;
}
// Verified live 2026-09-02 against GET /admin/kyc/queue: the envelope key
// is "queue", not "kyc" as the docs' prose implied.
export interface KycQueueResponse {
  success: boolean;
  queue: BusinessKyc[];
}
export interface KycDetailResponse {
  kyc: BusinessKyc;
}
export interface KycRejectRequest {
  reason: string;
}
export interface KycRevokeRequest {
  reason: string;
}

// §New (2026-09-02) — B2B marketplace: Projects & Quotations
// (/projects*, /quotations*, /quotation-unlock*, /business-contact/*,
// /business-ratings*). Both sides of every interaction must be
// KYC-verified. A poster sees their 1 free quotation for free; the rest
// require an account-wide 30-day unlock pass, paid by wallet debit.
export type ProjectStatus = "open" | "closed" | "cancelled";
export type QuotationStatus = "submitted" | "withdrawn";

export interface Project {
  _id: string;
  brandId: string;
  title: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  currency: string;
  category?: string;
  deadline?: string;
  status: ProjectStatus;
  quotationCount: number;
  // The one quotation the poster can see for free, before unlocking the
  // rest. Auto-repoints to the next-earliest live quotation if this one is
  // withdrawn.
  freeQuotationId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Quotation {
  _id: string;
  projectId: string;
  brandId: string;
  amount: number;
  currency: string;
  message: string;
  attachmentUrls?: string[];
  status: QuotationStatus;
  withdrawnAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectCreateRequest {
  title: string;
  description: string;
  budgetMin?: number;
  budgetMax?: number;
  currency?: string;
  category?: string;
  deadline?: string;
}
export interface ProjectResponse {
  project: Project;
}
export interface ProjectsResponse {
  projects: Project[];
}

// GET /projects/:id/quotations — the paywall response. `unlocked` reflects
// the poster's own active unlock pass; when false, `quotations` holds only
// the free one (or is empty if none exist yet) while `totalQuotationCount`
// still reports the real total, so the UI can show "1 of 12 visible —
// unlock to see the rest" without a second call.
export interface ProjectQuotationsResponse {
  quotations: Quotation[];
  unlocked: boolean;
  totalQuotationCount: number;
}

export interface QuotationCreateRequest {
  amount: number;
  message: string;
  attachmentUrls?: string[];
}
export interface QuotationResponse {
  quotation: Quotation;
}

export interface QuotationUnlockStatusResponse {
  active: boolean;
  expiresAt?: string;
}
// POST /quotation-unlock/purchase extends any existing active pass rather
// than stacking a second one — the response is just the new expiry.
export interface QuotationUnlockPurchaseResponse {
  expiresAt: string;
}

// Wallet top-up — same Paystack-checkout pattern as ad-campaign payment
// (see AdPaymentInitializeResponse), now available to brands so they can
// fund the balance a quotation-unlock purchase debits from.
export interface WalletTopupInitializeRequest {
  amount: number;
  email: string;
}
export interface WalletTopupInitializeResponse {
  success: true;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
    amount: number;
    currency: string;
  };
}
export interface WalletTopupVerifyResponse {
  success: boolean;
  message: string;
  transaction: {
    reference: string;
    amount: number;
    status: "success" | "failed" | "pending";
  };
}

export interface BusinessContactThread {
  _id: string;
  projectId: string;
  quotationId: string;
  posterBrandId: string;
  quoterBrandId: string;
  lastMessageAt?: string;
  createdAt: string;
  updatedAt: string;
}
export interface BusinessContactMessage {
  _id: string;
  threadId: string;
  senderBrandId: string;
  body: string;
  createdAt: string;
}
export interface BusinessContactThreadCreateRequest {
  projectId: string;
  quotationId: string;
}
export interface BusinessContactThreadsResponse {
  threads: BusinessContactThread[];
}
export interface BusinessContactThreadResponse {
  thread: BusinessContactThread;
}
export interface BusinessContactMessagesResponse {
  messages: BusinessContactMessage[];
}
export interface BusinessContactMessageResponse {
  message: BusinessContactMessage;
}

// Rating is once per (project, rater, rated) direction — the same two
// businesses can rate each other again on a different project, and each
// side rates the other independently on the same project. "Rate" only
// makes sense inside an existing contact thread (CONTACT_REQUIRED fires
// otherwise), so the UI should only ever surface it from there.
export interface BusinessRating {
  _id: string;
  projectId: string;
  quotationId: string;
  raterBrandId: string;
  ratedBrandId: string;
  score: number;
  comment?: string;
  hidden: boolean;
  createdAt: string;
}
export interface BusinessRatingCreateRequest {
  projectId: string;
  quotationId: string;
  ratedBrandId: string;
  score: number;
  comment?: string;
}
export interface BusinessRatingResponse {
  rating: BusinessRating;
}
export interface BusinessRatingsForBusinessResponse {
  averageScore: number;
  count: number;
  ratings: BusinessRating[];
}
export interface BusinessRatingReportRequest {
  reason: string;
}
// Reporting is idempotent per user, same shape as AdCampaignReportResponse.
export interface BusinessRatingReportResponse {
  reported: boolean;
  flagged: boolean;
}
// Response envelope for the admin flags queue follows this codebase's list
// convention (plural key matching the resource) — not verified against a
// live docs example line-by-line, since the docs bundle names the endpoint
// and its purpose but doesn't print a sample payload. Adjust the key if it
// disagrees with the live response.
export interface AdminBusinessRatingFlagsResponse {
  ratings: BusinessRating[];
}
export interface AdminBusinessRatingHideRequest {
  reason: string;
}

// §New (2026-09-02) — Forum: public discussion threads/posts, plus a
// winner-share submission queue for a viewer who won something and shared
// it publicly to self-report it for a bonus-points review. Browsing
// (threads/posts) is public, everything else needs auth.
export interface ForumThread {
  _id: string;
  title: string;
  createdBy: string;
  category?: string;
  pinned: boolean;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}
export interface ForumThreadCreateRequest {
  title: string;
  category?: string;
}
export interface ForumThreadsResponse {
  threads: ForumThread[];
}
export interface ForumThreadResponse {
  thread: ForumThread;
}

// moderationStatus: "hidden" posts are NOT excluded server-side from
// GET /threads/:id/posts (only "removed" is) — render a placeholder
// instead of the real body for "hidden", the filtering is client-side by
// design (BUSINESS_RULES.md / UI_CONTRACT.md both say so explicitly).
export interface ForumPost {
  _id: string;
  threadId: string;
  userId: string;
  body: string;
  imageUrls?: string[];
  moderationStatus: "visible" | "hidden" | "removed";
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface ForumPostCreateRequest {
  body: string;
  imageUrls?: string[];
}
export interface ForumPostsResponse {
  posts: ForumPost[];
}
export interface ForumPostResponse {
  post: ForumPost;
}
// Like/unlike are two separate explicit endpoints, not one toggle — `liked`/
// `unliked` come back false on a no-op repeat call, not an error. Neither
// endpoint nor any other tells the caller whether *this* user has already
// liked a given post — there's no "did I like this" flag on ForumPost, so
// the like button's filled/outline state can only be tracked client-side
// for the current session, not restored on a later visit.
export interface ForumPostLikeResponse {
  liked: boolean;
}
export interface ForumPostUnlikeResponse {
  unliked: boolean;
}
export interface ForumPostFlagRequest {
  reason: string;
}

export interface ForumFlag {
  _id: string;
  postId: string;
  flaggedBy: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
}
// Response envelope follows this codebase's list convention, same caveat as
// AdminBusinessRatingFlagsResponse — the docs name the endpoint and purpose
// but don't print a sample payload; adjust the key if it disagrees live.
export interface AdminForumFlagsResponse {
  flags: ForumFlag[];
}
export interface AdminForumFlagResolveRequest {
  status: "resolved" | "dismissed";
  // Sets the flagged post's moderationStatus to "hidden" (never "removed",
  // never deleted) when true.
  hidePost?: boolean;
}

// campaignId's exact referent isn't explicitly typed in the docs — inferred
// from UI_CONTRACT.md's framing ("a viewer who won something and shared it
// publicly can self-report it") to be a Promote & Earn PromoCampaign._id,
// since that's the only "share something publicly" mechanic in this
// product. Built against that assumption; flag to backend if wrong.
export type WinnerShareSubmissionStatus = "submitted" | "verified" | "rejected";
export interface WinnerShareSubmission {
  _id: string;
  userId: string;
  campaignId: string;
  postUrl: string;
  claimedLikeCount?: number;
  status: WinnerShareSubmissionStatus;
  adminReviewerId?: string;
  adminNotes?: string;
  reviewedAt?: string;
  bonusPointsGranted?: number;
  createdAt: string;
}
export interface WinnerShareSubmitRequest {
  campaignId: string;
  postUrl: string;
  claimedLikeCount?: number;
}
export interface WinnerShareSubmissionResponse {
  submission: WinnerShareSubmission;
}
export interface WinnerShareSubmissionsResponse {
  submissions: WinnerShareSubmission[];
}
export interface AdminWinnerShareReviewRequest {
  adminNotes?: string;
}

// §New — Admin: weekly payout run (design/DECISIONS.md's a-payouts, ranked
// one of the two highest-priority unbuilt screens: someone was settling
// weekly cash-outs by hand against a database). The mockup's own a-payouts
// screen depicts a different, older mechanic (paste a winner's secret code,
// verify it, mark that one claim paid) that has no backing endpoint at all
// — the real flow is period-based: open a run for a date range, which
// snapshots every wallet at/above Config: payout.threshold into line
// items, work through those items (paid/skipped/failed), lock the
// snapshotted amounts, then complete once every item is resolved. Use the
// mockup only for the split-layout/table/card visual language, not this
// mechanic.
export type PayoutRunStatus = "DRAFT" | "LOCKED" | "COMPLETED" | "CANCELLED";
export type PayoutRunItemStatus = "PENDING" | "PAID" | "SKIPPED" | "FAILED";

export interface PayoutRun {
  _id: string;
  periodStart: string;
  periodEnd: string;
  createdBy: string;
  status: PayoutRunStatus;
  totalAmount: number; // snapshotted at open time
  userCount: number;
  lockedAt?: string;
  completedAt?: string;
}

export interface PayoutRunItem {
  _id: string;
  runId: string;
  userId: string;
  amount: number; // snapshotted at open time — never re-read from the live wallet
  status: PayoutRunItemStatus;
  reference?: string;
  notes?: string;
  paidBy?: string;
  paidAt?: string;
  method?: string; // e.g. "bank_transfer", informational only
}

export interface PayoutRunsResponse {
  runs: PayoutRun[];
  outstandingLiability: number;
}
export interface PayoutRunCreateRequest {
  periodStart: string;
  periodEnd: string;
}
export interface PayoutRunResponse {
  run: PayoutRun;
}
export interface PayoutRunItemsResponse {
  items: PayoutRunItem[];
}
export interface PayoutItemMarkPaidRequest {
  method?: string;
  reference?: string;
}
export interface PayoutItemsMarkPaidBulkRequest {
  itemIds: string[];
  method?: string;
  reference?: string;
}
export interface PayoutItemSkipFailRequest {
  reason: string;
}

// §New (2026-09-03, extended 2026-09-04) — Admin: sponsored ads. Full
// admin-only record; the public projection viewers actually see is the
// lighter SponsoredAdSlot on GET /billboard/queue above. Two ways a row
// gets created: an admin uploads already-negotiated creative directly
// (goes ACTIVE immediately — the upload itself is the vetting step), or
// an advertiser submits their own via the public POST /sponsored-ads/submit
// (lands PENDING, invisible on the billboard, until an admin activates or
// deactivates it — same admin action approves/declines either way).
export type SponsoredAdStatus = "PENDING" | "ACTIVE" | "INACTIVE";
export interface SponsoredAd {
  _id: string;
  imageUrl: string;
  widthPx: number;
  heightPx: number;
  advertiserName: string;
  clickUrl?: string;
  // Submission-only — set only on a brand's own POST /sponsored-ads/submit,
  // never on an admin's direct upload.
  contactEmail?: string;
  contactPhone?: string;
  message?: string;
  status: SponsoredAdStatus;
  clickCount: number;
  // Admin userId — unset on a PENDING submission until an admin acts on it.
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
export interface SponsoredAdsResponse {
  sponsoredAds: SponsoredAd[];
}
export interface SponsoredAdSubmitRequest {
  image: File;
  advertiserName: string;
  contactEmail: string;
  contactPhone?: string;
  message?: string;
  clickUrl?: string;
}
// Deliberately thin — "thanks, we'll be in touch," nothing to poll or render.
export interface SponsoredAdSubmitResponse {
  submissionId: string;
}
export interface SponsoredAdResponse {
  sponsoredAd: SponsoredAd;
}
