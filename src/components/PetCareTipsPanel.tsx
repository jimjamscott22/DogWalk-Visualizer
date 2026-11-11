import { useId, useState, type MouseEvent } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { petCareResources, petCareTips, type PetSpecies } from "../lib/petCareTips";

const linkClass = "rounded text-sm font-medium text-[var(--color-moss)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-leaf)]";

export function PetCareTipsPanel() {
  const [species, setSpecies] = useState<PetSpecies>("dog");
  const [expanded, setExpanded] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const id = useId();
  const tips = petCareTips.filter((tip) => tip.species === species);
  const resources = Object.values(petCareResources).filter((resource) => resource.species === species);

  async function handleLink(event: MouseEvent<HTMLAnchorElement>, url: string) {
    // Standard links work in the browser preview; native builds use the scoped opener.
    if (!isTauri()) return;
    event.preventDefault();
    setLinkError(null);
    try {
      await openUrl(url);
    } catch {
      setLinkError(`Could not open your browser. Copy this address into your browser: ${url}`);
    }
  }

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-2xl bg-[var(--color-panel)] p-4 shadow-sm ring-1 ring-[var(--color-trail)]/40 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={`${id}-title`} className="text-lg font-medium text-[var(--color-soil)]">Pet care &amp; exercise</h2>
          <p className="mt-1 text-sm text-[var(--color-bark)]/80">Small ideas for a happy, active companion.</p>
        </div>
        <div role="group" aria-label="Pet care species" className="flex gap-1 rounded-xl bg-[var(--color-mist)] p-1">
          {(["dog", "cat"] as const).map((value) => (
            <button key={value} type="button" aria-pressed={species === value}
              onClick={() => { setSpecies(value); setExpanded(false); setLinkError(null); }}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${species === value ? "bg-[var(--color-moss)] text-[var(--color-input)] shadow-sm" : "text-[var(--color-bark)] hover:bg-[var(--color-panel)]"}`}>
              {value === "dog" ? "Dogs" : "Cats"}
            </button>
          ))}
        </div>
      </div>

      <ul id={`${id}-tips`} className="mt-4 grid gap-3 md:grid-cols-3">
        {(expanded ? tips : tips.slice(0, 3)).map((tip) => {
          const resource = petCareResources[tip.source];
          return (
            <li key={tip.id} className="flex flex-col items-start rounded-xl border border-[var(--color-trail)]/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-moss)]">{tip.category}</p>
              <h3 className="mt-2 font-medium text-[var(--color-soil)]">{tip.title}</h3>
              <p className="mb-3 mt-2 text-sm text-[var(--color-bark)]/80">{tip.text}</p>
              <a href={resource.url} target="_blank" rel="noopener noreferrer" className={`${linkClass} mt-auto`}
                aria-label={`Learn more about ${tip.title.toLowerCase()} at ${resource.publisher} (opens in browser)`}
                onClick={(event) => { void handleLink(event, resource.url); }}>
                Learn more <span aria-hidden="true">↗</span>
              </a>
            </li>
          );
        })}
      </ul>

      <button type="button" aria-expanded={expanded} aria-controls={`${id}-tips`}
        onClick={() => setExpanded((value) => !value)}
        className="mt-3 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-moss)] hover:bg-[var(--color-mist)]">
        {expanded ? "Show fewer tips" : "Show all tips"}
      </button>

      <div className="mt-4 border-t border-[var(--color-trail)]/30 pt-4">
        <h3 className="text-sm font-medium text-[var(--color-soil)]">Helpful websites</h3>
        <p className="mt-1 text-xs text-[var(--color-bark)]/70">Tips work offline. Website links open in your browser and need an internet connection.</p>
        <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-3">
          {resources.map((resource) => (
            <li key={resource.url}>
              <a href={resource.url} target="_blank" rel="noopener noreferrer" className={linkClass}
                aria-label={`${resource.publisher}: ${resource.title} (opens in browser)`}
                onClick={(event) => { void handleLink(event, resource.url); }}>
                {resource.publisher}: {resource.title} <span aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ul>
        {linkError && <p role="alert" className="mt-3 break-words text-sm text-[var(--color-danger)]">{linkError}</p>}
        <p className="mt-4 text-xs text-[var(--color-bark)]/70">General care guidance. Ask your veterinarian about your pet&apos;s individual needs.</p>
      </div>
    </section>
  );
}
