# API Guide

All routes are mounted under `/api/v1`. See `openapi.yaml` for the machine-readable spec; this document is the narrative walkthrough organized by user flow, plus the full endpoint index at the bottom.

## Auth

Two token styles coexist: the server sets `access_token`/`refresh_token` **httpOnly cookies** on every successful login/register/activate/Google call, but every `isAuthenticated`-gated route in practice reads a **Bearer token** from the `Authorization` header (`Authorization: Bearer <accessToken>`), not the cookie. Use the `accessToken` returned in the JSON body of the auth response as your bearer token; treat the cookies as a secondary mechanism, not the primary one to build against.

- `POST /auth/google` — `{ idToken }` (a Firebase-verified Google idToken; **required** — the previous `{ email, name, avatar, googleId }` raw-payload shape is no longer accepted, it allowed logging in as any user by email alone) → creates or logs in a viewer, returns `{ user, accessToken, refreshToken }`.
- `POST /auth/viewer/register` — `{ username, email, password, referrerId? }` → sends an activation email, returns `{ activationToken }` (used with the emailed code in the activate call).
- `POST /auth/brand/register` — `{ username, email, password }` → same activation flow, `role: "brand"`.
- `POST /auth/user/activate` — `{ activation_token, activation_code }` → creates/verifies the account, returns `{ user, accessToken, refreshToken }`.
- `POST /auth/user/resend-activation` — `{ email }`.
- `POST /auth/login` — `{ email, password }` → `{ user, accessToken, refreshToken }`. Works for both viewer and brand roles.
- `POST /auth/logout` — auth required.
- `POST /auth/forgot-password` — `{ email }` → always `200` regardless of whether the email exists (doesn't leak account existence).
- `POST /auth/reset-password` — `{ token, new_password }`.
- `POST /registration`, `/activate-user`, `/login`, `/refresh` — an older, parallel viewer-only auth surface (`routes/user.route.ts`) that still works; prefer the `/auth/*` routes above for anything new since they're unified across viewer/brand.

## Profile

- `GET /me` — auth required. Returns the cached session user (from Redis, set at login).
- `GET /profile/viewer` — viewer only. Full profile + points/leaderboard stats.
- `GET /profile/brand` — brand only. Profile + brand details (including `registrationNumber`, `strikeCount`, `suspended`, `suspendedReason?`, `kycStatus`) + campaign count. `kycStatus` here is the quick field every KYC-gate check should read (`"not_submitted"|"pending_review"|"verified"|"rejected"|"revoked"`) — for the full current submission (rejection reason, documents, automated-check result), use `GET /kyc/me` below instead.
- `PUT /profile/viewer` — multipart, optional `avatar` file. Body: `firstName, lastName, username, age, sex, country, state, city, phone`. `age/sex/country/state/city` together are the "complete profile" gate for claiming freebie codes — `country` is otherwise inert (no targeting use). `phone` is display/contact only, never used for auth.
- `PUT /profile/brand` — multipart, optional `avatar` file. Body: `name, companyName, businessCategories, country, state, city, registrationNumber`. `businessCategories/country/state/city` are the "complete brand profile" gate for going live with a campaign. `registrationNumber` (e.g. a CAC "RC" number) is informational/display only, never validated.
- `GET /settings` — role-aware single read for a settings page.
- `PATCH /profile/change-password`, `/profile/notifications`, `/profile/privacy` — auth required.
- `DELETE /profile/account` — `{ password }`, auth required.

## Billboard (watching)

See `UI_CONTRACT.md` for the full flow. Every route here works logged-in or logged-out (`optionalAuth` + an always-issued anonymous session cookie) — auth is never required to watch.

- `POST /billboard/session` → `{ sessionId }`.
- `GET /billboard/queue?sessionId=&size=` → `{ slots: [...], sponsoredAd: {id, imageUrl, clickUrl} | null }`. Each slot is `type: "AD"|"HOUSE"|"FREEBIE"` — a `FREEBIE` slot is a live freebie code taking over one slot full-screen, exactly like a real ad, at most once per session per code (**unchanged by the banner-ads revamp below**). An `"AD"`/`"HOUSE"` slot now carries `bannerImageUrl` (was `videoUrl`) and `durationSec` is a fixed `Config: billboard.bannerDisplaySeconds` (15s), not a probed video length — brands upload a static banner image instead of video (see `POST /ad-campaigns` below; MIGRATION_NOTES.md). An `"AD"` slot also carries `clickUrl: string | null` — the campaign's website link (`campaignUrl` if the brand set one, else `brandUrl`, else `null`). `sponsoredAd` is a separate, persistent side-panel placement (not part of the rotating `slots`) — an admin-curated image/GIF creative for an off-platform-negotiated deal; `null` until an admin uploads one, in which case render your own "Your ads here" placeholder. Report a click on it via `POST /billboard/sponsored-ad/:id/click` (public, no auth, fire-and-forget). Freebie codes never appear in this slot. See `UI_CONTRACT.md`'s "Freebie takeover slots" section for the full `FREEBIE` shape and playback rules.
- `POST /billboard/impressions/heartbeat` — `{ sessionId, slotId, watchedMs }`.
- `POST /billboard/impressions/complete` — `{ sessionId, slotId, watchedMs }` → `{ completed: boolean }`.
- `POST /billboard/impressions/click` — `{ sessionId, slotId }` → `{ ok: true, clicked: true }`. Fire-and-forget click-through tracking for an `"AD"` slot — call it as soon as the viewer taps `clickUrl`, don't wait for it before navigating. Idempotent (a repeat call on the same slot is a no-op, still returns `clicked: true`). `400` if the slot has no campaign (a `HOUSE`/`FREEBIE` slot has nothing to click through to).
- `GET /billboard/stats` — public. `{ stats: { watchingNow, codesToday, adsInRotation } }` — headline "what's happening now" numbers for the watch screen.
- `GET /billboard/my-streak` — auth required (hard 401, unlike the rest of this router). `{ streakDays: number }` — consecutive-day watch streak; see `BUSINESS_RULES.md` for the exact definition.

## Freebie codes (winning + redeeming)

See `UI_CONTRACT.md` and `BUSINESS_RULES.md`. `POST /freebies/apply` requires auth; everything else here is public.

- `GET /freebies/strip` — poll, rate-limited (`Config: rateLimit.feed`). `Cache-Control` set from `Config: freebie.feedCacheTtlMs`.
- `GET /freebies/strip/events` — SSE variant, same payload pushed on the same cadence.
- `GET /freebies/phrases` — full active phrase pool, ETag-cacheable (send `If-None-Match`, expect `304` when unchanged).
- `GET /freebies/recent-catches` — public. `{ catches: [{ displayName, type, valueLabel, takenAt }] }` — a small "who just won" feed, size set by `Config: freebie.recentCatchesFeedSize` (default 8).
- `GET /freebies/next-drop-window` — public. `{ nextDropWindow: { windowStart, windowEnd, timeZone } | null }` — a deliberately coarse heads-up for the *next* upcoming drop only: a **fixed 1-hour clock bucket** (e.g. 08:00–09:00 platform time) that's guaranteed to contain the real drop, never the drop's actual time, and never which type (airtime/cash) it'll be. `windowStart`/`windowEnd` are ISO UTC instants — convert to the viewer's own locale for display, or just show `timeZone`'s wall-clock hours directly (that's how every other "today" concept in this API already works). `null` means nothing is currently scheduled to check back for. This is the **one** deliberate, narrow exception to `BUSINESS_RULES.md`'s "the drop schedule is never exposed" rule — don't build anything that assumes finer-grained timing is available anywhere, because it isn't and won't be.
- `POST /freebies/apply` — auth required. `{ code }`, optional `Idempotency-Key` header (retry-safe on the claim branch), optional `X-Device-Id` header (strongly recommended — feeds the anti-abuse device ceiling). Disambiguates claim vs. redeem server-side; see `DATA_MODELS.md` for both response shapes.
- `GET /freebies/limits/mine` — auth required. `{ limits: [{ type, cap, claimedToday, remaining, resetsAt? }] }` — today's per-type claim-cap usage, so the UI can show it proactively instead of only learning it via a `403 DAILY_LIMIT_REACHED`.
- `GET /me/claims` — auth required. Full claim history, secret codes always visible. Each item now also carries `publicCode?` — the code as it appeared on the board when won.
- `POST /me/claims/:claimId/redeem` — auth required. Same redemption as typing the secret code into Apply, no code needed since ownership is proven by auth.

