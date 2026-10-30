/**
 * Seed MongoDB with stock + promo codes.
 * Usage: MONGODB_URI=... node scripts/seed.js
 */
async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGODB_URI before seeding.');
    process.exit(1);
  }

  const { MongoClient } = await import('mongodb');
  const dbName = process.env.MONGODB_DB || 'sharad_utsav';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    await db.collection('bookings').createIndex(
      { idempotency_key: 1 },
      { unique: true },
    );
    await db.collection('bookings').createIndex({ id: 1 }, { unique: true });
    await db.collection('stock').createIndex({ sku: 1 }, { unique: true });
    await db.collection('promo_codes').createIndex({ code: 1 }, { unique: true });

    const stock = [
      { sku: 'DAY_ADULT', remaining: 380 },
      { sku: 'DAY_CHILD', remaining: 260 },
      { sku: 'ALLDAY_ADULT', remaining: 0 },
      { sku: 'ALLDAY_CHILD', remaining: 140 },
      { sku: 'FAMILY', remaining: 95 },
      { sku: 'DANDIYA', remaining: 900 },
      { sku: 'DINNER', remaining: 1700 },
      { sku: 'WORKSHOP', remaining: 2 },
    ];

    for (const row of stock) {
      await db.collection('stock').updateOne(
        { sku: row.sku },
        { $set: row },
        { upsert: true },
      );
    }

    const promos = [
      {
        code: 'SEVA10',
        type: 'PERCENT',
        percent: 10,
        cents: null,
        expires_at: null,
        max_uses: 10000,
        uses: 0,
      },
      {
        code: 'FLAT20',
        type: 'FLAT',
        percent: null,
        cents: 2000,
        expires_at: null,
        max_uses: 10000,
        uses: 0,
      },
      {
        code: 'KIDSFREE',
        type: 'KIDS_FREE',
        percent: null,
        cents: null,
        expires_at: null,
        max_uses: 10000,
        uses: 0,
      },
      {
        code: 'EXPIRED5',
        type: 'PERCENT',
        percent: 5,
        cents: null,
        expires_at: '2026-09-26T00:00:00.000Z',
        max_uses: 10000,
        uses: 0,
      },
      {
        code: 'MAXEDOUT',
        type: 'FLAT',
        percent: null,
        cents: 500,
        expires_at: null,
        max_uses: 3,
        uses: 3,
      },
    ];

    for (const row of promos) {
      await db.collection('promo_codes').updateOne(
        { code: row.code },
        { $set: row },
        { upsert: true },
      );
    }

    console.log(`Seed complete → database "${dbName}".`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
