# Pazzell — Frontend Migration Guide

**This is a migration, not a fresh build.** The live frontend still implements the old product: watch ads → answer a quiz per ad → complete a 5-ad cycle → spin a wheel → win a prize, plus a marketplace that's a real checkout store. The backend has already been fully revamped out from under it, twice (Billboard + Freebie Codes, then the marketplace store → directory pivot), and the frontend now needs to catch up. Every screen, API call, and piece of state tied to the spin-wheel/quiz/cycle model and the old marketplace checkout is calling endpoints that **no longer exist** and needs to be replaced — not extended, not fixed, replaced.

Read this document as: **§2 tells you what to rip out of the current app and what to build in its place. Everything after that is reference material for building the replacement.** If the running API ever disagrees with this document, the API is right — treat the disagreement as a bug to report, not something to silently work around.

Two companion machine-readable files sit alongside this one in the same folder and are referenced throughout: `openapi.yaml` (full OpenAPI 3.0.3 spec, validated — point codegen/Swagger tooling at it) and `MOCK_FIXTURES.json` (realistic sample payloads for local dev / mock servers).

---

## 1. What The Product Is *Now* (target state)

Pazzell is a continuous video billboard — brand ads played back-to-back, no gate, no quiz, nothing to unlock. It's ringed by scrolling text strips. Occasionally a strip shows a pinned, static **freebie code** — cash, in varying denominations — instead of scrolling text. The first authenticated user to type that code into an Apply box wins it — winning issues a secret code, and applying that secret code (a separate step, same input box) actually pays out: credits the wallet. (Freebie codes were airtime-or-cash before a cash-only cutover — see `BUSINESS_RULES.md`; a recharge-PIN reveal can still happen, but only for a pre-cutover claim someone won before the switch.) Nothing a user wins ever expires. Cash only leaves the platform through a manual weekly admin payout run — there is no self-serve withdrawal.

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
5. **Remove the referral screen entirely** — the feature has been retired, not just changed; no `/referrals/*` endpoint exists any more.
6. **Update the brand-side ad campaign dashboard** for the expanded `status` enum and new `moderationStatus` (§2, Revamp 1) — moderation is reactive (a paid campaign goes live immediately, no waiting state), so build the admin bulk deactivate/reactivate actions instead (§2, Revamp 3), not a pending-review screen.
7. **Rebuild the marketplace end to end** as its own effort — this is the most structurally different piece (store → directory) and has zero shared UI with what exists today. See §2 Revamp 2 and §7's marketplace section.
8. **Build the admin bulk deactivate/reactivate actions** on the campaign moderation dashboard (§2, Revamp 3) — replaces any old single-campaign approve/reject UI.
9. **Build Promote & Earn end to end** (§2, Revamp 5) — a net-new feature, no old screen to adapt. If the old UI had anything resembling a "spend your winnings" marketplace shop, do NOT build that; it was never real and stays never-built (§2, Revamp 2).
10. **Apply the `gamer` → `viewer` rename everywhere** (§2, Revamp 6) — grep the frontend codebase for `gamer` (routes, role checks, type names, copy) and update to `viewer`. Do this early relative to the rest, since it touches auth/profile code every other screen depends on.
11. **Build the admin ad-moderation monitor screen for real** (§2, Revamp 6) — reports, flag badges, warn/suspend actions. Also add brand-side campaign Pause/Resume and the watch-screen stats/streak reads.

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
- Campaign moderation status (`moderationStatus`) on `AdCampaign` — see Revamp 3 below for the current (reactive) moderation flow; paying *does* put a campaign live immediately.
- Campaign lifecycle states expanded: `status` went from `draft|active|inactive` to `DRAFT|PENDING_PAYMENT|ACTIVE|PAUSED|EXPIRED|REJECTED`.
- Flat campaign pricing: no more brand-selectable 1–12 week duration. Flat 30-day activation at $20 Basic / $30 Premium.

**Changed shape, same endpoint:**
- `GET /wallet/balance`: added `payoutThreshold`, `amountToThreshold`, `nextPayoutDate`.
- `AdCampaign`: `questions`/`geoTarget` removed; `moderationStatus`/`moderationReason`/`moderatedBy`/`moderatedAt` added; `status` enum expanded; `numberOfWeeks` is legacy-only now.
- `GET /analytics/app`: counters are now Billboard-sourced (`totalAdsWatched`, `adsWatchedToday`), not puzzle-session-sourced.

### Revamp 2 — Marketplace: store → business directory

The marketplace used to be a small digital-goods store (list a product, pay via Paystack, apply a discount code at checkout). It is now a business directory — brands publish a contact profile, users browse and reach out directly.

**Removed entirely:** `POST /marketplace/checkout`, `GET /marketplace/orders/*`, the `Order` model, the `DiscountCode` model, and every price/checkout field on `MarketplaceProduct` (`priceUSD`/`priceLocal`/`currency`/`deliveryAsset`/`fulfillmentInstructions`). Don't build a cart, checkout form, discount-code input, or order-history screen — none of it has a backend anymore.

**New:** a business profile per brand (`PUT /marketplace/business/profile`, `GET .../mine`) with `businessName`, `businessDescription`, `logoUrl`/`coverImageUrl`, `contactEmail`/`contactPhone`/`whatsappNumber`, `address`, `socialLinks`, and an explicit `isListed` publish toggle; a public directory (`GET /marketplace/businesses`, filterable by category/country/state/city/search); a business detail page (`GET /marketplace/businesses/:brandId`) showing the profile plus its active products.

**Changed shape:** `MarketplaceProduct` still exists (create/update/delete under `/marketplace/products*`) but dropped every price/checkout field in favor of `images: string[]` and an optional free-text `priceLabel` (e.g. `"From ₦5,000"`, never a charged amount). `GET /marketplace/products/:productId` now also returns the owning business's contact info under `business`.

