import { render, screen } from "@testing-library/react";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { Slider } from "./slider";

beforeAll(() => vi.stubGlobal("ResizeObserver", class {
  observe() {}
  unobserve() {}
  disconnect() {}
}));
afterAll(() => vi.unstubAllGlobals());

it("names the operable slider thumb, not just its wrapper", () => {
  render(<Slider defaultValue={[40]} aria-label="Reading size" aria-valuetext="40 percent" />);
  expect(screen.getByRole("slider", { name: "Reading size" })).toHaveAttribute("aria-valuetext", "40 percent");
});

it("forwards an external label to the thumb", () => {
  render(<><span id="volume-label">Volume</span><Slider defaultValue={[20]} aria-labelledby="volume-label" /></>);
  expect(screen.getByRole("slider", { name: "Volume" })).toHaveAttribute("aria-valuenow", "20");
});
