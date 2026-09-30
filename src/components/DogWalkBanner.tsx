interface DogWalkBannerProps {
  compact?: boolean;
}

export function DogWalkBanner({ compact = false }: DogWalkBannerProps) {
  return (
    <figure
      className={`dog-walk-banner overflow-hidden rounded-2xl shadow-sm ring-1 ring-[var(--color-trail)]/40 ${
        compact ? "h-32 sm:h-40" : "h-44 sm:h-56"
      }`}
    >
      <img
        src="/dogs-walking-neighborhood.png"
        alt="Dozer the dog and Ziggy the kitten together on a neighborhood path at sunset"
        className="dog-walk-banner-image h-full w-full object-cover object-[30%_20%]"
        decoding="async"
      />
    </figure>
  );
}
