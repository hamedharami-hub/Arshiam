import { render } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Sidebar, SidebarProvider } from "./sidebar";

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
});
