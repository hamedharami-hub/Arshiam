import { describe, expect, it } from "vitest";
import { focusBackgroundDisclosure } from "./focusNotifications";

describe("focus background notification copy", () => {
  it("explains Android timing limits without promising exact delivery", () => {
    const copy = focusBackgroundDisclosure("android");
    expect(copy.descriptionEn).toContain("inexact alarms");
    expect(copy.descriptionEn).toContain("may arrive late");
    expect(copy.descriptionEn).not.toContain("will arrive");
  });

  it("describes scheduled alerts without implying a live countdown on iOS", () => {
    const copy = focusBackgroundDisclosure("ios");
    expect(copy.descriptionEn).toContain("scheduled finish alert");
    expect(copy.descriptionEn).toContain("not show a live countdown");
  });

  it("warns that browsers can suspend the page", () => {
    const copy = focusBackgroundDisclosure("web");
    expect(copy.descriptionEn).toContain("may suspend this page");
    expect(copy.descriptionEn).toContain("not guaranteed");
  });
});
