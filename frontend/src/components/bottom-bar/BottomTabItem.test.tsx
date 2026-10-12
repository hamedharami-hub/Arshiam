import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ListTodo } from "lucide-react";
import { expect, it, vi } from "vitest";
import { BottomTabItem } from "./BottomTabItem";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));

it("exposes a named destination link with a persistent short label and current page", () => {
  render(<MemoryRouter><BottomTabItem isActive tab={{ key: "tasks", to: "/tasks", icon: ListTodo, labelEn: "Tasks", labelFa: "کارها", shortLabelEn: "Tasks", shortcutKey: "T", shortcutLabel: "Alt+T", match: path => path === "/tasks" }} /></MemoryRouter>);
  const link = screen.getByRole("link", { name: "Tasks" });
  expect(link).toHaveAttribute("href", "/tasks");
  expect(link).toHaveAttribute("aria-current", "page");
  expect(link).toHaveTextContent("Tasks");
  expect(link.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  expect(link.querySelector("button, a, label")).toBeNull();
  fireEvent.click(link);
});
