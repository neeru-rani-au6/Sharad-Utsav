'use client';

import { useEffect, useMemo, useState } from 'react';
import { CATALOG, FESTIVAL_DAYS } from '@/domain/constants';
import { quoteCart } from '@/domain/pricing';
import { AGE_BAND } from '@/domain/constants';
import { buildAttendeeTemplate } from '@/domain/rules';
import { newIdempotencyKey } from '@/lib/format';
import StepTickets from './StepTickets';
import StepExtras from './StepExtras';
import StepPeople from './StepPeople';
import StepReview from './StepReview';
import StepPay from './StepPay';
import StepDone from './StepDone';

const STEP_LABELS = ['Tickets', 'Extras', 'Guests', 'Review', 'Pay', 'Done'];

function upsertLine(list, kind, day, qty) {
  const next = list.filter(
    (item) => !(item.kind === kind && (day ? item.day === day : !item.day)),
  );
  if (qty > 0) {
    next.push(day ? { kind, day, qty } : { kind, qty });
  }
  return next;
}

function makeAttendeeSlots(cart, previous) {
  const { slots: template } = buildAttendeeTemplate(cart);
  const prevList = previous || [];
  const prevAdults = prevList.filter((p) => p.role === AGE_BAND.ADULT);
  const prevChildren = prevList.filter((p) => p.role === AGE_BAND.CHILD);
  const prevOther = prevList.filter(
    (p) => !p.isToddler && p.role !== 'TODDLER' && p.role !== AGE_BAND.ADULT && p.role !== AGE_BAND.CHILD,
  );
  const toddlers = prevList.filter((p) => p.isToddler || p.role === 'TODDLER');

  let adultI = 0;
  let childI = 0;
  let otherI = 0;

  const slots = template.map((slot, i) => {
    let prev;
    if (slot.role === AGE_BAND.ADULT) {
      prev = prevAdults[adultI] || prevOther[otherI];
      if (prevAdults[adultI]) adultI += 1;
      else if (prev) otherI += 1;
    } else {
      prev = prevChildren[childI] || prevOther[otherI];
      if (prevChildren[childI]) childI += 1;
      else if (prev) otherI += 1;
    }
    return {
      key: prev?.key || `${slot.role}-${i}`,
      name: prev?.name || '',
      age: prev?.age || '',
      phone: prev?.phone || '',
      role: slot.role,
      label: slot.label,
      hint: slot.hint,
      slotIndex: i,
      isToddler: false,
    };
  });

  for (const t of toddlers) {
    slots.push({
      ...t,
      role: 'TODDLER',
      label: t.label || 'Toddler (free)',
      hint: 'Under 5 — free, no ticket',
      isToddler: true,
    });
  }
  return slots;
}

