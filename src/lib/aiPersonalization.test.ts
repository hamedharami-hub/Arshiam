import { describe, it, expect, vi, beforeEach } from "vitest";
import { formatAboutMeForAI, getAboutMeAIPromptDirectives, type AboutMeRow } from "./aboutMe";
import { buildPersonalizationContext } from "./aiPersonalization";
import { saveAISettings, setAIPersonalizationOptedIn } from "./aiSettings";

describe("About Me & AI Personalization Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("formatAboutMeForAI", () => {
    it("formats raw questionnaire answers even when AI analysis is null", () => {
      const row: AboutMeRow = {
        user_id: "user_123",
        answers: {
          occupation: "Senior Backend Developer",
          age_range: "26-35",
          city: "Tehran",
          main_goal: "Launch open-source productivity app",
          life_areas: ["شغل", "سلامت", "مالی"],
          long_dream: "Lead a remote global engineering lab",
          energy_time: "صبح زود",
          learning_style: ["تمرین عملی", "خواندن"],
          biggest_challenge: "Overcommitting to side projects",
          blockers: ["کمال‌گرایی", "کمبود وقت"],
          stress_level: "متوسط",
          core_values: ["آزادی", "خلاقیت", "یادگیری"],
          meaning: "Building tools that liberate human potential",
        },
        free_text: "I prefer concise bullet points and direct feedback.",
        ai_analysis: null,
        ai_suggestions: null,
        analyzed_at: null,
        updated_at: new Date().toISOString(),
      };

      const faParts = formatAboutMeForAI(row, "fa");
      const joinedFa = faParts.join("\n");

      expect(joinedFa).toContain("Senior Backend Developer");
      expect(joinedFa).toContain("26-35");
      expect(joinedFa).toContain("Launch open-source productivity app");
      expect(joinedFa).toContain("صبح زود");
      expect(joinedFa).toContain("تمرین عملی");
      expect(joinedFa).toContain("Overcommitting to side projects");
      expect(joinedFa).toContain("کمال‌گرایی");
      expect(joinedFa).toContain("خلاقیت");
      expect(joinedFa).toContain("I prefer concise bullet points");

      const enParts = formatAboutMeForAI(row, "en");
      const joinedEn = enParts.join("\n");
      expect(joinedEn).toContain("Role/Study: Senior Backend Developer");
      expect(joinedEn).toContain("Peak Energy Time: صبح زود");
      expect(joinedEn).toContain("Common Blockers: کمال‌گرایی, کمبود وقت");
    });

    it("includes AI analysis alongside raw answers when available", () => {
      const row: AboutMeRow = {
        user_id: "user_123",
        answers: {
          occupation: "Architect",
        },
        free_text: null,
        ai_analysis: {
          summary: "Highly creative visual thinker with high standards.",
          themes: ["Design", "Urbanism"],
          strengths: ["Spatial reasoning", "Aesthetic taste"],
          risks: ["Procrastination under ambiguity"],
        },
        ai_suggestions: null,
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const parts = formatAboutMeForAI(row, "fa");
      const joined = parts.join("\n");

      expect(joined).toContain("Architect");
      expect(joined).toContain("Highly creative visual thinker");
      expect(joined).toContain("Spatial reasoning");
      expect(joined).toContain("Procrastination under ambiguity");
    });
  });

  describe("getAboutMeAIPromptDirectives", () => {
    it("returns actionable instructions on energy timing, blockers, and goal orientation", () => {
      const faDirectives = getAboutMeAIPromptDirectives("fa");
      expect(faDirectives).toContain("ریتم انرژی");
      expect(faDirectives).toContain("مدیریت موانع");
      expect(faDirectives).toContain("کمال‌گرایی");
      expect(faDirectives).toContain("جهت‌گیری به سوی اهداف");

      const enDirectives = getAboutMeAIPromptDirectives("en");
      expect(enDirectives).toContain("peak energy window");
      expect(enDirectives).toContain("Barrier Sensitivity");
      expect(enDirectives).toContain("Goal Alignment");
    });
  });

  describe("buildPersonalizationContext", () => {
    it("returns empty context when user has opted out of personalization", async () => {
      setAIPersonalizationOptedIn(false);

      const res = await buildPersonalizationContext({ uid: "user_test" });
      expect(res.isOptedIn).toBe(false);
      expect(res.contextText).toBe("");
      expect(res.hasData).toBe(false);
    });

    it("compiles About Me and self-knowledge profile when opted in", async () => {
      setAIPersonalizationOptedIn(true);

      const res = await buildPersonalizationContext({ uid: "user_with_data" });
      expect(res.isOptedIn).toBe(true);
      // Even if database has mock or empty records in unit test, it returns valid structure
      expect(res.aboutMePoints).toBeDefined();
      expect(res.mindPoints).toBeDefined();
    });
  });
});
