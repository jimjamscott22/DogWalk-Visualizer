# US units (miles / lbs) — design

## Goal

Let users view and enter distance and weight in US units (miles, lbs) instead of metric (km, kg), as a toggleable preference in Settings, defaulting to US.

## Non-goals

- No change to how duration is measured (minutes, same in both systems).
- No per-dog or per-user (DB-backed) unit preference — this is a single, app-wide, device-local preference, same scope as the existing dark/light theme setting.
- No historical unit indicator on old data — all stored data is metric internally regardless of display preference, so there's nothing to migrate or label.

## Approach

Convert only at the display layer. The SQLite schema, TypeScript types (`Dog.weight_kg`, `Walk.distance_km`, `Goal.target_distance_weekly`, etc.), `src/lib/db.ts`, `src/store/appStore.ts`, and `src/lib/stats.ts` are unchanged and continue to store/compute exclusively in metric. A new `src/lib/units.ts` module converts values to/from the display unit at the UI boundary (form inputs and rendered numbers) based on a small localStorage-backed preference, following the same pattern `src/lib/theme.ts` already uses for dark/light mode.

**Alternative considered and rejected:** storing whichever unit the user picks as the canonical DB value. This would require a schema migration, changes to the Rust migration safety test, and re-conversion of stored values (with compounding rounding error) on every toggle. It also conflicts with `stats.ts`'s existing contract as a pure, tested, metric-only computation layer (per `CLAUDE.md`). Rejected in favor of the display-layer approach, which requires zero schema or `stats.ts` changes.

## `src/lib/units.ts` (new)

```ts
export type UnitSystem = "us" | "metric";

const STORAGE_KEY = "dogwalk-units";

export function getStoredUnitSystem(): UnitSystem; // defaults to "us"
export function setStoredUnitSystem(system: UnitSystem): void;

export function kmToMiles(km: number): number;
export function milesToKm(mi: number): number;
export function kgToLbs(kg: number): number;
export function lbsToKg(lb: number): number;

export function distanceUnitLabel(system: UnitSystem): "mi" | "km";
export function weightUnitLabel(system: UnitSystem): "lb" | "kg";

export function toDisplayDistance(km: number, system: UnitSystem): number;
export function toStorageDistance(value: number, system: UnitSystem): number; // -> km
export function toDisplayWeight(kg: number, system: UnitSystem): number;
export function toStorageWeight(value: number, system: UnitSystem): number; // -> kg
```

Conversion constants: `KM_PER_MILE = 1.609344`, `KG_PER_LB = 0.45359237`.

## Component changes

- **`DashboardShell.tsx`**: owns `unitSystem` state, initialized from `getStoredUnitSystem()` on mount. Passes `unitSystem` down as a prop to `StatsPanel`, `WalkChart`, `WalkForm`, `DogProfileForm`, `HealthInsights`, and passes `unitSystem` + a setter into `SettingsPanel`.
- **`SettingsPanel.tsx`**: adds a unit-toggle button alongside the existing theme toggle ("Use metric units" / "Use US units"), calling `setStoredUnitSystem` and the setter passed from `DashboardShell`.
- **`WalkForm.tsx`**: accepts `unitSystem`. When populating the form for an existing walk, converts `editing.distance_km` to the display unit via `toDisplayDistance`. On submit, converts the entered value back to km via `toStorageDistance` before calling `onCreate`/`onUpdate` (which still receive km, unchanged). Label switches between "Distance (mi)" and "Distance (km)".
- **`DogProfileForm.tsx`**: same pattern for `weight_kg` — accepts `unitSystem`, converts for display/submit via `toDisplayWeight`/`toStorageWeight`. Label switches between "Weight (lb)" and "Weight (kg)".
- **`StatsPanel.tsx`**: accepts `unitSystem`. Converts `stats.total_distance_week` and the distance goal target for display; unit label switches between "mi" and "km".
- **`WalkChart.tsx`**: accepts `unitSystem`. Converts each `DaySeriesPoint.distance_km` to the display unit before rendering; Y-axis unit and tooltip formatter switch between "mi" and "km".
- **`HealthInsights.tsx`**: accepts `unitSystem`. Converts the target-distance goal field the same way as `WalkForm`. `buildHealthInsight`'s `summary` string (built in `stats.ts`) is metric-only text and is not printed verbatim; instead `HealthInsights` builds its own display string from the insight's raw numeric fields (`avg_distance_week`, `km_per_kg`, `walks_progress`, `distance_progress`), converting each via `units.ts`. `stats.ts` and its existing tests are unchanged.

## Testing

- New `src/lib/units.test.ts`: round-trip conversion accuracy, correct unit labels per system.
- `src/lib/stats.test.ts`: unchanged, no changes to `stats.ts`.
- `src/components/ui.smoke.test.tsx`: extend to assert the expected unit label renders under each `unitSystem` setting. Confirmed no existing assertions hardcode "km"/"kg" text, so nothing existing breaks.
- Rust tests / migration: no changes, since there is no schema change.

## Default and persistence

Preference defaults to `"us"` for all installs (new and existing — there is no prior stored value). Persisted to `localStorage` under `dogwalk-units`, read once at `DashboardShell` mount, same lifecycle as the theme preference.
