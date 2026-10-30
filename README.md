# Sharad Utsav 2026 — Festival booking

**Live URL:** _(add your Vercel production URL here after deploy)_

Mobile-friendly booking flow for Sharad Utsav 2026 at Radha Krishna Temple, Allen, Texas. Families pick tickets and extras, enter guests, apply a promo, pay (simulated), and get a confirmation.

The **server** calculates price, checks age rules, applies promos, and decrements stock. The browser is never trusted for the amount charged.

## Stack

- Next.js 15 (App Router) · JavaScript · plain CSS
- Domain logic in `src/domain/` (pure functions)
- **MongoDB** when `MONGODB_URI` is set; in-memory store for local demo only
- Vitest for pricing and age tests

## Run locally

```bash
pnpm install          # or: npm install
pnpm dev              # http://localhost:3000
pnpm test
```

Without `MONGODB_URI`, stock lives in memory for the Node process (fine for `pnpm dev`, not for Vercel).

### With MongoDB (required for production)

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (or run MongoDB locally)
2. Copy `.env.example` → `.env.local` and set `MONGODB_URI`
3. Seed stock and promo codes:

```bash
pnpm db:seed
```

## Environment variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string. Stock and bookings persist across serverless invocations. |
| `MONGODB_DB` | Optional database name (default: `sharad_utsav`) |

**Important:** your local `.env` is gitignored and is **not** uploaded to Vercel. You must copy the same values into the Vercel dashboard:

1. Vercel → your project → **Settings** → **Environment Variables**
2. Add `MONGODB_URI` = your Atlas connection string (same as local `.env`)
3. Optionally add `MONGODB_DB` = `sharad_utsav`
4. Enable for **Production** (and Preview if you want)
5. **Redeploy** the project (env vars only apply to new deployments)
6. Seed once from your laptop: `MONGODB_URI="..." pnpm db:seed`

If the site still says “in-memory stock”, the live deploy cannot see `MONGODB_URI` — check the name spelling and that you redeployed after saving it.

## API contract

### `GET /api/catalog`

Returns event info, days, tickets, extras, and live `remaining` / `soldOut` flags.

### `POST /api/quote`

```json
{
  "cart": {
    "tickets": [{ "kind": "DAY_ADULT", "day": "2026-11-10", "qty": 2 }],
    "extras": [{ "kind": "DANDIYA", "qty": 1 }]
  },
  "promoCode": "SEVA10",
  "booker": { "name": "…", "email": "…", "phone": "…", "age": 30 },
  "attendees": [{ "name": "…", "age": 30 }, { "name": "…", "age": 8 }],
  "requirePeople": true
}
```

Response includes `ok`, `errors[]`, `lines`, `subtotalCents`, `discountCents`, `totalCents`, `promoMessage`. Client-sent money fields are ignored.

### `POST /api/bookings`

Same cart/people/promo as quote, plus:

```json
{
  "payment": { "method": "simulated", "idempotencyKey": "uuid" }
}
```

- `201` — new booking  
- `200` — same idempotency key replayed  
- `400` — validation errors  
- `409` — stock conflict  

### `GET /api/bookings`

Lists recent bookings (newest first) for the door / volunteer view at `/bookings`.

### `GET /api/bookings/:id`

Confirmation payload for the success screen.

## Promo codes

| Code | Behaviour |
|------|-----------|
| SEVA10 | 10% off subtotal |
| FLAT20 | $20 off (floor at $0) |
| KIDSFREE | Child day/all-day ticket lines free; family/adults/extras unchanged |
| EXPIRED5 | Valid code, expired — rejected |
| MAXEDOUT | Valid code, uses exhausted — rejected |

## Decisions I made

1. **Stock is global per SKU, not per day** — Day Adult 380 is shared across all five days.
2. **Toddlers under 5** — free, no ticket, optional on the guest list for the door.
3. **Family pass people** — each pass = 2 adults + 2 children. Passes on different days can be the same family (we take the max day), so we do not force 4+4 adults/children for Tue+Wed.
4. **Dinner / workshop** — need ticket coverage that day; dinner qty cannot exceed ticketed seats that day.
5. **KIDSFREE** — only zeros `DAY_CHILD` / `ALLDAY_CHILD` lines, not the family flat rate.
6. **One promo at a time**; blank promo = no discount.
7. **Simulated payment** with idempotency key to stop double-book on double-click.
8. **MongoDB** for durable stock (not SQL) — conditional `$inc` with `remaining >= qty` so two buyers cannot take the last workshop seat. In-memory fallback only when `MONGODB_URI` is missing.
9. **Plain JS + CSS** — kept components small and rules out of the UI for the live interview rule-change.

## Unfinished / out of scope

- Real Stripe / email confirmation
- Admin restock UI
- Multi-document Mongo transactions (stock uses per-SKU conditional updates + rollback on failure — good enough for this exercise)
- Multi-festival rule engine (would extract catalog + `rules.js` plugins)

## Design note

See [DESIGN.md](./DESIGN.md) — written before coding and not rewritten to match the final build.

## Tests

See [TEST-CASES.md](./TEST-CASES.md). Automated: `pnpm test`.
