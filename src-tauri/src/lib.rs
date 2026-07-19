use tauri_plugin_sql::{Migration, MigrationKind};

const DB_URL: &str = "sqlite:dogwalk.db";

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
            sql: r#"
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
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations(DB_URL, migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![greet, db_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
