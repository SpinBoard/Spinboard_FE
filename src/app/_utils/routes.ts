export const routes = {
  // Public Routes
  HOME: "/",
  REGISTER: "/register",
  LOGIN: "/login",
  ABOUT: "/about",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  VERIFY_OTP: "/verify-otp",
  PRICING: "/pricing",
  PRIVACY: "/privacy",
  TERMS: "/terms",
  CONTACT: "/contact",
  HOW_IT_WORKS: "/how-it-works",
  PAYMENT_VERIFY: "/payment/verify",
  WALLET_TOPUP_VERIFY: "/wallet/topup/verify",

  // The billboard — continuous ad playback + freebie-code strip, no gate.
  // Works logged-out.
  WATCH: "/watch",

  // Marketplace — business directory, not a store
  MARKETPLACE: "/marketplace",
  MARKETPLACE_BUSINESS: (brandId: string) => `/marketplace/business/${brandId}`,
  MARKETPLACE_PRODUCT: (id: string) => `/marketplace/${id}`,

  // Promote & Earn — a public campaign detail page (what a viewer visits to
  // grab their own share link) and the share link's own landing page (what
  // a link resolves to for someone who followed it). Both public — liking
  // requires auth, viewing doesn't.
  PROMOTE_CAMPAIGN: (campaignId: string) => `/promote/c/${campaignId}`,
  PROMOTE_LANDING: (slug: string) => `/promote/l/${slug}`,

  // Forum — browsing is public, posting/liking/flagging needs auth (gated
  // inline, same pattern as the Promote & Earn public pages above)
  FORUM: "/forum",
  FORUM_THREAD: (threadId: string) => `/forum/${threadId}`,

  // User Routes
  USER: {
    DASHBOARD: "/user/dashboard",
    PROFILE: "/user/profile",
    PROFILE_COMPLETE: "/user/profile/complete",
    SETTINGS: "/user/settings",
    WALLET: "/user/wallet",
    // Freebie-code claim history + secret-code redemption
    CLAIMS: "/user/claims",
    // Promote & Earn — my shares + the platform-wide leaderboard
    PROMOTE: "/user/promote",
    // Self-report a public share of a Promote & Earn campaign for a
    // bonus-points review (forum winner-submissions)
    WINNER_SUBMISSIONS: "/user/winner-submissions",
  },

  // Brand Routes
  BRAND: {
    DASHBOARD: "/brand/dashboard",
    PROFILE: "/brand/profile",
    PROFILE_COMPLETE: "/brand/profile/complete",
    CAMPAIGNS: "/brand/campaigns",
    CAMPAIGNS_CREATE: "/brand/campaigns/create",
    CAMPAIGN_DETAILS: (id: string) => `/brand/campaigns/${id}`,
    CAMPAIGN_ANALYTICS: (id: string) => `/brand/campaigns/${id}/analytics`,
    SETTINGS: "/brand/settings",
    // Business directory listing management (profile + showcase products)
    MARKETPLACE_PROFILE: "/brand/marketplace/profile",
    PRODUCTS: "/brand/products",
    PRODUCTS_NEW: "/brand/products/new",
    PRODUCT_EDIT: (id: string) => `/brand/products/${id}/edit`,
    // Promote & Earn — post a free campaign, see all-time likes per campaign
    PROMOTE: "/brand/promote",
    // Business KYC verification — submit/status/resubmit
    KYC: "/brand/kyc",
    // B2B marketplace — projects this brand has posted, browsing other
    // brands' open projects to quote on, and posting a new one
    PROJECTS: "/brand/projects",
    PROJECTS_BROWSE: "/brand/projects/browse",
    PROJECTS_NEW: "/brand/projects/new",
    PROJECT_DETAILS: (id: string) => `/brand/projects/${id}`,
    // Private contact threads opened once a quotation is visible
    MESSAGES: "/brand/messages",
    // Wallet balance + top-up (funds the quotation-unlock purchase) +
    // unlock-pass status
    WALLET: "/brand/wallet",
  },

  // Admin Routes
  ADMIN: {
    CAMPAIGNS: "/admin/campaigns",
    // Promote & Earn — prize periods, leaderboard, fraud response
    PROMOTE: "/admin/promote",
    // Freebie-code prize inventory (PIN/cash stock) + drop schedule
    FREEBIES: "/admin/freebies",
    // Business KYC review queue — approve/reject a CAC verification submission
    KYC: "/admin/kyc",
    // Reactive moderation for reported business ratings
    BUSINESS_RATINGS: "/admin/business-ratings",
    // Forum flag queue + winner-share submission review, combined
    FORUM: "/admin/forum",
    // Weekly payout run — open, lock, pay items, complete
    PAYOUTS: "/admin/payouts",
  },
};
