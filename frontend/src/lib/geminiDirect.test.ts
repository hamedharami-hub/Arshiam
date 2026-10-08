import { describe, expect, it } from "vitest";
import { GEMINI_SYSTEM_PROMPTS } from "./geminiDirect";

describe("AI structured prompt contracts", () => {
  it("keeps About Me instructions aligned with the stored analysis and suggestion schema", () => {
    const prompt = GEMINI_SYSTEM_PROMPTS.about_me_analysis;
    expect(prompt).toContain('"ai_analysis"');
    expect(prompt).toContain('"ai_suggestions"');
    expect(prompt).toContain('"summary"');
    expect(prompt).toContain('"themes"');
    expect(prompt).toContain('"strengths"');
    expect(prompt).toContain('"risks"');
    expect(prompt).toContain('"folders"');
    expect(prompt).toContain('"tags"');
    expect(prompt).toContain('"tasks"');
    expect(prompt).toContain("Task priority must be one of none, low, medium, or high.");
    expect(prompt).toContain("Always include all object keys and arrays");
  });

  it("documents the folder-chat JSON proposal contract and its bounded context", () => {
    const prompt = GEMINI_SYSTEM_PROMPTS.folder_chat;
    expect(prompt).toContain('"summary"');
    expect(prompt).toContain('"tasks"');
    expect(prompt).toContain('"due_date"');
    expect(prompt).toContain('"kanban_column"');
    expect(prompt).toContain("owner-scoped folder task summaries");
    expect(prompt).toContain("Do not claim access to notes, other folders");
    expect(prompt).not.toContain("CALL propose_tasks tool");
  });

  it("matches the subtask prompt to the panel's questions and steps response shapes", () => {
    const prompt = GEMINI_SYSTEM_PROMPTS.task_subtasks;
    expect(prompt).toContain('"mode":"questions"');
    expect(prompt).toContain('"question"');
    expect(prompt).toContain('"options"');
    expect(prompt).toContain('"mode":"subtasks"');
    expect(prompt).toContain('"subtasks"');
    expect(prompt).toContain("Do not include prose outside the JSON");
  });

  it("defines the task-only suggestion schema consumed by AIPanel", () => {
    const prompt = GEMINI_SYSTEM_PROMPTS.suggest;
    expect(prompt).toContain('{"items":[{"title":"concise task title","description":"optional detail","priority":"none"}]}');
    expect(prompt).toContain("priority must be one of none, low, medium, high, or urgent");
    expect(prompt).toContain("Do not include note ideas, extra keys, or prose outside the JSON");
  });
});
