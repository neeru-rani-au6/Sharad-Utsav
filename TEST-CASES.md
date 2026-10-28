# Test cases — Sharad Utsav 2026 booking

Situations worth checking, and what the app does.

## Pricing

| Case | Expected |
|------|----------|
| 2 adult day passes on one day | $30 |
| 1 child day + 1 adult day | $23 |
| 1 all-day child | $30 flat |
| 1 family pass | $40 flat |
| 2 dandiya pairs | $10 |
| Dinner ×3 | $36 |
| Workshop on Nov 11 | $20 |
| SEVA10 on $30 cart | $27 total (10% off) |
| FLAT20 on $8 cart | $0 (never negative) |
| KIDSFREE with 1 adult + 2 child day | $15 (children free) |
| KIDSFREE does not zero family pass | Family still $40 |
| Unknown promo `HELLO` | Error: not recognised |
| EXPIRED5 | Error: expired |
| MAXEDOUT | Error: max uses |

## Age rules

| Case | Expected |
|------|----------|
| Booker age 17 | Rejected |
| Booker age 18 | Allowed |
| Guest age 4 | Toddler — free, no ticket slot |
| Guest age 5–11 on adult ticket capacity | Rejected (child count mismatch) |
| Guest age 7 listed for adult-only cart | Rejected |
| Age `abc` / blank / `-1` | Rejected with clear message |

## Stock

| Case | Expected |
|------|----------|
| All-Day Adult | Sold out in UI; API rejects |
| Workshop remaining 2; buy 2 | Succeeds; remaining 0 |
| Workshop buy 1 after sold out | 409 / sold out message |
| Day adult qty above remaining | Blocked in UI and API |

## Cart / people sync

| Case | Expected |
|------|----------|
| Increase adult day qty from 1→2 | Second guest form appears |
| Decrease qty | Extra guest slots removed |
| Family pass ×1 | Requires 2 adults + 2 children |
| Family on Tue + family on Wed (same family) | Still 2A+2C people (max across days) |
| Workshop on Nov 10 | Rejected — wrong day |
| Workshop without any ticket that day | Rejected |
| Dinner qty above ticketed seats that day | Rejected |

## Payment / failures

| Case | Expected |
|------|----------|
| Double-click Pay | Same idempotency key → one booking |
| Network error on pay | Error message; key unchanged so retry is safe |
| Empty cart pay | Rejected |
| Client sends fake `totalCents: 1` | Ignored; server price used |

## Automated tests

`pnpm test` covers age boundaries, quote maths, promo codes, workshop day, sold-out all-day adult, and adult-ticket-for-child mismatch.