## Wallet

- `GET /wallet/balance` — auth required. See `DATA_MODELS.md` for the payout-aware shape.
- `GET /wallet/transactions?limit=50` — auth required.
- `POST /wallet/bank-accounts` — auth required. `{ accountNumber, bankCode, bankName }` → Paystack-resolves and verifies the account name server-side.
- `GET /wallet/bank-accounts` — auth required.
- `DELETE /wallet/bank-accounts/:id` — auth required.
- No withdrawal/transfer endpoint exists — see `BUSINESS_RULES.md`.

### Wallet top-up (brand only — businesses funding a spendable balance)

New: a business can fund its own wallet, which it then spends on things like a `POST /quotation-unlock/purchase` (see "B2B Projects & Quotations" below). This is a **separate wallet purpose** from the viewer wallet above (freebie cash, Promote & Earn prizes) — same `Wallet`/`WalletTransaction` models and endpoints, different `reason` values on the ledger.

- `POST /wallet/topup/initialize` — brand only. `{ amount, email }` → `{ data: { authorization_url, access_code, reference, amount, currency } }`. Same Paystack-checkout-redirect pattern as `POST /ad-payments/initialize` — send the brand to `authorization_url`.
- `GET /wallet/topup/verify/:reference` — brand only. Confirms payment and credits the wallet (`WalletTransaction.reason: "WALLET_TOPUP"`). The same crediting also happens via the shared Paystack webhook as a fallback — don't assume the frontend-triggered verify call is the only path that credits the balance, same caveat as ad-campaign payment verification above.

