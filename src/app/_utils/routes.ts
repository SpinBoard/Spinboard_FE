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

  // The billboard — continuous ad playback + freebie-code strip, no gate.
  // Works logged-out.
  WATCH: "/watch",

  // Marketplace — business directory, not a store
  MARKETPLACE: "/marketplace",
  MARKETPLACE_BUSINESS: (brandId: string) => `/marketplace/business/${brandId}`,
  MARKETPLACE_PRODUCT: (id: string) => `/marketplace/${id}`,

  // User Routes
  USER: {
    DASHBOARD: "/user/dashboard",
    PROFILE: "/user/profile",
    PROFILE_COMPLETE: "/user/profile/complete",
    SETTINGS: "/user/settings",
    REFERRALS: "/user/referrals",
    WALLET: "/user/wallet",
    // Freebie-code claim history + secret-code redemption
    CLAIMS: "/user/claims",
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
  },
};
