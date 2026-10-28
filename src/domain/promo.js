import { PROMO_TYPE, TICKET_KIND } from './constants.js';
import { clampTotal, percentOff } from './money.js';

/**
 * Apply a promo definition to priced lines.
 * promoRow shape from DB or seed: { code, type, percent, cents, expires_at, max_uses, uses }
 */
export function applyPromo(lines, promoRow, now = new Date()) {
  if (!promoRow) {
    return { ok: false, message: 'That promo code is not recognised.' };
  }

  const code = String(promoRow.code || '').toUpperCase();
  const expiresAt = promoRow.expires_at ? new Date(promoRow.expires_at) : null;
  if (expiresAt && expiresAt.getTime() < now.getTime()) {
    return {
      ok: false,
      message: `Promo code ${code} expired on ${expiresAt.toLocaleDateString('en-US')}.`,
    };
  }

  const maxUses = Number(promoRow.max_uses);
  const uses = Number(promoRow.uses) || 0;
  if (Number.isFinite(maxUses) && uses >= maxUses) {
    return {
      ok: false,
      message: `Promo code ${code} has already been used its maximum number of times.`,
    };
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);

  if (promoRow.type === PROMO_TYPE.PERCENT) {
    const discount = percentOff(subtotal, Number(promoRow.percent) || 0);
    return {
      ok: true,
      code,
      discountCents: discount,
      totalCents: clampTotal(subtotal - discount),
      message: `${code} applied: ${promoRow.percent}% off.`,
      lines,
    };
  }

  if (promoRow.type === PROMO_TYPE.FLAT) {
    const discount = Math.min(subtotal, Number(promoRow.cents) || 0);
    return {
      ok: true,
      code,
      discountCents: discount,
      totalCents: clampTotal(subtotal - discount),
      message: `${code} applied: $${((promoRow.cents || 0) / 100).toFixed(0)} off.`,
      lines,
    };
  }

  if (promoRow.type === PROMO_TYPE.KIDS_FREE) {
    const adjusted = lines.map((line) => {
      if (
        line.kind === TICKET_KIND.DAY_CHILD ||
        line.kind === TICKET_KIND.ALLDAY_CHILD
      ) {
        return { ...line, unitPriceCents: 0, lineTotalCents: 0, kidsFree: true };
      }
      return line;
    });
    const newSubtotal = adjusted.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const discount = subtotal - newSubtotal;
    return {
      ok: true,
      code,
      discountCents: discount,
      totalCents: newSubtotal,
      message: `${code} applied: child tickets are free.`,
      lines: adjusted,
      kidsFree: true,
    };
  }

  return { ok: false, message: 'That promo code is not recognised.' };
}
