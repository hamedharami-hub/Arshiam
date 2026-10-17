import { describe, expect, it } from "vitest";
import { canTriggerNoteLink, extractNoteLinks, isLinkableNote, normalizeNoteSearch, noteLinkId, noteLinkMarkdown, noteLinkUrl } from "./noteLinks";
import { htmlToMarkdown, markdownToHtml } from "./markdown";
import { NoteLinkIndex } from "./noteLinkIndex";

const note = (id: string, content = "") => ({ id, title: id, content, user_id: "u" });

describe("internal note links", () => {
  it("accepts only the exact internal route and stable IDs", () => {
    for (const id of ["n1", "a#?%&=", "یادداشت"]) expect(noteLinkId(noteLinkUrl(id))).toBe(id);
    for (const href of ["https://evil.test/app/notes?select=n", "//evil.test/app/notes?select=n", "/app/notes?select=n&select=b", "/app/notes?select=n&owner=x", "/app/notes?select=..", "/app/notes?select=a%2Fb", "/app/notes?select=n#hash", "javascript:alert(1)"]) expect(noteLinkId(href)).toBeNull();
  });
  it("limits both ends to this account's general notes", () => {
    expect(isLinkableNote(note("a"), "u")).toBe(true);
    expect(isLinkableNote({ ...note("a"), kind: "note" }, "u")).toBe(true);
    for (const patch of [{ kind: "diary" }, { kind: "health" }, { task_id: "task" }, { user_id: "other" }]) expect(isLinkableNote({ ...note("a"), ...patch }, "u")).toBe(false);
    expect(isLinkableNote(note("a"), "")).toBe(false);
  });
  it("round-trips links with formatted Persian labels without changing other rich content", () => {
    const md = `# عنوان\n\n${noteLinkMarkdown({ id: "x#?", title: "نکته [الف] *مهم* <متن>" })}\n\n- [ ] کار\n\n![photo](https://example.test/a.png)\n\n<table><tr><td>Cell</td></tr></table>`;
    const result = htmlToMarkdown(markdownToHtml(md));
    expect(extractNoteLinks(result).map(link => link.targetId)).toEqual(["x#?"]);
    expect(result).toContain("Cell"); expect(result).toContain("https://example.test/a.png"); expect(result).toContain("[ ]");
  });
  it("indexes real Markdown and legacy HTML links, excluding code, comments and image URLs", () => {
    const url = noteLinkUrl("b");
    const source = `Before [B](${url}) after.\n\n\`[B](${url})\`\n\n\`\`\`md\n[B](${url})\n\`\`\`\n\n<!-- <a href="${url}">hidden</a> -->\n\n![image](${url})\n\n\\[literal](${url})\n\n<p>Old <a href="${url}">HTML</a></p>`;
    const links = extractNoteLinks(source);
    expect(links).toHaveLength(2);
    expect(links[0].snippet).toContain("Before B after.");
    expect(links[1].snippet).toBe("Old HTML");
  });
  it("normalizes Persian search without changing stored text", () => {
    expect(normalizeNoteSearch(" يادداشت‌ كوچك ")).toBe("یادداشت کوچک");
  });
  it("keeps shortcuts literal in code, links and escaped text", () => {
    for (const text of ["[[", "متن [["]) expect(canTriggerNoteLink(text, text.length)).toBe(true);
    for (const text of ["`[[", "```\n[[", "[text](https://x/[[", "\\[[", "<div>[["]) expect(canTriggerNoteLink(text, text.length)).toBe(false);
  });
});

describe("derived backlink index", () => {
  it("deduplicates sources, survives rename, drops deletions, and restores by ID only", () => {
    const index = new NoteLinkIndex();
    const a = note("a", `${noteLinkMarkdown(note("b"))} ${noteLinkMarkdown(note("b"))}`);
    index.update(a); index.update(note("b", noteLinkMarkdown(note("a"))));
    expect(index.backlinks("b")).toHaveLength(1);
    expect(index.backlinks("b")[0].occurrences).toHaveLength(2);
    index.update({ ...a, title: "renamed" });
    expect(index.backlinks("b")[0].occurrences).toHaveLength(2);
    index.update({ ...a, content: "no link" }); expect(index.backlinks("b")).toEqual([]);
    index.update(a); index.retain(new Set(["b"])); expect(index.backlinks("b")).toEqual([]);
    index.update(a); expect(index.backlinks("b")).toHaveLength(1); expect(index.backlinks("new-b")).toEqual([]);
  });
  it("handles self-links, cycles and large notes without recursively following links", () => {
    const index = new NoteLinkIndex();
    index.update(note("a", "text ".repeat(15_000) + noteLinkMarkdown(note("a")) + noteLinkMarkdown(note("b"))));
    index.update(note("b", noteLinkMarkdown(note("a"))));
    expect(index.backlinks("a").map(row => row.sourceId)).toEqual(["b"]);
    expect(index.backlinks("b").map(row => row.sourceId)).toEqual(["a"]);
  });
});
