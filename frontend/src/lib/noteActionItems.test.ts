import { describe, expect, it } from "vitest";
import { suggestNoteActionItem } from "./noteActionItems";

describe("note action item suggestions", () => {
  it("turns a selected checklist item into an editable title", () => {
    expect(suggestNoteActionItem("- [ ] **Send the proposal**\nInclude the revised budget"))
      .toEqual({ title: "Send the proposal", description: "Include the revised budget" });
  });

  it("keeps a single selected sentence as the title without inventing a schedule", () => {
    expect(suggestNoteActionItem("Call the supplier tomorrow at 10"))
      .toEqual({ title: "Call the supplier tomorrow at 10", description: "" });
  });

  it("ignores empty selection and caps the task title", () => {
    expect(suggestNoteActionItem(" \n\t ")).toBeNull();
    expect(suggestNoteActionItem("x".repeat(250))?.title).toHaveLength(200);
  });
});
