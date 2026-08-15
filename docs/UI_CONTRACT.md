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
4. On the video ending (or the viewer skipping past 95% watched — `Config: billboard.completionWatchFraction`): `POST /billboard/impressions/complete { sessionId, slotId, watchedMs }`. This is what counts as a "verified view" for analytics and referral qualification — an unverified/very-short view does not count.
5. Move to the next slot in the queue. When the queue is exhausted, fetch another batch with the same `sessionId` (it accumulates `recentCampaignIds` server-side so you won't see the same ad twice in a row or within the last 5).

A slot's `type` is either `"AD"` (real brand campaign, has `campaignId`/`brandName`) or `"HOUSE"` (a filler — no campaign metadata). Render both the same way visually; house fillers exist purely so the stream is never empty, not as a distinct ad unit the user needs to recognize.

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

`GET /me/claims` → full list, every secret code visible (decrypted) regardless of age or status — there is no "this is too old to show" state to design for. Each item's `status` (`ISSUED`/`REDEEMED`/`VOID`) determines whether to show an Apply/Redeem action (`ISSUED`) or just the result (`REDEEMED`) or a voided notice (`VOID`, admin-only action, rare). `POST /me/claims/:claimId/redeem` is the same redemption operation as typing the secret code into the Apply box — offer it as a one-tap "Redeem" button next to each `ISSUED` item so the user doesn't have to copy-paste their own code.

## Wallet screen

`GET /wallet/balance` gives everything needed for a "toward next payout" progress element: `balance`, `payoutThreshold`, `amountToThreshold`, `nextPayoutDate`. There is no withdraw action to wire up — see `BUSINESS_RULES.md`.

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
