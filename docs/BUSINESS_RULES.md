# Business Rules

The rules a frontend needs to know to build correct UI, not just correct API calls. Anything here that contradicts intuition (or the old SpinBoard product) is called out explicitly.

## The billboard never stops and is never gated

- The video billboard plays brand ads back-to-back. There is **no quiz, no "watch 5 to unlock a spin," no try-again economy**. Watching is not a means to an end — it's the whole first-class experience.
- Nobody has to be logged in, or have a complete profile, to watch. Auth/profile-completeness only matter the moment someone tries to **claim** a code.
- Every viewer, everywhere, draws from the identical eligible ad pool. **There is no geographic or demographic targeting anywhere in the system** — not in ad selection, not in freebie code eligibility, not in referral qualification. If a future request asks for "show this ad only in Nigeria," that's a product reversal of an explicit decision, not a missing feature.
- A campaign only enters the ad pool once it is **both** `status: "ACTIVE"` **and** `moderationStatus: "APPROVED"` — paid-but-unmoderated video never airs.
- Premium campaigns are picked ~2x as often as Basic (`Config: campaign.tiers.*.weight`), and never repeat back-to-back or within the last 5 slots served in a session.
- If the eligible pool is ever empty, a house-filler slot plays instead (`type: "HOUSE"` in the queue) — the stream is never empty.

## Freebie codes: first to type wins

- A code shown `PINNED` in the strip is either currently **claimable** (`state: "AVAILABLE"`) or was **just claimed by someone** and is shown red for a short grace window (`state: "TAKEN"`) before it disappears — never shown as "coming soon." **There is no way to see a future/scheduled drop through any endpoint.** Don't build a countdown-to-next-drop feature; the data to power it doesn't exist by design (unpredictability is the point).
- Claiming is a race: the first authenticated, eligible submission of a live `publicCode` wins it; everyone else gets `CODE_ALREADY_TAKEN` (409). This is enforced atomically server-side — the frontend doesn't need optimistic locking, just handle the 409 gracefully (it will be common and is not an error state to alarm the user over).
- **Auth is required to claim, never to watch.** An unauthenticated submission is rejected with 401 and **changes nothing** — the code stays available for the next (authenticated) submission, including the same person trying again a second later after logging in.
- Claiming further requires: verified email + a complete profile (age, sex, country, state, city). `country` here is **only** collected for records/reporting — it never restricts who can see or claim anything.
- Claim limits are **per type, per user, rolling 24h** (`Config: freebie.dailyClaimCap`, default 1 cash + 1 airtime) — a user capped on cash can still claim airtime the same day, and vice versa. On hitting the cap: 403 `DAILY_LIMIT_REACHED` with `{type, resetsAt}` in `details` so the UI can say precisely when it resets.
- Winning a code issues a **secret code** immediately in the claim response — this is the only time it's shown in full in a claim response; after that it's only visible via `GET /me/claims`.

## Redeeming: separate step, separate endpoint semantics, same button

- Applying a secret code is what actually pays out — either credits the wallet (cash) or reveals a recharge PIN (airtime). It is a **deliberately separate step** from claiming, but the frontend can and should offer **one input box and one Apply button** for both: `POST /freebies/apply` auto-detects whether the submitted value is a live public code (→ claim) or one of the caller's own secret codes (→ redeem).
- Redeeming the same secret code multiple times is **safe and idempotent** — it credits the wallet (or reveals the PIN) exactly once, and every subsequent call returns the same result (current wallet balance / the same PIN) rather than an error or a duplicate credit. Build the UI accordingly: re-submitting after a network hiccup is not dangerous and doesn't need a confirmation dialog.
- A secret code submitted by someone other than the account that won it is rejected as `CODE_INVALID` (404) — **identical** to a code that simply doesn't exist. The response never distinguishes "not real" from "not yours," so don't build UI that tries to tell a user their friend's leaked code belongs to someone else.
- Redemption has its own, tighter rate limit than claiming (`Config: rateLimit.redeem`, default 5/min) since it's the money-creating operation — a burst of legitimate retries (e.g. a flaky connection) can plausibly hit this; handle 429 (`code: "TOO_MANY_ATTEMPTS"`) with a "slow down and try again" message, not a hard failure state.

