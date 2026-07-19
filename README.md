# Dog Walk Tracker

A lightweight, local-first desktop app for logging dog walks and visualizing consistency over time.

**Privacy:** All data is stored locally in SQLite on your machine. Nothing is sent to external servers.

## Stack

- [Tauri v2](https://v2.tauri.app) + Rust
- React + TypeScript (Vite)
- Tailwind CSS
- SQLite via `tauri-plugin-sql`
- Zustand for UI state

## Prerequisites

- Node.js 18+
- Rust (stable) via [rustup](https://rustup.rs)
- Platform deps for [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)

## Develop

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

## Project layout

```
docs/                 Spec, implementation plan, agent prompt
src/                  React frontend
src/lib/db.ts         SQLite access via Tauri SQL plugin
src/store/            Zustand store
src-tauri/            Rust / Tauri backend + migrations
```

## Docs

See `docs/spec.md` and `docs/implementation_plan.md` for MVP scope and phases.

**Session handoff:** start from [`docs/HANDOFF.md`](docs/HANDOFF.md) — current phase status, architecture notes, and what to do next.

## Current features (Phase 2)

- Dog profiles (name, breed, weight)
- Walk CRUD with validation (date, distance > 0)
- Streak + weekly distance/frequency stats
- 14-day distance chart
- Local SQLite only (no cloud)
