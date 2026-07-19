# Dog Walk Tracker 1.0 — Release Notes

**Release date:** 2026-07-19  
**Version:** 1.0.0

## What’s included

Dog Walk Tracker is a privacy-first desktop app for logging walks and keeping a simple routine for your dog.

- Log walks (date, duration, distance, notes) — one entry per dog per day
- Track streak and weekly progress against optional goals
- Manage multiple dogs with optional breed and weight
- Export a JSON backup; clear local data when you choose
- Dark / light theme
- Works offline; nothing is sent to external servers

## Platforms

Build installers on each target host with:

```bash
npm install
npm run tauri:build
```

| Platform | Typical artifact |
| --- | --- |
| Linux (verified this release) | `.deb`, `.rpm`, `.AppImage` via `npm run tauri:build` |
| Windows | `.msi` / `.exe` (build on Windows) |
| macOS | `.dmg` / `.app` (build on macOS) |

Cross-compilation is not configured for this MVP — build on the OS you distribute for.

## Install / upgrade notes

- First launch creates `dogwalk.db` in the app data directory.
- Export a JSON backup before clearing data or uninstalling.
- Upgrading from 0.1.x: same local DB schema (migration v1); no cloud migration needed.

## Known limitations

- No GPS auto-distance, reminders, or multi-device sync
- Walk delete is permanent (no soft-delete)
- Full desktop E2E (WebDriver) not automated; smoke tests cover stats UI and form gating

## Verification before release

```bash
npm test
cd src-tauri && cargo test
npm run build
npm run tauri:build   # on each target OS
```

See also `docs/SECURITY.md` and `CHANGELOG.md`.
