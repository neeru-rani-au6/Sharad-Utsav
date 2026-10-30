import {
  AGE_BAND,
  CATALOG,
  EXTRA_KIND,
  FESTIVAL_DAYS,
  TICKET_KIND,
  WORKSHOP_DAYS,
} from './constants.js';
import { parseAge, validateBookerAge } from './age.js';
import { quoteCart, stockDemand } from './pricing.js';

function err(field, message) {
  return { field, message };
}

function normalizeQty(raw) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) return null;
  return n;
}

/** Validate cart structure (kinds, days, qty) against catalog. */
export function validateCartShape(cart) {
  const errors = [];
  if (!cart || typeof cart !== 'object') {
    return [err('cart', 'Cart is required.')];
  }

  const tickets = Array.isArray(cart.tickets) ? cart.tickets : [];
  const extras = Array.isArray(cart.extras) ? cart.extras : [];

  if (tickets.length === 0) {
    errors.push(err('cart', 'Please choose at least one ticket.'));
  }

  for (const item of tickets) {
    const meta = CATALOG[item.kind];
    if (!meta || meta.type !== 'ticket') {
      errors.push(err('cart', `Unknown ticket: ${item.kind}.`));
      continue;
    }
    const qty = normalizeQty(item.qty);
    if (qty === null || qty <= 0) {
      errors.push(err('cart', `Invalid quantity for ${meta.label}.`));
      continue;
    }
    if (meta.needsDay) {
      if (!FESTIVAL_DAYS.includes(item.day)) {
        errors.push(err('cart', `${meta.label} needs a valid festival day.`));
      }
    } else if (item.day) {
      errors.push(err('cart', `${meta.label} covers all days and cannot pick a single day.`));
    }
  }

  for (const item of extras) {
    const meta = CATALOG[item.kind];
    if (!meta || meta.type !== 'extra') {
      errors.push(err('cart', `Unknown extra: ${item.kind}.`));
      continue;
    }
    const qty = normalizeQty(item.qty);
    if (qty === null || qty <= 0) {
      errors.push(err('cart', `Invalid quantity for ${meta.label}.`));
      continue;
    }
    if (meta.needsDay) {
      if (!FESTIVAL_DAYS.includes(item.day)) {
        errors.push(err('cart', `${meta.label} needs a valid festival day.`));
      }
      if (meta.allowedDays && !meta.allowedDays.includes(item.day)) {
        errors.push(
          err(
            'cart',
            `${meta.label} only runs on ${WORKSHOP_DAYS.map(formatDayShort).join(' and ')}.`,
          ),
        );
      }
    }
  }

  return errors;
}

function formatDayShort(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Capacity covered by tickets:
 * - per day: adultSlots, childSlots
 * - allDays flag via all-day passes adding to every day
 */
export function ticketCapacity(cart) {
  const byDay = {};
  for (const day of FESTIVAL_DAYS) {
    byDay[day] = { adults: 0, children: 0 };
  }

  for (const item of cart.tickets || []) {
    const qty = Number(item.qty) || 0;
    if (qty <= 0) continue;

    if (item.kind === TICKET_KIND.DAY_ADULT) {
      byDay[item.day].adults += qty;
    } else if (item.kind === TICKET_KIND.DAY_CHILD) {
      byDay[item.day].children += qty;
    } else if (item.kind === TICKET_KIND.ALLDAY_ADULT) {
      for (const day of FESTIVAL_DAYS) byDay[day].adults += qty;
    } else if (item.kind === TICKET_KIND.ALLDAY_CHILD) {
      for (const day of FESTIVAL_DAYS) byDay[day].children += qty;
    } else if (item.kind === TICKET_KIND.FAMILY) {
      byDay[item.day].adults += 2 * qty;
      byDay[item.day].children += 2 * qty;
    }
  }

  return byDay;
}

/** How many ticketed adult/child slots the booking must fill (unique people). */
export function requiredAttendees(cart) {
  let adults = 0;
  let children = 0;

  // Unique people: all-day counts as one person; day passes count max day;
  // family counts 2A+2C per pass. Mixing is approximate by taking max coverage.
  const adultAllDay = sumKind(cart, TICKET_KIND.ALLDAY_ADULT);
  const childAllDay = sumKind(cart, TICKET_KIND.ALLDAY_CHILD);

  const adultDayMax = maxDayQty(cart, TICKET_KIND.DAY_ADULT);
  const childDayMax = maxDayQty(cart, TICKET_KIND.DAY_CHILD);

  const familyMax = maxDayQty(cart, TICKET_KIND.FAMILY);

  adults = adultAllDay + adultDayMax + familyMax * 2;
  children = childAllDay + childDayMax + familyMax * 2;

  return { adults, children, total: adults + children };
}

function sumKind(cart, kind) {
  return (cart.tickets || [])
    .filter((t) => t.kind === kind)
    .reduce((s, t) => s + (Number(t.qty) || 0), 0);
}

function maxDayQty(cart, kind) {
  const byDay = {};
  for (const t of cart.tickets || []) {
    if (t.kind !== kind) continue;
    const day = t.day || '_';
    byDay[day] = (byDay[day] || 0) + (Number(t.qty) || 0);
  }
  return Object.values(byDay).reduce((m, n) => Math.max(m, n), 0);
}

export function validateBooker(booker) {
  const errors = [];
  if (!booker || typeof booker !== 'object') {
    return [err('booker', 'Booker details are required.')];
  }
  if (!String(booker.name || '').trim()) {
    errors.push(err('booker.name', 'Please enter your name.'));
  }
  const email = String(booker.email || '').trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push(err('booker.email', 'Please enter a valid email.'));
  }
  const phone = String(booker.phone || '').trim();
  if (!phone || phone.replace(/\D/g, '').length < 10) {
    errors.push(err('booker.phone', 'Please enter a phone number (at least 10 digits).'));
  }
  const ageCheck = validateBookerAge(booker.age);
  if (!ageCheck.ok) {
    errors.push(err('booker.age', ageCheck.message));
  }
  return errors;
}

