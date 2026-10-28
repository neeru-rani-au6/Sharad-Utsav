'use client';

import { formatCents } from '@/domain/money';

export default function StepPay({ totalCents, paying, error, onBack, onPay }) {
  return (
    <div className="card light">
      <h2>Payment</h2>
      <p className="hint">
        Simulated payment for this exercise — no real card is charged. Amount is the
        server total.
      </p>

      <p style={{ fontSize: '1.5rem', color: 'var(--heading)', fontFamily: 'var(--font-serif)' }}>
        Pay {formatCents(totalCents)}
      </p>

      {error ? <p className="error">{error}</p> : null}

      <div className="actions">
        <button type="button" className="btn" onClick={onBack} disabled={paying}>
          Back
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onPay}
          disabled={paying}
        >
          {paying ? 'Processing…' : 'Pay now'}
        </button>
      </div>
    </div>
  );
}
