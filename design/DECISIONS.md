# DECISIONS.md — rulings on the screen inventory

Commit this to `design/` next to `CLAUDE-UI.md`. It resolves every item the Phase 0 inventory
flagged. Where this file and the mockup disagree, **this file wins** — it is newer.

---

## The governing rule

The mockup is authoritative **where it speaks**, and **silent, not opposed**, where it doesn't.

A screen that has no `data-screen` in the mockup is not automatically wrong and is not
automatically deleted. Sort every such screen into one of three buckets:

- **RESTYLE** — the screen stays, its layout stays, its routes and API calls stay. It gets
  tokens, primitives, type scale and copy tone from the design system. No redesign.
- **REBUILD** — a mockup screen exists for it; rebuild the markup to match.
- **PARK** — the screen stays on its route and keeps working, but is removed from navigation and
  gets no design work this cycle. Nothing is deleted.

---

## Table A — rulings, item by item

Numbers refer to the inventory's Table 1.

| #     | App route                                        | Ruling                                             | Detail                                                                                                                                                                                                                                                                            |
| ----- | ------------------------------------------------ | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `/watch`                                         | **REBUILD** → `v-watch`                            | Highest priority screen in the app. Do it first.                                                                                                                                                                                                                                  |
| 2     | `/user/claims`                                   | **REBUILD** → `v-freebies`                         |                                                                                                                                                                                                                                                                                   |
| 3     | `/user/wallet`                                   | **REBUILD** → `v-wallet`                           |                                                                                                                                                                                                                                                                                   |
| 4     | `/user/profile`                                  | **REBUILD** → `v-profile`, top half only           | Take the "Your details" card. Leave referrals out.                                                                                                                                                                                                                                |
| 5     | `/user/referrals`                                | **REBUILD** → `v-profile`, bottom half             | Take the "Invite people" and "Referrals" cards onto this route. **Do not merge the routes.** Routing is on the never-touch list; the mockup showing them on one page is a layout convenience, not an instruction to restructure the app.                                          |
| 6     | `/user/dashboard`                                | **PARK**                                           | The board _is_ the viewer's home. Remove from nav; the five tabs are Board / Promote / Freebies / Wallet / You. Leave the route working and untouched. Revisit after launch — if nothing links to it in 30 days, delete it then.                                                  |
| 7     | `/user/profile/complete`                         | **RESTYLE**                                        | Onboarding. Keep the flow exactly as-is; apply tokens and primitives only.                                                                                                                                                                                                        |
| 8     | `/user/settings`                                 | **RESTYLE**                                        | Password, notifications, account. Real and necessary; the mockup just didn't cover it. Style it with `Card`, `Field`, `Input`, `LimitRow`.                                                                                                                                        |
| 9–11  | `/marketplace/*`                                 | **PARK** — see §Marketplace below                  | Concept collision, resolved separately.                                                                                                                                                                                                                                           |
| 12    | `/brand/dashboard`                               | **REBUILD** → `b-dash`, stats + first 4 table rows | Summary view. Table is truncated with a "See all campaigns" link.                                                                                                                                                                                                                 |
| 13    | `/brand/campaigns`                               | **REBUILD** → `b-dash`, full table                 | Same components, no truncation, plus filters.                                                                                                                                                                                                                                     |
| 14    | `/brand/campaigns/[id]`                          | **REBUILD — new spec below**                       | The mockup is genuinely incomplete here. See §Campaign detail.                                                                                                                                                                                                                    |
| 15    | `/brand/campaigns/create`                        | **REBUILD** → `b-new`                              | Note the mobile version in `freebiz-mobile.html` — one scroll, no wizard steps.                                                                                                                                                                                                   |
| 16    | `.../analytics`                                  | **REBUILD** → `b-analytics`                        | Keep the app's route path. Ignore the spec's `/brands/audience` naming — it's a doc inconsistency, not an instruction to move the route.                                                                                                                                          |
| 17–19 | `/brand/marketplace/profile`, `/brand/products*` | **PARK** — see §Marketplace                        |                                                                                                                                                                                                                                                                                   |
| 20    | `/brand/profile`                                 | **RESTYLE**                                        | Company details, logo, RC number. Necessary; the mockup omitted it.                                                                                                                                                                                                               |
| 21    | `/brand/profile/complete`                        | **RESTYLE**                                        | Onboarding.                                                                                                                                                                                                                                                                       |
| 22    | `/brand/settings`                                | **RESTYLE**                                        | The inventory is right that this is **not** `b-billing`. Settings is password and notifications. Billing is a separate, unbuilt screen. Keep them separate.                                                                                                                       |
| 23    | `/admin/campaigns`                               | **REBUILD** → `a-monitor`, in two stages           | See §Live monitor.                                                                                                                                                                                                                                                                |
| 24    | `/`                                              | **RESTYLE, then rewrite copy**                     | Marketing landing. Apply the design system now; the launch copy from `freebiz-marketing-kit.html` goes in during the first-100 campaign, not during the redesign.                                                                                                                 |
| 25    | `/about`                                         | **RESTYLE**                                        |                                                                                                                                                                                                                                                                                   |
| 26–30 | Auth screens                                     | **RESTYLE**                                        | Login, register, forgot, reset, verify-OTP. These are the first thing a new viewer sees after a flier — they must not look like a different product. Center a `Card` on the ink background, one `Field` stack, one primary `Button`, the wordmark above. That's the whole design. |
| 31    | `/payment/verify`                                | **RESTYLE**                                        | Paystack return. Style the three states — pending, success, failed — with the pill and card primitives. Per the voice rules: the failure state says what went wrong and what to do, and does not apologise.                                                                       |

---

## Marketplace — the one real product decision

