import { describe, expect, it } from "vitest";
import {
  buildMindMapRootCenterByNodeId,
  buildMindMapOutline,
  getKnowledgeMindMapConnectorPath,
  getMindMapNodeDimensions,
  layoutKnowledgeMindMapRadial,
  layoutKnowledgeMindMapVertical,
} from "./knowledgeMindMapLayout";

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

  it("compacts secondary metadata without truncating bilingual card text", () => {
    const title = "پرسش فارسی نسبتاً طولانی برای نمایش در نقشه";
    const translation = "A complete English translation that still needs room to wrap";
    const detailed = getMindMapNodeDimensions("card", title, "جعبه ۳", translation);
    const compact = getMindMapNodeDimensions("card", title, "جعبه ۳", translation, "compact");

    expect(compact.width).toBe(detailed.width);
    expect(compact.height).toBeLessThan(detailed.height);
    expect(compact.height).toBeGreaterThan(getMindMapNodeDimensions("card", title, undefined, translation).height - 1);
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

  it("lays out nested mind-map branches vertically without sibling overlap or ID changes", () => {
    const nodes = [
      { id: "doc-a", parentId: "folder-a", x: 260, y: 160, width: 180, height: 72, type: "doc", color: "#456" },
      { id: "root", x: 20, y: 20, width: 160, height: 64, type: "root", color: "#123" },
      { id: "folder-a", parentId: "root", x: 220, y: 100, width: 150, height: 58, type: "folder", color: "#234" },
      { id: "card-a", parentId: "doc-a", x: 460, y: 180, width: 200, height: 74, type: "card", color: "#567" },
      { id: "folder-b", parentId: "root", x: 220, y: 260, width: 160, height: 60, type: "folder", color: "#345" },
    ];

    const layout = layoutKnowledgeMindMapVertical(nodes);
    const byId = new Map(layout.nodes.map((node) => [node.id, node]));
    const root = byId.get("root")!;
    const folderA = byId.get("folder-a")!;
    const folderB = byId.get("folder-b")!;
    const doc = byId.get("doc-a")!;
    const card = byId.get("card-a")!;

    expect(layout.nodes.map((node) => node.id).sort()).toEqual(nodes.map((node) => node.id).sort());
    expect(root.y).toBeLessThan(folderA.y);
    expect(folderA.y).toBe(folderB.y);
    expect(folderA.x + folderA.width).toBeLessThanOrEqual(folderB.x);
    expect(doc.y).toBeGreaterThan(folderA.y);
    expect(card.y).toBeGreaterThan(doc.y);
    expect(layout.links).toHaveLength(4);
    expect(layout.links.find((link) => link.targetId === "doc-a")).toMatchObject({
      startY: folderA.y + folderA.height,
      endY: doc.y,
    });
    expect(layout.bounds.maxX).toBeGreaterThan(card.x + card.width);
    expect(layout.bounds.maxY).toBeGreaterThan(card.y + card.height);
  });

  it("mirrors vertical sibling order for RTL and makes malformed cycles finite", () => {
    const nodes = [
      { id: "root", x: 20, y: 20, width: 140, height: 60 },
      { id: "first", parentId: "root", x: 200, y: 100, width: 120, height: 52 },
      { id: "second", parentId: "root", x: 200, y: 180, width: 120, height: 52 },
    ];
    const ltr = layoutKnowledgeMindMapVertical(nodes, "ltr");
    const rtl = layoutKnowledgeMindMapVertical(nodes, "rtl");
    const ltrById = new Map(ltr.nodes.map((node) => [node.id, node]));
    const rtlById = new Map(rtl.nodes.map((node) => [node.id, node]));

    expect(ltrById.get("first")!.x).toBeLessThan(ltrById.get("second")!.x);
    expect(rtlById.get("first")!.x).toBeGreaterThan(rtlById.get("second")!.x);

    const malformed = layoutKnowledgeMindMapVertical([
      { id: "cycle-a", parentId: "cycle-b", x: 0, y: 10, width: 100, height: 50 },
      { id: "cycle-b", parentId: "cycle-a", x: 0, y: 20, width: 100, height: 50 },
      { id: "orphan", parentId: "missing", x: 0, y: 30, width: 100, height: 50 },
    ]);

    expect(malformed.nodes).toHaveLength(3);
    expect(malformed.links).toHaveLength(1);
    expect(malformed.bounds.height).toBeGreaterThan(0);
  });

  it("spaces a radial mind map by node size and branch weight without overlap", () => {
    const nodes = [
      { id: "root", x: 0, y: 0, width: 180, height: 80, type: "root", color: "#123" },
      { id: "branch-a", parentId: "root", x: 200, y: 0, width: 140, height: 68, type: "folder", color: "#234" },
      { id: "branch-b", parentId: "root", x: 200, y: 100, width: 150, height: 70, type: "folder", color: "#345" },
      { id: "doc-a1", parentId: "branch-a", x: 380, y: 0, width: 220, height: 96, type: "doc", color: "#456" },
      { id: "doc-a2", parentId: "branch-a", x: 380, y: 120, width: 250, height: 104, type: "doc", color: "#567" },
      { id: "doc-b", parentId: "branch-b", x: 380, y: 240, width: 310, height: 146, type: "doc", color: "#678" },
      { id: "card-b", parentId: "doc-b", x: 720, y: 240, width: 190, height: 76, type: "card", color: "#789" },
    ];

    const layout = layoutKnowledgeMindMapRadial(nodes);
    const byId = new Map(layout.nodes.map((node) => [node.id, node]));

    expect(layout.nodes.map((node) => node.id).sort()).toEqual(nodes.map((node) => node.id).sort());
    expect(layout.links).toHaveLength(nodes.length - 1);
    for (let leftIndex = 0; leftIndex < layout.nodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < layout.nodes.length; rightIndex += 1) {
        const left = layout.nodes[leftIndex];
        const right = layout.nodes[rightIndex];
        const overlaps = left.x < right.x + right.width && left.x + left.width > right.x &&
          left.y < right.y + right.height && left.y + left.height > right.y;
        expect(overlaps, `${left.id} overlaps ${right.id}`).toBe(false);
      }
    }

    const root = byId.get("root")!;
    const branchA = byId.get("branch-a")!;
    const card = byId.get("card-b")!;
    expect(Math.hypot(branchA.x - root.x, branchA.y - root.y)).toBeGreaterThan(0);
    expect(card.x + card.width / 2).not.toBe(root.x + root.width / 2);
    expect(layout.bounds.width).toBeGreaterThan(800);

    const rtl = layoutKnowledgeMindMapRadial(nodes, "rtl");
    const rtlById = new Map(rtl.nodes.map((node) => [node.id, node]));
    expect(rtlById.get("branch-a")!.x + rtlById.get("branch-a")!.width / 2)
      .toBeCloseTo(2 * (root.x + root.width / 2) - (branchA.x + branchA.width / 2));
    expect(rtlById.get("branch-a")!.y).toBeCloseTo(branchA.y);
  });

  it("keeps cyclic and disconnected radial nodes finite and linked once", () => {
    const layout = layoutKnowledgeMindMapRadial([
      { id: "cycle-a", parentId: "cycle-b", x: 0, y: 10, width: 120, height: 52 },
      { id: "cycle-b", parentId: "cycle-a", x: 0, y: 20, width: 120, height: 52 },
      { id: "orphan", parentId: "missing", x: 0, y: 30, width: 120, height: 52 },
    ]);

    expect(layout.nodes).toHaveLength(3);
    expect(layout.links).toHaveLength(1);
    expect(Number.isFinite(layout.bounds.width)).toBe(true);
    expect(Number.isFinite(layout.bounds.height)).toBe(true);
    expect(layout.bounds.width).toBeGreaterThan(0);
    expect(layout.bounds.height).toBeGreaterThan(0);
  });

  it("uses enough radial circumference for a large sibling fan", () => {
    const nodes = [
      { id: "root", x: 0, y: 0, width: 180, height: 80, type: "root" },
      ...Array.from({ length: 96 }, (_, index) => ({
        id: `doc-${index}`,
        parentId: "root",
        x: 220,
        y: index * 110,
        width: 250,
        height: 112,
        type: "doc",
      })),
    ];
    const layout = layoutKnowledgeMindMapRadial(nodes);

    expect(layout.nodes).toHaveLength(nodes.length);
    expect(layout.links).toHaveLength(nodes.length - 1);
    for (let leftIndex = 0; leftIndex < layout.nodes.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < layout.nodes.length; rightIndex += 1) {
        const left = layout.nodes[leftIndex];
        const right = layout.nodes[rightIndex];
        const overlaps = left.x < right.x + right.width && left.x + left.width > right.x &&
          left.y < right.y + right.height && left.y + left.height > right.y;
        expect(overlaps, `${left.id} overlaps ${right.id}`).toBe(false);
      }
    }
  });

  it("builds actual line paths for automatic, smooth, orthogonal, straight, and polar styles", () => {
    const horizontalLink = { startX: 20, startY: 40, endX: 180, endY: 120 };
    const automatic = getKnowledgeMindMapConnectorPath(horizontalLink, "horizontal");
    const smooth = getKnowledgeMindMapConnectorPath(horizontalLink, "horizontal", "smooth_bezier");
    const step = getKnowledgeMindMapConnectorPath(horizontalLink, "horizontal", "orthogonal_step");
    const straight = getKnowledgeMindMapConnectorPath(horizontalLink, "horizontal", "straight");

    expect(automatic).toBe(smooth);
    expect(automatic).toContain(" C ");
    expect(step).toBe("M 20 40 L 100 40 L 100 120 L 180 120");
    expect(straight).toBe("M 20 40 L 180 120");

    const vertical = getKnowledgeMindMapConnectorPath(horizontalLink, "vertical", "orthogonal_step");
    expect(vertical).toBe("M 20 40 L 20 80 L 180 80 L 180 120");

    const root = { x: 0, y: 0 };
    const radialCurve = getKnowledgeMindMapConnectorPath(
      { startX: 100, startY: 50, endX: 50, endY: 130 },
      "radial",
      "polar_radial",
      root,
    );
    expect(radialCurve).toContain(" Q ");
    expect(getKnowledgeMindMapConnectorPath(horizontalLink, "radial", "auto")).toBe(
      "M 20 40 L 180 120",
    );
  });

  it("associates nodes with their hierarchy root center for radial connectors", () => {
    const centers = buildMindMapRootCenterByNodeId([
      { id: "root", x: 20, y: 10, width: 100, height: 60 },
      { id: "folder", parentId: "root", x: 180, y: 20, width: 80, height: 50 },
      { id: "card", parentId: "folder", x: 300, y: 40, width: 70, height: 40 },
      { id: "orphan", parentId: "missing", x: 500, y: 40, width: 70, height: 40 },
    ]);

    expect(centers.get("card")).toEqual({ x: 70, y: 40 });
    expect(centers.get("orphan")).toEqual({ x: 535, y: 60 });
  });
});
