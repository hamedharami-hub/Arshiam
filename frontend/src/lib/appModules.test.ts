import { afterEach, describe, expect, it } from "vitest";
import { MODULE_IDS, isPathAllowed, setModulesState } from "@/lib/appModules";
import { getStudyTaskNavigation } from "@/lib/taskStudyService";

afterEach(() => setModulesState({ unlocked: MODULE_IDS, installed: MODULE_IDS }));

describe("app modules gating", () => {
  it("hides every route of a module that is not installed", () => {
    setModulesState({ unlocked: [], installed: [] });
    for (const path of ["/app/pharmacy", "/app/pharmacy-cyp", "/app/review/pharmacy", "/app/knowledge", "/app/mind", "/app/checkin?x=1", "/app/screener/phq9"]) {
      expect(isPathAllowed(path)).toBe(false);
    }
    for (const path of ["/app/today", "/app/crisis", "/app/settings", "/app/self", "/app/pharmacyx"]) {
      expect(isPathAllowed(path)).toBe(true);
    }
  });

  it("shows a path owned by several modules when any of them is installed", () => {
    setModulesState({ unlocked: ["study"], installed: ["study"] });
    expect(isPathAllowed("/app/review/pharmacy")).toBe(true);
    expect(isPathAllowed("/app/pharmacy")).toBe(false);
    expect(isPathAllowed("/app/mind")).toBe(false);
  });

  it("turns study tasks of a hidden module into plain tasks", () => {
    const task = { source_type: "mindmap_all" } as never;
    expect(getStudyTaskNavigation(task).isStudyTask).toBe(true);
    setModulesState({ unlocked: [], installed: [] });
    expect(getStudyTaskNavigation(task).isStudyTask).toBe(false);
  });
});
