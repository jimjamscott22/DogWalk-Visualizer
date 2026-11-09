use std::collections::HashSet;

use serde::Deserialize;
use sqlx::SqlitePool;
use tauri::State;
use tauri_plugin_sql::{DbInstances, DbPool};
use time::{
    format_description::well_known::Rfc3339, macros::format_description, Date, OffsetDateTime,
    PrimitiveDateTime, Time,
};

const EMPTY_DATABASE_ERROR: &str =
    "Restore requires an empty database. Use a fresh install or clear existing data first.";

#[derive(Deserialize)]
struct Backup {
    exported_at: String,
    dogs: Vec<Dog>,
    walks: Vec<Walk>,
    goals: Vec<Goal>,
    #[serde(default)]
    care_tasks: Vec<CareTask>,
}

#[derive(Deserialize)]
struct Dog {
    id: i64,
    user_id: Option<i64>,
    name: String,
    breed: Option<String>,
    weight_kg: Option<f64>,
    photo: Option<String>,
    created_at: String,
}

#[derive(Deserialize)]
struct Walk {
    id: i64,
    dog_id: i64,
    date: String,
    start_time: Option<String>,
    duration_minutes: Option<i64>,
    distance_km: f64,
    notes: Option<String>,
    created_at: String,
}

#[derive(Deserialize)]
struct Goal {
    id: i64,
    dog_id: i64,
    target_distance_weekly: Option<f64>,
    target_walks_per_week: Option<i64>,
    updated_at: String,
}

#[derive(Deserialize)]
struct CareTask {
    id: i64,
    dog_id: i64,
    name: String,
    due_date: String,
    notes: Option<String>,
    repeat_days: Option<i64>,
    last_completed_at: Option<String>,
    completed_at: Option<String>,
    created_at: String,
}

fn valid_date(value: &str) -> bool {
    value.len() == 10
        && Date::parse(value, format_description!("[year]-[month]-[day]"))
            .is_ok_and(|date| date.year() > 0)
}

fn valid_time(value: &str) -> bool {
    Time::parse(value, format_description!("[hour]:[minute]")).is_ok()
}

fn valid_timestamp(value: &str) -> bool {
    // The SQL plugin may format SQLite timestamps with a fractional second.
    OffsetDateTime::parse(value, &Rfc3339).is_ok()
        || PrimitiveDateTime::parse(
            value,
            format_description!("[year]-[month]-[day] [hour padding:none]:[minute]:[second][optional [.[subsecond]]]"),
        )
        .is_ok()
}

fn valid_ids(ids: impl Iterator<Item = i64>) -> bool {
    let mut seen = HashSet::new();
    ids.into_iter()
        .all(|id| (1..=9_007_199_254_740_991).contains(&id) && seen.insert(id))
}

impl Backup {
    fn parse(json: &str) -> Result<Self, String> {
        let backup: Self =
            serde_json::from_str(json).map_err(|error| format!("Invalid backup JSON: {error}"))?;
        backup.validate()?;
        Ok(backup)
    }