## Ad campaigns (brand side)

- `POST /ad-campaigns` — brand only, multipart with a **`banner`** file field (image, was `video`) + `title, description, tier ("basic"|"premium"), brandUrl?, campaignUrl?`. The banner must be a jpeg/png/webp image close to `1200x675px` (16:9, `Config: banner.targetWidthPx`/`targetHeightPx`, tolerance `banner.aspectRatioTolerance`) and under `Config: banner.maxSizeBytes` (default 5MB) — `400` otherwise. Every campaign, both tiers, is banner-only now — tier only affects price/rotation-weight/analytics (see MIGRATION_NOTES.md). `brandUrl`/`campaignUrl`, when set, must be a well-formed `http(s)` URL — `400` otherwise (they become a clickable link on the billboard, see `GET /billboard/queue`'s `clickUrl` above). Succeeds even with an incomplete brand profile — the campaign is just stuck unable to go live until the profile is completed (checked at the payment-init step, not here). `403 BRAND_SUSPENDED` if the brand is suspended (see "Ad moderation" below).
- `POST /ad-campaigns/:campaignId/banner` — brand only, own campaign, multipart with a **`banner`** file field, same validation as above. Adds or **replaces** the banner on an already-existing campaign (the old file is deleted from storage on a successful replace) — this is the only way to attach a banner without creating a brand-new campaign, e.g. for a pre-cutover campaign whose video was retired. Returns `{ campaign }`. `403` if the campaign belongs to a different brand, `404` if it doesn't exist.
- `GET /ad-campaigns/mine` — brand only. Each campaign includes `playsToday` and `completionRateToday` (nullable), read from the daily analytics rollup — a lightweight glance available to every tier, not the deep Premium-gated analytics. The rollup runs on a schedule so "today" can lag slightly behind real-time.
- `GET /ad-campaigns` — admin only, `?status=&tier=` filters. Each campaign includes `reportCount`, `reportCountLastHour`, `flagged`/`flaggedAt`/`flagReasons`, `brandStrikeCount`, `brandSuspended` — see "Ad moderation" below.
- `GET /ad-campaigns/:campaignId` — public.
- `POST /ad-campaigns/deactivate` — admin only, bulk. `{ campaignIds: string[], reason }` (**`reason` is required**) → pulls any currently-`ACTIVE` campaigns in the list out of rotation (`status: "PAUSED"`, `moderationStatus: "REJECTED"`) and adds one strike per campaign taken down to its brand. Returns `{ matched, deactivated }`.
- `POST /ad-campaigns/reactivate` — admin only, bulk. `{ campaignIds: string[] }` → puts any currently-`PAUSED` campaigns in the list back into rotation (`status: "ACTIVE"`, `moderationStatus: "APPROVED"`), unless their original `expiresAt` has already passed (those are skipped, not resurrected). Returns `{ matched, reactivated, skippedExpired: string[] }`.
- `POST /ad-campaigns/:campaignId/pause` — brand only, own campaign, no body. Self-serve `ACTIVE` → `PAUSED`, no penalty, `moderationStatus` untouched. `400` if not currently `ACTIVE`.
- `POST /ad-campaigns/:campaignId/resume` — brand only, own campaign, no body. `PAUSED` → `ACTIVE`, only if the brand paused it themselves (`403 ADMIN_TAKEDOWN` if an admin took it down instead — only `POST /ad-campaigns/reactivate` undoes that). Also `400` if `expiresAt` has passed, `403 BRAND_SUSPENDED` if suspended.
- `POST /ad-campaigns/:campaignId/report` — auth required, any role. `{ reason }` → `{ reported, flagged }`. One report per user per campaign, idempotent (a repeat is a silent no-op). See "Ad moderation" below.
- `POST /ad-campaigns/:campaignId/warn` — admin only. `{ note }` → `{ campaign, strikeCount, autoSuspended }`. Adds a strike, campaign stays live, clears `flagged`.
- `GET /ad-campaigns/:campaignId/analytics` / `/analytics/breakdown` / `/analytics/export.csv` — brand (own campaign) or admin, **Premium tier only** (403 on Basic). `analytics` gained `costPerCompletedView` (nullable), `clicks` and `clickThroughRate` (`clicks / impressions`, `0` if no impressions) — the time series and the CSV export (now `date,impressions,completedViews,clicks`) carry `clicks` per day too. See `BUSINESS_RULES.md`.

### Ad campaign payment

- `POST /ad-payments/initialize` — brand only. `{ campaignId, email }`. Returns a Paystack `authorization_url` to redirect the brand to. `403 PROFILE_INCOMPLETE` if the brand profile isn't complete yet, `403 BRAND_SUSPENDED` if the brand is suspended.
- `GET /ad-payments/verify/:reference` — brand only. Confirms payment and activates the campaign (flat 30-day window, tier price from `Config: campaign.tiers`). The same activation also happens via the shared Paystack webhook (`POST /payments/webhook/paystack`) as a fallback — don't assume the frontend-triggered verify call is the only path that flips a campaign live.

### Ad moderation — reports, auto-flag, strikes, brand suspension

New reactive-moderation subsystem — no pre-publish review exists anywhere in this API; this is what happens *after* a campaign is already live. See `BUSINESS_RULES.md` for the full rule set.

- `POST /admin/brands/:brandId/suspend` — admin only. `{ reason }` → `{ pausedCampaigns }`. Suspends the brand, immediately pauses every `ACTIVE` campaign they have running.
- `POST /admin/brands/:brandId/unsuspend` — admin only, no body. Lifts the suspension — does not reset the strike counter and does not reactivate paused campaigns (use `POST /ad-campaigns/reactivate` per-campaign for that).
- A brand is auto-suspended, same effect as the manual call, once its strike count (added by `POST /ad-campaigns/:campaignId/warn` or `POST /ad-campaigns/deactivate`) reaches `Config: adModeration.suspendStrikeThreshold` (default 3).
- A suspended brand gets `403 BRAND_SUSPENDED` on: `POST /ad-campaigns`, `POST /ad-payments/initialize`, `POST /ad-campaigns/:campaignId/resume`, `POST /promote/campaigns`.
- A campaign auto-flags (`AdCampaign.flagged`) once report count reaches `Config: adModeration.autoFlagReportThreshold` (default 3) within `Config: adModeration.autoFlagWindowMinutes` (default 60) — a signal only, not a takedown.
- No email/notification is sent on warn or suspend at this point — standing is visible only via the profile/admin views.

### Sponsored ads — admin-curated side-panel placement

A small, deliberately minimal product: **not** a brand self-serve feature like AdCampaign. Any advertiser (on the platform or not) can either negotiate off-platform and have an admin upload the already-agreed creative directly (goes live immediately — the admin uploading it *is* the vetting step), **or** submit their own creative + contact details themselves via the public endpoint below (lands `PENDING`, invisible on the billboard, until an admin reviews/negotiates and activates it — same admin action either way). Starts empty; see `GET /billboard/queue`'s `sponsoredAd` field above for how the frontend consumes it.

- **`POST /sponsored-ads/submit`** — public, **no auth** (any advertiser, registered on the platform or not; rate-limited per IP, `Config: rateLimit.sponsoredAdSubmission`, default 5/hour). Multipart with an `image` file field (jpeg/png/webp/gif, under `Config: sponsoredAd.maxSizeBytes`, no aspect-ratio constraint) + `advertiserName, contactEmail, contactPhone?, message?, clickUrl?`. `contactEmail` is required — it's how the team follows up to negotiate — and must look like a valid email, `400` otherwise. Always lands `status: "PENDING"` — **never goes live on its own**. Returns `{ submissionId }`, not the full record (nothing to render immediately — no polling needed, this is a "thanks, we'll be in touch" confirmation).
- `POST /admin/sponsored-ads` — admin only, multipart with an `image` file field (jpeg/png/webp/gif, under `Config: sponsoredAd.maxSizeBytes`, no aspect-ratio constraint) + `advertiserName, clickUrl?`. Goes live (`status: "ACTIVE"`) immediately. Returns `{ sponsoredAd }`.
- `GET /admin/sponsored-ads?status=` — admin only. Lists every sponsored ad; pass `status=PENDING` to pull up just the brand-submitted queue awaiting review (each item includes `contactEmail`/`contactPhone`/`message` when it came from a submission), or omit for everything.
- `POST /admin/sponsored-ads/:id/activate` / `/deactivate` — admin only, no body. Works the same whether the row started as an admin's direct upload or a brand's `PENDING` submission — `activate` is also how a submission is "approved." `GET /billboard/queue`'s `sponsoredAd` field always reflects the most-recently-activated `ACTIVE` row, or `null` if none.
- `POST /billboard/sponsored-ad/:id/click` — public, no auth. Fire-and-forget click counter, same idempotent spirit as the AD slot's click tracking.

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

## Promote & Earn (share campaigns, win the cumulative-likes grand prize)

See `BUSINESS_RULES.md` and `UI_CONTRACT.md` for the full flow. Separate feature from the marketplace above — nothing here shares a model or endpoint with it.

- `POST /promote/campaigns` — brand only, multipart with a `media` file field (image or ≤60s video) + `title, description`. Free — no payment, auto-`ACTIVE` on creation. `403 BRAND_SUSPENDED` if the brand is suspended (see "Ad moderation" above).
- `GET /promote/campaigns/mine` — brand only. Own campaigns, each with the full funnel: `clickCount`, `signupCount`, `likeCount` (all-time).
- `GET /promote/campaigns/:campaignId` — public. Campaign detail — `likeCount` only (no click/signup numbers on the public detail read, see `BUSINESS_RULES.md`).
- `GET /promote/campaigns` — admin only, `?status=&brandId=` filters. Same full funnel as `mine`, plus `brandName`.
- `POST /promote/campaigns/deactivate` / `POST /promote/campaigns/reactivate` — admin only, bulk `{ campaignIds: string[], reason? }` (reason only on deactivate) — same `ACTIVE`↔`PAUSED` pattern as `POST /ad-campaigns/deactivate`.
- `POST /promote/campaigns/:campaignId/links` — auth required. Mints or returns this viewer's share link for the campaign. Idempotent — safe to call on every visit.
- `GET /promote/l/:slug` — public (works logged-in or logged-out). What the share link itself resolves to — call this, not `GET /promote/campaigns/:campaignId`, when a visitor lands on a shared link (they have the slug, not the campaignId). Returns `{campaignId, linkId, promoterUserId, campaign}` (`campaign` is the same detail shape `GET /promote/campaigns/:campaignId` returns) and logs a funnel click for this browser — deduped per browser per link (a refresh doesn't inflate the count), attributed to a real account automatically if the visitor signs up afterward, no code/referrer field for them to enter. `404 LINK_NOT_FOUND` for an unknown slug.
- `GET /promote/links/mine` — auth required. Every link this viewer holds, each with its own `clickCount`, `signupCount`, and `likeCount` — the promoter's own funnel dashboard.
- `POST /promote/like/:slug` — auth required. Votes/likes the campaign the given link points to — no account-age gate, a brand-new account can vote immediately. Idempotent **per user per (promoter, campaign) pair**: a liker can vote for as many different promoters as they like, and separately for each distinct campaign a given promoter shares (voting on that promoter's 2nd, 3rd, ... campaign each counts) — only a repeat vote for the exact same promoter+campaign pair returns `alreadyLiked: true` and `message: "You have already voted for this promoter on this campaign."`, not an error. `400 SELF_LIKE_NOT_ALLOWED` if liking your own link; `400 CAMPAIGN_NOT_ACTIVE` if the campaign's paused.
- `GET /promote/leaderboard?periodId=` — public. Platform-wide, **cumulative across every campaign each promoter has shared** — not per-campaign. Omit `periodId` for the currently `OPEN` period; returns `{ period: null, entries: [] }` if none is open.
- `POST /admin/promote/likes/:likeId/void` — admin only. `{ reason }`.
- `POST /admin/promote/promoters/:userId/disqualify` / `POST /admin/promote/promoters/:userId/requalify` — admin only. `{ reason }` on disqualify; excludes/restores a promoter from every leaderboard computation, globally (not per-period).
- `GET /admin/promote/promoters/disqualified` — admin only.
- `POST /admin/promote/periods` — admin only. `{ periodStart, periodEnd, prizeDescription, prizeAmount?, currency? }` — manually opens a grand-prize window. A weekly period now opens/settles **automatically by default** (see `BUSINESS_RULES.md`); this endpoint is for a manual override, e.g. a one-off prize for a specific week.
- `GET /admin/promote/periods` — admin only.
- `POST /admin/promote/periods/:periodId/settle` — admin only. Determines the winner from the cumulative leaderboard and credits their wallet if `prizeAmount` was set. Manual override of the automatic weekly settle.
- `POST /admin/promote/periods/:periodId/cancel` — admin only. `{ reason }`.

## Business KYC verification

See `BUSINESS_RULES.md` for the full hybrid-verification rule. Required before a business can post a Project or submit a Quotation (see the next section) — nothing else in the API gates on KYC status.

- `POST /kyc/submit` — brand only, multipart with optional `cacCertificate`/`repId` file fields. Body: `rcNumber, businessType?, legalBusinessName, repIdType?`. Runs an automated CAC pre-check inline, but **always** lands on `status: "pending_review"` — never auto-verified. `409 KYC_ALREADY_PENDING` if a submission is already awaiting review.
- `GET /kyc/me` — brand only. `{ kyc: BusinessKyc | null }` — the brand's most recent submission (any status), `null` if never submitted.
- `POST /kyc/resubmit` — brand only, same body/files as `/kyc/submit`. Only allowed when the current submission's status is `"rejected"`; `400 KYC_RESUBMIT_NOT_ALLOWED` otherwise.
- `GET /admin/kyc/queue` — admin only. Every `pending_review` submission, oldest first.
- `GET /admin/kyc/:id` — admin only. Full detail including the automated check's raw response.
- `POST /admin/kyc/:id/approve` — admin only, no body. `pending_review` → `verified`.
- `POST /admin/kyc/:id/reject` — admin only. `{ reason }` → `pending_review` → `rejected`.
- `POST /admin/brands/:brandId/kyc/revoke` — admin only. `{ reason }` → pulls a previously-`verified` business back to `revoked` (e.g. fraud discovered after approval). `404 KYC_NOT_VERIFIED` if the brand isn't currently verified.

## B2B Projects & Quotations (pay-to-unlock marketplace)

See `BUSINESS_RULES.md` for the full paywall/contact/rating rules. Separate feature from the marketplace directory above — no shared model or endpoint.

- `POST /projects` — brand only, KYC-verified only (`403 KYC_REQUIRED` otherwise). `{ title, description, budgetMin?, budgetMax?, currency?, category?, deadline? }`.
- `GET /projects?category=` — brand only. Public-to-any-brand browse of `status:"open"` projects.
- `GET /projects/mine` — brand only. Poster's own projects, any status.
- `GET /projects/:id` — brand or admin.
- `POST /projects/:id/close` / `POST /projects/:id/cancel` — brand only, poster only, no body.
- `GET /projects/:id/quotations` — brand only, poster only. **The paywall.** `{ quotations, unlocked, totalQuotationCount }` — without an active unlock pass, `quotations` contains only the one free quotation (`unlocked: false`); with one, every submitted quotation (`unlocked: true`). Always includes `totalQuotationCount` so the frontend can render "1 of 4 visible — unlock all" even when gated.
- `POST /projects/:id/quotations` — brand only, KYC-verified only (`403 KYC_REQUIRED`), can't be the project's own poster (`400`). `{ amount, message, attachmentUrls? }`. `409` if this business already has an active quotation on this project.
- `POST /quotations/:id/withdraw` — brand only, own quotation only, no body.
- `POST /quotation-unlock/purchase` — brand only, no body. Debits the wallet for `Config: quotationUnlock.priceNgn` (default ₦5,000) and grants/extends an **account-wide** unlock pass for `Config: quotationUnlock.durationDays` (default 30) days — reveals all quotations on every project this business posts, not just one. `402 INSUFFICIENT_BALANCE` if the wallet balance is too low (prompt a wallet top-up, see above). Buying again while a pass is still active **extends from the current expiry**, not from now — a business never loses days it already paid for. Returns `{ expiresAt }`.
- `GET /quotation-unlock/status` — brand only. `{ active: boolean, expiresAt?: string }`.
- `GET /admin/projects/:id/quotations` — admin only. Every quotation on the project, unfiltered (no paywall gating) — for support/dispute investigation.

### Business contact & ratings

- `POST /business-contact/threads` — brand only. `{ projectId, quotationId }` → opens (or returns the existing) private thread between the project's poster and that quotation's submitter. Only the poster or the quoter can call this, and only once the quotation is actually visible to the poster (the free quote, or an active unlock pass) — `403 QUOTATION_NOT_VISIBLE` otherwise.
- `GET /business-contact/threads` — brand only. Every thread this business participates in, as either poster or quoter.
- `GET /business-contact/threads/:id/messages` — brand only, participant only.
- `POST /business-contact/threads/:id/messages` — brand only, participant only. `{ body }`.
- `POST /business-ratings` — brand only. `{ projectId, quotationId, ratedBrandId, score (1-5), comment? }`. Gated on an existing contact thread between rater and rated on that project — `403 CONTACT_REQUIRED` otherwise. `409` on a second rating for the same (project, rater, rated) direction — once per project per direction, not once-ever between two businesses (they can rate each other again on a later, unrelated project).
- `GET /business-ratings/business/:brandId` — public. `{ averageScore, count, ratings: [...] }` — hidden (admin-moderated) ratings excluded.
- `POST /business-ratings/:id/report` — brand only. `{ reason }` → `{ reported, flagged }`. One report per user per rating, idempotent (a repeat is a silent no-op, `reported: false`).
- `GET /admin/business-ratings/moderation/flags` — admin only. Ratings currently over the auto-flag report threshold and not yet hidden.
- `POST /admin/business-ratings/:id/hide` — admin only. `{ reason }` → hides the rating from every public read (never deleted).
- `POST /admin/business-ratings/reports/:id/dismiss` — admin only, no body. Logs that an admin reviewed the report and judged the rating fine — doesn't change the report or rating data, so a fresh report on the same rating still surfaces normally later.

## Forum

- `POST /forum/threads`, `GET /forum/threads` — create requires auth, list is public.
- `POST /forum/threads/:id/posts`, `GET /forum/threads/:id/posts`.
- `POST /forum/posts/:id/like`, `DELETE /forum/posts/:id/like`, `POST /forum/posts/:id/flag`.
- `GET /forum/moderation/flags`, `PATCH /forum/moderation/flags/:id` — admin only.
- `POST /forum/winner-submissions`, `GET /forum/winner-submissions/mine` — auth required.
- `GET /forum/winner-submissions`, `POST /forum/winner-submissions/:id/verify`, `POST /forum/winner-submissions/:id/reject` — admin only.

## Analytics & admin

- `GET /analytics/app` — public. Platform-wide counters (billboard-sourced, see `CHANGELOG_FOR_FRONTEND.md`).
- `GET /admin/dashboard` — admin only. Broad operational dashboard (live viewers, claims/redemptions, outstanding wallet liability, next payout size, funnel numbers, etc); see `DATA_MODELS.md`'s "Admin dashboard" section for the full field-level response shape.
- `POST /analytics/game/start`, `/analytics/game/stop`, `/analytics/user/online`, `/analytics/user/offline` — auth required, presence-tracking heartbeats (legacy naming — "game" here just means "actively engaged," not a puzzle-game concept).
- `GET /admin/config` / `PUT /admin/config/:key` — admin only. See `CONFIG.md`.

## Admin: freebie prize inventory

**Cash-only** (see `BUSINESS_RULES.md`) — `POST /admin/freebie-prizes/batch/airtime` no longer exists. All admin-only, all under `/admin/freebie-prizes*`:
- `POST /admin/freebie-prizes/batch/cash` — `{ prizes: [{value, currency?}] }`. The only creation endpoint now — free-form `value`, so any denomination (₦50, ₦100, ₦500, ₦1000, ...) is just a normal call, nothing special to build for it.
- `GET /admin/freebie-prizes?type=&status=` — list. `type=AIRTIME` still works as a filter (historical records only — nothing new is ever created with that type).
- `GET /admin/freebie-prizes/low-inventory` — alerts against the configured daily drop count. CASH-only now; the response shape is unchanged (`alerts: [{type, pendingCount, dailyNeed, daysOfStockRemaining}]`), it just never contains an `AIRTIME` entry any more.
- `GET /admin/freebie-prizes/:prizeItemId`.
- `POST /admin/freebie-prizes/:prizeItemId/void` — `{ reason }`.
- `POST /admin/freebie-prizes/:prizeItemId/reveal-pin` — still live, for the handful of pre-cutover AIRTIME prizes/claims that still need a PIN revealed; nothing new will ever call it.

## Admin: freebie schedule & phrases

- `GET /admin/freebies/schedule?date=YYYY-MM-DD`, `POST /admin/freebies/schedule/generate` (`{date}`), `POST /admin/freebies/schedule/:scheduleId/cancel` (`{reason}`), `POST /admin/freebies/force-live` (`{type}`) — all admin only. Each schedule row now carries a `resolvedCode` field: `null` while `status:"PENDING"` (nothing exists yet to resolve — see `BUSINESS_RULES.md`'s "never expose the schedule" rule, still fully intact for un-fired rows), and once `status:"FIRED"` the actual `{publicCode, valueLabel, status, liveFrom, liveUntil, takenBy, takenAt}` for the code that drop minted — no separate lookup call needed to build a full schedule table.
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
