/** Format integer cents as USD display string. */
export function formatCents(cents) {
  const value = Number(cents) || 0;
  const dollars = value / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/** Floor a percentage discount in cents. */
export function percentOff(subtotalCents, percent) {
  if (subtotalCents <= 0 || percent <= 0) return 0;
  return Math.floor((subtotalCents * percent) / 100);
}

/** Never let a total go below zero. */
export function clampTotal(cents) {
  return Math.max(0, Number(cents) || 0);
}
