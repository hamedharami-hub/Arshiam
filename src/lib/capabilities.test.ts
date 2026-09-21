import { describe, it, expect } from "vitest";
import {
  isFeatureEnabled,
  getFeatureCapability,
  CAPABILITIES,
  type FeatureKey,
} from "./capabilities";

describe("capabilities registry", () => {
  it("explicitly disables sharing until server-side security is ready", () => {
    expect(isFeatureEnabled("sharing")).toBe(false);
    const cap = getFeatureCapability("sharing");
    expect(cap.enabled).toBe(false);
    expect(cap.reason_en).toContain("Firebase");
  });

  it("explicitly disables client-side admin panel without custom claims", () => {
    expect(isFeatureEnabled("admin_panel")).toBe(false);
    const cap = getFeatureCapability("admin_panel");
    expect(cap.enabled).toBe(false);
    expect(cap.reason_en).toContain("custom claims");
  });

  it("explicitly disables retired edge function calls", () => {
    expect(isFeatureEnabled("about_me_ai")).toBe(false);
    expect(isFeatureEnabled("backend_holiday_sync")).toBe(false);
  });

  it("provides informative English and Persian explanations for all registered features", () => {
    const keys: FeatureKey[] = ["sharing", "admin_panel", "about_me_ai", "backend_holiday_sync"];
    for (const key of keys) {
      const cap = CAPABILITIES[key];
      expect(cap).toBeDefined();
      expect(cap.name).toBeTruthy();
      expect(cap.name_en).toBeTruthy();
      expect(cap.reason).toBeTruthy();
      expect(cap.reason_en).toBeTruthy();
    }
  });
});
