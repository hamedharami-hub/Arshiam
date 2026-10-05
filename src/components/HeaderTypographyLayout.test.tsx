import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import HeaderBackButton from "@/components/HeaderBackButton";
import { BidiText } from "@/components/BidiText";
import { MemoryRouter } from "react-router-dom";

describe("Header Typography & Responsive Layout in Arshiam", () => {
  const rootDir = path.resolve(__dirname, "../..");
  const indexCss = fs.readFileSync(path.join(rootDir, "src/index.css"), "utf8");
  const indexHtml = fs.readFileSync(path.join(rootDir, "index.html"), "utf8");

  it("verifies index.css enforces letter-spacing: normal !important for RTL elements", () => {
    expect(indexCss).toContain('letter-spacing: normal !important');
    expect(indexCss).toContain('[dir="rtl"]');
  });

  it("verifies index.html has preloaded Vazirmatn and early control font-family inheritance", () => {
    expect(indexHtml).toContain('href="/fonts/Vazirmatn-Regular.woff2"');
    expect(indexHtml).toContain('href="/fonts/Vazirmatn-Bold.woff2"');
    expect(indexHtml).toContain("button, input, select, textarea { font-family: inherit; }");
    expect(indexHtml).toContain('[dir="rtl"], [dir="rtl"] * { letter-spacing: normal; }');
  });

  it("renders HeaderTitlePortal into app-header-title portal container with responsive classes", () => {
    // Setup portal host
    const portalDiv = document.createElement("div");
    portalDiv.id = "app-header-title";
    document.body.appendChild(portalDiv);

    render(
      <HeaderTitlePortal
        title="امروز"
        subtitle="دوشنبه، ۱۴ مهر ۱۴۰۵"
      />
    );

    const titleEl = screen.getByRole("heading", { level: 1 });
    expect(titleEl).toBeInTheDocument();
    expect(titleEl.textContent).toBe("امروز");
    expect(titleEl.className).toContain("truncate");
    expect(titleEl.className).toContain("min-w-0");

    // Subtitle must have hidden sm:flex to prevent mobile overflow
    const subtitleText = screen.getByText("دوشنبه، ۱۴ مهر ۱۴۰۵");
    expect(subtitleText).toBeInTheDocument();
    const subtitleContainer = subtitleText.closest("div.hidden.sm\\:flex");
    expect(subtitleContainer).not.toBeNull();

    document.body.removeChild(portalDiv);
  });

  it("renders HeaderBackButton with shrink-0 and directional rotation for RTL/LTR", () => {
    render(
      <MemoryRouter initialEntries={["/app/tasks/123"]}>
        <HeaderBackButton />
      </MemoryRouter>
    );

    const button = screen.getByRole("button", { name: "بازگشت" });
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("shrink-0");

    const svg = button.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.className.baseVal || svg?.getAttribute("class")).toContain("rtl:rotate-0");
    expect(svg?.className.baseVal || svg?.getAttribute("class")).toContain("ltr:rotate-180");
  });

  it("renders BidiText with standard CSS bidi isolation and handles mixed text cleanly", () => {
    const { container } = render(
      <BidiText text="تسک مهم ARSHNAZ شماره ۱" />
    );
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span?.getAttribute("dir")).toBe("auto");
    expect(span?.style.unicodeBidi).toBe("isolate");
    expect(span?.textContent).toContain("تسک مهم ARSHNAZ شماره ۱");
  });
});
