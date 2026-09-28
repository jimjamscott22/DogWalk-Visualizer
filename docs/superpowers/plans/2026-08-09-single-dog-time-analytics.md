# Single-Dog Walk Timing and Trends Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn DogWalk Visualizer into a one-dog app for Dozer that records multiple timed walks per day, captures an optional behavior rating, and visualizes 12-week timing and duration patterns with deterministic trend observations.

**Architecture:** Keep SQLite and the existing `dogs`/`walks`/`goals` relationships, but enforce one dog at the store and UI boundaries. Store local date and local start time separately, derive analytics with pure TypeScript functions, and render the resulting series through focused Recharts 3 components. Preserve the existing weekly-goal surface while adding a range-aware analytics panel below it.

**Tech Stack:** Tauri 2, Rust 2021, SQLite via `tauri-plugin-sql`, React 19, TypeScript 5.8, Zustand 5, React Hook Form 7, Recharts 3.9, Vitest 4, Testing Library, Tailwind CSS 4

## Global Constraints

- Keep the app local-only: add no network, HTTP, shell, remote-asset, account, or synchronization capability.
- Do not edit migration v1 or v2. Add a static, versioned v3 migration with no `DROP`, `DELETE`, `ATTACH`, or dynamic SQL.
- Preserve old walk rows by renaming the old table to `walks_legacy`; do not copy them into the active table.
- Before running the new build against the personal database, use the existing confirmed **Clear all data** action once so onboarding starts cleanly.
- Present exactly one editable dog profile and surface an error if storage contains more than one dog; do not silently choose or delete a profile.
- Retain `dog_id` in walks and goals for backup structure and a future service migration.
- Store `date` as `YYYY-MM-DD` and `start_time` as local `HH:MM`; do not add end time, UTC conversion, timezone metadata, or sync semantics.
- Require date, start time, positive whole-minute duration, and positive distance for every new or edited walk.
- Permit multiple walks per date; reject only an exact `(dog_id, date, start_time)` duplicate and never upsert it.
- Behavior is optional and restricted to `difficult`, `unsettled`, `good`, or `great`.
- Keep canonical distance storage and calculations in kilometers; convert only at the UI boundary through `src/lib/units.ts`.
- Analytics ranges are `4w`, `12w`, `1y`, and `all`; default to `12w`.
- Time periods are Morning `04:00–11:59`, Midday `12:00–15:59`, Evening `16:00–21:59`, and Night `22:00–03:59`.
- General observations require at least five walks; period comparisons require at least three walks in both equal-length periods.
- Use the current Recharts dependency; add no new npm package. Recharts 3 enables its accessibility layer by default, but keep an HTML text alternative for scatter details.
- Generated observations must be deterministic, local, non-medical, and omit unsupported claims for sparse data.
- MariaDB, API service, authentication, remote access, conflict resolution, GPS, behavior charts, and configurable period boundaries are out of scope.
- Preserve two-space indentation, double quotes, semicolons, parameterized `$1` SQL binds, existing CSS variables, and current responsive visual language.

## File Structure

### Create

- `src/lib/calendar.ts` — local calendar/date and `HH:MM` parsing helpers shared by statistics, forms, and analytics.
- `src/lib/calendar.test.ts` — date/time boundary tests.
- `src/lib/behavior.ts` — behavior options, labels, emoji, and runtime guard.
- `src/lib/behavior.test.ts` — enum/lookup validation.
- `src/lib/db.test.ts` — mocked SQL contract tests for timed create/update/list/export behavior.
- `src/components/BehaviorPicker.tsx` — accessible optional four-choice behavior control.
- `src/components/BehaviorPicker.test.tsx` — pointer/keyboard selection tests.
- `src/store/appStore.test.ts` — single-profile invariant and refresh tests.
- `src/lib/walkAnalytics.ts` — range, summary, rhythm, weekly-bucket, and observation calculations.
- `src/lib/walkAnalytics.test.ts` — deterministic analytics coverage.
- `src/components/WalkRhythmChart.tsx` — responsive time-of-day scatter visualization.
- `src/components/WeeklyPatternChart.tsx` — responsive stacked weekly visualization.
- `src/components/AnalyticsPanel.tsx` — range, tab, metric, summaries, and observation orchestration.
- `src/components/AnalyticsPanel.test.tsx` — control, empty-state, and data-flow tests.
- `src/components/WalkHistory.tsx` — independent timed-walk history list.
- `src/components/WalkHistory.test.tsx` — multiple same-day/edit/delete rendering tests.
- `src/components/DashboardShell.test.tsx` — final single-dog dashboard composition regression test.

### Modify

- `src-tauri/src/lib.rs` — migration v3 registration and safety/shape tests.
- `src/types/index.ts` — required timed-walk fields, behavior type, and input contracts.
- `src/lib/stats.ts` — consume shared calendar helpers while retaining current public statistics behavior.
- `src/lib/stats.test.ts` — timed `Walk` fixtures and shared-calendar imports.
- `src/lib/db.ts` — timed CRUD, runtime behavior validation, backup schema v2, legacy clearing, and ordered retrieval.
- `src/components/WalkForm.tsx` — required local start time/duration and optional behavior picker.
- `src/components/ui.smoke.test.tsx` — updated walk/profile contracts and focused regression assertions.
- `src/store/appStore.ts` — singular dog state and invariant.
- `src/components/DogProfileForm.tsx` — remove selector/create controls and support setup/edit modes.
- `src/components/DashboardShell.tsx` — single-dog flow, analytics panel, and extracted history.
- `docs/SECURITY.md` — v3 archival migration, backup schema, and unchanged capability posture.
- `docs/RELEASE_NOTES.md` — user-visible single-dog/timed-walk features and one-time clean-start instruction.

### Delete after replacement

- `src/components/WalkChart.tsx` — superseded by Walk Rhythm and Weekly Pattern.
- `src/components/WalkChart.test.tsx` — superseded by analytics and panel tests.

---

### Task 1: Add the non-destructive timed-walk schema

**Files:**
- Modify: `src-tauri/src/lib.rs:1-132`

**Interfaces:**
- Consumes: Existing `MIGRATION_V1_SQL`, `MIGRATION_V2_SQL`, `DB_URL`, and Tauri SQL migration registration.
- Produces: `MIGRATION_V3_SQL` and migration version `3` with active `walks.start_time`, required duration/distance, nullable `behavior_rating`, and unique `(dog_id, date, start_time)`.

- [ ] **Step 1: Add failing v3 migration tests**

Add this test beside the v1/v2 migration tests before defining `MIGRATION_V3_SQL`:

```rust
#[test]
fn migration_v3_archives_old_walks_and_creates_timed_walks() {
    let sql = MIGRATION_V3_SQL.to_uppercase();

    assert!(sql.contains("ALTER TABLE WALKS RENAME TO WALKS_LEGACY"));
    assert!(sql.contains("START_TIME TEXT NOT NULL"));
    assert!(sql.contains("DURATION_MINUTES INTEGER NOT NULL"));
    assert!(sql.contains("DISTANCE_KM REAL NOT NULL"));
    assert!(sql.contains("BEHAVIOR_RATING TEXT"));
    assert!(sql.contains("UNIQUE(DOG_ID, DATE, START_TIME)"));
    assert!(sql.contains("BEHAVIOR_RATING TEXT CHECK"));
    assert!(sql.contains("BEHAVIOR_RATING IS NULL"));
    assert!(sql.contains("BEHAVIOR_RATING IN"));
    assert!(!sql.contains("DROP TABLE"));
    assert!(!sql.contains("DELETE FROM"));
    assert!(!sql.contains("ATTACH DATABASE"));
    assert!(!sql.contains(";--"));
}
```

- [ ] **Step 2: Run the Rust test and confirm the missing constant failure**

