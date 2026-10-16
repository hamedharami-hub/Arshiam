import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { NoteLinkPicker } from "./NoteLinkPicker";
import { NoteMarkdown } from "../NoteMarkdown";
import { NoteEditorTabs } from "../NoteEditorTabs";
import { useNoteLinks } from "@/hooks/useNoteLinks";
import { NoteBacklinks } from "./NoteBacklinks";
import type { NoteLinkScope } from "@/lib/noteLinks";

vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u" } }) }));
vi.mock("@/components/VoiceInputButton", () => ({ VoiceInputButton: () => null }));
const a = { id: "a", title: "Source", content: "See [old title](/app/notes?select=b)", user_id: "u" };
const b = { id: "b", title: "یادداشت کوچک", content: "Target body", user_id: "u", folder_id: "f" };
const scope: NoteLinkScope = { ownerId: "u", notes: [a, b], status: "synced", folders: new Map([["f", { name: "Folder" }]]), onOpen: vi.fn() };

describe("notes linking UI", () => {
  it("searches Persian variants, excludes private/task/foreign/self notes, and supports Enter", async () => {
    const pick = vi.fn();
    render(<NoteLinkPicker sourceId="a" scope={{ ...scope, notes: [...scope.notes, { ...b, id: "d", title: "Diary", kind: "diary" }, { ...b, id: "t", task_id: "task" }, { ...b, id: "x", user_id: "other" }] }} onPick={pick} onClose={vi.fn()} />);
    expect(screen.getAllByRole("option")).toHaveLength(1);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "يادداشت‌ كوچك" } });
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 160)); });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(pick).toHaveBeenCalledWith(b);
  });
  it("renders internal links with current-title previews; missing destinations are not followed", async () => {
    const open = vi.fn();
    const view = render(<NoteMarkdown noteLinks={{ ...scope, onOpen: open }}>{a.content}</NoteMarkdown>);
    fireEvent.click(screen.getByRole("link", { name: "old title" }));
    expect(open).toHaveBeenCalledWith("b");
    fireEvent.click(screen.getByRole("button", { name: `Preview ${b.title}` }));
    expect(await screen.findByText("Target body")).toBeInTheDocument();
    view.rerender(<NoteMarkdown noteLinks={{ ...scope, notes: [a], onOpen: open }}>{a.content}</NoteMarkdown>);
    expect(screen.queryByRole("link", { name: "old title" })).not.toBeInTheDocument();
    expect(screen.getByText(/Note unavailable/)).toBeInTheDocument();
  });
  it("inserts through the Markdown shortcut and shows the navigable live preview", async () => {
    function Editor() {
      const [text, setText] = useState("Start ");
      return <NoteEditorTabs noteId="a" markdown={text} mode="markdown" onChange={md => setText(md)} noteLinks={scope} />;
    }
    render(<Editor />);
    const body = screen.getByLabelText("Note body in Markdown");
    fireEvent.change(body, { target: { value: "Start [[", selectionStart: 8 } });
    fireEvent.click(await screen.findByRole("option", { name: /یادداشت کوچک/ }));
    expect(body).toHaveValue("Start [یادداشت کوچک](/app/notes?select=b)");
    expect(screen.getByRole("link", { name: b.title })).toBeInTheDocument();
  });
  it("rebuilds from accepted data, hides old accounts immediately and excludes private sources", async () => {
    function Backlinks({ owner, notes }: { owner: string; notes: typeof a[] }) {
      const result = useNoteLinks(owner, notes);
      return <NoteBacklinks targetId="b" scope={{ ...scope, ownerId: owner, notes: result.notes }} entries={result.index.backlinks("b")} indexing={result.indexing} />;
    }
    const view = render(<Backlinks owner="u" notes={[a, b]} />);
    await waitFor(() => expect(screen.getByText("Source")).toBeInTheDocument());
    view.rerender(<Backlinks owner="other" notes={[a, b]} />);
    expect(screen.queryByText("Source")).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("No backlinks yet")).toBeInTheDocument());
    view.rerender(<Backlinks owner="u" notes={[{ ...a, content: "Removed" }, b]} />);
    await waitFor(() => expect(screen.getByText("No backlinks yet")).toBeInTheDocument());
  });
});
