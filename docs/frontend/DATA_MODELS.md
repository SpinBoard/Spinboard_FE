# Data Models

Shapes as they actually appear in API responses (camelCase, Mongo `_id` as string, dates as ISO 8601 strings). This is not a database schema dump — internal-only fields (password hashes, encrypted payloads, hash indexes) are omitted since the API never returns them.

Every model below is either **new** (built for the Billboard + Freebie Codes revamp) or **unchanged/preserved** from before it. Anything marked **changed** had its shape altered by this revamp — see `CHANGELOG_FOR_FRONTEND.md` for what specifically moved.

---

## Billboard

### BillboardSession — new
Returned only as `sessionId` from `POST /billboard/session`; never fetched directly.
```
sessionId: string
```

### Board stats (`GET /billboard/stats`) — new
```
watchingNow: number      // sessions active in the last 5 minutes
codesToday: number       // freebie codes that went live today (platform-timezone midnight boundary, NOT server-local — same convention as every other "today" figure in this API)
adsInRotation: number    // campaigns currently status:"ACTIVE" + moderationStatus:"APPROVED"
```

### Watch streak (`GET /billboard/my-streak`) — new
```
streakDays: number
```
Consecutive calendar days (platform timezone, `Config: freebie.activeHours.timeZone`) up to and including today or yesterday with at least one server-verified COMPLETED, non-house-filler, non-freebie-slot billboard impression. Doesn't reset to 0 just because today has no completed view yet — it only breaks on an actual gap day.

### Queue slot — changed
One item in the array returned by `GET /billboard/queue`. Shape depends on `type`.
```
slotId: string           // opaque, single-use — pass back verbatim to heartbeat/complete
type: "AD" | "HOUSE" | "FREEBIE"
durationSec: number

// AD only
campaignId?: string
brandName?: string
title?: string
videoUrl?: string
clickUrl?: string | null   // campaign's campaignUrl, else brandUrl, else null — navigate immediately on tap, report via POST /billboard/impressions/click afterward (fire-and-forget)

// HOUSE only
title?: string
videoUrl?: string

// FREEBIE only — a live freebie code taking over this slot full-screen, exactly
// like a real ad. See UI_CONTRACT.md's "Freebie takeover slots" section.
codeId?: string
publicCode?: string
valueLabel?: string
freebieType?: "AIRTIME" | "CASH"   // named freebieType, not type, so it can't collide with the slot's own "type": "FREEBIE"
liveUntil?: string
```

### Impression — changed (never returned directly; internal analytics record)
Not exposed via any GET endpoint. Referenced here because `slotId` in the queue response is its client-facing handle. Every field is captured once, at slot-issuance time, and never re-derived later:
```
slotId, sessionId, ownerType: "user"|"anonymous", ownerId, authenticated: boolean,
campaignId?, isHouseFiller: boolean, isFreebieSlot: boolean, freebieCodeId?, durationSec, issuedAt, status: "issued"|"heartbeat"|"completed",
watchedMs, completed: boolean, completedAt?, clicked: boolean, clickedAt?,
profileCountry?, profileState?, profileCity?, ageBand?, sex?,   // authenticated viewers only
ipCountry?, device?, os?, browser?, referrer?, slotPosition?, localDateKey?
```
`ipCountry` is IP-geolocation, kept **separate** from `profileCountry` and never used to gate anything — the two are expected to disagree sometimes (VPNs, travel). Anonymous viewers get everything except the profile-demographic fields — they're never dropped from totals, just bucketed `"Unknown"` in reporting.

---

## Freebie codes, prizes, claims

### Strip feed item — new
One item in the array returned by `GET /freebies/strip`. Two `kind`s share one array so the frontend can render both PINNED and SCROLLING elements from a single fetch.
```
kind: "FREEBIE" | "PROMO"
display: "PINNED" | "SCROLLING"

// FREEBIE only
positionHint?: "TOP" | "BOTTOM" | "LEFT" | "RIGHT"
codeId?: string
publicCode?: string        // the code text to display — type this to claim
valueLabel?: string        // e.g. "₦500 MTN Airtime", "₦1,000 Cash"
type?: "AIRTIME" | "CASH"
state?: "AVAILABLE" | "TAKEN"   // TAKEN = just claimed by someone, shown red until it drops off
liveUntil?: string          // ISO datetime — when a still-AVAILABLE code rotates off if unclaimed

// PROMO only
text?: string                // scrolling copy, may include a live value/countdown already substituted in
```
There is no field anywhere in this payload (or any other public endpoint) describing a *future* drop — codes only exist in the feed once they're actually live. See `BUSINESS_RULES.md`.

