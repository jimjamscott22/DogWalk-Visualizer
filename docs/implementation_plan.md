

# Dog Walk Tracker 1.0 - Implementation Plan

**Role:** Senior Software Engineer  
**Project Type:** Desktop Application (MVP)  
**Tech Stack:** Tauri (v2), Rust, React + TypeScript, SQLite  
**Goal:** Deliver a functional, local-first MVP within 4 weeks to validate market fit and user utility.

---

## 1. Executive Summary & Architecture
The application will be a **Local-First Desktop App**. This approach ensures data privacy (dog owners are wary of tracking personal health data) and reliability (no internet required).

*   **Frontend:** React + TypeScript (using Vite for build speed). Styling via Tailwind CSS with Shadcn/UI components for rapid UI development.
*   **Backend Logic:** Rust (Tauri Commands).
*   **Data Persistence:** SQLite (via `tauri-plugin-sql`).
*   **State Management:** Zustand (lightweight, works well with Tauri).

---

## 2. Implementation Phases

### Phase 1: Foundation & Architecture (Week 1)
**Objective:** Establish the build environment, schema, and project structure.

| Task ID | Task Description | Tech/Dependencies | Est. Effort |
| :--- | :--- | :--- | :--- |
| **1.1** | Initialize Tauri + React project with TypeScript strict mode. | `tauri-cli`, `create-tauri-app` | 2h |
| **1.2** | Configure Rust backend (Cargo) and define API interface for Walk entries. | `tauri-plugin-sql`, `serde` | 3h |
| **1.3** | Design SQLite Schema (`walks`, `dogs`, `goals`). | SQLite DDL | 1h |
| **1.4** | Implement App Authentication (Local File System or Simple PIN). | `tauri-plugin-dialog` | 2h |
| **1.5** | Setup CI/CD pipeline for local build automation. | GitHub Actions / VSCode Tasks | 3h |

*   **Milestone:** **Project Shell & DB Schema Complete.**
    *   *Deliverable:* A project that installs on the dev machine, opens a blank window, and can store one JSON entry to SQLite.

### Phase 2: Core Data Logic (Week 2) — **COMPLETE (2026-07-18)**
**Objective:** Build the data ingestion engine and visualization hooks.

| Task ID | Task Description | Tech/Dependencies | Est. Effort | Status |
| :--- | :--- | :--- | :--- | :--- |
| **2.1** | Implement CRUD for Walk Logs (via SQL plugin / `src/lib/db.ts`). | `tauri-plugin-sql` | 6h | Done |
| **2.2** | Create User Profile Management (Dog Name, Breed, Weight). | Frontend + Backend | 4h | Done |
| **2.3** | Build "Add Walk" Form with validation (Distance > 0, Date). | React Hook Form | 4h | Done |
| **2.4** | Implement Data Visualization (Total Distance, Frequency). | `recharts` | 6h | Done |
| **2.5** | Add Streak Counter Logic (Consecutive days walked). | JS (`src/lib/stats.ts`) | 3h | Done |

*   **Milestone:** **Data Engine Complete.**
    *   *Deliverable:* User can create a profile, log a walk, and see the data appear on a chart immediately.
    *   *Handoff:* See `docs/HANDOFF.md`.

### Phase 3: UI Polish & Health Integration (Week 3) — **COMPLETE (2026-07-19)**
**Objective:** Refine UX to focus on "Routine" and "Health" aspects of the prompt.

| Task ID | Task Description | Tech/Dependencies | Est. Effort | Status |
| :--- | :--- | :--- | :--- | :--- |
| **3.1** | Dashboard Layout: Main view showing weekly progress. | Tailwind | 6h | Done |
| **3.2** | Health Insights: Display average distance vs. weight (if tracked). | JS Calculation | 4h | Done |
| **3.3** | Settings Page: Toggle Dark Mode, Backup Data to JSON. | Tauri Dialogs | 4h | Done |
| **3.4** | Error Handling & Empty States: "No walks yet" screens. | React | 2h | Done |
| **3.5** | Responsive Check: Ensure UI scales well on different monitor sizes. | DevTools | 2h | Done |

*   **Milestone:** **Functional MVP.**
    *   *Deliverable:* Weekly-progress dashboard, settings, onboarding, goals/health insights, responsive window sizing.
    *   *Handoff:* See `docs/HANDOFF.md`.

