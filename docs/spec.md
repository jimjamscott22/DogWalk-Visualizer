

# Project Specification: Dog Walk Tracker 1.0

| Document Version | 1.0 |
| :--- | :--- |
| **Project Name** | Dog Walk Tracker |
| **Platform** | Desktop (Windows, macOS, Linux) |
| **Tech Stack** | Tauri v2 + Rust (Backend/Logic), Web Frontend (React/Vue) |
| **Complexity Level** | Simple / MVP |
| **Status** | Draft / Planning |

---

## 1. Overview
The Dog Walk Tracker is a lightweight, desktop-first application designed to help dog owners establish and maintain a consistent walking routine for their pets. By simplifying the act of logging walks, this tool aims to promote better health outcomes for dogs (specifically weight management and cardiovascular health) through data visibility and habit reinforcement.

The application prioritizes privacy by keeping all user data local to the machine and utilizes the Rust ecosystem via Tauri for high performance and a native feel without the overhead of full native development.

## 2. Problem Statement
Dog owners often struggle with consistency in pet care routines. Specifically:
*   **Lack of Tracking:** Owners frequently forget how many walks they are taking or how long/active they last.
*   **Motivation Decay:** Without visual progress, owners may revert to sporadic walking habits.
*   **Health Monitoring:** Veterinarians often need objective data on activity levels to advise on weight loss or health improvements, but manual logs are unreliable.
*   **Platform Friction:** Existing solutions are often web-only (requiring login/account creation), mobile-focused (interrupting workflow), or overly complex fitness apps that focus more on the human athlete than the dog's routine.

## 3. Goals
### Primary Goal
To provide a frictionless, local-first desktop application that allows users to log daily dog walks and visualize their consistency over time.

### Key Objectives
1.  **Simplicity:** Reduce the steps required to log a walk to under 3 clicks.
2.  **Privacy:** Ensure no data is sent to external servers; all storage is local SQLite.
3.  **Health Awareness:** Provide simple metrics (total distance, frequency) that encourage weight loss and health goals.
4.  **Native Feel:** Deliver a desktop application experience that integrates with the OS (tray icon, system notifications) rather than feeling like a website in a browser window.

## 4. Target Users
*   **Primary Persona: The Casual Caretaker**
    *   *Profile:* Owns one or two dogs, wants to ensure they are active enough but isn't a fitness tracker enthusiast.
    *   *Needs:* A simple button to "I walked the dog today." Wants to see a history of streaks.
*   **Secondary Persona: The Health-Conscious Owner**
    *   *Profile:* Managing a dog's weight loss journey or recovering from joint issues.
    *   *Needs:* Detailed views of distance, time, and consistency to share with a vet.

## 5. Core Features
1.  **Dashboard:** View today's status (walked/not walked) and a simple weekly activity graph.
2.  **Walk Logging:** Input fields for Date, Duration, Distance, and Notes. "Quick Add" button for immediate logging.
3.  **Dog Management:** Ability to add multiple dogs to the profile with distinct tracking profiles.
4.  **History View:** Filterable list of past walks sorted by date.
5.  **Local Statistics:** Calculated averages (e.g., Avg Distance, Total Walks this Month).
6.  **Reminders:** Simple system tray notifications prompting daily logging (optional).

## 6. Non-Goals (Out of Scope for v1)
*   **Social Features:** No user accounts, leaderboards, or sharing to social media.
*   **GPS Integration:** No automatic mapping integration in MVP to keep it lightweight; manual distance input is sufficient for simple tracking.
*   **Multi-Device Sync:** Data stays on the local machine. No cloud backup in v1.
*   **Complex Auth:** No email/password login required. The app identifies the user by installation profile.
*   **Mobile Web:** The application is strictly a desktop binary.

## 7. MVP Scope (Minimum Viable Product)
The first release will focus solely on data entry and local visualization.

**Functional Requirements:**
1.  **Onboarding:** One-time setup to name the user's profile and add their dog(s).
2.  **CRUD Walks:** Create, Read, Update, Delete walk records.
3.  **Dashboard UI:** Main view showing current streak and a list of recent walks.
4.  **Data Persistence:** All data stored locally using SQLite via Rust.

**Technical Constraints:**
*   Build size < 50MB (excluding dependencies).
*   Cold start time < 2 seconds.
*   Support for Windows 10/11, macOS 13+, and Linux (x86_64).

## 8. Data Model
The application will use a local-first architecture. We recommend **SQLite** via the `tauri-plugin-sqlite` for robustness and ease of migration.

### Entities
1.  **User_Profile**: Stores settings, app configuration.
2.  **Dog**: Stores dog name, breed (optional), weight (optional), target weight.
3.  **Walk**: The transaction record.

### Schema Draft
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE dogs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    name TEXT NOT NULL,
    weight_kg REAL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE walks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dog_id INTEGER NOT NULL,
    date DATE NOT NULL,
    duration_minutes INTEGER,
    distance_km REAL DEFAULT 0.0,
    notes TEXT,
    FOREIGN KEY (dog_id) REFERENCES dogs(id),
    UNIQUE(dog_id, date) -- One walk entry per day per dog allowed
);

-- Index for performance on history queries
CREATE INDEX idx_walks_date ON walks(date);
```

## 9. API Plan (Internal IPC)
Since this is a Desktop application using Tauri, the "API" consists of **Rust Backend Commands** exposed to the **Frontend** via IPC (Inter-Process Communication). We will not use REST/HTTP for internal calls.

### Architecture Pattern
*   **Frontend:** React (TypeScript) + Tailwind CSS (UI logic handled here).
*   **Backend:** Rust (`tauri::commands`).
*   **Communication:** JSON over Tauri IPC channels.

### Command Endpoints
1.  `db.init`: Initialize database schema on app launch.
2.  `dog.add`: Insert new dog record.
3.  `walk.create`: Insert a new walk log.
4.  `walk.list`: Fetch all walks, optionally filtered by dog_id or date range.
5.  `walk.delete`: Remove a specific log entry (soft delete preferred).
6.  `stats.get_daily`: Aggregate data for the dashboard (total walks this week).

**Security Note:** All IPC communication is handled securely within the Tauri sandbox. No external network requests are permitted by default; if HTTPS is required, it must be explicitly allowed via `tauri.conf.json`.

## 10. Risks & Mitigation

| Risk | Impact | Probability | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Data Loss** (Corruption) | High | Medium | Implement automatic database backups (copy to app data folder on exit). Use WAL mode for SQLite. |
| **User Friction** (Too many clicks) | High | Medium | Strict adherence to "3-click" rule for logging. Default values for common fields (e.g., default 0.5km if not tracked). |
| **Platform Specific Bugs** | Medium | Medium | Use CI/CD pipeline with `cargo tauri build` targeting Windows, macOS, and Linux to catch OS-specific issues early. |
| **Privacy Concerns** | Medium | High | Clearly state in App Settings that data is local-only. Add a "Clear All Data" button with a confirmation dialog. |
| **Rust Dependency Bloat** | Low | High | Use `cargo-deps` or strict dependency management to ensure binary size remains small as per MVP constraints. |

## 11. Success Metrics (Post-Launch)
*   **Retention:** >60% of users return the day after initial install.
*   **Data Integrity:** <1% data loss incidents reported.
*   **Performance:** App launch time consistent across hardware benchmarks.