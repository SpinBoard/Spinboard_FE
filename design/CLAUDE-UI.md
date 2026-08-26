---
## 1. Pick the mark first

Open `freebiz-logo-concepts.html` and choose one. Then replace the single `<svg>` in every file —
it's the same snippet everywhere. Doing this before the build starts saves a find-and-replace pass
across a hundred components later.
---

## 2. Write the standing instruction file

Create `design/CLAUDE-UI.md` in the frontend repo. Claude Code reads it on every task, so the rules
survive across sessions and across context resets. This is the highest-leverage file in the whole
handover.

```markdown
# UI rules for this repo

## Use the first mark - the catch

Open `freebiz-logo-concepts.html` and choose "the catch". Then replace the single `<svg>` in every file —
it's the same snippet everywhere.

## Source of truth

The visual design is `design/freebiz-mockup.html` (desktop) and `design/freebiz-mobile.html`
(mobile). Where they disagree with existing code, THE MOCKUPS WIN. The existing UI is being
replaced, not extended.

## Never touch without being asked

- API clients, fetch/axios wrappers, request/response shapes
- Auth, session, and token handling
- Routing paths and route names (only the components they render change)
- State management stores, except to rename a field a component reads
- Anything in /server, /api, /lib/api

If a redesign appears to need an API change, STOP and say so. Do not change the API.

## Always

- Every colour comes from a CSS variable in tokens.css. No hex values in components. Ever.
- Every spacing, radius and font comes from a token. If a value isn't in tokens.css, add it there.
- Route theming is `data-route="viewer|brands|admin"` on the layout wrapper, which remaps
  --accent. Components read --accent; they never know which route they're in.
- Mobile first. Build the 380px case, then add 768px and 1080px. Breakpoints: 380 / 768 / 1080.
- Tables become cards below 768px. Never a horizontally scrolling table.
- Wins and confirmations are bottom sheets on mobile, not centred modals.
- 44px minimum tap targets. Visible keyboard focus. Respect prefers-reduced-motion on the
  ticker strips and the pulse animation.

## Copy

Use the exact strings from the mockups. They are written, not placeholder. "Take down & refund",
not "Delete". "Apply code", not "Submit". If you need new copy: plain verbs, sentence case,
real numbers, no exclamation marks.

## Definition of done for a screen

1. Side by side with the mockup screen, the layout, type scale and spacing match.
2. It works at 380px wide.
3. No hardcoded colours.
4. Every API call it made before, it still makes, unchanged.
```

---

## 3. Run it in this order

Do **not** ask for "redesign the app". One prompt per phase, each verified before the next.

### Phase A — tokens and shell

> Read `design/freebiz-brand-kit.html` section 05 and `design/CLAUDE-UI.md`.
> Create `src/styles/tokens.css` with the full token set, including the `[data-route]` accent
> overrides, and import it once at the app root. Then load the three Google fonts.
> Do not change any component yet. Show me the diff.

Verify: the app looks identical, but `tokens.css` exists and is loaded.

### Phase B — primitives

> Read `design/freebiz-mockup.html`. Build these primitives as components, styled exactly as in
> the mockup, using only tokens: Button (primary/ghost/danger/sm), Pill (live/warn/bad/info/
> brandish), Card, Stat, Input, Field, Table, VoucherChip, Avatar, Progress, LimitRow, Steps.
> Put them in `src/components/ui/`. Write a `/dev/ui` page that renders one of each so I can
> check them. Don't wire them into any existing screen yet.

Verify: open `/dev/ui`, compare against the mockup. Fix here — a wrong Button now is a wrong
Button in forty places later.

### Phase C — layout and navigation

> Build the app shell: top chrome, the route wrapper carrying `data-route`, the desktop sidebar,
> and the mobile bottom tab bar from `design/freebiz-mobile.html`. Keep every existing route path
> exactly as it is — only swap what renders the chrome around them.

### Phase D — screens, one at a time

One prompt per screen. Never batch.

