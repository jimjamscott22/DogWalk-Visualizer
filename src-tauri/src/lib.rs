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
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: MIGRATION_V1_SQL,
        kind: MigrationKind::Up,
    }];

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
}
