import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sidebar, SidebarProvider, useSidebar } from "./sidebar";

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => window.innerWidth < 768 }));
vi.mock("react-i18next", async importOriginal => ({ ...(await importOriginal<typeof import("react-i18next")>()), useTranslation: () => ({ i18n: { language: document.documentElement.dir === "rtl" ? "fa" : "en" } }) }));

function EdgeTriggers() {
  const { openMobileFromSide } = useSidebar();
  return <>{(["left", "right"] as const).map(side => <button key={side} onClick={event => { event.currentTarget.focus(); openMobileFromSide(side); }}>Open {side}</button>)}</>;
}

describe("Sidebar component desktop layout and spacer reservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Simulate desktop width
    window.innerWidth = 1280;
  });

  it("renders desktop outer container with shrink-0, forwarded className, and spacer div", () => {
    const { container } = render(
      <SidebarProvider defaultOpen={true} side="right">
        <Sidebar className="order-2 custom-test-class">
          <div>Sidebar Inner Content</div>
        </Sidebar>
      </SidebarProvider>
    );

    // Desktop wrapper (hidden md:block shrink-0)
    const desktopWrapper = container.querySelector(".group.peer");
    expect(desktopWrapper).toBeInTheDocument();
    expect(desktopWrapper?.className).toContain("shrink-0");
    expect(desktopWrapper?.className).toContain("order-2");
    expect(desktopWrapper?.className).toContain("custom-test-class");
    expect(desktopWrapper?.getAttribute("data-side")).toBe("right");

    // Spacer div that reserves width in flex container
    const spacer = desktopWrapper?.querySelector(".bg-transparent");
    expect(spacer).toBeInTheDocument();
    expect(spacer?.className).toContain("w-[--sidebar-width]");

    // Fixed panel pinned to right-0 when side='right'
    const fixedPanel = desktopWrapper?.querySelector(".fixed");
    expect(fixedPanel).toBeInTheDocument();
    expect(fixedPanel?.className).toContain("right-0");
    expect(fixedPanel?.className).not.toContain("left-0");
  });

  it("renders desktop fixed panel pinned to left-0 when side='left'", () => {
    const { container } = render(
      <SidebarProvider defaultOpen={true} side="left">
        <Sidebar className="order-1">
          <div>Sidebar Inner Content</div>
        </Sidebar>
      </SidebarProvider>
    );

    const desktopWrapper = container.querySelector(".group.peer");
    expect(desktopWrapper?.className).toContain("order-1");
    expect(desktopWrapper?.getAttribute("data-side")).toBe("left");

    const fixedPanel = desktopWrapper?.querySelector(".fixed");
    expect(fixedPanel).toBeInTheDocument();
    expect(fixedPanel?.className).toContain("left-0");
    expect(fixedPanel?.className).not.toContain("right-0");
  });

  it.each([320, 1024])("opens from the physical edge and restores focus at %ipx in RTL and LTR", async width => {
    window.innerWidth = width;
    const { unmount } = render(<SidebarProvider side="right"><EdgeTriggers /><Sidebar><a href="#destination">Destination</a></Sidebar></SidebarProvider>);
    for (const dir of ["rtl", "ltr"]) {
      document.documentElement.dir = dir;
      for (const side of ["left", "right"]) {
        const trigger = screen.getByRole("button", { name: `Open ${side}` });
        fireEvent.click(trigger);
        const panel = await screen.findByRole("dialog");
        expect(panel).toHaveAttribute("data-side", side);
        expect(panel).toHaveClass(`${side}-0`);
        expect(panel.style.getPropertyValue("--sidebar-width-mobile")).toBe("min(24rem, calc(100vw - 20px))");
        fireEvent.keyDown(panel, { key: "Escape" });
        await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
        await waitFor(() => expect(trigger).toHaveFocus());
      }
    }
    unmount();
    document.documentElement.dir = "";
  });
});
