// @vitest-environment node
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as db from "./db";

const sql = vi.hoisted(() => ({ load: vi.fn(), select: vi.fn(), execute: vi.fn() }));
vi.mock("@tauri-apps/plugin-sql", () => ({ default: { load: sql.load } }));

const rustSource = readFileSync(new URL("../../src-tauri/src/lib.rs", import.meta.url), "utf8");
const migrations = [1, 2, 3, 4].map((version) => {
  const match = rustSource.match(new RegExp(`const MIGRATION_V${version}_SQL: &str = r#"([\\s\\S]*?)"#;`));
  if (!match) throw new Error(`Migration ${version} missing`);
  return match[1];
});
let sqlite: DatabaseSync;
function binds(values: unknown[] = []) {
  return Object.fromEntries(values.map((value, index) => [`$${index + 1}`, value]));
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 30, 12));
  vi.clearAllMocks();
  sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  for (const migration of migrations) sqlite.exec(migration);
  sqlite.exec("INSERT INTO dogs (name) VALUES ('Dozer'), ('Ziggy')");
  sql.load.mockResolvedValue(sql);
  sql.select.mockImplementation(async (query, values) => sqlite.prepare(query).all(binds(values)));
  sql.execute.mockImplementation(async (query, values) => {
    const result = sqlite.prepare(query).run(binds(values));
    return { rowsAffected: Number(result.changes), lastInsertId: Number(result.lastInsertRowid) };
  });
});
afterEach(() => { sqlite.close(); vi.useRealTimers(); });

