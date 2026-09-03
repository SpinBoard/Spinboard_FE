# Changelog for Frontend

What actually changed in the API surface, for anyone who worked against the old SpinBoard product ("watch 5 ads, answer 3 quiz questions per ad, spin a wheel") **or** against an earlier build of Pazzell that still had a marketplace checkout flow. If you're building fresh against this API with no history, you can skip this file — `API_GUIDE.md` and `BUSINESS_RULES.md` describe the current system standalone.

## AD slots can now carry a clickable website link, with click-through analytics (2026-09-02, most recent change)

`GET /billboard/queue`'s `"AD"` slots gain `clickUrl: string | null` (`campaignUrl` if the brand set one, else `brandUrl`, else `null`) — the existing, previously-unused-and-undocumented `brandUrl`/`campaignUrl` fields on `POST /ad-campaigns` are now wired up rather than being new fields. Render it as a clickable link and navigate on tap **immediately** using the URL you already have — don't wait on a server call. Separately, fire the new `POST /billboard/impressions/click { sessionId, slotId }` (fire-and-forget, idempotent, same pattern as the existing heartbeat/complete calls) for click-through tracking.

Two smaller things bundled with this: (1) `brandUrl`/`campaignUrl` are now validated as well-formed `http(s)` URLs at campaign creation (`400` otherwise) — they were previously accepted unvalidated; (2) `GET /ad-campaigns/:id/analytics` (and its CSV export) gained `clicks`/`clickThroughRate` fields, both real and populated from the new tracking.

See `BUSINESS_RULES.md`'s "AD slots can carry a clickable website link" section and `UI_CONTRACT.md`'s "Click-through link on AD slots" section for the full contract.

## Promote & Earn periods now auto-manage weekly; a legacy admin endpoint removed; some never-documented legacy Config keys deleted (2026-09-02)

Three small, unrelated cleanups landed together.

**Promote & Earn grand-prize periods are now opened and settled automatically, weekly, by default** — previously purely manual admin action. A daily job opens a Mon 00:00 → next Mon 00:00 (platform timezone) period if none exists yet for that week (default prize: "Weekly Promote & Earn cash prize", ₦10,000 — both `Config`-driven), and settles any `OPEN` period whose `periodEnd` has passed, crediting the winner exactly as a manual settle would. **Nothing about `GET /promote/leaderboard`'s shape changed**, and the existing `POST /admin/promote/periods`/`.../settle`/`.../cancel` endpoints still work unchanged for manual override (e.g. a one-off prize for a specific week). One new thing to handle: auto-opened/auto-settled periods now carry `createdBy`/`settledBy: "system"` instead of a real admin id — render that as "Automatic," not a broken user reference. See `BUSINESS_RULES.md`'s Promote & Earn section and `DATA_MODELS.md`'s `PromoPrizePeriod` shape.

**`POST /admin/clear-all-data` removed entirely.** This was a legacy points/leaderboard reset tool that had just been documented in the previous doc pass after the frontend team flagged it as an undocumented-but-real endpoint — it's now gone from the codebase outright (route, controller, and the `Leaderboard` collection it used are all deleted). If you added anything referencing it since the last doc pass, remove it — this endpoint no longer exists, full stop.

**7 dead legacy Config keys removed** (`pricing.basic/premium.weeklyPrice`, `payout.playerSharePercent`/`platformSharePercent`/`rankDistribution`, `raffle.eligibilityFloorCap`, `points.sessionCompletionPoints`) — these were undocumented, unused-by-any-live-code leftovers from the old puzzle-game system. If you weren't reading them (you shouldn't have been — they were never in this docs bundle), this changes nothing for you. `forum.winnerShareBonusPoints` is unrelated and unaffected — still live, still used by the winner-share bonus flow.

## New: Business KYC verification + B2B Projects/Quotations marketplace (2026-09-02)

Two new brand-only feature areas, entirely additive — nothing existing changed shape. Full detail in `API_GUIDE.md`, `BUSINESS_RULES.md`, `DATA_MODELS.md`, `UI_CONTRACT.md`; this is the summary.

