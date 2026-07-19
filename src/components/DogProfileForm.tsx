import { useEffect } from "react";
import { useForm } from "react-hook-form";
import type { Dog } from "../types";

export interface DogFormValues {
  name: string;
  breed: string;
  weight_kg: string;
}

interface DogProfileFormProps {
  selectedDog: Dog | null;
  onAdd: (values: { name: string; breed?: string; weight_kg?: number }) => Promise<void>;
  onUpdate: (values: {
    id: number;
    name: string;
    breed?: string;
    weight_kg?: number;
  }) => Promise<void>;
  onSelect: (id: number) => void;
  onStartCreate: () => void;
  dogs: Dog[];
  onStatus: (message: string) => void;
}

function parseOptionalWeight(raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function DogProfileForm({
  selectedDog,
  onAdd,
  onUpdate,
  onSelect,
  onStartCreate,
  dogs,
  onStatus,
}: DogProfileFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DogFormValues>({
    defaultValues: { name: "", breed: "", weight_kg: "" },
  });

  useEffect(() => {
    if (selectedDog) {
      reset({
        name: selectedDog.name,
        breed: selectedDog.breed ?? "",
        weight_kg:
          selectedDog.weight_kg != null ? String(selectedDog.weight_kg) : "",
      });
    } else {
      reset({ name: "", breed: "", weight_kg: "" });
    }
  }, [selectedDog, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      name: values.name.trim(),
      breed: values.breed.trim() || undefined,
      weight_kg: parseOptionalWeight(values.weight_kg),
    };
    if (selectedDog) {
      await onUpdate({ id: selectedDog.id, ...payload });
      onStatus("Dog profile updated");
    } else {
      await onAdd(payload);
      onStatus("Dog added");
      reset({ name: "", breed: "", weight_kg: "" });
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-2xl bg-[var(--color-panel)] p-5 shadow-sm ring-1 ring-[var(--color-trail)]/40"
    >
      <h2 className="text-lg font-medium text-[var(--color-soil)]">
        Dog profile
      </h2>

      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 text-sm">
        {dogs.map((dog) => (
          <li key={dog.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect(dog.id)}
              className={`rounded-lg px-3 py-1.5 ${
                selectedDog?.id === dog.id
                  ? "bg-[var(--color-moss)] text-white"
                  : "bg-[var(--color-mist)] text-[var(--color-soil)] hover:bg-[var(--color-trail)]/30"
              }`}
            >
              {dog.name}
            </button>
          </li>
        ))}
        <li className="shrink-0">
          <button
            type="button"
            onClick={onStartCreate}
            className="rounded-lg px-3 py-1.5 text-[var(--color-moss)] underline-offset-2 hover:underline"
          >
            + New
          </button>
        </li>
      </ul>

      <label className="block text-sm">
        Name
        <input
          className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-[var(--color-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
          {...register("name", {
            required: "Name is required",
            validate: (v) => v.trim().length > 0 || "Name is required",
          })}
        />
        {errors.name && (
          <span className="mt-1 block text-xs text-red-700">
            {errors.name.message}
          </span>
        )}
      </label>

      <label className="block text-sm">
        Breed (optional)
        <input
          className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-[var(--color-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
          {...register("breed")}
          placeholder="e.g. Labrador"
        />
      </label>

      <label className="block text-sm">
        Weight kg (optional)
        <input
          type="number"
          step={0.1}
          min={0}
          className="mt-1 w-full rounded-lg border border-[var(--color-trail)]/50 bg-[var(--color-input)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--color-leaf)]"
          {...register("weight_kg", {
            validate: (v) => {
              if (!v.trim()) return true;
              const n = Number(v);
              return (Number.isFinite(n) && n > 0) || "Weight must be greater than 0";
            },
          })}
        />
        {errors.weight_kg && (
          <span className="mt-1 block text-xs text-red-700">
            {errors.weight_kg.message}
          </span>
        )}
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-[var(--color-moss)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-leaf)] disabled:opacity-60"
      >
        {selectedDog ? "Save profile" : "Add dog"}
      </button>
    </form>
  );
}
