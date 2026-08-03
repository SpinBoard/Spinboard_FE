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

  // Ads-watching flow — works logged-out (§3), the new core loop
  WATCH: "/watch",

  // Marketplace (public browse/detail, checkout requires email at minimum)
  MARKETPLACE: "/marketplace",
  MARKETPLACE_PRODUCT: (id: string) => `/marketplace/${id}`,

  // User Routes
  USER: {
    DASHBOARD: "/user/dashboard",
    PROFILE: "/user/profile",
    PROFILE_COMPLETE: "/user/profile/complete",
    SETTINGS: "/user/settings",
    REFERRALS: "/user/referrals",
    WALLET: "/user/wallet",
    // Try-again counter, decision history, and the 50/100 special boards
    TRY_AGAIN: "/user/try-again",
    MARKETPLACE_ORDERS: "/user/orders",
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
    PRODUCTS: "/brand/products",
    PRODUCTS_NEW: "/brand/products/new",
    PRODUCT_EDIT: (id: string) => `/brand/products/${id}/edit`,
  },
};
