import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatsPanel } from "./StatsPanel";
import { WalkForm } from "./WalkForm";

describe("StatsPanel", () => {
  it("shows weekly progress and walked-today status", () => {
    render(
      <StatsPanel
        dogName="Mochi"
        walkedToday
        goal={{
          id: 1,
          dog_id: 1,
          target_walks_per_week: 5,
          target_distance_weekly: 10,
          updated_at: "2026-07-19",
        }}
        stats={{
          total_walks_week: 2,
          total_distance_week: 3.5,
          streak_days: 2,
          avg_distance_week: 1.75,
        }}
      />,
    );

    expect(screen.getByText("Walked today")).toBeInTheDocument();
    expect(screen.getByText("Mochi")).toBeInTheDocument();
    expect(screen.getByLabelText("Weekly progress")).toBeInTheDocument();
  });
});

describe("WalkForm", () => {
  it("disables log button when no dog is selected", () => {
    render(
      <WalkForm
        dogId={null}
        editing={null}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onCancelEdit={vi.fn()}
        onStatus={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /log walk/i })).toBeDisabled();
  });
});