Run: `cargo test migration_v3_archives_old_walks_and_creates_timed_walks` from `src-tauri/`

Expected: compilation fails because `MIGRATION_V3_SQL` is not defined.

- [ ] **Step 3: Define and register migration v3**

Add a static migration after v2 and register it after version 2:

```rust
/// V3: archive date-only rows and create the active multiple-walk schema.
const MIGRATION_V3_SQL: &str = r#"
                ALTER TABLE walks RENAME TO walks_legacy;

                CREATE TABLE walks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dog_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    start_time TEXT NOT NULL,
                    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
                    distance_km REAL NOT NULL CHECK (distance_km > 0),
                    behavior_rating TEXT CHECK (
                        behavior_rating IS NULL OR
                        behavior_rating IN ('difficult', 'unsettled', 'good', 'great')
                    ),
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (dog_id) REFERENCES dogs(id),
                    UNIQUE(dog_id, date, start_time)
                );

                CREATE INDEX idx_walks_dog_date_time
                    ON walks(dog_id, date DESC, start_time DESC);
            "#;
```

Register:

```rust
Migration {
    version: 3,
    description: "archive_legacy_walks_and_create_timed_walks",
    sql: MIGRATION_V3_SQL,
    kind: MigrationKind::Up,
},
```

- [ ] **Step 4: Run Rust formatting and migration tests**

Run: `cargo fmt --check && cargo test migration_` from `src-tauri/`

Expected: formatting passes; all v1, v2, and v3 migration tests pass.

- [ ] **Step 5: Commit the schema boundary**

```bash
git add src-tauri/src/lib.rs
git commit -m "Add time-based walk schema"
```

---

### Task 2: Define timed-walk, behavior, calendar, and persistence contracts

**Files:**
- Create: `src/lib/calendar.ts`
- Create: `src/lib/calendar.test.ts`
- Create: `src/lib/behavior.ts`
- Create: `src/lib/behavior.test.ts`
- Create: `src/lib/db.test.ts`
- Modify: `src/types/index.ts:1-79`
- Modify: `src/lib/stats.ts:1-57`
- Modify: `src/lib/stats.test.ts:1-35`
- Modify: `src/lib/db.ts:1-194`
- Modify: `src/components/ui.smoke.test.tsx` walk fixtures only

**Interfaces:**
- Consumes: v3 schema from Task 1 and existing unit-conversion/storage conventions.
- Produces: `BehaviorRating`, `BEHAVIOR_OPTIONS`, `isBehaviorRating()`, `behaviorOptionFor()`, `currentLocalTimeHm()`, `minutesFromHm()`, `formatHm()`, required timed `Walk`/input types, `BACKUP_SCHEMA_VERSION = 2`, and parameterized timed CRUD.

- [ ] **Step 1: Write failing behavior and calendar tests**

Create `src/lib/behavior.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  BEHAVIOR_OPTIONS,
  behaviorOptionFor,
  isBehaviorRating,
} from "./behavior";

describe("behavior options", () => {
  it("exposes the four approved values in display order", () => {
    expect(BEHAVIOR_OPTIONS.map((option) => option.value)).toEqual([
      "difficult",
      "unsettled",
      "good",
      "great",
    ]);
    expect(behaviorOptionFor("good")).toMatchObject({ emoji: "🙂", label: "Good" });
  });

  it("rejects unknown stored behavior values", () => {
    expect(isBehaviorRating("great")).toBe(true);
    expect(isBehaviorRating("calm")).toBe(false);
    expect(isBehaviorRating(null)).toBe(false);
  });
});
```

Create `src/lib/calendar.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  currentLocalTimeHm,
  formatHm,
  formatIsoDate,
  minutesFromHm,
  parseIsoDate,
  startOfWeekIso,
} from "./calendar";

describe("calendar helpers", () => {
  it("round-trips calendar dates through UTC-safe arithmetic", () => {
    expect(formatIsoDate(addDaysIso(parseIsoDate("2026-08-09"), -83))).toBe(
      "2026-05-18",
    );
    expect(startOfWeekIso("2026-08-09")).toBe("2026-08-03");
  });

  it("parses, formats, and rejects HH:MM values", () => {
    expect(minutesFromHm("08:30")).toBe(510);
    expect(formatHm("17:00")).toBe("5:00 PM");
    expect(minutesFromHm("24:00")).toBeNull();
    expect(minutesFromHm("8:30")).toBeNull();
  });

  it("formats the supplied local clock to minute precision", () => {
    expect(currentLocalTimeHm(new Date(2026, 7, 9, 8, 5, 42))).toBe("08:05");
  });
});
```

- [ ] **Step 2: Run the new tests and confirm missing-module failures**

Run: `npm test -- src/lib/behavior.test.ts src/lib/calendar.test.ts`

Expected: FAIL because `behavior.ts` and `calendar.ts` do not exist.

- [ ] **Step 3: Add the behavior and calendar modules**

Add `BehaviorRating` to `src/types/index.ts`, then implement the runtime map:

```ts
// src/types/index.ts
export type BehaviorRating = "difficult" | "unsettled" | "good" | "great";
```

```ts
// src/lib/behavior.ts
import type { BehaviorRating } from "../types";

export const BEHAVIOR_OPTIONS: ReadonlyArray<{
  value: BehaviorRating;
  emoji: string;
  label: string;
}> = [
  { value: "difficult", emoji: "😣", label: "Difficult" },
  { value: "unsettled", emoji: "😕", label: "Unsettled" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "great", emoji: "😄", label: "Great" },
];

export function isBehaviorRating(value: unknown): value is BehaviorRating {
  return BEHAVIOR_OPTIONS.some((option) => option.value === value);
}

export function behaviorOptionFor(value: BehaviorRating) {
  return BEHAVIOR_OPTIONS.find((option) => option.value === value)!;
}
```

Implement `src/lib/calendar.ts` with these exact exports:

```ts
export function parseIsoDate(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDaysIso(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function todayIso(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfWeekIso(asOf: string = todayIso()): string {
  const date = parseIsoDate(asOf);
  const day = date.getUTCDay();
  return formatIsoDate(addDaysIso(date, -(day === 0 ? 6 : day - 1)));
}

export function currentLocalTimeHm(now = new Date()): string {
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function minutesFromHm(value: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function formatHm(value: string): string {
  const total = minutesFromHm(value);
  if (total == null) throw new Error(`Invalid local time: ${value}`);
  const hours = Math.floor(total / 60);
  const minutes = String(total % 60).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}
```

Move ISO parsing and formatting usage in `stats.ts` to these helpers. Import
`todayIso` and `startOfWeekIso` from `calendar.ts`, then re-export them from
`stats.ts` so existing component imports remain source-compatible while the
implementation has one owner:

```ts
export { startOfWeekIso, todayIso } from "./calendar";
```

- [ ] **Step 4: Update `Walk` and input types, then update existing fixtures**

Use required timed fields for active rows:

```ts
export interface Walk {
  id: number;
  dog_id: number;
  date: string;
  start_time: string;
  duration_minutes: number;
  distance_km: number;
  behavior_rating: BehaviorRating | null;
  notes: string | null;
  created_at: string;
}

export interface CreateWalkInput {
  dog_id: number;
  date: string;
  start_time: string;
  duration_minutes: number;
  distance_km: number;
  behavior_rating?: BehaviorRating | null;
  notes?: string;
}

export interface UpdateWalkInput {
  id: number;
  date: string;
  start_time: string;
  duration_minutes: number;
  distance_km: number;
  behavior_rating?: BehaviorRating | null;
  notes?: string;
}
```

Every existing `Walk` test fixture must add `start_time: "08:30"` and
`behavior_rating: null`. Remove optional-duration fallback expressions that no
longer represent the active schema.

