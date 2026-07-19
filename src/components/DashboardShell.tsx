import { useMemo, useState } from "react";
import { useAppStore } from "../store/appStore";
import { buildDistanceSeries } from "../lib/stats";
import type { Walk } from "../types";
import { DogProfileForm } from "./DogProfileForm";
import { StatsPanel } from "./StatsPanel";
import { WalkChart } from "./WalkChart";
import { WalkForm } from "./WalkForm";

export function DashboardShell() {
  const {
    ready,
    error,
    dogs,
    walks,
    selectedDogId,
    stats,
    selectDog,
    startCreateDog,
    addDog,
    updateDog,
    addWalk,
    updateWalk,
    removeWalk,
  } = useAppStore();

  const [status, setStatus] = useState<string | null>(null);
  const [editingWalk, setEditingWalk] = useState<Walk | null>(null);

  const selectedDog =
    selectedDogId != null
      ? (dogs.find((d) => d.id === selectedDogId) ?? null)
      : null;

  const chartData = useMemo(() => buildDistanceSeries(walks, 14), [walks]);

  if (error) {
    return (
      <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center p-8">
        <div className="rounded-xl border border-red-200 bg-white/80 p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-800">Database error</h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center text-[var(--color-moss)]">
        Loading local database…
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-8 p-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-moss)]">
          Dog Walk Tracker
        </p>
        <h1 className="text-3xl font-semibold text-[var(--color-soil)]">
          Today&apos;s trail
        </h1>
        <p className="max-w-xl text-[var(--color-bark)]/80">
          Local-first walk logging. Your data stays on this machine — nothing is
          sent to external servers.
        </p>
        {status && (
          <p className="text-sm text-[var(--color-moss)]" role="status">
            {status}
          </p>
        )}
      </header>

      <StatsPanel stats={stats} dogName={selectedDog?.name ?? null} />

      <section className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-[var(--color-trail)]/40">
        <h2 className="mb-3 text-lg font-medium text-[var(--color-soil)]">
          Distance (last 14 days)
        </h2>
        <WalkChart data={chartData} />
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <DogProfileForm
          dogs={dogs}
          selectedDog={selectedDog}
          onSelect={(id) => {
            selectDog(id);
            setEditingWalk(null);
          }}
          onStartCreate={() => {
            startCreateDog();
            setEditingWalk(null);
          }}
          onAdd={async (values) => {
            await addDog(values);
          }}
          onUpdate={async (values) => {
            await updateDog(values);
          }}
          onStatus={setStatus}
        />

        <WalkForm
          dogId={selectedDogId}
          editing={editingWalk}
          onCreate={async (values) => {
            await addWalk(values);
          }}
          onUpdate={async (values) => {
            await updateWalk(values);
          }}
          onCancelEdit={() => setEditingWalk(null)}
          onStatus={setStatus}
        />
      </section>

      <section className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-[var(--color-trail)]/40">
        <h2 className="mb-3 text-lg font-medium text-[var(--color-soil)]">
          Walk history
        </h2>
        {walks.length === 0 ? (
          <p className="text-sm text-[var(--color-bark)]/60">No walks yet</p>
        ) : (
          <ul className="divide-y divide-[var(--color-trail)]/30">
            {walks.map((walk) => (
              <li
                key={walk.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-[var(--color-soil)]">
                    {walk.date}
                  </p>
                  <p className="text-[var(--color-bark)]/70">
                    {walk.duration_minutes ?? "—"} min · {walk.distance_km} km
                    {walk.notes ? ` · ${walk.notes}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingWalk(walk)}
                    className="rounded-lg px-3 py-1.5 text-[var(--color-moss)] hover:bg-[var(--color-mist)]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void removeWalk(walk.id);
                      if (editingWalk?.id === walk.id) setEditingWalk(null);
                      setStatus("Walk deleted");
                    }}
                    className="rounded-lg px-3 py-1.5 text-[var(--color-soil)] hover:bg-red-50 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
