# Sharad Utsav 2026 — Festival booking

**Live URL:** _(add your Vercel production URL here after deploy)_

Mobile-friendly booking flow for Sharad Utsav 2026 at Radha Krishna Temple, Allen, Texas. Families pick tickets and extras, enter guests, apply a promo, pay (simulated), and get a confirmation.

The **server** calculates price, checks age rules, applies promos, and decrements stock. The browser is never trusted for the amount charged.

## Stack

- Next.js 15 (App Router) · JavaScript · plain CSS
- Domain logic in `src/domain/` (pure functions)
- Neon Postgres when `DATABASE_URL` is set; in-memory store for local demo only
- Vitest for pricing and age tests

## Run locally

```bash
pnpm install          # or: npm install
pnpm dev              # http://localhost:3000
pnpm test
```

Without `DATABASE_URL`, stock lives in memory for the Node process (fine for `pnpm dev`, not for Vercel).

### With Neon (required for production)

1. Create a free database at [neon.tech](https://neon.tech)
2. Copy `.env.example` → `.env.local` and set `DATABASE_URL`
3. Seed stock and promo codes:

```bash
pnpm db:seed
```

## Environment variables (Vercel)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres connection string. Stock and bookings persist across serverless invocations. |

Set it under Project → Settings → Environment Variables for Production, then redeploy. Run the seed SQL once against that database (`pnpm db:seed` with the same URL).

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
8. **In-memory fallback** only when `DATABASE_URL` is missing — production must use Neon.
9. **Plain JS + CSS** — kept components small and rules out of the UI for the live interview rule-change.

## Unfinished / out of scope

- Real Stripe / email confirmation
- Admin restock UI
- Full Postgres transaction wrapping (stock uses conditional `UPDATE … WHERE remaining >= qty`; a rare failure after decrement could desync — noted for a production follow-up)
- Multi-festival rule engine (would extract catalog + `rules.js` plugins)

## Design note

See [DESIGN.md](./DESIGN.md) — written before coding and not rewritten to match the final build.

## Tests

See [TEST-CASES.md](./TEST-CASES.md). Automated: `pnpm test`.
