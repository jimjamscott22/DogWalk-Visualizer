import { describe, expect, it } from "vitest";
import capability from "../../src-tauri/capabilities/default.json";
import { petCareResources, petCareTips } from "./petCareTips";

describe("Pet care resource permissions", () => {
  it("allows exactly the bundled HTTPS resources without broader opener permissions", () => {
    const permissions = capability.permissions;
    const opener = permissions.find((permission) => typeof permission !== "string" && permission.identifier === "opener:allow-open-url");
    expect(opener).toBeDefined();
    if (typeof opener !== "object") throw new Error("Missing scoped opener permission");
    const urls = Object.values(petCareResources).map((resource) => resource.url);
    expect(opener.allow.map((entry) => entry.url).sort()).toEqual([...urls].sort());
    expect(permissions.filter((permission) => typeof permission === "string" && permission.startsWith("opener:"))).toEqual([]);
    for (const tip of petCareTips) {
      const resource = petCareResources[tip.source];
      expect(resource.species).toBe(tip.species);
      expect(new URL(resource.url).protocol).toBe("https:");
    }
  });
});
