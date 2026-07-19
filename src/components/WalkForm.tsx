import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { todayIso } from "../lib/stats";
import type { Walk } from "../types";

export interface WalkFormValues {
  date: string;
  duration_minutes: string;
  distance_km: string;
  notes: string;
}

interface WalkFormProps {
  dogId: number | null;
  editing: Walk | null;
  onCreate: (values: {
    dog_id: number;
    date: string;
    duration_minutes?: number;
    distance_km: number;
    notes?: string;
  }) => Promise<void>;
  onUpdate: (values: {
    id: number;
    date: string;
    duration_minutes?: number;
    distance_km: number;
    notes?: string;
  }) => Promise<void>;
  onCancelEdit: () => void;
  onStatus: (message: string) => void;
}

export function WalkForm({
  dogId,
  editing,
  onCreate,
  onUpdate,
  onCancelEdit,
  onStatus,
}: WalkFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WalkFormValues>({
    defaultValues: {
      date: todayIso(),
      duration_minutes: "30",
      distance_km: "1.0",
      notes: "",
    },
  });

  useEffect(() => {
    if (editing) {
      reset({
        date: editing.date,
        duration_minutes:
          editing.duration_minutes != null
            ? String(editing.duration_minutes)
            : "",
        distance_km: String(editing.distance_km),
        notes: editing.notes ?? "",
      });
    } else {
      reset({
        date: todayIso(),
        duration_minutes: "30",
        distance_km: "1.0",
        notes: "",
      });
    }
  }, [editing, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (dogId == null) {
      onStatus("Add a dog first");
      return;
    }

    const distance_km = Number(values.distance_km);
    const durationRaw = values.duration_minutes.trim();
    const duration_minutes = durationRaw
      ? Number(durationRaw)
      : undefined;
    const notes = values.notes.trim() || undefined;

    if (editing) {
      await onUpdate({
        id: editing.id,
        date: values.date,
        duration_minutes,
        distance_km,
        notes,
      });
      onStatus("Walk updated");
      onCancelEdit();
    } else {
      await onCreate({
        dog_id: dogId,
        date: values.date,
        duration_minutes,
        distance_km,
        notes,
      });
      onStatus("Walk logged");
      reset({
        date: todayIso(),
        duration_minutes: "30",
        distance_km: "1.0",
        notes: "",
      });
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-[var(--color-trail)]/40"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium text-[var(--color-soil)]">
          {editing ? "Edit walk" : "Add walk"}
        </h2>
        {editing && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="text-sm text-[var(--color-moss)] hover:underline"
          >
            Cancel
          </button>
        )}
      </div>

      <label className="block text-sm">
        Date
        <input
          type="date"
          className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
          {...register("date", { required: "Date is required" })}
        />
        {errors.date && (
          <span className="mt-1 block text-xs text-red-700">
            {errors.date.message}
          </span>
        )}
      </label>

      <label className="block text-sm">
        Duration (minutes)
        <input
          type="number"
          min={1}
          className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
          {...register("duration_minutes", {
            validate: (v) => {
              if (!v.trim()) return true;
              const n = Number(v);
              return (
                (Number.isFinite(n) && n > 0) ||
                "Duration must be greater than 0"
              );
            },
          })}
        />
        {errors.duration_minutes && (
          <span className="mt-1 block text-xs text-red-700">
            {errors.duration_minutes.message}
          </span>
        )}
      </label>

      <label className="block text-sm">
        Distance (km)
        <input
          type="number"
          min={0.1}
          step={0.1}
          className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
          {...register("distance_km", {
            required: "Distance is required",
            validate: (v) => {
              const n = Number(v);
              return (
                (Number.isFinite(n) && n > 0) ||
                "Distance must be greater than 0"
              );
            },
          })}
        />
        {errors.distance_km && (
          <span className="mt-1 block text-xs text-red-700">
            {errors.distance_km.message}
          </span>
        )}
      </label>

      <label className="block text-sm">
        Notes
        <input
          className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
          {...register("notes")}
          placeholder="Optional"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting || dogId == null}
        className="w-full rounded-lg bg-[var(--color-soil)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      >
        {editing ? "Save changes" : "Log walk"}
      </button>
    </form>
  );
}