**Also removed as a direct consequence:** `WalletTransactionReason.MARKETPLACE_SPEND` (was declared but never had a consumer — now definitively unreachable, since there's no wallet-spend path in a checkout-free marketplace).

### Referral program — removed entirely (later, separate change)

`/referrals/*` (summary, events, my-stats), referral capture at signup (`referrerId`/`referrerUsername`/`referralCode` in registration bodies), the referral stats block on the viewer profile response, and the `referralBonusAlerts` notification toggle are all gone. Don't build or port any referral UI — no invite links, no "your referrals" dashboard, no milestone-reward reveal.

### Unchanged — build against these exactly as documented, no surprises

Auth (`/auth/*`, `/registration`, `/login`, `/refresh`), user profile (`/me`, `/profile/*`, `/settings`), forum (`/forum/*`), bank accounts (`/wallet/bank-accounts*`), brand/ad-campaign creation and payment flow shape (only pricing/duration inputs and post-creation lifecycle changed, above).

### Revamp 3 — Ad campaign moderation went reactive

Moderation used to be a pre-payment gate: `POST /ad-campaigns/:campaignId/moderate` (`{decision: "APPROVED"|"REJECTED", reason?}`) let an admin approve or reject a video before it could ever go live, independent of payment. **That endpoint is gone.** Requiring upfront review before a paid campaign could go live was too manual a bottleneck; moderation is reactive now instead.

**Removed:** `POST /ad-campaigns/:campaignId/moderate`. Don't build a single-campaign approve/reject action, and don't build a "pending review" waiting state between checkout and going live — there isn't one.

**New:**
- A campaign auto-flips to `moderationStatus: "APPROVED"` the instant payment succeeds — the same moment `status` becomes `"ACTIVE"`. Paying puts a campaign live immediately.
- `POST /ad-campaigns/deactivate` — admin only, bulk (`{campaignIds: string[], reason?}`). Pulls any of the given campaigns that are currently `ACTIVE` out of rotation (`status → "PAUSED"`, `moderationStatus → "REJECTED"`). This is how an admin now handles an inappropriate ad that's already live — after the fact, not before. Build this as a multi-select action on the admin campaign list, not a one-at-a-time flow.
- `POST /ad-campaigns/reactivate` — admin only, bulk (`{campaignIds: string[]}`). Undoes a deactivation (`status → "ACTIVE"`, `moderationStatus → "APPROVED"`) for any given campaign currently `PAUSED`, unless its original `expiresAt` has already passed (returned separately as `skippedExpired` — surface these distinctly, since an expired-while-paused campaign needs the brand to re-pay, not just get switched back on).

`moderationStatus`/`moderationReason`/`moderatedBy`/`moderatedAt` fields on `AdCampaign` are unchanged in shape — only who sets them and when changed.

### Revamp 4 — Freebie codes now take over the billboard

A live freebie code used to be visible in exactly one place: pinned in the perimeter strip. It now **also** takes over one billboard slot, full-screen, for a fixed stretch of time (`Config: freebie.billboardSlotSeconds`, default 15s — kept matching the banner ad duration below) — exactly like a real ad — so the freebie moment interrupts the ad reel instead of only ever being a small pin at the edge of the screen. This is additive: the strip flow is completely unchanged, a live code is simultaneously pinned in the strip and (once, per session) a billboard takeover. **This mechanic is entirely unaffected by the video→banner change in Revamp 7 below.**

**Changed shape:** `GET /billboard/queue` slots can now have `type: "FREEBIE"` alongside the existing `"AD"`/`"HOUSE"`:
```
{ slotId, type: "FREEBIE", codeId, publicCode, valueLabel, freebieType: "AIRTIME"|"CASH", liveUntil, durationSec }
```
No `bannerImageUrl` — there's no image/video file for it, build a code-announcement graphic (code, value, countdown, an Apply box or a route into one) instead of a media player for this slot type.

### Revamp 7 — Billboard ads: video → banner image; new sponsored-ad panel

Video upload/hosting was consuming too much production resources, so brand ad campaigns now upload a static banner image (1200x675px, 16:9) instead of a video — displayed for a fixed `Config: billboard.bannerDisplaySeconds` (15s), like a slide, not a video player. Every campaign, both tiers, uploads a banner now.

- `POST /ad-campaigns`'s multipart file field is `banner` (was `video`).
- `GET /billboard/queue`'s `"AD"`/`"HOUSE"` slots carry `bannerImageUrl` (was `videoUrl`); `durationSec` is now fixed, not a probed video length.
- Existing paid video campaigns had their video files deleted from storage; the `AdCampaign` records themselves were kept (payment/moderation/analytics history preserved).
- **New, separate, admin-curated sponsored-ad panel:** `sponsoredAd: {id, imageUrl, clickUrl} | null` on `GET /billboard/queue`, not part of the rotating `slots`. Not a brand self-serve product — any advertiser negotiates a deal off-platform, an admin uploads the agreed creative (image or GIF, never video/audio) via `POST/GET /admin/sponsored-ads`, `POST /admin/sponsored-ads/:id/activate`/`deactivate`. `null` until an admin uploads one — render your own "Your ads here" placeholder. Report a click via the public `POST /billboard/sponsored-ad/:id/click`. Freebie codes never appear here.

**Build this:**
- Play a `FREEBIE` slot through the exact same loop as `AD`/`HOUSE`: render for `durationSec`, send the same `heartbeat`/`complete` calls on the same `slotId` mechanics.
- A given code takes over the billboard **at most once per session**, even though it stays pinned in the strip for its whole live window — don't expect one on every queue fetch, most return none.
- The code can still be claimed by someone else (via the strip, or their own takeover) while showing on this screen — the Apply box's existing `409 CODE_ALREADY_TAKEN` handling covers that race, no special handling needed. Optionally poll `GET /freebies/strip` (you're likely already doing this for the perimeter strip) during the slot and check that `codeId` for `state: "TAKEN"` to flip the takeover screen itself before the user even tries.

See `UI_CONTRACT.md`'s "Freebie takeover slots" section for the full contract.

### Revamp 5 — Promote & Earn (new feature)

**The old marketplace concept of "spend your winnings on airtime/data/vouchers" was never built and is not being built** — don't build a wallet-spend shop. The marketplace stays exactly as documented in Revamp 2: a free business directory, no checkout, ever.

What *is* new is a completely separate feature: **Promote & Earn**. A brand posts a campaign (one image or ≤60s video, free to post — no payment, no pre-publish moderation queue, same auto-live posture as ad campaigns). Any viewer can get a personal share link for that campaign and post it on their own social platforms. Anyone who follows that link back to the site and likes/votes there (signed in) adds to that promoter's count — but only ever once per promoter, no matter how many of that promoter's campaigns they vote across (see the gate described below). **Likes are cumulative across every campaign a promoter has shared, not scored per campaign** — a promoter who shares five campaigns and racks up likes across all of them has a higher total than one who only shared one, even if any single campaign of theirs got fewer likes. Periodically (weekly is the expected cadence, admin-driven — not automatic) an admin opens a "prize period" with a description and optional cash amount, and settles it at the end: whoever has the single highest cumulative like total across that window wins. If the prize has a cash amount, it's credited straight to the winner's wallet.

**This replaced the earlier "per-contest prize pot" concept from the original design mockups** — the mockup's `v-promote`/`b-contest`/`a-contest` screens show a brand-funded pot *per campaign*, each with its own independent winner. That's not what got built. There is exactly one grand prize per period, platform-wide, decided by summed likes across all of a promoter's campaigns — treat the mockup screens as layout/visual reference only (card shapes, the share box, the "like this campaign" button), not as the data model. Where the mockup implies a per-campaign leaderboard/pot/winner, build against this doc instead.

**Data shapes:**
```
PromoCampaign
  _id, brandId, brandName, title, description
  mediaUrl, mediaType: "image"|"video", videoDurationSeconds?  // video only
  status: "ACTIVE" | "PAUSED"
  likeCount                        // all-time, informational — not the same as any prize period's total
  createdAt, updatedAt

PromoLink                          // a viewer's personal share link for one campaign
  linkId, campaignId, campaign: {title, mediaUrl, mediaType, status}
  slug, shareUrl                   // shareUrl is a ready-to-post full URL
  likeCount                        // likes attributed to THIS link specifically
  createdAt

PromoPrizePeriod
  _id, periodStart, periodEnd, prizeDescription, prizeAmount?, currency?
  status: "OPEN" | "SETTLED" | "CANCELLED"
  winnerUserId?, winningLikeTotal?, settledAt?

LeaderboardEntry                   // one row in GET /promote/leaderboard
  rank, promoterUserId, displayName, likeCount
```

**Endpoints:**
```
POST /promote/campaigns                     brand only, multipart "media" file + title/description
GET  /promote/campaigns/mine                 brand only — own campaigns, each with its all-time likeCount
GET  /promote/campaigns/:campaignId          public — campaign detail (what a shared link lands on)
GET  /promote/campaigns                      admin only, ?status=&brandId=
POST /promote/campaigns/deactivate           admin only, bulk {campaignIds[], reason?} → PAUSED
POST /promote/campaigns/reactivate           admin only, bulk {campaignIds[]} → ACTIVE

POST /promote/campaigns/:campaignId/links    auth required — mint/fetch this viewer's share link, idempotent
GET  /promote/links/mine                     auth required — every link this viewer holds, with per-link like counts

POST /promote/like/:slug                     auth required — the "Like this campaign" button's endpoint
GET  /promote/leaderboard?periodId=          public — cumulative, platform-wide. Omit periodId for the current OPEN period

POST /admin/promote/likes/:likeId/void               admin, {reason}
POST /admin/promote/promoters/:userId/disqualify     admin, {reason} — excludes them from every future leaderboard computation
POST /admin/promote/promoters/:userId/requalify      admin — undoes a disqualification
GET  /admin/promote/promoters/disqualified           admin
POST /admin/promote/periods                          admin, {periodStart, periodEnd, prizeDescription, prizeAmount?, currency?}
GET  /admin/promote/periods                           admin
POST /admin/promote/periods/:periodId/settle          admin — determines the winner, credits their wallet if prizeAmount was set
POST /admin/promote/periods/:periodId/cancel          admin, {reason}
```