    fn validate(&self) -> Result<(), String> {
        if !valid_timestamp(&self.exported_at) {
            return Err("Backup has an invalid export timestamp.".into());
        }
        if !valid_ids(self.dogs.iter().map(|dog| dog.id))
            || !valid_ids(self.walks.iter().map(|walk| walk.id))
            || !valid_ids(self.goals.iter().map(|goal| goal.id))
            || !valid_ids(self.care_tasks.iter().map(|task| task.id))
        {
            return Err("Backup has an invalid or duplicate record ID.".into());
        }
        let dog_ids: HashSet<_> = self.dogs.iter().map(|dog| dog.id).collect();
        let mut walk_dates = HashSet::new();
        for dog in &self.dogs {
            if dog.user_id.is_some() {
                return Err(format!(
                    "Dog {} references a user account, which this backup cannot restore.",
                    dog.id
                ));
            }
            if dog.name.trim().is_empty()
                || dog.weight_kg.is_some_and(|weight| weight <= 0.0)
                || !valid_timestamp(&dog.created_at)
            {
                return Err(format!("Invalid dog record {}.", dog.id));
            }
        }
        for walk in &self.walks {
            if !dog_ids.contains(&walk.dog_id)
                || !valid_date(&walk.date)
                || walk
                    .start_time
                    .as_deref()
                    .is_some_and(|time| !valid_time(time))
                || walk.duration_minutes.is_some_and(|minutes| minutes <= 0)
                || walk.distance_km < 0.0
                || !valid_timestamp(&walk.created_at)
            {
                return Err(format!(
                    "Invalid walk record {}. Check its dog, date and walk details.",
                    walk.id
                ));
            }
            if !walk_dates.insert((walk.dog_id, &walk.date)) {
                return Err(format!(
                    "Backup has multiple walks for dog {} on {}.",
                    walk.dog_id, walk.date
                ));
            }
        }
        for goal in &self.goals {
            if !dog_ids.contains(&goal.dog_id)
                || goal
                    .target_distance_weekly
                    .is_some_and(|distance| distance < 0.0)
                || goal.target_walks_per_week.is_some_and(|walks| walks < 0)
                || !valid_timestamp(&goal.updated_at)
            {
                return Err(format!("Invalid goal record {}.", goal.id));
            }
        }
        for task in &self.care_tasks {
            if !dog_ids.contains(&task.dog_id)
                || task.name.trim().is_empty()
                || !valid_date(&task.due_date)
                || task
                    .repeat_days
                    .is_some_and(|days| !(1..=9_007_199_254_740_991).contains(&days))
                || (task.repeat_days.is_some() && task.completed_at.is_some())
                || task
                    .last_completed_at
                    .as_deref()
                    .is_some_and(|value| !valid_timestamp(value))
                || task
                    .completed_at
                    .as_deref()
                    .is_some_and(|value| !valid_timestamp(value))
                || !valid_timestamp(&task.created_at)
            {
                return Err(format!("Invalid care task record {}.", task.id));
            }
        }
        Ok(())
    }
}

async fn sqlite_pool(instances: &DbInstances) -> Result<SqlitePool, String> {
    match instances.0.read().await.get(crate::DB_URL) {
        Some(DbPool::Sqlite(pool)) => Ok(pool.clone()),
        _ => Err("The local database is unavailable. Restart the app and try again.".into()),
    }
}

#[tauri::command]
pub(crate) async fn clear_all_data(instances: State<'_, DbInstances>) -> Result<(), String> {
    let pool = sqlite_pool(&instances).await?;
    clear(&pool).await.map_err(|error| error.to_string())
}

async fn clear(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    let mut tx = pool.begin_with("BEGIN IMMEDIATE").await?;
    for query in [
        "DELETE FROM care_tasks",
        "DELETE FROM walks",
        "DELETE FROM goals",
        "DELETE FROM dogs",
    ] {
        sqlx::query(query).execute(&mut *tx).await?;
    }
    tx.commit().await
}

#[tauri::command]
pub(crate) async fn restore_backup(
    instances: State<'_, DbInstances>,
    json: String,
) -> Result<(), String> {
    let backup = Backup::parse(&json)?;
    let pool = sqlite_pool(&instances).await?;
    restore(&pool, backup).await
}

