import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatsPanel } from "./StatsPanel";
import { WalkForm } from "./WalkForm";
import { DogProfileForm } from "./DogProfileForm";
import { SettingsPanel } from "./SettingsPanel";
import { DogWalkBanner } from "./DogWalkBanner";
import { ConsistencyGrid } from "./ConsistencyGrid";
import { buildConsistencyWeeks } from "../lib/stats";
import type { Walk } from "../types";

describe("DogWalkBanner", () => {
  it("renders the generated dog-walking artwork with descriptive alt text", () => {
    render(<DogWalkBanner />);

    expect(
      screen.getByRole("img", { name: /two dogs walking together/i }),
    ).toHaveAttribute("src", "/dogs-walking-neighborhood.png");
  });
});

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

  it("rounds a non-step-clean converted distance so the edit form can still be submitted", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <WalkForm
        dogId={1}
        unitSystem="us"
        editing={{
          id: 1,
          dog_id: 1,
          date: "2026-07-19",
          duration_minutes: 30,
          distance_km: 5,
          notes: null,
          created_at: "2026-07-19T00:00:00Z",
        }}
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onCancelEdit={vi.fn()}
        onStatus={vi.fn()}
      />,
    );

    const distanceInput = screen.getByLabelText(
      /distance \(mi\)/i,
    ) as HTMLInputElement;
    expect(distanceInput.value).toBe("3.1");

    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onUpdate).toHaveBeenCalledTimes(1);
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

  const dogBase = {
    user_id: null,
    breed: null,
    weight_kg: null,
    created_at: "2026-07-19T00:00:00Z",
  };

  it("shows a photo avatar in the selector chip when the dog has one", () => {
    const photo = "data:image/jpeg;base64,abc123";
    render(
      <DogProfileForm
        dogs={[{ ...dogBase, id: 1, name: "Mochi", photo }]}
        selectedDog={null}
        onSelect={vi.fn()}
        onStartCreate={vi.fn()}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onStatus={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("img", { name: /mochi profile photo/i }),
    ).toHaveAttribute("src", photo);
  });

  it("falls back to the dog's initial in the chip when there is no photo", () => {
    render(
      <DogProfileForm
        dogs={[{ ...dogBase, id: 1, name: "Mochi", photo: null }]}
        selectedDog={null}
        onSelect={vi.fn()}
        onStartCreate={vi.fn()}
        onAdd={vi.fn()}
        onUpdate={vi.fn()}
        onStatus={vi.fn()}
      />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    const chip = screen.getByRole("button", { name: /mochi/i });
    expect(chip.textContent).toContain("M");
  });
});

function walk(partial: Partial<Walk> & Pick<Walk, "date" | "distance_km">): Walk {
  return {
    id: partial.id ?? 1,
    dog_id: partial.dog_id ?? 1,
    date: partial.date,
    duration_minutes: partial.duration_minutes ?? 30,
    distance_km: partial.distance_km,
    notes: partial.notes ?? null,
    created_at: partial.created_at ?? "2026-07-01T00:00:00Z",
  };
}

describe("ConsistencyGrid", () => {
  it("shows how many weeks hit the goal when a goal is set", () => {
    const walks = [
      walk({ id: 1, date: "2026-07-13", distance_km: 2 }),
      walk({ id: 2, date: "2026-07-14", distance_km: 2 }),
      walk({ id: 3, date: "2026-07-15", distance_km: 2 }),
    ];
    const goal = { target_walks_per_week: 3, target_distance_weekly: null };
    const weeks = buildConsistencyWeeks(walks, goal, 2, "2026-07-19");

    render(<ConsistencyGrid weeks={weeks} goalActive unitSystem="metric" />);

    expect(
      screen.getByText("1 of 2 weeks hit your goal"),
    ).toBeInTheDocument();
  });

  it("prompts to set a goal when none is active", () => {
    const weeks = buildConsistencyWeeks([], null, 2, "2026-07-19");
    render(<ConsistencyGrid weeks={weeks} goalActive={false} />);

    expect(
      screen.getByText(/set a weekly goal below to start tracking hits/i),
    ).toBeInTheDocument();
  });
});

describe("SettingsPanel", () => {
  it("calls onUnitSystemChange with the opposite system when the toggle is clicked", async () => {
    const user = userEvent.setup();
    const onUnitSystemChange = vi.fn();
    render(
      <SettingsPanel
        onClearAll={vi.fn()}
        onStatus={vi.fn()}
        unitSystem="us"
        onUnitSystemChange={onUnitSystemChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /use metric units/i }));
    expect(onUnitSystemChange).toHaveBeenCalledWith("metric");
  });
});
