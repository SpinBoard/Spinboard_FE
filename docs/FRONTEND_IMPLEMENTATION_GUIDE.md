# Pazzell — Frontend Migration Guide

**This is a migration, not a fresh build.** The live frontend still implements the old product: watch ads → answer a quiz per ad → complete a 5-ad cycle → spin a wheel → win a prize, plus a marketplace that's a real checkout store. The backend has already been fully revamped out from under it, twice (Billboard + Freebie Codes, then the marketplace store → directory pivot), and the frontend now needs to catch up. Every screen, API call, and piece of state tied to the spin-wheel/quiz/cycle model and the old marketplace checkout is calling endpoints that **no longer exist** and needs to be replaced — not extended, not fixed, replaced.

Read this document as: **§2 tells you what to rip out of the current app and what to build in its place. Everything after that is reference material for building the replacement.** If the running API ever disagrees with this document, the API is right — treat the disagreement as a bug to report, not something to silently work around.

Two companion machine-readable files sit alongside this one in the same folder and are referenced throughout: `openapi.yaml` (full OpenAPI 3.0.3 spec, validated — point codegen/Swagger tooling at it) and `MOCK_FIXTURES.json` (realistic sample payloads for local dev / mock servers).

---

## 1. What The Product Is *Now* (target state)

Pazzell is a continuous video billboard — brand ads played back-to-back, no gate, no quiz, nothing to unlock. It's ringed by scrolling text strips. Occasionally a strip shows a pinned, static **freebie code** (cash or airtime) instead of scrolling text. The first authenticated user to type that code into an Apply box wins it — winning issues a secret code, and applying that secret code (a separate step, same input box) actually pays out: credits the wallet or reveals a recharge PIN. Nothing a user wins ever expires. Cash only leaves the platform through a manual weekly admin payout run — there is no self-serve withdrawal.

Separately, the **marketplace is a business directory**, not a store: brands publish a contact profile (name, description, logo, contact email/phone/WhatsApp, address, social links) and showcase products/services with photos; users browse and contact businesses directly. There is no checkout, no price paid in-app, no order, and no discount code anywhere in the marketplace.

Everything in this section is what the frontend needs to *become*. It is not what it is today.

---

## 2. Migration Plan — What To Rip Out, What To Build, In What Order

This is the primary section of this document. Two revamps happened on the backend, in order; the frontend should migrate in roughly the same order, since the second revamp (marketplace) is independent of the first and can be sequenced separately if the team wants to split the work.

### Suggested sequencing

1. **Kill the dead API calls first, everywhere they appear**, before building any replacement UI. Every one of these now 404s or was never live in this product to begin with: any spin-wheel endpoint, any per-ad quiz-answer submission, any "5-ad cycle" progress tracking, any `/spins/try-again/*` call, any `POST /wallet/withdrawals` call, any old marketplace checkout/order call. Grep the frontend codebase for these call sites first — they're the fastest way to find every screen that needs touching.
2. **Replace the ad-watching screen with the Billboard.** This is the highest-traffic screen in the app and has no gate anymore — remove the quiz-per-ad UI and the "complete 5 to continue" logic entirely, replace with the continuous session/queue/heartbeat/complete flow in §7.
3. **Replace the spin-wheel screen with the perimeter strip + Apply box.** This is a net-new UI concept (see §7) — there's no old screen to adapt, the spin wheel has no replacement-in-kind, it's simply gone and this is what takes its place.
4. **Update the wallet screen** for the new payout-progress fields (§4) and remove any withdrawal UI (§6 — the endpoint is gone).
5. **Update the referral screen** — a milestone reward now shows as a wallet credit, not a discount code reveal (§2, Revamp 2 knock-on change).
6. **Update the brand-side ad campaign dashboard** for the expanded `status` enum and new `moderationStatus` (§2, Revamp 1) — a campaign can now sit in "pending review" after payment, which didn't used to be a state the old UI needed to show.
7. **Rebuild the marketplace end to end**, last, as its own effort — this is the most structurally different piece (store → directory) and has zero shared UI with what exists today. See §2 Revamp 2 and §7's marketplace section.

### Revamp 1 — SpinBoard → Billboard + Freebie Codes