- [ ] **Step 5: Write failing SQL contract tests**

Create `src/lib/db.test.ts` using a hoisted plugin mock:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const sql = vi.hoisted(() => ({
  execute: vi.fn(),
  select: vi.fn(),
  load: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-sql", () => ({
  default: {
    load: sql.load,
  },
}));

import { createWalk, exportBackup, listWalks } from "./db";

beforeEach(() => {
  sql.execute.mockReset().mockResolvedValue({ rowsAffected: 1 });
  sql.select.mockReset();
  sql.load.mockResolvedValue({ execute: sql.execute, select: sql.select });
});

describe("timed walk persistence", () => {
  it("inserts a timed walk without an upsert clause", async () => {
    await createWalk({
      dog_id: 1,
      date: "2026-08-09",
      start_time: "08:30",
      duration_minutes: 35,
      distance_km: 2,
      behavior_rating: "good",
      notes: "Quiet route",
    });

    const [statement, binds] = sql.execute.mock.calls.at(-1)!;
    expect(statement).toContain("start_time");
    expect(statement).not.toContain("ON CONFLICT");
    expect(binds).toEqual([1, "2026-08-09", "08:30", 35, 2, "good", "Quiet route"]);
  });

  it("orders walks by date, time, then id and rejects an unknown behavior", async () => {
    sql.select.mockResolvedValueOnce([{ id: 1, behavior_rating: "calm" }]);
    await expect(listWalks(1)).rejects.toThrow("Unknown behavior rating: calm");
    expect(sql.select.mock.calls[0][0]).toContain(
      "ORDER BY date DESC, start_time DESC, id DESC",
    );
  });

  it("exports backup schema version 2", async () => {
    sql.select.mockResolvedValue([]);
    await expect(exportBackup()).resolves.toMatchObject({
      schema_version: 2,
      dogs: [],
      walks: [],
      goals: [],
    });
  });
});
```

- [ ] **Step 6: Run the SQL tests and confirm contract failures**

Run: `npm test -- src/lib/db.test.ts`

Expected: FAIL because CRUD still omits `start_time`/behavior, uses an upsert,
and backup has no schema version.

- [ ] **Step 7: Implement timed CRUD, strict row mapping, backup v2, and legacy clearing**

In `db.ts`, add `BACKUP_SCHEMA_VERSION`, validate selected rows, and use these
SQL shapes:

```ts
export const BACKUP_SCHEMA_VERSION = 2 as const;

export interface BackupPayload {
  schema_version: typeof BACKUP_SCHEMA_VERSION;
  exported_at: string;
  dogs: Dog[];
  walks: Walk[];
  goals: Goal[];
}

type WalkRow = Omit<Walk, "behavior_rating"> & {
  behavior_rating: string | null;
};

function mapWalkRow(row: WalkRow): Walk {
  if (row.behavior_rating != null && !isBehaviorRating(row.behavior_rating)) {
    throw new Error(`Unknown behavior rating: ${row.behavior_rating}`);
  }
  return { ...row, behavior_rating: row.behavior_rating };
}
```

```sql
INSERT INTO walks
  (dog_id, date, start_time, duration_minutes, distance_km, behavior_rating, notes)
VALUES ($1, $2, $3, $4, $5, $6, $7)
```

```sql
UPDATE walks
SET date = $1,
    start_time = $2,
    duration_minutes = $3,
    distance_km = $4,
    behavior_rating = $5,
    notes = $6
WHERE id = $7
```

Select active rows with `ORDER BY date DESC, start_time DESC, id DESC`, map
every result through `mapWalkRow`, add `schema_version: BACKUP_SCHEMA_VERSION`
to exports, and clear in foreign-key-safe order:

```ts
await db.execute("DELETE FROM walks");
await db.execute("DELETE FROM walks_legacy");
await db.execute("DELETE FROM goals");
await db.execute("DELETE FROM dogs");
```

- [ ] **Step 8: Run focused frontend tests and build**

Run: `npm test -- src/lib/calendar.test.ts src/lib/behavior.test.ts src/lib/db.test.ts src/lib/stats.test.ts src/components/ui.smoke.test.tsx && npm run build`

Expected: all selected tests pass and TypeScript/Vite build succeeds.

- [ ] **Step 9: Commit the shared domain and persistence contract**

```bash
git add src/types/index.ts src/lib/calendar.ts src/lib/calendar.test.ts src/lib/behavior.ts src/lib/behavior.test.ts src/lib/db.ts src/lib/db.test.ts src/lib/stats.ts src/lib/stats.test.ts src/components/ui.smoke.test.tsx
git commit -m "Update timed walk persistence contracts"
```

---

### Task 3: Add required start time, duration, and behavior to walk entry

**Files:**
- Create: `src/components/BehaviorPicker.tsx`
- Create: `src/components/BehaviorPicker.test.tsx`
- Modify: `src/components/WalkForm.tsx:1-230`
- Modify: `src/components/ui.smoke.test.tsx:75-174`

**Interfaces:**
- Consumes: `BehaviorRating`, `BEHAVIOR_OPTIONS`, `currentLocalTimeHm()`, and timed create/update inputs from Task 2.
- Produces: `BehaviorPicker({ value, onChange, disabled? })` and `WalkForm` submissions containing required `start_time`, required `duration_minutes`, and nullable `behavior_rating`.

- [ ] **Step 1: Write failing behavior-picker and form tests**

Create `BehaviorPicker.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BehaviorPicker } from "./BehaviorPicker";

describe("BehaviorPicker", () => {
  it("selects and clears an optional behavior with readable labels", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(<BehaviorPicker value={null} onChange={onChange} />);

    const good = screen.getByRole("button", { name: "🙂 Good" });
    expect(good).toHaveAttribute("aria-pressed", "false");
    await user.click(good);
    expect(onChange).toHaveBeenCalledWith("good");

    rerender(<BehaviorPicker value="good" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "🙂 Good" }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });
});
```

Extend the WalkForm tests with a fixed clock and a submission assertion:

```tsx
it("defaults start time to now and submits required duration and behavior", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 7, 9, 8, 30));
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  const onCreate = vi.fn().mockResolvedValue(undefined);

  render(
    <WalkForm
      dogId={1}
      editing={null}
      onCreate={onCreate}
      onUpdate={vi.fn()}
      onCancelEdit={vi.fn()}
      onStatus={vi.fn()}
    />,
  );

  expect(screen.getByLabelText(/start time/i)).toHaveValue("08:30");
  await user.click(screen.getByRole("button", { name: "🙂 Good" }));
  await user.click(screen.getByRole("button", { name: /log walk/i }));

  expect(onCreate).toHaveBeenCalledWith(
    expect.objectContaining({
      start_time: "08:30",
      duration_minutes: 30,
      behavior_rating: "good",
    }),
  );
  vi.useRealTimers();
});
```

Add a separate test that clears Duration, submits, and expects
`Duration is required` while `onCreate` remains uncalled.

- [ ] **Step 2: Run the component tests and confirm missing-control failures**

Run: `npm test -- src/components/BehaviorPicker.test.tsx src/components/ui.smoke.test.tsx`

Expected: FAIL because the picker and start-time field do not exist and duration
is still optional.

- [ ] **Step 3: Implement the accessible behavior picker**

Use a fieldset so the optional group has a native label:

```tsx
import { BEHAVIOR_OPTIONS } from "../lib/behavior";
import type { BehaviorRating } from "../types";

interface BehaviorPickerProps {
  value: BehaviorRating | null;
  onChange: (value: BehaviorRating | null) => void;
  disabled?: boolean;
}

