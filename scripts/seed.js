/**
 * Seed Neon with stock + promo codes.
 * Usage: DATABASE_URL=... node scripts/seed.js
 */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Set DATABASE_URL before seeding.');
    process.exit(1);
  }

  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(url);

  await sql`
    CREATE TABLE IF NOT EXISTS stock (
      sku TEXT PRIMARY KEY,
      remaining INTEGER NOT NULL CHECK (remaining >= 0)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS promo_codes (
      code TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      percent INTEGER,
      cents INTEGER,
      expires_at TIMESTAMPTZ,
      max_uses INTEGER,
      uses INTEGER NOT NULL DEFAULT 0
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      booker_json JSONB NOT NULL,
      attendees_json JSONB NOT NULL,
      lines_json JSONB NOT NULL,
      cart_json JSONB NOT NULL,
      subtotal_cents INTEGER NOT NULL,
      discount_cents INTEGER NOT NULL,
      total_cents INTEGER NOT NULL,
      promo_code TEXT,
      idempotency_key TEXT UNIQUE NOT NULL
    )
  `;

  await sql`
    INSERT INTO stock (sku, remaining) VALUES
      ('DAY_ADULT', 380),
      ('DAY_CHILD', 260),
      ('ALLDAY_ADULT', 0),
      ('ALLDAY_CHILD', 140),
      ('FAMILY', 95),
      ('DANDIYA', 900),
      ('DINNER', 1700),
      ('WORKSHOP', 2)
    ON CONFLICT (sku) DO UPDATE SET remaining = EXCLUDED.remaining
  `;

  await sql`
    INSERT INTO promo_codes (code, type, percent, cents, expires_at, max_uses, uses) VALUES
      ('SEVA10', 'PERCENT', 10, NULL, NULL, 10000, 0),
      ('FLAT20', 'FLAT', NULL, 2000, NULL, 10000, 0),
      ('KIDSFREE', 'KIDS_FREE', NULL, NULL, NULL, 10000, 0),
      ('EXPIRED5', 'PERCENT', 5, NULL, '2026-09-26T00:00:00Z', 10000, 0),
      ('MAXEDOUT', 'FLAT', NULL, 500, NULL, 3, 3)
    ON CONFLICT (code) DO UPDATE SET
      type = EXCLUDED.type,
      percent = EXCLUDED.percent,
      cents = EXCLUDED.cents,
      expires_at = EXCLUDED.expires_at,
      max_uses = EXCLUDED.max_uses,
      uses = EXCLUDED.uses
  `;

  console.log('Seed complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
