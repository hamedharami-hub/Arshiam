import { beforeEach, describe, expect, it } from "vitest";
import { offlineAssistant } from "./offlineAssistant";
import { loadOfflineModelSettings } from "./offlineModels";

beforeEach(() => localStorage.setItem("arshnaz_offline_models_v1", JSON.stringify({ assistantEnabled: true })));

describe("offline assistant", () => {
  it("extracts a Persian task date without making a network request", () => {
    const result = offlineAssistant("parse_task", "فردا ساعت ۸ به دکتر زنگ بزن", "fa");
    expect(result?.offline).toBe(true);
    expect(result?.data).toMatchObject({ priority: "none", source: "offline-deterministic" });
    expect(String(result?.data?.title)).toContain("دکتر");
  });
  it("turns explicit text lines into draft tasks without inventing schedule or priority", () => {
    const result = offlineAssistant("parse_task_list", "گزارش را بررسی کن\n- با سارا تماس بگیر", "fa");
    expect(result?.data?.items).toEqual([
      { source_text: "گزارش را بررسی کن", title: "گزارش را بررسی کن", description: "", priority: "none" },
      { source_text: "با سارا تماس بگیر", title: "با سارا تماس بگیر", description: "", priority: "none" },
    ]);
    expect(JSON.stringify(result?.data)).not.toContain("work_date");
  });
  it("flags an urgent bilingual task and produces reviewable subtasks", () => {
    expect(offlineAssistant("parse_task", "urgent: Finish Firebase setup", "en")?.data).toMatchObject({ priority: "high" });
    expect(offlineAssistant("parse_task", "این کار فوری و مهم است", "fa")?.data).toMatchObject({ priority: "high" });
    expect(offlineAssistant("parse_task", "اگر شد خرید روزانه را انجام بده", "fa")?.data).toMatchObject({ priority: "low" });
    expect(offlineAssistant("task_subtasks", "Finish Firebase setup", "en")?.text).toContain("1.");
  });

  it("generates domain-specific subtasks for coding and study tasks", () => {
    const codeSubtasks = offlineAssistant("task_subtasks", "رفع باگ لاگین در فرانت‌اند", "fa");
    expect(codeSubtasks?.text).toContain("1.");
    expect(codeSubtasks?.text).toMatch(/(کد|باگ|برنچ|لاجیک)/);

    const studySubtasks = offlineAssistant("task_subtasks", "مطالعه فصل ۴ کتاب فارماکولوژی", "fa");
    expect(studySubtasks?.text).toContain("1.");
    expect(studySubtasks?.text).toMatch(/(فهرست|منبع|مطالعه|نکته)/);
  });

  it("handles offline chat with empathy and actionable advice", () => {
    const chatResult = offlineAssistant("chat", "خیلی استرس دارم و کارها سنگین شده", "fa");
    expect(chatResult?.offline).toBe(true);
    expect(chatResult?.text).toContain("۵ دقیقه");
  });

  it("keeps the built-in assistant enabled when a legacy generative model choice is stored", () => {
    localStorage.setItem("arshnaz_offline_models_v1", JSON.stringify({
      assistantEnabled: true,
      assistantModel: "qwen-0.5b",
    }));

    expect(loadOfflineModelSettings()).toEqual({ speechMode: "system", assistantEnabled: true });
    expect(offlineAssistant("parse_task", "Call Ali tomorrow", "en")?.data).toMatchObject({
      source: "offline-deterministic",
    });
  });
});
