import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "./appStore";
import * as db from "../lib/db";
import type { CareTask, Dog } from "../types";

vi.mock("../lib/db");
const dogs: Dog[] = [1, 2].map((id) => ({ id, name: `Dog ${id}`, user_id: null, breed: null, weight_kg: null, photo: null, created_at: "2026-09-30" }));
const task = (dog_id: number): CareTask => ({ id: dog_id, dog_id, name: `Bath ${dog_id}`, due_date: "2026-09-30", repeat_days: null, notes: null, completed_at: null, last_completed_at: null, created_at: "2026-09-30" });
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.resetAllMocks();
  useAppStore.getState().startCreateDog();
  useAppStore.setState({ ready: true, error: null, dogs, selectedDogId: 1, isCreatingDog: false, careTasks: [task(1)] });
  vi.mocked(db.listDogs).mockResolvedValue(dogs);
  vi.mocked(db.listWalks).mockResolvedValue([]);
  vi.mocked(db.getGoalForDog).mockResolvedValue(null);
  vi.mocked(db.listCareTasks).mockImplementation(async (id) => id == null ? [] : [task(id)]);
});

describe("care task store", () => {
  it("clears the previous dog's data immediately and ignores its delayed task load", async () => {
    const slow = deferred<CareTask[]>();
    vi.mocked(db.listCareTasks).mockImplementation((id) => id === 1 ? slow.promise : Promise.resolve([task(2)]));
    const first = useAppStore.getState().refresh();
    await vi.waitFor(() => expect(db.listCareTasks).toHaveBeenCalledWith(1));
    useAppStore.getState().selectDog(2);
    expect(useAppStore.getState().careTasks).toEqual([]);
    await vi.waitFor(() => expect(useAppStore.getState().careTasks).toEqual([task(2)]));
    slow.resolve([task(1)]);
    await first;
    expect(useAppStore.getState()).toMatchObject({ selectedDogId: 2, careTasks: [task(2)] });
  });

  it("ignores a delayed dog-list load after another dog is selected", async () => {
    const slow = deferred<Dog[]>();
    vi.mocked(db.listDogs).mockReturnValueOnce(slow.promise);
    const first = useAppStore.getState().refresh();
    useAppStore.getState().selectDog(2);
    await vi.waitFor(() => expect(useAppStore.getState().careTasks).toEqual([task(2)]));
    slow.resolve(dogs);
    await first;
    expect(db.listCareTasks).not.toHaveBeenCalledWith(1);
    expect(useAppStore.getState().selectedDogId).toBe(2);
  });

  it("invalidates a pending load when starting dog creation", async () => {
    const slow = deferred<CareTask[]>();
    vi.mocked(db.listCareTasks).mockReturnValueOnce(slow.promise);
    const first = useAppStore.getState().refresh();
    await vi.waitFor(() => expect(db.listCareTasks).toHaveBeenCalled());
    useAppStore.getState().startCreateDog();
    slow.resolve([task(1)]);
    await first;
    expect(useAppStore.getState()).toMatchObject({ selectedDogId: null, isCreatingDog: true, careTasks: [] });
  });

  it("loads and refreshes the selected dog's tasks after every mutation", async () => {
    const state = useAppStore.getState();
    await state.addCareTask({ dog_id: 1, name: "Bath", due_date: "2026-09-30" });
    await state.updateCareTask({ id: 1, dog_id: 1, name: "Bath", due_date: "2026-10-01" });
    await state.completeCareTask(1, 1);
    await state.reopenCareTask(1, 1);
    await state.removeCareTask(1, 1);
    expect(db.createCareTask).toHaveBeenCalledOnce();
    expect(db.updateCareTask).toHaveBeenCalledOnce();
    expect(db.completeCareTask).toHaveBeenCalledWith(1, 1);
    expect(db.reopenCareTask).toHaveBeenCalledWith(1, 1);
    expect(db.deleteCareTask).toHaveBeenCalledWith(1, 1);
    expect(db.listCareTasks).toHaveBeenCalledTimes(5);
  });

  it("propagates mutation errors and preserves task state", async () => {
    vi.mocked(db.completeCareTask).mockRejectedValueOnce(new Error("disk full"));
    await expect(useAppStore.getState().completeCareTask(1, 1)).rejects.toThrow("disk full");
    expect(useAppStore.getState().careTasks).toEqual([task(1)]);
    expect(db.listCareTasks).not.toHaveBeenCalled();
  });

  it("surfaces selection load errors without an unhandled rejection", async () => {
    vi.mocked(db.listCareTasks).mockRejectedValueOnce(new Error("load failed"));
    useAppStore.getState().selectDog(2);
    await vi.waitFor(() => expect(useAppStore.getState().error).toBe("load failed"));
    expect(useAppStore.getState().careTasks).toEqual([]);
  });

  it("ignores stale selection errors after entering dog creation", async () => {
    const slow = deferred<CareTask[]>();
    vi.mocked(db.listCareTasks).mockReturnValueOnce(slow.promise);
    useAppStore.getState().selectDog(1);
    await vi.waitFor(() => expect(db.listCareTasks).toHaveBeenCalled());
    useAppStore.getState().startCreateDog();
    slow.reject(new Error("old error"));
    await slow.promise.catch(() => {});
    expect(useAppStore.getState().error).toBeNull();
  });

  it("clears care task state with all data", async () => {
    vi.mocked(db.listDogs).mockResolvedValue([]);
    await useAppStore.getState().clearAllData();
    expect(db.clearAllData).toHaveBeenCalledOnce();
    expect(useAppStore.getState()).toMatchObject({ dogs: [], careTasks: [], selectedDogId: null });
  });
});
