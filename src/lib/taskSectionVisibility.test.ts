import { expect, it } from "vitest";
import { shouldShowTaskSection } from "./taskSectionVisibility";

it("keeps empty unselected sections out of the task page", () => {
  expect(shouldShowTaskSection(undefined, 0)).toBe(false);
  expect(shouldShowTaskSection(false, 0)).toBe(false);
});

it("shows explicitly selected sections even before an item is added", () => {
  expect(shouldShowTaskSection(true, 0)).toBe(true);
});

it("always reveals sections that already contain items", () => {
  expect(shouldShowTaskSection(undefined, 2)).toBe(true);
  expect(shouldShowTaskSection(false, 1)).toBe(true);
});
