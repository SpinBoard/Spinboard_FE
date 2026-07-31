# API Contract — Ads-Watching & Reward Platform Migration

This document covers every endpoint added or changed by the pivot from the puzzle-game
platform to the ads-watching-and-spin-reward platform. Endpoints not listed here are
unchanged. All routes are mounted under `/api/v1`. Auth: `Authorization: Bearer <accessToken>`
unless marked **public** or **optional auth**.

The puzzle/game system (4 game types, weekly points leaderboard, per-campaign raffles) has
been removed from the live API. Historical data for that system remains in MongoDB
(archived, not deleted) but its routes are unmounted.

---

## 1. Auth — **changed**

### `POST /auth/gamer/register` — **changed**
Body: `{ username, email, password }` (was `{ firstName, lastName, email, password }`).
Rejects disposable/temporary email domains with `400`. Enforces username uniqueness.

### `POST /auth/brand/register` — **changed**
Body: `{ username, email, password }` (was `{ name, email, password, companyName }`).
Company details (name, business categories, country, state, city) are now supplied later via
profile completion (`PUT /profile/brand`), not at signup.

### `POST /auth/user/activate`, `POST /auth/google` — **behavior changed, same routes**
On successful activation/login, if the caller has an `anon_session_id` cookie (see §3), any
in-progress or completed anonymous ad-cycle and its earned spin credit are migrated to the new
account — see §3.

---

## 2. Brand & User Profiles — **changed**

### `PUT /profile/brand` — **changed**
New body fields: `businessCategories` (array or JSON-stringified array), `country`, `state`,
`city`, plus existing `name`/`companyName`/`avatar`. Response now includes
`profile.brandDetails.profileComplete: boolean`.

**Brand profile completion is required before campaign creation** — `POST /ad-campaigns`
returns `403` with a descriptive message if `businessCategories`, `country`, `state`, `city`,
or `companyName` are missing.

### `PUT /profile/gamer` — **changed**
New body fields: `age` (number), `sex` (`"man"|"woman"|"prefer_not_to_say"`), `country`,
`state`, `city`. These are optional to browse/watch ads but **required to spin** (see §6).

---

## 3. Ad-Watching Flow — **new**

Logged-out visitors can watch ads and answer quizzes; the spin endpoint (§6) hard-rejects
them. A signed `anon_session_id` httpOnly cookie tracks anonymous progress automatically —
no client action needed. On registration/login, any anonymous progress is migrated to the new
account so an already-earned spin is never lost.

All routes below are **optional auth** — they work identically for authenticated users and
logged-out visitors.

| Method & Path | Body | Notes |
|---|---|---|
| `GET /ads/next?country=NG` | — | Returns the next eligible ad in the caller's current 5-ad cycle (creates a cycle if none in progress). `country` is an optional client-detected hint used only for logged-out/pre-profile viewers — authenticated users with a saved profile country use that instead. |
| `POST /ads/:campaignId/video/start` | — | |
| `POST /ads/:campaignId/video/complete` | — | Rewatching is allowed — call this again any time. |
| `POST /ads/:campaignId/quiz/submit` | `{ answers: number[] }` | All 3 answers submitted **at once**; validated only after all 3 are given. Returns `{ allCorrect, attemptsSoFar, cycleCompleted, spinCreditGranted }` — **no per-question feedback is ever returned**, only the overall boolean. Unlimited retries. |

**`GET /ads/next` response:**
```json
{
  "success": true,
  "adsWatchedSoFar": 2,
  "ad": {
    "campaignId": "...",
    "title": "...",
    "description": "...",
    "brandUrl": "...",
    "videoUrl": "...",
    "videoDurationSeconds": 90,
    "questions": [{ "question": "...", "choices": ["...", "..."] }]
  }
}
```
Note `questions` never includes `correctIndex`.

**`POST /ads/:campaignId/quiz/submit` response:**
```json
{ "success": true, "allCorrect": true, "attemptsSoFar": 2, "cycleCompleted": true, "spinCreditGranted": true }
```
- `cycleCompleted: true` after the 5th ad's quiz is passed correctly.
- `spinCreditGranted: true` only for authenticated users — a completed anonymous cycle banks
  its state but the spin credit is granted retroactively on registration (see §1).
- The first quiz attempt per ad is logged separately from later retries for brand analytics
  (§5), even if a later retry is what actually passes.

---

## 4. Campaigns (brand-facing) — **new**

### `POST /ad-campaigns` — brand only, profile must be complete
**Content-Type:** `multipart/form-data`

