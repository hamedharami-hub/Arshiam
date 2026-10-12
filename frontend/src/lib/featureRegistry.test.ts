import { describe, it, expect } from "vitest";
import { FEATURES, FEATURE_CENTERS, findFeature, getFeatureLabel, featureSearchText, getFeatureNavigation, isFeatureAvailable } from "./featureRegistry";
import type { ModulesState } from "./appModules";

/**
 * Every navigable `/app/*` feature declared in `src/App.tsx`, excluding
 * redirect-only legacy aliases (`/app/habits`, `/app/abc`, `/app/kanban`,
 * `/app/buckets`, `/app/socratic`, `/app/sos`, `/app/new-task`, `/app/new-note`)
 * and id-parameterised detail routes (`/app/tasks/:id`, `/app/folder/:id`,
 * `/app/tag/:id`, `/app/widget/:id`, `/app/self/test/:type`,
 * `/app/self/result/:type`, `/app/screener/:type`, `/app/mind/session/:id`,
 * `/app/mind/check/:id`, `/app/mind/needs/:cat/:topic`, `/app/share-target`).
 *
 * The parameterised `/app/mind/needs/:cat` browse route is represented by the
 * concrete `/app/mind/needs/problem` entry (asserted separately below).
 *
 * Keep this list in sync with `src/App.tsx` whenever routes change.
 */
const NAVIGABLE_FEATURES = [
  "/app/inbox",
  "/app/today",
  "/app/tomorrow",
  "/app/next7",
  "/app/smart",
  "/app/notes",
  "/app/diary",
  "/app/garden",
  "/app/pomodoro",
  "/app/calendar",
  "/app/contacts",
  "/app/knowledge",
  "/app/knowledge-mindmap",
  "/app/interactive-study",
  "/app/continue",
  "/app/recall",
  "/app/stats",
  "/app/planning",
  "/app/mind",
  "/app/crisis",
  "/app/self",
  "/app/checkin",
  "/app/thoughts",
  "/app/mind/trends",
  "/app/mind/needs/problem",
  "/app/mind/my-needs",
  "/app/calm",
  "/app/breathing",
  "/app/sleep",
  "/app/values",
  "/app/life-architect",
  "/app/worry",
  "/app/cycle",
  "/app/about-me",
  "/app/settings",
  "/app/admin",
  "/app/shared",
  "/app/tools",
  "/app/widgets",
  "/app/rewrite-article",
  "/app/new/task",
  "/app/new/note",
];

describe("featureRegistry", () => {
  it("maps canonical navigation and rejects unknown routes rather than inventing destinations", () => {
    const feature = findFeature("/app/tools")!;
    expect(getFeatureNavigation(feature.to)).toEqual({ url: feature.to, label: feature.nameFa, icon: feature.icon });
    expect(() => getFeatureNavigation("/app/not-a-route")).toThrow("Unregistered navigation feature");
  });

  it("retains understandable aliases in feature search", () => {
    expect(featureSearchText(findFeature("/app/tools")!)).toContain("code vault");
    expect(featureSearchText(findFeature("/app/thoughts")!)).toContain("think it through");
    expect(featureSearchText(findFeature("/app/thoughts")!)).toContain("بررسی فکر");
    expect(featureSearchText(findFeature("/app/checkin")!)).toContain("حال امروز");
  });

  it("uses existing module access rules and keeps admin access separate", () => {
    const locked: ModulesState = { ready: true, installed: [], unlocked: ["mind", "study"], isAdmin: false, isOwner: false };
    expect(isFeatureAvailable(findFeature("/app/knowledge")!, locked)).toBe(false);
    expect(isFeatureAvailable(findFeature("/app/mind/trends")!, locked)).toBe(false);
    expect(isFeatureAvailable(findFeature("/app/crisis")!, locked)).toBe(true);
    expect(isFeatureAvailable(findFeature("/app/admin")!, locked)).toBe(false);
    expect(isFeatureAvailable(findFeature("/app/admin")!, locked, true)).toBe(true);
    expect(isFeatureAvailable(findFeature("/app/knowledge")!, { ...locked, installed: ["study"] })).toBe(true);
  });
  it("covers every navigable feature with a registry entry (no orphans)", () => {
    const registered = new Set(FEATURES.map((feature) => feature.to));
    const orphans = NAVIGABLE_FEATURES.filter((to) => !registered.has(to));
    expect(orphans).toEqual([]);
  });

  it("represents the parameterised needs browse route", () => {
    expect(FEATURES.some((feature) => feature.to.startsWith("/app/mind/needs/"))).toBe(true);
  });

  it("has no duplicate routes", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const feature of FEATURES) {
      if (seen.has(feature.to)) duplicates.push(feature.to);
      seen.add(feature.to);
    }
    expect(duplicates).toEqual([]);
  });

  it("gives every entry non-empty bilingual names and keywords", () => {
    for (const feature of FEATURES) {
      expect(feature.nameFa.trim().length, `${feature.to} nameFa`).toBeGreaterThan(0);
      expect(feature.nameEn.trim().length, `${feature.to} nameEn`).toBeGreaterThan(0);
      expect(feature.keywordsFa.trim().length, `${feature.to} keywordsFa`).toBeGreaterThan(0);
      expect(feature.keywordsEn.trim().length, `${feature.to} keywordsEn`).toBeGreaterThan(0);
    }
  });

  it("uses only declared centers", () => {
    const centers = new Set(FEATURE_CENTERS.map((center) => center.id));
    for (const feature of FEATURES) {
      expect(centers.has(feature.center), `${feature.to} center`).toBe(true);
    }
  });

  it("assigns each entry an icon and a unique order", () => {
    const orders = new Set<number>();
    const duplicates: number[] = [];
    for (const feature of FEATURES) {
      expect(feature.icon, `${feature.to} icon`).toBeTruthy();
      if (orders.has(feature.order)) duplicates.push(feature.order);
      orders.add(feature.order);
    }
    expect(duplicates).toEqual([]);
  });

  it("exposes helpers that resolve routes and searchable text", () => {
    expect(findFeature("/app/today")?.nameEn).toBe("Today");
    expect(findFeature("/app/does-not-exist")).toBeUndefined();
    const today = findFeature("/app/today")!;
    expect(getFeatureLabel(today, true)).toBe("Today");
    expect(getFeatureLabel(today, false)).toBe("امروز");
    expect(featureSearchText(today)).toContain("today");
  });
});