async fn restore(pool: &SqlitePool, backup: Backup) -> Result<(), String> {
    let mut tx = pool
        .begin_with("BEGIN IMMEDIATE")
        .await
        .map_err(restore_error)?;
    let has_data: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM dogs) OR EXISTS(SELECT 1 FROM walks)
             OR EXISTS(SELECT 1 FROM goals) OR EXISTS(SELECT 1 FROM care_tasks)",
    )
    .fetch_one(&mut *tx)
    .await
    .map_err(restore_error)?;
    if has_data {
        return Err(EMPTY_DATABASE_ERROR.into());
    }

    for dog in backup.dogs {
        sqlx::query(
            "INSERT INTO dogs (id, name, breed, weight_kg, photo, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)",
        )
        .bind(dog.id)
        .bind(dog.name)
        .bind(dog.breed)
        .bind(dog.weight_kg)
        .bind(dog.photo)
        .bind(dog.created_at)
        .execute(&mut *tx)
        .await
        .map_err(restore_error)?;
    }
    for walk in backup.walks {
        sqlx::query(
            "INSERT INTO walks (id, dog_id, date, start_time, duration_minutes, distance_km, notes, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        )
        .bind(walk.id)
        .bind(walk.dog_id)
        .bind(walk.date)
        .bind(walk.start_time)
        .bind(walk.duration_minutes)
        .bind(walk.distance_km)
        .bind(walk.notes)
        .bind(walk.created_at)
        .execute(&mut *tx)
        .await
        .map_err(restore_error)?;
    }
    for goal in backup.goals {
        sqlx::query(
            "INSERT INTO goals (id, dog_id, target_distance_weekly, target_walks_per_week, updated_at)
             VALUES ($1, $2, $3, $4, $5)",
        )
        .bind(goal.id)
        .bind(goal.dog_id)
        .bind(goal.target_distance_weekly)
        .bind(goal.target_walks_per_week)
        .bind(goal.updated_at)
        .execute(&mut *tx)
        .await
        .map_err(restore_error)?;
    }
    for task in backup.care_tasks {
        sqlx::query(
            "INSERT INTO care_tasks (id, dog_id, name, due_date, notes, repeat_days,
                                     last_completed_at, completed_at, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
        )
        .bind(task.id)
        .bind(task.dog_id)
        .bind(task.name)
        .bind(task.due_date)
        .bind(task.notes)
        .bind(task.repeat_days)
        .bind(task.last_completed_at)
        .bind(task.completed_at)
        .bind(task.created_at)
        .execute(&mut *tx)
        .await
        .map_err(restore_error)?;
    }
    tx.commit().await.map_err(restore_error)
}