export function BehaviorPicker({ value, onChange, disabled }: BehaviorPickerProps) {
  return (
    <fieldset disabled={disabled}>
      <legend className="text-sm">Behavior (optional)</legend>
      <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {BEHAVIOR_OPTIONS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? null : option.value)}
              className={`rounded-lg px-3 py-2 text-sm ring-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-leaf)] ${
                selected
                  ? "bg-[var(--color-moss)] text-white ring-[var(--color-moss)]"
                  : "bg-[var(--color-mist)] text-[var(--color-soil)] ring-[var(--color-trail)]/40 hover:bg-[var(--color-trail)]/30"
              }`}
            >
              <span aria-hidden="true">{option.emoji}</span> {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
```

- [ ] **Step 4: Update `WalkForm` fields, validation, edit/reset behavior, and errors**

Extend `WalkFormValues`:

```ts
export interface WalkFormValues {
  date: string;
  start_time: string;
  duration_minutes: string;
  distance_km: string;
  behavior_rating: BehaviorRating | null;
  notes: string;
}
```

Use `watch("behavior_rating")` and `setValue("behavior_rating", value, {
shouldDirty: true })` for the picker. Register:

```tsx
<input
  type="time"
  {...register("start_time", { required: "Start time is required" })}
/>
```

Make duration required and integer-only:

```ts
validate: (value) => {
  if (!value.trim()) return "Duration is required";
  const duration = Number(value);
  return (
    (Number.isInteger(duration) && duration > 0) ||
    "Duration must be a whole number greater than 0"
  );
}
```

Submit `start_time`, numeric `duration_minutes`, and nullable
`behavior_rating`; populate all three during edit. On success, call
`currentLocalTimeHm()` again rather than reusing the time from initial render.
Detect a duplicate only when the SQLite error mentions the walks unique
constraint and report `A walk already starts at that time` without clearing the
form.

- [ ] **Step 5: Run focused component tests and build**

Run: `npm test -- src/components/BehaviorPicker.test.tsx src/components/ui.smoke.test.tsx && npm run build`

Expected: picker and form tests pass; build has no optional-duration or behavior
type errors.

- [ ] **Step 6: Commit the timed walk-entry slice**

```bash
git add src/components/BehaviorPicker.tsx src/components/BehaviorPicker.test.tsx src/components/WalkForm.tsx src/components/ui.smoke.test.tsx
git commit -m "Add timed walk behavior entry"
```

---

### Task 4: Enforce the one-Dozer application flow

**Files:**
- Create: `src/store/appStore.test.ts`
- Modify: `src/store/appStore.ts:1-180`
- Modify: `src/components/DogProfileForm.tsx:1-285`
- Modify: `src/components/DashboardShell.tsx:1-370`
- Modify: `src/components/ui.smoke.test.tsx:176-248`

**Interfaces:**
- Consumes: Existing dog CRUD, timed walk CRUD, goals, `DogProfileForm` photo processing, and the unchanged weekly statistics.
- Produces: singular `dog: Dog | null` store state, `SINGLE_DOG_ERROR`, setup/edit-only `DogProfileForm`, and a dashboard with no dog selector or create-dog mode.

- [ ] **Step 1: Write failing store invariant tests**

Create `src/store/appStore.test.ts` with mocked database functions:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "../lib/db";
import { useAppStore } from "./appStore";

vi.mock("../lib/db", () => ({
  pingDb: vi.fn(),
  listDogs: vi.fn(),
  listWalks: vi.fn(),
  getGoalForDog: vi.fn(),
  addDog: vi.fn(),
  updateDog: vi.fn(),
  createWalk: vi.fn(),
  updateWalk: vi.fn(),
  deleteWalk: vi.fn(),
  upsertGoal: vi.fn(),
  clearAllData: vi.fn(),
}));

const dozer = {
  id: 1,
  user_id: null,
  name: "Dozer",
  breed: null,
  weight_kg: null,
  photo: null,
  created_at: "2026-08-09T00:00:00Z",
};

beforeEach(() => {
  vi.resetAllMocks();
  useAppStore.setState({
    ready: false,
    error: null,
    dog: null,
    walks: [],
    goal: null,
  });
  vi.mocked(db.pingDb).mockResolvedValue(true);
  vi.mocked(db.listWalks).mockResolvedValue([]);
  vi.mocked(db.getGoalForDog).mockResolvedValue(null);
});

it("loads the only dog and its scoped records", async () => {
  vi.mocked(db.listDogs).mockResolvedValue([dozer]);
  await useAppStore.getState().init();
  expect(useAppStore.getState()).toMatchObject({ ready: true, dog: dozer });
  expect(db.listWalks).toHaveBeenCalledWith(1);
});

it("surfaces multiple profiles instead of silently choosing one", async () => {
  vi.mocked(db.listDogs).mockResolvedValue([dozer, { ...dozer, id: 2 }]);
  await useAppStore.getState().init();
  expect(useAppStore.getState().ready).toBe(false);
  expect(useAppStore.getState().error).toMatch(/more than one dog profile/i);
});
```

Add a third test that calls `addDog` when `dog` is already non-null and expects
rejection without invoking `db.addDog`.

- [ ] **Step 2: Run the store tests and confirm the old multi-dog shape fails**

Run: `npm test -- src/store/appStore.test.ts`

Expected: FAIL because the store exposes `dogs`, `selectedDogId`, and
`isCreatingDog` rather than singular `dog`.

- [ ] **Step 3: Replace selection state with the single-profile invariant**

Use this store boundary:

```ts
export const SINGLE_DOG_ERROR =
  "DogWalk Visualizer found more than one dog profile. Clear the old data and set up Dozer again.";

type CreateDogFields = Omit<CreateDogInput, "user_id">;
type UpdateDogFields = UpdateDogInput;

interface AppState {
  ready: boolean;
  error: string | null;
  dog: Dog | null;
  walks: Walk[];
  goal: Goal | null;
  stats: DailyStats;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  addDog: (input: CreateDogFields) => Promise<void>;
  updateDog: (input: UpdateDogFields) => Promise<void>;
  addWalk: (input: CreateWalkInput) => Promise<void>;
  updateWalk: (input: UpdateWalkInput) => Promise<void>;
  removeWalk: (id: number) => Promise<void>;
  saveGoal: (input: UpsertGoalInput) => Promise<void>;
  clearAllData: () => Promise<void>;
}
```

Implement `refresh()` as:

```ts
const dogs = await db.listDogs();
if (dogs.length > 1) throw new Error(SINGLE_DOG_ERROR);
const dog = dogs[0] ?? null;
const [walks, goal] = dog
  ? await Promise.all([db.listWalks(dog.id), db.getGoalForDog(dog.id)])
  : [[], null];
set({ dog, walks, goal, stats: getDailyStats(walks) });
```

Guard `addDog` when a profile already exists, and after add/update/walk/goal
operations call `refresh()` exactly as today. `clearAllData()` resets singular
state before refreshing.

- [ ] **Step 4: Write failing single-profile form tests**

Replace selector-chip tests with setup/edit behavior:

```tsx
it("shows Set up Dozer without profile-selection controls", () => {
  render(
    <DogProfileForm
      dog={null}
      onAdd={vi.fn()}
      onUpdate={vi.fn()}
      onStatus={vi.fn()}
    />,
  );

  expect(screen.getByRole("heading", { name: "Set up Dozer" })).toBeInTheDocument();
  expect(screen.getByLabelText(/name/i)).toHaveValue("Dozer");
  expect(screen.queryByRole("button", { name: /new/i })).not.toBeInTheDocument();
});

it("edits the one saved profile", () => {
  render(
    <DogProfileForm
      dog={{ ...dogBase, id: 1, name: "Dozer", photo: null }}
      onAdd={vi.fn()}
      onUpdate={vi.fn()}
      onStatus={vi.fn()}
    />,
  );
  expect(screen.getByRole("heading", { name: "Dozer profile" })).toBeInTheDocument();
  expect(screen.queryByText(/\+ new/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 5: Simplify `DogProfileForm` and the dashboard flow**

Change form props to:

```ts
interface DogProfileFormProps {
  dog: Dog | null;
  unitSystem?: UnitSystem;
  onAdd: (values: Omit<CreateDogInput, "user_id">) => Promise<void>;
  onUpdate: (values: UpdateDogInput) => Promise<void>;
  onStatus: (message: string) => void;
}
```

Remove `dogs`, `onSelect`, and `onStartCreate`, delete selector-chip markup, use
`dog` for saved values/photo, set the empty-profile name default to `Dozer`, and
render **Set up Dozer** / **Save Dozer profile** for creation and **Dozer
profile** / **Save profile** for editing.

Update `DashboardShell` to read singular `dog`, define `needsOnboarding = ready
&& dog == null`, remove dog navigation and create-mode branches, and pass
`dog.id` directly to walk/goal actions. Keep the current weekly summary,
consistency, old distance chart, walk form, goals, history, and Settings in place
for now; Task 7 replaces the chart/history surfaces.

- [ ] **Step 6: Run store/UI tests and build**

Run: `npm test -- src/store/appStore.test.ts src/components/ui.smoke.test.tsx && npm run build`

Expected: single-profile tests pass, no references to selection/create-mode
state remain, and the frontend builds.

- [ ] **Step 7: Commit the single-dog vertical slice**

```bash
git add src/store/appStore.ts src/store/appStore.test.ts src/components/DogProfileForm.tsx src/components/DashboardShell.tsx src/components/ui.smoke.test.tsx
git commit -m "Orient app around one dog profile"
```

---

### Task 5: Build the pure timing and trend analytics engine

**Files:**
- Create: `src/lib/walkAnalytics.ts`
- Create: `src/lib/walkAnalytics.test.ts`

**Interfaces:**
- Consumes: Timed `Walk`, calendar helpers, `computeStreak()`, and existing unit conversions.
- Produces: `AnalyticsRange`, `PatternMetric`, `TimePeriod`, `AnalyticsSummary`, `RhythmPoint`, `WeeklyPatternPoint`, `AnalyticsObservation`, `timePeriodFor()`, `getAnalyticsWindow()`, `filterWalksForRange()`, `summarizeWalks()`, `buildRhythmPoints()`, `buildWeeklyPattern()`, and `buildAnalyticsObservations()`.

- [ ] **Step 1: Define the public analytics types and write failing boundary tests**

Start `walkAnalytics.test.ts` with a complete timed fixture:

```ts
import { describe, expect, it } from "vitest";
import type { Walk } from "../types";
import {
  buildAnalyticsObservations,
  buildRhythmPoints,
  buildWeeklyPattern,
  filterWalksForRange,
  summarizeWalks,
  timePeriodFor,
} from "./walkAnalytics";

function walk(overrides: Partial<Walk> & Pick<Walk, "id" | "date" | "start_time">): Walk {
  return {
    id: overrides.id,
    dog_id: 1,
    date: overrides.date,
    start_time: overrides.start_time,
    duration_minutes: overrides.duration_minutes ?? 30,
    distance_km: overrides.distance_km ?? 1,
    behavior_rating: overrides.behavior_rating ?? null,
    notes: overrides.notes ?? null,
    created_at: "2026-08-09T00:00:00Z",
  };
}

it("classifies all four period boundaries", () => {
  expect(timePeriodFor("03:59")).toBe("night");
  expect(timePeriodFor("04:00")).toBe("morning");
  expect(timePeriodFor("11:59")).toBe("morning");
  expect(timePeriodFor("12:00")).toBe("midday");
  expect(timePeriodFor("15:59")).toBe("midday");
  expect(timePeriodFor("16:00")).toBe("evening");
  expect(timePeriodFor("21:59")).toBe("evening");
  expect(timePeriodFor("22:00")).toBe("night");
});

it("keeps multiple walks from the same date in the selected range", () => {
  const walks = [
    walk({ id: 1, date: "2026-08-09", start_time: "08:30" }),
    walk({ id: 2, date: "2026-08-09", start_time: "17:00" }),
    walk({ id: 3, date: "2026-05-17", start_time: "08:30" }),
  ];
  expect(filterWalksForRange(walks, "12w", "2026-08-09").map((item) => item.id)).toEqual([1, 2]);
});
```

- [ ] **Step 2: Add failing aggregation, rhythm, and observation tests**

Add these focused cases:

```ts
it("summarizes count, duration, distance, and streak", () => {
  const walks = [
    walk({ id: 1, date: "2026-08-08", start_time: "08:30", duration_minutes: 30, distance_km: 2 }),
    walk({ id: 2, date: "2026-08-09", start_time: "17:00", duration_minutes: 45, distance_km: 3 }),
  ];
  expect(summarizeWalks(walks, "2026-08-09")).toEqual({
    walkCount: 2,
    totalDurationMinutes: 75,
    totalDistanceKm: 5,
    streakDays: 2,
  });
});

it("builds duration, distance, and count buckets for one Monday-start week", () => {
  const walks = [
    walk({ id: 1, date: "2026-08-03", start_time: "08:30", duration_minutes: 30, distance_km: 1 }),
    walk({ id: 2, date: "2026-08-03", start_time: "17:00", duration_minutes: 20, distance_km: 2 }),
    walk({ id: 3, date: "2026-08-04", start_time: "17:30", duration_minutes: 10, distance_km: 1 }),
  ];
  const duration = buildWeeklyPattern(walks, "4w", "duration", "2026-08-09");
  const distance = buildWeeklyPattern(walks, "4w", "distance", "2026-08-09");
  const count = buildWeeklyPattern(walks, "4w", "walks", "2026-08-09");
  expect(duration.find((week) => week.weekStart === "2026-08-03")).toMatchObject({ morning: 30, evening: 30 });
  expect(distance.find((week) => week.weekStart === "2026-08-03")).toMatchObject({ morning: 1, evening: 3 });
  expect(count.find((week) => week.weekStart === "2026-08-03")).toMatchObject({ morning: 1, evening: 2 });
});

it("maps exact local times and duration to rhythm points", () => {
  const points = buildRhythmPoints([
    walk({ id: 7, date: "2026-08-09", start_time: "08:30", duration_minutes: 35, behavior_rating: "good" }),
  ]);
  expect(points[0]).toMatchObject({ id: 7, timeMinutes: 510, durationMinutes: 35, behaviorRating: "good" });
  expect(points[0].dateValue).toBe(Date.UTC(2026, 7, 9));
});
```

Add observation tests proving: fewer than five current walks yields a
`not-enough-data` observation; five walks yield `common-period`; `all` never
yields `period-change`; and a finite range with at least three current and three
previous walks yields `period-change` for the requested metric.

- [ ] **Step 3: Run the analytics tests and confirm missing-module failure**

Run: `npm test -- src/lib/walkAnalytics.test.ts`

Expected: FAIL because `walkAnalytics.ts` does not exist.

- [ ] **Step 4: Implement the analytics engine with stable public types**

Define these types first:

```ts
export type AnalyticsRange = "4w" | "12w" | "1y" | "all";
export type PatternMetric = "duration" | "distance" | "walks";
export type TimePeriod = "morning" | "midday" | "evening" | "night";

export interface AnalyticsSummary {
  walkCount: number;
  totalDurationMinutes: number;
  totalDistanceKm: number;
  streakDays: number;
}

export interface RhythmPoint {
  id: number;
  date: string;
  dateValue: number;
  timeMinutes: number;
  durationMinutes: number;
  distanceKm: number;
  behaviorRating: BehaviorRating | null;
  notes: string | null;
}

export interface WeeklyPatternPoint {
  weekStart: string;
  label: string;
  morning: number;
  midday: number;
  evening: number;
  night: number;
}

export interface AnalyticsObservation {
  id: "not-enough-data" | "common-period" | "period-duration" | "period-change";
  text: string;
}

export interface AnalyticsWindow {
  currentStart: string | null;
  currentEnd: string;
  previousStart: string | null;
  previousEnd: string | null;
}

export function timePeriodFor(startTime: string): TimePeriod;
export function getAnalyticsWindow(range: AnalyticsRange, asOf: string): AnalyticsWindow;
export function filterWalksForRange(walks: Walk[], range: AnalyticsRange, asOf: string): Walk[];
export function summarizeWalks(walks: Walk[], asOf: string): AnalyticsSummary;
export function buildRhythmPoints(walks: Walk[]): RhythmPoint[];
export function buildWeeklyPattern(
  walks: Walk[],
  range: AnalyticsRange,
  metric: PatternMetric,
  asOf: string,
): WeeklyPatternPoint[];
export function buildAnalyticsObservations(
  walks: Walk[],
  range: AnalyticsRange,
  metric: PatternMetric,
  unitSystem: UnitSystem,
  asOf: string,
): AnalyticsObservation[];
```

Use range day counts `{ "4w": 28, "12w": 84, "1y": 365 }`; calculate an
inclusive start by subtracting `days - 1`; and calculate the prior range as the
same number of days ending one day before the current start. `all` returns a
null current/prior start and never creates a comparison observation.

`buildWeeklyPattern(walks, range, metric, asOf)` must prefill every Monday-start
week intersecting the selected range, then add each walk to exactly one period.
`buildRhythmPoints`
must use `Date.UTC(year, month - 1, day)` for x values and `minutesFromHm()` for
y values. Throw on invalid active-row times instead of fabricating a point.

`buildAnalyticsObservations(walks, range, metric, unitSystem, asOf)` returns:

1. `not-enough-data` alone when current range contains fewer than five walks.
2. The most common period, with tie wording when the maximum is shared.
3. Morning-versus-evening average duration only when both periods have data.
4. A current-versus-previous metric comparison only when each finite period has
   at least three walks; use non-percentage wording when the previous total is
   zero.

- [ ] **Step 5: Run analytics tests and the complete pure-library suite**

Run: `npm test -- src/lib/walkAnalytics.test.ts src/lib/calendar.test.ts src/lib/stats.test.ts src/lib/units.test.ts`

Expected: all analytics, date, existing statistics, and conversion tests pass.

- [ ] **Step 6: Commit the pure analytics boundary**

```bash
git add src/lib/walkAnalytics.ts src/lib/walkAnalytics.test.ts
git commit -m "Add walk timing analytics"
```

---

### Task 6: Build the responsive analytics visual components

**Files:**
- Create: `src/components/WalkRhythmChart.tsx`
- Create: `src/components/WeeklyPatternChart.tsx`
- Create: `src/components/AnalyticsPanel.tsx`
- Create: `src/components/AnalyticsPanel.test.tsx`

**Interfaces:**
- Consumes: Task 5 analytics functions/types, `UnitSystem`, distance conversion helpers, behavior display lookup, and Recharts 3.9 components.
- Produces: `WalkRhythmChart({ points, rangeStart, rangeEnd, unitSystem })`, `WeeklyPatternChart({ data, metric, unitSystem })`, and `AnalyticsPanel({ walks, unitSystem, asOf? })`.

- [ ] **Step 1: Write failing panel control and empty-state tests**

Mock only the two chart renderers so the test validates panel orchestration
without relying on jsdom layout:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsPanel } from "./AnalyticsPanel";
import type { Walk } from "../types";

vi.mock("./WalkRhythmChart", () => ({
  WalkRhythmChart: () => <div data-testid="rhythm-chart" />,
}));
vi.mock("./WeeklyPatternChart", () => ({
  WeeklyPatternChart: ({ metric }: { metric: string }) => (
    <div data-testid="weekly-chart">{metric}</div>
  ),
}));

const timedWalk: Walk = {
  id: 1,
  dog_id: 1,
  date: "2026-08-09",
  start_time: "08:30",
  duration_minutes: 30,
  distance_km: 1.609344,
  behavior_rating: "good",
  notes: null,
  created_at: "2026-08-09T12:30:00Z",
};

it("defaults to a 12-week rhythm view and switches tab and metric", async () => {
  const user = userEvent.setup();
  render(<AnalyticsPanel walks={[timedWalk]} unitSystem="us" asOf="2026-08-09" />);

  expect(screen.getByRole("button", { name: "12 weeks" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByTestId("rhythm-chart")).toBeInTheDocument();

  await user.click(screen.getByRole("tab", { name: "Weekly Pattern" }));
  await user.click(screen.getByRole("button", { name: "Distance" }));
  expect(screen.getByTestId("weekly-chart")).toHaveTextContent("distance");
});

it("shows an informative empty state for a range without walks", () => {
  render(<AnalyticsPanel walks={[]} unitSystem="us" asOf="2026-08-09" />);
  expect(screen.getByText(/log walks to reveal Dozer's routine/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the panel test and confirm missing-component failure**

Run: `npm test -- src/components/AnalyticsPanel.test.tsx`

Expected: FAIL because the panel and chart components do not exist.

- [ ] **Step 3: Implement Walk Rhythm with current Recharts 3 APIs**

Use `ResponsiveContainer`, `ScatterChart`, `Scatter`, `XAxis`, `YAxis`,
`ZAxis`, `CartesianGrid`, and `Tooltip`:

```tsx
<ResponsiveContainer width="100%" height="100%">
  <ScatterChart title="Dozer walk start times and durations" margin={{ top: 12, right: 12, bottom: 8, left: 4 }}>
    <CartesianGrid stroke="var(--color-trail)" strokeOpacity={0.45} />
    <XAxis
      type="number"
      dataKey="dateValue"
      scale="time"
      domain={[rangeStart, rangeEnd]}
      tickFormatter={formatChartDate}
    />
    <YAxis
      type="number"
      dataKey="timeMinutes"
      domain={[0, 1439]}
      ticks={[240, 480, 720, 960, 1200, 1439]}
      reversed
      tickFormatter={formatMinutesOfDay}
    />
    <ZAxis type="number" dataKey="durationMinutes" range={[60, 420]} />
    <Tooltip content={<WalkRhythmTooltip unitSystem={unitSystem} />} />
    <Scatter data={points} fill="var(--color-moss)" />
  </ScatterChart>
</ResponsiveContainer>
```

Define the axis formatters in `WalkRhythmChart.tsx`:

```ts
function formatChartDate(value: number): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMinutesOfDay(value: number): string {
  const hours = Math.floor(value / 60);
  const minutes = String(value % 60).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? "AM" : "PM"}`;
}
```

Implement the custom tooltip with an explicit narrowed payload:

```tsx
interface WalkRhythmTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: RhythmPoint }>;
  unitSystem: UnitSystem;
}

function WalkRhythmTooltip({ active, payload, unitSystem }: WalkRhythmTooltipProps) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  const behavior = point.behaviorRating
    ? behaviorOptionFor(point.behaviorRating)
    : null;
  return (
    <div className="rounded-lg border border-[var(--color-trail)] bg-[var(--color-panel)] p-3 text-sm shadow-lg">
      <p className="font-medium">{point.date} · {formatMinutesOfDay(point.timeMinutes)}</p>
      <p>{point.durationMinutes} min · {toDisplayDistance(point.distanceKm, unitSystem).toFixed(1)} {distanceUnitLabel(unitSystem)}</p>
      {behavior ? <p>{behavior.emoji} {behavior.label}</p> : null}
      {point.notes ? <p>{point.notes}</p> : null}
    </div>
  );
}
```

Give the container a fixed responsive height (`h-64 sm:h-80`) so
`ResponsiveContainer` has measurable dimensions. Recharts 3 enables keyboard
chart accessibility by default. Add a visually hidden HTML list containing
each point's formatted date, time, duration, distance, behavior label, and notes
so the full data remains available even when a custom SVG marker/tooltip is not
announced.

The custom tooltip must narrow `payload?.[0]?.payload` to `RhythmPoint`, convert
distance through `toDisplayDistance`, and look up behavior only when non-null.
Do not use behavior color as a required encoding.

- [ ] **Step 4: Implement the stacked Weekly Pattern chart**

Use one shared stack ID and the existing CSS variables:

```tsx
<ResponsiveContainer width="100%" height="100%">
  <BarChart data={displayData} title={`Weekly ${metric} by time of day`} margin={{ top: 12, right: 8, bottom: 8, left: 4 }}>
    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-trail)" strokeOpacity={0.45} />
    <XAxis dataKey="label" />
    <YAxis width={44} />
    <Tooltip content={<WeeklyPatternTooltip metric={metric} unitSystem={unitSystem} />} />
    <Legend />
    <Bar dataKey="morning" name="Morning" stackId="period" fill="var(--color-trail)" />
    <Bar dataKey="midday" name="Midday" stackId="period" fill="var(--color-leaf)" />
    <Bar dataKey="evening" name="Evening" stackId="period" fill="var(--color-moss)" />
    <Bar dataKey="night" name="Night" stackId="period" fill="var(--color-soil)" radius={[4, 4, 0, 0]} />
  </BarChart>
</ResponsiveContainer>
```

Convert each period's value from km only when `metric === "distance"`.
Tooltip units are `min`, current distance label, or `walks`.
Use an explicit custom-tooltip contract so Recharts payload values are never
cast to `any`:

```tsx
interface WeeklyPatternTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{ name: string; value: number; color: string }>;
  metric: PatternMetric;
  unitSystem: UnitSystem;
}

function WeeklyPatternTooltip({ active, label, payload, metric, unitSystem }: WeeklyPatternTooltipProps) {
  if (!active || !payload?.length) return null;
  const unit = metric === "duration"
    ? "min"
    : metric === "distance"
      ? distanceUnitLabel(unitSystem)
      : "walks";
  return (
    <div className="rounded-lg border border-[var(--color-trail)] bg-[var(--color-panel)] p-3 text-sm shadow-lg">
      <p className="font-medium">Week of {label}</p>
      {payload.map((entry) => (
        <p key={entry.name}>{entry.name}: {entry.value.toFixed(metric === "distance" ? 1 : 0)} {unit}</p>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Implement `AnalyticsPanel` state and summaries**

Use exact local UI state:

```ts
const [range, setRange] = useState<AnalyticsRange>("12w");
const [tab, setTab] = useState<"rhythm" | "weekly">("rhythm");
const [metric, setMetric] = useState<PatternMetric>("duration");
```

Filter once with `useMemo`, then derive summary, points/buckets, and observations
from the same selected range. Render:

- Four `aria-pressed` range buttons: **4 weeks**, **12 weeks**, **1 year**, **All time**.
- Four compact summary cards: Walks, Duration, Distance, Streak.
- A `tablist` with **Walk Rhythm** and **Weekly Pattern**.
- Duration/Distance/Walks metric buttons only inside the Weekly Pattern panel.
- At most three observation sentences; preserve the engine's sparse-data text.

Use semantic `<section>`, `<article>`, `<button>`, and tab attributes. Format
duration as hours/minutes when at least 60 minutes, and distance through
`toDisplayDistance`.

Use this duration formatter for the summary card:

```ts
function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}
```

- [ ] **Step 6: Run panel tests, all analytics tests, and build**

Run: `npm test -- src/components/AnalyticsPanel.test.tsx src/lib/walkAnalytics.test.ts && npm run build`

Expected: controls, empty state, analytics, and TypeScript/Recharts integration
all pass.

- [ ] **Step 7: Commit the analytics presentation layer**

```bash
git add src/components/WalkRhythmChart.tsx src/components/WeeklyPatternChart.tsx src/components/AnalyticsPanel.tsx src/components/AnalyticsPanel.test.tsx
git commit -m "Build walk analytics dashboard"
```

---

### Task 7: Integrate analytics and timed history into the dashboard

**Files:**
- Create: `src/components/WalkHistory.tsx`
- Create: `src/components/WalkHistory.test.tsx`
- Create: `src/components/DashboardShell.test.tsx`
- Modify: `src/components/DashboardShell.tsx:1-340`
- Modify: `src/components/ui.smoke.test.tsx`
- Delete: `src/components/WalkChart.tsx`
- Delete: `src/components/WalkChart.test.tsx`

**Interfaces:**
- Consumes: Singular store from Task 4, timed `WalkForm` from Task 3, analytics panel from Task 6, behavior/calendar helpers, and unit conversions.
- Produces: Final dashboard composition and `WalkHistory({ walks, dogName, unitSystem, onEdit, onDelete, onStatus })`.

- [ ] **Step 1: Write failing independent history tests**

Create `WalkHistory.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WalkHistory } from "./WalkHistory";

