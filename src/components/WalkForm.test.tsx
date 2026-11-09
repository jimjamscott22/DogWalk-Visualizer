import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WalkForm } from "./WalkForm";
import type { Walk } from "../types";

const multilineNotes = "First line\nSecond line\nThird line\nFourth line";
const walk: Walk = {
  id: 1,
  dog_id: 1,
  date: "2026-10-04",
  start_time: null,
  duration_minutes: 30,
  distance_km: 2,
  notes: multilineNotes,
  created_at: "2026-10-04T00:00:00Z",
};

function formProps() {
  return {
    dogId: 1,
    editing: null as Walk | null,
    onCreate: vi.fn().mockResolvedValue(undefined),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onCancelEdit: vi.fn(),
    onStatus: vi.fn(),
  };
}

beforeEach(() => {
  // jsdom has no layout engine: model content height and a two-row baseline.
  vi.spyOn(HTMLTextAreaElement.prototype, "scrollHeight", "get")
    .mockImplementation(function (this: HTMLTextAreaElement) {
      return Math.max(40, this.value.split("\n").length * 20);
    });
  vi.spyOn(HTMLTextAreaElement.prototype, "offsetHeight", "get")
    .mockReturnValue(42);
  vi.spyOn(HTMLTextAreaElement.prototype, "clientHeight", "get")
    .mockReturnValue(40);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WalkForm notes auto-grow", () => {
  it("grows and shrinks with input without CSS field-sizing", () => {
    render(<WalkForm {...formProps()} />);
    const notes = screen.getByRole("textbox", { name: "Notes" });
    expect(notes.style.height).toBe("42px");

    fireEvent.change(notes, { target: { value: multilineNotes } });
    expect(notes.style.height).toBe("82px");

    fireEvent.change(notes, { target: { value: "Short note" } });
    expect(notes.style.height).toBe("42px");
  });

  it("resizes loaded notes and shrinks when editing is cancelled", () => {
    const props = formProps();
    const { rerender } = render(<WalkForm {...props} editing={walk} />);
    const notes = screen.getByRole("textbox", { name: "Notes" });
    expect(notes).toHaveValue(multilineNotes);
    expect(notes.style.height).toBe("82px");

    rerender(<WalkForm {...props} />);
    expect(notes).toHaveValue("");
    expect(notes.style.height).toBe("42px");
  });

  it("saves multiline notes and shrinks after a successful submit", async () => {
    const props = formProps();
    render(<WalkForm {...props} />);
    const notes = screen.getByRole("textbox", { name: "Notes" });
    fireEvent.change(notes, { target: { value: multilineNotes } });

    fireEvent.submit(screen.getByRole("button", { name: "Log walk" }).closest("form")!);

    await waitFor(() => expect(props.onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ notes: multilineNotes }),
    ));
    await waitFor(() => expect(notes).toHaveValue(""));
    expect(notes.style.height).toBe("42px");
  });

  it("remeasures the height when the window is resized", () => {
    render(<WalkForm {...formProps()} />);
    const notes = screen.getByRole("textbox", { name: "Notes" });
    Object.defineProperty(notes, "scrollHeight", { value: 100, configurable: true });

    fireEvent(window, new Event("resize"));

    expect(notes.style.height).toBe("102px");
  });
});

describe("WalkForm saves", () => {
  it.each([
    ["us", 1.0123],
    ["metric", 1.0123],
    ["us", 0.02],
    ["metric", 0],
  ] as const)("preserves %s distance %s when editing notes", async (unitSystem, distance_km) => {
    const props = formProps();
    render(<WalkForm {...props} editing={{ ...walk, distance_km }} unitSystem={unitSystem} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Notes" }), { target: { value: "Updated" } });
    const save = screen.getByRole("button", { name: "Save changes" });
    expect(save.closest("form")?.checkValidity()).toBe(true);
    fireEvent.click(save);

    await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ distance_km, notes: "Updated" }),
    ));
  });

  it("converts a changed distance back to kilometers", async () => {
    const props = formProps();
    render(<WalkForm {...props} editing={walk} unitSystem="us" />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Distance (mi)" }), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(props.onUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ distance_km: 3.218688 }),
    ));
  });

  it.each([false, true])("keeps the form on a duplicate date (editing=%s)", async (editing) => {
    const props = formProps();
    const save = editing ? props.onUpdate : props.onCreate;
    save.mockRejectedValueOnce("UNIQUE constraint failed: walks.dog_id, walks.date");
    render(<WalkForm {...props} editing={editing ? walk : null} />);
    const notes = screen.getByRole("textbox", { name: "Notes" });
    fireEvent.change(notes, { target: { value: "Keep this draft" } });
    fireEvent.click(screen.getByRole("button", { name: editing ? "Save changes" : "Log walk" }));

    await waitFor(() => expect(props.onStatus).toHaveBeenCalledWith(
      expect.stringContaining("Edit the existing entry in walk history"),
    ));
    expect(notes).toHaveValue("Keep this draft");
    expect(props.onCancelEdit).not.toHaveBeenCalled();
  });
});
