# Config Reference

Every tunable number/object the backend uses is a `Config` row, readable via `GET /admin/config` (admin-only, returns every key merged: DB override if set, otherwise the default below) and editable via `PUT /admin/config/:key` (`{ value, description? }`). None of these need to be hardcoded in the frontend — read them from `GET /admin/config` for an admin settings screen, or from the specific public-facing values that leak into non-admin responses (e.g. `payoutThreshold`/`nextPayoutDate` on `GET /wallet/balance`, already-substituted `{seconds}`/`{value}` tokens in the strip feed).

Only the keys relevant to the current (post-revamp) product are listed. The old puzzle-game-era keys (`pricing.*.weeklyPrice`, `payout.rankDistribution`, `payout.playerSharePercent`/`platformSharePercent`, `raffle.*`, `points.sessionCompletionPoints`, `spin.tryAgainBenchmarks`) have been removed from the backend entirely, not just left undocumented — they no longer exist as `Config` keys at all.

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
| `freebie.dailyCashCount` | `5` | Target CASH drops per day. Cash-only since the airtime cutover (see `BUSINESS_RULES.md`) — the `freebie.dailyAirtimeCount` counterpart that used to sit next to this no longer exists. |
| `freebie.dailyClaimCap` | `{ AIRTIME: 1, CASH: 1 }` | Per-user, per-type, rolling-24h claim cap. Still keyed by type even though only `CASH` can ever be hit going forward — a pre-cutover `AIRTIME` claim can still exist historically, and the underlying claim-race code stayed generic over type on purpose. |
| `freebie.activeHours` | `{ start: "08:00", end: "23:00", timeZone: "Africa/Lagos" }` | Window drops are scheduled within. Never exposed to any client response — scheduling input only. |
| `freebie.minGapMinutes` | `20` | Minimum spacing between any two drops going live. |
| `freebie.liveWindowMinutes` | `{ AIRTIME: 10, CASH: 10 }` | How long a code stays `AVAILABLE` once live before rotating off unclaimed. Same "still keyed by type" note as `dailyClaimCap` above. |
| `freebie.redDisplaySeconds` | `60` | How long a just-claimed code stays visible (red/`TAKEN`) in the strip before dropping out. |
| `freebie.maxConcurrentLive` | `3` | Max simultaneously-`AVAILABLE` codes. |
| `freebie.feedCacheTtlMs` | `3000` | `Cache-Control: max-age` on `GET /freebies/strip` — keep polling faster than this to see state changes promptly. |
| `freebie.billboardSlotSeconds` | `60` | How long a live freebie code's one-time full-screen billboard takeover (`type: "FREEBIE"` in `GET /billboard/queue`) lasts — capped shorter if the code's `liveUntil` is sooner. See `UI_CONTRACT.md`. |
| `freebie.recentCatchesFeedSize` | `8` | Row count for `GET /freebies/recent-catches`'s "who just won" feed. |

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

## Promote & Earn

| Key | Default | Meaning |
|---|---|---|
| `promote.deviceDailyLikeCap` | `20` | Rolling-24h like cap per `X-Device-Id`, across accounts. No account-age gate exists any more — a brand-new account can vote immediately; the real gate is one vote per user per (promoter, campaign) pair (structural, not config-tuned) — a liker can still vote once on each distinct campaign a given promoter shares. |
| `promote.ipDailyLikeCap` | `50` | Same, per IP. |
| `promote.periodDurationDays` | `7` | Reference default only, for prefilling an admin "open a period" form's `periodEnd` from `periodStart` — not enforced server-side; an admin can open a period of any length. |
| `promote.autoPeriod.enabled` | `true` | Kill switch for the automatic weekly prize-period open/settle job — set `false` to fall back to fully manual admin control with no deploy needed. |
| `promote.autoPeriod.prizeDescription` | `"Weekly Promote & Earn cash prize"` | Prize description used when the weekly job auto-opens a period. |
| `promote.autoPeriod.prizeAmountNgn` | `10000` | Prize amount (₦) credited to the winner when the weekly job auto-settles a period it auto-opened. |

## Ad moderation

| Key | Default | Meaning |
|---|---|---|
| `adModeration.autoFlagReportThreshold` | `3` | Viewer reports on one campaign, within the window below, before it auto-flags for admin attention. |
| `adModeration.autoFlagWindowMinutes` | `60` | Window the report threshold above is counted within. |
| `adModeration.suspendStrikeThreshold` | `3` | Brand strikes (from warn or takedown actions) before automatic suspension. |

## B2B Projects & Quotations

| Key | Default | Meaning |
|---|---|---|
| `quotationUnlock.priceNgn` | `5000` (NGN) | Flat price of one account-wide unlock pass (`POST /quotation-unlock/purchase`). |
| `quotationUnlock.durationDays` | `30` | How long an unlock pass lasts. Renewing while a pass is still active extends from its current expiry, not from the purchase moment. |

## Business ratings moderation

| Key | Default | Meaning |
|---|---|---|
| `businessRating.autoFlagReportThreshold` | `3` | Reports on one rating, within the window below, before it surfaces on `GET /admin/business-ratings/moderation/flags`. Same shape as `adModeration.autoFlagReportThreshold`, but a separate counter — a rating and an ad campaign never share flag state. |
| `businessRating.autoFlagWindowMinutes` | `60` | Window the report threshold above is counted within. |
