import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: { currentUser: null as { uid: string } | null } }));
vi.mock("./firebase", () => ({ auth: mocks.auth }));

import {
  OPERATIONS,
  OP_RECOMMENDED,
  isAIPersonalizationOptedIn,
  loadAISettings,
  saveAISettings,
  setAIPersonalizationOptedIn,
  type AIOperation,
} from "./aiSettings";

describe("AI settings coverage", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.auth.currentUser = { uid: "user-a" };
  });

  it("exposes every configured operation in Settings exactly once", () => {
    const configured = Object.keys(OP_RECOMMENDED).sort();
    const visible = OPERATIONS.map((operation) => operation.key).sort();
    expect(visible).toEqual(configured);
    expect(new Set(visible).size).toBe(visible.length);
    for (const operation of OPERATIONS) {
      expect(operation.labelEn.trim()).not.toBe("");
      expect(operation.labelFa.trim()).not.toBe("");
      expect(OP_RECOMMENDED[operation.key as AIOperation]).toBeDefined();
    }
  });

  it("binds personalization opt-in to one account and keeps per-account choices", () => {
    setAIPersonalizationOptedIn(true, "user-a");

    expect(isAIPersonalizationOptedIn("user-a")).toBe(true);
    expect(isAIPersonalizationOptedIn("user-b")).toBe(false);

    mocks.auth.currentUser = { uid: "user-b" };
    expect(isAIPersonalizationOptedIn("user-a")).toBe(false);
    expect(isAIPersonalizationOptedIn("user-b")).toBe(false);
    setAIPersonalizationOptedIn(true, "user-b");

    mocks.auth.currentUser = { uid: "user-a" };
    expect(isAIPersonalizationOptedIn("user-a")).toBe(true);
    setAIPersonalizationOptedIn(false, "user-a");
    expect(isAIPersonalizationOptedIn("user-a")).toBe(false);

    mocks.auth.currentUser = { uid: "user-b" };
    expect(isAIPersonalizationOptedIn("user-b")).toBe(true);
    expect(isAIPersonalizationOptedIn(null)).toBe(false);
  });

  it("does not bind a stale settings checkbox to the newly active account", () => {
    setAIPersonalizationOptedIn(true, "user-a");
    const settingsLoadedForA = loadAISettings();

    mocks.auth.currentUser = { uid: "user-b" };
    saveAISettings(settingsLoadedForA);

    expect(isAIPersonalizationOptedIn("user-b")).toBe(false);
    mocks.auth.currentUser = { uid: "user-a" };
    expect(isAIPersonalizationOptedIn("user-a")).toBe(true);
  });
});
