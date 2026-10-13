import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SaveStatus } from "./SaveStatus";

describe("Settings save status", () => {
  it("does not present loaded defaults as a completed save", () => {
    render(<SaveStatus state="idle" isEn local />);
    expect(screen.getByRole("status")).not.toHaveTextContent("Saved on this device");
  });
  it("announces saving, offline queueing, and failure without claiming a cloud save", () => {
    const { rerender } = render(<SaveStatus state="saving" isEn />);
    expect(screen.getByRole("status")).toHaveTextContent("Saving…");
    rerender(<SaveStatus state="queued" isEn />);
    expect(screen.getByRole("status")).toHaveTextContent("cloud save is pending");
    rerender(<SaveStatus state="error" isEn />);
    expect(screen.getByRole("alert")).toHaveTextContent("not confirmed saved");
  });
});