### FreebiePrizeItem — new, admin-only
```
_id: string
batchId: string           // groups everything from one bulk-create call
type: "AIRTIME" | "CASH"   // cash-only going forward — see BUSINESS_RULES.md. AIRTIME can still appear on a
                            // pre-cutover historical record; nothing new is ever created with this type any more.
value: number
currency: string           // "NGN"
carrier?: string            // AIRTIME only, informational, historical — never a country/carrier filter anywhere
country?: string            // AIRTIME only, informational, historical
status: "PENDING" | "ASSIGNED" | "CLAIMED" | "REDEEMED" | "EXHAUSTED" | "VOID"
timesAssigned: number
createdBy: string
voidedReason?: string
voidedBy?: string
voidedAt?: string
```
The PIN itself is never in this shape. It's readable only via `POST /admin/freebie-prizes/:id/reveal-pin`, a separate, audit-logged call — still live, but only ever meaningful for a pre-cutover `AIRTIME` record now.

### FreebieLowInventoryAlert (`GET /admin/freebie-prizes/low-inventory` — `{success, alerts: FreebieLowInventoryAlert[]}`) — new, admin-only
```
type: "CASH"                     // always CASH now — cash-only cutover, see BUSINESS_RULES.md
pendingCount: number             // current status:"PENDING" CASH stock
dailyNeed: number                // Config: freebie.dailyCashCount
daysOfStockRemaining: number     // pendingCount / dailyNeed — Infinity if dailyNeed is 0
```
An entry only appears here at all when `daysOfStockRemaining < 1` (i.e. under a full day of drops left in stock) — an empty `alerts` array means stock is adequate, not "no data yet." No `carrier`/`inStock`/`dailyTarget` fields — this response is a flat summary against the configured daily drop count, not a per-batch or per-carrier breakdown. Still returns an array (not a bare object), kept stable even though only one entry is possible now.

### FreebieCode — new (admin schedule views only; the public shape is the strip feed item above)
```
_id: string
prizeItemId: string
type: "AIRTIME" | "CASH"
valueLabel: string
publicCode: string
status: "AVAILABLE" | "TAKEN" | "ROTATED"
liveFrom: string
liveUntil: string           // rotation time for an UNCLAIMED code — not an expiry on anything won
takenBy?: string
takenAt?: string
redDisplayUntil?: string
positionHint: "TOP" | "BOTTOM" | "LEFT" | "RIGHT"
```

### Claim — changed (`publicCode` added)
Returned by `POST /freebies/apply` (claim branch), `GET /me/claims`, `POST /me/claims/:id/redeem`, and admin lookup.
```
claimId: string
type: "AIRTIME" | "CASH"
valueLabel?: string          // present on the CLAIMED response
value?: number
currency?: string
publicCode?: string          // new — the code as it appeared on the board when won (GET /me/claims only)
status?: "ISSUED" | "REDEEMED" | "VOID"
issuedAt?: string
redeemedAt?: string
secretCode?: string          // decrypted, visible to the owner forever — never has a deadline
```
**Nothing on a Claim ever expires.** There is no `expiresAt` field on this model, on purpose — see `BUSINESS_RULES.md`.

### Recent catch (`GET /freebies/recent-catches`) — new
```
displayName: string     // username, falling back to name — same convention as the Promote & Earn leaderboard, never masked
type: "AIRTIME" | "CASH"
valueLabel: string
takenAt: string
```

### Next drop window (`GET /freebies/next-drop-window` — `{success, nextDropWindow: NextDropWindow | null}`) — new
```
windowStart: string   // ISO UTC instant — start of a fixed 1-hour clock bucket
windowEnd: string      // ISO UTC instant — always exactly windowStart + 1h
timeZone: string        // platform timezone the bucket was computed in (Config: freebie.activeHours.timeZone)
```
`null` means nothing is currently scheduled to check back for. Deliberately coarse: guaranteed to contain the next drop's real time, but never the exact time and never the type (airtime/cash) — see `BUSINESS_RULES.md`.

