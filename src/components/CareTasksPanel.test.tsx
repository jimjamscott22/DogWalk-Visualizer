import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ask } from "@tauri-apps/plugin-dialog";
import { CareTasksPanel } from "./CareTasksPanel";
import type { CareTask } from "../types";

vi.mock("@tauri-apps/plugin-dialog", () => ({ ask: vi.fn() }));
const baseTask: CareTask = {
  id: 1, dog_id: 1, name: "Give bath", due_date: "2026-09-30", notes: "Gentle shampoo",
  repeat_days: 14, last_completed_at: "2026-09-16T12:00:00Z", completed_at: null, created_at: "2026-09-01",
};
function props(tasks: CareTask[] = []) {
  return { dogId: 1, dogName: "Dozer", tasks,
    onCreate: vi.fn().mockResolvedValue(undefined), onUpdate: vi.fn().mockResolvedValue(undefined),
    onComplete: vi.fn().mockResolvedValue(undefined), onReopen: vi.fn().mockResolvedValue(undefined), onDelete: vi.fn().mockResolvedValue(undefined) };
}
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe("CareTasksPanel", () => {
  it("creates a custom task with notes and repeat days, then resets the form", async () => {
    const user = userEvent.setup(); const callbacks = props();
    render(<CareTasksPanel {...callbacks} />);
    await user.type(screen.getByLabelText("Task name"), "  Clean ears  ");
    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2026-10-01" } });
    await user.type(screen.getByLabelText(/repeat every/i), "7");
    await user.type(screen.getByLabelText("Notes"), "  Cotton pads  ");
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(callbacks.onCreate).toHaveBeenCalledWith({ dog_id: 1, name: "Clean ears", due_date: "2026-10-01", notes: "Cotton pads", repeat_days: 7 });
    expect(screen.getByLabelText("Task name")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("Care task added");
  });

  it("gives the repeat field a concise name and separate description", () => {
    render(<CareTasksPanel {...props()} />);
    expect(screen.getByRole("spinbutton", { name: "Repeat every (days)", exact: true }))
      .toHaveAccessibleDescription("Leave blank for a one-time task. Repeats start from the day you mark it done.");
  });

  it("suggestions fill only the task name", async () => {
    const user = userEvent.setup(); render(<CareTasksPanel {...props()} />);
    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2026-10-01" } });
    await user.click(screen.getByRole("button", { name: "Trim Nails", exact: true }));
    expect(screen.getByLabelText("Task name")).toHaveValue("Trim Nails");
    expect(screen.getByLabelText(/repeat every/i)).toHaveValue(null);
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-10-01");
  });

  it("validates a blank name, missing due date and fractional repeat", async () => {
    const user = userEvent.setup(); const callbacks = props();
    render(<CareTasksPanel {...callbacks} />);
    await user.type(screen.getByLabelText("Task name"), "   ");
    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "" } });
    await user.type(screen.getByLabelText(/repeat every/i), "1.5");
    // Submit directly so the test also exercises validation beyond native constraints.
    fireEvent.submit(screen.getByRole("button", { name: "Add task" }).closest("form")!);
    expect(await screen.findByText("Task name is required")).toBeInTheDocument();
    expect(screen.getByText("A valid due date is required")).toBeInTheDocument();
    expect(screen.getByText("Repeat interval must be a positive whole number")).toBeInTheDocument();
    expect(callbacks.onCreate).not.toHaveBeenCalled();
  });

  it("preserves entered values when saving fails", async () => {
    const user = userEvent.setup(); const callbacks = props();
    callbacks.onCreate.mockRejectedValueOnce(new Error("disk full"));
    render(<CareTasksPanel {...callbacks} />);
    await user.click(screen.getByRole("button", { name: "Give bath", exact: true }));
    await user.click(screen.getByRole("button", { name: "Add task" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("disk full");
    expect(screen.getByLabelText("Task name")).toHaveValue("Give bath");
    expect(screen.getByRole("button", { name: "Add task" })).toBeEnabled();
  });

  it("edits an existing task and cancels back to an empty form", async () => {
    const user = userEvent.setup(); const callbacks = props([baseTask]);
    render(<CareTasksPanel {...callbacks} />);
    await user.click(screen.getByRole("button", { name: "Edit: Give bath" }));
    expect(screen.getByLabelText(/repeat every/i)).toHaveValue(14);
    await user.clear(screen.getByLabelText("Task name"));
    await user.type(screen.getByLabelText("Task name"), "Bath time");
    await user.click(screen.getByRole("button", { name: "Save task changes" }));
    expect(callbacks.onUpdate).toHaveBeenCalledWith({ id: 1, dog_id: 1, name: "Bath time", due_date: baseTask.due_date, repeat_days: 14, notes: "Gentle shampoo" });
    await user.click(screen.getByRole("button", { name: "Edit: Give bath" }));
    await user.click(screen.getByRole("button", { name: "Cancel", exact: true }));
    expect(screen.getByLabelText("Task name")).toHaveValue("");
  });

  it("sorts unfinished tasks and displays due status and last done", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 30, 12));
    render(<CareTasksPanel {...props([
      { ...baseTask, id: 3, name: "Future", due_date: "2026-10-01" },
      baseTask,
      { ...baseTask, id: 2, name: "Old", due_date: "2026-09-20" },
      { ...baseTask, id: 4, dog_id: 2, name: "Other dog" },
    ])} />);
    const rows = within(screen.getByRole("list", { name: "Upcoming care tasks" })).getAllByRole("listitem");
    expect(rows.map((row) => row.querySelector("p")?.textContent)).toEqual(["Old", "Give bath", "Future"]);
    expect(within(rows[0]).getByText(/Overdue/)).toBeInTheDocument();
    expect(within(rows[1]).getByText("Due today")).toBeInTheDocument();
    expect(within(rows[1]).getByText(/Last done/)).toBeInTheDocument();
    expect(screen.queryByText("Other dog")).not.toBeInTheDocument();
  });

  it("marks a task done and disables actions during the write", async () => {
    const user = userEvent.setup(); const callbacks = props([baseTask]);
    let resolve!: () => void;
    callbacks.onComplete.mockImplementation(() => new Promise<void>((done) => { resolve = done; }));
    render(<CareTasksPanel {...callbacks} />);
    await user.click(screen.getByRole("button", { name: "Mark done: Give bath" }));
    expect(callbacks.onComplete).toHaveBeenCalledWith(1, 1);
    expect(screen.getByRole("button", { name: "Delete: Give bath" })).toBeDisabled();
    expect(screen.getByLabelText("Task name")).toBeDisabled();
    await act(async () => { resolve(); });
    expect(screen.getByRole("status")).toHaveTextContent("next due date scheduled");
  });

  it("keeps finished one-time tasks collapsed and allows reopening", async () => {
    const user = userEvent.setup(); const callbacks = props([{ ...baseTask, repeat_days: null, completed_at: "2026-09-30T12:00:00Z" }]);
    render(<CareTasksPanel {...callbacks} />);
    const details = screen.getByText("Done (1)").closest("details")!;
    expect(details).not.toHaveAttribute("open");
    await user.click(screen.getByText("Done (1)"));
    await user.click(screen.getByRole("button", { name: "Reopen: Give bath" }));
    expect(callbacks.onReopen).toHaveBeenCalledWith(1, 1);
    expect(screen.getByRole("status")).toHaveTextContent("reopened");
  });

  it("confirms deletion, honors cancellation, and surfaces failures", async () => {
    const user = userEvent.setup(); const callbacks = props([baseTask]);
    vi.mocked(ask).mockResolvedValueOnce(false).mockResolvedValueOnce(true).mockResolvedValueOnce(true);
    render(<CareTasksPanel {...callbacks} />);
    await user.click(screen.getByRole("button", { name: "Delete: Give bath" }));
    expect(callbacks.onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete: Give bath" }));
    expect(callbacks.onDelete).toHaveBeenCalledWith(1, 1);
    callbacks.onDelete.mockRejectedValueOnce(new Error("database locked"));
    await user.click(screen.getByRole("button", { name: "Delete: Give bath" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("database locked");
  });

  it("resets draft and edit state when switching dogs", async () => {
    const user = userEvent.setup(); const callbacks = props([baseTask]);
    const { rerender } = render(<CareTasksPanel {...callbacks} />);
    await user.click(screen.getByRole("button", { name: "Edit: Give bath" }));
    rerender(<CareTasksPanel {...callbacks} dogId={2} dogName="Ziggy" tasks={[]} />);
    expect(screen.getByLabelText("Task name")).toHaveValue("");
    expect(screen.getByRole("heading", { name: "Add care task" })).toBeInTheDocument();
  });

  it("refreshes due labels across midnight and on focus", () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date(2026, 8, 30, 23, 59, 59));
    render(<CareTasksPanel {...props([baseTask])} />);
    expect(screen.getByText("Due today")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1200); });
    expect(screen.getByText(/Overdue ·/)).toBeInTheDocument();
    vi.setSystemTime(new Date(2026, 8, 30, 12));
    fireEvent.focus(window);
    expect(screen.getByText("Due today")).toBeInTheDocument();
  });

  it("does not report completion when its write fails", async () => {
    const user = userEvent.setup(); const callbacks = props([baseTask]);
    callbacks.onComplete.mockRejectedValueOnce(new Error("write failed"));
    render(<CareTasksPanel {...callbacks} />);
    await user.click(screen.getByRole("button", { name: "Mark done: Give bath" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("write failed");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Mark done: Give bath" })).toBeEnabled());
  });
});
