import { CATALOG, PROMO_TYPE } from '@/domain/constants';
import { randomUUID } from 'crypto';

/**
 * In-process store for local demo when DATABASE_URL is not set.
 * NOT safe across Vercel serverless instances — production must use Neon.
 */
function initialStock() {
  const stock = {};
  for (const item of Object.values(CATALOG)) {
    stock[item.id] = item.initialStock;
  }
  return stock;
}

function initialPromos() {
  return {
    SEVA10: {
      code: 'SEVA10',
      type: PROMO_TYPE.PERCENT,
      percent: 10,
      cents: null,
      expires_at: null,
      max_uses: 10000,
      uses: 0,
    },
    FLAT20: {
      code: 'FLAT20',
      type: PROMO_TYPE.FLAT,
      percent: null,
      cents: 2000,
      expires_at: null,
      max_uses: 10000,
      uses: 0,
    },
    KIDSFREE: {
      code: 'KIDSFREE',
      type: PROMO_TYPE.KIDS_FREE,
      percent: null,
      cents: null,
      expires_at: null,
      max_uses: 10000,
      uses: 0,
    },
    EXPIRED5: {
      code: 'EXPIRED5',
      type: PROMO_TYPE.PERCENT,
      percent: 5,
      cents: null,
      expires_at: '2026-09-26T00:00:00.000Z',
      max_uses: 10000,
      uses: 0,
    },
    MAXEDOUT: {
      code: 'MAXEDOUT',
      type: PROMO_TYPE.FLAT,
      percent: null,
      cents: 500,
      expires_at: null,
      max_uses: 3,
      uses: 3,
    },
  };
}

function getStore() {
  if (!globalThis.__festivalStore) {
    globalThis.__festivalStore = {
      stock: initialStock(),
      promos: initialPromos(),
      bookings: new Map(),
      byIdempotency: new Map(),
    };
  }
  return globalThis.__festivalStore;
}

export async function memoryGetStockMap() {
  return { ...getStore().stock };
}

export async function memoryGetPromo(code) {
  const key = String(code || '').trim().toUpperCase();
  return getStore().promos[key] || null;
}

export async function memoryGetBooking(id) {
  return getStore().bookings.get(id) || null;
}

export async function memoryFindByIdempotency(key) {
  const id = getStore().byIdempotency.get(key);
  if (!id) return null;
  return getStore().bookings.get(id) || null;
}

export async function memoryCreateBooking({
  booker,
  attendees,
  cart,
  lines,
  subtotalCents,
  discountCents,
  totalCents,
  promoCode,
  idempotencyKey,
  demand,
}) {
  const store = getStore();

  const existing = await memoryFindByIdempotency(idempotencyKey);
  if (existing) return { booking: existing, duplicate: true };

  for (const [sku, qty] of Object.entries(demand)) {
    if ((store.stock[sku] ?? 0) < qty) {
      const err = new Error('INSUFFICIENT_STOCK');
      err.sku = sku;
      throw err;
    }
  }

  for (const [sku, qty] of Object.entries(demand)) {
    store.stock[sku] -= qty;
  }

  if (promoCode) {
    const promo = store.promos[promoCode];
    if (promo) promo.uses += 1;
  }

  const booking = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    booker,
    attendees,
    cart,
    lines,
    subtotal_cents: subtotalCents,
    discount_cents: discountCents,
    total_cents: totalCents,
    promo_code: promoCode,
    idempotency_key: idempotencyKey,
  };

  store.bookings.set(booking.id, booking);
  store.byIdempotency.set(idempotencyKey, booking.id);
  return { booking, duplicate: false };
}
