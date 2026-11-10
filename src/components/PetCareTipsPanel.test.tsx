import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { PetCareTipsPanel } from "./PetCareTipsPanel";
import { petCareResources } from "../lib/petCareTips";

vi.mock("@tauri-apps/api/core", () => ({ isTauri: vi.fn() }));
vi.mock("@tauri-apps/plugin-opener", () => ({ openUrl: vi.fn() }));

beforeEach(() => {
  vi.mocked(isTauri).mockReturnValue(true);
  vi.mocked(openUrl).mockReset().mockResolvedValue(undefined);
});

describe("PetCareTipsPanel", () => {
  it("shows three dog tips, expands all six, and resets when switching species", async () => {
    const user = userEvent.setup();
    render(<PetCareTipsPanel />);
    expect(screen.getByRole("button", { name: "Dogs" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("link", { name: /Learn more/ })).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Show all tips" }));
    expect(screen.getAllByRole("link", { name: /Learn more/ })).toHaveLength(6);
    expect(screen.getByRole("button", { name: "Show fewer tips" })).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: "Cats" }));
    expect(screen.getByRole("button", { name: "Cats" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Play in short bursts")).toBeVisible();
    expect(screen.queryByText("Find their pace")).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Learn more/ })).toHaveLength(3);
    await user.click(screen.getByRole("button", { name: "Show all tips" }));
    expect(screen.getAllByRole("link", { name: /Learn more/ })).toHaveLength(6);
    await user.click(screen.getByRole("button", { name: "Show fewer tips" }));
    expect(screen.getAllByRole("link", { name: /Learn more/ })).toHaveLength(3);
  });

  it("opens only the selected resource through the native browser opener", async () => {
    const user = userEvent.setup();
    render(<PetCareTipsPanel />);
    await user.click(screen.getByRole("link", { name: /Learn more about find their pace/ }));
    expect(openUrl).toHaveBeenCalledExactlyOnceWith(petCareResources.dogCare.url);
    await user.click(screen.getByRole("button", { name: "Cats" }));
    await user.click(screen.getByRole("link", { name: /PDSA: Exercising your cat/ }));
    expect(openUrl).toHaveBeenLastCalledWith(petCareResources.catExercise.url);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("offers a copyable address when native opening fails and clears it on retry", async () => {
    const user = userEvent.setup();
    vi.mocked(openUrl).mockRejectedValueOnce(new Error("No browser"));
    render(<PetCareTipsPanel />);
    const link = screen.getByRole("link", { name: /ASPCA: General dog care/ });
    await user.click(link);
    expect(await screen.findByRole("alert")).toHaveTextContent(petCareResources.dogCare.url);
    expect(screen.getByText("Find their pace")).toBeVisible();
    await user.click(link);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("leaves normal browser links usable without native IPC", () => {
    vi.mocked(isTauri).mockReturnValue(false);
    render(<PetCareTipsPanel />);
    const link = screen.getByRole("link", { name: /ASPCA: General dog care/ });
    expect(link).toHaveAttribute("href", petCareResources.dogCare.url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    // Cancel the default action in the test environment after React handles the click.
    const parent = link.parentElement!;
    let preventedByComponent = true;
    const cancelNavigation = (event: Event) => {
      preventedByComponent = event.defaultPrevented;
      event.preventDefault();
    };
    document.addEventListener("click", cancelNavigation);
    fireEvent.click(within(parent).getByRole("link"));
    document.removeEventListener("click", cancelNavigation);
    expect(preventedByComponent).toBe(false);
    expect(openUrl).not.toHaveBeenCalled();
  });

  it("supports keyboard selection and expansion", async () => {
    const user = userEvent.setup();
    render(<PetCareTipsPanel />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Dogs" })).toHaveFocus();
    await user.tab();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Cats" })).toHaveAttribute("aria-pressed", "true");
    screen.getByRole("button", { name: "Show all tips" }).focus();
    await user.keyboard(" ");
    expect(screen.getAllByRole("link", { name: /Learn more/ })).toHaveLength(6);
  });
});
