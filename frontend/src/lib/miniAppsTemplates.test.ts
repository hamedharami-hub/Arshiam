import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import {
  buildMiniAppTemplate,
  MINI_APP_TEMPLATES,
  type MiniAppTemplateId,
  type MiniAppTemplateLanguage,
} from "./miniAppsTemplates";

const languages: MiniAppTemplateLanguage[] = ["en", "fa"];

function appDom(
  id: MiniAppTemplateId,
  language: MiniAppTemplateLanguage,
  context?: Record<string, unknown>,
): JSDOM {
  return new JSDOM(buildMiniAppTemplate(id, language), {
    runScripts: "dangerously",
    url: "https://mini-app.test/",
    beforeParse(window) {
      if (context) {
        Object.defineProperty(window, "Arshiam", {
          configurable: true,
          value: { getContext: () => context },
        });
      }
    },
  });
}

function element<T extends Element>(document: Document, selector: string): T {
  const found = document.querySelector(selector);
  if (!found) throw new Error(`Expected ${selector} to be present.`);
  return found as T;
}

function click(dom: JSDOM, target: Element): void {
  target.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true, cancelable: true }));
}

function submit(dom: JSDOM, controls: HTMLElement): void {
  const action = controls.querySelector("button[type='button']");
  if (!action) throw new Error("Offline action button missing");
  click(dom, action);
}

describe("mini app templates", () => {
  it("exports the supported localized template metadata", () => {
    expect(MINI_APP_TEMPLATES).toHaveLength(3);
    expect(MINI_APP_TEMPLATES.map((template) => template.id)).toEqual([
      "calculator",
      "checklist",
      "timer",
    ]);
    for (const template of MINI_APP_TEMPLATES) {
      expect(template.name.en).not.toBe("");
      expect(template.name.fa).not.toBe("");
      expect(template.description.en).not.toBe("");
      expect(template.description.fa).not.toBe("");
    }
  });

  it("builds every tool in both languages without external resources", () => {
    for (const template of MINI_APP_TEMPLATES) {
      for (const language of languages) {
        const dom = appDom(template.id, language);
        const { document } = dom.window;
        expect(document.documentElement.lang).toBe(language);
        expect(document.documentElement.dir).toBe(language === "fa" ? "rtl" : "ltr");
        expect(document.querySelector("meta[name='viewport']")).not.toBeNull();
        expect(document.querySelector("[role='status']")).not.toBeNull();
        expect(document.querySelector(".memory-note")?.textContent).toMatch(/reset|بازنشانی/);
        expect(document.querySelectorAll("script[src], link[href], img[src], audio[src], video[src], iframe[src], object[data]")).toHaveLength(0);
        dom.window.close();
      }
    }
  });

  it("uses an available Arshiam context for HSL colors, theme, language, and direction", () => {
    const dom = appDom("calculator", "en", {
      theme: "dark",
      language: "fa",
      direction: "rtl",
      colors: { primary: "110 40% 30%" },
    });
    const { document } = dom.window;
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.lang).toBe("fa");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.style.getPropertyValue("--app-primary")).toBe("hsl(110 40% 30%)");
    expect(element<HTMLElement>(document, "#app-title").textContent).toBe("ماشین‌حساب");
    dom.window.close();
  });

  it("calculates safely and reports empty, invalid, and divide-by-zero cases", () => {
    const dom = appDom("calculator", "en");
    const { document } = dom.window;
    const form = element<HTMLElement>(document, "#calculator-form");
    const first = element<HTMLInputElement>(document, "#first-number");
    const second = element<HTMLInputElement>(document, "#second-number");
    const operation = element<HTMLSelectElement>(document, "#operation");
    const result = element<HTMLOutputElement>(document, "#calculator-result");

    submit(dom, form);
    expect(result.textContent).toBe("Enter two valid numbers.");

    first.value = "2.5";
    second.value = "3.5";
    operation.value = "+";
    submit(dom, form);
    expect(result.textContent).toBe("Result: 6");

    operation.value = "/";
    second.value = "0";
    submit(dom, form);
    expect(result.textContent).toBe("Division by zero is not possible.");
    expect(result.getAttribute("aria-live")).toBe("polite");
    dom.window.close();
  });

  it("keeps checklist entries in memory as text, tracks completion, and clears completed work", () => {
    const dom = appDom("checklist", "en");
    const { document } = dom.window;
    const form = element<HTMLElement>(document, "#checklist-form");
    const input = element<HTMLInputElement>(document, "#task-input");
    const list = element<HTMLUListElement>(document, "#task-list");
    const remaining = element<HTMLElement>(document, "#remaining-count");
    const clear = element<HTMLButtonElement>(document, "#clear-completed");

    input.value = "<strong>Plan review</strong>";
    submit(dom, form);
    expect(list.children).toHaveLength(1);
    expect(element<HTMLElement>(document, ".task-text").textContent).toBe("<strong>Plan review</strong>");
    expect(list.querySelector("strong")).toBeNull();
    expect(remaining.textContent).toBe("1 tasks remaining");

    const checkbox = element<HTMLInputElement>(document, ".task-item input[type='checkbox']");
    checkbox.checked = true;
    checkbox.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    expect(remaining.textContent).toBe("0 tasks remaining");
    expect(clear.disabled).toBe(false);

    click(dom, clear);
    expect(list.children).toHaveLength(0);
    expect(remaining.textContent).toBe("0 tasks remaining");

    input.value = "x".repeat(121);
    submit(dom, form);
    expect(element<HTMLElement>(document, "#checklist-status").textContent).toBe("Each task can be at most 120 characters.");
    dom.window.close();
  });
});