export default function BookingForm() {
  const [step, setStep] = useState(0);
  const [catalog, setCatalog] = useState(null);
  const [selectedDay, setSelectedDay] = useState(FESTIVAL_DAYS[0]);
  const [dinnerDay, setDinnerDay] = useState(FESTIVAL_DAYS[0]);
  const [workshopDay, setWorkshopDay] = useState('2026-11-11');
  const [cart, setCart] = useState({ tickets: [], extras: [] });
  const [booker, setBooker] = useState({ name: '', email: '', phone: '', age: '' });
  const [attendees, setAttendees] = useState([]);
  const [promoCode, setPromoCode] = useState('');
  const [quote, setQuote] = useState(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [promoBusy, setPromoBusy] = useState(false);
  const [booking, setBooking] = useState(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => newIdempotencyKey());

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then(setCatalog)
      .catch(() => setError('Could not load the festival catalogue.'));
  }, []);

  useEffect(() => {
    setAttendees((prev) => makeAttendeeSlots(cart, prev));
  }, [cart]);

  const localEstimate = useMemo(() => quoteCart(cart).totalCents, [cart]);

  function changeTicketQty(kind, day, qty) {
    const remaining =
      catalog?.tickets?.find((t) => t.id === kind)?.remaining ??
      CATALOG[kind]?.initialStock ??
      qty;
    const safeQty = Math.max(0, Math.min(qty, remaining));
    setCart((prev) => ({
      ...prev,
      tickets: upsertLine(prev.tickets, kind, day, safeQty),
    }));
  }

  function changeExtraQty(kind, day, qty) {
    const meta = CATALOG[kind];
    const remaining = catalog?.extras?.find((e) => e.id === kind)?.remaining ?? meta?.initialStock;
    const safeQty = Math.max(0, Math.min(qty, remaining ?? qty));
    setCart((prev) => ({
      ...prev,
      extras: upsertLine(prev.extras, kind, day, safeQty),
    }));
  }

  async function fetchQuote(requirePeople = false) {
    setError('');
    setPromoBusy(true);
    try {
      const res = await fetch('/api/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          promoCode: promoCode.trim() || undefined,
          booker,
          attendees: attendees.map(({ name, age, phone }) => ({ name, age, phone })),
          requirePeople,
        }),
      });
      const data = await res.json();
      setQuote(data);
      if (!data.ok) {
        setError((data.errors || []).map((e) => e.message).join(' ') || 'Please check your booking.');
        return null;
      }
      return data;
    } catch {
      setError('Network error — please try again.');
      return null;
    } finally {
      setPromoBusy(false);
    }
  }

  async function goReview() {
    const data = await fetchQuote(true);
    if (data) setStep(3);
  }

  async function applyPromo() {
    await fetchQuote(true);
  }

  async function pay() {
    if (paying) return;
    setPaying(true);
    setError('');
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cart,
          booker,
          attendees: attendees.map(({ name, age, phone }) => ({ name, age, phone })),
          promoCode: promoCode.trim() || undefined,
          payment: { method: 'simulated', idempotencyKey },
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError((data.errors || []).map((e) => e.message).join(' ') || 'Payment failed.');
        // Refresh catalog stock after conflict
        const cat = await fetch('/api/catalog').then((r) => r.json());
        setCatalog(cat);
        return;
      }
      setBooking(data.booking);
      setStep(5);
      setIdempotencyKey(newIdempotencyKey());
    } catch {
      setError('Network error — please try again. If you already paid, do not pay twice.');
    } finally {
      setPaying(false);
    }
  }

  return (
    <div>
      <div className="steps" aria-label="Booking steps">
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={`step-pill ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
          >
            {i + 1}. {label}
          </span>
        ))}
      </div>

      {step === 0 ? (
        <StepTickets
          catalog={catalog}
          cart={cart}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onChangeQty={changeTicketQty}
          estimateCents={localEstimate}
          onNext={() => setStep(1)}
        />
      ) : null}

      {step === 1 ? (
        <StepExtras
          catalog={catalog}
          cart={cart}
          dinnerDay={dinnerDay}
          workshopDay={workshopDay}
          onDinnerDay={setDinnerDay}
          onWorkshopDay={setWorkshopDay}
          onChangeExtra={changeExtraQty}
          estimateCents={localEstimate}
          onBack={() => setStep(0)}
          onNext={() => setStep(2)}
        />
      ) : null}

      {step === 2 ? (
        <StepPeople
          cart={cart}
          booker={booker}
          attendees={attendees}
          onBookerChange={(field, value) => setBooker((b) => ({ ...b, [field]: value }))}
          onAttendeeChange={(index, field, value) => {
            setAttendees((list) =>
              list.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
            );
          }}
          onCopyBookerToFirstAdult={() => {
            setAttendees((list) => {
              const idx = list.findIndex((p) => p.role === AGE_BAND.ADULT);
              if (idx < 0) return list;
              return list.map((p, i) =>
                i === idx
                  ? {
                      ...p,
                      name: booker.name || p.name,
                      age: booker.age || p.age,
                      phone: booker.phone || p.phone,
                    }
                  : p,
              );
            });
          }}
          onAddToddler={() => {
            setAttendees((list) => [
              ...list,
              {
                key: `toddler-${Date.now()}`,
                name: '',
                age: '3',
                phone: '',
                role: 'TODDLER',
                label: 'Toddler (free)',
                hint: 'Under 5 — free, no ticket',
                isToddler: true,
              },
            ]);
          }}
          onRemoveAttendee={(index) => {
            setAttendees((list) => list.filter((_, i) => i !== index));
          }}
          error={error}
          onBack={() => {
            setError('');
            setStep(1);
          }}
          onNext={goReview}
        />
      ) : null}

      {step === 3 ? (
        <StepReview
          quote={quote}
          promoCode={promoCode}
          onPromoChange={setPromoCode}
          onApplyPromo={applyPromo}
          promoBusy={promoBusy}
          error={error}
          onBack={() => {
            setError('');
            setStep(2);
          }}
          onNext={() => {
            setError('');
            setStep(4);
          }}
        />
      ) : null}

      {step === 4 ? (
        <StepPay
          totalCents={quote?.totalCents || 0}
          paying={paying}
          error={error}
          onBack={() => setStep(3)}
          onPay={pay}
        />
      ) : null}

      {step === 5 ? <StepDone booking={booking} /> : null}

      {catalog?.storageMode === 'memory' ? (
        <p className="hint" style={{ marginTop: '1rem' }}>
          Running with in-memory stock — <code>MONGODB_URI</code> is not set on this
          server. On Vercel: Project → Settings → Environment Variables → add{' '}
          <code>MONGODB_URI</code> (Production), then Redeploy. Seed with{' '}
          <code>pnpm db:seed</code>.
        </p>
      ) : null}
    </div>
  );
}
