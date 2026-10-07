import { describe, expect, it } from "vitest";
import { getNoteTemplates } from "./noteTemplates";

describe("note templates", () => {
  it("provides meeting, weekly review, and lesson outlines in both languages", () => {
    for (const language of [false, true]) {
      const templates = getNoteTemplates(language);
      expect(templates.map((template) => template.id)).toEqual(["meeting", "weekly_review", "lesson"]);
      expect(templates.every((template) => template.title.trim() && template.content.includes("##"))).toBe(true);
    }
  });

  it("returns fresh values so editing one note cannot mutate later templates", () => {
    const first = getNoteTemplates(false);
    first[0].content = "changed";
    expect(getNoteTemplates(false)[0].content).not.toBe("changed");
  });
});
