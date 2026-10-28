export const FESTIVAL_DAYS = [
  '2026-11-10',
  '2026-11-11',
  '2026-11-12',
  '2026-11-13',
  '2026-11-14',
];

export const WORKSHOP_DAYS = ['2026-11-11', '2026-11-13'];

export const TICKET_KIND = {
  DAY_ADULT: 'DAY_ADULT',
  DAY_CHILD: 'DAY_CHILD',
  ALLDAY_ADULT: 'ALLDAY_ADULT',
  ALLDAY_CHILD: 'ALLDAY_CHILD',
  FAMILY: 'FAMILY',
};

export const EXTRA_KIND = {
  DANDIYA: 'DANDIYA',
  DINNER: 'DINNER',
  WORKSHOP: 'WORKSHOP',
};

/** Catalog is the server source of truth for prices (cents) and labels. */
export const CATALOG = {
  [TICKET_KIND.DAY_ADULT]: {
    id: TICKET_KIND.DAY_ADULT,
    label: 'Day Pass – Adult',
    priceCents: 1500,
    type: 'ticket',
    ageBand: 'ADULT',
    needsDay: true,
    coversDays: 1,
    initialStock: 380,
  },
  [TICKET_KIND.DAY_CHILD]: {
    id: TICKET_KIND.DAY_CHILD,
    label: 'Day Pass – Child',
    priceCents: 800,
    type: 'ticket',
    ageBand: 'CHILD',
    needsDay: true,
    coversDays: 1,
    initialStock: 260,
  },
  [TICKET_KIND.ALLDAY_ADULT]: {
    id: TICKET_KIND.ALLDAY_ADULT,
    label: 'All-Day Pass – Adult',
    priceCents: 6000,
    type: 'ticket',
    ageBand: 'ADULT',
    needsDay: false,
    coversDays: 5,
    initialStock: 0,
  },
  [TICKET_KIND.ALLDAY_CHILD]: {
    id: TICKET_KIND.ALLDAY_CHILD,
    label: 'All-Day Pass – Child',
    priceCents: 3000,
    type: 'ticket',
    ageBand: 'CHILD',
    needsDay: false,
    coversDays: 5,
    initialStock: 140,
  },
  [TICKET_KIND.FAMILY]: {
    id: TICKET_KIND.FAMILY,
    label: 'Family Pass',
    priceCents: 4000,
    type: 'ticket',
    ageBand: 'FAMILY',
    needsDay: true,
    coversDays: 1,
    familyAdults: 2,
    familyChildren: 2,
    initialStock: 95,
  },
  [EXTRA_KIND.DANDIYA]: {
    id: EXTRA_KIND.DANDIYA,
    label: 'Dandiya Sticks (pair)',
    priceCents: 500,
    type: 'extra',
    needsDay: false,
    initialStock: 900,
  },
  [EXTRA_KIND.DINNER]: {
    id: EXTRA_KIND.DINNER,
    label: 'Dinner Plate',
    priceCents: 1200,
    type: 'extra',
    needsDay: true,
    initialStock: 1700,
  },
  [EXTRA_KIND.WORKSHOP]: {
    id: EXTRA_KIND.WORKSHOP,
    label: 'Garba Workshop',
    priceCents: 2000,
    type: 'extra',
    needsDay: true,
    allowedDays: WORKSHOP_DAYS,
    initialStock: 2,
  },
};

export const EVENT = {
  name: 'Sharad Utsav 2026',
  location: 'Radha Krishna Temple, Allen, Texas',
  currency: 'USD',
  days: FESTIVAL_DAYS,
};

export const AGE_BAND = {
  TODDLER: 'TODDLER',
  CHILD: 'CHILD',
  ADULT: 'ADULT',
  INVALID: 'INVALID',
};

export const PROMO_TYPE = {
  PERCENT: 'PERCENT',
  FLAT: 'FLAT',
  KIDS_FREE: 'KIDS_FREE',
};