> Rebuild the viewer Billboard screen to match `data-screen="v-watch"` in
> `design/freebiz-mockup.html` and the first phone frame in `design/freebiz-mobile.html`.
> Use only the primitives from `src/components/ui/`. Keep every existing data fetch and handler
> in this screen working exactly as it does now — rewrite the markup and styles, not the logic.
> List anything the design needs that the current API doesn't provide, but don't add it.

Repeat for: `v-promote`, `v-freebies`, `v-wallet`, `v-market`, `v-profile`, `b-dash`, `b-new`,
`b-contest`, `b-analytics`, `b-billing`, `a-monitor`, `a-prizes`, `a-payouts`, `a-permissions`,
`a-fraud`, `a-contest`.

### Phase E — sweep

> Search the whole `src/` for hex colour literals, `rgb(`, hardcoded px font sizes, and any
> remaining old stylesheet imports. Replace with tokens or delete. List anything you can't
> resolve rather than guessing.

---

## 4. Keeping it honest

- **One screen per commit.** When Claude Code goes sideways on a screen, `git checkout` that one
  file instead of unpicking a forty-file diff.
- **Work on a branch** (`ui/redesign`) and keep the old UI running on main until Phase E passes.
- **Screenshot-diff yourself.** Open the mockup and the app side by side at 380px and at 1280px.
  Claude Code can't see your browser; you are the visual check.
- **When it drifts, quote the file.** "That's not what `v-wallet` looks like in
  `design/freebiz-mockup.html` — the balance is centred and the threshold line is under it" works
  far better than "make it look better".
- **If it starts editing API files, stop the session.** Remind it of the never-touch list. This is
  the single most common failure and it's cheap to catch early, expensive to catch late.

---

## 5. For the backend developer

The UI changes almost nothing you have. Two things did change, and one is new:

**Changed — ads are no longer pre-moderated.** `POST /brands/campaigns` publishes straight to the
rotation. What you now need:

```
POST /ads/:id/report          viewer report, rate-limited, one per user per ad
GET  /admin/live              running ads + report counts + auto-flag reasons
POST /admin/ads/:id/takedown  { reasons[], note } → unpublish, notify brand, refund remaining days
POST /admin/ads/:id/warn      { note } → notify, leave running, add a strike
POST /admin/brands/:id/suspend
```

Auto-flag rules that fire on publish and while running: three viewer reports in an hour; category
rules for lending, betting and health; technical checks at upload (length, resolution, silent
audio); every ad from a brand carrying a strike.

**New — Phase 2 promoter contests.**

```
POST /brands/contests             { assetId, pot, days, winners, likeRules }
GET  /contests/:slug              public campaign page payload
POST /contests/:slug/like         idempotent, one per account, requires 24h-old account
GET  /contests/:id/leaderboard    promoter standings
GET  /promote/links               a viewer's links across contests
POST /promote/links               issue a link for { contestId, userId }
GET  /admin/contests              pots held, integrity flags
POST /admin/contests/:id/settle   recount, void suspect likes, release pot to winner's wallet
```

Two things must be server-side and cannot be trusted to the client: **like attribution** (which
promoter's link produced it) and **like validity** (account age, uniqueness, device fingerprint,
referrer). The pot is held from contest creation and only moves on settle.

**Unchanged:** codes, secret codes, wallet, payouts, limits, inventory, roles. Same shapes as before.

---

## 6. Prompt to start with, today

Paste this into Claude Code in the frontend repo once the design files are committed:

> Read `design/CLAUDE-UI.md`, `design/freebiz-design-spec.md`, `design/freebiz-brand-kit.html`
> and `design/freebiz-mockup.html`. Then, without changing any code yet: list every screen
> currently in this app, map each to the matching `data-screen` in the mockup, flag any screen in
> the app that has no mockup and any mockup screen the app doesn't have, and tell me which files
> hold the API calls you must not touch. Give me that as a table.

That inventory is what turns "redesign the app" into a checklist you can actually run.
