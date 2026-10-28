'use client';

import { formatCents } from '@/domain/money';
import { dayLabel } from '@/lib/format';

export default function StepReview({
  quote,
  promoCode,
  onPromoChange,
  onApplyPromo,
  promoBusy,
  error,
  onBack,
  onNext,
}) {
  return (
    <div className="card light">
      <h2>Review your booking</h2>
      <p className="hint">Prices below come from the server — not the browser.</p>

      {quote?.lines?.length ? (
        <ul className="totals">
          {quote.lines.map((line, i) => (
            <li key={`${line.kind}-${line.day}-${i}`}>
              <span>
                {line.qty}× {line.label}
                {line.day ? ` · ${dayLabel(line.day)}` : ''}
                {line.kidsFree ? ' (kids free)' : ''}
              </span>
              <span>{formatCents(line.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="hint">No priced lines yet.</p>
      )}

      <ul className="totals">
        <li>
          <span>Subtotal</span>
          <span>{formatCents(quote?.subtotalCents || 0)}</span>
        </li>
        <li>
          <span>Discount</span>
          <span>−{formatCents(quote?.discountCents || 0)}</span>
        </li>
        <li className="grand">
          <span>Total</span>
          <span>{formatCents(quote?.totalCents || 0)}</span>
        </li>
      </ul>

      <div className="field" style={{ marginTop: '1rem' }}>
        <label htmlFor="promo">Promo code</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            id="promo"
            value={promoCode}
            onChange={(e) => onPromoChange(e.target.value)}
            placeholder="e.g. SEVA10"
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn"
            disabled={promoBusy}
            onClick={onApplyPromo}
          >
            Apply
          </button>
        </div>
        {quote?.promoMessage ? (
          <p className={quote.promoCode ? 'success' : 'error'} style={{ marginTop: '0.5rem' }}>
            {quote.promoMessage}
          </p>
        ) : null}
      </div>

      {error ? <p className="error">{error}</p> : null}

      <div className="actions">
        <button type="button" className="btn" onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!quote || quote.totalCents == null}
          onClick={onNext}
        >
          Continue to payment
        </button>
      </div>
    </div>
  );
}