**Removed entirely — do not build UI for any of this:**
- Spin wheel. No spin endpoint, no spin result, no prize-wheel UI of any kind.
- Quiz-after-each-ad. `AdCampaign.questions[]` is gone. Watching an ad no longer gates on answering questions.
- The 5-ad-cycle gate. The billboard just plays continuously — there was never a "watch 5, then unlock X" structure to preserve.
- "Try again" credit economy. `User.tryAgainCount`, `/spins/try-again/spend` — gone.
- Geographic/demographic ad targeting. `AdCampaign.geoTarget` is gone. Every viewer everywhere sees the same eligible pool. If porting old code that filtered ads by viewer country, delete that logic — it has no server-side equivalent anymore, on purpose.
- Automated wallet withdrawal. `POST /wallet/withdrawals` and its transfer webhook no longer exist. There is no self-serve cash-out.
- Puzzle-game system (already dead/unreachable before this revamp, formally deleted now): campaigns, sessions, raffles, meetings, tickets, packages. Any old puzzle-game route now 404s.

**New — build these:**
- Billboard: `POST /billboard/session`, `GET /billboard/queue`, `POST /billboard/impressions/heartbeat`, `POST /billboard/impressions/complete`.
- Freebie codes: `GET /freebies/strip` (+ SSE variant), `GET /freebies/phrases`, `POST /freebies/apply` (single endpoint for both claiming and redeeming), `GET /me/claims`, `POST /me/claims/:claimId/redeem`.
- Weekly payout run status surfaced on `GET /wallet/balance` (`payoutThreshold`, `amountToThreshold`, `nextPayoutDate`) — new fields on an existing endpoint.
- Campaign moderation status (`moderationStatus`) on `AdCampaign` — a campaign dashboard should show "pending review" / "approved" / "rejected," since paying no longer puts a campaign live by itself.
- Campaign lifecycle states expanded: `status` went from `draft|active|inactive` to `DRAFT|PENDING_PAYMENT|ACTIVE|PAUSED|EXPIRED|REJECTED`.
- Flat campaign pricing: no more brand-selectable 1–12 week duration. Flat 30-day activation at $20 Basic / $30 Premium.

**Changed shape, same endpoint:**
- `GET /wallet/balance`: added `payoutThreshold`, `amountToThreshold`, `nextPayoutDate`.
- `AdCampaign`: `questions`/`geoTarget` removed; `moderationStatus`/`moderationReason`/`moderatedBy`/`moderatedAt` added; `status` enum expanded; `numberOfWeeks` is legacy-only now.
- `GET /analytics/app`: counters are now Billboard-sourced (`totalAdsWatched`, `adsWatchedToday`), not puzzle-session-sourced.
- Referral qualification event: used to fire on completing an ad-cycle; now fires on one server-verified completed Billboard impression (`POST /billboard/impressions/complete`). No frontend action needed — server-side.

### Revamp 2 — Marketplace: store → business directory (most recent change)

The marketplace used to be a small digital-goods store (list a product, pay via Paystack, apply a discount code at checkout). It is now a business directory — brands publish a contact profile, users browse and reach out directly.

**Removed entirely:** `POST /marketplace/checkout`, `GET /marketplace/orders/*`, the `Order` model, the `DiscountCode` model, and every price/checkout field on `MarketplaceProduct` (`priceUSD`/`priceLocal`/`currency`/`deliveryAsset`/`fulfillmentInstructions`). Don't build a cart, checkout form, discount-code input, or order-history screen — none of it has a backend anymore.

**New:** a business profile per brand (`PUT /marketplace/business/profile`, `GET .../mine`) with `businessName`, `businessDescription`, `logoUrl`/`coverImageUrl`, `contactEmail`/`contactPhone`/`whatsappNumber`, `address`, `socialLinks`, and an explicit `isListed` publish toggle; a public directory (`GET /marketplace/businesses`, filterable by category/country/state/city/search); a business detail page (`GET /marketplace/businesses/:brandId`) showing the profile plus its active products.

**Changed shape:** `MarketplaceProduct` still exists (create/update/delete under `/marketplace/products*`) but dropped every price/checkout field in favor of `images: string[]` and an optional free-text `priceLabel` (e.g. `"From ₦5,000"`, never a charged amount). `GET /marketplace/products/:productId` now also returns the owning business's contact info under `business`.

**Knock-on change — referral rewards:** milestone rewards used to be a percent-off `DiscountCode`; now they're a flat wallet-cash credit (`WalletTransaction.reason: "REFERRAL_REWARD"`), since there's no purchase left in the product to discount against. `Config: referral.qualifiedThresholds` values changed from discount-bucket keys (`"discount20"`) to flat NGN amounts (default `{20: 1000, 40: 2500}`). If old frontend code reveals a discount code on a referral milestone, replace it with a wallet-balance-updated notification.