fn restore_error(error: sqlx::Error) -> String {
    format!("Could not restore the backup: {error}")
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::{json, Value};
    use sqlx::sqlite::SqlitePoolOptions;

    fn exported_backup() -> Value {
        json!({
            "exported_at": "2026-11-08T15:00:00.000Z",
            "dogs": [{
                "id": 8, "user_id": null, "name": "Scout", "breed": "Mixed",
                "weight_kg": 14.5, "photo": "data:image/jpeg;base64,cGhvdG8=",
                "created_at": "2026-11-08 0:00:00.0"
            }],
            "walks": [{
                "id": 13, "dog_id": 8, "date": "2026-11-08", "start_time": "09:15",
                "duration_minutes": 35, "distance_km": 1.0123, "notes": "Trail walk",
                "created_at": "2026-11-08 10:00:00"
            }],
            "goals": [{
                "id": 5, "dog_id": 8, "target_distance_weekly": 12.5,
                "target_walks_per_week": 6, "updated_at": "2026-11-08 10:00:00"
            }],
            "care_tasks": [{
                "id": 21, "dog_id": 8, "name": "Brush teeth", "due_date": "2026-11-09",
                "notes": "New brush", "repeat_days": 7,
                "last_completed_at": "2026-11-02T10:00:00.000Z", "completed_at": null,
                "created_at": "2026-11-08 10:00:00"
            }]
        })
    }

    async fn database() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        for migration in [
            crate::MIGRATION_V1_SQL,
            crate::MIGRATION_V2_SQL,
            crate::MIGRATION_V3_SQL,
            crate::MIGRATION_V4_SQL,
        ] {
            sqlx::raw_sql(migration).execute(&pool).await.unwrap();
        }
        pool
    }

    async fn table_counts(pool: &SqlitePool) -> (i64, i64, i64, i64) {
        sqlx::query_as(
            "SELECT (SELECT COUNT(*) FROM dogs), (SELECT COUNT(*) FROM walks),
                    (SELECT COUNT(*) FROM goals), (SELECT COUNT(*) FROM care_tasks)",
        )
        .fetch_one(pool)
        .await
        .unwrap()
    }

    #[test]
    fn validates_structure_and_relationships_before_restore() {
        assert!(Backup::parse("{").is_err());
        let mut invalid = exported_backup();
        invalid["walks"][0]["date"] = json!("2026-02-30");
        assert!(Backup::parse(&invalid.to_string()).is_err());
        let mut invalid = exported_backup();
        invalid["walks"][0]["dog_id"] = json!(99);
        assert!(Backup::parse(&invalid.to_string()).is_err());
        let mut invalid = exported_backup();
        invalid["dogs"][0]["user_id"] = json!(1);
        assert!(Backup::parse(&invalid.to_string()).is_err());
        let mut invalid = exported_backup();
        let mut duplicate = invalid["walks"][0].clone();
        duplicate["id"] = json!(99);
        invalid["walks"].as_array_mut().unwrap().push(duplicate);
        assert!(Backup::parse(&invalid.to_string())
            .err()
            .unwrap()
            .contains("multiple walks"));
    }

    #[test]
    fn restores_exported_values_and_refuses_a_populated_database() {
        tauri::async_runtime::block_on(async {
            let pool = database().await;
            let exported = exported_backup();
            let backup = || Backup::parse(&exported.to_string()).unwrap();
            restore(&pool, backup()).await.unwrap();

            for (key, query) in [
                ("dogs", "SELECT json_object('id', id, 'user_id', user_id, 'name', name, 'breed', breed, 'weight_kg', weight_kg, 'photo', photo, 'created_at', created_at) FROM dogs"),
                ("walks", "SELECT json_object('id', id, 'dog_id', dog_id, 'date', date, 'start_time', start_time, 'duration_minutes', duration_minutes, 'distance_km', distance_km, 'notes', notes, 'created_at', created_at) FROM walks"),
                ("goals", "SELECT json_object('id', id, 'dog_id', dog_id, 'target_distance_weekly', target_distance_weekly, 'target_walks_per_week', target_walks_per_week, 'updated_at', updated_at) FROM goals"),
                ("care_tasks", "SELECT json_object('id', id, 'dog_id', dog_id, 'name', name, 'due_date', due_date, 'notes', notes, 'repeat_days', repeat_days, 'last_completed_at', last_completed_at, 'completed_at', completed_at, 'created_at', created_at) FROM care_tasks"),
            ] {
                let row: String = sqlx::query_scalar(query).fetch_one(&pool).await.unwrap();
                assert_eq!(serde_json::from_str::<Value>(&row).unwrap(), exported[key][0]);
            }
            assert_eq!(
                restore(&pool, backup()).await.unwrap_err(),
                EMPTY_DATABASE_ERROR
            );
            assert_eq!(table_counts(&pool).await, (1, 1, 1, 1));
            clear(&pool).await.unwrap();
            assert_eq!(table_counts(&pool).await, (0, 0, 0, 0));
        });
    }

    #[test]
    fn restores_older_exports_without_start_times_or_care_tasks() {
        tauri::async_runtime::block_on(async {
            let pool = database().await;
            let mut legacy = exported_backup();
            legacy.as_object_mut().unwrap().remove("care_tasks");
            legacy["walks"][0]
                .as_object_mut()
                .unwrap()
                .remove("start_time");
            restore(&pool, Backup::parse(&legacy.to_string()).unwrap())
                .await
                .unwrap();
            let start_time: Option<String> = sqlx::query_scalar("SELECT start_time FROM walks")
                .fetch_one(&pool)
                .await
                .unwrap();
            assert_eq!(start_time, None);
            assert_eq!(table_counts(&pool).await, (1, 1, 1, 0));
        });
    }

    #[test]
    fn rolls_back_when_a_late_write_fails() {
        tauri::async_runtime::block_on(async {
            let pool = database().await;
            let backup = || Backup::parse(&exported_backup().to_string()).unwrap();
            sqlx::query(
                "CREATE TRIGGER fail_restore BEFORE INSERT ON care_tasks
                 BEGIN SELECT RAISE(ABORT, 'forced restore failure'); END",
            )
            .execute(&pool)
            .await
            .unwrap();
            assert!(restore(&pool, backup())
                .await
                .unwrap_err()
                .contains("forced restore failure"));
            assert_eq!(table_counts(&pool).await, (0, 0, 0, 0));

            sqlx::query("DROP TRIGGER fail_restore")
                .execute(&pool)
                .await
                .unwrap();
            restore(&pool, backup()).await.unwrap();
            sqlx::query(
                "CREATE TRIGGER fail_clear BEFORE DELETE ON dogs
                 BEGIN SELECT RAISE(ABORT, 'forced clear failure'); END",
            )
            .execute(&pool)
            .await
            .unwrap();
            assert!(clear(&pool)
                .await
                .unwrap_err()
                .to_string()
                .contains("forced clear failure"));
            assert_eq!(table_counts(&pool).await, (1, 1, 1, 1));
        });
    }
}
