import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NoteMarkdown } from "./NoteMarkdown";

describe("note previews", () => {
  it("shows underline and alignment without displaying HTML symbols", () => {
    const { container } = render(<NoteMarkdown>{'<p style="text-align: right"><u>Formatted note</u></p>'}</NoteMarkdown>);
    expect(screen.getByText("Formatted note").tagName).toBe("U");
    expect(container.querySelector("p")?.style.textAlign).toBe("right");
  });
  it("removes scripts, handlers and unsafe link protocols", () => {
    const { container } = render(<NoteMarkdown>{'<script>alert(1)</script><u onclick="alert(1)">Safe</u><a href="javascript:alert(1)">Link</a>'}</NoteMarkdown>);
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText("Safe").hasAttribute("onclick")).toBe(false);
    expect(screen.getByText("Link").getAttribute("href")).toBeFalsy();
  });
});
