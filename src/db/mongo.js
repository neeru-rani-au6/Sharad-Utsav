import { MongoClient } from 'mongodb';
import { randomUUID } from 'crypto';

const DB_NAME = process.env.MONGODB_DB || 'sharad_utsav';

/**
 * Cached client for Next.js / Vercel serverless warm invocations.
 * Reusing one client per runtime instance is the recommended pattern.
 */
let cached = globalThis.__mongoCache;

if (!cached) {
  cached = globalThis.__mongoCache = { client: null, promise: null };
}

function createClient(uri) {
  return new MongoClient(uri, {
    maxPoolSize: 10,
    minPoolSize: 0,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    retryReads: true,
  });
}

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');

  if (cached.client) {
    return cached.client.db(DB_NAME);
  }

  if (!cached.promise) {
    const client = createClient(uri);
    cached.promise = client
      .connect()
      .then((connected) => {
        cached.client = connected;
        return connected;
      })
      .catch((err) => {
        // Let the next request retry instead of sticking on a rejected promise.
        cached.promise = null;
        throw err;
      });
  }

  await cached.promise;
  return cached.client.db(DB_NAME);
}

export async function mongoGetStockMap() {
  const db = await getDb();
  const rows = await db.collection('stock').find({}).toArray();
  const map = {};
  for (const row of rows) map[row.sku] = row.remaining;
  return map;
}

export async function mongoGetPromo(code) {
  const db = await getDb();
  const key = String(code || '').trim().toUpperCase();
  const row = await db.collection('promo_codes').findOne({ code: key });
  if (!row) return null;
  return {
    code: row.code,
    type: row.type,
    percent: row.percent,
    cents: row.cents,
    expires_at: row.expires_at,
    max_uses: row.max_uses,
    uses: row.uses,
  };
}

export async function mongoGetBooking(id) {
  const db = await getDb();
  const row = await db.collection('bookings').findOne({ id });
  return row ? shapeBooking(row) : null;
}

export async function mongoListBookings() {
  const db = await getDb();
  const rows = await db
    .collection('bookings')
    .find({})
    .sort({ created_at: -1 })
    .limit(100)
    .toArray();
  return rows.map(shapeBooking);
}

export async function mongoFindByIdempotency(key) {
  const db = await getDb();
  const row = await db.collection('bookings').findOne({ idempotency_key: key });
  return row ? shapeBooking(row) : null;
}

function shapeBooking(row) {
  return {
    id: row.id,
    created_at: row.created_at,
    booker: row.booker,
    attendees: row.attendees,
    cart: row.cart,
    lines: row.lines,
    subtotal_cents: row.subtotal_cents,
    discount_cents: row.discount_cents,
    total_cents: row.total_cents,
    promo_code: row.promo_code,
    idempotency_key: row.idempotency_key,
  };
}

async function restoreStock(stockCol, decremented) {
  for (const item of decremented) {
    await stockCol.updateOne({ sku: item.sku }, { $inc: { remaining: item.qty } });
  }
}

/**
 * Create booking and decrement stock with conditional updates
 * (`remaining >= qty`) so two buyers cannot oversell the last seats.
 */
export async function mongoCreateBooking({
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
  const existing = await mongoFindByIdempotency(idempotencyKey);
  if (existing) return { booking: existing, duplicate: true };

  const db = await getDb();
  const stockCol = db.collection('stock');
  const decremented = [];

  for (const [sku, qty] of Object.entries(demand)) {
    const result = await stockCol.findOneAndUpdate(
      { sku, remaining: { $gte: qty } },
      { $inc: { remaining: -qty } },
      { returnDocument: 'after' },
    );
    if (!result) {
      await restoreStock(stockCol, decremented);
      const err = new Error('INSUFFICIENT_STOCK');
      err.sku = sku;
      throw err;
    }
    decremented.push({ sku, qty });
  }

  if (promoCode) {
    await db.collection('promo_codes').updateOne(
      { code: promoCode },
      { $inc: { uses: 1 } },
    );
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

  try {
    await db.collection('bookings').insertOne(booking);
  } catch (e) {
    await restoreStock(stockCol, decremented);
    if (promoCode) {
      await db.collection('promo_codes').updateOne(
        { code: promoCode, uses: { $gt: 0 } },
        { $inc: { uses: -1 } },
      );
    }
    if (e && (e.code === 11000 || String(e.message).includes('duplicate'))) {
      const again = await mongoFindByIdempotency(idempotencyKey);
      if (again) return { booking: again, duplicate: true };
    }
    throw e;
  }

  return { booking: shapeBooking(booking), duplicate: false };
}