### Daily limit status (`GET /freebies/limits/mine`) — new
```
type: "AIRTIME" | "CASH"
cap: number
claimedToday: number
remaining: number
resetsAt?: string        // present only once claimedToday >= cap
```

### Apply responses (`POST /freebies/apply`) — new
Claim branch (submitted value matched a live public code):
```
action: "CLAIMED"
claimId: string
type: "AIRTIME" | "CASH"
valueLabel: string
secretCode: string
```
Redeem branch, CASH (submitted value matched the caller's own secret code):
```
action: "REDEEMED"
claimId: string
type: "CASH"
walletBalance: number       // balance AFTER this credit
redeemedAt: string
```
Redeem branch, AIRTIME (only reachable for a claim won before the cash-only cutover — see `BUSINESS_RULES.md`; no new AIRTIME claim can be created, but keep this branch's UI working for anyone with an old one in their history):
```
action: "REDEEMED"
claimId: string
type: "AIRTIME"
display: string              // human-readable, e.g. "₦500 Airtime — MTN Nigeria — 1234567890123"
rechargeString: string       // the dial string to actually recharge with
redeemedAt: string
```
Re-submitting an already-redeemed secret code returns the **same shape again** (current wallet balance / the same PIN), not an error — see `BUSINESS_RULES.md`.

### Phrase — new
```
_id: string
slot: "PROMO" | "FREEBIE_LIVE" | "FREEBIE_GONE" | "WELCOME" | "EMPTY_STATE"
text: string                 // may contain literal "{value}" / "{seconds}" tokens (admin view only —
                              // the public feed always returns tokens already substituted)
weight: number
active: boolean
createdBy: string
```

### AbuseRejectionLog — new, admin-only
```
_id: string
reason: "DEVICE_LIMIT_REACHED" | "IP_LIMIT_REACHED"
endpoint: string
userId?: string
deviceId?: string
ip?: string
createdAt: string
```

---

## Wallet & payouts

### Wallet balance (`GET /wallet/balance`) — changed
```
balance: number
currency: "NGN"
payoutThreshold: number       // Config: payout.threshold
amountToThreshold: number     // max(0, payoutThreshold - balance)
nextPayoutDate: string         // ISO date of the next scheduled weekly payout weekday
```

### WalletTransaction — changed (new `reason` values added, nothing removed)
```
_id: string
userId: string
type: "credit" | "debit"
amount: number                // always positive; `type` gives direction
balanceAfter: number
reason: "weekly_payout" | "withdrawal" | "withdrawal_reversal" | "admin_adjustment"
       | "spin_win" | "migration_payout"
       | "FREEBIE_CASH" | "PAYOUT_SETTLED" | "ADJUSTMENT" | "REVERSAL" | "PROMOTE_GRAND_PRIZE"
       | "WALLET_TOPUP" | "QUOTATION_UNLOCK"
referenceId?: string
status: "completed" | "reversed"
createdAt: string
```
`FREEBIE_CASH`, `PAYOUT_SETTLED`, `ADJUSTMENT`, `REVERSAL`, `PROMOTE_GRAND_PRIZE` are new. `PROMOTE_GRAND_PRIZE` is credited when a Promote & Earn prize period with a cash `prizeAmount` is settled — see the Promote & Earn section below. `WALLET_TOPUP` (credit) and `QUOTATION_UNLOCK` (debit) are the newest additions — a **business** funding its wallet via Paystack and spending that balance on an unlock pass; see "B2B Projects & Quotations" below. This is the first time this ledger has ever recorded a business crediting/debiting its own wallet rather than the platform crediting a viewer's. The lowercase legacy reasons (`weekly_payout`, `withdrawal`, ...) can still appear on old rows; nothing writes them going forward. `REFERRAL_REWARD` existed briefly (referral rewards, paid as wallet cash) but the referral feature has since been removed entirely — don't build against it.

### BankAccount — unchanged
```
_id: string
bankCode: string
bankName: string
accountNumber: string
accountName: string           // Paystack-resolved, never user-typed
verified: boolean
isDefault: boolean
```
No longer feeds an automated withdrawal (that feature is unmounted). Still exactly what a payout run's CSV export uses.

### PayoutRun — new, admin-only
```
_id: string
periodStart: string
periodEnd: string
createdBy: string
status: "DRAFT" | "LOCKED" | "COMPLETED" | "CANCELLED"
totalAmount: number           // snapshotted at open time
userCount: number
lockedAt?: string
completedAt?: string
```

### PayoutRunItem — new, admin-only
```
_id: string
runId: string
userId: string
amount: number                 // snapshotted at open time — never re-read from the live wallet
status: "PENDING" | "PAID" | "SKIPPED" | "FAILED"
reference?: string
notes?: string
paidBy?: string
paidAt?: string
method?: string                 // e.g. "bank_transfer", informational only
```

---

## Ad campaigns (brand side) — changed

```
_id: string
brandId: string
tier: "basic" | "premium"
title: string
description: string
brandUrl?: string
campaignUrl?: string
videoUrl: string
videoDurationSeconds: number
videoSizeBytes: number
videoMimeType: string
priceUSD?: number               // flat tier price, snapshotted at go-live
exchangeRateSnapshot?: number
priceLocal?: number
currency: string
status: "DRAFT" | "PENDING_PAYMENT" | "ACTIVE" | "PAUSED" | "EXPIRED" | "REJECTED"
paymentStatus: "unpaid" | "paid"
moderationStatus: "PENDING" | "APPROVED" | "REJECTED"
moderationReason?: string
moderatedBy?: string
moderatedAt?: string
flagged: boolean                 // new — auto-set once viewer reports cross a threshold; see BUSINESS_RULES.md
flaggedAt?: string                // new
flagReasons: string[]             // new
activatedAt?: string
expiresAt?: string               // activatedAt + 30 days (flat) for anything activated post-revamp;
                                  // older grandfathered campaigns keep their original week-based value
```
`status` and the moderation fields are new/changed — see `CHANGELOG_FOR_FRONTEND.md`. There is **no** `questions[]` or `geoTarget` field anymore; both were removed along with the quiz/targeting mechanics.

On `GET /ad-campaigns/mine` (brand), each item also carries `playsToday: number` and `completionRateToday: number | null` — a lightweight rollup-derived glance, not the deep Premium-gated analytics.

On `GET /ad-campaigns` (admin), each item also carries `reportCount: number`, `reportCountLastHour: number`, `brandStrikeCount: number`, `brandSuspended: boolean` — see the "Ad moderation" section below.

On `GET /ad-campaigns/:campaignId/analytics` (Premium-only), the `analytics` object gained `costPerCompletedView: number | null` (`priceLocal / completedViews`), and `clicks: number` / `clickThroughRate: number` (`clicks / impressions`, `0` if no impressions yet) — website-link click-throughs, tracked per `Impression.clicked`. `analytics.timeSeries` points and the `/analytics/export.csv` rows also each carry a `clicks` count now (CSV header: `date,impressions,completedViews,clicks`). `analytics.uniqueViewers` was already present before this batch.

### Ad moderation — new

**AdReport** (internal — never returned as a standalone list, only as counts on the admin `AdCampaign` list above):
```
campaignId: string
reportedBy: string
reason: string
createdAt: string
```
One per user per campaign — a second report from the same user on the same campaign is a silent no-op.

**Report response** (`POST /ad-campaigns/:campaignId/report`):
```
reported: boolean    // false on a duplicate report — not an error
flagged: boolean      // whether the campaign is now (or already was) flagged
```

**Warn response** (`POST /ad-campaigns/:campaignId/warn`, admin):
```
campaign: AdCampaign  // updated, flagged cleared
strikeCount: number    // the brand's new total
autoSuspended: boolean // true if this warn just crossed the suspend threshold
```

**Brand suspend response** (`POST /admin/brands/:brandId/suspend`):
```
pausedCampaigns: number   // how many of the brand's ACTIVE campaigns were paused as a result
```

`Brand` (surfaced via `GET /profile/brand`'s `brandDetails`, see the User section for the rest of that shape) gained:
```
registrationNumber?: string   // e.g. a CAC "RC" number, informational/display only, never validated
strikeCount: number
suspended: boolean
suspendedReason?: string
kycStatus: "not_submitted" | "pending_review" | "verified" | "rejected" | "revoked"   // new — see "Business KYC" section below; the single field every KYC gate checks
```

---

## User & auth — role renamed (`gamer` → `viewer`, breaking), one new field, one new profile-completeness rule

```
_id: string
firstName?: string
lastName?: string
username?: string
email: string
avatar?: string
role: "viewer" | "brand" | "admin"
isVerified: boolean
age?: number
sex?: "man" | "woman" | "prefer_not_to_say"
country?: string
state?: string
city?: string
phone?: string           // new — display/contact only, never used for auth
notifications: { emailNotifications, leaderboardUpdates, newCampaignAlerts, weeklyDigest: boolean }
privacy: { showOnLeaderboard: boolean }
createdAt: string
updatedAt: string
```
`country` is still collected and still required for "complete profile" (age + sex + country + state + city, plus `isVerified`), but **no endpoint anywhere uses it to filter or target content** — see `BUSINESS_RULES.md`. Profile completeness is the gate for claiming a freebie code, not for watching the billboard.

`role` was previously `"gamer"`, renamed breaking to `"viewer"` — see `CHANGELOG_FOR_FRONTEND.md`. Routes that spelled out the old name also renamed: `GET/PUT /profile/gamer` → `GET/PUT /profile/viewer`, `POST /auth/gamer/register` → `POST /auth/viewer/register`.

---

## Marketplace — business directory (rebuilt; was a checkout store)

The marketplace is a business directory/catalogue, not a store — see `BUSINESS_RULES.md`. There is no product price a user pays in-app, no order, and no discount code; `DiscountCode`/`Order`/checkout have been removed from the API entirely. `brandId` below is always the brand's **User** `_id` (matching `AdCampaign.brandId`'s convention elsewhere in the API) — never a separate "business id."

### Business profile (`GET /marketplace/businesses`, `GET /marketplace/businesses/:brandId`, `GET .../business/profile/mine`)
```
brandId: string                 // the brand's User _id
businessName: string             // falls back to the account's companyName if unset
businessDescription?: string
logoUrl?: string
coverImageUrl?: string
category: string[]               // businessCategories
contactEmail?: string
contactPhone?: string
whatsappNumber?: string
address?: string
country?: string
state?: string
city?: string
socialLinks: {
  website?: string, instagram?: string, facebook?: string,
  twitter?: string, tiktok?: string, linkedin?: string, youtube?: string
}
isListed: boolean                // whether this profile appears in the public directory at all
isListable?: boolean             // present only on the brand's own "mine" read — true once name + ≥1 contact method are set, i.e. whether isListed:true would be accepted
```
A business only appears in `GET /marketplace/businesses` and its products only appear in `GET /marketplace/products` while `isListed: true`. Unpublishing a business (`isListed: false`) hides both the profile and every one of its products from public view in one move — no need to also touch each product.

### Product / service showcase (`MarketplaceProduct`)
```
_id: string
brandId: string
name: string
description: string
category: string
images: string[]                 // photo URLs — empty array is valid (no photo uploaded yet)
priceLabel?: string              // free-form display text ("₦5,000", "From $20", "Contact for quote") — never a typed/charged amount
isActive: boolean
createdAt: string
updatedAt: string
```
`GET /marketplace/products/:productId` additionally returns a `business` object (the same shape as the business profile above) denormalized alongside the product, so a single call gives a visitor everything needed to reach out about that specific item without a second request.

---

## Promote & Earn — new

See `BUSINESS_RULES.md` and `UI_CONTRACT.md`'s "Promote & Earn" section for the full flow. Not related to the marketplace above — this is a separate, brand-new feature.

### PromoCampaign (`GET /promote/campaigns/:campaignId`, `GET /promote/campaigns/mine`, `GET /promote/campaigns` admin)
```
_id: string
brandId: string
brandName: string
title: string
description: string
mediaUrl: string
mediaType: "image" | "video"
videoDurationSeconds?: number    // video only
status: "ACTIVE" | "PAUSED"
likeCount: number                // all-time, informational — NOT a prize-period total, see LeaderboardEntry below
clickCount?: number               // mine/admin only — total link-follows across every promoter's link on this campaign
signupCount?: number              // mine/admin only — of those clicks, how many led to a new account (see PromoLinkClick below)
createdAt: string
updatedAt: string
```
`clickCount`/`signupCount` are present on `GET /promote/campaigns/mine` (brand) and `GET /promote/campaigns` (admin) only — not on the public `GET /promote/campaigns/:campaignId` detail read, which stays `likeCount`-only (see `BUSINESS_RULES.md`).

### PromoLink (`POST /promote/campaigns/:campaignId/links`, `GET /promote/links/mine`)
A viewer's personal share link for one campaign — minted once, reused on every subsequent request for the same campaign.
```
linkId: string
campaignId: string
campaign?: { title, mediaUrl, mediaType, status }   // only on GET /promote/links/mine
slug: string
shareUrl: string                 // ready-to-post full URL
clickCount: number                // GET /promote/links/mine only — distinct browsers that followed this link
signupCount: number                // GET /promote/links/mine only — of those, how many went on to create an account
likeCount: number                // likes attributed to THIS link specifically
createdAt: string
```

### Share-link landing page (`GET /promote/l/:slug` — public)
What a shared link itself resolves to — call this (not `GET /promote/campaigns/:campaignId`, which needs a campaignId the visitor doesn't have) when rendering the page a follower actually lands on. Every call also logs a funnel click for the visiting browser.
```
campaignId: string
linkId: string
promoterUserId: string
campaign: { ...same shape as GET /promote/campaigns/:campaignId's campaign }
```
Deduped per (link, browser) — a page refresh doesn't create a second click. Works whether or not the visitor is logged in; no auth required. `404 LINK_NOT_FOUND` for an unknown slug.

### PromoPrizePeriod (`GET /promote/leaderboard`'s `period`, `GET /admin/promote/periods`)
The platform-wide grand-prize window. **Auto-managed weekly by default** — a daily job opens a Mon 00:00 → next Mon 00:00 (platform timezone) period if none exists yet for that week, and settles any `OPEN` period once its `periodEnd` has passed; see `BUSINESS_RULES.md`. An admin can still open/settle/cancel one manually at any time via the same endpoints.
```
_id: string
periodStart: string
periodEnd: string
prizeDescription: string
prizeAmount?: number             // unset = non-cash prize, fulfilled manually by the admin
currency?: string
status: "OPEN" | "SETTLED" | "CANCELLED"
createdBy: string                // a real admin userId, or the literal string "system" for an auto-opened period
winnerUserId?: string
winningLikeTotal?: number
settledBy?: string               // a real admin userId, or the literal string "system" for an auto-settled period
settledAt?: string
```

### LeaderboardEntry (`GET /promote/leaderboard`'s `entries[]`)
```
rank: number
promoterUserId: string
displayName: string
likeCount: number                 // CUMULATIVE across every campaign this promoter shared, within the period's window
```
This `likeCount` — not any single `PromoCampaign.likeCount` — is what decides the grand prize: it sums a promoter's non-voided likes across every campaign they've minted a link for, inside `periodStart`–`periodEnd`.

---

## Forum — existing, not previously documented here

### ForumThread (`GET /forum/threads`, `POST /forum/threads`)
```
_id: string
title: string
createdBy: string          // userId
category?: string
pinned: boolean            // admin-controlled; pinned threads sort first
locked: boolean            // admin-controlled; a locked thread rejects new posts (400)
createdAt: string
updatedAt: string
```
Listed sorted `pinned desc, createdAt desc`.

### ForumPost (`GET /forum/threads/:id/posts`, `POST /forum/threads/:id/posts`)
```
_id: string
threadId: string
userId: string
body: string                // max 5000 chars
imageUrls?: string[]
moderationStatus: "visible" | "hidden" | "removed"
likeCount: number           // cached counter, kept in sync by like/unlike
createdAt: string
updatedAt: string
```
`GET /forum/threads/:id/posts` excludes `"removed"` posts only — a `"hidden"` post (set via admin flag resolution, see BUSINESS_RULES.md) still comes back in this list.

### ForumLike (no direct read endpoint — reflected via `ForumPost.likeCount`)
```
postId: string
userId: string
```
Unique per `(postId, userId)`. `POST /forum/posts/:id/like` → `{ liked: boolean }` (`false` = already liked, not an error). `DELETE /forum/posts/:id/like` → `{ unliked: boolean }` (`false` = wasn't liked).

### ForumFlag (`GET /forum/moderation/flags` — admin)
```
_id: string
postId: string
flaggedBy: string           // userId
reason: string
status: "open" | "resolved" | "dismissed"
createdAt: string
```
No unique index on `(postId, flaggedBy)` — unlike `AdReport`/`BusinessRatingReport` elsewhere in this API, the same user can flag the same post more than once.

### WinnerShareSubmission (`GET /forum/winner-submissions/mine`, `GET /forum/winner-submissions` — admin)
```
_id: string
userId: string
campaignId: string
postUrl: string
claimedLikeCount?: number   // self-reported, never independently verified
status: "submitted" | "verified" | "rejected"
adminReviewerId?: string
adminNotes?: string
reviewedAt?: string
bonusPointsGranted?: number // set once verified — Config: forum.winnerShareBonusPoints, default 5
createdAt: string
```
Status transitions are one-way once resolved: `"rejected"` can never become `"verified"`, and vice versa.

---

## Business KYC — new

### BusinessKyc (`GET /kyc/me`, `GET /admin/kyc/queue`, `GET /admin/kyc/:id`)
```
_id: string
brandId: string
rcNumber: string
businessType?: string              // "RC" | "BN" | "IT" — CAC registration category
legalBusinessName: string
automatedCheck: {
  result: "not_run" | "match" | "no_match" | "provider_error"
  checkedAt?: string
  providerRawResponse?: any         // admin-view only, opaque
  providerError?: string
}
documents: {
  cacCertificateUrl?: string
  repIdUrl?: string
  repIdType?: string                // e.g. "NIN" | "drivers_license" | "passport" | "voters_card"
  uploadedAt?: string
}
status: "not_submitted" | "pending_review" | "verified" | "rejected" | "revoked"
reviewedBy?: string                 // admin userId
reviewedAt?: string
rejectionReason?: string
revokedReason?: string
revokedBy?: string
revokedAt?: string
submittedAt: string
attemptNumber: number               // increments on resubmission after a rejection
createdAt: string
updatedAt: string
```
`automatedCheck.result` is informational only — it never determines `status` on its own; see `BUSINESS_RULES.md`. A resubmission after rejection is a brand-new document (`attemptNumber + 1`), not an edit of the rejected one, so `GET /kyc/me` always reflects the single most recent submission.

---

## B2B Projects & Quotations — new

### Project (`GET /projects`, `GET /projects/mine`, `GET /projects/:id`)
```
_id: string
brandId: string                    // poster
title: string
description: string
budgetMin?: number
budgetMax?: number
currency: string                    // default "NGN"
category?: string
deadline?: string
status: "open" | "closed" | "cancelled"
quotationCount: number              // total ever submitted, regardless of paywall visibility
freeQuotationId?: string            // which Quotation is the poster's free-to-view one — internal bookkeeping, the frontend just reads GET /projects/:id/quotations rather than resolving this itself
createdAt: string
updatedAt: string
```

### Quotation (`GET /projects/:id/quotations`, `GET /admin/projects/:id/quotations`)
```
_id: string
projectId: string
brandId: string                    // quoter
amount: number
currency: string
message: string
attachmentUrls?: string[]
status: "submitted" | "withdrawn"
withdrawnAt?: string
createdAt: string
updatedAt: string
```

### Visible-quotations response (`GET /projects/:id/quotations`)
```
quotations: Quotation[]             // 1 item if unlocked:false, all submitted quotations if unlocked:true
unlocked: boolean
totalQuotationCount: number          // same as Project.quotationCount — lets the UI show "1 of 4 visible" even while gated
```

### QuotationUnlockPass status (`POST /quotation-unlock/purchase`, `GET /quotation-unlock/status`)
```
active: boolean
expiresAt?: string                  // absent when active:false
```
`POST /quotation-unlock/purchase` returns just `{ expiresAt }` on success (purchasing always results in an active pass, so `active` is implied true).

---

## Business contact & ratings — new

### BusinessContactThread (`GET /business-contact/threads`)
```
_id: string
projectId: string
quotationId: string
posterBrandId: string
quoterBrandId: string
lastMessageAt?: string
createdAt: string
updatedAt: string
```

### BusinessContactMessage (`GET /business-contact/threads/:id/messages`)
```
_id: string
threadId: string
senderBrandId: string
body: string
createdAt: string
```

### BusinessRating (`GET /business-ratings/business/:brandId`'s `ratings[]`)
```
_id: string
projectId: string
quotationId: string
raterBrandId: string
ratedBrandId: string
score: number                       // 1-5
comment?: string
hidden: boolean                      // always false in this public read — hidden ratings are excluded entirely, not returned with a flag
createdAt: string
```

### Business rating summary (`GET /business-ratings/business/:brandId`)
```
averageScore: number                // 0 if count is 0
count: number
ratings: BusinessRating[]
```

### Report rating response (`POST /business-ratings/:id/report`)
```
reported: boolean                    // false on a duplicate report from the same business — not an error
flagged: boolean                      // whether the rating is now (or already was) over the auto-flag threshold
```

---

## Admin dashboard — new, field shape only documented here

### Admin dashboard (`GET /admin/dashboard`)
```
dashboard: {
  liveViewers: number                 // BillboardSessions with lastActivityAt in the last 5 minutes
  verifiedViews: {
    total: number                     // all-time server-verified completed ad impressions (house-filler and freebie-takeover slots excluded)
    today: number                     // same, since platform-timezone midnight — NOT server-local midnight
  }
  activeCampaigns: number             // status:ACTIVE + moderationStatus:APPROVED count
  codesLiveNow: number                // FreebieCode status:AVAILABLE count
  prizesDistributedToday: number      // Claims issued since platform-timezone midnight
  outstandingWalletLiability: number  // SUM(Wallet.balance) across every user — every naira sitting in a wallet, credited but not yet paid out
  nextPayoutRun: {
    userCount: number                 // wallets currently at/above Config: payout.threshold
    totalAmount: number                // their summed balance
  }                                    // a LIVE preview of what opening a payout run right now would look like — not a snapshot of a committed run, recomputed on every read
  profileCompletionFunnel: {
    total: number                      // viewer-role users
    verified: number                   // isVerified:true
    profileComplete: number            // age+sex+country+state+city all set
  }
  codesDroppedVsClaimed: {
    dropped: number                    // AVAILABLE + TAKEN + ROTATED FreebieCodes
    claimed: number                    // TAKEN
    rotatedUnclaimed: number           // ROTATED (nobody claimed it before it rotated off)
  }
  averageTimeToClaimSeconds: number | null  // avg(takenAt - liveFrom) across every TAKEN code; null if none exist yet
  airtimeRedemptionRate: number        // 0-1 fraction, REDEEMED / total AIRTIME claims — legacy only, airtime drops are discontinued (see BUSINESS_RULES.md) but historical AIRTIME claims still count here; 0 if none exist
  unredeemedClaimsByAge: {
    "<1d": number
    "1-7d": number
    "7-30d": number
    ">30d": number
  }                                    // ISSUED (won but not yet redeemed) claims bucketed by age — a growing pile in the older buckets is a UX health signal, per the product brief
}
```
`success: true` wraps the above, same as every other endpoint. Admin-only (`403` for anyone else). This is the same "today" boundary convention used everywhere else in this API (platform timezone, not server-local) — see `BUSINESS_RULES.md`'s billboard section.

---

## Config value shapes (admin-only)

See `CONFIG.md` for the full key list. A few shapes worth calling out because the frontend may render them as structured forms rather than a raw JSON textarea:
```
"campaign.tiers"        -> { basic: {price, weight, analytics}, premium: {price, weight, analytics} }
"rateLimit.claim" etc.  -> { limit: number, windowSeconds: number }
"freebie.dailyClaimCap" -> { AIRTIME: number, CASH: number }
"freebie.liveWindowMinutes" -> { AIRTIME: number, CASH: number }
"freebie.activeHours"   -> { start: "HH:MM", end: "HH:MM", timeZone: "Africa/Lagos" }
"billboard.houseFillers"-> [{ title, videoUrl, durationSec, filler }]
```

---

## Standard error shape

Every non-2xx response from every endpoint documented here (with one legacy exception noted below):
```
success: false
message: string
code?: string          // machine-readable — branch on this, not on `message` text
details?: object        // present on a few errors that carry structured data, e.g.
                         // DAILY_LIMIT_REACHED: { type: "CASH"|"AIRTIME", resetsAt: string }
```
**Exception**: a request to any `isAuthenticated`-gated route with no `Authorization` header at all returns `{ error: "Authentication Failed" }` (no `success` field, different key) — a pre-existing quirk in `utils/auth.ts`, not something this revamp introduced or fixed. Every other auth failure (bad/expired token) goes through the standard shape above with `statusCode: 401`.

New codes from this batch: `BRAND_SUSPENDED` (403, ad campaign / go-live payment / campaign resume / Promote & Earn creation), `ADMIN_TAKEDOWN` (403, a brand trying to self-resume a campaign an admin took down).
