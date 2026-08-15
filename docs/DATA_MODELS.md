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

### Queue slot — new
One item in the array returned by `GET /billboard/queue`.
```
slotId: string          // opaque, single-use — pass back verbatim to heartbeat/complete
type: "AD" | "HOUSE"     // HOUSE = house-filler, shown when the real ad pool is empty
campaignId?: string      // AD only
brandName?: string       // AD only
title: string
videoUrl: string
durationSec: number
```

### Impression — new (never returned directly; internal analytics record)
Not exposed via any GET endpoint. Referenced here because `slotId` in the queue response is its client-facing handle. Every field is captured once, at slot-issuance time, and never re-derived later:
```
slotId, sessionId, ownerType: "user"|"anonymous", ownerId, authenticated: boolean,
campaignId?, isHouseFiller: boolean, durationSec, issuedAt, status: "issued"|"heartbeat"|"completed",
watchedMs, completed: boolean, completedAt?,
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
batchId: string           // groups everything from one CSV upload / one bulk-create call
type: "AIRTIME" | "CASH"
value: number
currency: string           // "NGN"
carrier?: string            // AIRTIME only, informational — never a country/carrier filter anywhere
country?: string            // AIRTIME only, informational
status: "PENDING" | "ASSIGNED" | "CLAIMED" | "REDEEMED" | "EXHAUSTED" | "VOID"
timesAssigned: number
createdBy: string
voidedReason?: string
voidedBy?: string
voidedAt?: string
```
The PIN itself is never in this shape. It's readable only via `POST /admin/freebie-prizes/:id/reveal-pin`, a separate, audit-logged call.

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

### Claim — new
Returned by `POST /freebies/apply` (claim branch), `GET /me/claims`, `POST /me/claims/:id/redeem`, and admin lookup.
```
claimId: string
type: "AIRTIME" | "CASH"
valueLabel?: string          // present on the CLAIMED response
value?: number
currency?: string
status?: "ISSUED" | "REDEEMED" | "VOID"
issuedAt?: string
redeemedAt?: string
secretCode?: string          // decrypted, visible to the owner forever — never has a deadline
```
**Nothing on a Claim ever expires.** There is no `expiresAt` field on this model, on purpose — see `BUSINESS_RULES.md`.

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
Redeem branch, AIRTIME:
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
       | "FREEBIE_CASH" | "PAYOUT_SETTLED" | "ADJUSTMENT" | "REVERSAL" | "REFERRAL_REWARD"
referenceId?: string
status: "completed" | "reversed"
createdAt: string
```
`FREEBIE_CASH`, `PAYOUT_SETTLED`, `ADJUSTMENT`, `REVERSAL`, `REFERRAL_REWARD` are new. `REFERRAL_REWARD` is what a referrer's milestone reward now pays out as (previously a percent-off `DiscountCode` — removed along with marketplace checkout, since there's nothing left to discount; see `CHANGELOG_FOR_FRONTEND.md`). The lowercase legacy reasons (`weekly_payout`, `withdrawal`, ...) can still appear on old rows; nothing writes them going forward.

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
activatedAt?: string
expiresAt?: string               // activatedAt + 30 days (flat) for anything activated post-revamp;
                                  // older grandfathered campaigns keep their original week-based value
```
`status` and the moderation fields are new/changed — see `CHANGELOG_FOR_FRONTEND.md`. There is **no** `questions[]` or `geoTarget` field anymore; both were removed along with the quiz/targeting mechanics.

---

## User & auth — unchanged shape, one new profile-completeness rule

```
_id: string
firstName?: string
lastName?: string
username?: string
email: string
avatar?: string
role: "gamer" | "brand" | "admin"
isVerified: boolean
age?: number
sex?: "man" | "woman" | "prefer_not_to_say"
country?: string
state?: string
city?: string
notifications: { emailNotifications, referralBonusAlerts, leaderboardUpdates, newCampaignAlerts, weeklyDigest: boolean }
privacy: { showOnLeaderboard: boolean }
createdAt: string
updatedAt: string
```
`country` is still collected and still required for "complete profile" (age + sex + country + state + city, plus `isVerified`), but **no endpoint anywhere uses it to filter or target content** — see `BUSINESS_RULES.md`. Profile completeness is the gate for claiming a freebie code, not for watching the billboard.

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