| Field | Type | Notes |
|---|---|---|
| `title`, `description` | string | required |
| `brandUrl`, `campaignUrl` | string | optional |
| `video` | file | required — validated for duration (~90s, `video.maxDurationSeconds`) and size (`video.maxSizeBytes`), both Config-driven |
| `questions` | JSON array | required — exactly 3 brand-authored `{question, choices[], correctIndex}` |
| `tier` | string | required — `"basic" \| "premium" \| "pro"` |
| `global` | boolean | Pro tier only — sets worldwide visibility instead of brand-country targeting |

Starts as `status: "draft"`. Pricing is computed server-side from the tier (`campaign.tierPrices`,
USD) converted to NGN via `payment.usdToNgnRate` (Config) — both values are snapshotted onto
the campaign.

### `POST /ad-payments/initialize` — `{ campaignId, email }`, brand only
Same Paystack initialize/verify/webhook shape as the legacy campaign payment flow. On payment
success, the campaign transitions `draft → active`, `activatedAt = now`,
`expiresAt = now + campaign.activeDays` (default 30 days). After `expiresAt`, an hourly job
flips the campaign to `inactive` — inactive campaigns never appear in `GET /ads/next`.

### `GET /ad-payments/verify/:reference` — brand only
### `GET /ad-campaigns/mine` — brand only — the caller's own campaigns
### `GET /ad-campaigns/:campaignId` — public
### `GET /ad-campaigns/:campaignId/analytics` — **Premium/Pro only** (Basic gets `403`)
```json
{
  "success": true,
  "analytics": {
    "views": 128,
    "completions": 94,
    "questionCorrectnessRates": [0.91, 0.77, 0.85],
    "demographics": { "country": { "NG": 80 }, "sex": { "man": 40, "woman": 50 }, "ageBuckets": { "20s": 60 } }
  }
}
```
`questionCorrectnessRates` is computed from first-attempt answers only.

**Weighting & geo-targeting** (server-side, no client action needed):
- Premium campaigns appear **2x** as often as Basic; Pro **3x** — `GET /ads/next` weighted
  random selection (`campaign.tierWeights`, Config-driven).
- Basic/Premium are shown only when the viewer's country matches the brand's country snapshot;
  Pro campaigns set to `global: true` are shown to everyone.

---

## 5. Spin & Prize System — **new**