it("renders two same-day walks with times and behavior independently", () => {
  render(
    <WalkHistory
      dogName="Dozer"
      unitSystem="us"
      walks={[
        walk({ id: 1, start_time: "08:30", behavior_rating: "good" }),
        walk({ id: 2, start_time: "17:00", behavior_rating: "great" }),
      ]}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      onStatus={vi.fn()}
    />,
  );
  expect(screen.getByText("8:30 AM")).toBeInTheDocument();
  expect(screen.getByText("5:00 PM")).toBeInTheDocument();
  expect(screen.getByText(/🙂 Good/)).toBeInTheDocument();
  expect(screen.getByText(/😄 Great/)).toBeInTheDocument();
});

it("edits and deletes only the selected walk", async () => {
  const user = userEvent.setup();
  const onEdit = vi.fn();
  const onDelete = vi.fn().mockResolvedValue(undefined);
  render(
    <WalkHistory
      dogName="Dozer"
      unitSystem="us"
      walks={[walk({ id: 1, start_time: "08:30" }), walk({ id: 2, start_time: "17:00" })]}
      onEdit={onEdit}
      onDelete={onDelete}
      onStatus={vi.fn()}
    />,
  );
  await user.click(screen.getAllByRole("button", { name: "Edit" })[1]);
  await user.click(screen.getAllByRole("button", { name: "Delete" })[1]);
  expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  expect(onDelete).toHaveBeenCalledWith(2);
});
```

Define the test `walk()` helper with a fixed date, required duration/distance,
nullable behavior/notes, and distinct IDs.

- [ ] **Step 2: Run the history test and confirm missing-component failure**

Run: `npm test -- src/components/WalkHistory.test.tsx`

Expected: FAIL because `WalkHistory` does not exist.

- [ ] **Step 3: Extract and implement timed walk history**

Move the current history markup and delete-error handling out of
`DashboardShell`. For each row:

```tsx
const behavior = walk.behavior_rating
  ? behaviorOptionFor(walk.behavior_rating)
  : null;