/** Build labeled slots so the UI can show Adult 1 / Child 1 clearly. */
export function buildAttendeeTemplate(cart) {
  const need = requiredAttendees(cart);
  const slots = [];
  for (let i = 0; i < need.adults; i += 1) {
    slots.push({
      role: AGE_BAND.ADULT,
      label: `Adult ${i + 1}`,
      hint: 'Age 12 or older',
    });
  }
  for (let i = 0; i < need.children; i += 1) {
    slots.push({
      role: AGE_BAND.CHILD,
      label: `Child ${i + 1}`,
      hint: 'Age 5 to 11',
    });
  }
  return { need, slots };
}

export function validateAttendees(attendees, cart) {
  const errors = [];
  const { need, slots: template } = buildAttendeeTemplate(cart);
  const list = Array.isArray(attendees) ? attendees : [];

  const ticketedPeople = list.filter((a) => a?.role !== 'TODDLER' && !a?.isToddler);
  const toddlers = list.filter((a) => a?.role === 'TODDLER' || a?.isToddler);

  // Validate each required ticketed slot by position (adults first, then children).
  let adultCount = 0;
  let childCount = 0;
  let filledTicketed = 0;

  template.forEach((slot, index) => {
    const person = ticketedPeople[index];
    const label = slot.label;

    if (!person) {
      errors.push(err('attendees', `${label} is missing — add their name and age (${slot.hint.toLowerCase()}).`));
      return;
    }

    const hasName = Boolean(String(person.name || '').trim());
    const ageCheck = parseAge(person.age);

    if (!hasName && !ageCheck.ok) {
      errors.push(
        err('attendees', `${label} is empty — enter a name and age (${slot.hint.toLowerCase()}).`),
      );
      return;
    }
    if (!hasName) {
      errors.push(err('attendees', `${label}: please enter a name.`));
    }
    if (!ageCheck.ok) {
      errors.push(err('attendees', `${label}: ${ageCheck.message}`));
      return;
    }

    if (ageCheck.band === AGE_BAND.TODDLER) {
      errors.push(
        err(
          'attendees',
          `${label}: age ${ageCheck.age} is under 5 (free toddler). Use “Add toddler” for them, and put a ticketed guest here instead.`,
        ),
      );
      return;
    }

    filledTicketed += 1;
    if (ageCheck.band === AGE_BAND.ADULT) adultCount += 1;
    if (ageCheck.band === AGE_BAND.CHILD) childCount += 1;

    if (slot.role === AGE_BAND.ADULT && ageCheck.band !== AGE_BAND.ADULT) {
      errors.push(
        err(
          'attendees',
          `${label} must be age 12+ (you entered ${ageCheck.age}). Children 5–11 go in the Child slots.`,
        ),
      );
    }
    if (slot.role === AGE_BAND.CHILD && ageCheck.band !== AGE_BAND.CHILD) {
      errors.push(
        err(
          'attendees',
          `${label} must be age 5–11 (you entered ${ageCheck.age}). Adults 12+ go in the Adult slots.`,
        ),
      );
    }
  });

  // Extra non-toddler rows beyond template (should not happen, but guard).
  if (ticketedPeople.length > template.length) {
    errors.push(
      err(
        'attendees',
        `Too many ticketed guests — this booking only needs ${need.total} (${need.adults} adult${need.adults === 1 ? '' : 's'}, ${need.children} child${need.children === 1 ? '' : 'ren'}).`,
      ),
    );
  }

  toddlers.forEach((person, i) => {
    const label = `Toddler ${i + 1}`;
    if (!String(person?.name || '').trim()) {
      errors.push(err('attendees', `${label}: please enter a name.`));
    }
    const ageCheck = parseAge(person?.age);
    if (!ageCheck.ok) {
      errors.push(err('attendees', `${label}: ${ageCheck.message}`));
    } else if (ageCheck.band !== AGE_BAND.TODDLER) {
      errors.push(err('attendees', `${label} must be under 5 (you entered ${ageCheck.age}).`));
    }
  });

  if (
    errors.length === 0 &&
    (filledTicketed !== need.total || adultCount !== need.adults || childCount !== need.children)
  ) {
    errors.push(
      err(
        'attendees',
        `Please enter ${need.adults} adult${need.adults === 1 ? '' : 's'} (12+) and ${need.children} child${need.children === 1 ? '' : 'ren'} (5–11). Right now: ${adultCount} adult${adultCount === 1 ? '' : 's'}, ${childCount} child${childCount === 1 ? '' : 'ren'}.`,
      ),
    );
  }

  return errors;
}

