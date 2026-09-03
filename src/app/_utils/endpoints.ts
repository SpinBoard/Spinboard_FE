export const ENDPOINTS = {
  // Authentication
  LOGIN: "/auth/login",
  REGISTER_VIEWER: "/auth/viewer/register",
  REGISTER_BRAND: "/auth/brand/register",
  GOOGLE_AUTH: "/auth/google",
  FORGOT_PASSWORD: "/auth/forgot-password",
  RESET_PASSWORD: "/auth/reset-password",
  ACTIVATE_USER: "/auth/user/activate",
  VIEWER_PROFILE: "/profile/viewer",
  BRAND_PROFILE: "/profile/brand",
  UPDATE_PROFILE: "/profile/viewer",
  UPLOAD_PROFILE_IMAGE: "/profile/image",

  // Cached session user (auth required, works for any role) — used to build
  // the admin session, since there's no role-specific GET /profile/admin.
  USER_ME: "/me",

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
  BILLBOARD_CLICK: "/billboard/impressions/click",
  BILLBOARD_STATS: "/billboard/stats",
  BILLBOARD_MY_STREAK: "/billboard/my-streak",

  // ── Freebie codes (win + redeem) ──
  FREEBIES_STRIP: "/freebies/strip",
  FREEBIES_STRIP_EVENTS: "/freebies/strip/events",
  FREEBIES_PHRASES: "/freebies/phrases",
  FREEBIES_APPLY: "/freebies/apply",
  FREEBIES_RECENT_CATCHES: "/freebies/recent-catches",
  FREEBIES_LIMITS_MINE: "/freebies/limits/mine",
  FREEBIES_NEXT_DROP_WINDOW: "/freebies/next-drop-window",
  ME_CLAIMS: "/me/claims",
  ME_CLAIMS_REDEEM: (claimId: string) => `/me/claims/${claimId}/redeem`,

  // ── Admin: freebie prize inventory & drop schedule (cash-only since
  // 2026-08-29 — the airtime batch-import endpoint was removed) ──
  ADMIN_FREEBIE_PRIZES_BATCH_CASH: "/admin/freebie-prizes/batch/cash",
  ADMIN_FREEBIE_PRIZES: (type?: string, status?: string) => {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    const query = params.toString();
    return `/admin/freebie-prizes${query ? `?${query}` : ""}`;
  },
  ADMIN_FREEBIE_PRIZES_LOW_INVENTORY: "/admin/freebie-prizes/low-inventory",
  ADMIN_FREEBIE_PRIZE_VOID: (prizeItemId: string) =>
    `/admin/freebie-prizes/${prizeItemId}/void`,
  ADMIN_FREEBIE_PRIZE_REVEAL_PIN: (prizeItemId: string) =>
    `/admin/freebie-prizes/${prizeItemId}/reveal-pin`,
  ADMIN_FREEBIES_SCHEDULE: (date: string) =>
    `/admin/freebies/schedule?date=${encodeURIComponent(date)}`,
  ADMIN_FREEBIES_SCHEDULE_GENERATE: "/admin/freebies/schedule/generate",
  ADMIN_FREEBIES_SCHEDULE_CANCEL: (scheduleId: string) =>
    `/admin/freebies/schedule/${scheduleId}/cancel`,
  ADMIN_FREEBIES_FORCE_LIVE: "/admin/freebies/force-live",

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

  // Ad campaigns (admin-only bulk moderation — takedown/restore after the
  // fact, since campaigns now go live automatically on payment)
  AD_CAMPAIGNS_DEACTIVATE: "/ad-campaigns/deactivate",
  AD_CAMPAIGNS_REACTIVATE: "/ad-campaigns/reactivate",

  // Ad campaigns — brand self-serve pause/resume, and reporting (any role)
  AD_CAMPAIGN_PAUSE: (campaignId: string) => `/ad-campaigns/${campaignId}/pause`,
  AD_CAMPAIGN_RESUME: (campaignId: string) => `/ad-campaigns/${campaignId}/resume`,
  AD_CAMPAIGN_REPORT: (campaignId: string) => `/ad-campaigns/${campaignId}/report`,

  // Ad moderation (admin) — warn/suspend, escalating past the bulk
  // deactivate/reactivate above
  AD_CAMPAIGN_WARN: (campaignId: string) => `/ad-campaigns/${campaignId}/warn`,
  ADMIN_BRAND_SUSPEND: (brandId: string) => `/admin/brands/${brandId}/suspend`,
  ADMIN_BRAND_UNSUSPEND: (brandId: string) => `/admin/brands/${brandId}/unsuspend`,

  // Promote & Earn — cumulative platform-wide leaderboard, not a per-campaign
  // pot (see docs/FRONTEND_IMPLEMENTATION_GUIDE.md §2 Revamp 5)
  PROMOTE_CAMPAIGNS: "/promote/campaigns",
  PROMOTE_CAMPAIGNS_MINE: "/promote/campaigns/mine",
  PROMOTE_CAMPAIGN_DETAILS: (campaignId: string) => `/promote/campaigns/${campaignId}`,
  PROMOTE_CAMPAIGNS_DEACTIVATE: "/promote/campaigns/deactivate",
  PROMOTE_CAMPAIGNS_REACTIVATE: "/promote/campaigns/reactivate",
  PROMOTE_CAMPAIGN_LINKS: (campaignId: string) => `/promote/campaigns/${campaignId}/links`,
  PROMOTE_LINKS_MINE: "/promote/links/mine",
  PROMOTE_LIKE: (slug: string) => `/promote/like/${slug}`,
  PROMOTE_LEADERBOARD: (periodId?: string) =>
    periodId ? `/promote/leaderboard?periodId=${periodId}` : "/promote/leaderboard",
  ADMIN_PROMOTE_LIKE_VOID: (likeId: string) => `/admin/promote/likes/${likeId}/void`,
  ADMIN_PROMOTE_PROMOTER_DISQUALIFY: (userId: string) =>
    `/admin/promote/promoters/${userId}/disqualify`,
  ADMIN_PROMOTE_PROMOTER_REQUALIFY: (userId: string) =>
    `/admin/promote/promoters/${userId}/requalify`,
  ADMIN_PROMOTE_PROMOTERS_DISQUALIFIED: "/admin/promote/promoters/disqualified",
  ADMIN_PROMOTE_PERIODS: "/admin/promote/periods",
  ADMIN_PROMOTE_PERIOD_SETTLE: (periodId: string) => `/admin/promote/periods/${periodId}/settle`,
  ADMIN_PROMOTE_PERIOD_CANCEL: (periodId: string) => `/admin/promote/periods/${periodId}/cancel`,

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

  // ── Business KYC verification (brand-only submit/status, admin review) ──
  KYC_SUBMIT: "/kyc/submit",
  KYC_ME: "/kyc/me",
  KYC_RESUBMIT: "/kyc/resubmit",
  ADMIN_KYC_QUEUE: "/admin/kyc/queue",
  ADMIN_KYC_DETAILS: (id: string) => `/admin/kyc/${id}`,
  ADMIN_KYC_APPROVE: (id: string) => `/admin/kyc/${id}/approve`,
  ADMIN_KYC_REJECT: (id: string) => `/admin/kyc/${id}/reject`,
  ADMIN_BRAND_KYC_REVOKE: (brandId: string) => `/admin/brands/${brandId}/kyc/revoke`,

  // ── B2B marketplace: Projects & Quotations (both sides KYC-verified) ──
  PROJECTS: "/projects",
  PROJECTS_MINE: "/projects/mine",
  PROJECT_DETAILS: (id: string) => `/projects/${id}`,
  PROJECT_CLOSE: (id: string) => `/projects/${id}/close`,
  PROJECT_CANCEL: (id: string) => `/projects/${id}/cancel`,
  PROJECT_QUOTATIONS: (id: string) => `/projects/${id}/quotations`,
  QUOTATION_WITHDRAW: (id: string) => `/quotations/${id}/withdraw`,
  QUOTATION_UNLOCK_PURCHASE: "/quotation-unlock/purchase",
  QUOTATION_UNLOCK_STATUS: "/quotation-unlock/status",
  ADMIN_PROJECT_QUOTATIONS: (id: string) => `/admin/projects/${id}/quotations`,

  // Wallet top-up (brand-only today — funds the balance a quotation-unlock
  // purchase debits from) — same Paystack initialize/verify pattern as
  // AD_PAYMENTS_INITIALIZE/VERIFY above.
  WALLET_TOPUP_INITIALIZE: "/wallet/topup/initialize",
  WALLET_TOPUP_VERIFY: (reference: string) => `/wallet/topup/verify/${reference}`,

  BUSINESS_CONTACT_THREADS: "/business-contact/threads",
  BUSINESS_CONTACT_THREAD_MESSAGES: (threadId: string) =>
    `/business-contact/threads/${threadId}/messages`,

  BUSINESS_RATINGS: "/business-ratings",
  BUSINESS_RATINGS_FOR_BUSINESS: (brandId: string) => `/business-ratings/business/${brandId}`,
  BUSINESS_RATING_REPORT: (id: string) => `/business-ratings/${id}/report`,
  ADMIN_BUSINESS_RATINGS_FLAGS: "/admin/business-ratings/moderation/flags",
  ADMIN_BUSINESS_RATING_HIDE: (id: string) => `/admin/business-ratings/${id}/hide`,
  ADMIN_BUSINESS_RATING_REPORT_DISMISS: (id: string) =>
    `/admin/business-ratings/reports/${id}/dismiss`,

  // ── Forum: public threads/posts + a winner-share bonus-points queue ──
  FORUM_THREADS: "/forum/threads",
  FORUM_THREAD_POSTS: (threadId: string) => `/forum/threads/${threadId}/posts`,
  FORUM_POST_LIKE: (postId: string) => `/forum/posts/${postId}/like`,
  FORUM_POST_FLAG: (postId: string) => `/forum/posts/${postId}/flag`,
  ADMIN_FORUM_FLAGS: (status?: string) =>
    status ? `/forum/moderation/flags?status=${status}` : "/forum/moderation/flags",
  ADMIN_FORUM_FLAG_RESOLVE: (flagId: string) => `/forum/moderation/flags/${flagId}`,
  FORUM_WINNER_SUBMISSIONS: "/forum/winner-submissions",
  FORUM_WINNER_SUBMISSIONS_MINE: "/forum/winner-submissions/mine",
  ADMIN_FORUM_WINNER_SUBMISSIONS: (status?: string) =>
    status ? `/forum/winner-submissions?status=${status}` : "/forum/winner-submissions",
  ADMIN_FORUM_WINNER_SUBMISSION_VERIFY: (id: string) => `/forum/winner-submissions/${id}/verify`,
  ADMIN_FORUM_WINNER_SUBMISSION_REJECT: (id: string) => `/forum/winner-submissions/${id}/reject`,

  // ── Admin: weekly payout run ──
  ADMIN_PAYOUT_RUNS: "/admin/payout-runs",
  ADMIN_PAYOUT_RUN_ITEMS: (runId: string) => `/admin/payout-runs/${runId}/items`,
  ADMIN_PAYOUT_RUN_LOCK: (runId: string) => `/admin/payout-runs/${runId}/lock`,
  ADMIN_PAYOUT_RUN_EXPORT: (runId: string) => `/admin/payout-runs/${runId}/export.csv`,
  ADMIN_PAYOUT_RUN_ITEM_PAID: (runId: string, itemId: string) =>
    `/admin/payout-runs/${runId}/items/${itemId}/paid`,
  ADMIN_PAYOUT_RUN_ITEMS_PAID_BULK: (runId: string) => `/admin/payout-runs/${runId}/items/paid-bulk`,
  ADMIN_PAYOUT_RUN_ITEM_SKIP: (runId: string, itemId: string) =>
    `/admin/payout-runs/${runId}/items/${itemId}/skip`,
  ADMIN_PAYOUT_RUN_ITEM_FAIL: (runId: string, itemId: string) =>
    `/admin/payout-runs/${runId}/items/${itemId}/fail`,
  ADMIN_PAYOUT_RUN_COMPLETE: (runId: string) => `/admin/payout-runs/${runId}/complete`,
};
