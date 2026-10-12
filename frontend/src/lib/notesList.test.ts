import { describe, expect, it } from "vitest";
import { filterNotesForList, noteListPreview } from "./notesList";

describe("production notes list operations", () => {
  const notes = [
    { title: "First", content: "BODY MATCH", folder_id: "work", tag_ids: ["one"] },
    { title: "Other", content: "plain", folder_id: null, tag_ids: [] },
    { title: "Diary", content: "match", kind: "diary", folder_id: null },
  ];
  it("searches body case-insensitively and excludes diary entries", () => {
    expect(filterNotesForList(notes, "match", null, null)).toEqual([notes[0]]);
  });
  it("combines folder/tag filters and treats explicit inbox differently from all", () => {
    expect(filterNotesForList(notes, "", "work", "one")).toEqual([notes[0]]);
    expect(filterNotesForList(notes, "", "__none__", null)).toEqual([notes[1]]);
    expect(filterNotesForList(notes, "", null, null)).toHaveLength(2);
  });
  it("strips markup without converting entire documents to editor HTML", () => {
    expect(noteListPreview("## Title\n**Text** [link](https://example.com) ![image](x) <p>end</p>")).toBe("Title Text link end");
    expect(noteListPreview("a".repeat(1000))).toHaveLength(120);
  });
});
