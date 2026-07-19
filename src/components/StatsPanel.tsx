import { buildHealthInsight } from "../lib/stats";
import type { DailyStats, Goal } from "../types";

interface StatsPanelProps {
  stats: DailyStats;
  dogName: string | null;
  goal: Goal | null;
  walkedToday: boolean;
}

function MiniProgress({
  label,
  current,
  target,
  unit,
}: {
  label: string;
  current: number;
  target: number | null | undefined;
  unit: string;
}) {
  if (target == null || target <= 0) {
    return (
      <p className="mt-2 text-xs text-[var(--color-bark)]/55">
        No {label.toLowerCase()} goal set
      </p>
    );
  }
  const pct = Math.min(100, Math.round((current / target) * 100));
  const currentLabel =
    unit === "km" ? current.toFixed(1) : String(Math.round(current));
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between gap-2 text-xs text-[var(--color-bark)]/65">
        <span>
          {currentLabel} / {target}
          {unit ? ` ${unit}` : ""}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-mist)]">
        <div
          className="h-full rounded-full bg-[var(--color-moss)] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function StatsPanel({
  stats,
  dogName,
  goal,
  walkedToday,
}: StatsPanelProps) {
  const insight = buildHealthInsight(stats, goal, null);

  return (
    <section className="space-y-4" aria-label="Weekly progress">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-[var(--color-soil)] sm:text-xl">
            This week
            {dogName ? (
              <span className="ml-2 text-sm font-normal text-[var(--color-bark)]/60">
                {dogName}
              </span>
            ) : null}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--color-bark)]/70">
            Monday–today progress toward your routine
          </p>
        </div>
        <p
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            walkedToday
              ? "bg-[var(--color-moss)]/15 text-[var(--color-moss)]"
              : "bg-[var(--color-mist)] text-[var(--color-bark)]/75"
          }`}
        >
          {walkedToday ? "Walked today" : "Not walked today"}
        </p>
      </div>

      <div className="grid gap-3 min-[520px]:grid-cols-3">
        <article className="rounded-2xl bg-[var(--color-panel)] p-3.5 shadow-sm ring-1 ring-[var(--color-trail)]/40 sm:p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-moss)]">
            Streak
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-soil)] sm:text-3xl">
            {stats.streak_days}
            <span className="ml-1 text-base font-medium text-[var(--color-bark)]/70">
              {stats.streak_days === 1 ? "day" : "days"}
            </span>
          </p>
          <p className="mt-2 text-xs text-[var(--color-bark)]/60">
            Consecutive walk days
          </p>
        </article>

        <article className="rounded-2xl bg-[var(--color-panel)] p-3.5 shadow-sm ring-1 ring-[var(--color-trail)]/40 sm:p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-moss)]">
            Walks
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-soil)] sm:text-3xl">
            {stats.total_walks_week}
            <span className="ml-1 text-base font-medium text-[var(--color-bark)]/70">
              this week
            </span>
          </p>
          <MiniProgress
            label="Walks"
            current={stats.total_walks_week}
            target={goal?.target_walks_per_week}
            unit=""
          />
        </article>

        <article className="rounded-2xl bg-[var(--color-panel)] p-3.5 shadow-sm ring-1 ring-[var(--color-trail)]/40 sm:p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-moss)]">
            Distance
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--color-soil)] sm:text-3xl">
            {stats.total_distance_week.toFixed(1)}
            <span className="ml-1 text-base font-medium text-[var(--color-bark)]/70">
              km
            </span>
          </p>
          <MiniProgress
            label="Distance"
            current={stats.total_distance_week}
            target={goal?.target_distance_weekly}
            unit="km"
          />
        </article>
      </div>

      {stats.total_walks_week > 0 ? (
        <p className="text-sm text-[var(--color-bark)]/75">{insight.summary}</p>
      ) : null}
    </section>
  );
}
