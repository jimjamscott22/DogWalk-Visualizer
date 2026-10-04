import { useEffect, useLayoutEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { todayIso } from "../lib/stats";
import type { Walk } from "../types";
import { toDisplayDistance, toStorageDistance, distanceUnitLabel, type UnitSystem } from "../lib/units";

export interface WalkFormValues {
  date: string;
  start_time: string;
  duration_minutes: string;
  distance_km: string;
  notes: string;
}

interface WalkFormProps {
  dogId: number | null;
  editing: Walk | null;
  unitSystem?: UnitSystem;
  onCreate: (values: {
    dog_id: number;
    date: string;
    start_time?: string;
    duration_minutes?: number;
    distance_km: number;
    notes?: string;
  }) => Promise<void>;
  onUpdate: (values: {
    id: number;
    date: string;
    start_time?: string;
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
  unitSystem = "us",
  onCreate,
  onUpdate,
  onCancelEdit,
  onStatus,
}: WalkFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WalkFormValues>({
    defaultValues: {
      date: todayIso(),
      start_time: "",
      duration_minutes: "30",
      distance_km: "1.0",
      notes: "",
    },
  });

  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const notesRegistration = register("notes");
  const notes = watch("notes");

  const resizeNotes = () => {
    const textarea = notesRef.current;
    if (!textarea) return;
    // Reset to the two-row baseline so deleting text also shrinks the field.
    textarea.style.height = "auto";
    const borderHeight = textarea.offsetHeight - textarea.clientHeight;
    textarea.style.height = String(Math.max(
      textarea.offsetHeight,
      textarea.scrollHeight + borderHeight,
    )) + "px";
  };

  useLayoutEffect(() => {
    resizeNotes();
  }, [notes]);

  useEffect(() => {
    window.addEventListener("resize", resizeNotes);
    return () => window.removeEventListener("resize", resizeNotes);
  }, []);
  useEffect(() => {
    if (editing) {
      reset({
        date: editing.date,
        start_time: editing.start_time ?? "",
        duration_minutes:
          editing.duration_minutes != null
            ? String(editing.duration_minutes)
            : "",
        distance_km: toDisplayDistance(editing.distance_km, unitSystem).toFixed(1),
        notes: editing.notes ?? "",
      });
    } else {
      reset({
        date: todayIso(),
        start_time: "",
        duration_minutes: "30",
        distance_km: "1.0",
        notes: "",
      });
    }
  }, [editing, unitSystem, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (dogId == null) {
      onStatus("Add a dog first");
      return;
    }

    const distance_km = toStorageDistance(Number(values.distance_km), unitSystem);
    const start_time = values.start_time.trim() || undefined;
    const durationRaw = values.duration_minutes.trim();
    const duration_minutes = durationRaw
      ? Number(durationRaw)
      : undefined;
    const notes = values.notes.trim() || undefined;

    try {
      if (editing) {
        await onUpdate({
          id: editing.id,
          date: values.date,
          start_time,
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
          start_time,
          duration_minutes,
          distance_km,
          notes,
        });
        onStatus("Walk logged");
        reset({
          date: todayIso(),
          start_time: "",
          duration_minutes: "30",
          distance_km: "1.0",
          notes: "",
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isDuplicateDate =
        /UNIQUE constraint failed/i.test(message) && /walks/i.test(message);
      onStatus(
        isDuplicateDate
          ? "This dog already has a walk logged on that date"
          : `Could not save walk: ${message}`,
      );
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-2xl bg-[var(--color-panel)] p-5 shadow-sm ring-1 ring-[var(--color-trail)]/40"
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
          className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-[var(--color-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
          {...register("date", { required: "Date is required" })}
        />
        {errors.date && (
          <span className="mt-1 block text-xs text-[var(--color-danger)]">
            {errors.date.message}
          </span>
        )}
      </label>

      <label className="block text-sm">
        Start time
        <input
          type="time"
          className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-[var(--color-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
          {...register("start_time")}
        />
      </label>

      <label className="block text-sm">
        Duration (minutes)
        <input
          type="number"
          min={1}
          className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-[var(--color-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
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
          <span className="mt-1 block text-xs text-[var(--color-danger)]">
            {errors.duration_minutes.message}
          </span>
        )}
      </label>

      <label className="block text-sm">
        Distance ({distanceUnitLabel(unitSystem)})
        <input
          type="number"
          min={0.1}
          step={0.1}
          className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-[var(--color-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
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
          <span className="mt-1 block text-xs text-[var(--color-danger)]">
            {errors.distance_km.message}
          </span>
        )}
      </label>

      <label className="block text-sm">
        Notes
        <textarea
          rows={2}
          className="mt-1 w-full resize-none overflow-hidden rounded-lg border border-[var(--color-trail)]/50 bg-[var(--color-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
          {...notesRegistration}
          ref={(element) => {
            notesRegistration.ref(element);
            notesRef.current = element;
          }}
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
