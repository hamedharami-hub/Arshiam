import { describe, expect, it } from "vitest";
import { parse } from "postcss";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
const tailwind = readFileSync(resolve(process.cwd(), "tailwind.config.ts"), "utf8");
const stylesheet = parse(css);
function declarations(selector: string) {
  const values: Record<string, string> = {};
  stylesheet.walkRules(selector, (rule) => {
    rule.walkDecls((declaration) => { values[declaration.prop] = declaration.value; });
  });
  return values;
}

describe("theme token contracts (not rendered contrast verification)", () => {
  it("pairs success markers with theme-specific ink in light and dark themes", () => {
    expect(declarations(":root")["--success-foreground"]).toBe("0 0% 100%");
    expect(declarations(".dark")["--success-foreground"]).toBe("30 6% 8%");
    expect(declarations(".interactive-quiz-option.option-correct .option-marker").color).toBe("hsl(var(--success-foreground))");
    expect(declarations(".interactive-quiz-option.option-incorrect .option-marker").color).toBe("hsl(var(--destructive-foreground))");
  });

  it("uses only theme colors throughout callouts and learning status styles", () => {
    const learning = css.slice(css.indexOf("/* Callout Boxes"), css.indexOf("@keyframes shake"));
    expect(learning).not.toMatch(/hsl\(\s*\d/);
    for (const name of ["pearl", "warning", "dosage"]) {
      expect(declarations(`.knowledge-html-content .callout-${name} strong`).color).toBe("hsl(var(--foreground))");
    }
    expect(css).toContain("@media (prefers-contrast: more)");
  });

  it("shares language stacks between body, font-sans and toasts", () => {
    expect(css).toContain("font-family: var(--font-sans)");
    expect(tailwind).toContain('sans: ["var(--font-sans)"]');
    expect(declarations('html[lang^="en"]')["--font-sans"]).toBe("var(--font-en)");
    expect(css).toContain('--font-sans: var(--font-fa); font-family: var(--font-sans)');
  });

  it("budgets the actual shared header height in study workspaces", () => {
    expect(declarations(":root")["--app-header-height"]).toBe("3.5rem");
    expect(declarations(".app-shell-header")["min-height"]).toContain("var(--app-header-height)");
    stylesheet.walkRules(".study-workspace", (rule) => {
      rule.walkDecls("height", (decl) => expect(decl.value).toContain("var(--app-header-height)"));
    });
  });

  it("does not neutralize arbitrary gradients or replace status colors with primary", () => {
    expect(css).not.toContain('[class*="bg-gradient-to-"]');
    expect(css).not.toContain('.text-transparent.bg-clip-text');
    expect(declarations('[data-sidebar="sidebar"][data-mobile="true"]')["background-color"]).toBe("hsl(var(--sidebar-background))");
  });
});