## Nothing a user has won ever expires

This is a hard, load-bearing rule across the whole product, not just freebie codes:
- A claimed freebie code's secret code can be redeemed any time — a day, a week, or a year later. There is no deadline field anywhere on `Claim`.
- The only "expiry-shaped" thing in the whole freebie system is `liveUntil` on an **unclaimed** `FreebieCode` — that's a display-rotation timer for something nobody has won yet, conceptually unrelated to an expiry on something a user has won. Once a code is claimed, `liveUntil` stops mattering entirely.
- Don't build a "your reward expires in X days" banner anywhere. If a design calls for one, that's a rule change, not a missing feature.

## Wallet cash only ever leaves the platform through a manual weekly run

- There is **no withdrawal or transfer endpoint** anywhere in the API. A user cannot self-serve a cash-out. Don't build a "Withdraw" button that hits an endpoint — it doesn't exist, on purpose.
- `GET /wallet/balance` surfaces `payoutThreshold`, `amountToThreshold`, and `nextPayoutDate` so the frontend can show progress toward the next payout ("₦350 more to reach this Friday's payout") without needing to know how the run itself works.
- Being below `payoutThreshold` only excludes a user from a payout *run* — it never restricts anything else, since there is nothing else in the product that spends wallet balance (the marketplace has no checkout at all — see below).
- Bank account details (`POST /wallet/bank-accounts`) are still collected and Paystack-verified — they now feed the manual payout export instead of an automated transfer.

## The marketplace is a directory, not a store

- There is **no checkout, no price paid in-app, no order, and no discount code anywhere in the marketplace.** `POST /marketplace/checkout`, `GET /marketplace/orders/*`, and the entire `DiscountCode` concept have been removed, not just hidden — don't build a cart, a checkout flow, or a discount-code input anywhere in the marketplace UI.
- A brand publishes a **business profile** (name, description, logo, contact email/phone/WhatsApp, address, social links) and, optionally, a set of **showcase products/services** (name, description, photos, an optional free-text `priceLabel` like `"From ₦5,000"` or `"Contact for quote"` — never a real charged amount). A user browses the directory, opens a business or a specific product, and contacts the business directly using the info shown — there is no in-app messaging or purchase action to build either, just clear, tappable contact links (`tel:`, `mailto:`, `https://wa.me/`, social profile links).
- A business only appears anywhere public once the brand explicitly sets `isListed: true` — this is never automatic just because the profile fields are filled in. Publishing requires at minimum a name and one contact method (email, phone, or WhatsApp); attempting to publish without them returns `403 PROFILE_NOT_LISTABLE` (`code`, not just a message — check DAILY_LIMIT_REACHED-style structured errors elsewhere for the pattern).
- Unpublishing a business (`isListed: false`) hides its products from every public browse/search/detail endpoint too, in one move — the frontend doesn't need to separately deactivate each product when a brand takes their listing down.
- Referral rewards pay out as **wallet cash** now (`REFERRAL_REWARD`, see `DATA_MODELS.md`), not a percent-off code — there's no purchase left in the product to apply a discount against, so the reward went straight to cash instead. If you're porting old frontend code that showed a "your discount code" reveal on a referral milestone, replace it with a wallet-credit notification instead.

## Suspicion scoring flags, it never blocks

A claim can be flagged `suspicious: true` (visible only in the admin claims view, never to the claiming user) for signals like inhuman latency between a code going live and being claimed, a headless-browser user agent, or no prior poll of the strip feed from that IP. **A flagged claim still succeeds normally for the end user** — this is a review signal for admins, not a gate. Don't build any end-user-facing "your claim looked suspicious" messaging; it doesn't exist and shouldn't.

## Premium-only analytics

Ad campaign analytics (`GET /ad-campaigns/:id/analytics*`) return 403 for Basic-tier campaigns — this is a monetization gate, not a bug. Build the brand dashboard to show an upsell/upgrade prompt for Basic campaigns rather than an empty chart.
