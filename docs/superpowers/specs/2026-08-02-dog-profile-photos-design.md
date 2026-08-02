# Dog Profile Photos — Design

**Date:** 2026-08-02
**Status:** Approved

## Goal

Let the user attach a small profile picture to each dog. The photo appears as a
small round avatar in the dog selector chips in the Dog profile panel. Photos are
stored locally in SQLite, consistent with the app's local-first, no-network policy.

## Decisions

- **Placement:** avatars in the dog selector chips only; upload/remove controls
  live in the Dog profile form.
- **Storage:** base64 JPEG data URL in a new nullable `photo` TEXT column on
  `dogs`. Images are downscaled client-side to 96×96 before storage (~5–10 KB),
  so the DB stays small and photos ride along in JSON backups automatically.
- **No new Tauri capabilities:** the photo is picked with a plain
  `<input type="file" accept="image/*">` in the webview and processed with a
  canvas — no `fs` read permissions or dialog changes required.

## Schema & migration

Add `Migration` v2 in `src-tauri/src/lib.rs`:

```sql
ALTER TABLE dogs ADD COLUMN photo TEXT;
```

- Static DDL only, kept as a `const` (`MIGRATION_V2_SQL`) like v1.
- Extend the Rust test `migration_sql_uses_safe_ddl_patterns` (or add a sibling
  test) to assert the v2 SQL contains only the `ALTER TABLE ... ADD COLUMN`
  pattern and none of the forbidden patterns (`DROP TABLE`, `ATTACH DATABASE`).

## Image pipeline (`src/lib/image.ts`)

New module with a pure-ish helper:

```ts
processDogPhoto(file: File): Promise<string>  // resolves to a data URL
```

Behavior:

1. Validate `file.type` starts with `image/`; reject otherwise with a
   user-readable error.
2. Reject files larger than 10 MB before decoding (guard against accidental
   huge picks).
3. Decode via object URL + `HTMLImageElement` (revoke the object URL after).
4. Center-crop to a square, draw to a 96×96 canvas, export as
   `canvas.toDataURL("image/jpeg", 0.85)`.
5. Reject with a readable error if decoding fails (corrupt/unsupported file).

Validation rules (steps 1–2) are factored so they can be unit-tested without a
real canvas.

## Types & data flow

- `Dog` gains `photo: string | null`; `CreateDogInput`/`UpdateDogInput` gain
  `photo?: string | null` (`src/types/index.ts`).
- `addDog`/`updateDog` in `src/lib/db.ts` bind the new column with `$n`
  placeholders (never string concatenation).
- Store actions in `src/store/appStore.ts` pass `photo` through unchanged and
  `refresh()` as usual — no optimistic updates.
- Backups need no changes: `exportBackup` uses `SELECT * FROM dogs`.

## UI (`src/components/DogProfileForm.tsx`)

- **Photo row** in the form: a 48px round preview of the current/pending photo,
  an initial-letter placeholder when absent, a "Choose photo" button that
  triggers a hidden file input, and a "Remove" button shown only when a photo
  exists. A pending photo choice is held in component state and saved with the
  existing submit flow (add or update).
- **Selector chips:** each chip renders a small (20px) round avatar before the
  dog's name — the photo if present, otherwise the dog's first initial on a
  `--color-trail`-tinted circle. Uses existing CSS variables for theming.
- Processing errors surface via the existing `onStatus` message mechanism.

## Testing

- `src/lib/image.test.ts`: unit tests for type/size validation and error
  messages (jsdom-safe paths).
- Extend `src/components/ui.smoke.test.tsx`: chip renders initial fallback
  without a photo and an `<img>` when a photo data URL is set.
- Rust: migration v2 DDL-safety assertions in `src-tauri/src/lib.rs` tests.

## Out of scope

- Photos in the dashboard header or stats panels.
- Full-resolution photo storage or file-on-disk storage.
- Cropping/zoom UI — center-crop is automatic.