**Also removed as a direct consequence:** `WalletTransactionReason.MARKETPLACE_SPEND` (was declared but never had a consumer — now definitively unreachable, since there's no wallet-spend path in a checkout-free marketplace).

### Unchanged — build against these exactly as documented, no surprises

Auth (`/auth/*`, `/registration`, `/login`, `/refresh`), user profile (`/me`, `/profile/*`, `/settings`), forum (`/forum/*`), bank accounts (`/wallet/bank-accounts*`), referral *endpoints* (only the reward payout mechanism changed, above), brand/ad-campaign creation and payment flow shape (only pricing/duration inputs and post-creation lifecycle changed, above).

---

## 3. Authentication

Two token styles coexist: the server sets `access_token`/`refresh_token` **httpOnly cookies** on every successful login/register/activate/Google call, but every protected route in practice reads a **Bearer token** from the `Authorization` header, not the cookie.

**Build against the header.** Take `accessToken` from the JSON body of any auth response (`{ user, accessToken, refreshToken }`) and send it as `Authorization: Bearer <accessToken>` on every subsequent protected call. Treat the cookies as secondary.

- `POST /auth/google` — `{ idToken }` or `{ email, name, avatar, googleId }` → creates or logs in a gamer.
- `POST /auth/gamer/register` — `{ username, email, password, referrerId? }` → sends an activation email, returns `{ activationToken }`.
- `POST /auth/brand/register` — `{ username, email, password }` → same activation flow, `role: "brand"`.
- `POST /auth/user/activate` — `{ activation_token, activation_code }` → creates/verifies the account.
- `POST /auth/user/resend-activation` — `{ email }`.
- `POST /auth/login` — `{ email, password }` → works for both gamer and brand roles.
- `POST /auth/logout` — auth required.
- `POST /auth/forgot-password` — `{ email }` → always `200`, doesn't leak account existence.
- `POST /auth/reset-password` — `{ token, new_password }`.

**One quirk to know:** a request to a protected route with **no** `Authorization` header at all returns `{ error: "Authentication Failed" }` — no `success` field, a different key entirely. Every other auth failure (bad/expired token) uses the standard error shape (§8) with `statusCode: 401`. This is a pre-existing backend quirk, not something to "fix" from the frontend — just special-case it if you need to.

---

## 4. Data Models

Shapes as they actually appear in API responses: camelCase, Mongo `_id` as string, dates as ISO 8601. Internal-only fields (password hashes, encrypted payloads, hash indexes) are never returned and aren't listed.

### Billboard

**Queue slot** (`GET /billboard/queue`):
```
slotId: string          // opaque, single-use — pass back verbatim to heartbeat/complete
type: "AD" | "HOUSE"     // HOUSE = house-filler, shown when the real ad pool is empty
campaignId?: string      // AD only
brandName?: string       // AD only
title: string
videoUrl: string
durationSec: number
```

### Freebie codes, prizes, claims

**Strip feed item** (`GET /freebies/strip`) — two kinds share one array:
```
kind: "FREEBIE" | "PROMO"
display: "PINNED" | "SCROLLING"

// FREEBIE only
positionHint?: "TOP" | "BOTTOM" | "LEFT" | "RIGHT"
codeId?: string
publicCode?: string        // the code text to display — type this to claim
valueLabel?: string        // e.g. "₦500 MTN Airtime", "₦1,000 Cash"
type?: "AIRTIME" | "CASH"
state?: "AVAILABLE" | "TAKEN"   // TAKEN = just claimed, shown red until it drops off
liveUntil?: string          // ISO datetime — when a still-AVAILABLE code rotates off if unclaimed

// PROMO only
text?: string                // scrolling copy, tokens already substituted server-side
```
No field anywhere describes a *future* drop — codes only exist in the feed once actually live.

**Claim** (`POST /freebies/apply` claim branch, `GET /me/claims`, admin lookup):
```
claimId: string
type: "AIRTIME" | "CASH"
valueLabel?: string
value?: number
currency?: string
status?: "ISSUED" | "REDEEMED" | "VOID"
issuedAt?: string
redeemedAt?: string
secretCode?: string          // decrypted, visible to the owner forever — never has a deadline
```

**`POST /freebies/apply` responses** — claim branch:
```
action: "CLAIMED"
claimId: string
type: "AIRTIME" | "CASH"
valueLabel: string
secretCode: string
```
Redeem branch, CASH:
```
action: "REDEEMED"
claimId: string
type: "CASH"
walletBalance: number       // balance AFTER this credit
redeemedAt: string
```
Redeem branch, AIRTIME:
```
action: "REDEEMED"
claimId: string
type: "AIRTIME"
display: string              // e.g. "₦500 Airtime — MTN Nigeria — 1234567890123"
rechargeString: string       // the dial string to actually recharge with
redeemedAt: string
```
Re-submitting an already-redeemed secret code returns the **same shape again**, not an error.

**Phrase** (`GET /freebies/phrases`):
```
_id: string
slot: "PROMO" | "FREEBIE_LIVE" | "FREEBIE_GONE" | "WELCOME" | "EMPTY_STATE"
text: string
weight: number
active: boolean
```

**FreebiePrizeItem** (admin only, `/admin/freebie-prizes*`):
```
_id, batchId, type: "AIRTIME"|"CASH", value, currency, carrier?, country?,
status: "PENDING"|"ASSIGNED"|"CLAIMED"|"REDEEMED"|"EXHAUSTED"|"VOID",
timesAssigned, createdBy, voidedReason?, voidedBy?, voidedAt?
```
The PIN is never in this shape — only via `POST /admin/freebie-prizes/:id/reveal-pin`.

### Wallet & payouts

**Wallet balance** (`GET /wallet/balance`):
```
balance: number
currency: "NGN"
payoutThreshold: number
amountToThreshold: number
nextPayoutDate: string
```

**WalletTransaction:**
```
_id, userId, type: "credit"|"debit", amount: number, balanceAfter: number,
reason: "weekly_payout" | "withdrawal" | "withdrawal_reversal" | "admin_adjustment"
       | "spin_win" | "migration_payout"
       | "FREEBIE_CASH" | "PAYOUT_SETTLED" | "ADJUSTMENT" | "REVERSAL" | "REFERRAL_REWARD",
referenceId?, status: "completed"|"reversed", createdAt
```
The lowercase legacy reasons can still appear on old rows; nothing writes them going forward.

**BankAccount** (unchanged): `_id, bankCode, bankName, accountNumber, accountName (Paystack-resolved), verified, isDefault`.

**PayoutRun / PayoutRunItem** (admin only):
```
PayoutRun: _id, periodStart, periodEnd, createdBy, status: "DRAFT"|"LOCKED"|"COMPLETED"|"CANCELLED", totalAmount, userCount, lockedAt?, completedAt?
PayoutRunItem: _id, runId, userId, amount, status: "PENDING"|"PAID"|"SKIPPED"|"FAILED", reference?, notes?, paidBy?, paidAt?, method?
```

### Ad campaigns (brand side)

```
_id, brandId, tier: "basic"|"premium", title, description, brandUrl?, campaignUrl?,
videoUrl, videoDurationSeconds, videoSizeBytes, videoMimeType,
priceUSD?, exchangeRateSnapshot?, priceLocal?, currency,
status: "DRAFT"|"PENDING_PAYMENT"|"ACTIVE"|"PAUSED"|"EXPIRED"|"REJECTED",
paymentStatus: "unpaid"|"paid",
moderationStatus: "PENDING"|"APPROVED"|"REJECTED", moderationReason?, moderatedBy?, moderatedAt?,
activatedAt?, expiresAt?
```
No `questions[]` or `geoTarget` field anymore.

### User & auth

```
_id, firstName?, lastName?, username?, email, avatar?, role: "gamer"|"brand"|"admin", isVerified,
age?, sex?: "man"|"woman"|"prefer_not_to_say", country?, state?, city?,
notifications: {emailNotifications, referralBonusAlerts, leaderboardUpdates, newCampaignAlerts, weeklyDigest},
privacy: {showOnLeaderboard}, createdAt, updatedAt
```
`country` is collected but never used to filter/target anything. Profile completeness (age+sex+country+state+city+verified) gates claiming a freebie code, not watching the billboard.

### Marketplace — business directory

`brandId` is always the brand's **User** `_id` (matches `AdCampaign.brandId`'s convention) — never a separate "business id."

