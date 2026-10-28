import { describe, expect, it } from 'vitest';
import { classifyAge, parseAge, validateBookerAge } from './age.js';
import { AGE_BAND } from './constants.js';

describe('classifyAge', () => {
  it('marks under 5 as toddler', () => {
    expect(classifyAge(0)).toBe(AGE_BAND.TODDLER);
    expect(classifyAge(4)).toBe(AGE_BAND.TODDLER);
  });

  it('marks 5–11 as child', () => {
    expect(classifyAge(5)).toBe(AGE_BAND.CHILD);
    expect(classifyAge(11)).toBe(AGE_BAND.CHILD);
  });

  it('marks 12+ as adult', () => {
    expect(classifyAge(12)).toBe(AGE_BAND.ADULT);
    expect(classifyAge(40)).toBe(AGE_BAND.ADULT);
  });
});

describe('parseAge', () => {
  it('rejects blank and nonsense', () => {
    expect(parseAge('').ok).toBe(false);
    expect(parseAge('abc').ok).toBe(false);
    expect(parseAge('-3').ok).toBe(false);
    expect(parseAge('12.5').ok).toBe(false);
  });

  it('accepts whole numbers', () => {
    expect(parseAge('7')).toEqual({ ok: true, age: 7, band: AGE_BAND.CHILD });
    expect(parseAge(18)).toEqual({ ok: true, age: 18, band: AGE_BAND.ADULT });
  });
});

describe('validateBookerAge', () => {
  it('requires 18+', () => {
    expect(validateBookerAge(17).ok).toBe(false);
    expect(validateBookerAge(18).ok).toBe(true);
  });
});
