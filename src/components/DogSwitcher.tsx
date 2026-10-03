import type { Dog } from "../types";
import { DogAvatar } from "./DogAvatar";

interface DogSwitcherProps {
  dogs: Dog[];
  selectedId: number | null;
  isCreating: boolean;
  onSelect: (id: number) => void;
  onStartCreate: () => void;
}

export function DogSwitcher({
  dogs,
  selectedId,
  isCreating,
  onSelect,
  onStartCreate,
}: DogSwitcherProps) {
  return (
    <nav aria-label="Dogs" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {dogs.map((dog) => {
        const selected = !isCreating && selectedId === dog.id;
        return (
          <button
            key={dog.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(dog.id)}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${
              selected
                ? "bg-[var(--color-moss)] text-white"
                : "bg-[var(--color-mist)] text-[var(--color-soil)] hover:bg-[var(--color-trail)]/30"
            }`}
          >
            <DogAvatar
              photo={dog.photo}
              name={dog.name}
              sizeClass="h-5 w-5 text-[10px]"
              decorative
            />
            {dog.name}
          </button>
        );
      })}
      <button
        type="button"
        aria-pressed={isCreating}
        onClick={onStartCreate}
        className={`shrink-0 rounded-lg px-3 py-1.5 text-sm ${
          isCreating
            ? "bg-[var(--color-moss)] text-white"
            : "text-[var(--color-moss)] underline-offset-2 hover:underline"
        }`}
      >
        + New dog
      </button>
    </nav>
  );
}
