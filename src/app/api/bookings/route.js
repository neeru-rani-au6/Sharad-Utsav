import { NextResponse } from 'next/server';
import { createBooking, getPromo, getStockMap } from '@/db/store';
import { CATALOG } from '@/domain/constants';
import { stockDemand } from '@/domain/pricing';
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

  const idempotencyKey = body?.payment?.idempotencyKey;
  if (!idempotencyKey || typeof idempotencyKey !== 'string') {
    return NextResponse.json(
      {
        ok: false,
        errors: [{ field: 'payment.idempotencyKey', message: 'Missing payment idempotency key.' }],
      },
      { status: 400 },
    );
  }

  if (body?.payment?.method && body.payment.method !== 'simulated') {
    return NextResponse.json(
      {
        ok: false,
        errors: [{ field: 'payment.method', message: 'Only simulated payment is supported.' }],
      },
      { status: 400 },
    );
  }

  // Ignore any client-sent totals — server recalculates.
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
      requirePeople: true,
      stockMap,
      promoRow,
    },
  );

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, errors: result.errors },
      { status: 400 },
    );
  }

  const demand = stockDemand(body.cart);

  try {
    const { booking, duplicate } = await createBooking({
      booker: normalizeBooker(body.booker),
      attendees: normalizeAttendees(body.attendees),
      cart: body.cart,
      lines: result.quote.lines,
      subtotalCents: result.quote.subtotalCents,
      discountCents: result.quote.discountCents,
      totalCents: result.quote.totalCents,
      promoCode: result.quote.promoCode,
      idempotencyKey,
      demand,
    });

    return NextResponse.json(
      {
        ok: true,
        duplicate: Boolean(duplicate),
        booking: publicBooking(booking),
      },
      { status: duplicate ? 200 : 201 },
    );
  } catch (e) {
    if (e.message === 'INSUFFICIENT_STOCK') {
      const label = CATALOG[e.sku]?.label || e.sku || 'an item';
      return NextResponse.json(
        {
          ok: false,
          errors: [
            {
              field: 'stock',
              message: `${label} just sold out. Please go back and update your selection.`,
            },
          ],
        },
        { status: 409 },
      );
    }
    console.error(e);
    return NextResponse.json(
      { ok: false, errors: [{ field: 'server', message: 'Could not complete booking.' }] },
      { status: 500 },
    );
  }
}

function normalizeBooker(booker) {
  return {
    name: String(booker.name).trim(),
    email: String(booker.email).trim().toLowerCase(),
    phone: String(booker.phone).trim(),
    age: Number(booker.age),
  };
}

function normalizeAttendees(attendees) {
  return (attendees || []).map((a) => ({
    name: String(a.name).trim(),
    age: Number(a.age),
    phone: a.phone ? String(a.phone).trim() : '',
  }));
}

function publicBooking(booking) {
  return {
    id: booking.id,
    createdAt: booking.created_at,
    booker: booking.booker,
    attendees: booking.attendees,
    lines: booking.lines,
    subtotalCents: booking.subtotal_cents,
    discountCents: booking.discount_cents,
    totalCents: booking.total_cents,
    promoCode: booking.promo_code,
  };
}
