# Changelog for Frontend

What actually changed in the API surface, for anyone who worked against the old SpinBoard product ("watch 5 ads, answer 3 quiz questions per ad, spin a wheel") **or** against an earlier build of Pazzell that still had a marketplace checkout flow. If you're building fresh against this API with no history, you can skip this file — `API_GUIDE.md` and `BUSINESS_RULES.md` describe the current system standalone.

## Freebie codes now take over the billboard (most recent change)

A live freebie code used to be visible in exactly one place: pinned in the perimeter strip. It now **also** takes over one billboard slot, full-screen, for a fixed stretch of time (`Config: freebie.billboardSlotSeconds`, default 60s) — exactly like a real ad — so the freebie moment interrupts the ad reel instead of only ever being a small pin at the edge of the screen. This is additive: the strip flow described below is completely unchanged, a live code is simultaneously pinned in the strip and (once, per session) a billboard takeover.

- **Changed shape**: `GET /billboard/queue` slots can now have `type: "FREEBIE"` alongside the existing `"AD"`/`"HOUSE"`: `{ slotId, type: "FREEBIE", codeId, publicCode, valueLabel, freebieType: "AIRTIME"|"CASH", liveUntil, durationSec }`. No `videoUrl` — build a code-announcement graphic (code, value, an Apply box or a route into one) instead of a video player for this slot type.
- **Build this**: play a `FREEBIE` slot through the exact same loop as `AD`/`HOUSE` — render for `durationSec`, send the same `heartbeat`/`complete` calls on the same `slotId` mechanics. A given code takes over the billboard at most once per session, even though it stays pinned in the strip for its whole live window — don't expect one on every queue fetch, most return none. A completed `FREEBIE` slot doesn't count toward analytics or referral qualification (it's not a real ad).
- See `UI_CONTRACT.md`'s "Freebie takeover slots" section for the full contract.

## Ad campaign moderation revamp: pre-publish review → post-hoc takedown

Admin no longer approves or rejects a campaign's video before it goes live — `POST /ad-campaigns/:campaignId/moderate` is gone. A campaign now goes live (`status: "ACTIVE"`, `moderationStatus: "APPROVED"`) the instant payment succeeds, with no waiting period. This supersedes every "pending review" mention further down in this file and in `BUSINESS_RULES.md`/`FRONTEND_IMPLEMENTATION_GUIDE.md` — those described the state as it existed briefly between the SpinBoard→Billboard revamp and this one; there is no pending-review state to build UI for anymore.

Admin's moderation role now happens after the fact instead: pulling an inappropriate video off the billboard even though it's live and already paid for, and undoing a takedown made by mistake. Both are bulk, multi-select operations, not single-campaign actions:

- **Removed**: `POST /ad-campaigns/:campaignId/moderate`. Remove any single-campaign approve/reject UI calling it.
- **New**: `POST /ad-campaigns/deactivate` — `{ campaignIds: string[], reason? }` → `{ success, matched, deactivated }`. `POST /ad-campaigns/reactivate` — `{ campaignIds: string[] }` → `{ success, matched, reactivated, skippedExpired: string[] }`. `skippedExpired` campaigns need the brand to re-pay, since reactivating doesn't revive a lapsed activation window for free.
- **Unchanged shape**: `moderationStatus`/`moderationReason`/`moderatedBy`/`moderatedAt` on `AdCampaign` are still set, just by the instant-activation/deactivation code path instead of an admin review decision.

## Marketplace revamp: store → business directory

The marketplace used to be a small digital-goods store (list a product, pay via Paystack, get a discount code applied at checkout). It is now a **business directory/catalogue** — brands publish a contact profile, users browse and reach out directly. This is a separate, later change from the SpinBoard→Billboard revamp described in the rest of this file.

- **Removed entirely**: `POST /marketplace/checkout`, `GET /marketplace/orders/*`, the `Order` model, the `DiscountCode` model/service, and every discount-code-related field (`MarketplaceProduct.priceUSD/priceLocal/currency/deliveryAsset/fulfillmentInstructions`). Don't build a cart, checkout form, discount-code input, or order-history screen for the marketplace — none of it has a backend anymore.
- **New**: a business profile per brand (`PUT /marketplace/business/profile`, `GET .../mine`) with `businessName`, `businessDescription`, `logoUrl`/`coverImageUrl`, `contactEmail`/`contactPhone`/`whatsappNumber`, `address`, `socialLinks`, and an explicit `isListed` publish toggle; a public directory (`GET /marketplace/businesses`, filterable by category/country/state/city/search); and a business detail page (`GET /marketplace/businesses/:brandId`) showing the profile plus its active products.
- **Changed shape**: `MarketplaceProduct` still exists (create/update/delete under `/marketplace/products*`) but dropped every price/checkout field in favor of `images: string[]` and an optional free-text `priceLabel` (e.g. `"From ₦5,000"`, never a charged amount). `GET /marketplace/products/:productId` now also returns the owning business's contact info under `business`.
- **Referral rewards changed from discount codes to wallet cash** as a direct consequence — see below.

See `BUSINESS_RULES.md`'s "The marketplace is a directory, not a store" section and `DATA_MODELS.md`'s Marketplace section for full current-state detail.

## Removed entirely — do not build UI for any of this

- **Spin wheel.** No spin endpoint, no spin result, no prize-wheel UI of any kind.
- **Quiz-after-each-ad.** `AdCampaign.questions[]` is gone from the schema. Watching an ad no longer gates on answering questions.
- **The 5-ad-cycle gate.** There was never a fixed "watch 5, then you're allowed to X" structure to begin with anymore — the billboard just plays continuously.
- **"Try again" credit economy.** `User.tryAgainCount`, `/spins/try-again/spend` — gone.
- **Geographic/demographic ad targeting.** `AdCampaign.geoTarget` is gone. Every viewer everywhere sees the same eligible pool. If you're porting old code that filtered ads by viewer country, delete that logic — it has no server-side equivalent anymore, on purpose.
- **Automated wallet withdrawal.** `POST /wallet/withdrawals` and the transfer webhook route no longer exist in the mounted API. There is no self-serve cash-out. See `BUSINESS_RULES.md`.
- **Discount codes, full stop.** Not just their expiry — the `DiscountCode` model no longer exists at all, removed along with marketplace checkout. See the marketplace-revamp section above.
- **Puzzle-game system** (separate from the above — this was already dead/unreachable before this revamp, just formally deleted now): campaigns, sessions, raffles, meetings, tickets, packages. If your old frontend build still calls any puzzle-game route, those 404 now.

## New — build these

- **Billboard**: `POST /billboard/session`, `GET /billboard/queue`, `POST /billboard/impressions/heartbeat`, `POST /billboard/impressions/complete`. See `UI_CONTRACT.md`.
- **Freebie codes**: `GET /freebies/strip` (+ SSE variant), `GET /freebies/phrases`, `POST /freebies/apply` (single endpoint for both claiming and redeeming), `GET /me/claims`, `POST /me/claims/:claimId/redeem`. See `UI_CONTRACT.md` and `BUSINESS_RULES.md`.
- **Weekly payout run status** surfaced on `GET /wallet/balance` (`payoutThreshold`, `amountToThreshold`, `nextPayoutDate`) — new fields on an existing endpoint, not a new endpoint.
- **Campaign moderation status** (`moderationStatus`) on `AdCampaign` — a Basic/Premium campaign brand dashboard should now show "pending review" / "approved" / "rejected" state, since paying doesn't put a campaign live by itself anymore.
- **Campaign lifecycle states expanded**: `status` went from `draft|active|inactive` to `DRAFT|PENDING_PAYMENT|ACTIVE|PAUSED|EXPIRED|REJECTED`. If old frontend code switches on the three old lowercase values, it needs updating — `PAUSED`/`REJECTED`/`PENDING_PAYMENT` are states a brand dashboard can now actually encounter.
- **Flat campaign pricing**: no more brand-selectable 1–12 week duration / per-week price. It's a flat 30-day activation at `$20` Basic / `$30` Premium (`Config: campaign.tiers`). If old UI had a duration picker on campaign creation, remove it — there's nothing to select anymore.

## Changed shape, same endpoint

- `GET /wallet/balance`: added `payoutThreshold`, `amountToThreshold`, `nextPayoutDate`. Existing `balance`/`currency` fields unchanged.
- `WalletTransaction.reason` gained new values (`FREEBIE_CASH`, `PAYOUT_SETTLED`, `ADJUSTMENT`, `REVERSAL`, `REFERRAL_REWARD`) alongside the old lowercase ones, which can still appear on historical rows.
- **Referral milestone reward**: was a percent-off `DiscountCode` (`source: "referral"`), now a flat wallet-cash credit (`reason: "REFERRAL_REWARD"`, `Config: referral.qualifiedThresholds` values are now NGN amounts, not discount-bucket keys) — a direct consequence of removing marketplace checkout (a discount needs something to discount). If old frontend code reveals a discount code on a referral milestone, replace it with a wallet-balance-updated notification instead.
- `AdCampaign`: `questions`/`geoTarget` removed; `moderationStatus`/`moderationReason`/`moderatedBy`/`moderatedAt` added; `status` enum expanded (above); `numberOfWeeks` is now legacy-only (unset on any campaign created after this revamp).
- `GET /analytics/app`: `totalGamesPlayed`/`gamesPlayedToday`-style counters are now Billboard-sourced (`totalAdsWatched`, `adsWatchedToday` — verified completed impressions, house fillers excluded), not puzzle-session-sourced. The field names in the response also changed to match — check the actual response shape in `API_GUIDE.md` rather than assuming the old field names still apply.
- **Referral qualification event**: used to fire on completing a full ad-cycle; now fires on one server-verified completed Billboard impression (`POST /billboard/impressions/complete`). No frontend action needed — this happens server-side — but if you're wondering why a referral converts "faster" now than the old product, this is why: the gate is lighter (one real verified view vs. a 5-ad cycle) by design, since the ad-cycle structure it used to hook into no longer exists.

## Unchanged — build against these exactly as before

Auth (`/auth/*`, `/registration`, `/login`, `/refresh`), user profile (`/me`, `/profile/*`, `/settings`), forum (`/forum/*`), bank accounts (`/wallet/bank-accounts*`), brand/ad-campaign creation and payment flow shape (`/ad-campaigns`, `/ad-payments/*` — only the pricing/duration inputs and post-creation lifecycle changed, described above). Referrals (`/referrals/*`) are unchanged as *endpoints* — only the reward payout mechanism changed, see above. The marketplace is **not** unchanged — see the dedicated section at the top of this file.
