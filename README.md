# Dog Walk Tracker

A lightweight, local-first desktop app for logging dog walks and visualizing consistency over time.

**Version:** 1.0.0  
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

## Test

```bash
npm test                 # Vitest (stats + UI smoke)
cd src-tauri && cargo test
```

## Build installer

```bash
npm run tauri:build
```

Artifacts land under `src-tauri/target/release/bundle/`. Build on each OS you ship for (Windows / macOS / Linux).

## Project layout

```
docs/                 Spec, plan, security audit, release notes
src/                  React frontend
src/lib/db.ts         SQLite access via Tauri SQL plugin
src/store/            Zustand store
src-tauri/            Rust / Tauri backend + migrations
CHANGELOG.md          Version history
```

## Docs

| Doc | Purpose |
| --- | --- |
| [`docs/HANDOFF.md`](docs/HANDOFF.md) | Resume / current status |
| [`docs/RELEASE_NOTES.md`](docs/RELEASE_NOTES.md) | v1.0 release notes |
| [`docs/SECURITY.md`](docs/SECURITY.md) | Permissions & audit |
| [`docs/spec.md`](docs/spec.md) | Product spec |
| [`CHANGELOG.md`](CHANGELOG.md) | Changelog |

## Features (v1.0)

- Dog profiles (name, breed, weight)
- Walk CRUD with validation
- Weekly progress, streak, goals, 14-day chart
- Dark mode, JSON backup, clear-all-data
- Local SQLite only (no cloud)
