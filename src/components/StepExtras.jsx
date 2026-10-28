'use client';

import { EXTRA_KIND } from '@/domain/constants';
import { formatCents } from '@/domain/money';
import { dayLabel } from '@/lib/format';

export default function StepExtras({
  catalog,
  cart,
  dinnerDay,
  workshopDay,
  onDinnerDay,
  onWorkshopDay,
  onChangeExtra,
  estimateCents,
  onBack,
  onNext,
}) {
  if (!catalog) return null;

  const extraMeta = Object.fromEntries(catalog.extras.map((e) => [e.id, e]));

  function qty(kind, day) {
    const found = cart.extras.find(
      (e) => e.kind === kind && (day ? e.day === day : !e.day),
    );
    return found ? found.qty : 0;
  }

  const dandiya = extraMeta[EXTRA_KIND.DANDIYA];
  const dinner = extraMeta[EXTRA_KIND.DINNER];
  const workshop = extraMeta[EXTRA_KIND.WORKSHOP];

  return (
    <div className="card">
      <h2>Extras</h2>
      <p className="hint">Optional — skip if you only need entry tickets.</p>

      {dandiya ? (
        <div className="row">
          <div className="row-main">
            <div className="row-title">
              {dandiya.label}
              {dandiya.soldOut ? <span className="badge">Sold out</span> : null}
            </div>
            <div className="row-sub">
              {formatCents(dandiya.priceCents)} each · {dandiya.remaining} left
            </div>
          </div>
          <div className="qty">
            <button
              type="button"
              disabled={dandiya.soldOut || qty(EXTRA_KIND.DANDIYA) <= 0}
              onClick={() => onChangeExtra(EXTRA_KIND.DANDIYA, null, qty(EXTRA_KIND.DANDIYA) - 1)}
            >
              −
            </button>
            <span>{qty(EXTRA_KIND.DANDIYA)}</span>
            <button
              type="button"
              disabled={dandiya.soldOut || qty(EXTRA_KIND.DANDIYA) >= dandiya.remaining}
              onClick={() => onChangeExtra(EXTRA_KIND.DANDIYA, null, qty(EXTRA_KIND.DANDIYA) + 1)}
            >
              +
            </button>
          </div>
        </div>
      ) : null}

      {dinner ? (
        <>
          <h3 style={{ fontSize: '1rem', marginTop: '1rem' }}>Dinner plate day</h3>
          <div className="day-chips">
            {catalog.days.map((day) => (
              <button
                key={day}
                type="button"
                className={`chip ${dinnerDay === day ? 'selected' : ''}`}
                onClick={() => onDinnerDay(day)}
              >
                {dayLabel(day)}
              </button>
            ))}
          </div>
          <div className="row">
            <div className="row-main">
              <div className="row-title">{dinner.label}</div>
              <div className="row-sub">
                {formatCents(dinner.priceCents)} per person · needs a ticket that day
              </div>
            </div>
            <div className="qty">
              <button
                type="button"
                disabled={qty(EXTRA_KIND.DINNER, dinnerDay) <= 0}
                onClick={() =>
                  onChangeExtra(EXTRA_KIND.DINNER, dinnerDay, qty(EXTRA_KIND.DINNER, dinnerDay) - 1)
                }
              >
                −
              </button>
              <span>{qty(EXTRA_KIND.DINNER, dinnerDay)}</span>
              <button
                type="button"
                disabled={qty(EXTRA_KIND.DINNER, dinnerDay) >= dinner.remaining}
                onClick={() =>
                  onChangeExtra(EXTRA_KIND.DINNER, dinnerDay, qty(EXTRA_KIND.DINNER, dinnerDay) + 1)
                }
              >
                +
              </button>
            </div>
          </div>
        </>
      ) : null}

      {workshop ? (
        <>
          <h3 style={{ fontSize: '1rem', marginTop: '1rem' }}>
            Garba workshop
            {workshop.soldOut ? <span className="badge">Sold out</span> : null}
          </h3>
          <p className="hint">Only Nov 11 and Nov 13 · {workshop.remaining} places left</p>
          <div className="day-chips">
            {(catalog.workshopDays || []).map((day) => (
              <button
                key={day}
                type="button"
                className={`chip ${workshopDay === day ? 'selected' : ''}`}
                disabled={workshop.soldOut}
                onClick={() => onWorkshopDay(day)}
              >
                {dayLabel(day)}
              </button>
            ))}
          </div>
          <div className="row">
            <div className="row-main">
              <div className="row-title">{workshop.label}</div>
              <div className="row-sub">{formatCents(workshop.priceCents)} each</div>
            </div>
            <div className="qty">
              <button
                type="button"
                disabled={workshop.soldOut || qty(EXTRA_KIND.WORKSHOP, workshopDay) <= 0}
                onClick={() =>
                  onChangeExtra(
                    EXTRA_KIND.WORKSHOP,
                    workshopDay,
                    qty(EXTRA_KIND.WORKSHOP, workshopDay) - 1,
                  )
                }
              >
                −
              </button>
              <span>{qty(EXTRA_KIND.WORKSHOP, workshopDay)}</span>
              <button
                type="button"
                disabled={
                  workshop.soldOut ||
                  qty(EXTRA_KIND.WORKSHOP, workshopDay) >= workshop.remaining
                }
                onClick={() =>
                  onChangeExtra(
                    EXTRA_KIND.WORKSHOP,
                    workshopDay,
                    qty(EXTRA_KIND.WORKSHOP, workshopDay) + 1,
                  )
                }
              >
                +
              </button>
            </div>
          </div>
        </>
      ) : null}

      <div className="estimate">
        Estimate so far: <strong className="price">{formatCents(estimateCents)}</strong>
      </div>

      <div className="actions">
        <button type="button" className="btn" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Continue to guests
        </button>
      </div>
    </div>
  );
}