### `POST /spins` — authenticated only
Consumes the oldest unspent spin credit. **Hard-rejects**: unauthenticated callers (`401`),
unverified email or incomplete profile (`403`, message names what's missing).

Response:
```json
{
  "success": true,
  "spin": {
    "_id": "...",
    "outcomeType": "cash" ,
    "prizePoolItemId": "...",
    "decision": "pending"
  },
  "tryAgainStatus": { "tryAgainCount": 12, "distanceToNextBenchmarks": { "50": 38, "100": 88 } }
}
```
`outcomeType` ∈ `cash | brand_product | discount30 | discount50 | try_again`. A win
(`decision: "pending"`) is **not** auto-finalized — the player must decide (see below).

Server-side mechanics (not directly visible to the client, documented for context):
- Every spin rolls a bucket via the Config-driven win-type distribution
  (`spin.winTypeDistribution`: cash 40%, brand product 20%, 30%-discount 25%, 50%-discount 15%).
- The admin's daily prize pool (`prizePool.defaultDailyCount`, default 100/day) is spread across
  24 hourly release windows — an item can't be won before its release hour, so the day's supply
  can't be exhausted in the first hour.
- If the rolled bucket has no available item in the current hour's window, the outcome is
  `try_again` (increments the player's `tryAgainCount`) even though a bucket was "won" internally.
- The randomness is auditable: `GET /spins/:spinResultId/verify` (public) independently
  recomputes the outcome from the stored seed, same approach as the legacy raffle draw
  verification.

### `POST /spins/wins/:spinResultId/decision` — `{ decision: "redeem" | "decline" }`
- `redeem`: cash credits the wallet; every other outcome issues a single-use discount code.
  Resets `tryAgainCount` to 0 — **only** for wins from a normal (cycle-completion-earned) spin
  credit; guaranteed wins from spending a try-again benchmark (below) do not reset it, since
  spending already deducted the benchmark amount.
- `decline`: the prize is forfeited; `tryAgainCount` is untouched either way.
- Returns `409`-style `400` if the spin was already decided.

### `GET /spins/try-again/status` — `{ tryAgainCount, distanceToNextBenchmarks }`

### `POST /spins/try-again/spend` — `{ benchmark: 50 | 100 }`
Spends the benchmark amount for a guaranteed-win spin on a discount-only board (50 → 20% off,
100 → 50% off; no `try_again` outcome possible). Deducts exactly `benchmark` from
`tryAgainCount`, preserving any remainder — e.g. a user at 130 can spend 100 and keep 30, or
spend 50 and keep 80. Returns the same shape as `POST /spins` (a pending decision to redeem or
decline).

### `GET /spins/:spinResultId/verify` — public

---

## 6. Wallet & Referrals — **behavior changed, no route changes**

- Cash spin wins credit the existing wallet (`GET /wallet/balance`, `/wallet/transactions`,
  withdrawal endpoints — all unchanged) via a new ledger reason, `spin_win`.
- Referral qualification is now anti-fraud gated: a referral counts as qualified only once the
  referee has **verified their email, completed their profile, and finished one full 5-ad
  cycle** (previously: a points threshold, which no longer exists). `GET /referrals/my-stats`
  etc. are unchanged routes; a referrer now earns a **discount code** (not points) at 20 and 40
  qualified referrals — 20 → 20%-off-any-product code, 40 → 50%-off code.

---

## 7. Marketplace — **new**

### `POST /marketplace/products` — brand only — `{ name, description, priceUSD, category, deliveryAsset? , fulfillmentInstructions? }`
Digital products only; at least one of `deliveryAsset` (link) or `fulfillmentInstructions` is
required.

### `GET /marketplace/products`, `GET /marketplace/products/:productId` — public

### `POST /marketplace/checkout` — `{ productId, discountCode?, email }`
Validates the discount code server-side (owner match, unused, not expired) and applies it
before charging. A 100%-off code skips Paystack entirely and delivers immediately. Otherwise
returns a Paystack `authorization_url` like the campaign payment flow.

### `GET /marketplace/orders/:reference/verify`, `GET /marketplace/orders/mine`

On payment success, the order is delivered (`deliveredAt`, `deliveryPayload` snapshotted from
the product) and any discount code used is marked `redeemed` — single-use enforced at the
model level.

---

## 8. Admin — **new**

### `POST /admin/prize-pool/:date` — admin only — `{ items: [{ type, bucket, value, fundingSource, campaignId?, quantityTotal, description? }] }`
`date` is `YYYY-MM-DD`. `bucket` ∈ `cash | brand_product | discount30 | discount50` — this is
what the win-type roll matches against; `type` is a free-form label (e.g.
`"internet_subscription"`, `"dstv_subscription"`) tagged into whichever bucket it should be won
under. Each item's `quantityTotal` is automatically spread across the day's 24 hourly release
windows (idempotent per date/type/hour — calling this twice doesn't double the pool).

### `GET /admin/prize-pool/:date` — admin only — the full seeded pool for a day

### `GET /admin/config`, `PUT /admin/config/:key` — **unchanged routes, new keys**
Relevant new keys: `campaign.tierPrices` (`{basic:20, premium:30, pro:50}` USD),
`payment.usdToNgnRate`, `campaign.activeDays` (30), `campaign.tierWeights`
(`{basic:1, premium:2, pro:3}`), `spin.adsPerCycle` (5), `spin.winTypeDistribution`,
`spin.tryAgainBenchmarks` (`{50:"discount20", 100:"discount50"}`), `referral.qualifiedThresholds`
(`{20:"discount20", 40:"discount50"}`), `prizePool.defaultDailyCount` (100),
`video.maxDurationSeconds` (~95), `video.maxSizeBytes`.

---

## 9. Removed

- `POST/GET /sessions/*` (4-game + video + quiz session flow)
- `GET /leaderboards/weekly`, `/leaderboards/weekly/:weekKey`, `/leaderboards/all-time`
- `GET /raffles/*` (per-campaign weekly raffle draws)
- `GET/POST /brands/campaigns`, `/campaigns/*` (old puzzle-campaign CRUD)
- `GET /packages`, `POST /packages` (old Basic/Premium `Package` collection — tiers are now
  Config-driven, not a DB-backed package list)
- `POST /campaigns/generate-questions` (AI passage→quiz generator — all quiz questions are
  now brand-authored about the video, no AI path)

Underlying MongoDB collections for the above are left in place (archived, not deleted) —
only the routes are unmounted. The single shared Paystack webhook
(`POST /payments/webhook`) stays mounted and now dispatches by `Transaction.entityType`
(`legacy_campaign | ad_campaign | marketplace_order`) to the correct activation logic.

---

## 10. Config-Driven Values Frontends Should Not Hardcode

Tier USD prices, the USD→NGN rate, the 30-day campaign activation window, tier ad-rotation
weights, ads-per-cycle (5), the win-type distribution percentages, try-again benchmark
thresholds/boards, and referral reward thresholds are all admin-adjustable via `GET /admin/config`
and can change without a deploy — fetch them rather than hardcoding client-side where practical.