**Build this:**
- **Campaign feed/browse screen** — public, lists `PromoCampaign`s (there's no dedicated `GET /promote/campaigns` public list endpoint yet; the admin one is role-gated — if a public browse/discovery screen is needed beyond arriving via a share link, flag this as a gap rather than building around it silently).
- **"Share this campaign" action** — for a signed-in viewer looking at a campaign, call `POST /promote/campaigns/:campaignId/links` and surface the returned `shareUrl` with copy/share-to-WhatsApp-style buttons (mirrors the mockup's `sharebox` component visually).
- **Public campaign landing page** (what `shareUrl` resolves to, `/promote/l/:slug` client-side) — show the campaign media/title/description and a "Like this campaign" button. If the visitor isn't signed in, prompt login/signup first (same pattern as freebie code claiming: the action is retried after auth, nothing is lost by not being logged in yet). The like action itself needs the link's `slug`, not the campaign id — resolve the slug from the URL the visitor landed on.
- **"My shares" personal dashboard** — `GET /promote/links/mine` for a viewer to see everything they've shared and how many likes each has driven; sum these client-side (or just point at the leaderboard) for their own running total.
- **Leaderboard screen** — `GET /promote/leaderboard`, ranked list + the current period's `prizeDescription`. This is the platform-wide cumulative ranking, not tied to any one campaign — design it as its own screen, not nested under a campaign detail page.
- **Brand-side "post a campaign" screen** — multipart upload (`media` field), title, description. No pot/budget field — Promote & Earn campaigns are free to post; the brand doesn't fund anything here (the grand prize is admin-funded per period, not per campaign).
- **Admin: prize period management** — open a period (dates + prize description + optional cash amount), watch the leaderboard live during the OPEN window, settle it when ready. Settling is one-way; there's no "unsettle."
- **Admin: fraud response** — void a specific like, or disqualify a promoter outright (with a requalify undo) — both bulk-friendly the same way ad-campaign deactivate/reactivate are, not one-at-a-time-only flows.

**Not built (don't design around these):** per-campaign prize pots, a public campaign browse/discovery list beyond arriving via a share link, an "un-void" for a specific like (only promoter-level requalify exists), automatic/scheduled period opening (an admin always opens each period by hand).

### Revamp 7 — Business KYC verification + B2B Projects/Quotations marketplace (net-new, most recent change)

Two new brand-only feature areas, entirely additive — nothing existing changed shape. Full detail in `API_GUIDE.md`, `BUSINESS_RULES.md`, `DATA_MODELS.md`, `UI_CONTRACT.md`, `openapi.yaml` (tags `BusinessKYC`, `Projects`); this is the condensed summary.

**Business KYC** — a business submits a CAC registration number for verification. An automated pre-check runs, but **a human admin always makes the final call** — a submission never auto-verifies, regardless of how clean the automated match was:
```
POST /kyc/submit                         brand, multipart {rcNumber, businessType?, legalBusinessName, repIdType?, cacCertificate?, repId?} → always pending_review
GET  /kyc/me                             brand — {kyc: BusinessKyc | null}
POST /kyc/resubmit                       brand — only when current status is rejected (400 KYC_RESUBMIT_NOT_ALLOWED otherwise)
GET  /admin/kyc/queue                    admin — pending_review, oldest first
POST /admin/kyc/:id/approve|reject       admin — reject requires {reason}
POST /admin/brands/:brandId/kyc/revoke   admin — {reason}, pulls a verified business back to revoked
```
`Brand.kycStatus` (`not_submitted | pending_review | verified | rejected | revoked`) is the field every gate check reads. Required before a business can post a Project or submit a Quotation below.

**B2B marketplace** — a KYC-verified business posts a `Project`; other KYC-verified businesses respond with `Quotation`s. The poster sees **1 free quotation**; the rest require a paid, account-wide, 30-day unlock pass (`Config: quotationUnlock.priceNgn`/`durationDays`, defaults ₦5,000/30 days) — **not** a per-project purchase, and **not** a "Basic/Premium business plan" (that vocabulary stays scoped to per-ad-campaign tiers only):
```
POST /projects                           brand, KYC-verified only (403 KYC_REQUIRED)
GET  /projects | /projects/mine | /projects/:id
POST /projects/:id/close | /cancel       brand, poster only
GET  /projects/:id/quotations            brand, poster only — {quotations, unlocked, totalQuotationCount} — THE PAYWALL
POST /projects/:id/quotations            brand, KYC-verified only (403 KYC_REQUIRED)
POST /quotations/:id/withdraw            brand, own quotation only — no in-place amount edit, withdraw+resubmit instead
POST /quotation-unlock/purchase          brand — debits the wallet, 402 INSUFFICIENT_BALANCE if underfunded; extends current expiry on renewal, doesn't reset it
GET  /quotation-unlock/status            brand — {active, expiresAt?}
GET  /admin/projects/:id/quotations      admin — unfiltered by the paywall
```
The unlock purchase is a **wallet debit** — businesses can now fund a wallet for the first time via `POST /wallet/topup/initialize`/`GET /wallet/topup/verify/:reference` (same Paystack-checkout-redirect pattern as `/ad-payments/*`).

**Contact + ratings**, once a quotation is visible to the poster:
```
POST /business-contact/threads                    brand, poster or quoter, quotation must be visible (403 QUOTATION_NOT_VISIBLE)
GET  /business-contact/threads | /threads/:id/messages
POST /business-contact/threads/:id/messages        brand — {body}
POST /business-ratings                             brand — 403 CONTACT_REQUIRED without a thread; once per (project, rater, rated) direction, not once-ever between two businesses; NO "mark completed" step in v1
GET  /business-ratings/business/:brandId            public — {averageScore, count, ratings}
POST /business-ratings/:id/report                   brand — {reason}, idempotent per reporter
GET  /admin/business-ratings/moderation/flags        admin
POST /admin/business-ratings/:id/hide | reports/:id/dismiss   admin — hide removes from public view (never deletes); dismiss just logs the review, doesn't stop a fresh report from resurfacing it later
```
Reactive moderation, same posture as ad-campaign moderation: reports never auto-hide a rating, only an explicit admin hide does.

**New error codes**: `KYC_REQUIRED` (403), `KYC_ALREADY_PENDING` (409), `KYC_RESUBMIT_NOT_ALLOWED` (400), `KYC_NOT_VERIFIED` (404, admin-only), `INSUFFICIENT_BALANCE` (402), `QUOTATION_NOT_VISIBLE` (403), `CONTACT_REQUIRED` (403).

---

### Revamp 6 — `gamer` → `viewer` rename, ad-moderation subsystem, and a batch of smaller endpoints

**Breaking rename, no alias:** the end-user role `"gamer"` is now `"viewer"` — `User.role` value, and every route path that spelled it out: `GET/PUT /profile/gamer` → `GET/PUT /profile/viewer`, `POST /auth/gamer/register` → `POST /auth/viewer/register`, `GET /gamers` → `GET /viewers` (response key `gamers` → `viewers`). There is no backward-compatible old-path fallback — update every call site before deploying against this API version. Everywhere else in this document that used to say "gamer" now says "viewer."

**New: full ad-moderation subsystem** (reports → auto-flag → warn/takedown, each a strike → auto-suspend) — the admin monitor screen's report counts, flag badges, and Warn/Suspend actions are real now, not disabled placeholders:
```
POST /ad-campaigns/:campaignId/report        auth, any role — {reason} → {reported, flagged}, idempotent per user+campaign
POST /ad-campaigns/:campaignId/warn          admin — {note} → {campaign, strikeCount, autoSuspended}, campaign stays live
POST /admin/brands/:brandId/suspend          admin — {reason} → {pausedCampaigns}
POST /admin/brands/:brandId/unsuspend        admin — no body
```
`AdCampaign` gained `flagged`/`flaggedAt`/`flagReasons`. `POST /ad-campaigns/deactivate`'s `reason` is now **required** and now also adds a strike per campaign taken down. `GET /ad-campaigns` (admin) items gained `reportCount`/`reportCountLastHour`/`brandStrikeCount`/`brandSuspended`. Auto-suspend fires at `Config: adModeration.suspendStrikeThreshold` strikes (default 3); suspension blocks new-campaign creation, going live, self-resume, and Promote & Earn campaign creation (`403 BRAND_SUSPENDED` on each). See §6 for the full rule set.

**New: brand self-serve campaign pause/resume**, independent of admin moderation:
```
POST /ad-campaigns/:campaignId/pause    brand, own campaign, no body — ACTIVE → PAUSED, no penalty
POST /ad-campaigns/:campaignId/resume   brand, own campaign, no body — PAUSED → ACTIVE, only if brand-paused (403 ADMIN_TAKEDOWN if admin-paused)
```
**Confirmed: there is no refund of any kind on any takedown or pause, ever.**

**New: watch-screen stats/streak and a few small quality-of-life reads:**
```
GET  /billboard/stats               public — {stats: {watchingNow, codesToday, adsInRotation}}
GET  /billboard/my-streak           auth required — {streakDays}
GET  /freebies/recent-catches       public — {catches: [{displayName, type, valueLabel, takenAt}]}
GET  /freebies/limits/mine          auth required — {limits: [{type, cap, claimedToday, remaining, resetsAt?}]}
```
`GET /me/claims` items gained `publicCode?`. `GET /ad-campaigns/mine` items gained `playsToday`/`completionRateToday`. `GET /ad-campaigns/:id/analytics` gained `costPerCompletedView` (and `uniqueViewers`, which was already there — just wasn't previously read). `User` gained `phone?`. `Brand` gained `registrationNumber?`, `strikeCount`, `suspended`, `suspendedReason?` (all surfaced via `GET /profile/brand`'s `brandDetails`; `phone`/`registrationNumber` settable via `PUT /profile/viewer`/`PUT /profile/brand` respectively).

**Explicitly not built** — mockup artifacts that contradict the shipped product model, don't build UI for these: a daily "Spend today" figure, an "In review" campaign status or "Send for review" action, campaign-creation scheduling fields, a VAT estimate on campaign creation.

**The marketplace and Promote & Earn's cumulative-leaderboard mechanic are both unaffected by this batch** — no changes to either beyond Promote & Earn campaign creation also honoring brand suspension.

---

## 3. Authentication

Two token styles coexist: the server sets `access_token`/`refresh_token` **httpOnly cookies** on every successful login/register/activate/Google call, but every protected route in practice reads a **Bearer token** from the `Authorization` header, not the cookie.

**Build against the header.** Take `accessToken` from the JSON body of any auth response (`{ user, accessToken, refreshToken }`) and send it as `Authorization: Bearer <accessToken>` on every subsequent protected call. Treat the cookies as secondary.

- `POST /auth/google` — `{ idToken }` (a Firebase-verified Google idToken; required — a raw `{ email, googleId }` payload is no longer accepted) → creates or logs in a viewer.
- `POST /auth/viewer/register` — `{ username, email, password, referrerId? }` → sends an activation email, returns `{ activationToken }`.
- `POST /auth/brand/register` — `{ username, email, password }` → same activation flow, `role: "brand"`.
- `POST /auth/user/activate` — `{ activation_token, activation_code }` → creates/verifies the account.
- `POST /auth/user/resend-activation` — `{ email }`.
- `POST /auth/login` — `{ email, password }` → works for both viewer and brand roles.
- `POST /auth/logout` — auth required.
- `POST /auth/forgot-password` — `{ email }` → always `200`, doesn't leak account existence.
- `POST /auth/reset-password` — `{ token, new_password }`.

**One quirk to know:** a request to a protected route with **no** `Authorization` header at all returns `{ error: "Authentication Failed" }` — no `success` field, a different key entirely. Every other auth failure (bad/expired token) uses the standard error shape (§8) with `statusCode: 401`. This is a pre-existing backend quirk, not something to "fix" from the frontend — just special-case it if you need to.

---

## 4. Data Models

Shapes as they actually appear in API responses: camelCase, Mongo `_id` as string, dates as ISO 8601. Internal-only fields (password hashes, encrypted payloads, hash indexes) are never returned and aren't listed.

### Billboard

**Queue slot** (`GET /billboard/queue`), shape depends on `type`:
```
slotId: string           // opaque, single-use — pass back verbatim to heartbeat/complete
type: "AD" | "HOUSE" | "FREEBIE"
durationSec: number

// AD/HOUSE only
campaignId?: string      // AD only
brandName?: string       // AD only
title?: string
bannerImageUrl?: string  // was videoUrl — see §2 Revamp 7
clickUrl?: string | null // AD only — navigate immediately on tap, then fire POST /billboard/impressions/click (fire-and-forget)

// FREEBIE only — live freebie code taking over this slot full-screen, see §2 Revamp 4
codeId?: string
publicCode?: string
valueLabel?: string
freebieType?: "AIRTIME" | "CASH"
liveUntil?: string
```

**Sponsored ad panel** — the `sponsoredAd` field on the `GET /billboard/queue` response (sibling to `slots`, not inside it):
```
{ id: string, imageUrl: string, clickUrl: string | null } | null
```
See §2 Revamp 7.

**Board stats** (`GET /billboard/stats`, public): `{ watchingNow, codesToday, adsInRotation }`.

**Watch streak** (`GET /billboard/my-streak`, auth required): `{ streakDays: number }` — consecutive days with a completed view, doesn't zero out just because today's empty so far, only breaks on an actual gap day.

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
publicCode?: string          // new — the board code as it appeared when won (GET /me/claims only)
status?: "ISSUED" | "REDEEMED" | "VOID"
issuedAt?: string
redeemedAt?: string
secretCode?: string          // decrypted, visible to the owner forever — never has a deadline
```

**Recent catch** (`GET /freebies/recent-catches`, public): `{ displayName, type, valueLabel, takenAt }[]`.

**Daily limit status** (`GET /freebies/limits/mine`, auth required): `{ type, cap, claimedToday, remaining, resetsAt? }[]` — one entry per type.

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
       | "FREEBIE_CASH" | "PAYOUT_SETTLED" | "ADJUSTMENT" | "REVERSAL",
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
bannerImageUrl?, bannerWidthPx?, bannerHeightPx?, bannerSizeBytes?, bannerMimeType?,
videoUrl?, videoDurationSeconds?, videoSizeBytes?, videoMimeType?,  // legacy — pre-cutover campaigns only, see §2 Revamp 7
priceUSD?, exchangeRateSnapshot?, priceLocal?, currency,
status: "DRAFT"|"PENDING_PAYMENT"|"ACTIVE"|"PAUSED"|"EXPIRED"|"REJECTED",
paymentStatus: "unpaid"|"paid",
moderationStatus: "PENDING"|"APPROVED"|"REJECTED", moderationReason?, moderatedBy?, moderatedAt?,
flagged, flaggedAt?, flagReasons: string[],     // new — see §2 Revamp 6
activatedAt?, expiresAt?
```
No `questions[]` or `geoTarget` field anymore. `GET /ad-campaigns/mine` items also carry `playsToday`/`completionRateToday`; `GET /ad-campaigns` (admin) items also carry `reportCount`/`reportCountLastHour`/`brandStrikeCount`/`brandSuspended` — see §2 Revamp 6.

### User & auth

```
_id, firstName?, lastName?, username?, email, avatar?, role: "viewer"|"brand"|"admin", isVerified,
age?, sex?: "man"|"woman"|"prefer_not_to_say", country?, state?, city?, phone?,
notifications: {emailNotifications, leaderboardUpdates, newCampaignAlerts, weeklyDigest},
privacy: {showOnLeaderboard}, createdAt, updatedAt
```
`country` is collected but never used to filter/target anything. Profile completeness (age+sex+country+state+city+verified) gates claiming a freebie code, not watching the billboard. `role` was `"gamer"` before this batch — see §2 Revamp 6 for the breaking rename. `phone` is new — display/contact only, never used for auth.

`Brand`'s own extra fields (`GET /profile/brand`'s `brandDetails`): `registrationNumber?`, `strikeCount`, `suspended`, `suspendedReason?` — see §2 Revamp 6.

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

### Promote & Earn

See §2 Revamp 5 for the full endpoint list and screen breakdown.

**PromoCampaign:**
```
_id, brandId, brandName, title, description
mediaUrl, mediaType: "image" | "video"
videoDurationSeconds?           // video only
status: "ACTIVE" | "PAUSED"
likeCount                       // all-time, informational — NOT a prize-period total
createdAt, updatedAt
```

**PromoLink** (a viewer's personal share link for one campaign):
```
linkId, campaignId
campaign: { title, mediaUrl, mediaType, status }   // only on GET /promote/links/mine
slug, shareUrl
likeCount                       // likes attributed to THIS link specifically
createdAt
```

**PromoPrizePeriod:**
```
_id, periodStart, periodEnd, prizeDescription
prizeAmount?, currency?          // unset = non-cash prize, admin fulfills manually
status: "OPEN" | "SETTLED" | "CANCELLED"
winnerUserId?, winningLikeTotal?, settledAt?
```

**LeaderboardEntry** (one row in `GET /promote/leaderboard`'s `entries`):
```
rank, promoterUserId, displayName, likeCount
```
`likeCount` here is the cumulative total across every campaign that promoter shared within the period's window — this is the number that decides the grand prize, not any single campaign's `likeCount`.

### Config value shapes worth rendering as structured forms (admin)

```
"campaign.tiers"        -> { basic: {price, weight, analytics}, premium: {price, weight, analytics} }
"rateLimit.claim" etc.  -> { limit: number, windowSeconds: number }
"freebie.dailyClaimCap" -> { AIRTIME: number, CASH: number }
"freebie.liveWindowMinutes" -> { AIRTIME: number, CASH: number }
"freebie.activeHours"   -> { start: "HH:MM", end: "HH:MM", timeZone: "Africa/Lagos" }
"billboard.houseFillers"-> [{ title, bannerImageUrl, durationSec, filler }]
```

---

## 5. Full API Reference

All routes are mounted under `/api/v1`. Full schema in `openapi.yaml`; this is the narrative index.

### Profile
- `GET /me` — auth required. Cached session user.
- `GET /profile/viewer` — viewer only. Full profile + points/leaderboard stats.
- `GET /profile/brand` — brand only. Profile + brand details (now includes `registrationNumber`, `strikeCount`, `suspended`, `suspendedReason?`) + campaign count.
- `PUT /profile/viewer` — multipart, optional `avatar` file. Body: `firstName, lastName, username, age, sex, country, state, city, phone`.
- `PUT /profile/brand` — multipart, optional `avatar` file. Body: `name, companyName, businessCategories, country, state, city, registrationNumber`.
- `GET /settings` — role-aware single read for a settings page.
- `PATCH /profile/change-password`, `/profile/notifications`, `/profile/privacy` — auth required.
- `DELETE /profile/account` — `{ password }`, auth required.

### Billboard (watching)
Every route works logged-in or logged-out — auth is never required to watch.
- `POST /billboard/session` → `{ sessionId }`.
- `GET /billboard/queue?sessionId=&size=` → `{ slots: [...], sponsoredAd }`. `type: "AD"|"HOUSE"|"FREEBIE"` — see §2 Revamp 4 for the FREEBIE shape. `"AD"` slots carry `clickUrl: string | null`. `sponsoredAd: {id, imageUrl, clickUrl} | null` is a separate side panel — see §2 Revamp 7.
- `POST /billboard/sponsored-ad/:id/click` — public, no auth. Fire-and-forget click counter for the sponsored-ad panel.
- `POST /billboard/impressions/heartbeat` — `{ sessionId, slotId, watchedMs }`.
- `POST /billboard/impressions/complete` — `{ sessionId, slotId, watchedMs }` → `{ completed: boolean }`.
- `POST /billboard/impressions/click` — `{ sessionId, slotId }` → `{ ok: true, clicked: true }`. Fire-and-forget click-through tracking; navigate to `clickUrl` immediately, don't wait for this call.
- `GET /billboard/stats` — public. `{ stats: { watchingNow, codesToday, adsInRotation } }`.
- `GET /billboard/my-streak` — auth required (hard 401, unlike the rest of this list). `{ streakDays: number }`.

### Freebie codes (winning + redeeming)
`POST /freebies/apply` and `GET /freebies/limits/mine` require auth; everything else here is public.
- `GET /freebies/strip` — poll, rate-limited. `Cache-Control` set from config.
- `GET /freebies/strip/events` — SSE variant, same payload.
- `GET /freebies/phrases` — full active phrase pool, ETag-cacheable.
- `GET /freebies/recent-catches` — public. `{ catches: [...] }`, size from `Config: freebie.recentCatchesFeedSize`.
- `POST /freebies/apply` — auth required. `{ code }`, optional `Idempotency-Key` header (retry-safe on claim), optional `X-Device-Id` header (recommended — anti-abuse). Disambiguates claim vs. redeem server-side.
- `GET /freebies/limits/mine` — auth required. `{ limits: [...] }` — today's per-type claim-cap usage.
- `GET /me/claims` — auth required. Full claim history, each item now also carrying `publicCode?`.
- `POST /me/claims/:claimId/redeem` — auth required. Same redemption as typing the secret code.

### Wallet
- `GET /wallet/balance` — auth required.
- `GET /wallet/transactions?limit=50` — auth required.
- `POST /wallet/bank-accounts` — auth required. `{ accountNumber, bankCode, bankName }` → Paystack-resolves the account name server-side.
- `GET /wallet/bank-accounts` — auth required.
- `DELETE /wallet/bank-accounts/:id` — auth required.
- No withdrawal/transfer endpoint exists.

Referrals: removed entirely, no `/referrals/*` endpoint exists any more (see the "Referral program — removed entirely" section above).

### Ad campaigns (brand side)
- `POST /ad-campaigns` — brand only, multipart with a `banner` image file (was `video` — see §2 Revamp 7) + `title, description, tier ("basic"|"premium"), brandUrl?, campaignUrl?`. `brandUrl`/`campaignUrl` must be a well-formed http(s) URL if set (`400` otherwise) — they become the billboard's `clickUrl`. Succeeds even with an incomplete brand profile — stuck unable to go live until profile is complete. `403 BRAND_SUSPENDED` if suspended.
- `GET /ad-campaigns/mine` — brand only. Items now carry `playsToday`/`completionRateToday`.
- `GET /ad-campaigns` — admin only, `?status=&tier=`. Items now carry `reportCount`/`reportCountLastHour`/`flagged`/`flaggedAt`/`flagReasons`/`brandStrikeCount`/`brandSuspended`.
- `GET /ad-campaigns/:campaignId` — public.
- `POST /ad-campaigns/deactivate` — admin only, bulk. `{ campaignIds: string[], reason }` (**`reason` now required**) → pulls `ACTIVE` campaigns out of rotation (`status: "PAUSED"`, `moderationStatus: "REJECTED"`), adds one strike per campaign to its brand.
- `POST /ad-campaigns/reactivate` — admin only, bulk. `{ campaignIds: string[] }` → restores `PAUSED` campaigns to rotation (`status: "ACTIVE"`, `moderationStatus: "APPROVED"`), skipping any whose `expiresAt` has already passed.
- `POST /ad-campaigns/:campaignId/pause` — brand only, own campaign, no body. `ACTIVE` → `PAUSED`, no penalty.
- `POST /ad-campaigns/:campaignId/resume` — brand only, own campaign, no body. `PAUSED` → `ACTIVE`, only if brand-paused (`403 ADMIN_TAKEDOWN` otherwise); also `400` if expired, `403 BRAND_SUSPENDED` if suspended.
- `POST /ad-campaigns/:campaignId/report` — auth required, any role. `{ reason }` → `{ reported, flagged }`, idempotent per user+campaign.
- `POST /ad-campaigns/:campaignId/warn` — admin only. `{ note }` → `{ campaign, strikeCount, autoSuspended }`.
- `GET /ad-campaigns/:campaignId/analytics` / `/analytics/breakdown` / `/analytics/export.csv` — brand (own) or admin, **Premium tier only** (403 on Basic). `analytics` now carries `costPerCompletedView`, `clicks`, `clickThroughRate`; the time series/CSV export carry `clicks` per day too.
- `POST /ad-payments/initialize` — brand only. `{ campaignId, email }` → Paystack `authorization_url`. `403 PROFILE_INCOMPLETE` if brand profile isn't complete, `403 BRAND_SUSPENDED` if suspended.
- `GET /ad-payments/verify/:reference` — brand only. Also happens via webhook as a fallback.

### Ad moderation (admin)
- `POST /admin/brands/:brandId/suspend` — admin only. `{ reason }` → `{ pausedCampaigns }`.
- `POST /admin/brands/:brandId/unsuspend` — admin only, no body. Doesn't reset strikes or reactivate paused campaigns.
- Auto-suspend fires at `Config: adModeration.suspendStrikeThreshold` strikes; auto-flag fires at `Config: adModeration.autoFlagReportThreshold` reports within `adModeration.autoFlagWindowMinutes`. See §6.

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

### Promote & Earn (share campaigns, win the cumulative-likes grand prize)
See §2 Revamp 5 for the full model and screen list.
- `POST /promote/campaigns` — brand only, multipart `media` file (image or video, video ≤60s) + `title, description`. Free — no payment, auto-live. `403 BRAND_SUSPENDED` if the brand is suspended (see the Ad moderation section above).
- `GET /promote/campaigns/mine` — brand only, own campaigns with all-time `likeCount`.
- `GET /promote/campaigns/:campaignId` — public, campaign detail.
- `GET /promote/campaigns` — admin only, `?status=&brandId=`.
- `POST /promote/campaigns/deactivate` / `/reactivate` — admin only, bulk `{ campaignIds: string[] }`, same PAUSED/ACTIVE pattern as ad campaigns.
- `POST /promote/campaigns/:campaignId/links` — auth required. Mints/returns this viewer's share link, idempotent. Returns `{ link: { slug, shareUrl, ... } }`.
- `GET /promote/links/mine` — auth required. Every link this viewer holds, each with its own `likeCount`.
- `POST /promote/like/:slug` — auth required. The "Like/vote" button. No account-age gate — a brand-new account can vote immediately. Idempotent — one vote per user per (promoter, campaign) pair: a liker can vote for as many different promoters as they want, and separately for each distinct campaign a given promoter shares (both count toward that promoter's total) — only a repeat vote for the exact same promoter+campaign pair returns `alreadyLiked: true` + `message: "You have already voted for this promoter on this campaign."`, not an error. `400 SELF_LIKE_NOT_ALLOWED` if liking your own link; `400 CAMPAIGN_NOT_ACTIVE` if the campaign's been paused.
- `GET /promote/leaderboard?periodId=` — public. Platform-wide, **cumulative across every campaign each promoter has shared** — omit `periodId` for the currently OPEN period; returns `{ period: null, entries: [] }` if none is open.
- `POST /admin/promote/likes/:likeId/void` — admin, `{ reason }`.
- `POST /admin/promote/promoters/:userId/disqualify` / `/requalify` — admin, `{ reason }` on disqualify.
- `GET /admin/promote/promoters/disqualified` — admin.
- `POST /admin/promote/periods` — admin, `{ periodStart, periodEnd, prizeDescription, prizeAmount?, currency? }`.
- `GET /admin/promote/periods` — admin.
- `POST /admin/promote/periods/:periodId/settle` — admin. Determines the winner, credits their wallet if `prizeAmount` was set.
- `POST /admin/promote/periods/:periodId/cancel` — admin, `{ reason }`.

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

**The billboard never stops and is never gated.** No quiz, no "watch 5 to unlock," no try-again economy. Nobody has to be logged in or have a complete profile to watch — auth/profile-completeness only matter at claim time. Every viewer everywhere draws from the identical eligible ad pool; there is no geographic or demographic targeting anywhere, in ad selection or freebie eligibility. A campaign only enters the ad pool once both `status:"ACTIVE"` and `moderationStatus:"APPROVED"`. Premium campaigns are picked ~2x as often as Basic, never repeating back-to-back or within the last 5 slots. If the eligible pool is empty, a house-filler slot plays instead — the stream is never empty. A live freebie code additionally takes over one slot full-screen (`type:"FREEBIE"`), at most once per session per code — see §2 Revamp 4.

**Freebie codes: first to type wins.** A `PINNED` code is either claimable (`AVAILABLE`) or was just claimed (`TAKEN`, shown red for a grace window) — never "coming soon." There is no way to see a future/scheduled drop through any endpoint — don't build a countdown feature. Claiming is a race: first eligible submission wins, everyone else gets `409 CODE_ALREADY_TAKEN` — common and expected, not an error state. Auth is required to claim, never to watch; an unauthenticated submission is rejected with 401 and changes nothing. Claiming requires verified email + complete profile. Claim limits are per-type, per-user, rolling 24h (default 1 cash + 1 airtime) — capped on one type doesn't block the other; hitting it returns `403 DAILY_LIMIT_REACHED` with `{type, resetsAt}`.

**Redeeming is a separate step, same Apply button.** `POST /freebies/apply` auto-detects claim vs. redeem — one input, one button for both. Redeeming the same secret code multiple times is safe and idempotent (credits/reveals exactly once, every later call returns the same result) — no confirmation dialog needed for retries. A secret code submitted by someone other than its owner is rejected as `404 CODE_INVALID`, identical to a nonexistent code — never tell a user a code "belongs to someone else." Redemption has its own tighter rate limit (`429 TOO_MANY_ATTEMPTS`) than claiming.

**Nothing a user has won ever expires.** No deadline field anywhere on `Claim`. The only expiry-shaped thing in the freebie system is `liveUntil` on an *unclaimed* code — a display-rotation timer, unrelated to expiry on something won. Don't build a "your reward expires in X days" banner anywhere.

**Wallet cash only leaves the platform through a manual weekly run.** No withdrawal/transfer endpoint exists — don't build a "Withdraw" button. `GET /wallet/balance` surfaces `payoutThreshold`/`amountToThreshold`/`nextPayoutDate` for a progress element. Being below threshold only excludes a user from a payout run, nothing else.

**The marketplace is a directory, not a store.** No checkout, no price paid in-app, no order, no discount code — don't build a cart or checkout flow anywhere in the marketplace UI. A brand publishes a business profile and, optionally, showcase products/services with a free-text `priceLabel`. A user browses, opens a business or product, and contacts them directly via tappable `tel:`/`mailto:`/`https://wa.me/`/social links — there's no in-app messaging or purchase action. A business only appears publicly once `isListed:true`, which requires a name and at least one contact method (`403 PROFILE_NOT_LISTABLE` otherwise). Unpublishing hides its products too, automatically.

**Suspicion scoring flags, it never blocks.** A claim can be flagged `suspicious:true` for admin review (inhuman latency, headless UA, no prior feed poll) but still succeeds normally for the end user — no end-user-facing "suspicious" messaging exists or should exist.

**Premium-only analytics.** `GET /ad-campaigns/:id/analytics*` returns 403 for Basic-tier campaigns — build an upsell prompt, not an empty chart. The response also carries `costPerCompletedView`, `uniqueViewers`, and `clicks`/`clickThroughRate` (website-link click-throughs) — all real, not placeholders.

**Ad moderation is reactive and escalates.** Report (any signed-in user, one per user per campaign, idempotent) → auto-flag at `Config: adModeration.autoFlagReportThreshold` reports within `adModeration.autoFlagWindowMinutes` (signal only, never an automatic takedown) → admin warn or takedown, each a strike → auto-suspend at `Config: adModeration.suspendStrikeThreshold` strikes (same effect as a manual admin suspend, which also exists standalone for severe cases). Suspension pauses every `ACTIVE` campaign the brand has and blocks new campaign creation, going live, self-resume, and Promote & Earn campaign creation (`403 BRAND_SUSPENDED`). Unsuspending doesn't reset strikes or reactivate paused campaigns. No email/notification is sent on warn or suspend — only visible via profile/admin reads.

**Brand self-serve pause/resume, and no refunds ever.** A brand can pause/resume their own live campaign penalty-free (`moderationStatus` stays `APPROVED`, distinguishing it from an admin takedown, which sets `REJECTED` and can only be undone by the admin's own reactivate call, `403 ADMIN_TAKEDOWN` on a brand's attempt). **No takedown or pause of any kind is ever refunded** — don't build refund UI or copy for either.

**Promote & Earn's prize is cumulative and platform-wide, never per-campaign.** A promoter's like count is summed across every campaign they've shared a link for, within the current prize period — one running total, one winner, one grand prize. There is no per-campaign pot or per-campaign winner despite what the original design mockups show (§2 Revamp 5) — don't build a leaderboard scoped to a single campaign as the prize-determining view. Sharing more campaigns genuinely raises a promoter's odds, since every campaign's likes feed the same total. Periods are opened and settled by an admin by hand — there's no automatic weekly rollover to design a countdown around, though weekly is the expected real-world cadence.

---

## 7. UI Implementation Notes

### Billboard + strip screen

1. On page load: `POST /billboard/session` → `sessionId`. Works with or without auth automatically.
2. `GET /billboard/queue?sessionId=...&size=5` → slots with single-use `slotId`s. Fetch a fresh batch when the queue runs low.
3. For `AD`/`HOUSE` slots, display `bannerImageUrl` (a static image, not a video) for `durationSec` — a fixed 15s, like a slide. For a `FREEBIE` slot, there's no `bannerImageUrl` — render a code-announcement takeover (code, `valueLabel`, countdown) for `durationSec` instead; it plays through the identical loop otherwise. Send periodic `POST /billboard/impressions/heartbeat` for every slot type.
4. On completion (or ≥95% shown): `POST /billboard/impressions/complete` — this is the "verified view" for analytics (a completed `FREEBIE` slot doesn't count — it's not a real ad).
5. Move to the next slot; refetch the queue when exhausted using the same `sessionId` (server tracks recent campaigns to avoid repeats).
6. If an `AD` slot has a non-null `clickUrl`, render it as a tappable link. On tap, navigate immediately (don't wait for a server call), then fire `POST /billboard/impressions/click { sessionId, slotId }` fire-and-forget for tracking.
7. Render the separate `sponsoredAd` panel (`{id, imageUrl, clickUrl} | null`) alongside the main billboard — your own "Your ads here" placeholder when `null`. On tap, navigate to `clickUrl` and fire `POST /billboard/sponsored-ad/:id/click` fire-and-forget.

Render `type:"AD"` and `type:"HOUSE"` slots identically — house fillers exist so the stream is never empty, not as a distinct unit.

For the strip: poll `GET /freebies/strip` at roughly the `Cache-Control` max-age (default ~3s) or use the SSE variant. The response is one flat array mixing `kind:"FREEBIE"` (render `AVAILABLE` as static/pinned, `TAKEN` as a red grace-window state) and `kind:"PROMO"` (continuously scrolling, tokens already substituted). One Apply box, always visible: submit to `POST /freebies/apply { code }` without guessing claim-vs-redeem client-side; handle `409` as an expected "just missed it" state, `403 DAILY_LIMIT_REACHED` using `details.type`/`details.resetsAt`, `403 PROFILE_INCOMPLETE` as a deep-link to profile completion, `401` as a login prompt (the code stays live for immediate retry after auth).

Headline numbers around the player: `GET /billboard/stats` (public, poll on any cadence — cheap) for `watchingNow`/`codesToday`/`adsInRotation`; `GET /billboard/my-streak` (auth required, fetch once per load, no polling needed) for `streakDays`; `GET /freebies/recent-catches` (public, poll on a slower interval than the strip) for a "who just won" list.

Claims history (`GET /me/claims`): every secret code always visible; `status` determines whether to show Apply/Redeem (`ISSUED`), a result (`REDEEMED`), or a voided notice (`VOID`, rare). Offer a one-tap "Redeem" via `POST /me/claims/:claimId/redeem` next to each `ISSUED` item. Each item also carries `publicCode?` now — show it as a small reference label, `secretCode` is still what redeems.

Wallet screen: pair `GET /wallet/balance` with `GET /freebies/limits/mine` for a proactive "1 of 1 cash claims used today, resets at 14:32" element instead of only surfacing the limit reactively via a `403`.

### Brand campaign dashboard & admin ad moderation

Brand list screen (`GET /ad-campaigns/mine`): render `playsToday`/`completionRateToday` as a lightweight glance, distinct from the Premium-only deep-analytics screen. Don't build "Spend today", "In review", a "Send for review" action, campaign scheduling fields, or a VAT estimate — none of these exist server-side.

Campaign detail (brand side): add Pause/Resume buttons hitting `POST /ad-campaigns/:campaignId/pause`/`resume` (no body, own campaign only). On resume, handle `403 ADMIN_TAKEDOWN` distinctly — "an admin took this down, contact support" rather than a generic error — since only the admin's own reactivate can undo that state. No refund messaging anywhere for either pause or an admin takedown.

Admin live-monitor screen: `GET /ad-campaigns` now returns everything needed in one call — `reportCount`/`reportCountLastHour`/`flagged`/`flaggedAt`/`flagReasons`/`brandStrikeCount`/`brandSuspended` per campaign. Wire up **Warn** (`POST /ad-campaigns/:campaignId/warn { note }` — campaign stays live, clears the flag, surface `autoSuspended` clearly if true since it means every one of that brand's active campaigns just got paused), **Take down** (existing bulk `POST /ad-campaigns/deactivate`, `reason` now required), and **Suspend/Unsuspend brand** (`POST /admin/brands/:brandId/suspend { reason }` / `POST /admin/brands/:brandId/unsuspend`, no body) as real actions in place of any "coming soon" disabled state.

Wherever the app lets a viewer flag an ad (e.g. on the billboard itself): `POST /ad-campaigns/:campaignId/report { reason }`, auth required, any role — treat a repeat report from the same user as a normal confirmation, not an error.

### Marketplace directory

Browse (`GET /marketplace/businesses?...`) → business cards, already public, no client-side filtering needed, no pagination cursor (use `limit`). Detail (`GET /marketplace/businesses/:brandId`) → full profile + active products in one call; render contact fields as tappable actions (`tel:`, `mailto:`, `https://wa.me/<digits>`, social links) and hide whichever are blank — a business only needed *one* contact method to publish. A 404 here means "not found or not listed," never distinguished. Product browse/detail work the same way, with `GET /marketplace/products/:productId` bundling the owning business's contact info so a "Contact seller" action needs no second lookup. `priceLabel` is pre-formatted display text — render as-is, never parse or reformat it.

Brand-side listing management: `GET /marketplace/business/profile/mine` loads the edit form (works even empty). `PUT /marketplace/business/profile` saves; use the response's `isListable` to grey out the Publish toggle with a clear requirement message rather than letting a submit bounce off a 400. Product CRUD (`POST`/`PUT`/`DELETE /marketplace/products*`, `GET .../mine`) is standard owned-resource management.

### Promote & Earn

1. **Brand posts a campaign**: `POST /promote/campaigns`, multipart `media` (image or ≤60s video) + `title`/`description`. No pricing/budget field to build — it's free to post, and the prize money (if any) is admin-funded per period, not brand-funded per campaign.
2. **A viewer shares it**: on a campaign detail screen, `POST /promote/campaigns/:campaignId/links` → `{ link: { slug, shareUrl } }`. Surface `shareUrl` with copy/share buttons. Calling this again for the same campaign just returns the same link — safe to call on every visit rather than caching client-side.
3. **The share link's own landing page** (`shareUrl`, e.g. `/promote/l/:slug` client-side) shows the campaign and a "Like this campaign" button. Resolve the campaign to display by extracting the `slug` from the URL and calling `POST /promote/like/:slug` when the button is tapped — that same call both looks up the campaign and records the like, no separate campaign-lookup-by-slug endpoint exists or is needed. If the visitor isn't signed in, `POST /promote/like/:slug` 401s — prompt login/signup and retry the same call after auth (same pattern as freebie claiming).
4. **Handle the like response's edge cases**: `alreadyLiked: true` (not an error — this is the real gate, one vote per user per (promoter, campaign) pair; show the response's `message` — "You have already voted for this promoter on this campaign." — rather than a failure state), `400 SELF_LIKE_NOT_ALLOWED` (a promoter tapping their own share link's like button — hide/disable the button entirely if you can detect this client-side, since the API rejects it anyway), `400 CAMPAIGN_NOT_ACTIVE` (the campaign's been paused — show it as no-longer-accepting-likes, not a generic error). No account-age gate exists — don't build UI for one.
5. **Leaderboard screen**: `GET /promote/leaderboard`, ranked `entries` + the open period's `prizeDescription`/`prizeAmount`. This is its own screen, not nested under any one campaign — it's the platform-wide cumulative ranking.
6. **"My shares" personal view**: `GET /promote/links/mine` — list every campaign this viewer has shared with each link's own like count; useful context alongside the leaderboard, but the leaderboard's `entries[].likeCount` (not a client-side sum of this list) is the authoritative cumulative total.
7. **Admin: campaign moderation** — same bulk deactivate/reactivate pattern as ad campaigns (§7, and `POST /promote/campaigns/deactivate`/`/reactivate`).
8. **Admin: prize periods** — a form to open a period (`periodStart`, `periodEnd`, `prizeDescription`, optional `prizeAmount`/`currency`), a live view of the leaderboard while it's `OPEN`, and a one-way "Settle" action once it's ready to close. Also expose per-like void and per-promoter disqualify/requalify as admin fraud-response actions — bulk-friendly, not one-at-a-time-only.

---

## 8. Standard Error Shape

Every non-2xx response, with the one auth exception noted in §3:
```
success: false
message: string
code?: string        // machine-readable — branch on this, not on message text
details?: object      // e.g. DAILY_LIMIT_REACHED: { type: "CASH"|"AIRTIME", resetsAt: string }
```
Common codes to handle explicitly: `CODE_ALREADY_TAKEN` (409), `DAILY_LIMIT_REACHED` (403), `PROFILE_INCOMPLETE` (403), `CODE_INVALID` (404), `TOO_MANY_ATTEMPTS` (429), `DEVICE_LIMIT_REACHED`/`IP_LIMIT_REACHED` (403, never disclose the threshold), `PROFILE_NOT_LISTABLE` (403, marketplace), `SELF_LIKE_NOT_ALLOWED` / `CAMPAIGN_NOT_ACTIVE` / `LINK_NOT_FOUND` (Promote & Earn, see §7), `BRAND_SUSPENDED` (403, ad campaigns / Promote & Earn) / `ADMIN_TAKEDOWN` (403, brand self-resume on an admin-taken-down campaign).

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
| `analytics.minCohort` | `10` | Minimum bucket size before a demographic slice is returned. |
| `promote.deviceDailyLikeCap` / `promote.ipDailyLikeCap` | `20` / `50` | Rolling-24h like ceiling per device/IP. No account-age gate exists — a brand-new account can vote immediately. |
| `promote.periodDurationDays` | `7` | Reference default only, for prefilling an admin "open a period" form — not enforced server-side. |
| `freebie.recentCatchesFeedSize` | `8` | Row count for `GET /freebies/recent-catches`. |
| `adModeration.autoFlagReportThreshold` | `3` | Reports (within the window below) before a campaign auto-flags. |
| `adModeration.autoFlagWindowMinutes` | `60` | Window the report threshold is counted within. |
| `adModeration.suspendStrikeThreshold` | `3` | Brand strikes before automatic suspension. |

`billboard.houseFillers` ships with `bannerImageUrl: ""` in every environment today, including production, until ops uploads real images — build a graceful placeholder for `type:"HOUSE"` slots with no URL.

---

## 10. Seed Content

Reference `SEED_CONTENT.md` for the exact starter phrase list (`scripts/seed-phrases.ts`) a fresh environment ships with, and the three house-filler slot titles. Useful for building UI against realistic copy before real data exists.

---

## 11. Status & Known Gaps

Validated against the actual final backend route/controller/model files, not reconstructed from a spec brief. `openapi.yaml` passes `swagger-cli validate`; `MOCK_FIXTURES.json` passes `JSON.parse`.

Open items:
- `billboard.houseFillers` video assets are placeholders everywhere today (§9) — build the empty state, don't wait on it.
- Promote & Earn (§2 Revamp 5) has no public campaign browse/discovery endpoint — a viewer currently only reaches a campaign by following a share link (or a brand/admin listing it). If a discovery feed is needed, that's a backend gap to raise, not something to build around client-side.
- There's no "un-void" for a specific voided like (only promoter-level requalify exists) and no automatic/scheduled prize-period opening — both admin actions are manual by design for now.
- **Interswitch CAC verification (Revamp 7) is not yet wired against Interswitch's real, confirmed API** — the automated pre-check will return `provider_error` in practice until this is resolved server-side, which is fine functionally (every KYC submission still reaches the human review queue either way, see Revamp 7), but don't build UI that assumes `automatedCheck.result: "match"` is a common/expected outcome yet.

Everything else in this document describes the API as it actually behaves right now.
