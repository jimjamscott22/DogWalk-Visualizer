import type { CareTask, CreateCareTaskInput } from "../types";
import { todayIso } from "./stats";

export function isValidCareDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Use UTC only for arithmetic on date-only values, never to determine today. */
export function addCalendarDays(date: string, days: number): string {
  if (!isValidCareDate(date) || !Number.isSafeInteger(days) || days < 1) {
    throw new Error("Use a valid due date and a positive whole-number repeat interval");
  }
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  if (!Number.isFinite(next.getTime()) || next.getUTCFullYear() > 9999) {
    throw new Error("Repeat interval puts the next due date outside the supported range");
  }
  return next.toISOString().slice(0, 10);
}

export function normalizeCareTaskInput(input: CreateCareTaskInput): CreateCareTaskInput {
  const name = input.name.trim();
  if (!name) throw new Error("Task name is required");
  if (!isValidCareDate(input.due_date)) throw new Error("A valid due date is required");
  const repeatDays = input.repeat_days ?? null;
  if (repeatDays != null) addCalendarDays(input.due_date, repeatDays);
  return { ...input, name, notes: input.notes?.trim() || null, repeat_days: repeatDays };
}

export function getCareTaskCompletion(
  task: CareTask,
  now: Date = new Date(),
): Pick<CareTask, "due_date" | "last_completed_at" | "completed_at"> {
  if (task.completed_at != null) throw new Error("This task is already done");
  const timestamp = now.toISOString();
  const today = `${String(now.getFullYear()).padStart(4, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return {
    due_date: task.repeat_days == null ? task.due_date : addCalendarDays(today, task.repeat_days),
    last_completed_at: timestamp,
    completed_at: task.repeat_days == null ? timestamp : null,
  };
}

export function getCareTaskDueStatus(dueDate: string, today: string = todayIso()) {
  return dueDate < today ? "overdue" : dueDate === today ? "today" : "upcoming";
}

export function formatCareDate(date: string): string {
  // Local noon keeps date-only labels on the intended day in every timezone.
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}

export function formatCareTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
}
