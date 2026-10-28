import { FESTIVAL_DAYS } from '@/domain/constants';

export function formatDay(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function dayLabel(iso) {
  return formatDay(iso);
}

export function allDayLabels() {
  return FESTIVAL_DAYS.map((d) => ({ id: d, label: formatDay(d) }));
}

export function newIdempotencyKey() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `pay-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
