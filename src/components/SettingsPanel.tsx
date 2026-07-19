import { useState } from "react";
import { ask, save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { exportBackup } from "../lib/db";
import { todayIso } from "../lib/stats";
import {
  applyTheme,
  getStoredTheme,
  toggleTheme,
  type ThemeMode,
} from "../lib/theme";

interface SettingsPanelProps {
  onClearAll: () => Promise<void>;
  onStatus: (message: string) => void;
}

export function SettingsPanel({ onClearAll, onStatus }: SettingsPanelProps) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const mode = getStoredTheme();
    applyTheme(mode);
    return mode;
  });
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    setBusy(true);
    try {
      const payload = await exportBackup();
      const path = await save({
        defaultPath: `dogwalk-backup-${todayIso()}.json`,
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!path) {
        onStatus("Export cancelled");
        return;
      }
      await writeTextFile(path, JSON.stringify(payload, null, 2));
      onStatus(`Backup saved to ${path}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onStatus(`Export failed: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleClear = async () => {
    const confirmed = await ask(
      "This permanently deletes all dogs, walks, and goals on this device. Continue?",
      {
        title: "Clear all data",
        kind: "warning",
        okLabel: "Delete everything",
        cancelLabel: "Cancel",
      },
    );
    if (!confirmed) {
      onStatus("Clear cancelled");
      return;
    }
    setBusy(true);
    try {
      await onClearAll();
      onStatus("All local data cleared");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onStatus(`Clear failed: ${message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl bg-[var(--color-panel)] p-4 shadow-sm ring-1 ring-[var(--color-trail)]/40 sm:p-5">
      <h2 className="text-lg font-medium text-[var(--color-soil)]">Settings</h2>
      <p className="mt-1 text-sm text-[var(--color-bark)]/70">
        Data stays on this machine. Export a JSON backup anytime.
      </p>

      <div className="mt-4 grid gap-2 min-[420px]:grid-cols-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => setTheme(toggleTheme(theme))}
          className="rounded-lg bg-[var(--color-mist)] px-4 py-2.5 text-sm font-medium text-[var(--color-soil)] hover:bg-[var(--color-trail)]/30 disabled:opacity-60"
        >
          {theme === "dark" ? "Use light mode" : "Use dark mode"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleExport()}
          className="rounded-lg bg-[var(--color-moss)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-leaf)] disabled:opacity-60"
        >
          Backup to JSON
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleClear()}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-red-800 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60"
        >
          Clear all data
        </button>
      </div>
    </section>
  );
}
