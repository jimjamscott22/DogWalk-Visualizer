# Repository Guidelines

## Project Structure & Module Organization

DogWalk Visualizer is a local-first Tauri 2 desktop app. React/TypeScript code lives in `src/`: UI in `components/`, helpers in `lib/`, Zustand state in `store/`, models in `types/`, and test setup in `test/`. Keep business logic in the frontend unless native access is required. Rust, SQLite migrations, capabilities, and icons live under `src-tauri/`. Static assets belong in `public/`; project records belong in `docs/`.

## Build, Test, and Development Commands

- `npm install` installs dependencies; CI uses `npm ci` with Node 22.
- `npm run dev` starts Vite on port 1420 without the desktop shell.
- `npm run tauri dev` starts the full app with hot reload (requires Rust/Cargo).
- `npm test` runs Vitest once; `npm run test:watch` runs watch mode.
- `npm run build` type-checks TypeScript and builds the frontend.
- `cd src-tauri && cargo test && cargo check` verifies Rust code.
- `npm run tauri:build` creates platform installers in `src-tauri/target/release/bundle/`.

On Windows PowerShell, use `npm.cmd` if `npm` command resolution is unreliable.

## Coding Style & Naming Conventions

Follow existing two-space indentation, double quotes, and semicolons in TypeScript. Use PascalCase for components and types, camelCase for functions and store actions, and descriptive names such as `WalkChart.tsx`. Keep derived statistics pure and SQL parameterized with `$1`, `$2`, and similar binds. No ESLint or Prettier command is configured; use `npm run build` and `cargo fmt --check` as baseline checks.

## Testing Guidelines

Vitest, Testing Library, and jsdom cover frontend behavior. Name tests `*.test.ts` or `*.test.tsx` beside the implementation; shared setup belongs in `src/test/setup.ts`. Add focused tests for calculations, forms, and regressions. Extend Rust tests when changing migrations or Tauri commands. CI requires frontend tests/build plus `cargo test` and `cargo check`.

## Commit & Pull Request Guidelines

Use short, imperative commit subjects matching history, for example `Add unit system toggle to SettingsPanel`. Keep commits focused. Pull requests should explain user-visible behavior, note schema or capability changes, link related issues, list verification commands, and include screenshots for UI changes. Confirm all CI checks pass before requesting review.

## Security & Data Safety

Preserve local-only operation. Do not add network or shell permissions without an explicit decision. Add versioned migrations instead of editing migration v1, avoid destructive or dynamic SQL, and use confirmed dialog paths for file operations. Review `docs/SECURITY.md` before changing storage, exports, or capabilities.
