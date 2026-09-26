import { beforeEach, describe, expect, it } from "vitest";
import {
  loadKnowledgeMindMapNodeStyles,
  saveKnowledgeMindMapNodeStyles,
} from "./knowledgeMindMapAppearance";

describe("knowledge mind map node appearance", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips styles under an account-scoped local key", () => {
    expect(saveKnowledgeMindMapNodeStyles("user/one", {
      "doc-1": { color: "violet", shape: "soft-square" },
    })).toBe(true);

    expect(loadKnowledgeMindMapNodeStyles("user/one")).toEqual({
      "doc-1": { color: "violet", shape: "soft-square" },
    });
    expect(loadKnowledgeMindMapNodeStyles("user/two")).toEqual({});
  });

  it("ignores malformed entries and unsupported styles in stored data", () => {
    localStorage.setItem(
      "arshnaz.knowledge-mindmap-node-styles.v1:user-1",
      JSON.stringify({
        "doc-safe": { color: "emerald", shape: "square" },
        "doc-injected": { color: "not-a-palette-token", shape: "circle" },
        "doc-bad": null,
      }),
    );

    expect(loadKnowledgeMindMapNodeStyles("user-1")).toEqual({
      "doc-safe": { color: "emerald", shape: "square" },
    });
  });

  it("removes the local key after all nodes return to the defaults", () => {
    saveKnowledgeMindMapNodeStyles("user-1", {
      "doc-1": { color: "default", shape: "rounded" },
    });

    expect(localStorage.getItem("arshnaz.knowledge-mindmap-node-styles.v1:user-1")).toBeNull();
    expect(loadKnowledgeMindMapNodeStyles("user-1")).toEqual({});
  });
});
