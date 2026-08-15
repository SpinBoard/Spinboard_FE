export const ENDPOINTS = {
  // Authentication
  LOGIN: "/auth/login",
  REGISTER_GAMER: "/auth/gamer/register",
  REGISTER_BRAND: "/auth/brand/register",
  GOOGLE_AUTH: "/auth/google",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",
  ACTIVATE_USER: "/auth/user/activate",
  GAMER_PROFILE: "/profile/gamer",
  BRAND_PROFILE: "/profile/brand",
  UPDATE_PROFILE: "/profile/gamer",
  UPLOAD_PROFILE_IMAGE: "/profile/image",

  // Referrals
  REFERRALS_SUMMARY: "/referrals/summary",
  REFERRALS_EVENTS: "/referrals/events",
  REFERRALS_MY_STATS: (month?: string) =>
    month ? `/referrals/my-stats?month=${month}` : `/referrals/my-stats`,

  // Authenticated user profile (includes referral analytics)
  USER_ME: "/user/me",

  // User settings
  SETTINGS: "/settings",
  CHANGE_PASSWORD: "/profile/change-password",
  UPDATE_NOTIFICATIONS: "/profile/notifications",
  UPDATE_PRIVACY: "/profile/privacy",
  DELETE_ACCOUNT: "/profile/account",

  // Payment
  INITIALIZE_PAYMENT: "/payments/initialize",
  VERIFY_PAYMENT: "/payments/verify",

  // Wallet
  WALLET_BALANCE: "/wallet/balance",
  WALLET_TRANSACTIONS: (limit: number = 50) =>
    `/wallet/transactions?limit=${limit}`,
  WALLET_BANK_ACCOUNTS: "/wallet/bank-accounts",
  WALLET_BANK_ACCOUNT_DELETE: (id: string) => `/wallet/bank-accounts/${id}`,
  // No withdrawal endpoint exists — cash only leaves via the manual weekly
  // payout run. Don't add a WALLET_WITHDRAWALS constant back.

  // Admin config
  ADMIN_CONFIG: "/admin/config",
  ADMIN_CONFIG_KEY: (key: string) => `/admin/config/${key}`,

  // ── Billboard (continuous ad playback, no gate) ──
  BILLBOARD_SESSION: "/billboard/session",
  BILLBOARD_QUEUE: (sessionId: string, size: number = 5) =>
    `/billboard/queue?sessionId=${encodeURIComponent(sessionId)}&size=${size}`,
  BILLBOARD_HEARTBEAT: "/billboard/impressions/heartbeat",
  BILLBOARD_COMPLETE: "/billboard/impressions/complete",

  // ── Freebie codes (win + redeem) ──
  FREEBIES_STRIP: "/freebies/strip",
  FREEBIES_STRIP_EVENTS: "/freebies/strip/events",
  FREEBIES_PHRASES: "/freebies/phrases",
  FREEBIES_APPLY: "/freebies/apply",
  ME_CLAIMS: "/me/claims",
  ME_CLAIMS_REDEEM: (claimId: string) => `/me/claims/${claimId}/redeem`,

  // Ad campaigns (brand-facing)
  AD_CAMPAIGNS: "/ad-campaigns",
  AD_CAMPAIGNS_MINE: "/ad-campaigns/mine",
  AD_CAMPAIGN_DETAILS: (campaignId: string) => `/ad-campaigns/${campaignId}`,
  AD_CAMPAIGN_ANALYTICS: (campaignId: string) =>
    `/ad-campaigns/${campaignId}/analytics`,
  AD_CAMPAIGN_ANALYTICS_BREAKDOWN: (campaignId: string) =>
    `/ad-campaigns/${campaignId}/analytics/breakdown`,
  AD_CAMPAIGN_ANALYTICS_EXPORT: (campaignId: string) =>
    `/ad-campaigns/${campaignId}/analytics/export.csv`,
  AD_PAYMENTS_INITIALIZE: "/ad-payments/initialize",
  AD_PAYMENTS_VERIFY: (reference: string) =>
    `/ad-payments/verify/${reference}`,

  // Marketplace — business directory (no checkout)
  MARKETPLACE_BUSINESSES: "/marketplace/businesses",
  MARKETPLACE_BUSINESS_DETAILS: (brandId: string) =>
    `/marketplace/businesses/${brandId}`,
  MARKETPLACE_BUSINESS_PROFILE_MINE: "/marketplace/business/profile/mine",
  MARKETPLACE_BUSINESS_PROFILE: "/marketplace/business/profile",
  MARKETPLACE_PRODUCTS: "/marketplace/products",
  MARKETPLACE_PRODUCTS_MINE: "/marketplace/products/mine",
  MARKETPLACE_PRODUCT_DETAILS: (productId: string) =>
    `/marketplace/products/${productId}`,
};
