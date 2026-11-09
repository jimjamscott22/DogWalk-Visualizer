import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

if (typeof jsdom !== "undefined") {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: jsdom.window.localStorage,
  });
}

afterEach(() => {
  cleanup();
  if (typeof jsdom !== "undefined") jsdom.window.localStorage.clear();
});
