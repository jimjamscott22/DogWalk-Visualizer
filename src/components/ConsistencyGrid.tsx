import type { ConsistencyDay, ConsistencyWeek } from "../lib/stats";
import { distanceUnitLabel, toDisplayDistance, type UnitSystem } from "../lib/units";

interface ConsistencyGridProps {
  weeks: ConsistencyWeek[];
  goalActive: boolean;
  unitSystem?: UnitSystem;
}

const ROW_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

function formatDayLabel(date: string): string {
  const [, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(2000, m - 1, d)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function cellClass(day: ConsistencyDay, goalMet: boolean): string {
  if (day.isFuture) return "bg-transparent";
  if (!day.walked) return "bg-[var(--color-mist)]";
  return goalMet ? "bg-[var(--color-moss)]" : "bg-[var(--color-leaf)]/55";
}

function cellTitle(day: ConsistencyDay, unitSystem: UnitSystem): string {
  if (day.isFuture) return "";
  const label = formatDayLabel(day.date);
  if (!day.walked) return `${label}: no walk`;
  const distance = toDisplayDistance(day.distance_km, unitSystem);
  return `${label}: walked · ${distance.toFixed(1)} ${distanceUnitLabel(unitSystem)}`;
}

export function ConsistencyGrid({
  weeks,
  goalActive,
  unitSystem = "us",
}: ConsistencyGridProps) {
  const pastWeeks = weeks.filter((w) => !w.days.every((d) => d.isFuture));
  const weeksMet = weeks.filter((w) => w.goalMet).length;

  const subtitle = goalActive
    ? `${weeksMet} of ${pastWeeks.length} weeks hit your goal`
    : "Set a weekly goal below to start tracking hits";

  return (
    <section
      className="rounded-2xl bg-[var(--color-panel)] p-4 shadow-sm ring-1 ring-[var(--color-trail)]/40 sm:p-5"
      aria-label="Weekly consistency"
    >
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-medium text-[var(--color-soil)]">
          Consistency
        </h2>
        <p className="text-sm text-[var(--color-bark)]/70">{subtitle}</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className="flex shrink-0 flex-col justify-between gap-[3px] pt-0 text-right text-[10px] leading-none text-[var(--color-bark)]/50">
          {ROW_LABELS.map((label, i) => (
            <span key={i} className="flex h-3.5 items-center">
              {label}
            </span>
          ))}
        </div>

        <div className="flex gap-[3px]">
          {weeks.map((week) => (
            <div key={week.weekStart} className="flex flex-col gap-[3px]">
              {week.days.map((day) => (
                <span
                  key={day.date}
                  title={cellTitle(day, unitSystem)}
                  aria-hidden={day.isFuture}
                  className={`h-3.5 w-3.5 rounded-[3px] transition-colors ${cellClass(
                    day,
                    week.goalMet,
                  )} ${
                    day.isToday
                      ? "ring-1 ring-[var(--color-soil)] ring-offset-1 ring-offset-[var(--color-panel)]"
                      : ""
                  }`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-bark)]/60">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-[var(--color-mist)]" />
          No walk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-[var(--color-leaf)]/55" />
          Walked
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] bg-[var(--color-moss)]" />
          Goal met
        </span>
      </div>
    </section>
  );
}
