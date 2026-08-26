# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pazzell is a continuous video billboard: brand ads play back-to-back with no gate, no quiz, and
nothing to unlock. A perimeter strip around the board scrolls promotional text and occasionally
shows a pinned, static **freebie code** (cash or airtime). The first authenticated viewer to type
that code into an Apply box wins it — winning issues a private secret code, and applying that
secret code (a separate step, same input) actually pays out: credits the wallet or reveals a
recharge PIN. Nothing a viewer wins ever expires. Cash only leaves the platform through a manual
weekly admin payout run — there is no self-serve withdrawal.

Three account types:
- **Viewers** (`userType: "gamer"` in the API and in this codebase — a naming leftover from an
  earlier product, not a hint that there's a game here) — watch the billboard, catch freebie
  codes, refer friends, browse the marketplace.
- **Brands** — upload a video, buy a slot (Basic or Premium tier), and get flat-rate,
  time-boxed placement in the ad rotation. **Ads go live immediately on payment — there is no
  pre-publish moderation queue.**
- **Admins** — moderate reactively instead: bulk-deactivate a live campaign if its video turns
  out to be inappropriate (refunding nothing automatically, just pulling it from rotation), and
  bulk-reactivate one taken down by mistake. Admin accounts are provisioned directly on the
  backend; there is no self-registration path for this role.

There is also a **marketplace**, but it's a business directory, not a store: brands publish a
contact profile (name, description, logo, contact email/phone/WhatsApp, social links) and list
products/services with photos and a free-text price label; users browse and contact businesses
directly. There is no checkout, no in-app payment, and no discount code anywhere in the
marketplace.

The product has been through two backend revamps already (documented in
`docs/CHANGELOG_FOR_FRONTEND.md`): an older "SpinBoard" version (watch 5 ads, answer a quiz per
ad, spin a wheel to win) was replaced by the continuous billboard + freebie codes described above,
and the marketplace was separately pivoted from a checkout store to the directory described above.
**If you find code, types, or copy describing quizzes, a spin wheel, a 5-ad cycle, puzzle types
(trivia/word/memory/image), difficulty levels, or a marketplace checkout — that's leftover from
one of those two prior products, not the current one.** Don't extend it; flag it or replace it.

## Tech Stack & Architecture

- **Framework**: Next.js 15 (App Router) with TypeScript, React 19
- **Styling**: Tailwind CSS with shadcn/ui components (Radix primitives under `src/components/ui/`)
- **Backend**: An external REST API (Node, not part of this repo), mounted under `/api/v1`.
  **There is no database access from the frontend** — no Supabase, no direct DB queries of any
  kind. `@supabase/supabase-js` is still listed in `package.json` but is unused dead weight —
  there's no `src/lib/supabase.ts` and nothing in `src/` imports it.
- **API docs**: The entire backend contract — endpoints, data shapes, business rules, config,
  seed content, mock fixtures — lives in `docs/*.md`. Start with `docs/README.md`, which gives the
  reading order. If the running API disagrees with `docs/`, the API is right; treat the
  disagreement as a doc bug, not something to silently work around.
- **State Management**:
  - Jotai (`atomWithStorage`) for the logged-in user/session, in `src/atom/user.ts`
  - TanStack Query (React Query) for all server state, configured in `src/lib/query-client.ts`
    and provided via `src/providers/tanstack-provider.tsx`
- **API Client**: Axios instance with auth/error interceptors in `src/lib/api.ts`
- **Forms**: React Hook Form with Zod validation
- **Auth**: Bearer token issued by the backend on login/register/activate, stored on the Jotai
  user object and attached by the Axios request interceptor. httpOnly cookies are also set
  (notably an anonymous session cookie for logged-out billboard viewing) but the frontend builds
  against the header, not the cookie.
- **Payments**: Paystack, for brand ad-campaign checkout only (`/ad-payments/*`) — there is no
  in-app payment anywhere else (marketplace has no checkout, freebie cash-out is a manual admin
  payout run).
- **Realtime**: `socket.io-client` is a dependency and `src/lib/socket.ts` exists, but it is
  currently unused — its one call site in `src/components/layout/header.tsx` is commented out
  pending a notification system.
- **Testing**: Vitest + Testing Library (jsdom environment). `npm test` runs the suite once,
  `npm run test:watch` watches.

## Development Commands

```bash
# Start development server (proxies /api/v1/* to DEV_BACKEND_URL, default localhost:4000 — see next.config.ts)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint the codebase
npm run lint

# Run tests
npm test
npm run test:watch

# Docker
npm run docker:build
npm run docker:run
npm run docker:compose

# Deployment scripts (see scripts/deploy.sh and DEPLOYMENT.md)
npm run deploy:vercel
npm run deploy:docker
npm run deploy:railway
```

## Project Structure

```
src/
├── app/
│   ├── (routes)/
│   │   ├── (private-pages)/        # Wrapped in <ProtectedRoute> — auth required
│   │   │   ├── user/                # Viewer pages: dashboard, wallet, claims, referrals, profile, settings
│   │   │   ├── brand/                # Brand pages: dashboard, campaigns (list/create/detail/analytics),
│   │   │   │                          #   products, marketplace/profile, profile, settings
│   │   │   └── admin/                # Admin pages, gated to userType "admin": campaigns (bulk moderation)
│   │   └── (public-pages)/         # No auth required: login, register, verify-otp, forgot/reset-password,
│   │                                  #   about, watch (the billboard — works logged-out), marketplace, payment/verify
│   ├── _utils/
│   │   ├── endpoints.ts             # Every backend path, as constants — use these, never a hardcoded string
│   │   ├── routes.ts                # Every frontend route, as constants — same rule
│   │   ├── constants.ts             # BASE_URL (NEXT_PUBLIC_API_URL + "/api/v1")
│   │   ├── auth-session.ts          # Builds a UserData session from a login/verify/Google-auth response
│   │   └── helper.ts                # apiErrorMessage/apiErrorCode/apiErrorDetails, getOrCreateDeviceId
│   ├── layout.tsx                   # Root layout: fonts, TanstackProvider, ThemeProvider, Toaster
│   └── page.tsx                     # Public marketing landing page
├── atom/
│   └── user.ts                      # Jotai userAtom (atomWithStorage — persists the session to localStorage)
├── components/
│   ├── ui/                          # shadcn/ui primitives
│   ├── auth/                        # protected-route.tsx, google-auth.tsx
│   ├── layout/                      # header.tsx, footer.tsx, main-layout.tsx
│   ├── billboard/                   # perimeter-strip.tsx (ticker/pinned freebie codes), apply-box.tsx
│   ├── watch/                       # video-player.tsx, freebie-takeover.tsx (full-screen freebie slot), playing-bar.tsx
│   ├── brand/                       # go-live-dialog.tsx (ad-campaign checkout)
│   ├── marketplace/                 # contact-links.tsx
│   ├── marketing/                   # hero-billboard.tsx (landing-page mockup, not live data)
│   └── settings/                    # notif-toggle.tsx
├── hooks/                            # use-billboard.ts, use-freebies.ts, use-admin-config.ts,
│                                      #   use-brand-profile.ts, use-settings.ts — all wrap useQuery/useMutation
├── providers/
│   ├── tanstack-provider.tsx        # The TanStack Query provider actually used at the app root
│   └── theme-provider.tsx
├── lib/
│   ├── api.ts                       # Axios instance: Bearer-token request interceptor, 401 handling
│   ├── query-client.ts              # QueryClient config
│   └── socket.ts                    # socket.io client wrapper — currently unused, see above
└── types/
    └── index.ts                     # All TypeScript types/interfaces for API request/response shapes
```

Note: `src/components/providers/query-provider.tsx` also exists and also wraps
`QueryClientProvider`, but nothing imports it — `src/providers/tanstack-provider.tsx` is the one
actually wired into the app. Don't reach for the one in `components/providers/`.

## Architecture Patterns

### Authentication Flow
1. Viewer logs in via `/login`, registers via `/register`, or verifies via `/verify-otp` (email
   activation code) — Google OAuth is also available (`components/auth/google-auth.tsx`).
2. The backend returns `{ accessToken, refreshToken, user: { role } }`. `fetchUserDataForSession`
   (`src/app/_utils/auth-session.ts`) then fetches the role-specific profile (`GET /profile/gamer`,
   `GET /profile/brand`, or — for admin, which has no role-specific profile endpoint —
   `GET /me`) and assembles the `UserData` the app stores.
3. `UserData` (including `accessToken`) is written to the Jotai `userAtom`, which persists it to
   `localStorage` under the key `"user"`.
4. The Axios request interceptor in `src/lib/api.ts` reads that stored user on every request and
   attaches `Authorization: Bearer <accessToken>`.
5. On a `401` where a session *was* stored (i.e. a token just went stale), the response
   interceptor clears the stored user and hard-redirects to `/login`. A `401` on a call that was
   always unauthenticated (e.g. claiming a freebie code while logged out) does not trigger this —
   callers handle that inline instead.
6. `ProtectedRoute` (`src/components/auth/protected-route.tsx`) wraps the `(private-pages)` route
   group and redirects based on `allowedUserTypes` vs. the stored `userType`.

### API Communication
- Every backend call goes through the Axios instance in `src/lib/api.ts`.
- Every path is a constant in `src/app/_utils/endpoints.ts` — never hardcode a URL.
- Most data fetching goes through a TanStack Query hook in `src/hooks/`, but a number of page
  components call `api.get`/`api.post` directly inside their own `useQuery`/`useMutation` calls
  rather than through a shared hook — check the page itself, not just `src/hooks/`, before
  assuming a screen has no data-fetching logic to preserve.
- `BASE_URL` (`src/app/_utils/constants.ts`) is `NEXT_PUBLIC_API_URL + "/api/v1"`. In local dev,
  `next.config.ts` rewrites `/api/v1/*` to `DEV_BACKEND_URL` (default `localhost:4000`) so
  requests are same-origin — this sidesteps CORS and lets the backend's `SameSite=None` anonymous
  session cookie stick. This rewrite is a no-op in production builds.

### Route Organization
- App Router route groups: `(private-pages)` (wrapped in `ProtectedRoute`) and `(public-pages)`
  (no auth required — this includes `/watch`, the billboard itself, since watching never requires
  login; only claiming a freebie code does).
- Frontend route paths are centralized in `src/app/_utils/routes.ts` — import and use these
  constants rather than string-literal paths.
- Today's URL structure is viewer routes under `/user/*`, brand routes under `/brand/*`, admin
  routes under `/admin/*`. (A redesign currently in `design/` proposes flattening viewer routes to
  `/watch`, `/wallet`, etc. — see the note at the end of this file. That hasn't shipped yet; this
  is the structure as it exists in code today.)

### Component Patterns
- shadcn/ui primitives in `src/components/ui/`; feature components organized by domain
  (`billboard/`, `watch/`, `brand/`, `marketplace/`, etc.) alongside `src/hooks/` for their data
  fetching.
- `@/` resolves to `src/` (see `tsconfig.json` path mapping).

## Important Conventions

### TypeScript Types
- All API request/response types live in `src/types/index.ts`, imported via the `@/types` alias.
- Key interfaces: `UserData` (the stored session), `AdCampaign`, `BillboardQueueSlot`,
  `StripFeedItem`, `Claim`, `WalletBalanceResponse`, `MarketplaceProduct`.

### State Management
- Global session: Jotai `userAtom` from `src/atom/user.ts`.
- Server state: TanStack Query — a hook in `src/hooks/` where one exists, otherwise a
  `useQuery`/`useMutation` call directly in the page.
- Local UI-only state: `useState`.

### API Error Handling
- The Axios response interceptor only handles the stale-session 401 case (see Authentication Flow
  above); everything else is handled per call site.
- The standard error shape is `{ success: false, message, code?, details? }`, with one documented
  exception: a protected route hit with **no** `Authorization` header at all returns
  `{ error: "Authentication Failed" }` instead. `apiErrorMessage`/`apiErrorCode`/`apiErrorDetails`
  in `src/app/_utils/helper.ts` handle both shapes — use them rather than reaching into
  `error.response.data` directly.
- Toast notifications via `sonner`.

### Build Configuration
- TypeScript and ESLint errors are ignored during `next build` (`next.config.ts`) — `npm run lint`
  and `npx tsc --noEmit` are the real gates, run them yourself.
- `output: "standalone"`, for the Docker image.
- `images.remotePatterns` allowlists the specific external hosts actually in use (GitHub avatars,
  Google, Unsplash, the project's S3 asset bucket, etc.) — adding a new external image source
  requires adding its host here.

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:4000        # backend origin; BASE_URL appends /api/v1
NEXT_PUBLIC_SOCKET_URL=                           # optional — falls back to NEXT_PUBLIC_API_URL if unset
NEXT_PUBLIC_GOOGLE_CLIENT_ID=                     # required for the "Continue with Google" button to render at all
DEV_BACKEND_URL=http://localhost:4000             # dev-only, drives the next.config.ts API proxy
```

There is no Supabase URL/key to configure — despite what an older version of this file said, this
app has never talked to Supabase directly.

## Testing Locally
1. `npm install`
2. Set up `.env.local` per the variables above
3. Run a local instance of the backend (or point `NEXT_PUBLIC_API_URL` at a hosted one) — this
   repo has no database or backend of its own
4. `npm run dev`, then visit `http://localhost:3000`

## Deployment
- Primary target: Vercel (`vercel.json`)
- Also supported: Docker (`Dockerfile`, `docker-compose.yml`) and an AWS EC2 deployment (see the
  comment in `next.config.ts`) — the Docker/EC2 builds serve the standalone Next.js output
- Deployment scripts in `scripts/deploy.sh`; full guide in `DEPLOYMENT.md`

## API reference

Don't guess at the backend contract — it's fully documented. Read `docs/README.md` first for the
reading order, then `docs/BUSINESS_RULES.md` before building any UI (it covers the things that
will make you build the wrong screen if you skip it: no expiry, no geo-targeting, claim vs.
redeem, the marketplace having no checkout). `docs/API_GUIDE.md` and `docs/openapi.yaml` are the
endpoint references; `docs/DATA_MODELS.md` has every response shape.

## UI and design work

For anything visual — layout, styling, copy, new screens, redesigning existing ones — the
authority is not this file. Read, in order:

1. **`design/CLAUDE-UI.md`** — the standing UI rules (source of truth, never-touch list, token
   discipline, copy conventions, definition of done).
2. **`design/DECISIONS.md`** — the specific rulings on every current screen (restyle vs. rebuild
   vs. park), including the marketplace-naming decision and what to do about screens the mockup
   doesn't cover.

Where either of those disagrees with this file on anything UI-related, they win — they're newer
and more specific. This file's job is the product/stack/architecture context; theirs is the
redesign itself.
