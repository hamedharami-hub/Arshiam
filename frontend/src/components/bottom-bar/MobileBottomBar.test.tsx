import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ListTodo } from "lucide-react";
import { expect, it, vi } from "vitest";
import { MobileBottomBar } from "./MobileBottomBar";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback, i18n: { language: "en" } }) }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
const openFromSide = vi.hoisted(() => vi.fn());
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => ({ openMobileFromSide: openFromSide, openMobile: false }) }));
vi.mock("@/lib/sidebarPosition", () => ({ useSidebarPosition: () => ({ sidebarPosition: "left" }) }));
vi.mock("./MobileSpeedDialMenu", () => ({ MobileSpeedDialMenu: () => null }));

it.each(["rtl", "ltr"] as const)("keeps four navigation targets and a right-floating add button in %s", dir => {
  const tabs = [1, 2, 3, 4].map(index => ({ key: `tab-${index}`, to: `/tab-${index}`, icon: ListTodo, labelEn: `Tab ${index}`, labelFa: `برگه ${index}`, shortcutKey: String(index), shortcutLabel: String(index), match: () => false }));
  render(<MemoryRouter><MobileBottomBar tabs={tabs} currentPath="/" dir={dir} /></MemoryRouter>);
  const nav = screen.getByRole("navigation", { name: "ناوبری پایین صفحه" });
  expect(nav).toHaveAttribute("dir", dir);
  expect(nav.children).toHaveLength(5);
  expect(nav.querySelector('[data-floating-quick-add="true"]')).toHaveClass("absolute", "right-0");
  expect(nav).toHaveClass("left-[calc(env(safe-area-inset-left,0px)+2.75rem)]", "right-[calc(env(safe-area-inset-right,0px)+2.75rem)]");
  expect(screen.queryByRole("button", { name: "منو" })).toBeNull();
  for (const side of ["left", "right"] as const) {
    fireEvent.click(screen.getByRole("button", { name: `Open menu from ${side}` }));
    expect(openFromSide).toHaveBeenLastCalledWith(side);
  }
  for (const item of screen.getAllByRole("link")) expect(item).toHaveClass("min-w-11", "min-h-11");
  for (const button of screen.getAllByRole("button")) expect(button.querySelector("button, a, label")).toBeNull();
});
