export type UnitSystem = "us" | "metric";

const STORAGE_KEY = "dogwalk-units";

const KM_PER_MILE = 1.609344;
const KG_PER_LB = 0.45359237;

export function getStoredUnitSystem(): UnitSystem {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "metric" ? "metric" : "us";
}

export function setStoredUnitSystem(system: UnitSystem): void {
  localStorage.setItem(STORAGE_KEY, system);
}

export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

export function milesToKm(mi: number): number {
  return mi * KM_PER_MILE;
}

export function kgToLbs(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbsToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function distanceUnitLabel(system: UnitSystem): "mi" | "km" {
  return system === "us" ? "mi" : "km";
}

export function weightUnitLabel(system: UnitSystem): "lb" | "kg" {
  return system === "us" ? "lb" : "kg";
}

export function toDisplayDistance(km: number, system: UnitSystem): number {
  return system === "us" ? kmToMiles(km) : km;
}

export function toStorageDistance(value: number, system: UnitSystem): number {
  return system === "us" ? milesToKm(value) : value;
}

export function toDisplayWeight(kg: number, system: UnitSystem): number {
  return system === "us" ? kgToLbs(kg) : kg;
}

export function toStorageWeight(value: number, system: UnitSystem): number {
  return system === "us" ? lbsToKg(value) : value;
}

export function toDisplayDistancePerWeight(
  kmPerKg: number,
  system: UnitSystem,
): number {
  return system === "us" ? kmPerKg * (KG_PER_LB / KM_PER_MILE) : kmPerKg;
}

export function distancePerWeightUnitLabel(
  system: UnitSystem,
): "mi/lb" | "km/kg" {
  return system === "us" ? "mi/lb" : "km/kg";
}
