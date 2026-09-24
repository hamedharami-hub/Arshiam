import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  generateInteractiveContent,
  attachInteractiveListeners,
  INTERACTIVE_PRESETS,
} from "./interactiveLearningHelper";
import { callAI } from "@/lib/ai";

vi.mock("@/lib/ai", () => ({ callAI: vi.fn() }));

describe("interactiveLearningHelper", () => {
  it("defines all 7 interactive preset options with Persian and English labels", () => {
    expect(INTERACTIVE_PRESETS.length).toBe(7);
    const ids = INTERACTIVE_PRESETS.map((p) => p.id);
    expect(ids).toContain("flip_card");
    expect(ids).toContain("quiz_mcq");
    expect(ids).toContain("pair_match");
    expect(ids).toContain("clinical_case");
    expect(ids).toContain("cloze_deletion");
    expect(ids).toContain("decision_tree");
    expect(ids).toContain("memory_game");
  });

  it("returns sanitized AI-generated HTML", async () => {
    vi.mocked(callAI).mockResolvedValueOnce({ text: '<div class="interactive-learning-block"><p>Lesson-based card</p></div>' });

    const html = await generateInteractiveContent({
      title: "Lesson",
      content: "A source passage.",
      selectedPresets: ["flip_card"],
    });

    expect(html).toContain("interactive-learning-block");
    expect(html).toContain("Lesson-based card");
  });

  it("fails visibly instead of substituting canned clinical examples when AI is unavailable", async () => {
    vi.mocked(callAI).mockRejectedValueOnce(new Error("offline"));

    await expect(
      generateInteractiveContent({
        title: "A lesson unrelated to antidepressants",
        content: "Source content without any drug-specific claims.",
        selectedPresets: ["clinical_case", "decision_tree"],
        language: "en",
      })
    ).rejects.toThrow("no automatic fallback was produced");
  });

  it("rejects an empty AI response instead of reporting a false success", async () => {
    vi.mocked(callAI).mockResolvedValueOnce({ text: "" });

    await expect(
      generateInteractiveContent({
        title: "Lesson",
        content: "Source passage.",
        selectedPresets: ["quiz_mcq"],
        language: "en",
      })
    ).rejects.toThrow("no automatic fallback was produced");
  });

  describe("attachInteractiveListeners DOM handling", () => {
    let container: HTMLDivElement;
    let cleanup: () => void;

    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
    });

    afterEach(() => {
      if (cleanup) cleanup();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    });

    it("toggles .is-flipped on flip card click", () => {
      container.innerHTML = `
        <div class="interactive-flip-card">
          <div class="flip-card-inner">
            <div class="flip-card-front"><button class="inner-btn">Front</button></div>
            <div class="flip-card-back">Back</div>
          </div>
        </div>
      `;
      cleanup = attachInteractiveListeners(container);

      const card = container.querySelector(".interactive-flip-card") as HTMLElement;
      const btn = container.querySelector(".inner-btn") as HTMLElement;

      expect(card.classList.contains("is-flipped")).toBe(false);

      btn.click();
      expect(card.classList.contains("is-flipped")).toBe(true);

      btn.click();
      expect(card.classList.contains("is-flipped")).toBe(false);
    });

    it("evaluates quiz answers and shows explanation", () => {
      container.innerHTML = `
        <div class="interactive-quiz-card">
          <div class="quiz-options">
            <button class="interactive-quiz-option" data-correct="false" data-rationale="نادرست است">A</button>
            <button class="interactive-quiz-option" data-correct="true" data-rationale="کاملاً صحیح است">B</button>
          </div>
          <div class="quiz-explanation hidden"></div>
        </div>
      `;
      cleanup = attachInteractiveListeners(container);

      const options = container.querySelectorAll(".interactive-quiz-option");
      const optA = options[0] as HTMLButtonElement;
      const optB = options[1] as HTMLButtonElement;
      const explanation = container.querySelector(".quiz-explanation") as HTMLElement;

      optA.click();
      expect(optA.classList.contains("option-incorrect")).toBe(true);
      expect(optB.classList.contains("option-correct")).toBe(true);
      expect(explanation.classList.contains("hidden")).toBe(false);
      expect(explanation.classList.contains("is-visible")).toBe(true);
      expect(explanation.textContent).toContain("نادرست است");
    });

    it("matches pairs when corresponding items are clicked", () => {
      container.innerHTML = `
        <div class="interactive-pair-container">
          <div class="pair-columns">
            <button class="interactive-pair-btn" data-pair-id="1" data-side="left">دارو A</button>
            <button class="interactive-pair-btn" data-pair-id="1" data-side="right">کاربرد A</button>
          </div>
          <div class="pair-feedback hidden"></div>
        </div>
      `;
      cleanup = attachInteractiveListeners(container);

      const btns = container.querySelectorAll(".interactive-pair-btn");
      const btnLeft = btns[0] as HTMLButtonElement;
      const btnRight = btns[1] as HTMLButtonElement;
      const feedback = container.querySelector(".pair-feedback") as HTMLElement;

      btnLeft.click();
      expect(btnLeft.classList.contains("is-selected")).toBe(true);

      btnRight.click();
      expect(btnLeft.classList.contains("is-matched")).toBe(true);
      expect(btnRight.classList.contains("is-matched")).toBe(true);
      expect(feedback.classList.contains("hidden")).toBe(false);
    });

    it("advances clinical case steps on next button click", () => {
      container.innerHTML = `
        <div class="interactive-case-container">
          <div class="case-step active" data-step="1">
            <button class="interactive-case-next-btn" data-next-step="2">Next Step</button>
          </div>
          <div class="case-step hidden" data-step="2">
            Step 2 Content
          </div>
        </div>
      `;
      cleanup = attachInteractiveListeners(container);

      const step1 = container.querySelector('[data-step="1"]') as HTMLElement;
      const step2 = container.querySelector('[data-step="2"]') as HTMLElement;
      const nextBtn = container.querySelector(".interactive-case-next-btn") as HTMLButtonElement;

      expect(step1.classList.contains("active")).toBe(true);
      expect(step2.classList.contains("hidden")).toBe(true);

      nextBtn.click();
      expect(step1.classList.contains("hidden")).toBe(true);
      expect(step2.classList.contains("active")).toBe(true);
    });

    it("reveals cloze blank on click", () => {
      container.innerHTML = `
        <p>درمان انتخابی <span class="interactive-cloze-blank" data-answer="سرترالین">[؟]</span> است.</p>
      `;
      cleanup = attachInteractiveListeners(container);

      const blank = container.querySelector(".interactive-cloze-blank") as HTMLElement;
      expect(blank.textContent).toBe("[؟]");

      blank.click();
      expect(blank.textContent).toBe("سرترالین");
      expect(blank.classList.contains("is-revealed")).toBe(true);
    });

    it("navigates decision tree branching on choice click", () => {
      container.innerHTML = `
        <div class="interactive-decision-tree">
          <div class="decision-node active" data-node-id="root">
            <button class="decision-choice-btn" data-target-node="branch_a">Go to Branch A</button>
          </div>
          <div class="decision-node hidden" data-node-id="branch_a">
            Branch A Content
          </div>
        </div>
      `;
      cleanup = attachInteractiveListeners(container);

      const rootNode = container.querySelector('[data-node-id="root"]') as HTMLElement;
      const branchANode = container.querySelector('[data-node-id="branch_a"]') as HTMLElement;
      const choiceBtn = container.querySelector(".decision-choice-btn") as HTMLButtonElement;

      expect(rootNode.classList.contains("active")).toBe(true);
      expect(branchANode.classList.contains("hidden")).toBe(true);

      choiceBtn.click();
      expect(rootNode.classList.contains("hidden")).toBe(true);
      expect(branchANode.classList.contains("active")).toBe(true);
    });
  });
});
