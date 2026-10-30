'use client';

import { parseAge } from '@/domain/age';
import { AGE_BAND } from '@/domain/constants';
import { buildAttendeeTemplate } from '@/domain/rules';

export default function StepPeople({
  cart,
  booker,
  attendees,
  onBookerChange,
  onAttendeeChange,
  onAddToddler,
  onRemoveAttendee,
  onCopyBookerToFirstAdult,
  error,
  onBack,
  onNext,
}) {
  const { need } = buildAttendeeTemplate(cart);

  let adultsFilled = 0;
  let childrenFilled = 0;
  for (const person of attendees) {
    if (person.isToddler || person.role === 'TODDLER') continue;
    const band = parseAge(person.age).band;
    const named = String(person.name || '').trim();
    if (!named || !band || band === AGE_BAND.INVALID) continue;
    if (band === AGE_BAND.ADULT) adultsFilled += 1;
    if (band === AGE_BAND.CHILD) childrenFilled += 1;
  }

  return (
    <div className="card light">
      <h2>Who is coming?</h2>
      <p className="hint">
        Your tickets need <strong>{need.adults} adult{need.adults === 1 ? '' : 's'}</strong>{' '}
        (age 12+) and <strong>{need.children} child{need.children === 1 ? '' : 'ren'}</strong>{' '}
        (age 5–11). Fill every Adult / Child box below — the person booking is separate
        contact info, and usually is also listed as Adult 1 if they are attending.
      </p>

      <div className="guest-checklist" aria-live="polite">
        <span className={adultsFilled >= need.adults ? 'ok' : ''}>
          Adults: {Math.min(adultsFilled, need.adults)}/{need.adults}
        </span>
        <span className={childrenFilled >= need.children ? 'ok' : ''}>
          Children: {Math.min(childrenFilled, need.children)}/{need.children}
        </span>
      </div>

      <h3>Person booking (contact)</h3>
      <p className="hint">We use this for confirmation. Must be 18+.</p>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="booker-name">Full name</label>
          <input
            id="booker-name"
            value={booker.name}
            onChange={(e) => onBookerChange('name', e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="field">
          <label htmlFor="booker-age">Age (18+)</label>
          <input
            id="booker-age"
            inputMode="numeric"
            value={booker.age}
            onChange={(e) => onBookerChange('age', e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="booker-email">Email</label>
          <input
            id="booker-email"
            type="email"
            value={booker.email}
            onChange={(e) => onBookerChange('email', e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="field">
          <label htmlFor="booker-phone">Phone</label>
          <input
            id="booker-phone"
            type="tel"
            value={booker.phone}
            onChange={(e) => onBookerChange('phone', e.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>
      {need.adults > 0 ? (
        <button
          type="button"
          className="btn"
          style={{ marginTop: '0.35rem' }}
          onClick={onCopyBookerToFirstAdult}
        >
          Copy me into Adult 1
        </button>
      ) : null}

      <h3 style={{ marginTop: '1.25rem' }}>People on the tickets</h3>
      <p className="hint">
        Example for a Family Pass: Adult 1, Adult 2, Child 1 (5–11), Child 2 (5–11).
      </p>

      {attendees.map((person, index) => {
        const isToddler = person.isToddler || person.role === 'TODDLER';
        const band = parseAge(person.age).band;
        return (
          <div className="person-card" key={person.key}>
            <div className="row" style={{ border: 'none', paddingTop: 0 }}>
              <strong>
                {person.label || (isToddler ? 'Toddler (free)' : `Guest ${index + 1}`)}
              </strong>
              {isToddler ? (
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '0.35rem 0.65rem', fontSize: '0.85rem' }}
                  onClick={() => onRemoveAttendee(index)}
                >
                  Remove
                </button>
              ) : null}
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              {person.hint || (isToddler ? 'Under 5 — free, no ticket' : '')}
            </p>
            <div className="grid-2">
              <div className="field">
                <label>Name</label>
                <input
                  value={person.name}
                  onChange={(e) => onAttendeeChange(index, 'name', e.target.value)}
                  placeholder={isToddler ? 'Toddler name' : person.label}
                />
              </div>
              <div className="field">
                <label>Age</label>
                <input
                  inputMode="numeric"
                  value={person.age}
                  onChange={(e) => onAttendeeChange(index, 'age', e.target.value)}
                  placeholder={
                    person.role === AGE_BAND.ADULT
                      ? '12+'
                      : person.role === AGE_BAND.CHILD
                        ? '5–11'
                        : '0–4'
                  }
                />
              </div>
              {band === AGE_BAND.ADULT && !isToddler ? (
                <div className="field">
                  <label>Phone (optional)</label>
                  <input
                    type="tel"
                    value={person.phone || ''}
                    onChange={(e) => onAttendeeChange(index, 'phone', e.target.value)}
                  />
                </div>
              ) : null}
            </div>
          </div>
        );
      })}

      <button type="button" className="btn" onClick={onAddToddler}>
        Add toddler (under 5, free)
      </button>

      {error ? (
        <ul className="error-list">
          {error
            .split(/(?<=\.)\s+/)
            .filter(Boolean)
            .map((line) => (
              <li key={line} className="error">
                {line}
              </li>
            ))}
        </ul>
      ) : null}

      <div className="actions">
        <button type="button" className="btn" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-primary" onClick={onNext}>
          Review & promo
        </button>
      </div>
    </div>
  );
}