/** Dinner and workshop need ticket coverage that day for enough people. */
export function validateExtrasAgainstTickets(cart) {
  const errors = [];
  const capacity = ticketCapacity(cart);

  for (const item of cart.extras || []) {
    const qty = Number(item.qty) || 0;
    if (qty <= 0) continue;

    if (item.kind === EXTRA_KIND.DINNER) {
      const cap = capacity[item.day];
      const seats = (cap?.adults || 0) + (cap?.children || 0);
      if (qty > seats) {
        errors.push(
          err(
            'extras',
            `Dinner on ${formatDayShort(item.day)}: ${qty} plates requested but only ${seats} ticketed guest${seats === 1 ? '' : 's'} that day.`,
          ),
        );
      }
    }

    if (item.kind === EXTRA_KIND.WORKSHOP) {
      const cap = capacity[item.day];
      const seats = (cap?.adults || 0) + (cap?.children || 0);
      if (seats < 1) {
        errors.push(
          err(
            'extras',
            `Garba Workshop on ${formatDayShort(item.day)} needs a ticket covering that day.`,
          ),
        );
      }
      if (qty > seats) {
        errors.push(
          err(
            'extras',
            `Workshop quantity (${qty}) cannot exceed ticketed guests on ${formatDayShort(item.day)} (${seats}).`,
          ),
        );
      }
    }
  }

  return errors;
}

export function validateStock(cart, stockMap) {
  const errors = [];
  const demand = stockDemand(cart);
  for (const [sku, qty] of Object.entries(demand)) {
    const remaining = Number(stockMap[sku] ?? 0);
    const label = CATALOG[sku]?.label || sku;
    if (remaining <= 0) {
      errors.push(err('stock', `${label} is sold out.`));
    } else if (qty > remaining) {
      errors.push(
        err('stock', `Only ${remaining} ${label} left; you asked for ${qty}.`),
      );
    }
  }
  return errors;
}

/**
 * Full validation for quote/book.
 * options: { requirePeople: boolean, stockMap, promoRow, now }
 */
export function validateBooking(input, options = {}) {
  const { cart, booker, attendees, promoCode } = input;
  const errors = [];

  errors.push(...validateCartShape(cart));
  errors.push(...validateExtrasAgainstTickets(cart));

  if (options.stockMap) {
    errors.push(...validateStock(cart, options.stockMap));
  }

  if (options.requirePeople) {
    errors.push(...validateBooker(booker));
    errors.push(...validateAttendees(attendees, cart));
  }

  const hasPromo = promoCode != null && String(promoCode).trim() !== '';
  let promoRow = options.promoRow || null;

  if (hasPromo && !promoRow) {
    errors.push(err('promoCode', 'That promo code is not recognised.'));
  }

  const quote = quoteCart(cart, hasPromo ? promoRow : null, options.now || new Date());
  if (hasPromo && promoRow && !quote.ok) {
    errors.push(...(quote.errors || [err('promoCode', quote.promoMessage)]));
  }

  return {
    ok: errors.length === 0 && (quote.ok !== false || !hasPromo),
    errors,
    quote: {
      ...quote,
      ok: errors.length === 0 ? quote.ok !== false : false,
    },
  };
}
