import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KnowledgeSectionContent } from "./KnowledgeSectionContent";
import { classifySection } from "./DrugTiers";
import { enhanceImagesHtml } from "./PharmacyImageViewer";

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true, lang: "en" }) }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));

const drug = `<p>Sample medicine A — sample class</p>
<h2>Indications</h2><p>Sample use</p>
<h2>Warnings</h2><p>Sample warning text</p>
<h2>Dosing</h2><p>Sample dosing summary</p>
<h2>Interactions</h2><p>Sample interactions</p>
<h2>Mechanism of action</h2><p>Sample mechanism</p>
<h2>Sources</h2><p>Sample source</p>`;

describe("three-level drug page", () => {
  it("classifies headings by tier", () => {
    expect(classifySection("Warnings")).toEqual({ tier: 1, warning: true });
    expect(classifySection("منع مصرف")).toEqual({ tier: 1, warning: true });
    expect(classifySection("Indications").tier).toBe(1);
    expect(classifySection("Dosing").tier).toBe(2);
    expect(classifySection("Mechanism of action").tier).toBe(3);
  });
  it("always shows warnings with icon and text; collapses details and sources", () => {
    render(<KnowledgeSectionContent html={drug} dir="ltr" className="x" />);
    const warning = screen.getByTestId("drug-warning");
    expect(warning).toHaveTextContent("Critical warning");
    expect(warning.querySelector("svg")).not.toBeNull();
    expect(screen.getByTestId("drug-tier-2")).toHaveTextContent("Sample dosing summary");
    const details = screen.getByTestId("drug-tier-3") as HTMLDetailsElement;
    expect(details.open).toBe(false);
    expect(details).toHaveTextContent("Details, mechanism and sources (2)");
  });
  it("keeps the tab layout for non-drug lessons", () => {
    render(<KnowledgeSectionContent html="<h2>Intro</h2><p>a</p><h2>Other</h2><p>b</p>" dir="ltr" className="x" />);
    expect(screen.queryByTestId("drug-tiers")).not.toBeInTheDocument();
    expect(screen.getByTestId("knowledge-section-content")).toBeInTheDocument();
  });
});

describe("images", () => {
  it("adds lazy loading and an alt attribute", () => {
    expect(enhanceImagesHtml('<img src="a.png">')).toBe('<img src="a.png" loading="lazy" decoding="async" alt="">');
    expect(enhanceImagesHtml('<img src="a.png" alt="Pill" loading="eager">')).toContain('alt="Pill"');
  });
  it("opens a zoomable viewer on click and zooms in steps", () => {
    render(<KnowledgeSectionContent html={'<p>x</p><img src="https://example.test/a.png" alt="Sample pill">'} dir="ltr" className="x" />);
    fireEvent.click(screen.getByAltText("Sample pill"));
    expect(screen.getByTestId("image-zoom-level")).toHaveTextContent("100%");
    fireEvent.click(screen.getByTestId("image-zoom-in"));
    expect(screen.getByTestId("image-zoom-level")).toHaveTextContent("150%");
    expect(screen.getByTestId("image-zoom-out")).not.toBeDisabled();
  });
  it("swaps a broken image for a standard placeholder that keeps the alt text", () => {
    render(<KnowledgeSectionContent html={'<p>x</p><img src="https://example.test/missing.png" alt="Sample pill">'} dir="ltr" className="x" />);
    fireEvent.error(screen.getByAltText("Sample pill"));
    expect(screen.getByTestId("image-placeholder")).toHaveAttribute("aria-label", "Image unavailable: Sample pill");
  });
});
