interface DogAvatarProps {
  photo: string | null;
  name: string;
  sizeClass: string;
  /** Hide from assistive tech when the dog's name is already announced next to it. */
  decorative?: boolean;
}

export function DogAvatar({ photo, name, sizeClass, decorative = false }: DogAvatarProps) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={decorative ? "" : `${name} profile photo`}
        className={`${sizeClass} shrink-0 rounded-full object-cover`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-[var(--color-trail)]/40 font-medium uppercase text-[var(--color-soil)]`}
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}
