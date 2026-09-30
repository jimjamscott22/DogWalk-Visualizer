export function DogWalkBanner() {
  return (
    <figure
      className="dog-walk-banner overflow-hidden rounded-2xl shadow-sm ring-1 ring-[var(--color-trail)]/40"
    >
      <img
        src="/dogs-walking-neighborhood.png"
        alt="Dozer the dog and Ziggy the kitten together on a neighborhood path at sunset"
        className="dog-walk-banner-image block h-auto w-full"
        width={2172}
        height={724}
        decoding="async"
      />
    </figure>
  );
}
