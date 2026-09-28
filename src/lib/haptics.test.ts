import { beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  android: true,
  haptic: vi.fn(async () => ({ performed: true })),
}));
vi.mock("./nativeExperience", () => ({
  isAndroid: () => mocks.android,
  nativeExperience: { haptic: mocks.haptic },
}));
import { haptic } from "./haptics";
beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  mocks.android = true;
});
it("uses native haptics even when WebView vibration is unavailable", () => {
  haptic("success");
  expect(mocks.haptic).toHaveBeenCalledWith({ kind: "success" });
});
it("honors the user opt-out", () => {
  localStorage.setItem("haptics_off", "1");
  haptic("heavy");
  expect(mocks.haptic).not.toHaveBeenCalled();
});
it("does not require a native bridge on web", () => {
  mocks.android = false;
  haptic("selection");
  expect(mocks.haptic).not.toHaveBeenCalled();
});