<p className="font-medium text-[var(--color-soil)]">
  {walk.date} <span className="text-[var(--color-bark)]/70">{formatHm(walk.start_time)}</span>
</p>
<p className="break-words text-[var(--color-bark)]/70">
  {walk.duration_minutes} min · {displayDistance.toFixed(1)} {distanceLabel}
  {behavior ? ` · ${behavior.emoji} ${behavior.label}` : ""}
  {walk.notes ? ` · ${walk.notes}` : ""}
</p>
```

Keep empty-state copy personalized with `dogName`, retain independent Edit and
Delete callbacks, and preserve the current visible delete failure status.

- [ ] **Step 4: Replace the old 14-day chart and inline history in DashboardShell**

Remove `buildDistanceSeries`, `WalkChart`, chart memoization, create-mode
branches, and inline history. Place components in this order:

1. Header and compact banner.
2. Existing weekly `StatsPanel`.
3. Existing `ConsistencyGrid` when records exist.
4. New `<AnalyticsPanel walks={walks} unitSystem={unitSystem} />`.
5. Two-column Add/Edit Walk and Dozer Profile area.
6. Existing Weekly Goals.
7. `<WalkHistory ... />`.
8. Settings.

Pass `dog.id` to WalkForm and goals. Editing a history row sets
`editingWalk`; deleting that row clears edit state only when IDs match. Remove
`WalkChart.tsx` and its superseded test after no import remains.

- [ ] **Step 5: Add focused dashboard regression assertions**

Create `DashboardShell.test.tsx`, seed the real Zustand store with `setState`,
and assert the final composition without rendering `App` or opening SQLite:

```tsx
useAppStore.setState({
  ready: true,
  error: null,
  dog: dozer,
  walks: [morningWalk, eveningWalk],
  goal: null,
  stats: getDailyStats([morningWalk, eveningWalk], "2026-08-09"),
});
render(<DashboardShell />);