The inventory is right, and this is the most important thing it found. The app's marketplace is a
**business directory**: browse brands, view products, open a business profile. The mockup's
`v-market` is a **redemption catalog**: spend wallet balance on airtime, data and vouchers. Same
word, different products.

**Ruling for this cycle: PARK the directory, BUILD the redemption catalog.**

- `/marketplace`, `/marketplace/[productId]`, `/marketplace/business/[brandId]`,
  `/brand/marketplace/profile`, `/brand/products`, `/brand/products/new` — all stay on their
  routes, keep working, get **no design work**, and come out of the navigation.
- Build `v-market` as a new redemption screen. Wire it to the wallet, not to the product catalog.

Why park rather than redesign or delete:

1. **The redemption catalog is load-bearing and the directory isn't.** Wallet balance with nothing
   to spend it on means every viewer must reach the ₦10,000 cash-out threshold before Freebiz
   gives them anything, and most never will. Redemption is what makes a ₦300 balance feel real.
2. **Redesigning a product line you might cut is the most expensive mistake available here.**
   Parking costs nothing and is reversible in a day.
3. **Deleting it is also premature.** A brand directory is a plausible second revenue line and the
   code already exists. Parked code costs nothing but a nav entry.

**This is the one ruling on this page that is a business call rather than a design call.** If the
directory is already earning money or is promised to signed brands, say so and it gets promoted
back to RESTYLE with its own nav entry named **Brands** (never "Marketplace" — that word now
belongs to redemption, and two things called Marketplace will confuse users and developers alike).

HERE IS THE BUSINESS DECISION: rename the existing marketplace for brand directory and product listings to Brands and restyle it. and then, keep the new market place for redemption as marketplace

---

## Campaign detail — filling a real gap in the mockup

`/brand/campaigns/[id]` has no mockup screen because I missed it. It's needed. Build it from parts
that already exist rather than inventing a new layout:

- **Header** — campaign name, `0:44` duration, slot pill (Basic/Premium), status pill, and the
  primary action for its current state (Pause / Resume / Upload new cut).
- **Player** — the `reviewface` block from `a-monitor`.
- **Stats row** — four `Stat` tiles: plays, full-watch %, spend to date, days remaining.
- **Audience** — the two `bars` cards from `b-analytics`, gated behind Premium exactly as that
  screen gates them.
- **Status card** — if the ad was taken down or warned, the red-bordered card from `b-dash` with
  the admin's note verbatim and the refund line.
- **Schedule** — the `LimitRow` stack: start, end, days, cost to date.

No new primitives. If you find yourself needing one, stop and ask.

---

## Live monitor — split it in two

`/admin/campaigns` today is a bulk activate/deactivate list. `a-monitor` needs report counts,
auto-flag reasons, a warn action and strikes — **none of which exist in the backend yet.**

- **Stage 1, now (frontend only):** rebuild the existing list to `a-monitor`'s layout and
  primitives — queue rail, player, take-down panel — using only data the API returns today. Render
  the report count, auto-flag and strike affordances as **disabled with a "coming soon" pill**.
  Do not fake the numbers and do not invent endpoints.
- **Stage 2, after the backend ships** `POST /ads/:id/report`, `GET /admin/live`,
  `POST /admin/ads/:id/takedown`, `POST /admin/ads/:id/warn`, `POST /admin/brands/:id/suspend`:
  enable them.

---

## Table B — the eight unbuilt mockup screens, prioritised

These are **feature work, not redesign**. They do not belong in the redesign branch. Ship the
redesign first.

| Screen                                | When                  | Why                                                                                                                                                                                                                                     |
| ------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v-market`                            | **With the redesign** | See §Marketplace. It's the only new screen the redesign itself needs.                                                                                                                                                                   |
| `b-billing`                           | **Immediately after** | The 30-day first-100 offer needs somewhere to show the plan, the days remaining, and a card on file. Without it, day-31 conversion collapses — the brand has to go and find their card again. This is the highest-value unbuilt screen. |
| `a-payouts`                           | **Immediately after** | The backend already has `admin/payout-runs*`. Someone is currently settling cash-outs by hand against a database. This is a small screen that removes a weekly manual risk.                                                             |
| `a-prizes`                            | Next                  | Freebie config is server-side today, which means an engineer is needed every time the prize schedule changes.                                                                                                                           |
| `a-permissions`                       | Next                  | Needed before the team grows past the people who have database access.                                                                                                                                                                  |
| `a-fraud`                             | Next                  | Needed before viewer volume makes fastest-fingers worth scripting. Watch for this the week after the first flier campaign.                                                                                                              |
| `v-promote`, `b-contest`, `a-contest` | **Phase 2, not now**  | The contest backend doesn't exist. Do not scaffold these.                                                                                                                                                                               |
|  |

---

## Two process amendments

**1. Extract the data layer before rebuilding markup.** The inventory found 23 page components
that mix JSX with `useQuery`/`useMutation` bodies. Rebuilding markup around live query code is how
API calls get accidentally rewritten. So, for each of those files, run a **separate, mechanical,
zero-visual-change commit first**: move the query and mutation definitions into a
`use-<screen>.ts` hook beside the existing hooks, have the page import it, and verify the screen
is byte-identical in the browser. Then rebuild the JSX in the next commit. Two commits, and the
diff of the second one contains no `queryFn` bodies at all — which makes it reviewable at a glance.

**2. Fix `CLAUDE.md` now, in its own commit.** A project overview describing a Supabase-backed
puzzle game will silently poison every future session — Claude Code reads it on every task and
will keep reaching for a `src/lib/supabase.ts` that doesn't exist. Rewrite it against the real
`docs/*.md` before Phase A. While in there, search the tree for other BrandPuzzle-era leftovers;
where there's a stale overview there are usually stale types and dead imports.
