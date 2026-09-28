import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { forwardRef, useImperativeHandle, useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DiaryEntry } from "@/lib/diary";
import DailyDiaryView from "./DailyDiaryView";

const { subscribeMock, upsertMock, deleteMock } = vi.hoisted(() => ({
  subscribeMock: vi.fn(),
  upsertMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "test-user" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/lib/firestoreDataService", () => ({ subscribeNotes: subscribeMock, upsertNote: upsertMock, deleteNote: deleteMock }));
vi.mock("@/components/diary/DiaryAiTools", () => ({ DiaryAiTools: () => <span /> }));
vi.mock("@/components/diary/DiaryBackgroundPicker", () => ({ DiaryBackgroundPicker: () => <span /> }));
vi.mock("@/components/diary/DiaryAttachments", () => ({ DiaryAttachments: () => <span /> }));
vi.mock("@/components/diary/DiaryGooglePhotos", () => ({ DiaryGooglePhotos: () => <span /> }));
vi.mock("@/components/VoiceInputButton", () => ({
  VoiceInputButton: ({ onTranscript }: { onTranscript: (text: string) => void }) => <button onClick={() => onTranscript("A spoken memory")}>Dictate</button>,
}));
vi.mock("@/components/RichEditor", () => ({
  RichEditor: forwardRef(function MockEditor({ initialMarkdown = "", onChange }: { initialMarkdown?: string; onChange: (html: string, markdown: string) => void }, ref) {
    const [text, setText] = useState(initialMarkdown);
    useImperativeHandle(ref, () => ({
      getHtml: () => text,
      getMarkdown: () => text,
      insertText: (spoken: string) => { setText((current) => { const next = `${current} ${spoken}`.trim(); onChange(next, next); return next; }); },
    }));
    return <textarea aria-label="Entry body" value={text} onChange={(event) => { setText(event.target.value); onChange(event.target.value, event.target.value); }} />;
  }),
}));

const entry: DiaryEntry = {
  id: "entry-1", user_id: "test-user", title: "Original", content: "Initial text", pinned: false,
  created_at: "2026-09-28T01:00:00.000Z", updated_at: "2026-09-28T01:00:00.000Z", task_id: null,
  kind: "diary", diary_date: "2026-09-28", diary_background: "none", diary_opacity: 35,
};

beforeEach(() => {
  subscribeMock.mockReset();
  upsertMock.mockReset();
  deleteMock.mockReset();
  subscribeMock.mockImplementation((_userId, callback) => { callback([entry]); return () => undefined; });
});

describe("DailyDiaryView", () => {
  it("keeps newer edits unsaved until their own save completes", async () => {
    const resolvers: Array<(value: boolean) => void> = [];
    upsertMock.mockImplementation(() => new Promise<boolean>((resolve) => resolvers.push(resolve)));
    render(<DailyDiaryView />);
    fireEvent.click(screen.getByTestId("diary-entry-entry-1"));
    fireEvent.change(screen.getByTestId("diary-title-input"), { target: { value: "First edit" } });
    fireEvent.click(screen.getByTestId("diary-save-btn"));
    await waitFor(() => expect(resolvers).toHaveLength(1));
    fireEvent.change(screen.getByTestId("diary-title-input"), { target: { value: "Second edit" } });
    await act(async () => { resolvers[0](true); });
    expect(screen.getByTestId("diary-title-input")).toHaveValue("Second edit");
    expect(screen.getByTestId("diary-save-status")).not.toHaveTextContent("Saved");
    fireEvent.click(screen.getByTestId("diary-save-btn"));
    await waitFor(() => expect(resolvers).toHaveLength(2));
    await act(async () => { resolvers[1](true); });
    expect(upsertMock.mock.calls[1][1].title).toBe("Second edit");
    expect(screen.getByTestId("diary-save-status")).toHaveTextContent("Saved");
  });

  it("inserts recognized speech into the entry rather than creating an audio attachment", async () => {
    render(<DailyDiaryView />);
    fireEvent.click(screen.getByTestId("diary-entry-entry-1"));
    fireEvent.click(screen.getByRole("button", { name: "Dictate" }));
    expect(screen.getByRole("textbox", { name: "Entry body" })).toHaveValue("Initial text A spoken memory");
    expect(screen.getByTestId("diary-save-status")).toHaveTextContent("Unsaved changes");
  });
});