expect(screen.queryByRole("navigation", { name: /dogs/i })).not.toBeInTheDocument();
expect(screen.queryByRole("button", { name: /new dog/i })).not.toBeInTheDocument();
expect(screen.getByRole("region", { name: /walk analytics/i })).toBeInTheDocument();
```

Define complete `dozer`, `morningWalk`, and `eveningWalk` fixtures in the test.
Mock only Recharts' `ResponsiveContainer` when jsdom has no measurable layout;
do not mock `AnalyticsPanel`, `WalkHistory`, or `DogProfileForm`.

- [ ] **Step 6: Run the complete frontend test and build gates**

Run: `npm test && npm run build`

Expected: every Vitest suite passes, obsolete `WalkChart` references are gone,
and TypeScript/Vite builds successfully.

- [ ] **Step 7: Commit the integrated dashboard**

```bash
git add src/components/DashboardShell.tsx src/components/DashboardShell.test.tsx src/components/WalkHistory.tsx src/components/WalkHistory.test.tsx src/components/ui.smoke.test.tsx src/components/WalkChart.tsx src/components/WalkChart.test.tsx
git commit -m "Integrate single-dog timing dashboard"
```

---

### Task 8: Document, verify, and refresh the knowledge graph

**Files:**
- Modify: `docs/SECURITY.md`
- Modify: `docs/RELEASE_NOTES.md`
- Refresh locally without staging: `graphify-out/graph.json` and related `graphify-out/` artifacts

**Interfaces:**
- Consumes: Completed Tasks 1–7 and existing confirmed backup/clear paths.
- Produces: User-facing clean-start guidance, updated security record, verified desktop/mobile behavior, and a refreshed Graphify index.

- [ ] **Step 1: Update security and release documentation with exact shipped behavior**

Add a security row covering migration v3:

```markdown
| Timed-walk migration | Old `walks` rows are retained in `walks_legacy`; active rows require date/time/duration/distance and checked behavior values | Static v3 DDL; no `DROP`, `DELETE`, dynamic SQL, or new capability |
| Backup schema | Walk exports now include local start time and structured behavior | Root `schema_version` is `2`; import remains out of scope |
```

Add release notes that state:

```markdown
- The app now centers on one editable Dozer profile.
- Multiple walks per day are supported with required local start time and duration.
- Each walk can include an optional Difficult, Unsettled, Good, or Great behavior rating.
- Walk Rhythm and Weekly Pattern views reveal timing, duration, distance, frequency, and deterministic trends.
- Before opening this version, use Settings → Clear all data once if the old test records are disposable; the action remains confirmed and local.
```

- [ ] **Step 2: Run formatting, unit tests, type-check/build, and Rust gates**

Run from the repository root:

```bash
npm test
npm run build
```

Run from `src-tauri/`:

```bash
cargo fmt --check
cargo test
cargo check
```

Expected: every command exits `0`. If a command cannot run because of sandbox,
GUI, or missing local tooling, record the exact command and error; do not report
it as an application failure.

- [ ] **Step 3: Perform full Tauri desktop smoke verification**

Before opening the new build, launch the current installed/dev build and use the
confirmed Settings → Clear all data action once. Then run:

```bash
npm run tauri dev
```

Verify manually:

1. **Set up Dozer** appears with the name prefilled and no multi-dog controls.
2. Create Dozer, then log walks at `08:30` and `17:00` on the same date.
3. Select 🙂 Good for one and 😄 Great for the other; confirm both history rows.
4. Attempt another `08:30` record on the same date; confirm a specific duplicate error and retained form values.
5. Confirm Walk Rhythm shows two distinct markers and exact tooltip content.
6. Confirm Weekly Pattern switches among Duration, Distance, and Walks.
7. Confirm range changes preserve the active tab and do not produce invalid observations.
8. Edit and delete only the evening walk; confirm the morning walk remains.
9. Export JSON and confirm `schema_version: 2`, `start_time`, and `behavior_rating`.
10. Resize to approximately `390×844` and desktop width; confirm no clipped controls, unreadable axis labels, or horizontal page overflow.

- [ ] **Step 4: Refresh Graphify after the verified code changes**

Run:

```bash
graphify update . --force
graphify query "Trace timed walk entry through SQLite, state, analytics, charts, history, and backup" --graph graphify-out/graph.json --budget 4000
```

Expected: the refreshed graph includes `BehaviorPicker`, timed walk CRUD,
`walkAnalytics`, `AnalyticsPanel`, both chart components, and `WalkHistory`; the
query returns those relationships without referring to the removed `WalkChart`.

- [ ] **Step 5: Review the final diff for scope and data safety**

Run:

```bash
git status --short
git diff --check
git diff --stat
git diff -- src-tauri/capabilities src-tauri/tauri.conf.json
```

Expected: no capability/config diff, no whitespace errors, and no unrelated
user-created Graphify integration changes included in feature commits. Review
all migration and clear-data SQL once more before commit.

- [ ] **Step 6: Commit documentation and the refreshed index intentionally**

Stage the human-authored docs separately from generated Graphify artifacts so
the commit scope is explicit:

```bash
git add docs/SECURITY.md docs/RELEASE_NOTES.md
git commit -m "Document single-dog analytics release"
```

Leave `graphify-out/` and the existing Graphify integration files untracked or
unstaged. They belong to the user's local indexing setup and must not enter a
feature or documentation commit.

---

## Final Acceptance Checklist

- [ ] One editable Dozer profile is the only profile surfaced in the UI.
- [ ] More than one stored dog produces an explicit recovery error.
- [ ] Multiple same-day walks save independently; exact same-minute duplicates fail without overwrite.
- [ ] Date, start time, positive whole-minute duration, and positive distance are mandatory.
- [ ] The optional four-choice behavior picker is accessible and persists to history/backup/tooltips.
- [ ] Walk Rhythm defaults to the 12-week range and maps date, local time, and duration correctly.
- [ ] Weekly Pattern groups the four approved periods and switches among duration, distance, and count.
- [ ] Summary cards and observations honor selected ranges, prior equal periods, and evidence thresholds.
- [ ] Weekly goals, consistency, units, theme, profile photo, backup, and confirmed clear-data behavior remain working.
- [ ] No network/shell capability or MariaDB/API/sync code was added.
- [ ] Frontend tests/build and Rust format/test/check gates pass.
- [ ] Desktop and mobile-sized manual chart/form verification is recorded honestly.
- [ ] Graphify is refreshed or intentionally left local, without mixing generated artifacts into feature commits.
