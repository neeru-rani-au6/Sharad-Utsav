import { AGE_BAND } from './constants.js';

/**
 * Parse age input. Rejects nonsense (blank, NaN, negative, decimals that are not whole ages).
 * @returns {{ ok: boolean, age?: number, band?: string, message?: string }}
 */
export function parseAge(raw) {
  if (raw === null || raw === undefined || raw === '') {
    return { ok: false, band: AGE_BAND.INVALID, message: 'Please enter an age.' };
  }

  const asString = String(raw).trim();
  if (!/^\d+$/.test(asString)) {
    return {
      ok: false,
      band: AGE_BAND.INVALID,
      message: 'Age must be a whole number.',
    };
  }

  const age = Number(asString);
  if (!Number.isInteger(age) || age < 0 || age > 120) {
    return {
      ok: false,
      band: AGE_BAND.INVALID,
      message: 'Please enter a realistic age (0–120).',
    };
  }

  return { ok: true, age, band: classifyAge(age) };
}

/** Under 5 free, 5–11 child, 12+ adult. */
export function classifyAge(age) {
  if (!Number.isInteger(age) || age < 0) return AGE_BAND.INVALID;
  if (age < 5) return AGE_BAND.TODDLER;
  if (age <= 11) return AGE_BAND.CHILD;
  return AGE_BAND.ADULT;
}

export function isBookerAgeOk(age) {
  return Number.isInteger(age) && age >= 18;
}

export function validateBookerAge(raw) {
  const parsed = parseAge(raw);
  if (!parsed.ok) return parsed;
  if (!isBookerAgeOk(parsed.age)) {
    return {
      ok: false,
      age: parsed.age,
      band: parsed.band,
      message: 'The person booking must be 18 or older.',
    };
  }
  return parsed;
}
