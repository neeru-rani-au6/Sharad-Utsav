import { NextResponse } from 'next/server';
import { getPromo, getStockMap } from '@/db/store';
import { validateBooking } from '@/domain/rules';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, errors: [{ field: 'body', message: 'Invalid JSON body.' }] },
      { status: 400 },
    );
  }

  const promoCode = body.promoCode ? String(body.promoCode).trim().toUpperCase() : '';
  const stockMap = await getStockMap();
  const promoRow = promoCode ? await getPromo(promoCode) : null;

  const result = validateBooking(
    {
      cart: body.cart,
      booker: body.booker,
      attendees: body.attendees,
      promoCode: promoCode || null,
    },
    {
      requirePeople: Boolean(body.requirePeople),
      stockMap,
      promoRow,
    },
  );

  const status = result.ok ? 200 : 400;
  return NextResponse.json(
    {
      ok: result.ok,
      errors: result.errors,
      subtotalCents: result.quote.subtotalCents,
      discountCents: result.quote.discountCents,
      totalCents: result.quote.totalCents,
      lines: result.quote.lines,
      promoCode: result.quote.promoCode,
      promoMessage: result.quote.promoMessage,
    },
    { status },
  );
}
