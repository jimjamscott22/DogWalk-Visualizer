import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ask } from "@tauri-apps/plugin-dialog";
import { DashboardShell } from "./DashboardShell";
import { useAppStore } from "../store/appStore";
import type { Dog, Walk } from "../types";

vi.mock("@tauri-apps/plugin-dialog", () => ({ ask: vi.fn(), save: vi.fn() }));
vi.mock("@tauri-apps/plugin-fs", () => ({ writeTextFile: vi.fn() }));
vi.mock("../store/appStore", () => ({ useAppStore: vi.fn() }));

const dog: Dog = {
  id: 1,
  user_id: 1,
  name: "Mochi",
  breed: null,
  weight_kg: null,
  photo: null,
  created_at: "2026-07-19T00:00:00Z",
};

const walk: Walk = {
  id: 7,
  dog_id: 1,
  date: "2026-08-02",
  start_time: null,
  duration_minutes: 30,
  distance_km: 2,
  notes: null,
  created_at: "2026-08-02T00:00:00Z",
};

const removeWalk = vi.fn();

function mockStore(overrides: Record<string, unknown> = {}) {
  const noop = vi.fn().mockResolvedValue(undefined);
  vi.mocked(useAppStore).mockReturnValue({
    ready: true,
    error: null,
    dogs: [dog],
    walks: [walk],
    careTasks: [],
    goal: null,
    selectedDogId: 1,
    isCreatingDog: false,
    stats: { total_walks_week: 0, total_distance_week: 0, streak_days: 0, avg_distance_week: 0 },
    selectDog: vi.fn(),
    startCreateDog: vi.fn(),
    addDog: noop,
    updateDog: noop,
    addWalk: noop,
    updateWalk: noop,
    removeWalk,
    saveGoal: noop,
    clearAllData: noop,
    addCareTask: noop,
    updateCareTask: noop,
    completeCareTask: noop,
    reopenCareTask: noop,
    removeCareTask: noop,
    ...overrides,
  } as never);
}

beforeEach(() => {
  removeWalk.mockReset().mockResolvedValue(undefined);
  vi.mocked(ask).mockReset();
  mockStore();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DashboardShell walk deletion", () => {
  it("does not delete when the confirmation is cancelled", async () => {
    vi.mocked(ask).mockResolvedValue(false);
    const user = userEvent.setup();
    render(<DashboardShell />);

    await user.click(screen.getByRole("button", { name: "Delete walk on 2026-08-02" }));

    expect(ask).toHaveBeenCalledOnce();
    expect(removeWalk).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("deletes after confirmation and clears the status message after 4 seconds", async () => {
    vi.mocked(ask).mockResolvedValue(true);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<DashboardShell />);

    await user.click(screen.getByRole("button", { name: "Delete walk on 2026-08-02" }));

    expect(removeWalk).toHaveBeenCalledWith(7);
    expect(await screen.findByRole("status")).toHaveTextContent("Walk deleted");

    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("DashboardShell status dismissal", () => {
  it("restarts the four-second timer when two walks produce the same status", async () => {
    const addWalk = vi.fn().mockResolvedValue(undefined);
    mockStore({ walks: [], addWalk });
    vi.useFakeTimers();
    render(<DashboardShell />);

    const form = screen.getByRole("button", { name: "Log walk" }).closest("form")!;

    await act(async () => {
      fireEvent.submit(form);
    });
    expect(addWalk).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("Walk logged");

    act(() => {
      vi.advanceTimersByTime(3500);
    });
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(addWalk).toHaveBeenCalledTimes(2);

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Walk logged");

    act(() => {
      vi.advanceTimersByTime(3499);
    });
    expect(screen.getByRole("status")).toHaveTextContent("Walk logged");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
describe("DashboardShell onboarding", () => {
  it("does not offer Clear all data when there are no dogs yet", () => {
    mockStore({ dogs: [], walks: [], selectedDogId: null });
    render(<DashboardShell />);

    expect(screen.getByRole("button", { name: /backup to json/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /clear all data/i })).not.toBeInTheDocument();
  });
});
