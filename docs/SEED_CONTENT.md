# Seed Content

The starter copy the backend ships with (`scripts/seed-phrases.ts`, idempotent — safe to re-run). Use this to build UI against realistic text lengths/tone before real data exists, and as the reference for what `GET /freebies/phrases` / the strip feed's `PROMO` items will actually say on a fresh environment.

## PROMO (scrolling, always-on filler)
- Keep watching — a code could land any moment.
- Somebody's about to get lucky. Could be you.
- Eyes on the edges. That's where the money shows up.
- Free airtime doesn't announce itself. Stay ready.
- Green means nobody has taken it yet.
- Blink and it's somebody else's.
- The fastest fingers eat here.
- Codes drop without warning. Stay on the board.
- Your next recharge could land on this screen.
- Patience pays here. Literally.
- Still watching? That's how winners start.
- No schedule. No warning. Just watch.

## FREEBIE_LIVE (scrolling, shown while a code is pinned — tokens pre-substituted by the backend before you ever see them)
- `{value}` is live — type it before someone else does!
- It's up! Green means it's still yours to take.
- Act fast — delay is dangerous.
- First to apply wins. Go!
- Money on the board. Move!
- Airtime alert — that's a live code.
- This code has one owner. Make it you.
- Gone in `{seconds}`s. Type fast.
- Somebody is already typing. Be faster.

## FREEBIE_GONE (scrolling, shown right after a code is claimed)
- Red already — somebody was faster.
- That one's gone. The next one is coming.
- Too slow — but the board never stops.
- Claimed. Stay right there.

## EMPTY_STATE (fallback when nothing else applies — should be rare)
- The board is warming up…

## WELCOME (not specified by the original brief; two sensible defaults seeded so the slot isn't empty)
- Welcome to Pazzell — watch, and keep an eye on the edges.
- New here? Green codes are free. First to type it wins.

## House-filler video slots (`Config: billboard.houseFillers`)

Three placeholder filler slots exist in `Config`, played when the real ad pool is empty. **`videoUrl` is empty (`""`) for all three in every environment today** — no real hosted asset exists yet. Ops needs to upload real clips and point this config at them before launch; until then, expect `videoUrl: ""` in `type: "HOUSE"` queue slots in any environment, including production, and build a graceful empty/placeholder state for that case rather than assuming a URL is always populated.

| title | durationSec | filler tag |
|---|---|---|
| Discover Pazzell | 15 | promo |
| Invite a friend, earn together | 15 | referral |
| Advertise on Pazzell | 15 | advertise |
