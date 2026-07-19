import { useMemo, useState } from "react";
import { useAppStore } from "../store/appStore";
import { buildDistanceSeries } from "../lib/stats";
import type { Walk } from "../types";
import { DogProfileForm } from "./DogProfileForm";
import { HealthInsights } from "./HealthInsights";
import { SettingsPanel } from "./SettingsPanel";
import { StatsPanel } from "./StatsPanel";
import { WalkChart } from "./WalkChart";
import { WalkForm } from "./WalkForm";

export function DashboardShell() {
  const {
    ready,
    error,
    dogs,
    walks,
    goal,
    selectedDogId,
    isCreatingDog,
    stats,
    selectDog,
    startCreateDog,
    addDog,
    updateDog,
    addWalk,
    updateWalk,
    removeWalk,
    saveGoal,
    clearAllData,
  } = useAppStore();

  const [status, setStatus] = useState<string | null>(null);
  const [editingWalk, setEditingWalk] = useState<Walk | null>(null);

  const selectedDog =
    selectedDogId != null
      ? (dogs.find((d) => d.id === selectedDogId) ?? null)
      : null;

  const chartData = useMemo(() => buildDistanceSeries(walks, 14), [walks]);
  const needsOnboarding = ready && dogs.length === 0;

  if (error) {
    return (
      <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center p-6 sm:p-8">
        <div className="rounded-xl border border-red-200 bg-[var(--color-panel)] p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-red-800">Database error</h1>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <p className="mt-3 text-sm text-[var(--color-bark)]/70">
            Try restarting the app. If this persists, use Clear all data from
            Settings after the database loads, or reinstall while keeping a JSON
            backup if you have one.
          </p>
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

  if (needsOnboarding) {
    return (
      <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center gap-6 p-6 sm:p-8">
        <header className="space-y-2 text-center sm:text-left">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-moss)]">
            Dog Walk Tracker
          </p>
          <h1 className="text-3xl font-semibold text-[var(--color-soil)]">
            Meet your pack
          </h1>
          <p className="text-[var(--color-bark)]/80">
            Add your first dog to start logging walks. Everything stays on this
            computer — no accounts, no cloud.
          </p>
          {status && (
            <p className="text-sm text-[var(--color-moss)]" role="status">
              {status}
            </p>
          )}
        </header>
        <DogProfileForm
          dogs={dogs}
          selectedDog={null}
          onSelect={selectDog}
          onStartCreate={startCreateDog}
          onAdd={async (values) => {
            await addDog(values);
          }}
          onUpdate={async (values) => {
            await updateDog(values);
          }}
          onStatus={setStatus}
        />
        <SettingsPanel onClearAll={clearAllData} onStatus={setStatus} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-full max-w-5xl flex-col gap-6 p-4 sm:gap-8 sm:p-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-moss)]">
          Dog Walk Tracker
        </p>
        <h1 className="text-2xl font-semibold text-[var(--color-soil)] sm:text-3xl">
          Today&apos;s trail
        </h1>
        <p className="max-w-xl text-sm text-[var(--color-bark)]/80 sm:text-base">
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

      <HealthInsights
        dogId={selectedDogId}
        dogName={selectedDog?.name ?? null}
        weightKg={selectedDog?.weight_kg ?? null}
        goal={goal}
        stats={stats}
        onSave={saveGoal}
        onStatus={setStatus}
      />

      <section className="rounded-2xl bg-[var(--color-panel)] p-4 shadow-sm ring-1 ring-[var(--color-trail)]/40 sm:p-5">
        <h2 className="mb-3 text-lg font-medium text-[var(--color-soil)]">
          Distance (last 14 days)
        </h2>
        {walks.length === 0 ? (
          <div className="rounded-xl bg-[var(--color-mist)]/60 px-4 py-8 text-center">
            <p className="font-medium text-[var(--color-soil)]">No walks yet</p>
            <p className="mt-1 text-sm text-[var(--color-bark)]/70">
              Log your first walk below to start the streak and chart.
            </p>
          </div>
        ) : (
          <WalkChart data={chartData} />
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <DogProfileForm
          dogs={dogs}
          selectedDog={isCreatingDog ? null : selectedDog}
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

      <section className="rounded-2xl bg-[var(--color-panel)] p-4 shadow-sm ring-1 ring-[var(--color-trail)]/40 sm:p-5">
        <h2 className="mb-3 text-lg font-medium text-[var(--color-soil)]">
          Walk history
        </h2>
        {walks.length === 0 ? (
          <div className="rounded-xl bg-[var(--color-mist)]/60 px-4 py-8 text-center">
            <p className="font-medium text-[var(--color-soil)]">
              Trail is empty
            </p>
            <p className="mt-1 text-sm text-[var(--color-bark)]/70">
              Use Add walk to record today&apos;s outing for{" "}
              {selectedDog?.name ?? "your dog"}.
            </p>
          </div>
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

      <SettingsPanel onClearAll={clearAllData} onStatus={setStatus} />
    </div>
  );
}
