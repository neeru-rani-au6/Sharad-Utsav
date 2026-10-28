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

export function validateAttendees(attendees, cart) {
  const errors = [];
  const need = requiredAttendees(cart);
  const list = Array.isArray(attendees) ? attendees : [];

  const ticketed = list.filter((a) => {
    const p = parseAge(a?.age);
    return p.ok && p.band !== AGE_BAND.TODDLER;
  });

  const toddlers = list.filter((a) => {
    const p = parseAge(a?.age);
    return p.ok && p.band === AGE_BAND.TODDLER;
  });

  // Toddlers are optional extras for the door list; ticketed people must match.
  if (ticketed.length !== need.total) {
    errors.push(
      err(
        'attendees',
        `Please enter details for ${need.total} ticketed guest${need.total === 1 ? '' : 's'} (you have ${ticketed.length}). Toddlers under 5 are free and do not need a ticket.`,
      ),
    );
  }

  let adultCount = 0;
  let childCount = 0;

  list.forEach((person, index) => {
    const prefix = `attendees[${index}]`;
    if (!String(person?.name || '').trim()) {
      errors.push(err(`${prefix}.name`, 'Please enter a name.'));
    }
    const ageCheck = parseAge(person?.age);
    if (!ageCheck.ok) {
      errors.push(err(`${prefix}.age`, ageCheck.message));
      return;
    }
    if (ageCheck.band === AGE_BAND.ADULT) adultCount += 1;
    if (ageCheck.band === AGE_BAND.CHILD) childCount += 1;
    if (ageCheck.band === AGE_BAND.TODDLER) {
      // toddlers ok — no phone needed
      return;
    }
    if (ageCheck.band === AGE_BAND.ADULT) {
      // phone optional for adult attendees
    }
  });

  if (ticketed.length === need.total) {
    if (adultCount !== need.adults) {
      errors.push(
        err(
          'attendees',
          `This booking covers ${need.adults} adult${need.adults === 1 ? '' : 's'} (age 12+), but you listed ${adultCount}.`,
        ),
      );
    }
    if (childCount !== need.children) {
      errors.push(
        err(
          'attendees',
          `This booking covers ${need.children} child${need.children === 1 ? '' : 'ren'} (ages 5–11), but you listed ${childCount}.`,
        ),
      );
    }
  }

  // Soft note: toddlers don't affect counts beyond being listed
  void toddlers;

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
