import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { buildHealthInsight } from "../lib/stats";
import type { DailyStats, Goal } from "../types";

interface GoalFormValues {
  target_walks_per_week: string;
  target_distance_weekly: string;
}

interface HealthInsightsProps {
  dogId: number | null;
  dogName: string | null;
  weightKg: number | null;
  goal: Goal | null;
  stats: DailyStats;
  onSave: (input: {
    dog_id: number;
    target_distance_weekly?: number | null;
    target_walks_per_week?: number | null;
  }) => Promise<void>;
  onStatus: (message: string) => void;
}

function parseOptionalPositive(raw: string): number | null | undefined {
  if (!raw.trim()) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

export function HealthInsights({
  dogId,
  dogName,
  weightKg,
  goal,
  stats,
  onSave,
  onStatus,
}: HealthInsightsProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormValues>({
    defaultValues: {
      target_walks_per_week: "",
      target_distance_weekly: "",
    },
  });

  useEffect(() => {
    reset({
      target_walks_per_week:
        goal?.target_walks_per_week != null
          ? String(goal.target_walks_per_week)
          : "",
      target_distance_weekly:
        goal?.target_distance_weekly != null
          ? String(goal.target_distance_weekly)
          : "",
    });
  }, [goal, reset]);

  const insight = buildHealthInsight(stats, goal, weightKg);

  const onSubmit = handleSubmit(async (values) => {
    if (dogId == null) {
      onStatus("Select a dog first");
      return;
    }
    const walks = parseOptionalPositive(values.target_walks_per_week);
    const distance = parseOptionalPositive(values.target_distance_weekly);
    if (walks === undefined || distance === undefined) {
      onStatus("Goals must be blank or greater than 0");
      return;
    }
    await onSave({
      dog_id: dogId,
      target_walks_per_week: walks,
      target_distance_weekly: distance,
    });
    onStatus("Weekly goals saved");
  });

  if (dogId == null) {
    return (
      <section className="rounded-2xl bg-[var(--color-panel)] p-4 shadow-sm ring-1 ring-[var(--color-trail)]/40 sm:p-5">
        <h2 className="text-lg font-medium text-[var(--color-soil)]">
          Weekly goals
        </h2>
        <p className="mt-2 text-sm text-[var(--color-bark)]/60">
          Select a dog to set weekly targets.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl bg-[var(--color-panel)] p-4 shadow-sm ring-1 ring-[var(--color-trail)]/40 sm:p-5">
      <div>
        <h2 className="text-lg font-medium text-[var(--color-soil)]">
          Weekly goals
          {dogName ? (
            <span className="ml-2 text-sm font-normal text-[var(--color-bark)]/60">
              {dogName}
            </span>
          ) : null}
        </h2>
        <p className="mt-1 text-sm text-[var(--color-bark)]/70">
          Targets feed the weekly progress bars above.
          {insight.km_per_kg != null
            ? ` Currently ~${insight.km_per_kg.toFixed(3)} km per kg.`
            : weightKg == null
              ? " Add weight on the dog profile for km-per-kg insight."
              : ""}
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 min-[480px]:grid-cols-2">
        <label className="block text-sm">
          Target walks / week
          <input
            type="number"
            min={1}
            step={1}
            className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-[var(--color-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
            {...register("target_walks_per_week", {
              validate: (v) => {
                if (!v.trim()) return true;
                const n = Number(v);
                return (
                  (Number.isFinite(n) && n > 0) || "Must be greater than 0"
                );
              },
            })}
            placeholder="e.g. 5"
          />
          {errors.target_walks_per_week && (
            <span className="mt-1 block text-xs text-red-700">
              {errors.target_walks_per_week.message}
            </span>
          )}
        </label>
        <label className="block text-sm">
          Target distance km / week
          <input
            type="number"
            min={0.1}
            step={0.1}
            className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-[var(--color-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
            {...register("target_distance_weekly", {
              validate: (v) => {
                if (!v.trim()) return true;
                const n = Number(v);
                return (
                  (Number.isFinite(n) && n > 0) || "Must be greater than 0"
                );
              },
            })}
            placeholder="e.g. 10"
          />
          {errors.target_distance_weekly && (
            <span className="mt-1 block text-xs text-red-700">
              {errors.target_distance_weekly.message}
            </span>
          )}
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-[var(--color-moss)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-leaf)] disabled:opacity-60 min-[480px]:col-span-2"
        >
          Save weekly goals
        </button>
      </form>
    </section>
  );
}