**Business KYC** (`/kyc/*`, `/admin/kyc/*`): a business submits a CAC registration number for verification (`POST /kyc/submit`). An automated pre-check runs, but **a human admin always makes the final call** (`POST /admin/kyc/:id/approve`/`reject`) — a submission never auto-verifies. `Brand.kycStatus` is the field to read for gating UI. Required before a business can post a Project or submit a Quotation below.

**B2B marketplace** (`/projects*`, `/quotations*`, `/quotation-unlock*`, `/business-contact/*`, `/business-ratings*`): a KYC-verified business posts a `Project`; other KYC-verified businesses respond with `Quotation`s. The poster sees **1 free quotation**; seeing the rest requires purchasing an account-wide, 30-day unlock pass (`POST /quotation-unlock/purchase`, flat ₦5,000, default `Config` values) — paid via a **wallet debit**, which means businesses can now fund a wallet balance for the first time (`POST /wallet/topup/initialize`/`GET /wallet/topup/verify/:reference`, same Paystack-checkout pattern as ad-campaign payment). Once a quotation is visible, either side can open a private contact thread (`/business-contact/threads`) and, afterward, rate the other (`POST /business-ratings`) — no separate "mark completed" step in v1, contact having happened is the whole trust bar. Admin can moderate ratings reported as false (`/admin/business-ratings/*`), same reactive report → auto-flag → admin-decides posture as ad-campaign moderation.

**New error codes to handle**: `KYC_REQUIRED` (403), `KYC_ALREADY_PENDING` (409), `KYC_RESUBMIT_NOT_ALLOWED` (400), `KYC_NOT_VERIFIED` (404, admin-only), `INSUFFICIENT_BALANCE` (402), `QUOTATION_NOT_VISIBLE` (403), `CONTACT_REQUIRED` (403) — see `UI_CONTRACT.md`'s "Business KYC + B2B Projects & Quotations" section for exactly where each fires and how to handle it.

**Not new**: "Basic"/"Premium" still means per-ad-campaign tier only (`Config: campaign.tiers`) — there is no business-level subscription plan, the unlock pass above is a one-off purchase, not a plan.

## Breaking: the `gamer` role is now `viewer`

The end-user role (previously `"gamer"`) is renamed to `"viewer"` everywhere — this is a breaking change with **no backward-compatible alias**. There is no fallback route or accepted-old-value behavior; the frontend must update to match before deploying against this API version.

- `User.role` value: `"gamer"` → `"viewer"` (the enum is now `"viewer" | "brand" | "admin"`).
- Route paths renamed:
  - `GET /profile/gamer` → `GET /profile/viewer`
  - `PUT /profile/gamer` → `PUT /profile/viewer`
  - `POST /auth/gamer/register` → `POST /auth/viewer/register`
  - `GET /gamers` → `GET /viewers` (response key `gamers` → `viewers`)
- Every place these docs previously said "gamer" (a gamer account, the gamer profile screen, gamer-only endpoint, etc.) now says "viewer" — read "viewer" wherever you see it from here on; this file and the rest of the bundle have been updated throughout, not just in this section.
- Nothing else about these endpoints' request/response shapes changed — only the role value and the path segments that spelled out "gamer".

## New endpoints: ad moderation, brand self-serve pause/resume, board stats, and more

A large batch of new endpoints and field additions, none of which touch the marketplace (still unchanged — see below) or Promote & Earn's cumulative-leaderboard mechanic (also unchanged, still described in the section below this one).

**Board stats & streak (v-watch screen):**
- `GET /billboard/stats` — public, no auth. `{ stats: { watchingNow, codesToday, adsInRotation } }`.
- `GET /billboard/my-streak` — auth required (hard 401, unlike the rest of the optional-auth billboard router). `{ streakDays: number }` — consecutive calendar days (platform timezone) with at least one completed, non-house-filler, non-freebie-slot billboard view. Doesn't zero out just because today has no view yet — it only breaks on an actual gap day, so a viewer checking first thing in the morning still sees yesterday's run.
- `GET /freebies/recent-catches` — public, no auth. `{ catches: [{ displayName, type, valueLabel, takenAt }] }`, a small "who just won" feed, size set by `Config: freebie.recentCatchesFeedSize` (default 8).

