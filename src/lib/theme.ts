export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "dogwalk-theme";

export function getStoredTheme(): ThemeMode {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw === "dark" ? "dark" : "light";
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.dataset.theme = mode;
  localStorage.setItem(STORAGE_KEY, mode);
}

export function toggleTheme(current: ThemeMode): ThemeMode {
  const next: ThemeMode = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
