import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import i18n from "@/i18n";
import HeaderBackButton from "./HeaderBackButton";

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

beforeEach(async () => { await i18n.changeLanguage("fa"); });
afterEach(async () => { cleanup(); await i18n.changeLanguage("fa"); });

describe("HeaderBackButton", () => {
  it("reacts to language changes without a route change", async () => {
    render(<MemoryRouter initialEntries={["/app/self/test/example"]}><HeaderBackButton /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "بازگشت" }).querySelector(".lucide-arrow-right")).toBeTruthy();
    await act(async () => { await i18n.changeLanguage("en"); });
    expect(screen.getByRole("button", { name: "Back" }).querySelector(".lucide-arrow-left")).toBeTruthy();
    await act(async () => { await i18n.changeLanguage("fa"); });
    expect(screen.getByRole("button", { name: "بازگشت" })).toBeInTheDocument();
  });

  it.each(["/app/today", "/app/folder/example", "/app/tag/example"])("stays hidden on %s", (path) => {
    render(<MemoryRouter initialEntries={[path]}><HeaderBackButton /></MemoryRouter>);
    expect(screen.queryByTestId("header-back-button")).not.toBeInTheDocument();
  });

  it("falls back to Today when opened directly", () => {
    window.history.replaceState({ idx: 0 }, "");
    render(<MemoryRouter initialEntries={["/app/self/test/example"]}><HeaderBackButton /><Location /></MemoryRouter>);
    fireEvent.click(screen.getByTestId("header-back-button"));
    expect(screen.getByTestId("location")).toHaveTextContent("/app/today");
  });
});
