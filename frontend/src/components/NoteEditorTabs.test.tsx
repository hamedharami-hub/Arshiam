import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NoteEditorTabs } from "./NoteEditorTabs";

const mocks = vi.hoisted(() => ({ isEn: false }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: mocks.isEn, T: (_fa: string, en: string) => en }) }));
vi.mock("@/components/VoiceInputButton", () => ({ VoiceInputButton: () => null }));
vi.mock("@/components/NoteMarkdown", () => ({ NoteMarkdown: () => null }));

describe("NoteEditorTabs Markdown direction", () => {
  beforeEach(() => { mocks.isEn = false; });

  it("follows Persian text direction while resolving mixed markup per line", () => {
    render(<NoteEditorTabs noteId="note-1" markdown={'# یادداشت\n\n```ts\nconst value = "text";\n```'} onChange={() => {}} mode="markdown" />);
    const editor = screen.getByRole("textbox");
    expect(editor).toHaveAttribute("dir", "auto");
    expect(editor).toHaveStyle({ unicodeBidi: "plaintext", textAlign: "start" });
  });

  it("keeps the English Markdown source left-to-right", () => {
    mocks.isEn = true;
    render(<NoteEditorTabs noteId="note-1" markdown="<table><tr><td>markup</td></tr></table>" onChange={() => {}} mode="markdown" />);
    expect(screen.getByRole("textbox")).toHaveAttribute("dir", "ltr");
  });
});