**Business profile:**
```
brandId: string
businessName: string             // falls back to companyName if unset
businessDescription?: string
logoUrl?: string
coverImageUrl?: string
category: string[]
contactEmail?: string
contactPhone?: string
whatsappNumber?: string
address?: string
country?: string
state?: string
city?: string
socialLinks: { website?, instagram?, facebook?, twitter?, tiktok?, linkedin?, youtube? }
isListed: boolean
isListable?: boolean   // only on the brand's own "mine" read — whether isListed:true would be accepted
```

**MarketplaceProduct:**
```
_id, brandId, name, description, category,
images: string[],                // empty array is valid
priceLabel?: string,             // free-form display text, never a charged amount
isActive: boolean, createdAt, updatedAt
```
`GET /marketplace/products/:productId` also returns a `business` object alongside the product.

### Config value shapes worth rendering as structured forms (admin)

```
"campaign.tiers"        -> { basic: {price, weight, analytics}, premium: {price, weight, analytics} }
"rateLimit.claim" etc.  -> { limit: number, windowSeconds: number }
"freebie.dailyClaimCap" -> { AIRTIME: number, CASH: number }
"freebie.liveWindowMinutes" -> { AIRTIME: number, CASH: number }
"freebie.activeHours"   -> { start: "HH:MM", end: "HH:MM", timeZone: "Africa/Lagos" }
"billboard.houseFillers"-> [{ title, videoUrl, durationSec, filler }]
```

