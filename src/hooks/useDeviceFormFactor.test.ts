import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDeviceFormFactor } from "./useDeviceFormFactor";

describe("useDeviceFormFactor hook", () => {
  const originalNavigator = window.navigator;

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("returns default values in standard environment", () => {
    const { result } = renderHook(() => useDeviceFormFactor());
    expect(result.current).toBeDefined();
    expect(typeof result.current.formFactor).toBe("string");
  });

  it("respects manual localStorage override for windows", () => {
    localStorage.setItem("arshnaz_nav_mode", "windows");
    const { result } = renderHook(() => useDeviceFormFactor());
    expect(result.current.formFactor).toBe("windows");
    expect(result.current.isWindows).toBe(true);
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isPhone).toBe(false);
    expect(result.current.prefersDialog).toBe(true);
    expect(result.current.shouldUseBottomSheet).toBe(false);
  });

  it("respects manual localStorage override for foldable", () => {
    localStorage.setItem("arshnaz_nav_mode", "foldable");
    const { result } = renderHook(() => useDeviceFormFactor());
    expect(result.current.formFactor).toBe("foldable");
    expect(result.current.isFoldable).toBe(true);
    expect(result.current.isPhone).toBe(false);
    expect(result.current.prefersDialog).toBe(true);
    expect(result.current.shouldUseBottomSheet).toBe(false);
  });

  it("respects manual localStorage override for phone", () => {
    localStorage.setItem("arshnaz_nav_mode", "phone");
    const { result } = renderHook(() => useDeviceFormFactor());
    expect(result.current.formFactor).toBe("phone");
    expect(result.current.isPhone).toBe(true);
    expect(result.current.prefersDialog).toBe(false);
    expect(result.current.shouldUseBottomSheet).toBe(true);
  });

  it("respects manual localStorage override for desktop", () => {
    localStorage.setItem("arshnaz_nav_mode", "desktop");
    const { result } = renderHook(() => useDeviceFormFactor());
    expect(result.current.formFactor).toBe("desktop");
    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isPhone).toBe(false);
    expect(result.current.prefersDialog).toBe(true);
    expect(result.current.shouldUseBottomSheet).toBe(false);
  });
});
