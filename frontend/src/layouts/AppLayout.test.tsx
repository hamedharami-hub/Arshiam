import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, useNavigate } from "react-router-dom";
import AppLayout from "./AppLayout";

const appLayoutMocks = vi.hoisted(() => ({
  user: { current: null as null | { id: string } },
  loadSettings: vi.fn(),
  hydrateSidebarPositionFromCloud: vi.fn(),
  language: "fa",
}));

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: appLayoutMocks.language } }),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: appLayoutMocks.user.current }) }));
vi.mock("@/lib/reminders", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/reminders")>()),
  loadSettings: appLayoutMocks.loadSettings,
}));
vi.mock("@/lib/appModules", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/appModules")>()),
  syncModulesForUser: vi.fn(),
}));

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
  default: () => <span data-testid="edge-owner" />,
}));

vi.mock("@/components/EdgePanBack", () => ({
  default: () => <span data-testid="competing-edge-owner" />,
}));

vi.mock("@/components/modules/ModuleGatedOutlet", () => ({
  ModuleGatedOutlet: () => <h1>Route heading</h1>,
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

function RouteControl() {
  const navigate = useNavigate();
  return <button onClick={() => navigate("/app/notes")}>Open notes route</button>;
}

vi.mock("@/lib/sidebarPosition", () => ({
  useSidebarPosition: () => ({
    sidebarPosition: mockSidebarPosition,
    setSidebarPosition: vi.fn(),
  }),
  getSidebarPosition: () => mockSidebarPosition,
  setSidebarPosition: vi.fn(),
  hydrateSidebarPositionFromCloud: appLayoutMocks.hydrateSidebarPositionFromCloud,
}));

describe("AppLayout desktop layout reservation and physical placement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appLayoutMocks.user.current = null;
    appLayoutMocks.language = "fa";
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
    appLayoutMocks.language = "en";
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

  it("loads the cloud sidebar preference for the signed-in device", async () => {
    appLayoutMocks.user.current = { id: "user-1" };
    appLayoutMocks.loadSettings.mockResolvedValue({ sidebar_position: "left" });

    render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <AppLayout />
      </MemoryRouter>,
    );

    await waitFor(() => expect(appLayoutMocks.loadSettings).toHaveBeenCalledWith("user-1"));
    await waitFor(() => expect(appLayoutMocks.hydrateSidebarPositionFromCloud).toHaveBeenCalledWith("left"));
  });

  it("mounts one web edge owner and exposes a focusable skip target", () => {
    render(<MemoryRouter initialEntries={["/app/today"]}><AppLayout /></MemoryRouter>);
    expect(screen.getAllByTestId("edge-owner")).toHaveLength(1);
    expect(screen.queryByTestId("competing-edge-owner")).not.toBeInTheDocument();
    const skip = screen.getByRole("link", { name: /محتوای اصلی|Skip to main/ });
    expect(skip).toHaveAttribute("href", "#main-scroll");
    fireEvent.click(skip);
    expect(document.getElementById("main-scroll")).toHaveFocus();
  });

  it("focuses and announces meaningful route content", async () => {
    render(<MemoryRouter initialEntries={["/app/today"]}><AppLayout /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Route heading" })).toHaveFocus());
    expect(screen.getByRole("status")).toHaveTextContent("Route heading");
  });

  it("moves focus from route navigation to the destination content", async () => {
    render(<MemoryRouter initialEntries={["/app/today"]}><RouteControl /><AppLayout /></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Route heading" })).toHaveFocus());
    const control = screen.getByRole("button", { name: "Open notes route" });
    control.focus(); fireEvent.click(control);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Route heading" })).toHaveFocus());
    expect(screen.getByRole("status")).toHaveTextContent("Route heading");
  });

  it.each(["editor", "modal"])("does not steal route focus or announce over an active %s", async (owner) => {
    const input = document.createElement("input");
    document.body.append(input); input.focus();
    const modal = document.createElement("div");
    if (owner === "modal") { input.blur(); modal.setAttribute("role", "dialog"); document.body.append(modal); }
    render(<MemoryRouter initialEntries={["/app/today"]}><AppLayout /></MemoryRouter>);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("heading", { name: "Route heading" })).not.toHaveFocus();
    if (owner === "editor") expect(input).toHaveFocus();
    input.remove(); modal.remove();
  });
});
