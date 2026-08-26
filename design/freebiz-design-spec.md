# Freebiz — Design & Build Spec

Companion to `freebiz-mockup.html` (interactive prototype) and `freebiz-brand-kit.html` (identity).
This is the document to hand to Claude Code.

---

## 1. What the product is

One public billboard streams brand video ads continuously. Freebie codes (cash, airtime, discount)
appear pinned on the frame between ads. The first person to type a code into the apply field wins it
and receives a private **secret code**. Cash secret codes credit the wallet; airtime secret codes
reveal a recharge PIN. Brands buy slots on the board. **Ads go live without moderation** — admins watch what is running,
take down anything that breaks the standards (refunding the remaining days), load and schedule the
prizes, settle payouts, and decide who has which powers.

Three surfaces, one design system, one accent token swapped per surface.

---

## 2. Route map

### `/` — Viewer
| Route | Screen | Purpose |
|---|---|---|
| `/watch` | Billboard | The board, ticker strips, pinned code, apply field, live stats, catch feed |
| `/promote` | Promote & earn | **Phase 2** — pick a contest, get your link, share, leaderboard |
| `/freebies` | My freebies | Everything caught; reveal airtime PINs; nothing expires |
| `/wallet` | Wallet | Balance, ledger, cash-out threshold, daily limits |
| `/marketplace` | Marketplace | Spend wallet — airtime, data, brand vouchers. No minimum |
| `/profile` | Profile & referrals | Demographics for aggregate reporting, referral link |

### `/brands` — Brand
| Route | Screen | Purpose |
|---|---|---|
| `/brands` | Dashboard | Campaign table, plays, spend, review status, reviewer notes |
| `/brands/campaigns/new` | New campaign | 60s video upload, details, Basic/Premium slot, schedule, cost estimate |
| `/brands/contests` | Promotion contests | **Phase 2** — post an image/video, set a pot, watch promoters compete |
| `/brands/audience` | Audience | Country / age / gender breakdown — **Premium only** |
| `/brands/billing` | Plan & billing | Basic vs Premium, invoices |

### `/admin` — Admin
| Route | Screen | Purpose |
|---|---|---|
| `/admin/monitor` | Live monitor | Everything running, viewer reports, auto-flags, take down & refund, strikes |
| `/admin/freebies` | Freebie inventory | PIN stock, cash budget, day-long drop schedule, code lifecycle |
| `/admin/payouts` | Payout desk | Verify secret codes, mark paid (manual, Fridays) |
| `/admin/roles` | Roles & permissions | Grant powers per person; approve brand accounts |
| `/admin/contests` | Contests | **Phase 2** — pots held, like-fraud, recount and settle |
| `/admin/abuse` | Abuse signals | Device/IP caps, suspected scripts, block/unblock |

---

## 3. Rules the UI must enforce

- Video is **60 seconds maximum**, one file, no quiz or questions attached.
- **No geo targeting.** Everyone everywhere sees every ad and every code. Fastest fingers.
- Logged-out visitors can watch and see codes; applying one redirects to registration. No holds, no reservations.
- Public code on the board is **static/pinned**; the promo text around it scrolls.
- Unused code states: **mint = open**, **red = gone**. Nothing else carries those two colours.
- An unclaimed airtime PIN returns to stock after **one hour** and is reissued under a new public code.
- Daily caps: **1 cash + 1 airtime per user**, **3 claims per device**, plus a per-IP ceiling.
- Nothing a viewer wins ever expires — no PIN deadline, no expiring balance, no expiring voucher.
- Cash-out is **manual**: request → secret code → admin pays by transfer on the published Friday. Wallet spending in the marketplace has no minimum; cash-out has a threshold (~3× a typical prize).
- Two plans only: **Basic** and **Premium**. Premium shows 2× as often and unlocks audience reporting.
- **Ads publish immediately.** No approval queue. Admins monitor what is live and take down after the fact; a take-down refunds the brand's remaining days and adds a strike. Three strikes suspends the brand.
- Auto-flags: three viewer reports in an hour, category rules (lending / betting / health), technical checks at upload, and every ad from a brand on a strike.

### Phase 2 — promoter contests
- A brand posts an image or a video and puts up a **prize pot**, held by Freebiz for the contest's length.
- A viewer takes a **unique link per contest** and shares it on their own social platforms.
- Visitors land on a public Freebiz campaign page and **like** it. One like per signed-in account; accounts under 24 hours old don't count.
- **Most likes wins the whole pot**, paid into the winner's wallet on settlement. Ties go to whoever led first.
- Attribution and validity are **server-side only**. Bought or farmed likes are voided and the promoter is disqualified.

---

## 4. Component inventory