---

## 5. Full API Reference

All routes are mounted under `/api/v1`. Full schema in `openapi.yaml`; this is the narrative index.

### Profile
- `GET /me` — auth required. Cached session user.
- `GET /profile/gamer` — gamer only. Full profile + points/leaderboard/referral stats.
- `GET /profile/brand` — brand only. Profile + brand details + campaign count.
- `PUT /profile/gamer` — multipart, optional `avatar` file. Body: `firstName, lastName, username, age, sex, country, state, city`.
- `PUT /profile/brand` — multipart, optional `avatar` file. Body: `name, companyName, businessCategories, country, state, city`.
- `GET /settings` — role-aware single read for a settings page.
- `PATCH /profile/change-password`, `/profile/notifications`, `/profile/privacy` — auth required.
- `DELETE /profile/account` — `{ password }`, auth required.

### Billboard (watching)
Every route works logged-in or logged-out — auth is never required to watch.
- `POST /billboard/session` → `{ sessionId }`.
- `GET /billboard/queue?sessionId=&size=` → `{ slots: [...] }`.
- `POST /billboard/impressions/heartbeat` — `{ sessionId, slotId, watchedMs }`.
- `POST /billboard/impressions/complete` — `{ sessionId, slotId, watchedMs }` → `{ completed: boolean }`.

### Freebie codes (winning + redeeming)
`POST /freebies/apply` requires auth; everything else here is public.
- `GET /freebies/strip` — poll, rate-limited. `Cache-Control` set from config.
- `GET /freebies/strip/events` — SSE variant, same payload.
- `GET /freebies/phrases` — full active phrase pool, ETag-cacheable.
- `POST /freebies/apply` — auth required. `{ code }`, optional `Idempotency-Key` header (retry-safe on claim), optional `X-Device-Id` header (recommended — anti-abuse). Disambiguates claim vs. redeem server-side.
- `GET /me/claims` — auth required. Full claim history.
- `POST /me/claims/:claimId/redeem` — auth required. Same redemption as typing the secret code.

### Wallet
- `GET /wallet/balance` — auth required.
- `GET /wallet/transactions?limit=50` — auth required.
- `POST /wallet/bank-accounts` — auth required. `{ accountNumber, bankCode, bankName }` → Paystack-resolves the account name server-side.
- `GET /wallet/bank-accounts` — auth required.
- `DELETE /wallet/bank-accounts/:id` — auth required.
- No withdrawal/transfer endpoint exists.

### Referrals
- `GET /referrals/summary?month=YYYY-MM&limit=20` — public/admin, top referrers for a month.
- `GET /referrals/events?month=YYYY-MM&eventType=` — public/admin, raw event log.
- `GET /referrals/my-stats?month=YYYY-MM` — auth required, caller's own stats.