**Claims history (v-freebies screen):** `GET /me/claims` items gained `publicCode?: string` — the code as it appeared on the board when won. Every other field on the claim item is unchanged.

**Today's claim limits (v-wallet screen):** `GET /freebies/limits/mine` — auth required. `{ limits: [{ type, cap, claimedToday, remaining, resetsAt? }] }`, one entry per type, so the UI can show usage proactively instead of only learning it via a `403 DAILY_LIMIT_REACHED`.

**Viewer phone (v-profile screen):** `User.phone?: string` — display/contact only, never used for auth. Set via `phone` on `PUT /profile/viewer`, returned in `GET /profile/viewer`. Note: "bank for payouts" is **not** a new profile field — that's always lived at `GET/POST/DELETE /wallet/bank-accounts*` (unchanged); don't expect bank details on the profile endpoint.

**Brand campaign dashboard (b-dash screen):** `GET /ad-campaigns/mine` items gained `playsToday: number` and `completionRateToday: number | null` (null when `playsToday` is 0), read from the same daily rollup the Premium analytics dashboard uses, but exposed here to every tier as a lightweight glance — not the deep Premium-gated analytics. The rollup runs on a schedule, so "today" can lag slightly behind real-time.

Also explicitly **not built** — remove any leftover UI/calls for these, they're mockup artifacts that contradict the already-shipped product model: "Spend today" (flat one-time pricing has no daily-spend concept), "In review" status and a "Send for review" action (no pre-publish moderation queue exists — campaigns go live immediately on payment), campaign scheduling fields on the new-campaign form (no scheduling exists), and a VAT estimate on the new-campaign form (no tax Config exists).

**Campaign analytics (b-analytics screen):** `GET /ad-campaigns/:campaignId/analytics`'s `analytics` object gained `costPerCompletedView: number | null` (`priceLocal / completedViews`). Also: `analytics.uniqueViewers` was already present before this batch — it was never actually missing, just apparently unread by the frontend; no new work needed there beyond reading the existing field.

**Brand self-serve pause/resume + tightened takedown (campaign detail screen):**
- `POST /ad-campaigns/:campaignId/pause` — brand only, own campaign, no body. `ACTIVE` → `PAUSED`. No penalty, no strike; `moderationStatus` stays `APPROVED` so this reads as distinct from an admin takedown. `400` if not currently `ACTIVE`.
- `POST /ad-campaigns/:campaignId/resume` — brand only, own campaign, no body. `PAUSED` → `ACTIVE`, but **only** if `moderationStatus` is still `APPROVED` (i.e. the brand paused it themselves) — a campaign an admin took down (`moderationStatus: "REJECTED"`) returns `403 ADMIN_TAKEDOWN` here; only the admin `POST /ad-campaigns/reactivate` can undo that. Also `400` if `expiresAt` has passed, and `403 BRAND_SUSPENDED` if the brand is suspended (see below).
- **Confirmed product decision: there is no refund of any kind on any takedown or pause, ever.** Don't build refund-related UI or copy anywhere for this.
- `POST /ad-campaigns/deactivate`'s `reason` field is now **required** (`400` if missing/empty) — it was previously optional. Every takedown now logs a strike against the brand and needs a reason recorded.

