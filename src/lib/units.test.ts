import { beforeEach, describe, expect, it } from "vitest";
import {
  distancePerWeightUnitLabel,
  distanceUnitLabel,
  getStoredUnitSystem,
  kgToLbs,
  kmToMiles,
  lbsToKg,
  milesToKm,
  setStoredUnitSystem,
  toDisplayDistance,
  toDisplayDistancePerWeight,
  toDisplayWeight,
  toStorageDistance,
  toStorageWeight,
  weightUnitLabel,
} from "./units";

describe("getStoredUnitSystem", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to us when nothing stored", () => {
    expect(getStoredUnitSystem()).toBe("us");
  });

  it("returns a stored metric value", () => {
    setStoredUnitSystem("metric");
    expect(getStoredUnitSystem()).toBe("metric");
  });

  it("falls back to us for an invalid stored value", () => {
    localStorage.setItem("dogwalk-units", "bogus");
    expect(getStoredUnitSystem()).toBe("us");
  });
});

describe("distance conversion", () => {
  it("converts km to miles", () => {
    expect(kmToMiles(1.609344)).toBeCloseTo(1, 5);
  });

  it("converts miles to km", () => {
    expect(milesToKm(1)).toBeCloseTo(1.609344, 5);
  });

  it("round-trips km -> miles -> km", () => {
    expect(milesToKm(kmToMiles(5))).toBeCloseTo(5, 8);
  });
});

describe("weight conversion", () => {
  it("converts kg to lbs", () => {
    expect(kgToLbs(1)).toBeCloseTo(2.2046226, 5);
  });

  it("converts lbs to kg", () => {
    expect(lbsToKg(2.2046226)).toBeCloseTo(1, 5);
  });

  it("round-trips kg -> lbs -> kg", () => {
    expect(lbsToKg(kgToLbs(30))).toBeCloseTo(30, 8);
  });
});

describe("unit labels", () => {
  it("returns mi/lb for us", () => {
    expect(distanceUnitLabel("us")).toBe("mi");
    expect(weightUnitLabel("us")).toBe("lb");
  });

  it("returns km/kg for metric", () => {
    expect(distanceUnitLabel("metric")).toBe("km");
    expect(weightUnitLabel("metric")).toBe("kg");
  });
});

describe("toDisplayDistance / toStorageDistance", () => {
  it("passes through unchanged for metric", () => {
    expect(toDisplayDistance(5, "metric")).toBe(5);
    expect(toStorageDistance(5, "metric")).toBe(5);
  });

  it("converts for us", () => {
    expect(toDisplayDistance(1.609344, "us")).toBeCloseTo(1, 5);
    expect(toStorageDistance(1, "us")).toBeCloseTo(1.609344, 5);
  });
});

describe("toDisplayWeight / toStorageWeight", () => {
  it("passes through unchanged for metric", () => {
    expect(toDisplayWeight(10, "metric")).toBe(10);
    expect(toStorageWeight(10, "metric")).toBe(10);
  });

  it("converts for us", () => {
    expect(toDisplayWeight(1, "us")).toBeCloseTo(2.2046226, 5);
    expect(toStorageWeight(2.2046226, "us")).toBeCloseTo(1, 5);
  });
});

describe("toDisplayDistancePerWeight", () => {
  it("passes through unchanged for metric", () => {
    expect(toDisplayDistancePerWeight(0.5, "metric")).toBe(0.5);
  });

  it("converts km/kg to mi/lb consistently with the distance and weight converters", () => {
    const km = 10;
    const kg = 5;
    const kmPerKg = km / kg;
    const expected = kmToMiles(km) / kgToLbs(kg);
    expect(toDisplayDistancePerWeight(kmPerKg, "us")).toBeCloseTo(expected, 8);
  });
});

describe("distancePerWeightUnitLabel", () => {
  it("returns the correct label per system", () => {
    expect(distancePerWeightUnitLabel("us")).toBe("mi/lb");
    expect(distancePerWeightUnitLabel("metric")).toBe("km/kg");
  });
});
