import { describe, expect, it } from "vitest";
import { mapDistanceForDisplay } from "./WalkChart";
import type { DaySeriesPoint } from "../lib/stats";

function point(distance_km: number): DaySeriesPoint {
  return { date: "2026-07-19", label: "7/19", distance_km, walks: 1 };
}

describe("mapDistanceForDisplay", () => {
  it("passes distance through unchanged for metric", () => {
    const result = mapDistanceForDisplay([point(3.218688)], "metric");
    expect(result[0].distance_display).toBe(3.218688);
  });

  it("converts km to miles for us", () => {
    const result = mapDistanceForDisplay([point(3.218688)], "us");
    expect(result[0].distance_display).toBeCloseTo(2, 5);
  });
});