**Full ad-moderation subsystem — reports, auto-flag, warn, strikes, suspension (a-monitor screen):** this is a new subsystem; the admin live-monitor screen's report counts, flag badges, and Warn/Suspend actions are real now, not disabled placeholders.
- `POST /ad-campaigns/:campaignId/report` — auth required, any role. `{ reason }` → `{ reported: boolean, flagged: boolean }`. One report per user per campaign — a second attempt from the same user is a silent no-op (`reported: false`), not an error.
- `AdCampaign` gained `flagged: boolean`, `flaggedAt?: string`, `flagReasons: string[]` — auto-set once report count reaches `Config: adModeration.autoFlagReportThreshold` (default 3) within `Config: adModeration.autoFlagWindowMinutes` (default 60). Flagging is a signal only — a flagged campaign keeps airing until an admin acts.
- `GET /ad-campaigns` (admin) items gained `reportCount`, `reportCountLastHour`, `flagged`/`flaggedAt`/`flagReasons`, `brandStrikeCount`, `brandSuspended` — everything the monitor screen needs in one list call.
- `POST /ad-campaigns/:campaignId/warn` — admin only. `{ note }` → `{ campaign, strikeCount, autoSuspended }`. Adds a strike but the campaign **stays live** (lighter than a takedown); clears the campaign's `flagged` state.
- `POST /ad-campaigns/deactivate` now also adds one strike per campaign actually taken down.
- `POST /admin/brands/:brandId/suspend` — admin only, `{ reason }` → `{ pausedCampaigns }`. Suspends the brand and immediately pauses every `ACTIVE` campaign they have running.
- `POST /admin/brands/:brandId/unsuspend` — admin only, no body. Lifts the suspension — does **not** reset the strike counter and does **not** reactivate campaigns paused by the suspension (those need individual `POST /ad-campaigns/reactivate` calls).
- Auto-suspend: once a brand's strike count reaches `Config: adModeration.suspendStrikeThreshold` (default 3, from either warn or takedown actions), the brand is suspended automatically, same effect as a manual suspend.
- Effects of suspension to build UI around: `403 BRAND_SUSPENDED` on `POST /ad-campaigns` (create), `POST /ad-payments/initialize` (go live), `POST /ad-campaigns/:campaignId/resume`, and `POST /promote/campaigns` (Promote & Earn creation).
- `GET /profile/brand`'s `brandDetails` gained `registrationNumber`, `strikeCount`, `suspended`, `suspendedReason?` — a brand can see their own standing in one call.
- Not built yet: no email/notification is sent on warn or suspend — nothing is emailed to the brand automatically, the standing is only visible via the profile/admin views.

**Brand registration number (brand profile screen):** `Brand.registrationNumber?: string` (e.g. a CAC "RC" number) — informational/display only, never validated. Set via `registrationNumber` on `PUT /profile/brand`, returned in `GET /profile/brand`'s `brandDetails.registrationNumber`.

**Promote & Earn also respects suspension:** `POST /promote/campaigns` now also returns `403 BRAND_SUSPENDED` for a suspended brand.

**New standard error codes to handle:** `BRAND_SUSPENDED` (403), `ADMIN_TAKEDOWN` (403) — alongside the existing list in `API_GUIDE.md`/`FRONTEND_IMPLEMENTATION_GUIDE.md` §8.

**New Config keys** — see `CONFIG.md`: `adModeration.autoFlagReportThreshold` (3), `adModeration.autoFlagWindowMinutes` (60), `adModeration.suspendStrikeThreshold` (3), `freebie.recentCatchesFeedSize` (8).

**The marketplace is unaffected by this batch** — still a free business directory, no checkout, exactly as documented in the "Marketplace revamp" section below. No wallet-spend/redemption-catalog endpoint exists or is planned.

## New feature: Promote & Earn