describe("timer template", () => {
  it("uses a Date.now deadline, prevents duplicate intervals, and restores controls on completion", () => {
    let now = 0;
    let active = false;
    let scheduled: (() => void) | null = null;
    let intervalStarts = 0;
    const dom = new JSDOM(buildMiniAppTemplate("timer", "en"), {
      runScripts: "dangerously",
      url: "https://mini-app.test/",
      beforeParse(window) {
        Object.defineProperty(window.Date, "now", {
          configurable: true,
          value: () => now,
        });
        Object.defineProperty(window, "setInterval", {
          configurable: true,
          value: (handler: TimerHandler): number => {
            intervalStarts += 1;
            active = true;
            scheduled = typeof handler === "function" ? () => handler() : null;
            return intervalStarts;
          },
        });
        Object.defineProperty(window, "clearInterval", {
          configurable: true,
          value: () => {
            active = false;
            scheduled = null;
          },
        });
      },
    });
    const { document } = dom.window;
    const minutes = element<HTMLInputElement>(document, "#timer-minutes");
    const seconds = element<HTMLInputElement>(document, "#timer-seconds");
    const display = element<HTMLElement>(document, "#timer-display");
    const status = element<HTMLElement>(document, "#timer-status");
    const start = element<HTMLButtonElement>(document, "#timer-start");
    const pause = element<HTMLButtonElement>(document, "#timer-pause");

    minutes.value = "0";
    seconds.value = "2";
    click(dom, start);
    click(dom, start);
    expect(intervalStarts).toBe(1);
    expect(display.textContent).toBe("00:02");
    expect(minutes.disabled).toBe(true);
    expect(seconds.disabled).toBe(true);

    now += 1_000;
    if (active && scheduled) scheduled();
    expect(display.textContent).toBe("00:01");

    click(dom, pause);
    expect(status.textContent).toBe("Paused");
    expect(start.textContent).toBe("Resume");
    now += 5_000;
    if (active && scheduled) scheduled();
    expect(display.textContent).toBe("00:01");

    click(dom, start);
    expect(intervalStarts).toBe(2);
    now += 1_000;
    if (active && scheduled) scheduled();
    expect(display.textContent).toBe("00:00");
    expect(status.textContent).toBe("Time is complete.");
    expect(minutes.disabled).toBe(false);
    expect(seconds.disabled).toBe(false);
    dom.window.close();
  });

  it("caps timer duration at 180 minutes and rejects an empty duration", () => {
    const dom = appDom("timer", "en");
    const { document } = dom.window;
    const minutes = element<HTMLInputElement>(document, "#timer-minutes");
    const seconds = element<HTMLInputElement>(document, "#timer-seconds");
    const start = element<HTMLButtonElement>(document, "#timer-start");
    const display = element<HTMLElement>(document, "#timer-display");
    const status = element<HTMLElement>(document, "#timer-status");

    minutes.value = "0";
    seconds.value = "0";
    click(dom, start);
    expect(status.textContent).toBe("Duration must be greater than zero.");

    minutes.value = "180";
    seconds.value = "59";
    click(dom, start);
    expect(display.textContent).toBe("180:00");
    expect(minutes.value).toBe("180");
    expect(seconds.value).toBe("0");
    expect(status.textContent).toContain("capped at 180 minutes");
    dom.window.close();
  });
});

describe("sandbox-compatible template actions", () => {
  it("does not use native forms or submit buttons in any starter", () => {
    for (const template of MINI_APP_TEMPLATES) {
      const dom = appDom(template.id, "en");
      expect(dom.window.document.querySelector("form,button[type='submit']")).toBeNull();
      dom.window.close();
    }
  });
  it("calculates and adds checklist entries with Enter without submitting a form", () => {
    const calculator = appDom("calculator", "en");
    const first = element<HTMLInputElement>(calculator.window.document, "#first-number");
    const second = element<HTMLInputElement>(calculator.window.document, "#second-number");
    first.value = "2";
    second.value = "3";
    const calculateKey = new calculator.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    second.dispatchEvent(calculateKey);
    expect(calculateKey.defaultPrevented).toBe(true);
    expect(element<HTMLElement>(calculator.window.document, "#calculator-result").textContent).toBe("Result: 5");
    calculator.window.close();
    const checklist = appDom("checklist", "en");
    const input = element<HTMLInputElement>(checklist.window.document, "#task-input");
    input.value = "Keyboard task";
    const addKey = new checklist.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    input.dispatchEvent(addKey);
    expect(addKey.defaultPrevented).toBe(true);
    expect(element<HTMLElement>(checklist.window.document, "#task-list").textContent).toContain("Keyboard task");
    checklist.window.close();
  });
  it("does not confuse the host muted background token with readable text", () => {
    const dom = appDom("calculator", "en", { colors: { background: "0 0% 100%", muted: "0 0% 98%", foreground: "240 10% 4%" } });
    expect(dom.window.document.documentElement.style.getPropertyValue("--app-muted")).toBe("hsl(240 10% 4%)");
    dom.window.close();
  });
});
