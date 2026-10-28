import { CATALOG, EXTRA_KIND, TICKET_KIND } from './constants.js';
import { applyPromo } from './promo.js';
import { clampTotal } from './money.js';

/**
 * Build priced lines from a cart. Does not apply promo.
 * cart: { tickets: [{ kind, qty, day? }], extras: [{ kind, qty, day? }] }
 */
export function buildLines(cart) {
  const tickets = Array.isArray(cart?.tickets) ? cart.tickets : [];
  const extras = Array.isArray(cart?.extras) ? cart.extras : [];
  const lines = [];

  for (const item of [...tickets, ...extras]) {
    const kind = item.kind;
    const meta = CATALOG[kind];
    if (!meta) continue;

    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty <= 0) continue;

    const unit = meta.priceCents;
    lines.push({
      kind,
      label: meta.label,
      qty,
      day: item.day || null,
      unitPriceCents: unit,
      lineTotalCents: unit * qty,
      type: meta.type,
    });
  }

  return lines;
}

export function sumLines(lines) {
  return lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
}

/**
 * Full quote: lines + optional promo.
 * promoRow may be null; promoCode string used only for messaging when missing.
 */
export function quoteCart(cart, promoRow = null, now = new Date()) {
  const baseLines = buildLines(cart);
  const subtotalCents = sumLines(baseLines);

  if (!promoRow) {
    return {
      ok: true,
      lines: baseLines,
      subtotalCents,
      discountCents: 0,
      totalCents: clampTotal(subtotalCents),
      promoCode: null,
      promoMessage: null,
    };
  }

  const applied = applyPromo(baseLines, promoRow, now);
  if (!applied.ok) {
    return {
      ok: false,
      lines: baseLines,
      subtotalCents,
      discountCents: 0,
      totalCents: clampTotal(subtotalCents),
      promoCode: null,
      promoMessage: applied.message,
      errors: [{ field: 'promoCode', message: applied.message }],
    };
  }

  // For KIDSFREE, subtotal is pre-discount ticket math; discount is child portion.
  const pricedSubtotal = sumLines(baseLines);
  return {
    ok: true,
    lines: applied.lines,
    subtotalCents: pricedSubtotal,
    discountCents: applied.discountCents,
    totalCents: applied.totalCents,
    promoCode: applied.code,
    promoMessage: applied.message,
  };
}

/** Stock units consumed per cart (by SKU). Family/day/allday/extras each count qty. */
export function stockDemand(cart) {
  const demand = {};
  const add = (kind, qty) => {
    demand[kind] = (demand[kind] || 0) + qty;
  };

  for (const item of cart?.tickets || []) {
    const qty = Number(item.qty) || 0;
    if (qty > 0 && CATALOG[item.kind]) add(item.kind, qty);
  }
  for (const item of cart?.extras || []) {
    const qty = Number(item.qty) || 0;
    if (qty > 0 && CATALOG[item.kind]) add(item.kind, qty);
  }
  return demand;
}

export function emptyCart() {
  return { tickets: [], extras: [] };
}

export function isTicketKind(kind) {
  return Object.values(TICKET_KIND).includes(kind);
}

export function isExtraKind(kind) {
  return Object.values(EXTRA_KIND).includes(kind);
}
