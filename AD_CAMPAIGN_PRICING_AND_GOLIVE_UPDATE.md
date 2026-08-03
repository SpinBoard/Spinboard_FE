# Ad Campaign Pricing, Go-Live Flow, Profile & Settings Update (2026-08-01)

All routes are mounted under `/api/v1`. Auth: `Authorization: Bearer <accessToken>` unless
marked **public**.

---

## 1. Pricing (breaking change)

- **Basic: $10/week** · **Premium: $15/week** — the old $20/$30/$50 three-tier (`basic`/`premium`/`pro`)
  pricing is gone. `pro` is no longer a valid `tier` value anywhere in the API.
- Total price = weekly rate × `numberOfWeeks`, converted to NGN at go-live time (live FX snapshot).
- Brand picks `numberOfWeeks` (whole number, currently **1–12**, admin-configurable) **when going
  live**, not at creation time.
- Premium-only perk: can be set to `global` visibility (shown to viewers in every country); Basic
  is always restricted to the brand's own country.

## 2. Campaign lifecycle

```
Create (draft, no payment, no profile check)
   ↓
Brand clicks "Go Live" → pick numberOfWeeks
   ↓
POST /ad-payments/initialize
   ├─ profile incomplete → 403 { code: "PROFILE_INCOMPLETE" } → show "complete your profile" prompt, do NOT proceed
   └─ profile complete → 200 { authorization_url } → redirect to Paystack checkout
   ↓
Paystack redirects back to {FRONTEND_URL}/payment/verify?reference=...
   ↓
GET /ad-payments/verify/:reference confirms payment
   ↓
Campaign flips draft → active, appears in the ad rotation, expires automatically after numberOfWeeks×7 days
```

Key point: **campaigns can always be created as drafts regardless of profile completeness** — brands
can create unlimited draft campaigns freely. The profile-completeness gate only blocks the
`initialize` (go-live/payment) call, not creation.

## 3. Endpoints

**Create campaign (draft)** — unchanged shape, but no longer requires a complete brand profile

`POST /ad-campaigns` (multipart/form-data, brand auth)
- `video` (file, ~90s max), `title`, `description`, `tier` (`"basic"|"premium"`), `questions`
  (JSON array of exactly 3: `{question, choices[], correctIndex}`), optional `brandUrl`,
  `campaignUrl`, `global` (bool, only allowed if `tier==="premium"`)
- Response: `{ success, campaign }` — `campaign.status: "draft"`, no price fields set yet.

**List my campaigns**: `GET /ad-campaigns/mine` (brand auth)
**Get one campaign**: `GET /ad-campaigns/:campaignId` (public)

**Go live / initialize payment** — **new required field: `numberOfWeeks`**

`POST /ad-payments/initialize` (brand auth)
```json
{ "campaignId": "...", "email": "brand@x.com", "numberOfWeeks": 4 }
```
Success `200`:
```json
{ "success": true, "data": { "authorization_url": "...", "access_code": "...", "reference": "...", "numberOfWeeks": 4, "amount": 62000, "currency": "NGN" } }
```
Profile incomplete `403`:
```json
{ "success": false, "message": "Complete your brand profile (business categories, country, state, city) before going live", "code": "PROFILE_INCOMPLETE" }
```
Other errors: bad `numberOfWeeks` (outside 1–12) `400`, campaign already paid `400`, not campaign owner `403`.

**Verify payment**: `GET /ad-payments/verify/:reference` (brand auth) — call this on the payment-callback page.

## 4. Edit Profile (already implemented, no changes)

- `PUT /profile/gamer` (multipart, avatar optional) — `firstName, lastName, username, avatar, age, sex, country, state, city`
- `PUT /profile/brand` (multipart, avatar optional) — `name, companyName, businessCategories (array or comma string), country, state, city`
- `GET /profile/gamer` / `GET /profile/brand` — read current profile
- **Brand "complete profile" = required for Go Live**: `companyName` + at least one `businessCategories` + `country` + `state` + `city`.
- **Viewer "complete profile"** (separate gate, used for the spin feature, not ads): `age` + `sex` + `country` + `state` + `city`.

## 5. Settings (new aggregate endpoint + existing mutations)

**New:** `GET /settings` (any authenticated role) — one call to render the whole Settings page:

```json
// brand
{ "success": true, "settings": {
  "role": "brand", "email": "...", "hasPassword": true, "isVerified": true,
  "notifications": { "emailNotifications": true, "referralBonusAlerts": true, "leaderboardUpdates": true, "newCampaignAlerts": true, "weeklyDigest": true },
  "account": { "companyName": "...", "avatar": "..." },
  "profileComplete": true
}}

// gamer/viewer
{ "success": true, "settings": {
  "role": "gamer", "email": "...", "hasPassword": true, "isVerified": true,
  "notifications": { ... same shape ... },
  "account": { "firstName": "...", "lastName": "...", "username": "...", "avatar": "..." },
  "privacy": { "showOnLeaderboard": true },
  "profileComplete": true
}}
```

**What goes on the Settings page** (both roles unless noted):

| Section | Action | Endpoint |
|---|---|---|
| Account | View email/role/avatar | `GET /settings` |
| Password | Change password (hide this section if `hasPassword: false` — Google sign-in accounts) | `PATCH /profile/change-password` `{currentPassword, newPassword}` |
| Notifications | Toggle each of 5 preferences independently | `PATCH /profile/notifications` (send any subset as booleans) |
| Privacy *(viewer only)* | "Show me on leaderboard" toggle | `PATCH /profile/privacy` `{showOnLeaderboard}` |
| Danger zone | Delete account (password-confirmed) | `DELETE /profile/account` `{password}` |
| Edit Profile | Link out to the profile-edit screen (separate from Settings) | `PUT /profile/brand` or `PUT /profile/gamer` |

Not included (nothing was specced for it, so it's not built): brand billing/payout preferences,
saved payment methods — Paystack checkout is redirect-based per transaction, no stored card
management.

## 6. Error shape (general)

All errors: `{ "success": false, "message": "..." }`, with an optional `"code"` field for specific
machine-checkable cases (currently only `PROFILE_INCOMPLETE`).
