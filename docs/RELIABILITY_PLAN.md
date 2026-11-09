# DogWalk Visualizer reliability plan

## Walk logging and tests

- Use a plain SQLite insert for new walks. Preserve the existing entry on a dog-and-date conflict, keep the draft, and direct the user to edit the existing walk.
- Keep stored kilometers when the displayed distance is unchanged during an edit. Convert a changed distance from the active unit system. Include existing zero distances and short distances that round to zero.
- Expose and reset jsdom storage in frontend tests. Use Node 22 as the development and CI baseline and verify the suite on Node 26 as well.

## Atomic data operations

- Run clear and restore as native commands against the SQL plugin's SQLite pool. Use one transaction per operation and preserve migrations and the JSON export format.
- Clear care tasks, walks, goals, and dogs after confirmation. Refresh the dashboard after commit.
- Offer restore in Settings and onboarding. Use the selected JSON path, validate all rows in Rust, and check that the four data tables are empty inside an immediate transaction. Restore IDs, relationships, and timestamps. Accept older backups that omit walk start times or care tasks. Reject malformed or inconsistent data and report the error in Settings.

## Acceptance checks

- Verify duplicate submissions leave the original row intact and notes-only edits preserve distance in both unit systems.
- Verify a complete backup round trip, legacy backup support, populated-database refusal, and rollback after a late failure in each native write.
- Run the frontend tests and build, Rust format check, tests, and check. Smoke-test duplicate logging, backup, clear, and restore on Windows using a disposable profile.
