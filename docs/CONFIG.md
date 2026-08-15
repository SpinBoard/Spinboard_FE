# Config Reference

Every tunable number/object the backend uses is a `Config` row, readable via `GET /admin/config` (admin-only, returns every key merged: DB override if set, otherwise the default below) and editable via `PUT /admin/config/:key` (`{ value, description? }`). None of these need to be hardcoded in the frontend — read them from `GET /admin/config` for an admin settings screen, or from the specific public-facing values that leak into non-admin responses (e.g. `payoutThreshold`/`nextPayoutDate` on `GET /wallet/balance`, already-substituted `{seconds}`/`{value}` tokens in the strip feed).

Only the keys relevant to the current (post-revamp) product are listed. A handful of legacy keys (`pricing.*.weeklyPrice`, `payout.rankDistribution`, `raffle.*`, `spin.tryAgainBenchmarks`) still exist in the backend purely so a one-time migration script and old data stay readable — they have no live consumer and the frontend should never read or display them.

## Billboard

| Key | Default | Meaning |
|---|---|---|
| `video.maxDurationSeconds` | `60` | Hard ceiling on an uploaded ad video's length. |
| `video.maxSizeBytes` | `25 * 1024 * 1024` (25MB) | Upload size ceiling. |
| `campaign.tiers` | `{ basic: {price:20, weight:1, analytics:false}, premium: {price:30, weight:2, analytics:true} }` | One object drives price (flat USD, one-time), ad-rotation weight, and analytics access together. |
| `payment.usdToNgnRate` | `1550` | FX rate applied at go-live to convert `priceUSD` to `priceLocal`. |
| `campaign.activeDurationDays` | `30` | Flat activation window from successful payment. |
| `billboard.houseFillers` | list of `{title, videoUrl, durationSec, filler}` | Shown when the eligible ad pool is empty — the billboard never returns nothing. |
| `billboard.completionWatchFraction` | `0.95` | Fraction of `durationSec` that must be watched for a slot to count as completed. |
| `billboard.heartbeatToleranceMs` | `3000` | Wall-clock jitter grace window for heartbeat validation. |
| `billboard.defaultQueueSize` | `5` | Default `GET /billboard/queue` batch size when `size` isn't passed. |

## Freebie prizes & drops

| Key | Default | Meaning |
|---|---|---|
| `freebie.dailyAirtimeCount` / `freebie.dailyCashCount` | `5` / `5` | Target drops per type per day. |
| `freebie.dailyClaimCap` | `{ AIRTIME: 1, CASH: 1 }` | Per-user, per-type, rolling-24h claim cap — capped on one type doesn't block the other. |
| `freebie.activeHours` | `{ start: "08:00", end: "23:00", timeZone: "Africa/Lagos" }` | Window drops are scheduled within. Never exposed to any client response — scheduling input only. |
| `freebie.minGapMinutes` | `20` | Minimum spacing between any two drops going live, cross-type. |
| `freebie.liveWindowMinutes` | `{ AIRTIME: 10, CASH: 10 }` | How long a code stays `AVAILABLE` once live before rotating off unclaimed. |
| `freebie.redDisplaySeconds` | `60` | How long a just-claimed code stays visible (red/`TAKEN`) in the strip before dropping out. |
| `freebie.maxConcurrentLive` | `3` | Max simultaneously-`AVAILABLE` codes. |
| `freebie.feedCacheTtlMs` | `3000` | `Cache-Control: max-age` on `GET /freebies/strip` — keep polling faster than this to see state changes promptly. |

## Anti-abuse

| Key | Default | Meaning |
|---|---|---|
| `freebie.deviceDailyCap` | `3` | Rolling-24h claim cap per `X-Device-Id`, **across accounts** — send a stable device identifier header on every claim. |
| `freebie.ipDailyCap` | `10` | Same, per IP. Deliberately generous (shared/carrier NAT). |
| `rateLimit.claim` | `{ limit: 20, windowSeconds: 60 }` | `POST /freebies/apply`, route-level (covers both claim and redeem attempts on that endpoint). |
| `rateLimit.redeem` | `{ limit: 5, windowSeconds: 60 }` | Tighter, enforced inside the redemption path specifically — the money-creating operation. |
| `rateLimit.feed` | `{ limit: 30, windowSeconds: 60 }` | `GET /freebies/strip`, IP-keyed. |
| `freebie.suspiciousClaimLatencyMs` | `500` | Below this many ms between a code's `liveFrom` and being claimed, the claim is flagged (not blocked) for admin review. |

A `429` from any rate limit uses the standard error shape with `code: "TOO_MANY_ATTEMPTS"`. A `403` from a device/IP ceiling uses `code: "DEVICE_LIMIT_REACHED"` or `"IP_LIMIT_REACHED"` — the message never states the numeric threshold; don't try to parse one out of it.

## Wallet & payout

| Key | Default | Meaning |
|---|---|---|
| `payout.threshold` | `1500` (NGN) | Minimum wallet balance to be included in a weekly payout run. |
| `payout.weekday` | `5` (Friday, JS `Date#getDay` convention: 0=Sunday) | Publishes when `nextPayoutDate` on `GET /wallet/balance` lands. |

## Analytics

| Key | Default | Meaning |
|---|---|---|
| `analytics.minCohort` | `10` | Minimum viewers a demographic bucket must contain before `GET /ad-campaigns/:id/analytics/breakdown` returns it — smaller buckets are silently dropped, not shown with a small real number. |

## Referral

| Key | Default | Meaning |
|---|---|---|
| `referral.qualifiedThresholds` | `{ "20": 1000, "40": 2500 }` | Qualified-referral count → flat wallet-cash reward (NGN), reason `REFERRAL_REWARD`. |
| `referral.pointsThreshold` | `21` | Points a referred user must earn for the referral to count as qualified. |
| `referral.referrerBonusPoints` | `5` | Bonus points credited to the referrer on qualification. |
