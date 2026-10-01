import Database from "@tauri-apps/plugin-sql";
import type {
  CareTask,
  CreateCareTaskInput,
  CreateDogInput,
  CreateWalkInput,
  Dog,
  Goal,
  UpdateDogInput,
  UpdateCareTaskInput,
  UpdateWalkInput,
  Walk,
} from "../types";
import { getCareTaskCompletion, normalizeCareTaskInput } from "./careTasks";

export interface BackupPayload {
  exported_at: string;
  dogs: Dog[];
  walks: Walk[];
  goals: Goal[];
  care_tasks: CareTask[];
}

export interface UpsertGoalInput {
  dog_id: number;
  target_distance_weekly?: number | null;
  target_walks_per_week?: number | null;
}

const DB_PATH = "sqlite:dogwalk.db";

let dbPromise: Promise<Database> | null = null;

/** Load (and migrate) the local SQLite database once per session. */
export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load(DB_PATH);
  }
  return dbPromise;
}

export async function listDogs(): Promise<Dog[]> {
  const db = await getDb();
  return db.select<Dog[]>("SELECT * FROM dogs ORDER BY name ASC");
}

export async function addDog(input: CreateDogInput): Promise<number> {
  const db = await getDb();
  const result = await db.execute(
    "INSERT INTO dogs (user_id, name, breed, weight_kg, photo) VALUES ($1, $2, $3, $4, $5)",
    [
      input.user_id ?? null,
      input.name,
      input.breed ?? null,
      input.weight_kg ?? null,
      input.photo ?? null,
    ],
  );
  return result.lastInsertId ?? -1;
}

export async function updateDog(input: UpdateDogInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE dogs
     SET name = $1, breed = $2, weight_kg = $3, photo = $4
     WHERE id = $5`,
    [
      input.name,
      input.breed ?? null,
      input.weight_kg ?? null,
      input.photo ?? null,
      input.id,
    ],
  );
}

export async function listWalks(dogId?: number): Promise<Walk[]> {
  const db = await getDb();
  if (dogId != null) {
    return db.select<Walk[]>(
      "SELECT * FROM walks WHERE dog_id = $1 ORDER BY date DESC, id DESC",
      [dogId],
    );
  }
  return db.select<Walk[]>("SELECT * FROM walks ORDER BY date DESC, id DESC");
}

export async function createWalk(input: CreateWalkInput): Promise<void> {
  const db = await getDb();
  // One walk per dog per day (UNIQUE). Upsert so Quick Add updates today's entry.
  await db.execute(
    `INSERT INTO walks (dog_id, date, start_time, duration_minutes, distance_km, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT(dog_id, date) DO UPDATE SET
       start_time = excluded.start_time,
       duration_minutes = excluded.duration_minutes,
       distance_km = excluded.distance_km,
       notes = excluded.notes`,
    [
      input.dog_id,
      input.date,
      input.start_time ?? null,
      input.duration_minutes ?? null,
      input.distance_km ?? 0,
      input.notes ?? null,
    ],
  );
}

export async function updateWalk(input: UpdateWalkInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE walks
     SET date = $1,
         start_time = $2,
         duration_minutes = $3,
         distance_km = $4,
         notes = $5
     WHERE id = $6`,
    [
      input.date,
      input.start_time ?? null,
      input.duration_minutes ?? null,
      input.distance_km,
      input.notes ?? null,
      input.id,
    ],
  );
}

export async function deleteWalk(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM walks WHERE id = $1", [id]);
}

export async function getGoalForDog(dogId: number): Promise<Goal | null> {
  const db = await getDb();
  const rows = await db.select<Goal[]>(
    "SELECT * FROM goals WHERE dog_id = $1 ORDER BY updated_at DESC, id DESC LIMIT 1",
    [dogId],
  );
  return rows[0] ?? null;
}

export async function listGoals(): Promise<Goal[]> {
  const db = await getDb();
  return db.select<Goal[]>("SELECT * FROM goals ORDER BY id ASC");
}

