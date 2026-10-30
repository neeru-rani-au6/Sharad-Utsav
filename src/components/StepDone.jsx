'use client';

import Link from 'next/link';
import { formatCents } from '@/domain/money';
import { dayLabel } from '@/lib/format';

export default function StepDone({ booking }) {
  if (!booking) return null;

  return (
    <div className="card light">
      <h2 className="success">Booking confirmed</h2>
      <p>
        Thank you, {booking.booker.name}. Show this confirmation at the door.
      </p>
      <p className="muted">
        Booking ID: <strong>{booking.id}</strong>
      </p>

      <h3>Guests</h3>
      <ul>
        {booking.attendees.map((a, i) => (
          <li key={`${a.name}-${i}`}>
            {a.name} · age {a.age}
          </li>
        ))}
      </ul>

      <h3>What you paid for</h3>
      <ul className="totals">
        {booking.lines.map((line, i) => (
          <li key={`${line.kind}-${i}`}>
            <span>
              {line.qty}× {line.label}
              {line.day ? ` · ${dayLabel(line.day)}` : ''}
            </span>
            <span>{formatCents(line.lineTotalCents)}</span>
          </li>
        ))}
        <li>
          <span>Discount{booking.promoCode ? ` (${booking.promoCode})` : ''}</span>
          <span>−{formatCents(booking.discountCents)}</span>
        </li>
        <li className="grand">
          <span>Total paid</span>
          <span>{formatCents(booking.totalCents)}</span>
        </li>
      </ul>

      <p className="hint" style={{ marginTop: '1rem' }}>
        A confirmation email would normally go to {booking.booker.email}. (Email
        sending is out of scope for this exercise.)
      </p>

      <div className="actions">
        <Link className="btn" href="/bookings">
          View all bookings
        </Link>
        <Link className="btn btn-primary" href="/">
          Book again
        </Link>
      </div>
    </div>
  );
}
