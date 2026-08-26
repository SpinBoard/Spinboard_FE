# Screen Inventory — App vs. Freebiz Mockup

Produced per the Phase 0 instruction in `CLAUDE-UI.md` §6, from reading `CLAUDE-UI.md`,
`freebiz-design-spec.md`, `freebiz-brand-kit.html`, and `freebiz-mockup.html` against the actual
current app. No code was changed to produce this — it's an inventory only.

---

## Table 1 — Every app screen mapped to its mockup `data-screen`

| # | App route | File | Matching `data-screen` | Notes |
|---|---|---|---|---|
| 1 | `/watch` | `watch/page.tsx` | `v-watch` | Clean match — Billboard, ticker, apply box, live code. |
| 2 | `/user/claims` | `user/claims/page.tsx` | `v-freebies` | Clean match — everything caught, PIN reveal. |
| 3 | `/user/wallet` | `user/wallet/page.tsx` | `v-wallet` | Clean match. |
| 4 | `/user/profile` | `user/profile/page.tsx` | `v-profile` | Match, but see #5 — referrals are split into a separate app screen; mockup folds them into this one. |
| 5 | `/user/referrals` | `user/referrals/page.tsx` | *(none exact)* | ⚠️ Spec says "Profile & referrals" is **one** screen (`v-profile`). App has it as two. Flag for a decision: merge, or treat as an app-only extra. |
| 6 | `/user/dashboard` | `user/dashboard/page.tsx` | *(none)* | ⚠️ **No mockup screen at all.** Freebiz's viewer IA has no "dashboard/home" — just watch/promote/freebies/wallet/marketplace/profile. |
| 7 | `/user/profile/complete` | `user/profile/complete/page.tsx` | *(none)* | ⚠️ Onboarding step, not in the mockup's 17 screens. Closest conceptually is `v-profile`. |
| 8 | `/user/settings` | `user/settings/page.tsx` | *(none)* | ⚠️ **No mockup screen.** Not mentioned anywhere in the spec. |
| 9 | `/marketplace` | `marketplace/page.tsx` | `v-market` (name only) | ⚠️ **Concept mismatch**, not just a gap — current marketplace is a *business directory* (browse brands, contact them). Freebiz's `v-market` is "spend wallet — airtime, data, brand vouchers, no minimum," i.e. a redemption catalog. Same name, different product. |
| 10 | `/marketplace/[productId]` | `marketplace/[productId]/page.tsx` | `v-market` (name only) | Same mismatch as above. |
| 11 | `/marketplace/business/[brandId]` | `marketplace/business/[brandId]/page.tsx` | `v-market` (name only) | Same mismatch — this screen (a business profile page) has no equivalent concept in Freebiz at all. |
| 12 | `/brand/dashboard` | `brand/dashboard/page.tsx` | `b-dash` | Match — but see #13, spec has one dashboard screen, app has two. |
| 13 | `/brand/campaigns` | `brand/campaigns/page.tsx` | `b-dash` | Same screen concept as #12 (campaign table) — app splits summary vs. full list, mockup has one. |
| 14 | `/brand/campaigns/[campaignId]` | `brand/campaigns/[campaignId]/page.tsx` | *(none exact)* | ⚠️ Single-campaign detail view. Mockup only shows a table (`b-dash`) — no drill-down detail screen exists in the 17. Closest is `b-dash`. |
| 15 | `/brand/campaigns/create` | `brand/campaigns/create/page.tsx` | `b-new` | Clean match. |
| 16 | `/brand/campaigns/[campaignId]/analytics` | `.../analytics/page.tsx` | `b-analytics` | Match (spec calls the route `/brands/audience`, mockup screen id is `b-analytics` — same screen, two names). |
| 17 | `/brand/marketplace/profile` | `brand/marketplace/profile/page.tsx` | *(none)* | ⚠️ **No mockup screen.** Brand-side business-directory management doesn't exist in Freebiz's brand route list at all. |
| 18 | `/brand/products` | `brand/products/page.tsx` | *(none)* | ⚠️ **No mockup screen** — same reason as #17. |
| 19 | `/brand/products/new` | `brand/products/new/page.tsx` | *(none)* | ⚠️ **No mockup screen** — same reason. |
| 20 | `/brand/profile` | `brand/profile/page.tsx` | *(none)* | ⚠️ **No mockup screen.** Not in the 5-screen brand route list. |
| 21 | `/brand/profile/complete` | `brand/profile/complete/page.tsx` | *(none)* | ⚠️ Onboarding, not in the mockup. |
| 22 | `/brand/settings` | `brand/settings/page.tsx` | `b-billing`? | ⚠️ Weak match at best. `b-billing` is "Basic vs Premium, invoices" — current settings is password/notifications, not plan/billing. Likely **no real equivalent**; `b-billing` itself is unbuilt (see Table 2). |
| 23 | `/admin/campaigns` | `admin/campaigns/page.tsx` | `a-monitor` | Partial match — same intent (see what's live, take it down/reactivate), but mockup's `a-monitor` also has per-ad viewer-report counts, auto-flag reasons, a warn action, and strikes; the app screen is a simpler bulk deactivate/reactivate list. |
| 24 | `/` (home) | `app/page.tsx` | *(none)* | ⚠️ Marketing landing page — outside the mockup's app-screen set entirely. |
| 25 | `/about` | `about/page.tsx` | *(none)* | ⚠️ Marketing page — not covered. |
| 26 | `/login` | `login/page.tsx` | *(none)* | ⚠️ Auth screens aren't among the 17 `data-screen`s. |
| 27 | `/register` | `register/page.tsx` | *(none)* | ⚠️ Same. |
| 28 | `/forgot-password` | `forgot-password/page.tsx` | *(none)* | ⚠️ Same. |
| 29 | `/reset-password` | `reset-password/page.tsx` | *(none)* | ⚠️ Same. |
| 30 | `/verify-otp` | `verify-otp/page.tsx` | *(none)* | ⚠️ Same. |
| 31 | `/payment/verify` | `payment/verify/page.tsx` | *(none)* | ⚠️ Paystack return page — not covered. |

---

## Table 2 — Mockup screens the app doesn't have at all

| `data-screen` | Spec route | Why it's missing |
|---|---|---|
| `v-promote` | `/promote` | Phase 2 (promoter contests) — feature doesn't exist in the backend or app yet. |
| `b-contest` | `/brands/contests` | Phase 2 — same reason, brand side. |
| `a-contest` | `/admin/contests` | Phase 2 — same reason, admin side. |
| `b-billing` | `/brands/billing` | No plan/invoices screen exists; the app only has ad-hoc per-campaign Paystack checkout, no persistent billing screen. |
| `a-prizes` | `/admin/freebies` | No admin freebie-inventory/PIN-stock/drop-schedule UI — freebie config is entirely server-side today. |
| `a-payouts` | `/admin/payouts` | No payout-desk UI, despite `admin/payout-runs*` existing on the backend per the docs. |
| `a-permissions` | `/admin/roles` | No role-granting/brand-approval UI — the only admin screen that exists today is campaign moderation. |
| `a-fraud` | `/admin/abuse` | No abuse-signal/device-IP-cap UI. |

That's 8 of the 17 mockup screens with zero current implementation — nearly half.

---

## Table 3 — Files that hold the API calls (never touch without being asked)

Per `CLAUDE-UI.md`'s never-touch list, mapped to actual files in this repo.

| Category | Files |
|---|---|
| **API client / axios wrapper** | `src/lib/api.ts` (the axios instance + auth interceptors) |
| **Endpoint path constants** | `src/app/_utils/endpoints.ts` |
| **Auth, session, token handling** | `src/atom/user.ts` (session/token storage), `src/app/_utils/auth-session.ts` (post-login profile fetch), `src/components/auth/protected-route.tsx`, `src/components/auth/google-auth.tsx` |
| **Data-fetching hooks (wrap `api.*` calls)** | `src/hooks/use-billboard.ts`, `use-freebies.ts`, `use-admin-config.ts`, `use-brand-profile.ts`, `use-settings.ts` |
| **Query/realtime infra** | `src/lib/query-client.ts` (React Query config), `src/lib/socket.ts` (websocket, currently disabled but present) |
| **Error-shape helpers** | `src/app/_utils/helper.ts` (`apiErrorMessage`/`apiErrorCode`/`apiErrorDetails` — these decode the backend's error contract) |
| **Routing paths** | `src/app/_utils/routes.ts` (route constants) plus the actual Next.js file-tree paths under `src/app/(routes)/...` — per the rule, only what renders inside each route may change, not the path itself |
| **Page components that call `api.*` directly (no hook in between)** | ⚠️ Worth flagging specifically: `admin/campaigns/page.tsx`, `brand/campaigns/page.tsx`, `brand/campaigns/create/page.tsx`, `brand/campaigns/[campaignId]/page.tsx`, `brand/campaigns/[campaignId]/analytics/page.tsx`, `brand/dashboard/page.tsx`, `brand/marketplace/profile/page.tsx`, `brand/products/page.tsx`, `brand/products/new/page.tsx`, `brand/profile/page.tsx`, `brand/profile/complete/page.tsx`, `brand/settings/page.tsx`, `user/dashboard/page.tsx`, `user/profile/complete/page.tsx`, `user/settings/page.tsx`, `login/page.tsx`, `register/page.tsx`, `verify-otp/page.tsx`, `marketplace/page.tsx`, `marketplace/[productId]/page.tsx`, `marketplace/business/[brandId]/page.tsx`, `payment/verify/page.tsx`, `components/brand/go-live-dialog.tsx`. These mix markup and the `useQuery`/`useMutation` calls in the same file — a rebuild of any of these has to carefully lift the JSX out without touching the `queryFn`/`mutationFn` bodies or the `useQuery`/`useMutation` call shape itself. |

---

## One more discrepancy worth flagging

This repo's `CLAUDE.md` (project overview) describes a Supabase-backed "BrandPuzzle" puzzle-game
product — that's stale and doesn't match the actual backend (`docs/*.md` describe a Node/Mongo
billboard+freebie-codes API, and `src/lib/supabase.ts` doesn't even exist in the tree). Don't use
`CLAUDE.md`'s architecture section as a source of truth for this redesign.
