import { routes } from "@/app/_utils/routes";
import {
  BoardIcon,
  FreebiesIcon,
  WalletIcon,
  ProfileIcon,
  DashboardIcon,
  PlusIcon,
  MonitorIcon,
  CampaignsListIcon,
  SettingsIcon,
  BrandsIcon,
  PromoteIcon,
  TrophyIcon,
  KycIcon,
  ProjectsIcon,
  MessagesIcon,
  RatingsIcon,
  ForumIcon,
  PayoutsIcon,
  SponsoredAdsIcon,
} from "./nav-icons";

export type AppRoute = "viewer" | "brands" | "admin";

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  // Shown in both the desktop sidebar and the mobile bottom tab bar.
  // false = desktop sidebar only (matches how Settings/Profile are reachable
  // today — a secondary destination, not a primary tab).
  primary?: boolean;
}

// Only real, currently-built, non-parked routes. Per design/DECISIONS.md:
// - Promote & Earn shipped on the backend as a cumulative platform-wide
//   leaderboard (docs/FRONTEND_IMPLEMENTATION_GUIDE.md §2 Revamp 5) — a
//   materially different mechanic than the mockup's per-campaign
//   "Promotion contests"/"Contests" screens, so it's nav'd in here under
//   plain "Promote & earn" copy, not "contests". Roles & permissions and
//   Abuse signals remain unbuilt (lower-priority "Next" tier, not the
//   truly-parked Phase 2 contest screens). Freebie inventory (a-prizes)
//   and Payout desk (a-payouts) are now both built — see
//   admin/freebies/page.tsx and admin/payouts/page.tsx.
// - Brand "Audience" has no standalone route today — analytics is
//   per-campaign only (ruling #16); no nav entry for it here.
// - The business-directory Marketplace was PARKED and out of the nav, but
//   §Marketplace's business decision promotes it back: renamed "Brands"
//   (never "Marketplace" — that word now belongs to the not-yet-built
//   redemption catalog, v-market) and given its own nav entry. Viewers get
//   "Brands" pointing at the browse/directory page; brands get "Directory
//   listing" pointing at managing their own profile — deliberately not
//   labelled "Brands" too, since a brand clicking a nav item called
//   "Brands" to land on editing their own listing would read as circular.
// - Referrals removed entirely 2026-08-29 — the feature was cut on both
//   frontend and backend, not parked. No nav entry, no route.
// - Business KYC verification + the B2B Projects/Quotations marketplace
//   (2026-09-02) are brand-only and entirely new — no mockup screens exist
//   for them. "Projects" lands on the brand's own posted projects
//   (mirrors "Campaigns"); browsing other brands' open projects to quote
//   on, and posting a new one, are reached from within that page rather
//   than getting their own top-level nav entries. "Messages" is the
//   private contact-thread inbox opened once a quotation is visible.
//   "Wallet" is new for brands too — it now needs a funded balance to
//   purchase a quotation-unlock pass. None of these are `primary` (not in
//   the mobile tab bar) since they're secondary to the core
//   campaigns/promote flow, same tier as Directory listing/Profile/Settings.
export const NAV_ITEMS: Record<AppRoute, NavItem[]> = {
  viewer: [
    { label: "Billboard", href: routes.WATCH, icon: BoardIcon, primary: true },
    { label: "My freebies", href: routes.USER.CLAIMS, icon: FreebiesIcon, primary: true },
    { label: "Wallet", href: routes.USER.WALLET, icon: WalletIcon, primary: true },
    { label: "Profile", href: routes.USER.PROFILE, icon: ProfileIcon, primary: true },
    { label: "Brands", href: routes.MARKETPLACE, icon: BrandsIcon },
    { label: "Promote & earn", href: routes.USER.PROMOTE, icon: PromoteIcon },
    { label: "Forum", href: routes.FORUM, icon: ForumIcon },
    { label: "Settings", href: routes.USER.SETTINGS, icon: SettingsIcon },
  ],
  brands: [
    { label: "Dashboard", href: routes.BRAND.DASHBOARD, icon: DashboardIcon, primary: true },
    { label: "Campaigns", href: routes.BRAND.CAMPAIGNS, icon: CampaignsListIcon, primary: true },
    { label: "New campaign", href: routes.BRAND.CAMPAIGNS_CREATE, icon: PlusIcon, primary: true },
    { label: "Promote & earn", href: routes.BRAND.PROMOTE, icon: PromoteIcon },
    { label: "Projects", href: routes.BRAND.PROJECTS, icon: ProjectsIcon },
    { label: "Messages", href: routes.BRAND.MESSAGES, icon: MessagesIcon },
    { label: "KYC verification", href: routes.BRAND.KYC, icon: KycIcon },
    { label: "Wallet", href: routes.BRAND.WALLET, icon: WalletIcon },
    { label: "Directory listing", href: routes.BRAND.MARKETPLACE_PROFILE, icon: BrandsIcon },
    { label: "Profile", href: routes.BRAND.PROFILE, icon: ProfileIcon },
    { label: "Settings", href: routes.BRAND.SETTINGS, icon: SettingsIcon },
  ],
  admin: [
    { label: "Live monitor", href: routes.ADMIN.CAMPAIGNS, icon: MonitorIcon, primary: true },
    { label: "Freebie inventory", href: routes.ADMIN.FREEBIES, icon: FreebiesIcon, primary: true },
    { label: "Promote & earn", href: routes.ADMIN.PROMOTE, icon: TrophyIcon, primary: true },
    { label: "KYC review", href: routes.ADMIN.KYC, icon: KycIcon, primary: true },
    { label: "Forum moderation", href: routes.ADMIN.FORUM, icon: ForumIcon, primary: true },
    // DECISIONS.md ranks a-payouts one of the two highest-priority
    // unbuilt screens (the backend admin/payout-runs* has been ready for
    // a while) — primary here, not tucked in with the lower-priority
    // moderation queues below.
    { label: "Payout desk", href: routes.ADMIN.PAYOUTS, icon: PayoutsIcon, primary: true },
    { label: "Ratings moderation", href: routes.ADMIN.BUSINESS_RATINGS, icon: RatingsIcon },
    { label: "Sponsored ads", href: routes.ADMIN.SPONSORED_ADS, icon: SponsoredAdsIcon },
  ],
};

export const SIDE_LABEL: Record<AppRoute, string> = {
  viewer: "Viewer",
  brands: "Brand",
  admin: "Admin",
};
