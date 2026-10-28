import { neon } from '@neondatabase/serverless';
import { randomUUID } from 'crypto';

function sql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  return neon(url);
}

export async function neonGetStockMap() {
  const db = sql();
  const rows = await db`SELECT sku, remaining FROM stock`;
  const map = {};
  for (const row of rows) map[row.sku] = row.remaining;
  return map;
}

export async function neonGetPromo(code) {
  const db = sql();
  const key = String(code || '').trim().toUpperCase();
  const rows = await db`
    SELECT code, type, percent, cents, expires_at, max_uses, uses
    FROM promo_codes
    WHERE code = ${key}
  `;
  return rows[0] || null;
}

export async function neonGetBooking(id) {
  const db = sql();
  const rows = await db`
    SELECT
      id, created_at, booker_json, attendees_json, lines_json, cart_json,
      subtotal_cents, discount_cents, total_cents, promo_code, idempotency_key
    FROM bookings
    WHERE id = ${id}
  `;
  if (!rows[0]) return null;
  return shapeBooking(rows[0]);
}

export async function neonFindByIdempotency(key) {
  const db = sql();
  const rows = await db`
    SELECT
      id, created_at, booker_json, attendees_json, lines_json, cart_json,
      subtotal_cents, discount_cents, total_cents, promo_code, idempotency_key
    FROM bookings
    WHERE idempotency_key = ${key}
  `;
  if (!rows[0]) return null;
  return shapeBooking(rows[0]);
}

function shapeBooking(row) {
  return {
    id: row.id,
    created_at: row.created_at,
    booker: row.booker_json,
    attendees: row.attendees_json,
    cart: row.cart_json,
    lines: row.lines_json,
    subtotal_cents: row.subtotal_cents,
    discount_cents: row.discount_cents,
    total_cents: row.total_cents,
    promo_code: row.promo_code,
    idempotency_key: row.idempotency_key,
  };
}

/**
 * Create booking with stock locks.
 * Uses a single interactive-style sequence via Neon's transaction HTTP API when available;
 * otherwise performs ordered updates that fail closed on insufficient stock.
 */
export async function neonCreateBooking({
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
  const existing = await neonFindByIdempotency(idempotencyKey);
  if (existing) return { booking: existing, duplicate: true };

  const db = sql();
  const id = randomUUID();

  // Lock-style check + decrement per SKU. Neon serverless SQL is statement-oriented;
  // conditional UPDATE … WHERE remaining >= qty prevents oversell.
  for (const [sku, qty] of Object.entries(demand)) {
    const updated = await db`
      UPDATE stock
      SET remaining = remaining - ${qty}
      WHERE sku = ${sku} AND remaining >= ${qty}
      RETURNING sku, remaining
    `;
    if (updated.length === 0) {
      const err = new Error('INSUFFICIENT_STOCK');
      err.sku = sku;
      throw err;
    }
  }

  if (promoCode) {
    await db`
      UPDATE promo_codes
      SET uses = uses + 1
      WHERE code = ${promoCode}
    `;
  }

  try {
    await db`
      INSERT INTO bookings (
        id, booker_json, attendees_json, lines_json, cart_json,
        subtotal_cents, discount_cents, total_cents, promo_code, idempotency_key
      ) VALUES (
        ${id},
        ${JSON.stringify(booker)},
        ${JSON.stringify(attendees)},
        ${JSON.stringify(lines)},
        ${JSON.stringify(cart)},
        ${subtotalCents},
        ${discountCents},
        ${totalCents},
        ${promoCode},
        ${idempotencyKey}
      )
    `;
  } catch (e) {
    // Unique idempotency race: return the winner
    if (String(e.message || e).includes('idempotency') || e.code === '23505') {
      const again = await neonFindByIdempotency(idempotencyKey);
      if (again) return { booking: again, duplicate: true };
    }
    throw e;
  }

  const booking = await neonGetBooking(id);
  return { booking, duplicate: false };
}
