import { create } from "zustand";
import type { CareTask, CreateCareTaskInput, UpdateCareTaskInput, DailyStats, Dog, Goal, Walk } from "../types";
import * as db from "../lib/db";
import { getDailyStats } from "../lib/stats";

interface AppState {
  ready: boolean;
  error: string | null;
  dogs: Dog[];
  walks: Walk[];
  careTasks: CareTask[];
  goal: Goal | null;
  selectedDogId: number | null;
  isCreatingDog: boolean;
  stats: DailyStats;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  selectDog: (id: number) => void;
  startCreateDog: () => void;
  addDog: (input: {
    name: string;
    breed?: string;
    weight_kg?: number;
    photo?: string | null;
  }) => Promise<void>;
  updateDog: (input: {
    id: number;
    name: string;
    breed?: string;
    weight_kg?: number;
    photo?: string | null;
  }) => Promise<void>;
  addWalk: (input: {
    dog_id: number;
    date: string;
    start_time?: string;
    duration_minutes?: number;
    distance_km?: number;
    notes?: string;
  }) => Promise<void>;
  updateWalk: (input: {
    id: number;
    date: string;
    start_time?: string;
    duration_minutes?: number;
    distance_km: number;
    notes?: string;
  }) => Promise<void>;
  removeWalk: (id: number) => Promise<void>;
  saveGoal: (input: {
    dog_id: number;
    target_distance_weekly?: number | null;
    target_walks_per_week?: number | null;
  }) => Promise<void>;
  addCareTask: (input: CreateCareTaskInput) => Promise<void>;
  updateCareTask: (input: UpdateCareTaskInput) => Promise<void>;
  completeCareTask: (id: number, dogId: number) => Promise<void>;
  reopenCareTask: (id: number, dogId: number) => Promise<void>;
  removeCareTask: (id: number, dogId: number) => Promise<void>;
  clearAllData: () => Promise<void>;
}

const emptyStats: DailyStats = {
  total_walks_week: 0,
  total_distance_week: 0,
  streak_days: 0,
  avg_distance_week: 0,
};

// Invalidates older refreshes, including ones still loading dog records.
let refreshVersion = 0;

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  error: null,
  dogs: [],
  walks: [],
  careTasks: [],
  goal: null,
  selectedDogId: null,
  isCreatingDog: false,
  stats: emptyStats,

  init: async () => {
    try {
      const ok = await db.pingDb();
      if (!ok) {
        throw new Error("Walks table missing after migration");
      }
      await get().refresh();
      set({ ready: true, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ ready: false, error: message });
    }
  },

  refresh: async () => {
    const version = ++refreshVersion;
    let { selectedDogId, isCreatingDog } = get();
    const dogs = await db.listDogs();
    if (version !== refreshVersion) return;

    if (
      selectedDogId != null &&
      !dogs.some((dog) => dog.id === selectedDogId)
    ) {
      selectedDogId = null;
      isCreatingDog = false;
    }

    if (!isCreatingDog && selectedDogId == null) {
      selectedDogId = dogs[0]?.id ?? null;
    }

    const [walks, goal, careTasks] = selectedDogId != null
      ? await Promise.all([
          db.listWalks(selectedDogId),
          db.getGoalForDog(selectedDogId),
          db.listCareTasks(selectedDogId),
        ])
      : [[], null, []];
    if (version !== refreshVersion) return;

    set({
      dogs,
      walks,
      careTasks,
      goal,
      error: null,
      selectedDogId,
      isCreatingDog,
      stats: getDailyStats(walks),
    });
  },

  selectDog: (id) => {
    set({ selectedDogId: id, isCreatingDog: false, walks: [], careTasks: [], goal: null, stats: emptyStats });
    const pending = get().refresh();
    const version = refreshVersion;
    void pending.catch((err: unknown) => {
      if (version === refreshVersion) {
        set({ error: err instanceof Error ? err.message : String(err) });
      }
    });
  },

  startCreateDog: () => {
    ++refreshVersion;
    set({
      isCreatingDog: true,
      selectedDogId: null,
      walks: [],
      careTasks: [],
      goal: null,
      stats: emptyStats,
    });
  },

  addDog: async (input) => {
    const id = await db.addDog(input);
    set({
      selectedDogId: id,
      isCreatingDog: false,
      walks: [],
      careTasks: [],
      goal: null,
      stats: emptyStats,
    });
    await get().refresh();
  },

  updateDog: async (input) => {
    await db.updateDog(input);
    await get().refresh();
  },

  addWalk: async (input) => {
    await db.createWalk(input);
    await get().refresh();
  },

  updateWalk: async (input) => {
    await db.updateWalk(input);
    await get().refresh();
  },

  removeWalk: async (id) => {
    await db.deleteWalk(id);
    await get().refresh();
  },

  saveGoal: async (input) => {
    await db.upsertGoal(input);
    await get().refresh();
  },

  addCareTask: async (input) => {
    await db.createCareTask(input);
    await get().refresh();
  },

  updateCareTask: async (input) => {
    await db.updateCareTask(input);
    await get().refresh();
  },

  completeCareTask: async (id, dogId) => {
    await db.completeCareTask(id, dogId);
    await get().refresh();
  },

  reopenCareTask: async (id, dogId) => {
    await db.reopenCareTask(id, dogId);
    await get().refresh();
  },

  removeCareTask: async (id, dogId) => {
    await db.deleteCareTask(id, dogId);
    await get().refresh();
  },

  clearAllData: async () => {
    ++refreshVersion;
    await db.clearAllData();
    set({
      selectedDogId: null,
      isCreatingDog: false,
      walks: [],
      careTasks: [],
      goal: null,
      stats: emptyStats,
    });
    await get().refresh();
  },
}));
