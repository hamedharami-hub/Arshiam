import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import AppLayout from "./AppLayout";

// Mock dependencies
vi.mock("@/components/AppSidebar", () => ({
  AppSidebar: ({ className, style }: any) => (
    <aside data-testid="app-sidebar" className={className} style={style}>
      <div data-sidebar="sidebar">Sidebar Content</div>
    </aside>
  ),
}));

vi.mock("@/components/AIPanel", () => ({
  AIPanel: () => <div data-testid="ai-panel" />,
}));

vi.mock("@/components/OfflineIndicator", () => ({
  default: () => null,
}));

vi.mock("@/components/InstallPrompt", () => ({
  default: () => null,
}));

vi.mock("@/components/EdgeSwipeHandler", () => ({
  default: () => null,
}));

vi.mock("@/components/EdgePanBack", () => ({
  default: () => null,
}));

vi.mock("@/components/gestures/SwipeNavigator", () => ({
  default: () => null,
}));

vi.mock("@/components/ClinicalDisclaimer", () => ({
  default: () => null,
}));

vi.mock("@/components/RemindersRunner", () => ({
  default: () => null,
}));

vi.mock("@/components/BackButtonHandler", () => ({
  default: () => null,
}));

vi.mock("@/components/CommandPalette", () => ({
  default: () => null,
}));

vi.mock("@/components/QuickCaptureDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/KeyboardShortcutsDialog", () => ({
  default: () => null,
}));

vi.mock("@/components/BottomTabBar", () => ({
  BottomTabBar: () => null,
}));

vi.mock("@/components/SelectionActionToolbar", () => ({
  SelectionActionToolbar: () => null,
}));

vi.mock("@/components/Onboarding", () => ({
  default: () => null,
}));

vi.mock("@/components/HeaderBackButton", () => ({
  default: () => null,
}));

vi.mock("@/components/AndroidGestures", () => ({
  default: () => null,
}));

vi.mock("@/components/AndroidBackButton", () => ({
  default: () => null,
}));

vi.mock("@/components/AndroidTaskSync", () => ({
  default: () => null,
}));

let mockSidebarPosition: "left" | "right" = "right";

vi.mock("@/lib/sidebarPosition", () => ({
  useSidebarPosition: () => ({
    sidebarPosition: mockSidebarPosition,
    setSidebarPosition: vi.fn(),
  }),
  getSidebarPosition: () => mockSidebarPosition,
  setSidebarPosition: vi.fn(),
}));

describe("AppLayout desktop layout reservation and physical placement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.dir = "rtl";
    mockSidebarPosition = "right";
  });

  it("places sidebar on the physical right (order-2) and main on left (order-1) when sidebarPosition='right' in RTL", () => {
    document.documentElement.dir = "rtl";
    mockSidebarPosition = "right";

    const { container } = render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <AppLayout />
      </MemoryRouter>
    );

    // Outer layout container must be strictly dir="ltr" to enforce physical flexbox ordering
    const outerFlex = container.querySelector(".min-h-screen.flex.w-full");
    expect(outerFlex).toBeInTheDocument();
    expect(outerFlex?.getAttribute("dir")).toBe("ltr");

    // AppSidebar must have order-2 (physical right)
    const sidebar = container.querySelector('[data-testid="app-sidebar"]');
    expect(sidebar).toBeInTheDocument();
    expect(sidebar?.className).toContain("order-2");

    // Main wrapper must have order-1 (physical left) and inherit RTL for content
    const mainWrapper = sidebar?.parentElement?.querySelector("div.flex-1");
    expect(mainWrapper).toBeInTheDocument();
    expect(mainWrapper?.className).toContain("order-1");
    expect(mainWrapper?.className).toContain("min-w-0");
    expect(mainWrapper?.getAttribute("dir")).toBe("rtl");
  });

  it("places sidebar on physical left (order-1) and main on right (order-2) when sidebarPosition='left' in RTL", () => {
    document.documentElement.dir = "rtl";
    mockSidebarPosition = "left";

    const { container } = render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <AppLayout />
      </MemoryRouter>
    );

    const outerFlex = container.querySelector(".min-h-screen.flex.w-full");
    expect(outerFlex?.getAttribute("dir")).toBe("ltr");

    const sidebar = container.querySelector('[data-testid="app-sidebar"]');
    expect(sidebar?.className).toContain("order-1");

    const mainWrapper = sidebar?.parentElement?.querySelector("div.flex-1");
    expect(mainWrapper?.className).toContain("order-2");
    expect(mainWrapper?.getAttribute("dir")).toBe("rtl");
  });

  it("preserves physical placement (order-2 for right sidebar) when language is LTR", () => {
    document.documentElement.dir = "ltr";
    mockSidebarPosition = "right";

    const { container } = render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <AppLayout />
      </MemoryRouter>
    );

    const outerFlex = container.querySelector(".min-h-screen.flex.w-full");
    expect(outerFlex?.getAttribute("dir")).toBe("ltr");

    const sidebar = container.querySelector('[data-testid="app-sidebar"]');
    expect(sidebar?.className).toContain("order-2");

    const mainWrapper = sidebar?.parentElement?.querySelector("div.flex-1");
    expect(mainWrapper?.className).toContain("order-1");
    expect(mainWrapper?.getAttribute("dir")).toBe("ltr");
  });
});
