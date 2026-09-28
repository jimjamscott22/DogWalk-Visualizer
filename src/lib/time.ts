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
