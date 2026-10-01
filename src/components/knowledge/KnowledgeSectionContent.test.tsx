import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { KnowledgeSectionContent } from "./KnowledgeSectionContent";
import { splitKnowledgeSections } from "@/lib/knowledgeSections";
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en }) }));
const content = '<p id="warning">Important source warning.</p><section class="module"><h2 id="dose">Dosing</h2><p>5 mg daily.</p><h3>Adjustment</h3><p>Preserve this instruction.</p></section><section><h2>References</h2><a href="https://example.org/primary">Primary source</a></section>';
describe("scientific lesson section tabs", () => {
  beforeEach(() => window.history.replaceState(null, "", "/"));
  it("preserves every source character, nested structure, ID and link when splitting", () => {
    const split = splitKnowledgeSections(content); expect(split.sections).toHaveLength(2);
    const original = document.createElement("div"); original.innerHTML = content;
    const combined = document.createElement("div"); combined.innerHTML = split.introduction + split.sections.map(section => section.html).join("");
    expect(combined.textContent).toBe(original.textContent);
    expect(combined.querySelector("#dose")?.textContent).toBe("Dosing");
    expect(combined.querySelector("a")?.getAttribute("href")).toBe("https://example.org/primary");
  });
  it("offers horizontal sections, retains introductory warnings and can show the whole source", () => {
    render(<KnowledgeSectionContent html={content} dir="ltr" className="knowledge-html-content" />);
    expect(screen.getByText("Important source warning.")).toBeVisible();
    expect(screen.getByText("5 mg daily.")).toBeVisible();
    expect(screen.queryByText("Primary source")).toBeNull();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "References" }), { button: 0, ctrlKey: false });
    expect(screen.getByText("Primary source")).toBeVisible();
    expect(screen.getByText("Important source warning.")).toBeVisible();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "All sections" }), { button: 0, ctrlKey: false });
    expect(screen.getByText("5 mg daily.")).toBeVisible(); expect(screen.getByText("Primary source")).toBeVisible();
  });
  it("keeps small documents as a complete article and resets the section when the document changes", () => {
    const { rerender } = render(<KnowledgeSectionContent html={content} dir="rtl" className="knowledge-html-content" />);
    rerender(<KnowledgeSectionContent html="<h2>Short note</h2><p>Complete text</p>" dir="rtl" className="knowledge-html-content" />);
    expect(screen.queryByRole("tablist")).toBeNull(); expect(screen.getByText("Complete text")).toBeVisible();
  });
  it("opens the section named in ?section= and writes the section on tab change", () => {
    const [, second] = splitKnowledgeSections(content).sections.map(section => section.id);
    window.history.replaceState(null, "", `/app/knowledge?docId=d1&section=${second}`);
    render(<KnowledgeSectionContent html={content} dir="ltr" className="knowledge-html-content" />);
    expect(screen.getByText("Primary source")).toBeVisible();
    expect(screen.queryByText("5 mg daily.")).toBeNull();
    fireEvent.mouseDown(screen.getByRole("tab", { name: "All sections" }), { button: 0, ctrlKey: false });
    expect(new URLSearchParams(window.location.search).get("section")).toBe("all");
    expect(new URLSearchParams(window.location.search).get("docId")).toBe("d1");
  });
  it("ignores an unknown ?section= and shows the first real section", () => {
    window.history.replaceState(null, "", "/app/knowledge?section=does-not-exist");
    render(<KnowledgeSectionContent html={content} dir="ltr" className="knowledge-html-content" />);
    expect(screen.getByText("5 mg daily.")).toBeVisible();
  });
});
