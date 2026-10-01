use tauri_plugin_sql::{Migration, MigrationKind};

const DB_URL: &str = "sqlite:dogwalk.db";

/// Initial schema SQL (kept as a const so unit tests can assert safety invariants).
const MIGRATION_V1_SQL: &str = r#"
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS dogs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    name TEXT NOT NULL,
                    breed TEXT,
                    weight_kg REAL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                );

                CREATE TABLE IF NOT EXISTS walks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dog_id INTEGER NOT NULL,
                    date DATE NOT NULL,
                    duration_minutes INTEGER,
                    distance_km REAL DEFAULT 0.0,
                    notes TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (dog_id) REFERENCES dogs(id),
                    UNIQUE(dog_id, date)
                );

                CREATE TABLE IF NOT EXISTS goals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dog_id INTEGER NOT NULL,
                    target_distance_weekly REAL,
                    target_walks_per_week INTEGER,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (dog_id) REFERENCES dogs(id)
                );

                CREATE INDEX IF NOT EXISTS idx_walks_date ON walks(date);
            "#;

/// V2: small profile picture per dog, stored as a base64 data URL (~5-10 KB).
const MIGRATION_V2_SQL: &str = r#"
                ALTER TABLE dogs ADD COLUMN photo TEXT;
            "#;

/// V3: optional local time of day ("HH:MM") the walk started.
const MIGRATION_V3_SQL: &str = r#"
                ALTER TABLE walks ADD COLUMN start_time TEXT;
            "#;

/// V4: local care schedules and the most recent completion per task.
const MIGRATION_V4_SQL: &str = r#"
                CREATE TABLE IF NOT EXISTS care_tasks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    dog_id INTEGER NOT NULL,
                    name TEXT NOT NULL CHECK(length(trim(name)) > 0),
                    due_date TEXT NOT NULL,
                    notes TEXT,
                    repeat_days INTEGER CHECK(repeat_days IS NULL OR
                        (typeof(repeat_days) = 'integer' AND repeat_days > 0)),
                    last_completed_at TEXT,
                    completed_at TEXT,
                    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (dog_id) REFERENCES dogs(id),
                    CHECK(completed_at IS NULL OR repeat_days IS NULL)
                );
                CREATE INDEX IF NOT EXISTS idx_care_tasks_dog_due
                    ON care_tasks(dog_id, due_date);
            "#;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {name}! Welcome to Dog Walk Tracker.")
}

/// Confirms the backend is reachable from the frontend during scaffolding.
#[tauri::command]
fn db_url() -> String {
    DB_URL.to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: MIGRATION_V1_SQL,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add_dog_photo_column",
            sql: MIGRATION_V2_SQL,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add_walk_start_time_column",
            sql: MIGRATION_V3_SQL,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_care_tasks",
            sql: MIGRATION_V4_SQL,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet, db_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn db_url_is_local_sqlite_only() {
        assert_eq!(db_url(), "sqlite:dogwalk.db");
        assert!(!db_url().contains("http"));
        assert!(!db_url().contains("://") || db_url().starts_with("sqlite:"));
    }

    #[test]
    fn greet_includes_name_and_app() {
        let msg = greet("Ada");
        assert!(msg.contains("Ada"));
        assert!(msg.contains("Dog Walk Tracker"));
    }

    #[test]
    fn migration_sql_uses_safe_ddl_patterns() {
        let sql = MIGRATION_V1_SQL.to_uppercase();
        assert!(sql.contains("CREATE TABLE"));
        assert!(sql.contains("UNIQUE(DOG_ID, DATE)"));
        // No dynamic string concat / unsafe DROP of unrelated tables
        assert!(!sql.contains("DROP TABLE"));
        assert!(!sql.contains(";--"));
        assert!(!sql.contains("ATTACH DATABASE"));
    }

    #[test]
    fn migration_v2_uses_safe_ddl_patterns() {
        let sql = MIGRATION_V2_SQL.to_uppercase();
        assert!(sql.contains("ALTER TABLE DOGS ADD COLUMN PHOTO TEXT"));
        assert!(!sql.contains("DROP TABLE"));
        assert!(!sql.contains(";--"));
        assert!(!sql.contains("ATTACH DATABASE"));
    }

    #[test]
    fn migration_v3_uses_safe_ddl_patterns() {
        let sql = MIGRATION_V3_SQL.to_uppercase();
        assert!(sql.contains("ALTER TABLE WALKS ADD COLUMN START_TIME TEXT"));
        assert!(!sql.contains("DROP TABLE"));
        assert!(!sql.contains(";--"));
        assert!(!sql.contains("ATTACH DATABASE"));
    }

    #[test]
    fn migration_v4_uses_safe_ddl_patterns() {
        let sql = MIGRATION_V4_SQL.to_uppercase();
        assert!(sql.contains("CREATE TABLE IF NOT EXISTS CARE_TASKS"));
        assert!(sql.contains("FOREIGN KEY (DOG_ID) REFERENCES DOGS(ID)"));
        assert!(sql.contains("ON CARE_TASKS(DOG_ID, DUE_DATE)"));
        assert!(!sql.contains("DROP TABLE"));
        assert!(!sql.contains("ATTACH DATABASE"));
        assert!(!sql.contains(";--"));
    }
}
