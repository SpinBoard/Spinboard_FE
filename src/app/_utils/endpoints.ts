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
  CHANGE_PASSWORD: "/profile/change-password",
  UPDATE_NOTIFICATIONS: "/profile/notifications",
  UPDATE_PRIVACY: "/profile/privacy",
  DELETE_ACCOUNT: "/profile/account",

  // Payment
  INITIALIZE_PAYMENT: "/payments/initialize",
  VERIFY_PAYMENT: "/payments/verify",

  // Wallet & withdrawals
  WALLET_BALANCE: "/wallet/balance",
  WALLET_TRANSACTIONS: (limit: number = 50) =>
    `/wallet/transactions?limit=${limit}`,
  WALLET_BANK_ACCOUNTS: "/wallet/bank-accounts",
  WALLET_BANK_ACCOUNT_DELETE: (id: string) => `/wallet/bank-accounts/${id}`,
  WALLET_WITHDRAWALS: "/wallet/withdrawals",
  WALLET_WITHDRAWAL_DETAILS: (id: string) => `/wallet/withdrawals/${id}`,

  // Admin config
  ADMIN_CONFIG: "/admin/config",
  ADMIN_CONFIG_KEY: (key: string) => `/admin/config/${key}`,

  // ── Ads-watching & reward platform (API_CONTRACT_ADS_REWARD_PLATFORM.md) ──

  // Ad-watching flow (§3) — optional auth, work for anon + authenticated
  ADS_NEXT: (country?: string) =>
    country ? `/ads/next?country=${encodeURIComponent(country)}` : `/ads/next`,
  AD_VIDEO_START: (campaignId: string) => `/ads/${campaignId}/video/start`,
  AD_VIDEO_COMPLETE: (campaignId: string) =>
    `/ads/${campaignId}/video/complete`,
  AD_QUIZ_SUBMIT: (campaignId: string) => `/ads/${campaignId}/quiz/submit`,

  // Ad campaigns (brand-facing, §4)
  AD_CAMPAIGNS: "/ad-campaigns",
  AD_CAMPAIGNS_MINE: "/ad-campaigns/mine",
  AD_CAMPAIGN_DETAILS: (campaignId: string) => `/ad-campaigns/${campaignId}`,
  AD_CAMPAIGN_ANALYTICS: (campaignId: string) =>
    `/ad-campaigns/${campaignId}/analytics`,
  AD_PAYMENTS_INITIALIZE: "/ad-payments/initialize",
  AD_PAYMENTS_VERIFY: (reference: string) =>
    `/ad-payments/verify/${reference}`,

  // Spin & prize system (§5)
  SPINS: "/spins",
  SPIN_WIN_DECISION: (spinResultId: string) =>
    `/spins/wins/${spinResultId}/decision`,
  SPIN_VERIFY: (spinResultId: string) => `/spins/${spinResultId}/verify`,
  TRY_AGAIN_STATUS: "/spins/try-again/status",
  TRY_AGAIN_SPEND: "/spins/try-again/spend",

  // Marketplace (§7)
  MARKETPLACE_PRODUCTS: "/marketplace/products",
  MARKETPLACE_PRODUCT_DETAILS: (productId: string) =>
    `/marketplace/products/${productId}`,
  MARKETPLACE_CHECKOUT: "/marketplace/checkout",
  MARKETPLACE_ORDER_VERIFY: (reference: string) =>
    `/marketplace/orders/${reference}/verify`,
  MARKETPLACE_ORDERS_MINE: "/marketplace/orders/mine",

  // Admin — prize pool (§8)
  ADMIN_PRIZE_POOL: (date: string) => `/admin/prize-pool/${date}`,
};