### Ad campaigns (brand side)
- `POST /ad-campaigns` — brand only, multipart with `video` file + `title, description, tier ("basic"|"premium"), brandUrl?, campaignUrl?`. Succeeds even with an incomplete brand profile — stuck unable to go live until profile is complete.
- `GET /ad-campaigns/mine` — brand only.
- `GET /ad-campaigns` — admin only, `?status=&tier=`.
- `GET /ad-campaigns/:campaignId` — public.
- `POST /ad-campaigns/:campaignId/moderate` — admin only. `{ decision: "APPROVED"|"REJECTED", reason? }`.
- `GET /ad-campaigns/:campaignId/analytics` / `/analytics/breakdown` / `/analytics/export.csv` — brand (own) or admin, **Premium tier only** (403 on Basic).
- `POST /ad-payments/initialize` — brand only. `{ campaignId, email }` → Paystack `authorization_url`. `403 PROFILE_INCOMPLETE` if brand profile isn't complete.
- `GET /ad-payments/verify/:reference` — brand only. Also happens via webhook as a fallback.

### Marketplace (business directory — no checkout)
- `GET /marketplace/business/profile/mine` — brand only. Own profile, regardless of `isListed`.
- `PUT /marketplace/business/profile` — brand only. Multipart with optional `logo`/`coverImage` files (or plain `logoUrl`/`coverImageUrl` strings). Body: `businessName, businessDescription, contactEmail, contactPhone, whatsappNumber, address, socialLinks, isListed`. Setting `isListed:true` without a name and a contact method → `403 PROFILE_NOT_LISTABLE`.
- `GET /marketplace/businesses?category=&country=&state=&city=&search=&limit=` — public directory browse/search.
- `GET /marketplace/businesses/:brandId` — public. Full profile + active products. `404` for unlisted or nonexistent (never distinguished).
- `GET /marketplace/products/mine` — brand only. Own listings, including inactive.
- `GET /marketplace/products?category=&brandId=&search=` — public. Active listings from currently-listed businesses only.
- `GET /marketplace/products/:productId` — public. Includes owning business's contact info under `business`.
- `POST /marketplace/products` — brand only, multipart with optional `images` (up to 6) or JSON array of URLs. Body: `name, description, category, priceLabel?`.
- `PUT /marketplace/products/:productId` — brand only, own listings only.
- `DELETE /marketplace/products/:productId` — brand only, own listings only.

### Forum
- `POST /forum/threads`, `GET /forum/threads` — create requires auth, list public.
- `POST /forum/threads/:id/posts`, `GET /forum/threads/:id/posts`.
- `POST /forum/posts/:id/like`, `DELETE /forum/posts/:id/like`, `POST /forum/posts/:id/flag`.
- `GET /forum/moderation/flags`, `PATCH /forum/moderation/flags/:id` — admin only.
- `POST /forum/winner-submissions`, `GET /forum/winner-submissions/mine` — auth required.
- `GET /forum/winner-submissions`, `POST /forum/winner-submissions/:id/verify`, `POST /forum/winner-submissions/:id/reject` — admin only.

### Analytics & admin
- `GET /analytics/app` — public. Platform-wide counters (billboard-sourced).
- `GET /admin/dashboard` — admin only. Broad operational dashboard.
- `POST /analytics/game/start`, `/analytics/game/stop`, `/analytics/user/online`, `/analytics/user/offline` — auth required, presence heartbeats (legacy naming — not puzzle-game related).
- `GET /admin/config` / `PUT /admin/config/:key` — admin only.
- Admin freebie prize inventory (`/admin/freebie-prizes*`): batch upload/create, list, low-inventory alerts, void, reveal-pin.
- Admin freebie schedule/phrases (`/admin/freebies/*`, `/admin/phrases*`).
- Admin claims investigation (`/admin/claims*`) — investigation and voiding only, never redeems on a user's behalf.
- Admin weekly payout run (`/admin/payout-runs*`) — open, lock, export CSV, mark items paid/skipped/failed, complete.
- `GET /payments/transactions` — brand only. `POST /payments/webhook/paystack` — Paystack-called, not frontend-called.

---

## 6. Business Rules

The rules that will make you build the wrong UI if you skip them.

**The billboard never stops and is never gated.** No quiz, no "watch 5 to unlock," no try-again economy. Nobody has to be logged in or have a complete profile to watch — auth/profile-completeness only matter at claim time. Every viewer everywhere draws from the identical eligible ad pool; there is no geographic or demographic targeting anywhere, in ad selection, freebie eligibility, or referral qualification. A campaign only enters the ad pool once both `status:"ACTIVE"` and `moderationStatus:"APPROVED"`. Premium campaigns are picked ~2x as often as Basic, never repeating back-to-back or within the last 5 slots. If the eligible pool is empty, a house-filler slot plays instead — the stream is never empty.

