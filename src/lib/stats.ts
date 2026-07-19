import type { DailyStats, Walk } from "../types";

function toUtcDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return formatIso(new Date());
}

/** Consecutive days with at least one walk, ending at `asOf` (or yesterday if none today). */
export function computeStreak(walkDates: string[], asOf: string = todayIso()): number {
  const unique = new Set(walkDates);
  if (unique.size === 0) return 0;

  let cursor = asOf;
  if (!unique.has(cursor)) {
    const prev = toUtcDate(asOf);
    prev.setUTCDate(prev.getUTCDate() - 1);
    cursor = formatIso(prev);
    if (!unique.has(cursor)) return 0;
  }

  let streak = 0;
  while (unique.has(cursor)) {
    streak += 1;
    const d = toUtcDate(cursor);
    d.setUTCDate(d.getUTCDate() - 1);
    cursor = formatIso(d);
  }
  return streak;
}

export function startOfWeekIso(asOf: string = todayIso()): string {
  const d = toUtcDate(asOf);
  const day = d.getUTCDay(); // 0 Sun … 6 Sat
  const diff = day === 0 ? 6 : day - 1; // Monday-start week
  d.setUTCDate(d.getUTCDate() - diff);
  return formatIso(d);
}

export function getDailyStats(walks: Walk[], asOf: string = todayIso()): DailyStats {
  const weekStart = startOfWeekIso(asOf);
  const weekWalks = walks.filter((w) => w.date >= weekStart && w.date <= asOf);
  return {
    total_walks_week: weekWalks.length,
    total_distance_week: weekWalks.reduce((sum, w) => sum + (w.distance_km ?? 0), 0),
    streak_days: computeStreak(
      walks.map((w) => w.date),
      asOf,
    ),
  };
}

export interface DaySeriesPoint {
  date: string;
  label: string;
  distance_km: number;
  walks: number;
}

/** Last `days` calendar days (inclusive of asOf), filled with zeros when missing. */
export function buildDistanceSeries(
  walks: Walk[],
  days = 14,
  asOf: string = todayIso(),
): DaySeriesPoint[] {
  const byDate = new Map<string, { distance_km: number; walks: number }>();
  for (const walk of walks) {
    const prev = byDate.get(walk.date) ?? { distance_km: 0, walks: 0 };
    byDate.set(walk.date, {
      distance_km: prev.distance_km + (walk.distance_km ?? 0),
      walks: prev.walks + 1,
    });
  }

  const end = toUtcDate(asOf);
  const points: DaySeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    const iso = formatIso(d);
    const entry = byDate.get(iso) ?? { distance_km: 0, walks: 0 };
    points.push({
      date: iso,
      label: `${d.getUTCMonth() + 1}/${d.getUTCDate()}`,
      distance_km: Number(entry.distance_km.toFixed(2)),
      walks: entry.walks,
    });
  }
  return points;
}
