'use client';

import { formatCents } from '@/domain/money';
import { TICKET_KIND } from '@/domain/constants';
import { dayLabel } from '@/lib/format';

export default function StepTickets({
  catalog,
  cart,
  selectedDay,
  onSelectDay,
  onChangeQty,
  estimateCents,
  onNext,
}) {
  if (!catalog) return <p className="hint">Loading tickets…</p>;

  const ticketMeta = Object.fromEntries(catalog.tickets.map((t) => [t.id, t]));

  function qtyFor(kind, day) {
    const found = cart.tickets.find(
      (t) => t.kind === kind && (day ? t.day === day : !t.day),
    );
    return found ? found.qty : 0;
  }

  const dayTickets = [
    TICKET_KIND.DAY_ADULT,
    TICKET_KIND.DAY_CHILD,
    TICKET_KIND.FAMILY,
  ];
  const allDayTickets = [TICKET_KIND.ALLDAY_ADULT, TICKET_KIND.ALLDAY_CHILD];

  return (
    <div className="card">
      <h2>Choose your tickets</h2>
      <p className="hint">
        Day passes and family passes are for one day. All-day passes cover the whole
        festival. Toddlers under 5 are free and do not need a ticket.
      </p>

      <h3 style={{ fontSize: '1rem', marginTop: '1rem' }}>Day for day / family passes</h3>
      <div className="day-chips">
        {catalog.days.map((day) => (
          <button
            key={day}
            type="button"
            className={`chip ${selectedDay === day ? 'selected' : ''}`}
            onClick={() => onSelectDay(day)}
          >
            {dayLabel(day)}
          </button>
        ))}
      </div>

      {dayTickets.map((kind) => {
        const meta = ticketMeta[kind];
        if (!meta) return null;
        const qty = qtyFor(kind, selectedDay);
        const soldOut = meta.soldOut;
        return (
          <div className="row" key={kind}>
            <div className="row-main">
              <div className="row-title">
                {meta.label}
                {soldOut ? <span className="badge">Sold out</span> : null}
              </div>
              <div className="row-sub">
                {formatCents(meta.priceCents)}
                {kind === TICKET_KIND.FAMILY ? ' · 2 adults + 2 children' : ''}
                {!soldOut ? ` · ${meta.remaining} left` : ''}
              </div>
            </div>
            <div className="qty">
              <button
                type="button"
                disabled={soldOut || qty <= 0}
                onClick={() => onChangeQty(kind, selectedDay, qty - 1)}
                aria-label={`Decrease ${meta.label}`}
              >
                −
              </button>
              <span>{qty}</span>
              <button
                type="button"
                disabled={soldOut || qty >= meta.remaining}
                onClick={() => onChangeQty(kind, selectedDay, qty + 1)}
                aria-label={`Increase ${meta.label}`}
              >
                +
              </button>
            </div>
          </div>
        );
      })}

      <h3 style={{ fontSize: '1rem', marginTop: '1.25rem' }}>All-day passes</h3>
      {allDayTickets.map((kind) => {
        const meta = ticketMeta[kind];
        if (!meta) return null;
        const qty = qtyFor(kind, null);
        const soldOut = meta.soldOut;
        return (
          <div className="row" key={kind}>
            <div className="row-main">
              <div className="row-title">
                {meta.label}
                {soldOut ? <span className="badge">Sold out</span> : null}
              </div>
              <div className="row-sub">
                {formatCents(meta.priceCents)} flat · all 5 days
                {!soldOut ? ` · ${meta.remaining} left` : ''}
              </div>
            </div>
            <div className="qty">
              <button
                type="button"
                disabled={soldOut || qty <= 0}
                onClick={() => onChangeQty(kind, null, qty - 1)}
              >
                −
              </button>
              <span>{qty}</span>
              <button
                type="button"
                disabled={soldOut || qty >= meta.remaining}
                onClick={() => onChangeQty(kind, null, qty + 1)}
              >
                +
              </button>
            </div>
          </div>
        );
      })}

      <div className="estimate">
        Estimate: <strong className="price">{formatCents(estimateCents)}</strong>
        <div className="hint">Final total is confirmed by the server at checkout.</div>
      </div>

      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={cart.tickets.length === 0}
          onClick={onNext}
        >
          Continue to extras
        </button>
      </div>
    </div>
  );
}
