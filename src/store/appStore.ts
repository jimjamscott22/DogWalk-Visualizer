import { create } from "zustand";
import type { DailyStats, Dog, Goal, Walk } from "../types";
import * as db from "../lib/db";
import { getDailyStats } from "../lib/stats";

interface AppState {
  ready: boolean;
  error: string | null;
  dogs: Dog[];
  walks: Walk[];
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
  }) => Promise<void>;
  updateDog: (input: {
    id: number;
    name: string;
    breed?: string;
    weight_kg?: number;
  }) => Promise<void>;
  addWalk: (input: {
    dog_id: number;
    date: string;
    duration_minutes?: number;
    distance_km?: number;
    notes?: string;
  }) => Promise<void>;
  updateWalk: (input: {
    id: number;
    date: string;
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
  clearAllData: () => Promise<void>;
}

const emptyStats: DailyStats = {
  total_walks_week: 0,
  total_distance_week: 0,
  streak_days: 0,
  avg_distance_week: 0,
};

export const useAppStore = create<AppState>((set, get) => ({
  ready: false,
  error: null,
  dogs: [],
  walks: [],
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
    const dogs = await db.listDogs();
    let { selectedDogId, isCreatingDog } = get();

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

    const walks =
      selectedDogId != null ? await db.listWalks(selectedDogId) : [];
    const goal =
      selectedDogId != null ? await db.getGoalForDog(selectedDogId) : null;

    set({
      dogs,
      walks,
      goal,
      selectedDogId,
      isCreatingDog,
      stats: getDailyStats(walks),
    });
  },

  selectDog: (id) => {
    set({ selectedDogId: id, isCreatingDog: false });
    void get().refresh();
  },

  startCreateDog: () => {
    set({
      isCreatingDog: true,
      selectedDogId: null,
      walks: [],
      goal: null,
      stats: emptyStats,
    });
  },

  addDog: async (input) => {
    await db.addDog(input);
    const dogs = await db.listDogs();
    const created =
      dogs.find(
        (d) =>
          d.name === input.name &&
          (d.breed ?? undefined) === (input.breed ?? undefined),
      ) ?? dogs[dogs.length - 1];
    set({
      selectedDogId: created?.id ?? null,
      isCreatingDog: false,
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

  clearAllData: async () => {
    await db.clearAllData();
    set({
      selectedDogId: null,
      isCreatingDog: false,
      walks: [],
      goal: null,
      stats: emptyStats,
    });
    await get().refresh();
  },
}));
