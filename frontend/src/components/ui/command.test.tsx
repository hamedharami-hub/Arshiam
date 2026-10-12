import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { Command, CommandInput } from "./command";

const locale = vi.hoisted(() => ({ language: "en" }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: locale }) }));

it.each(["en", "fa"])("names search and supplies a wrapper focus ring in %s", language => {
  locale.language = language;
  render(<Command><CommandInput /></Command>);
  const input = screen.getByRole("combobox", { name: language === "en" ? "Search" : "جستجو" });
  expect(input.parentElement).toHaveClass("focus-within:ring-2", "focus-within:ring-inset", "focus-within:ring-ring");
  expect(input.parentElement?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
});

it("preserves a caller's specific input name", () => {
  render(<Command><CommandInput aria-label="Search projects" /></Command>);
  expect(screen.getByRole("combobox", { name: "Search projects" })).toBeInTheDocument();
});

it("preserves explicit label association and cmdk value changes", () => {
  const onValueChange = vi.fn();
  render(<><span id="project-search">Find a project</span><Command><CommandInput aria-labelledby="project-search" onValueChange={onValueChange} /></Command></>);
  const input = screen.getByRole("combobox", { name: "Find a project" });
  fireEvent.change(input, { target: { value: "Draft" } });
  expect(onValueChange).toHaveBeenCalledWith("Draft");
  expect(input).toHaveValue("Draft");
});
