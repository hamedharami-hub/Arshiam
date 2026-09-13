import { describe, expect, it } from "vitest";
import { descriptionLines } from "./descriptionLines";

describe("descriptionLines", () => {
  it("converts only actual nonempty lines in order", () => {
    expect(descriptionLines("First\n\n  دوم  \r\nThird"))
      .toEqual(["First", "دوم", "Third"]);
  });

  it("removes common list markers without splitting wrapped text", () => {
    expect(descriptionLines("- [ ] Buy milk\n2. Call home\nA long single line"))
      .toEqual(["Buy milk", "Call home", "A long single line"]);
  });
});
