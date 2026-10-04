import { describe, expect, it } from "vitest";
import { formatTimeOfDay, formatWalkDate } from "./time";

describe("formatWalkDate", () => {
  it("formats weekday, month and day", () => {
    expect(formatWalkDate("2026-08-02")).toBe("Sun · Aug 2");
  });

  it("does not pad single-digit days", () => {
    expect(formatWalkDate("2026-03-05")).toBe("Thu · Mar 5");
  });

  it("handles the end of a year", () => {
    expect(formatWalkDate("2025-12-31")).toBe("Wed · Dec 31");
  });

  it("returns the input unchanged when it is not a valid date", () => {
    expect(formatWalkDate("not-a-date")).toBe("not-a-date");
    expect(formatWalkDate("2026-02-30")).toBe("2026-02-30");
  });
});

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
