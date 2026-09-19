import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Brain, FileText, Flame, ListTodo, CalendarDays } from "lucide-react";
import { WindowsFluentBar } from "./WindowsFluentBar";
import { FoldableAdaptiveBar } from "./FoldableAdaptiveBar";
import { BottomTabItemConfig } from "./types";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

const mockTabs: BottomTabItemConfig[] = [
  {
    key: "mind",
    labelFa: "ذهن",
    labelEn: "Mind",
    to: "/app/mind",
    icon: Brain,
    shortcutKey: "1",
    shortcutLabel: "Alt+1",
    match: (p) => p.startsWith("/app/mind"),
  },
  {
    key: "notes",
    labelFa: "یادداشت‌ها",
    labelEn: "Notes",
    to: "/app/notes",
    icon: FileText,
    shortcutKey: "2",
    shortcutLabel: "Alt+2",
    match: (p) => p.startsWith("/app/notes"),
  },
  {
    key: "habits",
    labelFa: "عادت‌ها",
    labelEn: "Habits",
    to: "/app/habits",
    icon: Flame,
    shortcutKey: "3",
    shortcutLabel: "Alt+3",
    match: (p) => p.startsWith("/app/habits"),
  },
  {
    key: "today",
    labelFa: "امروز",
    labelEn: "Today",
    to: "/app/today",
    icon: ListTodo,
    shortcutKey: "4",
    shortcutLabel: "Alt+4",
    match: (p) => p.startsWith("/app/today"),
  },
  {
    key: "calendar",
    labelFa: "تقویم",
    labelEn: "Calendar",
    to: "/app/calendar",
    icon: CalendarDays,
    shortcutKey: "5",
    shortcutLabel: "Alt+5",
    match: (p) => p.startsWith("/app/calendar"),
  },
];

describe("WindowsFluentBar", () => {
  it("renders all 5 tabs, search, and quick add buttons", () => {
    render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <TooltipProvider>
          <SidebarProvider>
            <WindowsFluentBar
              allTabs={mockTabs}
              currentPath="/app/today"
              dir="rtl"
            />
          </SidebarProvider>
        </TooltipProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("ذهن")).toBeDefined();
    expect(screen.getByText("یادداشت‌ها")).toBeDefined();
    expect(screen.getByText("عادت‌ها")).toBeDefined();
    expect(screen.getByText("امروز")).toBeDefined();
    expect(screen.getByText("تقویم")).toBeDefined();
    expect(screen.getByText("Ctrl+K")).toBeDefined();
    expect(screen.getByText("Alt+N")).toBeDefined();
  });
});

describe("FoldableAdaptiveBar", () => {
  it("renders all 5 tabs and FAB for foldable devices", () => {
    render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <SidebarProvider>
          <FoldableAdaptiveBar
            allTabs={mockTabs}
            currentPath="/app/today"
            dir="rtl"
          />
        </SidebarProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("ذهن")).toBeDefined();
    expect(screen.getByText("یادداشت‌ها")).toBeDefined();
    expect(screen.getByText("عادت‌ها")).toBeDefined();
    expect(screen.getByText("امروز")).toBeDefined();
    expect(screen.getByText("تقویم")).toBeDefined();
    expect(screen.getByText("منو")).toBeDefined();
  });
});

describe("MobileBottomBar", () => {
  it("renders tabs and adapts order when sidebarPosition is left vs right", async () => {
    const { MobileBottomBar } = await import("./MobileBottomBar");
    const { setSidebarPosition } = await import("@/lib/sidebarPosition");

    // Test right position (default)
    setSidebarPosition("right");
    const { rerender } = render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <SidebarProvider>
          <MobileBottomBar
            primaryTabs={[mockTabs[0], mockTabs[1]]}
            secondaryTabs={[mockTabs[3]]}
            currentPath="/app/today"
            dir="rtl"
          />
        </SidebarProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("ذهن")).toBeDefined();
    expect(screen.getByText("یادداشت‌ها")).toBeDefined();
    expect(screen.getByText("امروز")).toBeDefined();
    expect(screen.getByText("منو")).toBeDefined();

    // Now switch to left position
    setSidebarPosition("left");
    rerender(
      <MemoryRouter initialEntries={["/app/today"]}>
        <SidebarProvider>
          <MobileBottomBar
            primaryTabs={[mockTabs[0], mockTabs[1]]}
            secondaryTabs={[mockTabs[3]]}
            currentPath="/app/today"
            dir="rtl"
          />
        </SidebarProvider>
      </MemoryRouter>
    );

    const nav = screen.getByRole("navigation", { name: "ناوبری پایین صفحه" });
    expect(nav.getAttribute("data-sidebar-side")).toBe("left");

    // Clean up
    setSidebarPosition("right");
  });
});