`Voucher chip` (signature — dashed border, notched ends, mono code, mint/red states) ·
`Board` (frame + 4 ticker strips + screenface + progress) · `Ticker strip` (horizontal & vertical) ·
`Apply bar` · `Stat tile` · `Pill` (live / warn / bad / info / brandish) · `Data table` ·
`Card` · `Field + Input + Textarea` · `Button` (primary / ghost / danger / sm) ·
`Nav item` · `Route switcher` · `Step block` · `Upload dropzone` · `Tier selector` ·
`Bar chart row` · `Review queue item` · `Rule checklist` · `Drop timeline` ·
`Permission tick grid` · `Verify panel` · `Limit row` · `Feed list` · `Plan card` ·
`Flag card` · `Contest card` · `Share row` · `Rank strip` · `Public like page` · `Bottom sheet` ·
`Bottom tab bar`

---

## 4b. Mobile

Most users are on phones. `freebiz-mobile.html` is the normative mobile design; the desktop mockup
is the same components at 1080px. Breakpoints **380 / 768 / 1080**, built mobile-first.

- Board is **16:11** below 768px, 16:9 above. Vertical ticker strips are hidden below 768px, never shrunk.
- The apply field sits under the player and **sticks to the bottom** once the player scrolls away.
- Wins are **bottom sheets**, never centred modals. The secret code is one tap to copy.
- **Tables become cards** below 768px. No horizontally scrolling tables anywhere.
- **Bottom tab bar** on all three routes, no hamburger. Admin gets five tabs so a take-down is never two menus deep.
- 44px minimum tap targets; share rows wrap rather than scroll.

---

## 5. Tokens

Copy `freebiz.tokens.css` from section 05 of the brand kit. The key mechanic:

```html
<div data-route="brands"> ... </div>   <!-- --accent becomes Signal Violet -->
```

Every component reads `--accent` and `--accent-soft`. Nothing hardcodes a route colour.

---

## 6. Suggested build order

Following the backend-first method: write and run the backend prompt, let it emit the API +
integration docs, then run the frontend prompt against those docs plus this spec.

**Backend surface, at minimum**

```
POST /auth/register            POST /auth/login
GET  /board/now                 → current ad, queue position, live code (if any), phrase
GET  /board/stats               → watching now, codes today, unclaimed
POST /codes/apply {code}        → 401 if guest, 409 if taken, else {secretCode, type, amount}
POST /secrets/reveal {secret}   → airtime PIN, or wallet credit confirmation
GET  /wallet                    GET /wallet/ledger      POST /wallet/cashout
GET  /freebies/mine
POST /brands/campaigns          (multipart, ≤60s validated server-side)
GET  /brands/campaigns          GET /brands/audience    (403 unless Premium)
POST /ads/:id/report            viewer report, rate-limited, one per user per ad
GET  /admin/live                running ads + report counts + auto-flag reasons
POST /admin/ads/:id/takedown    {reasons[], note} → unpublish, notify, refund remaining days
POST /admin/ads/:id/warn        {note} → notify, leave running, add strike
POST /admin/brands/:id/suspend
GET  /admin/inventory           POST /admin/inventory/import   POST /admin/drops/schedule
GET  /admin/payouts             POST /admin/payouts/:id/settle
GET  /admin/roles               PATCH /admin/roles/:userId
GET  /admin/abuse

# Phase 2 — promoter contests
POST /brands/contests           {assetId, pot, days, winners, likeRules}
GET  /contests/:slug            public campaign page
POST /contests/:slug/like       idempotent, one per account, 24h account-age gate
GET  /contests/:id/leaderboard
GET  /promote/links             POST /promote/links {contestId}
GET  /admin/contests            POST /admin/contests/:id/settle
```

Server-authoritative on everything that decides a winner: code validity, first-applier resolution,
cap enforcement, and the one-hour PIN return sweep. The client never decides who won.

**Prompt to paste into Claude Code (frontend)**

> Build the Freebiz web app frontend from `freebiz-design-spec.md`, `freebiz-brand-kit.html`
> (tokens in section 05) and `freebiz-mockup.html` (visual reference for every screen).
> Three route groups — viewer, brands, admin — sharing one component library themed by a
> `--accent` token set on a `data-route` wrapper. Match the mockup's layout, spacing, type scale
> and copy. Wire it to the endpoints documented in the backend output. Ship responsive down to
> 380px, visible keyboard focus, and `prefers-reduced-motion` respected on the ticker strips.

---

## 7. Handoff

`freebiz-claude-code-handoff.md` is the operational guide for replacing the existing UI through
Claude Code — the standing `CLAUDE-UI.md` rules file, the five build phases, the never-touch list
that protects your working API layer, and the prompts to paste at each step.

---

## 8. Still open

- Where the catchy phrase rotation is authored — admin-managed list, or seeded in code?
- Whether brand vouchers in the marketplace cost wallet balance or are free pickups.
- Whether the referral bonus is cash to wallet or a guaranteed freebie.
- Whether the 30-day first-100 offer covers Basic only or Premium too (Basic is the safer call).
- Phase 2: whether a contest can also require a full video watch, or a brand-page follow, before a like counts.
