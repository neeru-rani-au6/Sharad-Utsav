/**
 * Seed MongoDB with stock + promo codes.
 * Usage: pnpm db:seed   (reads .env / .env.local)
 *    or: MONGODB_URI=... node scripts/seed.js
 */
const fs = require('fs');
const path = require('path');

function loadEnvFile(fileName) {
  const filePath = path.join(__dirname, '..', fileName);
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

async function main() {
  const uri = String(process.env.MONGODB_URI || '').trim();
  if (!uri) {
    console.error(
      'Set MONGODB_URI in .env (or .env.local), then run: pnpm db:seed',
    );
    process.exit(1);
  }
  if (uri.includes('<') || uri.includes('>')) {
    console.error(
      'MONGODB_URI still has <placeholder> angle brackets. Use the real username and password with no < > characters.',
    );
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
