import { describe, expect, it } from "vitest";
import { buildMindMapOutline, getMindMapNodeDimensions } from "./knowledgeMindMapLayout";

describe("knowledge mind-map layout helpers", () => {
  it("reserves additional height for wrapped long titles and subtitles", () => {
    const short = getMindMapNodeDimensions("doc", "Short title");
    const long = getMindMapNodeDimensions(
      "doc",
      "A detailed document heading that should wrap onto several readable lines",
      "A long subtitle describing the contents of this document",
    );
    const bilingual = getMindMapNodeDimensions(
      "card",
      "پرسش فارسی نسبتاً طولانی برای نمایش در نقشه",
      "Box 1",
      "A longer English translation that should wrap without clipping",
    );
    const cardWithoutTranslation = getMindMapNodeDimensions("card", "پرسش فارسی نسبتاً طولانی برای نمایش در نقشه", "Box 1");

    expect(long.width).toBe(short.width);
    expect(long.height).toBeGreaterThan(short.height);
    expect(bilingual.height).toBeGreaterThan(cardWithoutTranslation.height);
  });

  it("reserves multiple conservative lines for long bilingual canvas text", () => {
    const dimensions = getMindMapNodeDimensions(
      "card",
      "Short title",
      "S".repeat(70),
      "E".repeat(70),
    );

    expect(dimensions.height).toBe(112);
  });

  it("builds an ordered nested outline from the visible canvas nodes", () => {
    const nodes = [
      { id: "doc-b", parentId: "folder-a", y: 220, title: "Second document" },
      { id: "root", y: 20, title: "Knowledge" },
      { id: "folder-a", parentId: "root", y: 100, title: "Folder" },
      { id: "doc-a", parentId: "folder-a", y: 160, title: "First document" },
    ];

    const outline = buildMindMapOutline(nodes);

    expect(outline.map(({ node }) => node.id)).toEqual(["root"]);
    expect(outline[0].children[0].node.id).toBe("folder-a");
    expect(outline[0].children[0].children.map(({ node }) => node.id)).toEqual([
      "doc-a",
      "doc-b",
    ]);
  });

  it("keeps nodes with a missing parent and cyclic legacy data discoverable", () => {
    const nodes = [
      { id: "cycle-a", parentId: "cycle-b", y: 10 },
      { id: "cycle-b", parentId: "cycle-a", y: 20 },
      { id: "orphan", parentId: "missing", y: 30 },
    ];

    const outline = buildMindMapOutline(nodes);
    const flattenIds = (entries: typeof outline): string[] =>
      entries.flatMap(({ node, children }) => [node.id, ...flattenIds(children)]);

    expect(flattenIds(outline).sort()).toEqual(["cycle-a", "cycle-b", "orphan"]);
  });
});
