import { describe, expect, it } from "vitest";
import {
  buildDistanceSeries,
  buildHealthInsight,
  computeStreak,
  getDailyStats,
  startOfWeekIso,
} from "./stats";
import type { Walk } from "../types";

function walk(partial: Partial<Walk> & Pick<Walk, "date" | "distance_km">): Walk {
  return {
    id: partial.id ?? 1,
    dog_id: partial.dog_id ?? 1,
    date: partial.date,
    duration_minutes: partial.duration_minutes ?? 30,
    distance_km: partial.distance_km,
    notes: partial.notes ?? null,
    created_at: partial.created_at ?? "2026-07-01T00:00:00Z",
  };
}

describe("computeStreak", () => {
  it("returns 0 for empty dates", () => {
    expect(computeStreak([], "2026-07-19")).toBe(0);
  });

  it("counts consecutive days ending today", () => {
    expect(
      computeStreak(["2026-07-17", "2026-07-18", "2026-07-19"], "2026-07-19"),
    ).toBe(3);
  });

  it("allows streak ending yesterday if today missing", () => {
    expect(computeStreak(["2026-07-17", "2026-07-18"], "2026-07-19")).toBe(2);
  });

  it("breaks on gaps", () => {
    // Today and yesterday missing → streak 0 even if older days exist
    expect(computeStreak(["2026-07-15"], "2026-07-19")).toBe(0);
  });

  it("does not bridge a gap before yesterday", () => {
    // Ends yesterday (streak 1) but does not include 07-15 across the gap
    expect(computeStreak(["2026-07-15", "2026-07-18"], "2026-07-19")).toBe(1);
  });
});

describe("startOfWeekIso", () => {
  it("returns Monday for a Sunday", () => {
    // 2026-07-19 is Sunday
    expect(startOfWeekIso("2026-07-19")).toBe("2026-07-13");
  });

  it("returns same day for a Monday", () => {
    expect(startOfWeekIso("2026-07-13")).toBe("2026-07-13");
  });
});

describe("getDailyStats", () => {
  it("aggregates only walks in the current week", () => {
    const walks = [
      walk({ date: "2026-07-10", distance_km: 5 }), // prior week
      walk({ id: 2, date: "2026-07-14", distance_km: 1.5 }),
      walk({ id: 3, date: "2026-07-15", distance_km: 2.5 }),
    ];
    const stats = getDailyStats(walks, "2026-07-19");
    expect(stats.total_walks_week).toBe(2);
    expect(stats.total_distance_week).toBe(4);
    expect(stats.avg_distance_week).toBe(2);
  });
});

describe("buildHealthInsight", () => {
  it("computes capped progress and km per kg", () => {
    const insight = buildHealthInsight(
      {
        total_walks_week: 4,
        total_distance_week: 8,
        streak_days: 2,
        avg_distance_week: 2,
      },
      { target_walks_per_week: 5, target_distance_weekly: 10 },
      20,
    );
    expect(insight.walks_progress).toBeCloseTo(0.8);
    expect(insight.distance_progress).toBeCloseTo(0.8);
    expect(insight.km_per_kg).toBeCloseTo(0.1);
  });

  it("returns null progress when goals unset", () => {
    const insight = buildHealthInsight(
      {
        total_walks_week: 1,
        total_distance_week: 1,
        streak_days: 1,
        avg_distance_week: 1,
      },
      null,
      null,
    );
    expect(insight.walks_progress).toBeNull();
    expect(insight.distance_progress).toBeNull();
    expect(insight.km_per_kg).toBeNull();
  });
});

describe("buildDistanceSeries", () => {
  it("fills missing days with zeros", () => {
    const series = buildDistanceSeries(
      [walk({ date: "2026-07-19", distance_km: 3 })],
      3,
      "2026-07-19",
    );
    expect(series).toHaveLength(3);
    expect(series[0]?.distance_km).toBe(0);
    expect(series[1]?.distance_km).toBe(0);
    expect(series[2]).toMatchObject({ date: "2026-07-19", distance_km: 3 });
  });
});