describe("care task SQLite operations", () => {
  it("creates, lists by dog and due date, edits, and deletes with bound values", async () => {
    await db.createCareTask({ dog_id: 1, name: " Bath ' $1 ", due_date: "2026-10-03", notes: " Shampoo ", repeat_days: 14 });
    await db.createCareTask({ dog_id: 1, name: "Brush Teeth", due_date: "2026-09-30" });
    await db.createCareTask({ dog_id: 2, name: "Trim Nails", due_date: "2026-09-29" });
    const tasks = await db.listCareTasks(1);
    expect(tasks.map((task) => task.name)).toEqual(["Brush Teeth", "Bath ' $1"]);
    expect(tasks[1].notes).toBe("Shampoo");
    await db.updateCareTask({ id: tasks[1].id, dog_id: 1, name: "Give bath", due_date: "2026-10-04" });
    const updated = (await db.listCareTasks(1))[1];
    expect(updated).toMatchObject({ name: "Give bath", due_date: "2026-10-04", repeat_days: null, notes: null });
    await expect(db.deleteCareTask(updated.id, 2)).rejects.toThrow();
    await db.deleteCareTask(updated.id, 1);
    expect(await db.listCareTasks(1)).toHaveLength(1);
    expect(await db.listCareTasks(2)).toHaveLength(1);
  });

  it("finishes and reopens a one-time task, retaining its due date and last completion", async () => {
    await db.createCareTask({ dog_id: 1, name: "Give bath", due_date: "2026-09-20" });
    const [task] = await db.listCareTasks(1);
    await db.completeCareTask(task.id, 1);
    const [done] = await db.listCareTasks(1);
    expect(done.completed_at).toBe(new Date().toISOString());
    expect(done.last_completed_at).toBe(done.completed_at);
    await expect(db.completeCareTask(task.id, 1)).rejects.toThrow("already done");
    await db.reopenCareTask(task.id, 1);
    expect((await db.listCareTasks(1))[0]).toMatchObject({ completed_at: null, last_completed_at: done.last_completed_at, due_date: "2026-09-20" });
  });

  it("atomically records a repeat completion and next date", async () => {
    await db.createCareTask({ dog_id: 1, name: "Trim Nails", due_date: "2026-08-01", repeat_days: 14 });
    const [task] = await db.listCareTasks(1);
    sql.execute.mockClear();
    await db.completeCareTask(task.id, 1);
    expect(sql.execute).toHaveBeenCalledTimes(1);
    expect((await db.listCareTasks(1))[0]).toMatchObject({ due_date: "2026-10-14", completed_at: null, last_completed_at: new Date().toISOString() });
    await expect(db.reopenCareTask(task.id, 1)).rejects.toThrow();
  });

  it("allows only one concurrent completion of the same schedule", async () => {
    await db.createCareTask({ dog_id: 1, name: "Trim Nails", due_date: "2026-09-30", repeat_days: 14 });
    const [task] = await db.listCareTasks(1);
    const results = await Promise.allSettled([db.completeCareTask(task.id, 1), db.completeCareTask(task.id, 1)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
  });

  it("rejects invalid inputs and mutations scoped to another dog", async () => {
    await expect(db.createCareTask({ dog_id: 1, name: " ", due_date: "2026-09-30" })).rejects.toThrow();
    await expect(db.createCareTask({ dog_id: 1, name: "Bath", due_date: "2026-02-30" })).rejects.toThrow();
    await expect(db.createCareTask({ dog_id: 1, name: "Bath", due_date: "2026-09-30", repeat_days: 1.5 })).rejects.toThrow();
    await db.createCareTask({ dog_id: 1, name: "Bath", due_date: "2026-09-30" });
    const [task] = await db.listCareTasks(1);
    await expect(db.completeCareTask(task.id, 2)).rejects.toThrow();
    await expect(db.updateCareTask({ ...task, dog_id: 2 })).rejects.toThrow();
  });

  it("includes every dog's tasks in backup and clears child rows before dogs", async () => {
    await db.createCareTask({ dog_id: 1, name: "Bath", due_date: "2026-09-30" });
    await db.createCareTask({ dog_id: 2, name: "Teeth", due_date: "2026-09-30" });
    expect((await db.exportBackup()).care_tasks).toHaveLength(2);
    await db.clearAllData();
    expect(await db.listCareTasks()).toEqual([]);
    expect(await db.listDogs()).toEqual([]);
    expect(sql.execute.mock.calls.slice(-4).map(([query]) => query)).toEqual([
      "DELETE FROM care_tasks", "DELETE FROM walks", "DELETE FROM goals", "DELETE FROM dogs",
    ]);
  });

  it("propagates a database failure without claiming success", async () => {
    sql.execute.mockRejectedValueOnce(new Error("disk full"));
    await expect(db.createCareTask({ dog_id: 1, name: "Bath", due_date: "2026-09-30" })).rejects.toThrow("disk full");
    expect(await db.listCareTasks(1)).toEqual([]);
  });

  it("migration v4 preserves profiles, walk history, and goals from v3", () => {
    const upgrade = new DatabaseSync(":memory:");
    try {
      for (const migration of migrations.slice(0, 3)) upgrade.exec(migration);
      upgrade.exec("INSERT INTO dogs (name, photo) VALUES ('Dozer', 'photo-data'); INSERT INTO walks (dog_id, date, start_time, distance_km) VALUES (1, '2026-09-29', '07:30', 2); INSERT INTO goals (dog_id, target_walks_per_week) VALUES (1, 5)");
      const before = ["dogs", "walks", "goals"].map((table) => upgrade.prepare(`SELECT * FROM ${table}`).all());
      upgrade.exec(migrations[3]);
      upgrade.exec(migrations[3]);
      const after = ["dogs", "walks", "goals"].map((table) => upgrade.prepare(`SELECT * FROM ${table}`).all());
      expect(after).toEqual(before);
      expect(upgrade.prepare("SELECT * FROM care_tasks").all()).toEqual([]);
      expect(upgrade.prepare("PRAGMA index_info(idx_care_tasks_dog_due)").all().map((row) => row.name)).toEqual(["dog_id", "due_date"]);
    } finally { upgrade.close(); }
  });
});
