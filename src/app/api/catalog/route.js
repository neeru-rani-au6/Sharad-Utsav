import { NextResponse } from 'next/server';
import { CATALOG, EVENT, FESTIVAL_DAYS, WORKSHOP_DAYS } from '@/domain/constants';
import { getStockMap, storageMode } from '@/db/store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stock = await getStockMap();

  const tickets = Object.values(CATALOG)
    .filter((item) => item.type === 'ticket')
    .map((item) => ({
      id: item.id,
      label: item.label,
      priceCents: item.priceCents,
      needsDay: item.needsDay,
      ageBand: item.ageBand,
      remaining: stock[item.id] ?? 0,
      soldOut: (stock[item.id] ?? 0) <= 0,
    }));

  const extras = Object.values(CATALOG)
    .filter((item) => item.type === 'extra')
    .map((item) => ({
      id: item.id,
      label: item.label,
      priceCents: item.priceCents,
      needsDay: item.needsDay,
      allowedDays: item.allowedDays || null,
      remaining: stock[item.id] ?? 0,
      soldOut: (stock[item.id] ?? 0) <= 0,
    }));

  return NextResponse.json({
    event: EVENT,
    days: FESTIVAL_DAYS,
    workshopDays: WORKSHOP_DAYS,
    tickets,
    extras,
    storageMode: storageMode(),
  });
}