**Freebie codes: first to type wins.** A `PINNED` code is either claimable (`AVAILABLE`) or was just claimed (`TAKEN`, shown red for a grace window) — never "coming soon." There is no way to see a future/scheduled drop through any endpoint — don't build a countdown feature. Claiming is a race: first eligible submission wins, everyone else gets `409 CODE_ALREADY_TAKEN` — common and expected, not an error state. Auth is required to claim, never to watch; an unauthenticated submission is rejected with 401 and changes nothing. Claiming requires verified email + complete profile. Claim limits are per-type, per-user, rolling 24h (default 1 cash + 1 airtime) — capped on one type doesn't block the other; hitting it returns `403 DAILY_LIMIT_REACHED` with `{type, resetsAt}`.

**Redeeming is a separate step, same Apply button.** `POST /freebies/apply` auto-detects claim vs. redeem — one input, one button for both. Redeeming the same secret code multiple times is safe and idempotent (credits/reveals exactly once, every later call returns the same result) — no confirmation dialog needed for retries. A secret code submitted by someone other than its owner is rejected as `404 CODE_INVALID`, identical to a nonexistent code — never tell a user a code "belongs to someone else." Redemption has its own tighter rate limit (`429 TOO_MANY_ATTEMPTS`) than claiming.

**Nothing a user has won ever expires.** No deadline field anywhere on `Claim`. The only expiry-shaped thing in the freebie system is `liveUntil` on an *unclaimed* code — a display-rotation timer, unrelated to expiry on something won. Don't build a "your reward expires in X days" banner anywhere.

**Wallet cash only leaves the platform through a manual weekly run.** No withdrawal/transfer endpoint exists — don't build a "Withdraw" button. `GET /wallet/balance` surfaces `payoutThreshold`/`amountToThreshold`/`nextPayoutDate` for a progress element. Being below threshold only excludes a user from a payout run, nothing else.

**The marketplace is a directory, not a store.** No checkout, no price paid in-app, no order, no discount code — don't build a cart or checkout flow anywhere in the marketplace UI. A brand publishes a business profile and, optionally, showcase products/services with a free-text `priceLabel`. A user browses, opens a business or product, and contacts them directly via tappable `tel:`/`mailto:`/`https://wa.me/`/social links — there's no in-app messaging or purchase action. A business only appears publicly once `isListed:true`, which requires a name and at least one contact method (`403 PROFILE_NOT_LISTABLE` otherwise). Unpublishing hides its products too, automatically. Referral rewards pay out as wallet cash now, not a discount code.

**Suspicion scoring flags, it never blocks.** A claim can be flagged `suspicious:true` for admin review (inhuman latency, headless UA, no prior feed poll) but still succeeds normally for the end user — no end-user-facing "suspicious" messaging exists or should exist.

**Premium-only analytics.** `GET /ad-campaigns/:id/analytics*` returns 403 for Basic-tier campaigns — build an upsell prompt, not an empty chart.

---

## 7. UI Implementation Notes

### Billboard + strip screen

1. On page load: `POST /billboard/session` → `sessionId`. Works with or without auth automatically.
2. `GET /billboard/queue?sessionId=...&size=5` → slots with single-use `slotId`s. Fetch a fresh batch when the queue runs low.
3. Play each slot's `videoUrl` for `durationSec`. Send periodic `POST /billboard/impressions/heartbeat`.
4. On completion (or ≥95% watched): `POST /billboard/impressions/complete` — this is the "verified view" for analytics/referral qualification.
5. Move to the next slot; refetch the queue when exhausted using the same `sessionId` (server tracks recent campaigns to avoid repeats).

Render `type:"AD"` and `type:"HOUSE"` slots identically — house fillers exist so the stream is never empty, not as a distinct unit.

For the strip: poll `GET /freebies/strip` at roughly the `Cache-Control` max-age (default ~3s) or use the SSE variant. The response is one flat array mixing `kind:"FREEBIE"` (render `AVAILABLE` as static/pinned, `TAKEN` as a red grace-window state) and `kind:"PROMO"` (continuously scrolling, tokens already substituted). One Apply box, always visible: submit to `POST /freebies/apply { code }` without guessing claim-vs-redeem client-side; handle `409` as an expected "just missed it" state, `403 DAILY_LIMIT_REACHED` using `details.type`/`details.resetsAt`, `403 PROFILE_INCOMPLETE` as a deep-link to profile completion, `401` as a login prompt (the code stays live for immediate retry after auth).

