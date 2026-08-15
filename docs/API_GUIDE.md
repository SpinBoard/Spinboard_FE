# API Guide

All routes are mounted under `/api/v1`. See `openapi.yaml` for the machine-readable spec; this document is the narrative walkthrough organized by user flow, plus the full endpoint index at the bottom.

## Auth

Two token styles coexist: the server sets `access_token`/`refresh_token` **httpOnly cookies** on every successful login/register/activate/Google call, but every `isAuthenticated`-gated route in practice reads a **Bearer token** from the `Authorization` header (`Authorization: Bearer <accessToken>`), not the cookie. Use the `accessToken` returned in the JSON body of the auth response as your bearer token; treat the cookies as a secondary mechanism, not the primary one to build against.

- `POST /auth/google` — `{ idToken }` or `{ email, name, avatar, googleId }` → creates or logs in a gamer, returns `{ user, accessToken, refreshToken }`.
- `POST /auth/gamer/register` — `{ username, email, password, referrerId? }` → sends an activation email, returns `{ activationToken }` (used with the emailed code in the activate call).
- `POST /auth/brand/register` — `{ username, email, password }` → same activation flow, `role: "brand"`.
- `POST /auth/user/activate` — `{ activation_token, activation_code }` → creates/verifies the account, returns `{ user, accessToken, refreshToken }`.
- `POST /auth/user/resend-activation` — `{ email }`.
- `POST /auth/login` — `{ email, password }` → `{ user, accessToken, refreshToken }`. Works for both gamer and brand roles.
- `POST /auth/logout` — auth required.
- `POST /auth/forgot-password` — `{ email }` → always `200` regardless of whether the email exists (doesn't leak account existence).
- `POST /auth/reset-password` — `{ token, new_password }`.
- `POST /registration`, `/activate-user`, `/login`, `/refresh` — an older, parallel gamer-only auth surface (`routes/user.route.ts`) that still works; prefer the `/auth/*` routes above for anything new since they're unified across gamer/brand.

## Profile

- `GET /me` — auth required. Returns the cached session user (from Redis, set at login).
- `GET /profile/gamer` — gamer only. Full profile + points/leaderboard/referral stats.
- `GET /profile/brand` — brand only. Profile + brand details + campaign count.
- `PUT /profile/gamer` — multipart, optional `avatar` file. Body: `firstName, lastName, username, age, sex, country, state, city`. `age/sex/country/state/city` together are the "complete profile" gate for claiming freebie codes — `country` is otherwise inert (no targeting use).
- `PUT /profile/brand` — multipart, optional `avatar` file. Body: `name, companyName, businessCategories, country, state, city`. `businessCategories/country/state/city` are the "complete brand profile" gate for going live with a campaign.
- `GET /settings` — role-aware single read for a settings page.
- `PATCH /profile/change-password`, `/profile/notifications`, `/profile/privacy` — auth required.
- `DELETE /profile/account` — `{ password }`, auth required.

## Billboard (watching)

See `UI_CONTRACT.md` for the full flow. Every route here works logged-in or logged-out (`optionalAuth` + an always-issued anonymous session cookie) — auth is never required to watch.

- `POST /billboard/session` → `{ sessionId }`.
- `GET /billboard/queue?sessionId=&size=` → `{ slots: [...] }`.
- `POST /billboard/impressions/heartbeat` — `{ sessionId, slotId, watchedMs }`.
- `POST /billboard/impressions/complete` — `{ sessionId, slotId, watchedMs }` → `{ completed: boolean }`.

## Freebie codes (winning + redeeming)

See `UI_CONTRACT.md` and `BUSINESS_RULES.md`. `POST /freebies/apply` requires auth; everything else here is public.

- `GET /freebies/strip` — poll, rate-limited (`Config: rateLimit.feed`). `Cache-Control` set from `Config: freebie.feedCacheTtlMs`.
- `GET /freebies/strip/events` — SSE variant, same payload pushed on the same cadence.
- `GET /freebies/phrases` — full active phrase pool, ETag-cacheable (send `If-None-Match`, expect `304` when unchanged).
- `POST /freebies/apply` — auth required. `{ code }`, optional `Idempotency-Key` header (retry-safe on the claim branch), optional `X-Device-Id` header (strongly recommended — feeds the anti-abuse device ceiling). Disambiguates claim vs. redeem server-side; see `DATA_MODELS.md` for both response shapes.
- `GET /me/claims` — auth required. Full claim history, secret codes always visible.
- `POST /me/claims/:claimId/redeem` — auth required. Same redemption as typing the secret code into Apply, no code needed since ownership is proven by auth.

## Wallet

- `GET /wallet/balance` — auth required. See `DATA_MODELS.md` for the payout-aware shape.
- `GET /wallet/transactions?limit=50` — auth required.
- `POST /wallet/bank-accounts` — auth required. `{ accountNumber, bankCode, bankName }` → Paystack-resolves and verifies the account name server-side.
- `GET /wallet/bank-accounts` — auth required.
- `DELETE /wallet/bank-accounts/:id` — auth required.
- No withdrawal/transfer endpoint exists — see `BUSINESS_RULES.md`.

## Referrals

- `GET /referrals/summary?month=YYYY-MM&limit=20` — public/admin, top referrers for a month.
- `GET /referrals/events?month=YYYY-MM&eventType=` — public/admin, raw event log.
- `GET /referrals/my-stats?month=YYYY-MM` — auth required, the caller's own stats/dashboard data.

## Ad campaigns (brand side)

- `POST /ad-campaigns` — brand only, multipart with a `video` file field + `title, description, tier ("basic"|"premium"), brandUrl?, campaignUrl?`. Succeeds even with an incomplete brand profile — the campaign is just stuck unable to go live until the profile is completed (checked at the payment-init step, not here).
- `GET /ad-campaigns/mine` — brand only.
- `GET /ad-campaigns` — admin only, `?status=&tier=` filters.
- `GET /ad-campaigns/:campaignId` — public.
- `POST /ad-campaigns/:campaignId/moderate` — admin only. `{ decision: "APPROVED"|"REJECTED", reason? }` (`reason` required on reject).
- `GET /ad-campaigns/:campaignId/analytics` / `/analytics/breakdown` / `/analytics/export.csv` — brand (own campaign) or admin, **Premium tier only** (403 on Basic). See `BUSINESS_RULES.md`.

### Ad campaign payment

- `POST /ad-payments/initialize` — brand only. `{ campaignId, email }`. Returns a Paystack `authorization_url` to redirect the brand to. `403 PROFILE_INCOMPLETE` if the brand profile isn't complete yet.
- `GET /ad-payments/verify/:reference` — brand only. Confirms payment and activates the campaign (flat 30-day window, tier price from `Config: campaign.tiers`). The same activation also happens via the shared Paystack webhook (`POST /payments/webhook/paystack`) as a fallback — don't assume the frontend-triggered verify call is the only path that flips a campaign live.

## Marketplace (business directory — no checkout)

See `BUSINESS_RULES.md` and `UI_CONTRACT.md` for the full directory/catalogue flow. Nothing under `/marketplace/*` charges money or creates an order — see `CHANGELOG_FOR_FRONTEND.md` if you're porting old checkout-based frontend code.

- `GET /marketplace/business/profile/mine` — brand only. Own profile, regardless of `isListed`.
- `PUT /marketplace/business/profile` — brand only. Multipart with optional `logo`/`coverImage` file fields (or plain `logoUrl`/`coverImageUrl` strings). Body: `businessName, businessDescription, contactEmail, contactPhone, whatsappNumber, address, socialLinks: {website,instagram,facebook,twitter,tiktok,linkedin,youtube}, isListed`. Setting `isListed: true` without a name and at least one contact method returns `403 PROFILE_NOT_LISTABLE`.
- `GET /marketplace/businesses?category=&country=&state=&city=&search=&limit=` — public directory browse/search, `isListed: true` only.
- `GET /marketplace/businesses/:brandId` — public. Full profile + its active products. `404` for an unlisted or nonexistent brand (never distinguishes the two).
- `GET /marketplace/products/mine` — brand only. Own listings, including inactive ones.
- `GET /marketplace/products?category=&brandId=&search=` — public. Active listings belonging to currently-listed businesses only.
- `GET /marketplace/products/:productId` — public. Includes the owning business's contact info denormalized under `business` in the response.
- `POST /marketplace/products` — brand only, multipart with an optional `images` file field (up to 6) or an `images` JSON array of URLs. Body: `name, description, category, priceLabel?`. No price/currency/checkout fields — `priceLabel` is free display text.
- `PUT /marketplace/products/:productId` — brand only, own listings only.
- `DELETE /marketplace/products/:productId` — brand only, own listings only.

## Forum

- `POST /forum/threads`, `GET /forum/threads` — create requires auth, list is public.
- `POST /forum/threads/:id/posts`, `GET /forum/threads/:id/posts`.
- `POST /forum/posts/:id/like`, `DELETE /forum/posts/:id/like`, `POST /forum/posts/:id/flag`.
- `GET /forum/moderation/flags`, `PATCH /forum/moderation/flags/:id` — admin only.
- `POST /forum/winner-submissions`, `GET /forum/winner-submissions/mine` — auth required.
- `GET /forum/winner-submissions`, `POST /forum/winner-submissions/:id/verify`, `POST /forum/winner-submissions/:id/reject` — admin only.

## Analytics & admin

- `GET /analytics/app` — public. Platform-wide counters (billboard-sourced, see `CHANGELOG_FOR_FRONTEND.md`).
- `GET /admin/dashboard` — admin only. Broad operational dashboard (live viewers, claims/redemptions, outstanding wallet liability, next payout size, funnel numbers, etc).
- `POST /analytics/game/start`, `/analytics/game/stop`, `/analytics/user/online`, `/analytics/user/offline` — auth required, presence-tracking heartbeats (legacy naming — "game" here just means "actively engaged," not a puzzle-game concept).
- `GET /admin/config` / `PUT /admin/config/:key` — admin only. See `CONFIG.md`.

## Admin: freebie prize inventory

All admin-only, all under `/admin/freebie-prizes*`:
- `POST /admin/freebie-prizes/batch/airtime` — multipart, `file` field, CSV: `value,carrier,country,pin[,rechargeString]`. Returns a per-row result array so a bad row can be shown without silently dropping it.
- `POST /admin/freebie-prizes/batch/cash` — `{ prizes: [{value, currency?}] }`.
- `GET /admin/freebie-prizes?type=&status=` — list.
- `GET /admin/freebie-prizes/low-inventory` — alerts against configured daily drop counts.
- `GET /admin/freebie-prizes/:prizeItemId`.
- `POST /admin/freebie-prizes/:prizeItemId/void` — `{ reason }`.
- `POST /admin/freebie-prizes/:prizeItemId/reveal-pin` — the one explicit, audit-logged path a PIN is ever exposed outside a real redemption.

## Admin: freebie schedule & phrases

- `GET /admin/freebies/schedule?date=YYYY-MM-DD`, `POST /admin/freebies/schedule/generate` (`{date}`), `POST /admin/freebies/schedule/:scheduleId/cancel` (`{reason}`), `POST /admin/freebies/force-live` (`{type}`) — all admin only.
- `GET /admin/phrases[?slot=]`, `POST /admin/phrases` (`{slot, text, weight?}`), `PUT /admin/phrases/:phraseId` (`{text?, weight?, active?}`), `DELETE /admin/phrases/:phraseId` — admin only.

## Admin: claims investigation

- `GET /admin/claims?secretCode=&userId=` — investigation only.
- `POST /admin/claims/:claimId/void` — `{ reason }`. **No admin path redeems a claim on a user's behalf** — voiding is the only admin write here.

## Admin: weekly payout run

All admin-only, under `/admin/payout-runs*`:
- `GET /admin/payout-runs` → `{ runs, outstandingLiability }`.
- `POST /admin/payout-runs` — `{ periodStart, periodEnd }` → opens a run, snapshots every user at/above `Config: payout.threshold`.
- `GET /admin/payout-runs/:runId/items`.
- `POST /admin/payout-runs/:runId/lock` — freezes amounts; a credit after locking rolls to the next run, not this one.
- `GET /admin/payout-runs/:runId/export.csv` — bank details for the manual transfer batch.
- `POST /admin/payout-runs/:runId/items/:itemId/paid` — `{ method?, reference? }`.
- `POST /admin/payout-runs/:runId/items/paid-bulk` — `{ itemIds: [], method?, reference? }`.
- `POST /admin/payout-runs/:runId/items/:itemId/skip` / `/fail` — `{ reason }`.
- `POST /admin/payout-runs/:runId/complete` — requires every item resolved (paid/skipped/failed).

## Payments (shared)

- `GET /payments/transactions` — brand only, own transaction history.
- `POST /payments/webhook/paystack` (and legacy alias `POST /payments/webhook`) — no auth, called by Paystack. Not something the frontend calls directly, listed for completeness since it's what actually confirms payment server-side in production.