### Phase 4: Testing, Packaging & Release (Week 4) — **COMPLETE (2026-07-19)**
**Objective:** Hardening the product for distribution.

| Task ID | Task Description | Tech/Dependencies | Est. Effort | Status |
| :--- | :--- | :--- | :--- | :--- |
| **4.1** | Unit Tests on Rust Backend Logic (SQL safety). | `cargo test` + Vitest stats | 4h | Done |
| **4.2** | UI E2E Testing (Basic interaction flows). | Vitest + Testing Library smoke | 6h | Done* |
| **4.3** | Security Audit: Check Tauri permissions and file paths. | Manual + `docs/SECURITY.md` | 2h | Done |
| **4.4** | Build Executables for Windows, macOS, Linux. | `tauri build` per host OS | 4h | Ready† |
| **4.5** | Release Notes & Changelog preparation. | Docs | 1h | Done |

\* Desktop WebDriver E2E deferred; smoke tests cover stats UI + walk form gating.  
† Installers must be produced on each target OS (`npm run tauri:build`). CI runs unit tests + frontend build.

*   **Milestone:** **v1.0 Release Ready.**
    *   *Deliverable:* Version 1.0.0, tests, security notes, changelog/release notes, packaging instructions.
    *   *Handoff:* See `docs/HANDOFF.md`, `docs/RELEASE_NOTES.md`.

---

## 3. Database Schema (SQLLite)

To keep the MVP simple but extensible, we will use a relational schema stored locally.

```sql
-- Users/Dogs Table
CREATE TABLE dogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id TEXT DEFAULT 'local_user', -- For single user MVP
    dog_name TEXT NOT NULL,
    breed TEXT,
    weight_kg REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Walks Table
CREATE TABLE walks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dog_id INTEGER FOREIGN KEY REFERENCES dogs(id),
    date DATE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    distance_km REAL NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily Goals Table (for health tracking)
CREATE TABLE goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dog_id INTEGER FOREIGN KEY REFERENCES dogs(id),
    target_distance_weekly REAL,
    target_walks_per_week INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Required Resources

### Hardware
*   **Dev Machine:** Minimum 8GB RAM (16GB preferred for Rust compilation speed).
*   **OS:** Windows 10/11 or macOS (Tauri cross-compilation requires specific host OS setups).
*   **Storage:** SSD recommended (SQLite performance depends on I/O).

### Software & Licenses
*   **IDE:** VS Code (Recommended for Rust + React combo).
*   **Rust Toolchain:** `rustup-init` with latest stable beta.
*   **Tauri CLI:** Installed via npm.
*   **Database:** SQLite (Included in Tauri plugin, no separate install needed).
*   **Design Assets:** None required (using standard Shadcn components), or Figma file for mockups if needed.

### Team Roles (For MVP Context)
*   **Full Stack Dev:** 1 Person (Writing Rust + React).
*   **QA/Tester:** 0-1 Person (Can be handled by the Full Stack Dev initially, but separate is better for v2).

---

## 5. Risk Mitigation & Constraints

| Risk | Probability | Impact | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Data Loss** | Low | High | Implement automatic local backup to JSON file on exit; use SQLite WAL mode. |
| **Platform Compatibility** | Medium | Medium | Test strictly on target OS (e.g., if targeting Windows, test on Win10/Win11). |
| **Rust Compilation Errors** | Medium | Low | Use `cargo-clippy` and `rustfmt`; ensure environment variables are set correctly. |
| **User Adoption** | High | Medium | Keep UI extremely simple ("Add Walk" button must be prominent); avoid complex onboarding forms. |

---

## 6. Success Metrics (MVP Validation)
Upon release of v1.0, we will consider the project successful if:
1.  **Performance:** App launches in < 3 seconds after data load.
2.  **Data Integrity:** No user reports missing walk logs after closing/opening app.
3.  **Simplicity:** User can log a walk in under 30 seconds without reading documentation.

---

## 7. Next Steps (Post-MVP)
*   **Cloud Sync:** Implement Tauri plugin for encrypted cloud sync (e.g., AWS S3 or custom API).
*   **Geolocation:** Add GPS integration to automatically log distance/location.
*   **Health Integration:** Connect with Apple Health/Google Fit to aggregate steps.