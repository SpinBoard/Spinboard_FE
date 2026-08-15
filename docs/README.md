# Pazzell Frontend Docs

This bundle is written for a frontend engineer/AI session with **no access to the backend repository**. Everything you need to build against the API — endpoints, data shapes, business rules, config, seed content, and mock fixtures — is here. If something in the running API disagrees with these docs, the running API is right and this is a bug report waiting to happen; there's no other source of truth to reconcile against.

## What this product is

Pazzell is a continuous video billboard (brand ads, played back-to-back, no gate) ringed by scrolling text strips. Occasionally a strip shows a pinned, static **freebie code** (cash or airtime) instead of scrolling text. The first authenticated user to type that code into an Apply box wins it — winning issues a secret code, and applying that secret code (a separate step, same input box) actually pays out: credits the wallet or reveals a recharge PIN. Nothing a user wins ever expires. Cash only leaves the platform through a manual weekly admin payout run — there's no self-serve withdrawal.

If you worked against the old "watch 5 ads, answer quiz questions, spin a wheel" version of this product, read `CHANGELOG_FOR_FRONTEND.md` first — it tells you exactly what to rip out.

## Reading order

1. **`BUSINESS_RULES.md`** — read this first, always. It's short and covers the things that will make you build the wrong UI if you skip them (no expiry, no targeting, claim vs. redeem, the marketplace being a directory with no checkout at all).
2. **`UI_CONTRACT.md`** — the billboard + strip screen contract specifically: polling cadence, what each field means for rendering, error-state handling.
3. **`API_GUIDE.md`** — narrative endpoint-by-endpoint guide, organized by flow (auth, billboard, freebies, wallet, ad campaigns, marketplace, forum, admin).
4. **`openapi.yaml`** — the machine-readable spec (OpenAPI 3.0.3, validated). Point codegen/Swagger tooling at this.
5. **`DATA_MODELS.md`** — every response shape in one place, including the standard error envelope and its one documented exception.
6. **`CONFIG.md`** — every admin-tunable value (rate limits, caps, thresholds) and what it controls, for building the admin config screen and for understanding *why* a limit exists.
7. **`SEED_CONTENT.md`** — the actual starter copy (promo phrases, house-filler slots) a fresh environment ships with.
8. **`MOCK_FIXTURES.json`** — realistic payloads for local dev / MSW handlers, covering the edge cases named below.
9. **`CHANGELOG_FOR_FRONTEND.md`** — only relevant if you're porting old SpinBoard frontend code.

## Auth in one line

Every protected endpoint reads `Authorization: Bearer <accessToken>` — take `accessToken` from the JSON body of any login/register/activate response and use it as the bearer token. httpOnly cookies are also set but aren't what the frontend should build against. Full detail in `API_GUIDE.md`.

## Status of this bundle

Complete and validated against the actual final API surface (routes read directly from the backend's route/controller files, not from the original spec brief — behavior matches, exact paths may differ slightly from an early draft per the brief's own allowance for that). `openapi.yaml` passes `@apidevtools/swagger-cli validate`.

One thing flagged as **not fully resolved on the backend side** — don't build UI assuming it works, and don't spend time trying to wire around it from the frontend:

- **`billboard.houseFillers` video assets are placeholders** (`videoUrl: ""`) in every environment today, including production, until ops uploads real clips. Build a graceful empty state for a `type: "HOUSE"` slot with no `videoUrl`, don't assume it's always populated.

The marketplace's earlier wallet-spend gap no longer applies — the marketplace has no checkout of any kind now (business directory, not a store; see `BUSINESS_RULES.md` and `CHANGELOG_FOR_FRONTEND.md`).

Everything else in this bundle describes the API as it actually behaves right now.
