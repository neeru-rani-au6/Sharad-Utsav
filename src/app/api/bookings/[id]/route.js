import { NextResponse } from 'next/server';
import { getBooking } from '@/db/store';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) {
    return NextResponse.json(
      { ok: false, errors: [{ field: 'id', message: 'Booking not found.' }] },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    booking: {
      id: booking.id,
      createdAt: booking.created_at,
      booker: booking.booker,
      attendees: booking.attendees,
      lines: booking.lines,
      subtotalCents: booking.subtotal_cents,
      discountCents: booking.discount_cents,
      totalCents: booking.total_cents,
      promoCode: booking.promo_code,
    },
  });
}
