import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ListTodo } from "lucide-react";
import { expect, it, vi } from "vitest";
import { MobileBottomBar } from "./MobileBottomBar";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback, i18n: { language: "en" } }) }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => ({ toggleSidebar: vi.fn(), openMobile: false }) }));
vi.mock("@/lib/sidebarPosition", () => ({ useSidebarPosition: () => ({ sidebarPosition: "left" }) }));
vi.mock("./MobileSpeedDialMenu", () => ({ MobileSpeedDialMenu: () => null }));

it.each(["rtl", "ltr"] as const)("keeps named, sibling pointer targets in a five-slot %s bar", dir => {
  const tabs = [1, 2, 3].map(index => ({ key: `tab-${index}`, to: `/tab-${index}`, icon: ListTodo, labelEn: `Tab ${index}`, labelFa: `برگه ${index}`, shortcutKey: String(index), shortcutLabel: String(index), match: () => false }));
  render(<MemoryRouter><MobileBottomBar tabs={tabs} currentPath="/" dir={dir} /></MemoryRouter>);
  const nav = screen.getByRole("navigation", { name: "ناوبری پایین صفحه" });
  expect(nav).toHaveAttribute("dir", dir);
  expect(nav.children).toHaveLength(5);
  const menu = screen.getByRole("button", { name: "منو" });
  expect(menu).toHaveAttribute("aria-expanded", "false");
  for (const item of [menu, ...screen.getAllByRole("link")]) expect(item).toHaveClass("min-w-11", "min-h-11");
  for (const button of screen.getAllByRole("button")) expect(button.querySelector("button, a, label")).toBeNull();
});