A brand posts a campaign (image or ≤60s video, free to post). Viewers get a personal share link per campaign and post it on their own social platforms; anyone who follows the link back and likes/votes there (signed in) adds to that promoter's count — **but only once per (promoter, campaign) pair**: a liker can vote for as many *different* promoters as they want, and separately once on each distinct campaign a given promoter shares (both count toward that promoter's total), just never twice on the exact same promoter+campaign combination. **Likes are cumulative across every campaign a promoter has shared, not scored per campaign** — this is the core mechanic. An admin periodically (weekly is the expected cadence, but it's a manual admin action, not automatic) opens a "prize period" with a description and optional cash amount, and settles it at the end: whoever has the single highest cumulative like total across that window wins the grand prize, credited straight to their wallet if the prize carries a cash amount.

**If you're building from the original `freebiz-mockup.html` design files**: the mockup's `v-promote`/`b-contest`/`a-contest` screens depict a different mechanic — a brand-funded prize *pot* held per individual campaign/contest, with its own independent winner and leaderboard. **That's not what was built.** There is exactly one grand prize per admin-opened period, decided by summing a promoter's likes across every campaign they've shared, not per campaign. Use the mockup screens for visual/layout reference (card shapes, the share box, the like button) only — build the data flow against `FRONTEND_IMPLEMENTATION_GUIDE.md` §2 Revamp 5 instead.

New endpoints — see `FRONTEND_IMPLEMENTATION_GUIDE.md` §5 for the full list and §7 for the screen-by-screen build notes:
```
POST /promote/campaigns                     brand — post a campaign
GET  /promote/campaigns/mine                brand — own campaigns
GET  /promote/campaigns/:campaignId          public — campaign detail
GET  /promote/campaigns                      admin — list/filter
POST /promote/campaigns/deactivate           admin — bulk pause
POST /promote/campaigns/reactivate           admin — bulk resume
POST /promote/campaigns/:campaignId/links    viewer — mint/fetch a share link
GET  /promote/links/mine                     viewer — own links + per-link like counts
POST /promote/like/:slug                     viewer — like via a share link
GET  /promote/leaderboard                    public — cumulative, platform-wide ranking
POST /admin/promote/likes/:likeId/void
POST /admin/promote/promoters/:userId/disqualify | /requalify
GET  /admin/promote/promoters/disqualified
POST /admin/promote/periods                  admin — open a grand-prize window
GET  /admin/promote/periods
POST /admin/promote/periods/:periodId/settle
POST /admin/promote/periods/:periodId/cancel
```

**No marketplace change accompanies this.** The marketplace stays exactly what it already was — a free business directory, no checkout (see the "Marketplace revamp" section below). The design spec's `/marketplace` route described spending wallet winnings on airtime/data/vouchers; that was never built and is still not being built. Don't add a wallet-spend shop while implementing this feature.

## Freebie codes now take over the billboard, not just the strip

A live freebie code used to be visible in exactly one place: pinned in the perimeter strip. It now **also** takes over one billboard slot, full-screen, for a fixed stretch of time (`Config: freebie.billboardSlotSeconds`, default 60s) — exactly like a real ad — so the freebie moment interrupts the ad reel instead of only ever being a small pin at the edge of the screen.

- `GET /billboard/queue` slots can now have `type: "FREEBIE"` alongside the existing `"AD"`/`"HOUSE"`, with its own shape (`codeId`, `publicCode`, `valueLabel`, `freebieType`, `liveUntil`, `durationSec` — no `videoUrl`, there's no video file for it). See `UI_CONTRACT.md`'s "Freebie takeover slots" section and `DATA_MODELS.md`'s updated Queue slot shape.
- Play it through the exact same slot loop as `AD`/`HOUSE` — same `heartbeat`/`complete` calls, same `slotId` mechanics — just render a code-announcement graphic instead of a video for its `durationSec`.
- A given code takes over the billboard **at most once per session**, even though it stays pinned in the strip for its whole live window. Don't expect one on every queue fetch — most fetches return none.
- This is additive: the strip flow (`GET /freebies/strip`, `UI_CONTRACT.md`'s "Strip feed flow") is completely unchanged. A code is simultaneously pinned in the strip and (once, per session) a billboard takeover — same code, same claim mechanics, two places it can be seen.

## Ad campaign moderation went reactive

Campaign moderation used to be a pre-payment gate: `POST /ad-campaigns/:campaignId/moderate` (`{decision: "APPROVED"|"REJECTED", reason?}`) let an admin approve or reject a video before it could ever go live, independent of payment. **That endpoint is gone.** Moderation is now reactive instead:

- A campaign auto-flips to `moderationStatus: "APPROVED"` the instant payment succeeds — the same moment `status` becomes `"ACTIVE"`. There is no waiting period and no "pending review" state between paying and going live. Remove any brand-dashboard UI that showed a pending-review waiting state after checkout.
- **New**: `POST /ad-campaigns/deactivate` — admin only, bulk (`{campaignIds: string[], reason?}`). Pulls any of the given campaigns that are currently `ACTIVE` out of rotation (`status → "PAUSED"`, `moderationStatus → "REJECTED"`). This is how an admin now handles an inappropriate video that's already live — after the fact, not before.
- **New**: `POST /ad-campaigns/reactivate` — admin only, bulk (`{campaignIds: string[]}`). Undoes a deactivation (`status → "ACTIVE"`, `moderationStatus → "APPROVED"`) for any given campaign currently `PAUSED`, unless its original `expiresAt` has already passed (returned separately as `skippedExpired` — an expired-while-paused campaign needs the brand to re-pay, not just get switched back on).
- `moderationStatus`/`moderationReason`/`moderatedBy`/`moderatedAt` fields on `AdCampaign` are unchanged in shape — only who sets them and when changed.

## Marketplace revamp: store → business directory

The marketplace used to be a small digital-goods store (list a product, pay via Paystack, get a discount code applied at checkout). It is now a **business directory/catalogue** — brands publish a contact profile, users browse and reach out directly. This is a separate, later change from the SpinBoard→Billboard revamp described in the rest of this file.

- **Removed entirely**: `POST /marketplace/checkout`, `GET /marketplace/orders/*`, the `Order` model, the `DiscountCode` model/service, and every discount-code-related field (`MarketplaceProduct.priceUSD/priceLocal/currency/deliveryAsset/fulfillmentInstructions`). Don't build a cart, checkout form, discount-code input, or order-history screen for the marketplace — none of it has a backend anymore.
- **New**: a business profile per brand (`PUT /marketplace/business/profile`, `GET .../mine`) with `businessName`, `businessDescription`, `logoUrl`/`coverImageUrl`, `contactEmail`/`contactPhone`/`whatsappNumber`, `address`, `socialLinks`, and an explicit `isListed` publish toggle; a public directory (`GET /marketplace/businesses`, filterable by category/country/state/city/search); and a business detail page (`GET /marketplace/businesses/:brandId`) showing the profile plus its active products.
- **Changed shape**: `MarketplaceProduct` still exists (create/update/delete under `/marketplace/products*`) but dropped every price/checkout field in favor of `images: string[]` and an optional free-text `priceLabel` (e.g. `"From ₦5,000"`, never a charged amount). `GET /marketplace/products/:productId` now also returns the owning business's contact info under `business`.

See `BUSINESS_RULES.md`'s "The marketplace is a directory, not a store" section and `DATA_MODELS.md`'s Marketplace section for full current-state detail.

## Removed entirely — do not build UI for any of this

- **Spin wheel.** No spin endpoint, no spin result, no prize-wheel UI of any kind.
- **Quiz-after-each-ad.** `AdCampaign.questions[]` is gone from the schema. Watching an ad no longer gates on answering questions.
- **The 5-ad-cycle gate.** There was never a fixed "watch 5, then you're allowed to X" structure to begin with anymore — the billboard just plays continuously.
- **"Try again" credit economy.** `User.tryAgainCount`, `/spins/try-again/spend` — gone.
- **Geographic/demographic ad targeting.** `AdCampaign.geoTarget` is gone. Every viewer everywhere sees the same eligible pool. If you're porting old code that filtered ads by viewer country, delete that logic — it has no server-side equivalent anymore, on purpose.
- **Automated wallet withdrawal.** `POST /wallet/withdrawals` and the transfer webhook route no longer exist in the mounted API. There is no self-serve cash-out. See `BUSINESS_RULES.md`.
- **Discount codes, full stop.** Not just their expiry — the `DiscountCode` model no longer exists at all, removed along with marketplace checkout. See the marketplace-revamp section above.
- **Referral program, entirely.** `/referrals/*` (summary, events, my-stats), referral capture at signup (`referrerId`/`referrerUsername`/`referralCode` in registration bodies), the referral stats block on the viewer profile response, and the `referralBonusAlerts` notification toggle are all gone. This is a later, separate removal from the rest of this changelog — don't build or port any referral UI.
- **Puzzle-game system** (separate from the above — this was already dead/unreachable before this revamp, just formally deleted now): campaigns, sessions, raffles, meetings, tickets, packages. If your old frontend build still calls any puzzle-game route, those 404 now.

## New — build these

- **Billboard**: `POST /billboard/session`, `GET /billboard/queue`, `POST /billboard/impressions/heartbeat`, `POST /billboard/impressions/complete`. See `UI_CONTRACT.md`.
- **Freebie codes**: `GET /freebies/strip` (+ SSE variant), `GET /freebies/phrases`, `POST /freebies/apply` (single endpoint for both claiming and redeeming), `GET /me/claims`, `POST /me/claims/:claimId/redeem`. See `UI_CONTRACT.md` and `BUSINESS_RULES.md`.
- **Weekly payout run status** surfaced on `GET /wallet/balance` (`payoutThreshold`, `amountToThreshold`, `nextPayoutDate`) — new fields on an existing endpoint, not a new endpoint.
- **Campaign moderation status** (`moderationStatus`) on `AdCampaign` — see the dedicated section at the top of this file for the current (reactive) moderation flow. Paying *does* put a campaign live immediately; don't build a "pending review" waiting state.
- **Campaign lifecycle states expanded**: `status` went from `draft|active|inactive` to `DRAFT|PENDING_PAYMENT|ACTIVE|PAUSED|EXPIRED|REJECTED`. If old frontend code switches on the three old lowercase values, it needs updating — `PAUSED`/`REJECTED`/`PENDING_PAYMENT` are states a brand dashboard can now actually encounter.
- **Flat campaign pricing**: no more brand-selectable 1–12 week duration / per-week price. It's a flat 30-day activation at `$20` Basic / `$30` Premium (`Config: campaign.tiers`). If old UI had a duration picker on campaign creation, remove it — there's nothing to select anymore.
- **Promote & Earn**: `POST /promote/campaigns`, `GET /promote/campaigns/mine`, `POST /promote/campaigns/:campaignId/links`, `GET /promote/links/mine`, `POST /promote/like/:slug`, `GET /promote/leaderboard`, plus the admin campaign/fraud/period-management routes. See the dedicated section at the top of this file and `FRONTEND_IMPLEMENTATION_GUIDE.md` §2 Revamp 5.

## Changed shape, same endpoint

- `GET /billboard/queue`: slot `type` gained a third value, `"FREEBIE"`, alongside `"AD"`/`"HOUSE"` — see the dedicated section at the top of this file. Existing `AD`/`HOUSE` slot shapes are unchanged.
- `GET /wallet/balance`: added `payoutThreshold`, `amountToThreshold`, `nextPayoutDate`. Existing `balance`/`currency` fields unchanged.
- `WalletTransaction.reason` gained new values (`FREEBIE_CASH`, `PAYOUT_SETTLED`, `ADJUSTMENT`, `REVERSAL`, `PROMOTE_GRAND_PRIZE`) alongside the old lowercase ones, which can still appear on historical rows. (A `REFERRAL_REWARD` reason existed briefly too, but the referral feature has since been removed entirely — see "Removed entirely" above.)
- `AdCampaign`: `questions`/`geoTarget` removed; `moderationStatus`/`moderationReason`/`moderatedBy`/`moderatedAt` added; `status` enum expanded (above); `numberOfWeeks` is now legacy-only (unset on any campaign created after this revamp).
- `GET /analytics/app`: `totalGamesPlayed`/`gamesPlayedToday`-style counters are now Billboard-sourced (`totalAdsWatched`, `adsWatchedToday` — verified completed impressions, house fillers excluded), not puzzle-session-sourced. The field names in the response also changed to match — check the actual response shape in `API_GUIDE.md` rather than assuming the old field names still apply.

## Unchanged — build against these exactly as before

Auth (`/auth/*`, `/registration`, `/login`, `/refresh`), user profile (`/me`, `/profile/*`, `/settings`), forum (`/forum/*`), bank accounts (`/wallet/bank-accounts*`), brand/ad-campaign creation and payment flow shape (`/ad-campaigns`, `/ad-payments/*` — only the pricing/duration inputs and post-creation lifecycle changed, described above). The marketplace is **not** unchanged — see the "Marketplace revamp" section above. Referrals are **not** unchanged either — the whole feature is gone, see "Removed entirely" above.
