# Sharad Utsav 2026 — Design Note

Written before coding. This note is the plan, not a retrospective.

## What I am building

A mobile-friendly booking page for Sharad Utsav 2026 at Radha Krishna Temple, Allen, Texas. A family picks tickets and extras, enters who is coming, optionally applies a promo code, pays (simulated), and gets a confirmation. The server owns price, stock, ages, and promo rules.

## How I am modelling things

### Tickets and extras (by stable ID, not by label)

| ID | Meaning | Price (cents) |
|----|---------|---------------|
| DAY_ADULT | Day pass adult, per day | 1500 |
| DAY_CHILD | Day pass child, per day | 800 |
| ALLDAY_ADULT | All 5 days, adult | 6000 |
| ALLDAY_CHILD | All 5 days, child | 3000 |
| FAMILY | 2 adults + 2 children, one day | 4000 |
| DANDIYA | Pair of sticks | 500 |
| DINNER | Dinner plate, per person per day | 1200 |
| WORKSHOP | Garba workshop (Nov 11 or 13 only) | 2000 |

Festival days: `2026-11-10` … `2026-11-14`.

Cart lines are simple objects: `{ kind, qty, day? }`. Day is required for day passes, family, dinner, and workshop. All-day and dandiya do not need a day.

### People

- **Booker** — name, email, phone, age (must be 18+). Pays and gets confirmation.
- **Attendees** — one entry per ticketed person. Adults: name, age, optional phone. Children: name and age only.
- **Toddlers (under 5)** — free, no ticket. I will still collect name + age so the door has a list. They do not consume stock.

### Prices

Everything in **integer cents**. Quote = sum of line prices, then one promo applied. Browser estimates are for display only; the server recalculates from its own catalog on quote and on book.

### Stock

One remaining count per SKU (not per day). Day Adult 380 is shared across all five days. Booking decrements stock in a DB transaction with row locks so two people cannot take the last workshop seat.

## Endpoints I intend to build

### `GET /api/catalog`

Returns event info, ticket/extra definitions, current stock, and festival days.

### `POST /api/quote`

Body: `{ cart, promoCode?, attendees?, booker? }`  
Response: `{ ok, subtotalCents, discountCents, totalCents, lines, errors[] }`  
Validates rules and returns a priced quote. Does not change stock.

### `POST /api/bookings`

Body: `{ booker, attendees, cart, promoCode?, payment: { method: 'simulated', idempotencyKey } }`  
Re-validates, re-prices, locks stock, creates booking, returns confirmation. Same idempotency key returns the same booking (double-click safe).

### `GET /api/bookings/:id`

Returns a confirmation payload for the success screen.

## Tricky cases spotted so far

1. **Stock is global per SKU, not per day** — buying many Tuesday day passes reduces Wednesday availability.
2. **All-Day Adult is sold out (0)** — UI must disable; API must reject.
3. **Workshop has 2 seats** — race on the last seats; need atomic decrement.
4. **Family pass packing** — each unit covers exactly 2 adults + 2 children for one day. Extra people need more passes or day passes.
5. **Age vs ticket kind** — adult ticket for a 7-year-old must fail on the server even if the UI is bypassed.
6. **Attendee count must match tickets** — and stay matched when the user changes quantities mid-flow.
7. **KIDSFREE** — zeros child day/all-day lines; does not change family pass flat price or adult lines or extras (my call).
8. **FLAT20 on a small cart** — total floors at $0, never negative.
9. **EXPIRED5 / MAXEDOUT** — valid codes that must fail with clear messages.
10. **Dinner / workshop without entry** — I will require the group to have ticket coverage for that day before allowing those extras.
11. **Mixing all-day and day pass for the “same” person** — I will treat capacity as totals by age band, not named seats; one person cannot be double-counted across products in a way that exceeds purchased capacity.
12. **Nonsense ages** — blank, negative, letters: reject with a clear message.

## What I have decided not to do (for this exercise)

- Real Stripe (simulated payment is enough unless time left)
- Auth, admin restock UI, refunds, email sending
- Per-day stock pools
- Multi-festival config engine
- TypeScript and Tailwind (using plain JS + plain CSS for simplicity)
- In-memory stock (will not survive Vercel serverless)

## Tech shape

- Next.js App Router, JavaScript, plain CSS
- Neon Postgres for stock + bookings + promo use counts
- Domain logic in plain functions under `src/domain/`
- Simple step components driven by `useState` in one parent form
