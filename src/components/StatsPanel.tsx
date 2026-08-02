import { buildHealthInsight } from "../lib/stats";
import { toDisplayDistance, distanceUnitLabel, type UnitSystem } from "../lib/units";
import type { DailyStats, Goal } from "../types";

interface StatsPanelProps {
  stats: DailyStats;
  dogName: string | null;
  goal: Goal | null;
  walkedToday: boolean;
  unitSystem?: UnitSystem;
}

function MiniProgress({
  label,
  current,
  target,
  unit,
  decimal = false,
}: {
  label: string;
  current: number;
  target: number | null | undefined;
  unit: string;
  decimal?: boolean;
}) {
  if (target == null || target <= 0) {
    return (
      <p className="mt-2 text-xs text-[var(--color-bark)]/55">
        No {label.toLowerCase()} goal set
      </p>
    );
  }
  const pct = Math.min(100, Math.round((current / target) * 100));
  const currentLabel = decimal ? current.toFixed(1) : String(Math.round(current));
  return (
    <div className="mt-3">
      <div className="mb-1 flex justify-between gap-2 text-xs text-[var(--color-bark)]/65">
        <span>
          {currentLabel} / {target.toFixed(decimal ? 1 : 0)}
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
  unitSystem = "us",
}: StatsPanelProps) {
  const insight = buildHealthInsight(stats, goal, null);
  const distanceUnit = distanceUnitLabel(unitSystem);
  const displayTotalDistance = toDisplayDistance(
    stats.total_distance_week,
    unitSystem,
  );
  const displayAvgDistance = toDisplayDistance(
    stats.avg_distance_week,
    unitSystem,
  );
  const displayGoalDistance =
    goal?.target_distance_weekly != null
      ? toDisplayDistance(goal.target_distance_weekly, unitSystem)
      : null;

  const summaryParts: string[] = [];
  if (stats.total_walks_week > 0) {
    summaryParts.push(
      `Avg ${displayAvgDistance.toFixed(1)} ${distanceUnit} per walk this week`,
    );
    if (insight.walks_progress != null && goal?.target_walks_per_week) {
      summaryParts.push(
        `${stats.total_walks_week}/${goal.target_walks_per_week} weekly walks`,
      );
    }
    if (insight.distance_progress != null && displayGoalDistance != null) {
      summaryParts.push(
        `${displayTotalDistance.toFixed(1)}/${displayGoalDistance.toFixed(1)} ${distanceUnit} weekly distance`,
      );
    }
  }
  const summary =
    summaryParts.length > 0
      ? summaryParts.join(" · ")
      : "Log walks this week to unlock health insights.";

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
            {displayTotalDistance.toFixed(1)}
            <span className="ml-1 text-base font-medium text-[var(--color-bark)]/70">
              {distanceUnit}
            </span>
          </p>
          <MiniProgress
            label="Distance"
            current={displayTotalDistance}
            target={displayGoalDistance}
            unit={distanceUnit}
            decimal
          />
        </article>
      </div>

      {stats.total_walks_week > 0 ? (
        <p className="text-sm text-[var(--color-bark)]/75">{summary}</p>
      ) : null}
    </section>
  );
}
