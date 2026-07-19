import Database from "@tauri-apps/plugin-sql";
import type {
  CreateDogInput,
  CreateWalkInput,
  Dog,
  UpdateDogInput,
  UpdateWalkInput,
  Walk,
} from "../types";

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

export async function addDog(input: CreateDogInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO dogs (user_id, name, breed, weight_kg) VALUES ($1, $2, $3, $4)",
    [
      input.user_id ?? null,
      input.name,
      input.breed ?? null,
      input.weight_kg ?? null,
    ],
  );
}

export async function updateDog(input: UpdateDogInput): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE dogs
     SET name = $1, breed = $2, weight_kg = $3
     WHERE id = $4`,
    [input.name, input.breed ?? null, input.weight_kg ?? null, input.id],
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
    `INSERT INTO walks (dog_id, date, duration_minutes, distance_km, notes)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT(dog_id, date) DO UPDATE SET
       duration_minutes = excluded.duration_minutes,
       distance_km = excluded.distance_km,
       notes = excluded.notes`,
    [
      input.dog_id,
      input.date,
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
         duration_minutes = $2,
         distance_km = $3,
         notes = $4
     WHERE id = $5`,
    [
      input.date,
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

/** Smoke-test helper: ensure DB opens and schema is queryable. */
export async function pingDb(): Promise<boolean> {
  const db = await getDb();
  const rows = await db.select<{ name: string }[]>(
    "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
  );
  return rows.some((row) => row.name === "walks");
}
