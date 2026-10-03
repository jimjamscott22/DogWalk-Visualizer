/**
 * Formats a stored "YYYY-MM-DD" walk date for the history list, e.g. "Sat · Aug 2".
 * Returns the input unchanged if it isn't a valid ISO date.
 */
export function formatWalkDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  // Walk dates are calendar days, not instants, so use UTC throughout to avoid
  // timezone drift (same approach as toUtcDate in stats.ts).
  const date = new Date(Date.UTC(year, month - 1, day));

  // Date.UTC rolls over invalid days (e.g. Feb 30 -> Mar 2); reject those.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return iso;
  }

  return `${WEEKDAYS[date.getUTCDay()]} · ${MONTHS[date.getUTCMonth()]} ${day}`;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
