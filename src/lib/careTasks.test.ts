import { describe, expect, it } from "vitest";
import { addCalendarDays, formatCareDate, getCareTaskCompletion, getCareTaskDueStatus, isValidCareDate, normalizeCareTaskInput } from "./careTasks";
import type { CareTask } from "../types";

const task: CareTask = {
  id: 1, dog_id: 1, name: "Trim Nails", due_date: "2026-01-01", notes: null,
  repeat_days: 14, last_completed_at: null, completed_at: null, created_at: "2026-01-01",
};

describe("care task dates", () => {
  it.each([
    ["2026-01-31", 1, "2026-02-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2028-02-29", 1, "2028-03-01"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2026-03-07", 2, "2026-03-09"],
    ["2026-10-31", 2, "2026-11-02"],
  ])("adds calendar days: %s + %s", (date, interval, expected) => {
    expect(addCalendarDays(date, interval)).toBe(expected);
  });

  it.each(["2026-02-29", "2026-02-30", "2026-13-01", "2026-1-01", "", "invalid"])("rejects invalid date %s", (date) => {
    expect(isValidCareDate(date)).toBe(false);
  });

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])("rejects invalid repeat %s", (interval) => {
    expect(() => addCalendarDays("2026-01-01", interval)).toThrow();
  });

  it("keeps date-only display on the intended date", () => {
    expect(formatCareDate("2026-09-30")).toContain("30");
  });

  it("classifies overdue, today, and future dates", () => {
    expect(getCareTaskDueStatus("2026-09-29", "2026-09-30")).toBe("overdue");
    expect(getCareTaskDueStatus("2026-09-30", "2026-09-30")).toBe("today");
    expect(getCareTaskDueStatus("2026-10-01", "2026-09-30")).toBe("upcoming");
  });
});

describe("care task completion", () => {
  it.each(["2026-01-01", "2026-12-31"])("repeats from completion, regardless of old due date %s", (due_date) => {
    const now = new Date(2026, 8, 30, 23, 30);
    expect(getCareTaskCompletion({ ...task, due_date }, now)).toEqual({
      due_date: "2026-10-14", last_completed_at: now.toISOString(), completed_at: null,
    });
  });

  it("finishes a one-time task without changing its due date", () => {
    const now = new Date(2026, 8, 30, 12);
    expect(getCareTaskCompletion({ ...task, repeat_days: null }, now)).toEqual({
      due_date: task.due_date, last_completed_at: now.toISOString(), completed_at: now.toISOString(),
    });
  });

  it("rejects already completed tasks", () => {
    expect(() => getCareTaskCompletion({ ...task, repeat_days: null, completed_at: "2026-09-30T12:00:00Z" })).toThrow("already done");
  });

  it("trims inputs and preserves an optional repeat", () => {
    expect(normalizeCareTaskInput({ dog_id: 1, name: " Give bath ", due_date: "2026-09-30", notes: " ", repeat_days: 14 })).toEqual({
      dog_id: 1, name: "Give bath", due_date: "2026-09-30", notes: null, repeat_days: 14,
    });
    expect(() => normalizeCareTaskInput({ dog_id: 1, name: " ", due_date: "2026-09-30" })).toThrow("Task name");
  });
});
