import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatsPanel } from "./StatsPanel";
import { WalkForm } from "./WalkForm";
import { DogProfileForm } from "./DogProfileForm";

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

  it("shows the distance unit based on unitSystem, defaulting to miles", () => {
    const stats = {
      total_walks_week: 2,
      total_distance_week: 3.218688,
      streak_days: 2,
      avg_distance_week: 1.75,
    };
    const { rerender } = render(
      <StatsPanel dogName="Mochi" walkedToday goal={null} stats={stats} />,
    );
    expect(screen.getByText("mi")).toBeInTheDocument();

    rerender(
      <StatsPanel
        dogName="Mochi"
        walkedToday
        goal={null}
        stats={stats}
        unitSystem="metric"
      />,
    );
    expect(screen.getByText("km")).toBeInTheDocument();
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

  it("converts entered US distance to km when creating a walk", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <WalkForm
        dogId={1}
        editing={null}
        unitSystem="us"
        onCreate={onCreate}
        onUpdate={vi.fn()}
        onCancelEdit={vi.fn()}
        onStatus={vi.fn()}
      />,
    );

    const distanceInput = screen.getByLabelText(/distance \(mi\)/i);
    await user.clear(distanceInput);
    await user.type(distanceInput, "2");
    await user.click(screen.getByRole("button", { name: /log walk/i }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0][0].distance_km).toBeCloseTo(3.218688, 5);
  });

  it("shows the stored km value converted to miles when editing", () => {
    render(
      <WalkForm
        dogId={1}
        unitSystem="us"
        editing={{
          id: 1,
          dog_id: 1,
          date: "2026-07-19",
          duration_minutes: 30,
          distance_km: 1.609344,
          notes: null,
          created_at: "2026-07-19T00:00:00Z",
        }}
        onCreate={vi.fn()}
        onUpdate={vi.fn()}
        onCancelEdit={vi.fn()}
        onStatus={vi.fn()}
      />,
    );

    const distanceInput = screen.getByLabelText(
      /distance \(mi\)/i,
    ) as HTMLInputElement;
    expect(Number(distanceInput.value)).toBeCloseTo(1, 5);
  });
});

describe("DogProfileForm", () => {
  it("converts entered US weight to kg when adding a dog", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn().mockResolvedValue(undefined);
    render(
      <DogProfileForm
        dogs={[]}
        selectedDog={null}
        unitSystem="us"
        onSelect={vi.fn()}
        onStartCreate={vi.fn()}
        onAdd={onAdd}
        onUpdate={vi.fn()}
        onStatus={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/name/i), "Mochi");
    await user.type(screen.getByLabelText(/weight \(lb\)/i), "44");
    await user.click(screen.getByRole("button", { name: /add dog/i }));

    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0].weight_kg).toBeCloseTo(19.958, 3);
  });
});
