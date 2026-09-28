import { describe, expect, it } from "vitest";
import { formatTimeOfDay } from "./time";

describe("formatTimeOfDay", () => {
  it("returns null when no time is recorded", () => {
    expect(formatTimeOfDay(null)).toBeNull();
  });

  it("formats a morning time", () => {
    expect(formatTimeOfDay("07:30")).toBe("7:30 AM");
  });

  it("formats an afternoon/evening time", () => {
    expect(formatTimeOfDay("18:05")).toBe("6:05 PM");
  });

  it("formats noon as 12 PM", () => {
    expect(formatTimeOfDay("12:00")).toBe("12:00 PM");
  });

  it("formats midnight as 12 AM", () => {
    expect(formatTimeOfDay("00:00")).toBe("12:00 AM");
  });

  it("returns null for a malformed value", () => {
    expect(formatTimeOfDay("not-a-time")).toBeNull();
  });
});
