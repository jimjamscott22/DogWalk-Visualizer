# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Local-first desktop app (Tauri v2) for logging dog walks and visualizing weekly consistency. All data lives in a local SQLite file on disk — no accounts, no cloud sync, no outbound network for app data. Currently v1.0.0, feature-complete for the MVP scope described in `docs/spec.md`.

## Commands

```bash
npm install               # install JS deps
npm run dev                # vite dev server only (frontend, no Tauri shell)
npm run tauri dev          # full app: Rust backend + webview, hot reload
npm run build               # tsc typecheck + vite build
npm run tauri:build         # produce OS installer (bundle under src-tauri/target/release/bundle/)

npm test                   # vitest run (single pass)
npm run test:watch          # vitest watch mode
npx vitest run src/lib/stats.test.ts   # run a single test file

cd src-tauri && cargo test  # Rust unit tests (migration safety, command checks)
cd src-tauri && cargo check
```

CI (`.github/workflows/ci.yml`) runs `npm test` + `npm run build` and `cargo test` + `cargo check` on every push/PR to `main`. Both must pass.

## Architecture

**Frontend/backend split is thin.** Almost all logic lives in the React/TypeScript frontend. The Rust side (`src-tauri/src/lib.rs`) exists mainly to register Tauri plugins and own the SQL migrations — there are only two trivial `#[tauri::command]`s (`greet`, `db_url`). Do not assume business logic belongs in Rust; it belongs in `src/`.

**Data flow:** `src/lib/db.ts` (raw SQL via `@tauri-apps/plugin-sql`, parameterized `$1…` binds only) → `src/store/appStore.ts` (single Zustand store, holds all app state: dogs, walks, goal, selected dog, derived stats) → `src/components/*` (presentational, receive state/callbacks as props from `DashboardShell`). There is no repository/service layer beyond `db.ts` — components call store actions, store actions call `db.ts` functions directly, then re-`refresh()` from the DB rather than doing local optimistic updates.

**`DashboardShell.tsx`** is the top-level layout and owns transient UI state (which walk is being edited, status messages). It renders three states based on store status: loading, DB error, onboarding (no dogs yet), or the full dashboard (stats, 14-day chart, walk form, dog profile, health insights, walk history, settings).

**Schema & migrations** (`src-tauri/src/lib.rs`): single SQL migration (`MIGRATION_V1_SQL`) defines `users`, `dogs`, `walks`, `goals`. `walks` has a `UNIQUE(dog_id, date)` constraint — one walk row per dog per day; `createWalk` in `db.ts` relies on this via `ON CONFLICT ... DO UPDATE` (upsert), so "Quick Add" for today updates the existing row rather than creating duplicates. When changing the schema, add a new `Migration` with an incremented `version` rather than editing `MIGRATION_V1_SQL` in place, and update the Rust test `migration_sql_uses_safe_ddl_patterns` if new DDL patterns need asserting.

**Stats/derived data** (`src/lib/stats.ts`) is pure and well-tested — streaks, weekly totals, health insight summaries, and the 14-day chart series are all computed here from raw `Walk[]` arrays using UTC-normalized date arithmetic (`toUtcDate`/`formatIso`), not `Date` local time, to avoid timezone drift. Any new derived metric should follow this pattern: pure function taking `Walk[]`/`Goal`/`asOf`, tested in `stats.test.ts`.

**Types** (`src/types/index.ts`) mirror the SQL schema directly (`Dog`, `Walk`, `Goal`) plus input DTOs (`CreateWalkInput`, `UpdateDogInput`, etc.) — keep these in sync with the migration SQL when the schema changes.

**Theming**: dark/light mode is a `data-theme` attribute on `<html>` set via `src/lib/theme.ts`, persisted to `localStorage`. Tailwind v4 (via `@tailwindcss/vite`) with a custom palette exposed as CSS variables (`--color-moss`, `--color-soil`, `--color-bark`, `--color-panel`, `--color-mist`, `--color-trail`) — use these vars, not raw Tailwind color classes, to stay theme-consistent.

## Security constraints (see `docs/SECURITY.md`)

- No `http`/`shell`/remote-asset permissions are granted in `src-tauri/capabilities/default.json` — do not add network capabilities without an explicit product decision (see `docs/HANDOFF.md` "Do not").
- All SQL from the frontend must use parameterized binds (`$1, $2, …`); never string-concatenate values into queries.
- Migrations must stay static DDL only — no `DROP TABLE`, `ATTACH DATABASE`, or dynamic SQL (enforced by a Rust unit test).
- JSON backup/export and clear-all-data go through the `dialog`/`fs` plugins with explicit user-initiated paths (save dialog, confirm dialog) — don't write files to arbitrary paths without a dialog in the loop.

## Testing notes

- Vitest + Testing Library, `jsdom` environment, setup file at `src/test/setup.ts`.
- `src/components/ui.smoke.test.tsx` is a smoke test, not full coverage — full Playwright/WebDriver E2E is explicitly deferred (see `docs/HANDOFF.md`).
- Rust tests in `src-tauri/src/lib.rs` assert migration DDL safety and basic command output — extend these when touching the migration SQL or adding Tauri commands.
