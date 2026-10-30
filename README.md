# Sharad Utsav 2026 — Festival booking

**Live URL:** [https://sharad-utsav-enciqfocb-my-self-c7d9.vercel.app](https://sharad-utsav-enciqfocb-my-self-c7d9.vercel.app)

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


| Code     | Behaviour                                                           |
| -------- | ------------------------------------------------------------------- |
| SEVA10   | 10% off subtotal                                                    |
| FLAT20   | $20 off (floor at $0)                                               |
| KIDSFREE | Child day/all-day ticket lines free; family/adults/extras unchanged |
| EXPIRED5 | Valid code, expired — rejected                                      |
| MAXEDOUT | Valid code, uses exhausted — rejected                               |


## Design note

See [DESIGN.md](./DESIGN.md) — written before coding and not rewritten to match the final build.

## Tests

See [TEST-CASES.md](./TEST-CASES.md). Automated: `pnpm test`.