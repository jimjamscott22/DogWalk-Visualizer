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
| Opener plugin | Pet care resource links (2026-11-09) | `opener:allow-open-url` scoped to three exact HTTPS URLs; no default, file, or reveal permissions. Automatic link interception disabled. |
| CSP | Was `null` | Set restrictive CSP (self + ipc + inline styles for Tailwind) |
| SQL | Frontend uses parameterized `$1…` binds | Confirmed in `src/lib/db.ts`; no string-concat queries |
| Migrations | Static DDL only | Unit-tested for no `DROP` / `ATTACH` |
| File access | `fs:allow-read-text-file`, `fs:allow-write-text-file`, and `fs:deny-default` | Native open and save dialogs grant access to selected paths. |
| Dialog | `dialog:default` | Supports export, restore, and confirmation before clearing |
| Clear data | Destructive | Confirm before deleting in a single SQLite transaction |
| Restore | Local JSON file | Validate records and references before writing. Check for an empty destination and import in a single SQLite transaction. |
| DB location | `sqlite:dogwalk.db` in app data dir | Local only; not in repo |

## Residual risks

- Soft-delete for walks not implemented (hard delete).
- Frontend can execute SQL via plugin; acceptable for trusted local UI. Hardening path: move CRUD behind Rust commands.

## Permissions (current)

```
core:default
sql:default
sql:allow-execute
dialog:default
fs:deny-default
fs:allow-read-text-file
fs:allow-write-text-file
```

No `shell`, `http`, or remote asset permissions. `opener:allow-open-url` additionally
permits only these exact resource URLs in the system browser:

- https://www.aspca.org/pet-care/dog-care/general-dog-care
- https://www.aspca.org/pet-care/cat-care/general-cat-care
- https://www.pdsa.org.uk/pet-help-and-advice/looking-after-your-pet/kittens-cats/exercise-for-your-cat

Pet care tips are bundled and available offline. Opening a resource is an explicit
user action; no pet records are included in the URL or sent to the website. The
external browser uses its own network connection and website privacy policies.
The WebView CSP is unchanged. Adding or changing resources requires reviewing both
`src/lib/petCareTips.ts` and the capability URL allowlist.
