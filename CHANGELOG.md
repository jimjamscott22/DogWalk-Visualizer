# Changelog

All notable changes to Dog Walk Tracker are documented here.

## [1.0.0] — 2026-07-19

### Added

- Local-first dog profiles, walk logging, and walk history (SQLite)
- Weekly progress dashboard with streak, walks, distance, and goal bars
- Health goals (weekly walks / distance) and weight-aware insight notes
- Settings: dark mode, JSON backup export, clear-all-data with confirm
- First-run onboarding and empty states
- Unit tests for streak/stats logic; UI smoke tests; Rust migration safety tests
- CSP and tightened Tauri capabilities (removed unused opener plugin)

### Privacy

- No cloud sync; data remains in the local app SQLite database

## [0.1.0] — 2026-07-18

### Added

- Project scaffolding (Tauri v2 + React + TypeScript)
- Phase 1–2 data engine and visualizations
