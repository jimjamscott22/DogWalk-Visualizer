# Security notes — Dog Walk Tracker v1.0

**Audit date:** 2026-07-19  
**Scope:** Tauri capabilities, plugins, CSP, SQL access patterns, backup paths

## Threat model (MVP)

- Single-user desktop app; adversary is malicious local content or accidental data loss.
- No accounts, no cloud sync, no intentional outbound network for app data.

## Findings & actions

| Area | Finding | Action |
| --- | --- | --- |
| Network | No HTTP/HTTPS allowlist permissions | Kept — no `http:` / remote URL permissions in capabilities |
| Opener plugin | Scaffolded but unused | **Removed** plugin + `opener:default` |
| CSP | Was `null` | Set restrictive CSP (self + ipc + inline styles for Tailwind) |
| SQL | Frontend uses parameterized `$1…` binds | Confirmed in `src/lib/db.ts`; no string-concat queries |
| Migrations | Static DDL only | Unit-tested for no `DROP` / `ATTACH` |
| FS write | `fs:allow-write-text-file` + `fs:default` | Export uses save dialog; selected path is scoped for that write |
| Dialog | `dialog:default` for save + confirm | Required for backup / clear-all |
| Clear data | Destructive | Confirm dialog before DELETE |
| DB location | `sqlite:dogwalk.db` in app data dir | Local only; not in repo |

## Residual risks

- `fs:default` is broader than a single write path; acceptable for MVP because write is user-initiated via save dialog. Future: custom Rust command with explicit path allowlist.
- Soft-delete for walks not implemented (hard delete).
- Frontend can execute SQL via plugin; acceptable for trusted local UI. Hardening path: move CRUD behind Rust commands.

## Permissions (current)

```
core:default
sql:default
sql:allow-execute
dialog:default
fs:default
fs:allow-write-text-file
```

No `shell`, `http`, or remote asset permissions.