export async function upsertGoal(input: UpsertGoalInput): Promise<void> {
  const db = await getDb();
  const existing = await getGoalForDog(input.dog_id);
  const distance = input.target_distance_weekly ?? null;
  const walks = input.target_walks_per_week ?? null;

  if (existing) {
    await db.execute(
      `UPDATE goals
       SET target_distance_weekly = $1,
           target_walks_per_week = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [distance, walks, existing.id],
    );
    return;
  }

  await db.execute(
    `INSERT INTO goals (dog_id, target_distance_weekly, target_walks_per_week)
     VALUES ($1, $2, $3)`,
    [input.dog_id, distance, walks],
  );
}

export async function listCareTasks(dogId?: number): Promise<CareTask[]> {
  const db = await getDb();
  return dogId == null
    ? db.select<CareTask[]>("SELECT * FROM care_tasks ORDER BY due_date ASC, id ASC")
    : db.select<CareTask[]>(
        "SELECT * FROM care_tasks WHERE dog_id = $1 ORDER BY due_date ASC, id ASC",
        [dogId],
      );
}

export async function createCareTask(input: CreateCareTaskInput): Promise<void> {
  const values = normalizeCareTaskInput(input);
  const db = await getDb();
  await db.execute(
    `INSERT INTO care_tasks (dog_id, name, due_date, notes, repeat_days)
     VALUES ($1, $2, $3, $4, $5)`,
    [values.dog_id, values.name, values.due_date, values.notes, values.repeat_days],
  );
}

export async function updateCareTask(input: UpdateCareTaskInput): Promise<void> {
  const values = normalizeCareTaskInput(input);
  const db = await getDb();
  const result = await db.execute(
    `UPDATE care_tasks SET name = $1, due_date = $2, notes = $3, repeat_days = $4
     WHERE id = $5 AND dog_id = $6 AND completed_at IS NULL`,
    [values.name, values.due_date, values.notes, values.repeat_days, input.id, input.dog_id],
  );
  if (result.rowsAffected !== 1) throw new Error("Task was removed or completed; reload and try again");
}

export async function completeCareTask(id: number, dogId: number): Promise<void> {
  const db = await getDb();
  const tasks = await db.select<CareTask[]>(
    "SELECT * FROM care_tasks WHERE id = $1 AND dog_id = $2", [id, dogId],
  );
  const task = tasks[0];
  if (!task) throw new Error("Task no longer exists for this dog");
  const completion = getCareTaskCompletion(task);
  // Compare the schedule we read so concurrent completion/edit cannot overwrite it.
  const result = await db.execute(
    `UPDATE care_tasks SET due_date = $1, last_completed_at = $2, completed_at = $3
     WHERE id = $4 AND dog_id = $5 AND completed_at IS NULL
       AND due_date = $6 AND repeat_days IS $7 AND last_completed_at IS $8`,
    [completion.due_date, completion.last_completed_at, completion.completed_at,
      id, dogId, task.due_date, task.repeat_days, task.last_completed_at],
  );
  if (result.rowsAffected !== 1) throw new Error("Task changed while completing it; reload and try again");
}

export async function reopenCareTask(id: number, dogId: number): Promise<void> {
  const db = await getDb();
  const result = await db.execute(
    `UPDATE care_tasks SET completed_at = NULL
     WHERE id = $1 AND dog_id = $2 AND completed_at IS NOT NULL AND repeat_days IS NULL`,
    [id, dogId],
  );
  if (result.rowsAffected !== 1) throw new Error("Only a finished one-time task can be reopened");
}

export async function deleteCareTask(id: number, dogId: number): Promise<void> {
  const db = await getDb();
  const result = await db.execute("DELETE FROM care_tasks WHERE id = $1 AND dog_id = $2", [id, dogId]);
  if (result.rowsAffected !== 1) throw new Error("Task no longer exists for this dog");
}

export async function exportBackup(): Promise<BackupPayload> {
  const [dogs, walks, goals, careTasks] = await Promise.all([
    listDogs(),
    listWalks(),
    listGoals(),
    listCareTasks(),
  ]);
  return {
    exported_at: new Date().toISOString(),
    dogs,
    walks,
    goals,
    care_tasks: careTasks,
  };
}

export async function clearAllData(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM care_tasks");
  await db.execute("DELETE FROM walks");
  await db.execute("DELETE FROM goals");
  await db.execute("DELETE FROM dogs");
}

/** Smoke-test helper: ensure DB opens and schema is queryable. */
export async function pingDb(): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  return rows.some((row) => row.name === "walks");
}
