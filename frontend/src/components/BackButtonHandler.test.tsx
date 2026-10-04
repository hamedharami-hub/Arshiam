import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import BackButtonHandler from "./BackButtonHandler";

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: "/app/today" }),
}));

vi.mock("sonner", () => ({ toast: vi.fn() }));

describe("BackButtonHandler", () => {
  beforeEach(() => {
    window.history.replaceState({ idx: 0 }, "", "/app/today");
  });

  it("does not intercept Back when an internal route preceded Today", () => {
    window.history.replaceState({ idx: 2, key: "today" }, "", "/app/today");
    const push = vi.spyOn(window.history, "pushState");
    render(<BackButtonHandler />);
    expect(push).not.toHaveBeenCalled();
    push.mockRestore();
  });

  it("preserves the router history index when guarding a direct root entry", () => {
    render(<BackButtonHandler />);
    expect(window.history.state).toMatchObject({ idx: 0, __sentinel: true });
  });
});
