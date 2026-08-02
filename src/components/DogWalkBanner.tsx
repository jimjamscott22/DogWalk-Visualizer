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
        alt="Two dogs walking together down a quiet, tree-lined neighborhood street"
        className="dog-walk-banner-image h-full w-full object-cover object-[center_62%]"
        decoding="async"
      />
    </figure>
  );
}
