import type { DailyStats } from "../types";

interface StatsPanelProps {
  stats: DailyStats;
  dogName: string | null;
}

export function StatsPanel({ stats, dogName }: StatsPanelProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-3">
      <article className="rounded-2xl bg-[var(--color-panel)] p-4 shadow-sm ring-1 ring-[var(--color-trail)]/40">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-moss)]">
          Streak
        </p>
        <p className="mt-1 text-3xl font-semibold text-[var(--color-soil)]">
          {stats.streak_days}
          <span className="ml-1 text-base font-medium text-[var(--color-bark)]/70">
            {stats.streak_days === 1 ? "day" : "days"}
          </span>
        </p>
        <p className="mt-1 text-xs text-[var(--color-bark)]/60">
          {dogName ? `${dogName}'s consecutive walk days` : "Add a dog to track streaks"}
        </p>
      </article>
      <article className="rounded-2xl bg-[var(--color-panel)] p-4 shadow-sm ring-1 ring-[var(--color-trail)]/40">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-moss)]">
          This week
        </p>
        <p className="mt-1 text-3xl font-semibold text-[var(--color-soil)]">
          {stats.total_walks_week}
          <span className="ml-1 text-base font-medium text-[var(--color-bark)]/70">
            walks
          </span>
        </p>
        <p className="mt-1 text-xs text-[var(--color-bark)]/60">Mon–today count</p>
      </article>
      <article className="rounded-2xl bg-[var(--color-panel)] p-4 shadow-sm ring-1 ring-[var(--color-trail)]/40">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-moss)]">
          Distance
        </p>
        <p className="mt-1 text-3xl font-semibold text-[var(--color-soil)]">
          {stats.total_distance_week.toFixed(1)}
          <span className="ml-1 text-base font-medium text-[var(--color-bark)]/70">
            km
          </span>
        </p>
        <p className="mt-1 text-xs text-[var(--color-bark)]/60">Total this week</p>
      </article>
    </section>
  );
}