Claims history (`GET /me/claims`): every secret code always visible; `status` determines whether to show Apply/Redeem (`ISSUED`), a result (`REDEEMED`), or a voided notice (`VOID`, rare). Offer a one-tap "Redeem" via `POST /me/claims/:claimId/redeem` next to each `ISSUED` item.

### Marketplace directory

Browse (`GET /marketplace/businesses?...`) → business cards, already public, no client-side filtering needed, no pagination cursor (use `limit`). Detail (`GET /marketplace/businesses/:brandId`) → full profile + active products in one call; render contact fields as tappable actions (`tel:`, `mailto:`, `https://wa.me/<digits>`, social links) and hide whichever are blank — a business only needed *one* contact method to publish. A 404 here means "not found or not listed," never distinguished. Product browse/detail work the same way, with `GET /marketplace/products/:productId` bundling the owning business's contact info so a "Contact seller" action needs no second lookup. `priceLabel` is pre-formatted display text — render as-is, never parse or reformat it.

Brand-side listing management: `GET /marketplace/business/profile/mine` loads the edit form (works even empty). `PUT /marketplace/business/profile` saves; use the response's `isListable` to grey out the Publish toggle with a clear requirement message rather than letting a submit bounce off a 400. Product CRUD (`POST`/`PUT`/`DELETE /marketplace/products*`, `GET .../mine`) is standard owned-resource management.

---

## 8. Standard Error Shape

Every non-2xx response, with the one auth exception noted in §3:
```
success: false
message: string
code?: string        // machine-readable — branch on this, not on message text
details?: object      // e.g. DAILY_LIMIT_REACHED: { type: "CASH"|"AIRTIME", resetsAt: string }
```
Common codes to handle explicitly: `CODE_ALREADY_TAKEN` (409), `DAILY_LIMIT_REACHED` (403), `PROFILE_INCOMPLETE` (403), `CODE_INVALID` (404), `TOO_MANY_ATTEMPTS` (429), `DEVICE_LIMIT_REACHED`/`IP_LIMIT_REACHED` (403, never disclose the threshold), `PROFILE_NOT_LISTABLE` (403, marketplace).

---

## 9. Config Reference (selected — see `CONFIG.md` for the full list)

Everything here is admin-readable via `GET /admin/config`; nothing needs hardcoding in the frontend.

| Key | Default | Meaning |
|---|---|---|
| `freebie.dailyClaimCap` | `{AIRTIME:1, CASH:1}` | Per-user, per-type, rolling-24h claim cap. |
| `freebie.redDisplaySeconds` | `60` | How long a just-claimed code stays red before disappearing. |
| `freebie.feedCacheTtlMs` | `3000` | Strip poll cadence target. |
| `rateLimit.claim` / `rateLimit.redeem` / `rateLimit.feed` | `{limit, windowSeconds}` | Per-endpoint rate limits. |
| `campaign.tiers` | `{basic:{price:20,...}, premium:{price:30,...}}` | Pricing, ad-rotation weight, analytics access. |
| `campaign.activeDurationDays` | `30` | Flat campaign activation window. |
| `payout.threshold` | `1500` (NGN) | Minimum balance for a weekly payout run. |
| `payout.weekday` | `5` (Friday) | Drives `nextPayoutDate`. |
| `referral.qualifiedThresholds` | `{"20":1000,"40":2500}` | Referral count → flat wallet-cash reward (NGN). |
| `analytics.minCohort` | `10` | Minimum bucket size before a demographic slice is returned. |

`billboard.houseFillers` ships with `videoUrl: ""` in every environment today, including production, until ops uploads real clips — build a graceful placeholder for `type:"HOUSE"` slots with no URL.

---

## 10. Seed Content

Reference `SEED_CONTENT.md` for the exact starter phrase list (`scripts/seed-phrases.ts`) a fresh environment ships with, and the three house-filler slot titles. Useful for building UI against realistic copy before real data exists.

---

## 11. Status & Known Gaps

Validated against the actual final backend route/controller/model files, not reconstructed from a spec brief. `openapi.yaml` passes `swagger-cli validate`; `MOCK_FIXTURES.json` passes `JSON.parse`.

One open item: `billboard.houseFillers` video assets are placeholders everywhere today (§9) — build the empty state, don't wait on it.

Everything else in this document describes the API as it actually behaves right now.
