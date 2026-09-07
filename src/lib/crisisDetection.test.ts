import { describe, it, expect } from "vitest";
import { detectCrisis } from "@/lib/crisisDetection";

describe("crisis detection", () => {
  it("triggers on suicide phrases", () => {
    expect(detectCrisis("می‌خواهم بمیرم")).toBe(true);
    expect(detectCrisis("میخوام بمیرم")).toBe(true);
    expect(detectCrisis("به فکر خودکشی هستم")).toBe(true);
  });

  it("triggers on self-harm", () => {
    expect(detectCrisis("می‌خواهم به خودم آسیب بزنم")).toBe(true);
  });

  it("triggers on hopelessness phrases", () => {
    expect(detectCrisis("هیچ راهی نیست")).toBe(true);
    expect(detectCrisis("دیگه نمیتونم")).toBe(true);
    expect(detectCrisis("بهتره نباشم")).toBe(true);
  });

  it("does not trigger on neutral text", () => {
    expect(detectCrisis("امروز خیلی خسته‌ام")).toBe(false);
    expect(detectCrisis("نیاز به استراحت دارم")).toBe(false);
    expect(detectCrisis("")).toBe(false);
  });
});
