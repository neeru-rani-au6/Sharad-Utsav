import { describe, expect, it } from 'vitest';
import { quoteCart } from './pricing.js';
import { PROMO_TYPE, TICKET_KIND } from './constants.js';
import { validateAttendees, validateBooking, validateCartShape } from './rules.js';

describe('quoteCart', () => {
  it('prices day passes per person per day', () => {
    const quote = quoteCart({
      tickets: [
        { kind: TICKET_KIND.DAY_ADULT, day: '2026-11-10', qty: 2 },
        { kind: TICKET_KIND.DAY_CHILD, day: '2026-11-10', qty: 1 },
      ],
      extras: [],
    });
    expect(quote.subtotalCents).toBe(2 * 1500 + 800);
    expect(quote.totalCents).toBe(3800);
  });

  it('prices all-day and family as flat', () => {
    const quote = quoteCart({
      tickets: [
        { kind: TICKET_KIND.ALLDAY_CHILD, qty: 1 },
        { kind: TICKET_KIND.FAMILY, day: '2026-11-12', qty: 1 },
      ],
      extras: [{ kind: 'DANDIYA', qty: 2 }],
    });
    expect(quote.subtotalCents).toBe(3000 + 4000 + 1000);
  });

  it('applies SEVA10 as 10% off', () => {
    const quote = quoteCart(
      {
        tickets: [{ kind: TICKET_KIND.DAY_ADULT, day: '2026-11-10', qty: 2 }],
        extras: [],
      },
      { code: 'SEVA10', type: PROMO_TYPE.PERCENT, percent: 10, uses: 0, max_uses: 1000 },
    );
    expect(quote.ok).toBe(true);
    expect(quote.subtotalCents).toBe(3000);
    expect(quote.discountCents).toBe(300);
    expect(quote.totalCents).toBe(2700);
  });

  it('floors FLAT20 at zero', () => {
    const quote = quoteCart(
      {
        tickets: [{ kind: TICKET_KIND.DAY_CHILD, day: '2026-11-10', qty: 1 }],
        extras: [],
      },
      { code: 'FLAT20', type: PROMO_TYPE.FLAT, cents: 2000, uses: 0, max_uses: 1000 },
    );
    expect(quote.totalCents).toBe(0);
    expect(quote.discountCents).toBe(800);
  });

  it('makes child tickets free with KIDSFREE', () => {
    const quote = quoteCart(
      {
        tickets: [
          { kind: TICKET_KIND.DAY_ADULT, day: '2026-11-10', qty: 1 },
          { kind: TICKET_KIND.DAY_CHILD, day: '2026-11-10', qty: 2 },
        ],
        extras: [],
      },
      { code: 'KIDSFREE', type: PROMO_TYPE.KIDS_FREE, uses: 0, max_uses: 1000 },
    );
    expect(quote.totalCents).toBe(1500);
    expect(quote.discountCents).toBe(1600);
  });

  it('rejects expired promo', () => {
    const quote = quoteCart(
      { tickets: [{ kind: TICKET_KIND.DAY_ADULT, day: '2026-11-10', qty: 1 }], extras: [] },
      {
        code: 'EXPIRED5',
        type: PROMO_TYPE.PERCENT,
        percent: 5,
        expires_at: '2026-09-01T00:00:00.000Z',
        uses: 0,
        max_uses: 100,
      },
      new Date('2026-10-26T00:00:00.000Z'),
    );
    expect(quote.ok).toBe(false);
    expect(quote.promoMessage).toMatch(/expired/i);
  });

  it('rejects maxed out promo', () => {
    const quote = quoteCart(
      { tickets: [{ kind: TICKET_KIND.DAY_ADULT, day: '2026-11-10', qty: 1 }], extras: [] },
      {
        code: 'MAXEDOUT',
        type: PROMO_TYPE.FLAT,
        cents: 500,
        uses: 50,
        max_uses: 50,
      },
    );
    expect(quote.ok).toBe(false);
    expect(quote.promoMessage).toMatch(/maximum/i);
  });
});

describe('age vs ticket rules', () => {
  it('rejects adult ticket when ages are all children', () => {
    const cart = {
      tickets: [{ kind: TICKET_KIND.DAY_ADULT, day: '2026-11-10', qty: 1 }],
      extras: [],
    };
    const errors = validateAttendees([{ name: 'Sam', age: 7 }], cart);
    expect(errors.some((e) => /adult/i.test(e.message))).toBe(true);
  });

  it('accepts matching adult and child', () => {
    const cart = {
      tickets: [
        { kind: TICKET_KIND.DAY_ADULT, day: '2026-11-10', qty: 1 },
        { kind: TICKET_KIND.DAY_CHILD, day: '2026-11-10', qty: 1 },
      ],
      extras: [],
    };
    const errors = validateAttendees(
      [
        { name: 'Alex', age: 30 },
        { name: 'Sam', age: 7 },
      ],
      cart,
    );
    expect(errors).toEqual([]);
  });
});

describe('validateCartShape', () => {
  it('rejects workshop on a non-workshop day', () => {
    const errors = validateCartShape({
      tickets: [{ kind: TICKET_KIND.DAY_ADULT, day: '2026-11-10', qty: 1 }],
      extras: [{ kind: 'WORKSHOP', day: '2026-11-10', qty: 1 }],
    });
    expect(errors.some((e) => /workshop/i.test(e.message))).toBe(true);
  });

  it('rejects sold-out all-day adult via stock check in validateBooking', () => {
    const result = validateBooking(
      {
        cart: {
          tickets: [{ kind: TICKET_KIND.ALLDAY_ADULT, qty: 1 }],
          extras: [],
        },
      },
      { stockMap: { ALLDAY_ADULT: 0 } },
    );
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => /sold out/i.test(e.message))).toBe(true);
  });
});
