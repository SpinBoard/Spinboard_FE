# UI Contract: Billboard + Perimeter Strip

The core screen of the product: a video billboard in the center, with text strips scrolling around its perimeter. This document describes what the backend guarantees so the frontend can build the screen without guessing at timing/polling behavior.

## Layout concept (not prescriptive — the backend has no opinion on pixels)

```
┌─────────────────────────────────────────────┐
│  ↕ scrolling / pinned strip (TOP)            │
│┌───────────────────────────────────────────┐│
││ ↕                                       ↕  ││
││ L                                       R  ││
││ E          VIDEO BILLBOARD              I  ││
││ F        (billboard/queue slots)        G  ││
││ T                                       H  ││
││                                         T  ││
│└───────────────────────────────────────────┘│
│  ↕ scrolling / pinned strip (BOTTOM)          │
└─────────────────────────────────────────────┘
```
Each strip item carries `positionHint: "TOP"|"BOTTOM"|"LEFT"|"RIGHT"` (freebie items only — promo phrases have no position, they're just scrolling text wherever the design puts scrolling text). The backend picks *what* is live; the frontend decides *where on screen* each position hint renders and how it animates.

## Video billboard flow

1. On page load: `POST /billboard/session` → get `sessionId`. Works with or without auth — `optionalAuth` resolves a logged-in user if a valid token is present, otherwise an anonymous session cookie is set automatically (nothing for the frontend to manage).
2. `GET /billboard/queue?sessionId=...&size=5` → an array of slots, each with a **single-use** `slotId`. Fetch a fresh batch when the queue runs low; don't try to reuse a `slotId` across two different play-throughs.
3. Play each slot's `videoUrl` for `durationSec`. Send `POST /billboard/impressions/heartbeat { sessionId, slotId, watchedMs }` periodically while playing (every few seconds is reasonable — the backend allows some wall-clock jitter, `Config: billboard.heartbeatToleranceMs`, default 3000ms).
4. On the video ending (or the viewer skipping past 95% watched — `Config: billboard.completionWatchFraction`): `POST /billboard/impressions/complete { sessionId, slotId, watchedMs }`. This is what counts as a "verified view" for analytics — an unverified/very-short view does not count.
5. Move to the next slot in the queue. When the queue is exhausted, fetch another batch with the same `sessionId` (it accumulates `recentCampaignIds` server-side so you won't see the same ad twice in a row or within the last 5).

A slot's `type` is `"AD"` (real brand campaign, has `campaignId`/`brandName`), `"HOUSE"` (a filler — no campaign metadata), or `"FREEBIE"` (see below). Render `AD` and `HOUSE` the same way visually; house fillers exist purely so the stream is never empty, not as a distinct ad unit the user needs to recognize.

### Click-through link on AD slots

An `"AD"` slot may carry `clickUrl: string | null` — render it as a clickable link/button overlaid on (or alongside) the video whenever it's non-`null`; `HOUSE` and `FREEBIE` slots never have one, so don't reserve UI space for it on those. On tap:
1. Navigate to `clickUrl` **immediately** — the frontend already has the URL from the queue response, don't wait on a server round-trip before opening it.
2. Separately, fire `POST /billboard/impressions/click { sessionId, slotId }` — fire-and-forget, same as the heartbeat calls; it's purely for click-through analytics, not a gate on navigating, and it's safe to call even if the user somehow taps twice (idempotent).

## Watch screen headline stats & streak

Two small public/auth reads to power the "what's happening" numbers and personal-streak elements around the player, independent of the queue/session flow above:

- `GET /billboard/stats` — public. `{ stats: { watchingNow, codesToday, adsInRotation } }`. Poll this on whatever cadence feels right for a live-feeling counter (no dedicated Config for this one — a few seconds to a minute is reasonable, it's cheap).
- `GET /billboard/my-streak` — auth required (this one hard-401s without a token, unlike everything else on this router). `{ streakDays: number }`. Fetch once per page load for a signed-in viewer; no need to poll — it only changes once per day at most. Don't build a "streak reset to 0" alarm state the moment a new day starts with no view yet — the streak only actually drops once a full day is skipped.
- `GET /freebies/recent-catches` — public. `{ catches: [{ displayName, type, valueLabel, takenAt }] }`. A small, recent-first "who just won" list — fetch alongside the strip feed poll, or on its own slower interval; it changes far less often than the strip.

## Freebie takeover slots

A live freebie code doesn't only sit pinned in the perimeter strip — it also takes over one billboard slot, full-screen, for a fixed stretch of time, exactly like a real ad. This is deliberate: the code being about to interrupt the ad reel is what makes people keep watching instead of tuning out.

- A `"FREEBIE"` slot looks like this in the `GET /billboard/queue` response:
  ```
  { slotId, type: "FREEBIE", codeId, publicCode, valueLabel, freebieType: "AIRTIME"|"CASH", liveUntil, durationSec }
  ```
  (`freebieType` is named that, not `type`, specifically so it can't be confused with the slot's own `type: "FREEBIE"`.)
- Treat it exactly like an `AD`/`HOUSE` slot in the playback loop: render it for `durationSec` (normally `Config: freebie.billboardSlotSeconds`, default 60s — capped shorter if the code's `liveUntil` is closer than that), and still send the same `heartbeat`/`complete` calls on the same `slotId` mechanics as every other slot. There's no video file for it — build this as a graphic/animated takeover screen (code, `valueLabel`, a countdown, an Apply box or a direct route into one), not a video player.
- The code shown full-screen is the **same** code still pinned in the perimeter strip — both surfaces are live simultaneously, this isn't a separate/different code. It can still be claimed by a different viewer (via the strip, or their own billboard takeover) while it's showing on this screen; the Apply flow's existing `409 CODE_ALREADY_TAKEN` handling (see below) is how that race resolves — no special handling needed here beyond what the Apply box already does. If you want the takeover screen itself to flip to a "claimed" state before the user even tries, poll `GET /freebies/strip` during the slot (you're likely already polling it for the perimeter strip) and check that code's `codeId` for `state: "TAKEN"`.
- A given freebie code takes over the billboard **at most once per session** — once shown, `GET /billboard/queue` won't hand you that same `codeId` as a `FREEBIE` slot again, even though it may still be live and pinned in the strip. If multiple codes are concurrently live, only one appears as a takeover per queue fetch; the others surface on a later fetch once this one's been consumed, not all at once.
- A queue fetch can return zero `FREEBIE` slots — that's the normal case (nothing new live, or everything currently live has already taken over this session once). Don't build UI that assumes one shows up on every fetch.

## Strip feed flow

1. Poll `GET /freebies/strip` on an interval. The response sets `Cache-Control: max-age=<Config: freebie.feedCacheTtlMs / 1000>` (default 3s) — poll at roughly that cadence; polling much faster gains nothing since the value doesn't change between cache windows, and there's a rate limit (`Config: rateLimit.feed`, default 30/min/IP) that a too-aggressive poll could hit. An SSE alternative exists at `GET /freebies/strip/events` if the frontend prefers a push model over polling — same payload, re-sent on the same cadence.
2. The response is one flat array mixing `kind: "FREEBIE"` (pinned) and `kind: "PROMO"` (scrolling) items — filter/group client-side by `display`.
3. Render every `FREEBIE` item with `state: "AVAILABLE"` as **static/pinned, not scrolling** — it needs to be readable and typeable, that's the entire mechanic. A `state: "TAKEN"` item is the same code, now shown differently (e.g. red/struck-through) for a short grace window before it disappears from the feed entirely (`Config: freebie.redDisplaySeconds`, default 60s) — this is what lets a viewer who almost typed it fast enough see "someone beat me to it."
4. Render `PROMO` items as continuously scrolling text. Some of these are contextual — a `FREEBIE_LIVE`-slot phrase already has `{value}`/`{seconds}` substituted server-side (e.g. "₦500 is live — type it before someone else does!"), a `FREEBIE_GONE`-slot phrase reacts to a code just being claimed. The frontend never needs to do token substitution itself; by the time text reaches the client it's final.
5. If the feed ever returns zero `PROMO` items (shouldn't happen — the backend always falls back to an `EMPTY_STATE` phrase), don't render an empty strip; that's a bug to report, not a state to design around.

## The Apply box

One text input, one button, always visible (not just when a code is live) — a user might be typing/submitting a secret code from their claims history at any time, not only reacting to a live pinned code.

- Submit whatever the user typed to `POST /freebies/apply { code }`. Don't try to guess client-side whether it's a public code or a secret code — the backend disambiguates.
- On `action: "CLAIMED"`: show the win, the `valueLabel`, and the `secretCode` — this is the only response where the secret code appears in full going forward without navigating to claims history.
- On `action: "REDEEMED"`: show the cash credit (with new `walletBalance`) or the airtime PIN/`rechargeString`, per `type`.
- On `409 CODE_ALREADY_TAKEN`: this is an expected, common outcome (someone else won the race) — show a "just missed it" state, not an error toast.
- On `403 DAILY_LIMIT_REACHED`: use `details.type` and `details.resetsAt` to say specifically "you've already claimed your cash freebie today — resets at 14:32" rather than a generic limit message.
- On `403 PROFILE_INCOMPLETE`: deep-link to profile completion rather than just showing the raw message.
- On `401`: prompt login/signup — the code the user typed is still live for them to retry immediately after authenticating.

## Claims history screen

`GET /me/claims` → full list, every secret code visible (decrypted) regardless of age or status — there is no "this is too old to show" state to design for. Each item's `status` (`ISSUED`/`REDEEMED`/`VOID`) determines whether to show an Apply/Redeem action (`ISSUED`) or just the result (`REDEEMED`) or a voided notice (`VOID`, admin-only action, rare). `POST /me/claims/:claimId/redeem` is the same redemption operation as typing the secret code into the Apply box — offer it as a one-tap "Redeem" button next to each `ISSUED` item so the user doesn't have to copy-paste their own code. Each item also carries `publicCode?` now — the code as it appeared on the board when won; render it as a small reference column/label, it's informational only, the `secretCode` is still what actually gets redeemed.

## Wallet screen

`GET /wallet/balance` gives everything needed for a "toward next payout" progress element: `balance`, `payoutThreshold`, `amountToThreshold`, `nextPayoutDate`. There is no withdraw action to wire up — see `BUSINESS_RULES.md`. Pair it with `GET /freebies/limits/mine` (`{ limits: [{ type, cap, claimedToday, remaining, resetsAt? }] }`) for a "1 of 1 cash claims used today, resets at 14:32" element — proactive, rather than only surfacing the limit reactively via a `403 DAILY_LIMIT_REACHED` on the next claim attempt.

---

# UI Contract: Ad Campaigns (Brand Dashboard & Admin Moderation)

## Brand campaign dashboard (list screen)

`GET /ad-campaigns/mine` → each campaign now carries `playsToday` and `completionRateToday` (nullable, null when `playsToday` is 0) alongside the existing fields — a lightweight "how's it doing today" glance available regardless of tier, distinct from the deeper Premium-only `GET /ad-campaigns/:campaignId/analytics*` endpoints. These numbers come from a periodic rollup job, not a live query — don't expect second-by-second accuracy, a few minutes of lag is normal.

Don't build: a "Spend today" figure (flat one-time pricing has no daily-spend concept), an "In review" status or "Send for review" action (no pre-publish moderation queue — a campaign is live the instant payment succeeds), scheduling fields on the new-campaign form (no scheduling exists), or a VAT estimate on the new-campaign form (no tax handling exists in this API).

## Campaign detail screen: brand self-serve pause/resume

For the brand's own campaign, add Pause/Resume actions independent of anything admin-side:
- `POST /ad-campaigns/:campaignId/pause` — no body, `ACTIVE` → `PAUSED`, no penalty.
- `POST /ad-campaigns/:campaignId/resume` — no body, `PAUSED` → `ACTIVE`. Handle `403 ADMIN_TAKEDOWN` distinctly from a generic error — it means an admin (not the brand) paused this one, and only the admin side can bring it back; show something like "this campaign was taken down by an admin, contact support" rather than a generic failure. Also handle `400` (activation window expired — prompt a fresh go-live payment) and `403 BRAND_SUSPENDED` (see below).
- There is never a refund tied to pausing or to an admin takedown — don't build any refund-related copy or state for either action.

## Admin: live monitor screen

This screen's report counts, flag badges, and moderation actions are real now — build against these, not disabled "coming soon" placeholders:

- `GET /ad-campaigns` (admin) → each campaign carries `reportCount` (all-time), `reportCountLastHour`, `flagged`/`flaggedAt`/`flagReasons`, `brandStrikeCount`, `brandSuspended` — everything the monitor list needs in one call, no per-row follow-up lookups required. Surface `flagged` as a visible badge; sort/filter by it if useful (client-side, no dedicated query param for it).
- **Warn** (lighter action, campaign stays live): `POST /ad-campaigns/:campaignId/warn`, `{ note }` → `{ campaign, strikeCount, autoSuspended }`. If `autoSuspended` comes back `true`, surface that clearly — the brand just crossed the strike threshold and every one of their `ACTIVE` campaigns was just paused as a side effect of this one action; don't make the admin discover that by refreshing.
- **Take down** (existing bulk action, tightened): `POST /ad-campaigns/deactivate`, `{ campaignIds: string[], reason }` — `reason` is now required, `400` if missing. Also now adds a strike per campaign taken down.
- **Suspend a brand directly** (severe-violation path, no strikes required): `POST /admin/brands/:brandId/suspend`, `{ reason }` → `{ pausedCampaigns }`. **Unsuspend**: `POST /admin/brands/:brandId/unsuspend`, no body — note in the UI that this does not un-pause any campaigns or reset the strike count; those are separate follow-up actions if the admin wants them.
- A viewer-facing "Report this ad" action (wherever the frontend surfaces one, e.g. on the billboard itself) hits `POST /ad-campaigns/:campaignId/report`, `{ reason }`, auth required, any role → `{ reported, flagged }`. Treat a repeat report from the same user as a normal, non-error confirmation ("thanks, already noted"), not a failure.

---

# UI Contract: Marketplace (Business Directory)

A separate screen family from the billboard/strip above — a browsable catalogue of businesses, not a store. See `BUSINESS_RULES.md`'s "The marketplace is a directory, not a store" section for the underlying rules; this section is specifically about what to render.

## Directory browse screen

`GET /marketplace/businesses?category=&country=&state=&city=&search=` → a list of business cards (`businessName`, `logoUrl`, `category`, `city`/`state`). Every result is already public (`isListed: true`) — no need to filter client-side. There is no pagination cursor; use `limit` and, if the result set is large in practice, add client-side "load more" against a growing `limit` rather than expecting a `nextPage` token (none exists).

## Business detail screen

`GET /marketplace/businesses/:brandId` → the full profile plus its active products in one call. Render the contact block as tappable actions, not plain text: `tel:` for `contactPhone`, `mailto:` for `contactEmail`, `https://wa.me/<digits>` for `whatsappNumber` (strip non-digit characters before building the link), and direct links out to whatever's populated in `socialLinks`. Any of these fields can be empty/absent — a business only had to supply *one* contact method to get listed, not all of them; hide whichever are blank rather than showing empty rows. A 404 here means "not found or not currently listed" — show a generic "business not found" state, not a distinct "this business unpublished itself" message (the API deliberately doesn't distinguish the two).

## Product/service showcase screen (within a business, or the global browse)

`GET /marketplace/products?category=&brandId=&search=` (global browse) or the `products` array already returned by the business-detail call above. Each card: `images[0]` as the cover photo (may be an empty array — show a placeholder), `name`, `priceLabel` if present (render as-is, it's already formatted display text — never parse it as a number or attach a currency symbol yourself). Tapping through to `GET /marketplace/products/:productId` gives the full item plus a `business` object with the same contact fields as the business-detail screen — enough to build a "Contact seller about this item" action without a second lookup.

## Brand-side: manage listing screen

For an authenticated brand account: `GET /marketplace/business/profile/mine` to load the edit form (works even before anything is filled in — every field is optional except for the publish gate). `PUT /marketplace/business/profile` saves edits; the response's `isListable` field tells you whether a "Publish" toggle can be turned on yet — grey it out and show the requirement (name + one contact method) rather than letting the brand submit `isListed: true` and bounce off a 400. Product management (`POST`/`PUT`/`DELETE /marketplace/products*`, `GET /marketplace/products/mine`) is a standard owned-resource CRUD list — no special sequencing constraints.

---

# UI Contract: Promote & Earn

A brand posts a campaign; viewers share it and compete on **one platform-wide, cumulative leaderboard** — not a per-campaign contest. If you're building from `freebiz-mockup.html`'s `v-promote`/`b-contest`/`a-contest` screens, use them for visual reference only (card shapes, the share box, the like button) — the underlying mechanic they depict (a brand-funded pot per campaign, independent per-campaign winners) is **not** what this API implements. See `BUSINESS_RULES.md`'s "Promote & Earn" section for the full rule set.

## Campaign detail / share screen

A signed-in viewer looking at a `PromoCampaign` (via `GET /promote/campaigns/:campaignId`) gets a "Share" action: `POST /promote/campaigns/:campaignId/links` → `{ link: { slug, shareUrl, ... } }`. Surface `shareUrl` with copy/share-to-platform buttons — calling this endpoint again for the same campaign returns the same link every time, so it's safe to call on every page visit rather than caching the result client-side.

## Public share-link landing page

This is what `shareUrl` resolves to (`/promote/l/:slug` client-side). On load, call `GET /promote/l/:slug` — this is the one call that resolves the slug to campaign detail (`{campaignId, linkId, promoterUserId, campaign}`) **and** logs a funnel click for the visiting browser, deduped per browser per link so a refresh doesn't inflate the count. Works whether or not the visitor is signed in — never call `GET /promote/campaigns/:campaignId` here, you don't have the campaignId yet at this point. Show the campaign's media/title/description from the response and a "Like this campaign" / "Vote" button.

- **No account-age gate on voting** — once signed in, a brand-new account can vote immediately, no waiting period.
- If the visitor isn't signed in, `POST /promote/like/:slug` 401s — prompt login/signup and retry the same call after auth, same pattern as the freebie Apply box. If they don't have an account yet, this is exactly the point they register (see `BUSINESS_RULES.md`) — the click they already made gets attributed to the new account automatically, no code for them to enter.
- `alreadyLiked: true` in a successful (`200`) response is not an error — it's the real gate: **one vote per user per (promoter, campaign) pair.** A liker can vote for as many different promoters as they want, and separately for each distinct campaign a given promoter shares (both count toward that promoter's total) — only a repeat vote for the exact same promoter+campaign pair hits this. The response includes `message: "You have already voted for this promoter on this campaign."` — show that directly, not a failure toast.
- `400 SELF_LIKE_NOT_ALLOWED` — a promoter hit their own share link's like button. Hide or disable the button client-side if you can detect "this is my own link" (compare the signed-in user to the link's owner, if you have that context) — the API rejects it either way.
- `400 CAMPAIGN_NOT_ACTIVE` — the campaign's been paused by an admin. Show it as no-longer-accepting-likes, not a generic error.
- `404 LINK_NOT_FOUND` — the slug itself doesn't resolve to anything (bad/expired link). Show a plain "this link isn't valid" state, not a generic error.

## Leaderboard screen

`GET /promote/leaderboard?periodId=` → `{ period, entries }`. This is its own screen, not nested under any one campaign — `entries[].likeCount` is each promoter's **cumulative** total across every campaign they've shared within `period`'s window, and it's this number (not any single campaign's own like count) that decides the grand prize. Omit `periodId` to get the currently `OPEN` period; a `period: null` response with empty `entries` is a normal "no round running right now" state, not an error — don't render it as a failure.

## "My shares" screen

`GET /promote/links/mine` → every link this viewer holds, each with its own `campaign` (denormalized title/media/status) and `likeCount`. Useful as a personal activity view alongside the leaderboard — but for the viewer's actual standing toward the grand prize, point them at their row in `GET /promote/leaderboard`, not a client-side sum of this list (the leaderboard is period-scoped and excludes voided likes; a naive sum here wouldn't be).

## Brand-side: post a campaign screen

`POST /promote/campaigns`, multipart `media` (image or ≤60s video) + `title`/`description`. No pot/budget field to build — posting is free, and the prize (if any) is admin-funded per period, not brand-funded per campaign. `GET /promote/campaigns/mine` lists a brand's own campaigns with all-time `likeCount` for a simple performance view.

## Admin: campaign & fraud management

Campaign moderation is the same bulk `deactivate`/`reactivate` pattern as ad campaigns (`POST /promote/campaigns/deactivate`/`reactivate`, `{ campaignIds: string[] }`) — reactive, no pre-publish queue. Separately, `POST /admin/promote/likes/:likeId/void` discounts one specific like, and `POST /admin/promote/promoters/:userId/disqualify`/`requalify` excludes/restores a promoter from every leaderboard computation globally (not scoped to one period). Build both as bulk-friendly admin actions, not one-at-a-time-only flows.

## Admin: prize periods

**Periods are now auto-managed by default — this screen is for overriding that, not the only way a period happens.** A daily job opens a Mon 00:00 → next Mon 00:00 (platform timezone) period every week if one doesn't already exist for that week, using a Config-driven default prize (`Config: promote.autoPeriod.prizeDescription`/`promote.autoPeriod.prizeAmountNgn`, default "Weekly Promote & Earn cash prize" / ₦10,000), and settles any `OPEN` period whose `periodEnd` has passed — no admin action required for the normal weekly cycle. See `BUSINESS_RULES.md` for the full mechanics. An admin can still open/settle/cancel a period manually at any time via the same endpoints as before — `POST /admin/promote/periods` (`{ periodStart, periodEnd, prizeDescription, prizeAmount?, currency? }`), `POST /admin/promote/periods/:periodId/settle` (one-way, no "unsettle" — determines the winner and, if `prizeAmount` was set, credits their wallet immediately) — typically to run a one-off prize with a different amount/description for a specific week; a manual open for a week that already has an auto-opened period would need that period cancelled first (`POST /admin/promote/periods/:periodId/cancel`), since nothing currently stops two periods from covering an overlapping window. While a period is `OPEN`, the leaderboard screen above doubles as the live standings view. Auto-opened/auto-settled periods show `createdBy`/`settledBy` as the literal string `"system"`, not a real admin id — render that as "Automatic," not a broken user reference.

---

# UI Contract: Business KYC + B2B Projects & Quotations

Two new brand-only feature areas. See `BUSINESS_RULES.md` for the underlying rules; this section is about what to render and which error codes to branch on.

## New error codes to handle explicitly

| Code | Status | Where it fires | UI treatment |
|---|---|---|---|
| `KYC_REQUIRED` | 403 | `POST /projects`, `POST /projects/:id/quotations` | Deep-link to the KYC submission screen rather than a generic error — same pattern as `PROFILE_INCOMPLETE` elsewhere. |
| `KYC_ALREADY_PENDING` | 409 | `POST /kyc/submit` | "You already have a submission under review" — show the existing `GET /kyc/me` status, don't let them submit a second form. |
| `KYC_RESUBMIT_NOT_ALLOWED` | 400 | `POST /kyc/resubmit` | Only show the resubmit action at all when `GET /kyc/me`'s `status` is `"rejected"` — this code means the UI let a resubmit attempt through when it shouldn't have been offered. |
| `KYC_NOT_VERIFIED` | 404 | `POST /admin/brands/:brandId/kyc/revoke` | Admin-side only — the revoke action shouldn't be offered for a business that isn't currently `verified`. |
| `INSUFFICIENT_BALANCE` | 402 | `POST /quotation-unlock/purchase` | Prompt a wallet top-up (`POST /wallet/topup/initialize`) directly from this error, don't just show a generic failure. |
| `QUOTATION_NOT_VISIBLE` | 403 | `POST /business-contact/threads` | Shouldn't normally be reachable if the "Contact" action is only shown next to quotations the poster can already see — treat as a bug signal if it fires. |
| `CONTACT_REQUIRED` | 403 | `POST /business-ratings` | Only show the "Rate this business" action inside an open contact thread, never as a standalone action elsewhere — same reasoning as above. |

## KYC submission screen

`GET /kyc/me` on load → `{ kyc: BusinessKyc | null }`. `null` or `status: "not_submitted"` shows the submission form (`rcNumber`, `businessType`, `legalBusinessName`, optional `cacCertificate`/`repId` file uploads); `status: "pending_review"` shows a waiting state, no form; `status: "verified"` shows a verified badge, no form; `status: "rejected"` shows `rejectionReason` plus a "Resubmit" action that reopens the same form (`POST /kyc/resubmit`); `status: "revoked"` shows the `revokedReason` and re-blocks project/quoting actions exactly like an unverified business.

Don't build an "instant verified" success state after submitting — the response is always a `pending_review` row, never `verified`, regardless of how the automated check went.

## Post a project screen (poster)

`POST /projects` — straightforward form (`title, description, budgetMin?, budgetMax?, currency?, category?, deadline?`). If `403 KYC_REQUIRED` comes back, redirect into the KYC submission screen above rather than showing a bare error — this is expected to happen for any not-yet-verified business trying this for the first time.

## Project detail / quotations screen (poster) — the paywall

`GET /projects/:id/quotations` → `{ quotations, unlocked, totalQuotationCount }`. Render the visible `quotations` normally; if `unlocked: false` and `totalQuotationCount > quotations.length`, show an "Unlock all N quotations" CTA. Tapping it calls `POST /quotation-unlock/purchase` — on success, re-fetch `GET /projects/:id/quotations` (now `unlocked: true`, full list). On `402 INSUFFICIENT_BALANCE`, route into a wallet top-up flow (`POST /wallet/topup/initialize` → Paystack redirect → `GET /wallet/topup/verify/:reference`, same shape as ad-campaign payment) before retrying the purchase. `GET /quotation-unlock/status` is useful to check proactively (e.g. show "Unlocked until 12 Oct" in a settings/billing area) without waiting for a project screen visit.

Each visible quotation should carry a "Contact" action → `POST /business-contact/threads { projectId, quotationId }` — safe to call repeatedly, it returns the existing thread if one's already open rather than erroring.

## Submit a quotation screen (quoter)

`POST /projects/:id/quotations` — `{ amount, message, attachmentUrls? }`. Same `403 KYC_REQUIRED` handling as posting a project. No edit action for a submitted quotation — offer "Withdraw" (`POST /quotations/:id/withdraw`) and let the business resubmit fresh if they want to change their number; don't build an in-place amount-edit form, the API doesn't support it.

## Contact thread screen

`GET /business-contact/threads` for the inbox list (works for both roles — a business sees threads where it's either the poster or the quoter, no separate "sent"/"received" split needed since `posterBrandId`/`quoterBrandId` tell you which). `GET /business-contact/threads/:id/messages` + `POST .../messages { body }` for a standard chat thread — no read-receipt or typing-indicator fields exist, keep it simple.

## Rate a business (after contact)

Only surface a "Rate this business" action inside an open contact thread (`projectId`/`quotationId` are both already known from the thread) — `POST /business-ratings { projectId, quotationId, ratedBrandId, score, comment? }`. `409` on attempting a second rating for the same project+direction — disable/hide the action once a rating already exists for that thread rather than letting the user hit the error.

## Business profile: ratings + report

`GET /business-ratings/business/:brandId` → `{ averageScore, count, ratings }` for a business's public reputation block (e.g. on its marketplace directory profile, `GET /marketplace/businesses/:brandId` — these are two separate calls, the marketplace profile response doesn't embed ratings). Each rating can carry a "Report" action → `POST /business-ratings/:id/report { reason }`, treat a repeat report the same non-error "already noted" way as ad-campaign reporting.

## Admin: KYC review queue

`GET /admin/kyc/queue` → oldest-first list. Each row needs enough to decide without leaving the screen: `rcNumber`, `legalBusinessName`, `automatedCheck.result` (badge it — `"match"` is reassuring but **must not** be treated as a reason to approve without looking at `documents`), and links to the uploaded `cacCertificateUrl`/`repIdUrl`. `POST /admin/kyc/:id/approve` (no body) or `POST /admin/kyc/:id/reject { reason }` — both are one-way per submission; a rejected business resubmits fresh rather than the admin ever re-reviewing the same row. `POST /admin/brands/:brandId/kyc/revoke { reason }` lives separately (on a brand's own admin detail view, not the queue) for pulling back an already-`verified` business.

## Admin: false-review moderation

`GET /admin/business-ratings/moderation/flags` → ratings currently over the report threshold, not yet hidden — same "signal, not automatic" posture as ad-campaign flagging. `POST /admin/business-ratings/:id/hide { reason }` removes it from public view (never deletes it); `POST /admin/business-ratings/reports/:id/dismiss` (no body) just logs that an admin looked and judged it fine — the rating stays visible and can resurface in this queue if reported again later, so don't treat "dismiss" as a permanent resolution the way "hide" is.

---

# UI Contract: Forum

Existing endpoints (see `API_GUIDE.md`'s "Forum" section), not previously documented here. See `BUSINESS_RULES.md`'s "Forum" section for the underlying rules — this section is about what to render.

## Thread list / thread detail screens

`GET /forum/threads` → sorted `pinned` first, then newest. `POST /forum/threads { title, category? }` (auth required) to start one. `GET /forum/threads/:id/posts` → chronological, oldest first — includes `"hidden"` posts (only `"removed"` ones are excluded), so if the product wants hidden posts to visually disappear from a normal read, that's a client-side render decision (e.g. a "this post was hidden by a moderator" placeholder), not something the API filters out for you.

## Like button — not a toggle

`POST /forum/posts/:id/like` and `DELETE /forum/posts/:id/like` are two separate, explicit calls — don't wire a single button that calls one endpoint and flips local state as if it were a toggle. Track "have I liked this" client-side (or from whatever list context you already have it in) and call the matching endpoint. A duplicate like/unlike returns `{ liked: false }` / `{ unliked: false }` as a normal `200`, not an error — treat it as a no-op, not a failure to handle.

## Flag a post

`POST /forum/posts/:id/flag { reason }` — a simple "Report post" action, same shape as ad-campaign/business-rating reporting elsewhere, but note there's **no dedup here**: don't disable the button after one flag from the same user the way you might elsewhere, since the backend doesn't track "already flagged by you" for forum posts.

## Admin: flagged-posts queue

`GET /forum/moderation/flags?status=open` (default `open` if the param is omitted) → open reports, newest first. `PATCH /forum/moderation/flags/:id { status: "resolved"|"dismissed", hidePost? }` — offer `hidePost` as a checkbox alongside "Resolve," since it's the only way a flag resolution actually hides the underlying post (`moderationStatus: "hidden"`, not deleted).

## Winner-share submission flow (viewer side)

A viewer who won something and shared it publicly can self-report it: `POST /forum/winner-submissions { campaignId, postUrl, claimedLikeCount? }`. `GET /forum/winner-submissions/mine` shows their own submissions and current `status` — `"submitted"` (awaiting review, no action needed from them), `"verified"` (show `bonusPointsGranted`), or `"rejected"` (show `adminNotes` if present; there's no resubmit path for this — a rejected submission just stays rejected, unlike KYC's resubmit flow).

## Admin: winner-share review queue

`GET /forum/winner-submissions?status=submitted` → the review queue, filterable by status. Each row needs the `postUrl` (open it to verify the share is real) and `claimedLikeCount` (unverified — treat as a hint, not a fact). `POST /forum/winner-submissions/:id/verify { adminNotes? }` or `POST /forum/winner-submissions/:id/reject { adminNotes? }` — both are **one-way**: don't build a "change my mind" action for either, the API rejects a second decision on an already-resolved submission.
