/**
 * Formats a stored "YYYY-MM-DD" walk date for the history list, e.g. "Sat · Aug 2".
 * Returns the input unchanged if it isn't a valid ISO date.
 */
export function formatWalkDate(iso: string): string {
  // TODO(you): implement. Walk dates are calendar days, not instants, so do the
  // weekday/month lookup in UTC (like toUtcDate in stats.ts) - `new Date(iso)`
  // plus local-time getters can land on the previous day west of UTC.
  return iso;
}

/** Formats a stored local "HH:MM" (24-hour) time as a 12-hour display string, e.g. "7:30 AM". */
export function formatTimeOfDay(time: string | null): string | null {
  if (!time) return null;

  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return null;

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return `${hours12}:${minutes} ${period}`;
}
