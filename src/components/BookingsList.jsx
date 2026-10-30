'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatCents } from '@/domain/money';
import { dayLabel } from '@/lib/format';

function formatWhen(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
}

export default function BookingsList() {
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    fetch('/api/bookings')
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok) {
          setError('Could not load bookings.');
          setBookings([]);
          return;
        }
        setBookings(data.bookings || []);
      })
      .catch(() => {
        setError('Network error loading bookings.');
        setBookings([]);
      });
  }, []);

  if (bookings === null) {
    return <p className="hint">Loading bookings…</p>;
  }

  if (error) {
    return <p className="error">{error}</p>;
  }

  if (bookings.length === 0) {
    return (
      <div className="card light">
        <h2>No bookings yet</h2>
        <p className="hint">
          Completed bookings will show up here. Go book tickets, then come back.
        </p>
        <div className="actions">
          <Link className="btn btn-primary" href="/">
            Book tickets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="hint" style={{ marginBottom: '1rem' }}>
        {bookings.length} booking{bookings.length === 1 ? '' : 's'} — newest first.
      </p>

      {bookings.map((booking) => {
        const open = openId === booking.id;
        return (
          <div className="card light" key={booking.id}>
            <div className="row" style={{ border: 'none', paddingTop: 0 }}>
              <div className="row-main">
                <div className="row-title">{booking.booker?.name || 'Booking'}</div>
                <div className="row-sub">
                  {formatWhen(booking.createdAt)} · {booking.booker?.email}
                </div>
                <div className="row-sub" style={{ marginTop: '0.25rem' }}>
                  ID: {booking.id}
                </div>
              </div>
              <div className="price">{formatCents(booking.totalCents)}</div>
            </div>

            <button
              type="button"
              className="btn"
              style={{ marginTop: '0.5rem' }}
              onClick={() => setOpenId(open ? null : booking.id)}
            >
              {open ? 'Hide details' : 'Show tickets & guests'}
            </button>

            {open ? (
              <div style={{ marginTop: '1rem' }}>
                <h3>Tickets & extras</h3>
                <ul className="totals">
                  {(booking.lines || []).map((line, i) => (
                    <li key={`${booking.id}-${line.kind}-${i}`}>
                      <span>
                        {line.qty}× {line.label}
                        {line.day ? ` · ${dayLabel(line.day)}` : ''}
                      </span>
                      <span>{formatCents(line.lineTotalCents)}</span>
                    </li>
                  ))}
                  {booking.discountCents > 0 ? (
                    <li>
                      <span>
                        Discount
                        {booking.promoCode ? ` (${booking.promoCode})` : ''}
                      </span>
                      <span>−{formatCents(booking.discountCents)}</span>
                    </li>
                  ) : null}
                  <li className="grand">
                    <span>Total</span>
                    <span>{formatCents(booking.totalCents)}</span>
                  </li>
                </ul>

                <h3 style={{ marginTop: '1rem' }}>Guests</h3>
                <ul>
                  {(booking.attendees || []).map((a, i) => (
                    <li key={`${booking.id}-guest-${i}`}>
                      {a.name} · age {a.age}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
