import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";
import SettingsView from "./SettingsView";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
beforeEach(() => { vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} }); });
afterEach(() => vi.unstubAllGlobals());
function Back() { const navigate = useNavigate(); return <button onClick={() => navigate(-1)}>Go back</button>; }
describe("settings navigation", () => {
  it("shows general settings for an unknown category and restores category with Back", async () => {
    render(<MemoryRouter initialEntries={["/app/settings?tab=unknown"]}><Back /><SettingsView /></MemoryRouter>);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[0]).toHaveAttribute("data-state", "active");
    fireEvent.mouseDown(tabs[1], { button: 0, ctrlKey: false });
    expect(tabs[1]).toHaveAttribute("data-state", "active");
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    await waitFor(() => expect(screen.getAllByRole("tab")[0]).toHaveAttribute("data-state", "active"));
  });

  it("places navigation customization before unrelated system design settings", () => {
    render(<MemoryRouter initialEntries={["/app/settings?tab=general"]}><SettingsView /></MemoryRouter>);

    const headings = screen.getAllByRole("heading").map((heading) => heading.textContent || "");
    const sidebarSettingsIndex = headings.findIndex((heading) => /Sidebar & Icons Settings|تنظیمات نوار کناری/.test(heading));
    const bottomBarSettingsIndex = headings.findIndex((heading) => /Mobile Bottom Navigation Bar|شخصی‌سازی نوار پایین موبایل/.test(heading));
    const lifeArchitectIndex = headings.findIndex((heading) => /Life Architect & System Design|معمار هوشمند زندگی/.test(heading));

    expect(sidebarSettingsIndex).toBeGreaterThanOrEqual(0);
    expect(bottomBarSettingsIndex).toBeGreaterThanOrEqual(0);
    expect(sidebarSettingsIndex).toBeLessThan(lifeArchitectIndex);
    expect(bottomBarSettingsIndex).toBeLessThan(lifeArchitectIndex);
  });
});
