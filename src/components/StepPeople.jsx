'use client';

import { requiredAttendees } from '@/domain/rules';
import { parseAge } from '@/domain/age';
import { AGE_BAND } from '@/domain/constants';

export default function StepPeople({
  cart,
  booker,
  attendees,
  onBookerChange,
  onAttendeeChange,
  onAddToddler,
  onRemoveAttendee,
  error,
  onBack,
  onNext,
}) {
  const need = requiredAttendees(cart);

  return (
    <div className="card light">
      <h2>Who is coming?</h2>
      <p className="hint">
        We need {need.adults} adult{need.adults === 1 ? '' : 's'} (12+) and{' '}
        {need.children} child{need.children === 1 ? '' : 'ren'} (5–11) to match your
        tickets. Toddlers under 5 are free — add them only for the door list.
      </p>

      <h3>Person booking</h3>
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

      <h3 style={{ marginTop: '1.25rem' }}>Guests on the tickets</h3>
      {attendees.map((person, index) => {
        const band = parseAge(person.age).band;
        const isToddler = band === AGE_BAND.TODDLER;
        return (
          <div className="person-card" key={person.key}>
            <div className="row" style={{ border: 'none', paddingTop: 0 }}>
              <strong>
                {isToddler ? 'Toddler (free)' : `Guest ${index + 1}`}
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
            <div className="grid-2">
              <div className="field">
                <label>Name</label>
                <input
                  value={person.name}
                  onChange={(e) => onAttendeeChange(index, 'name', e.target.value)}
                />
              </div>
              <div className="field">
                <label>Age</label>
                <input
                  inputMode="numeric"
                  value={person.age}
                  onChange={(e) => onAttendeeChange(index, 'age', e.target.value)}
                />
              </div>
              {band === AGE_BAND.ADULT ? (
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
            {band === AGE_BAND.CHILD ? (
              <p className="muted">Child guest — name and age only.</p>
            ) : null}
          </div>
        );
      })}

      <button type="button" className="btn" onClick={onAddToddler}>
        Add toddler (under 5, free)
      </button>

      {error ? <p className="error">{error}</p> : null}

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
