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