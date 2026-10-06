import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskDescriptionEditor } from "./TaskDescriptionEditor";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "owner" } }) }));

const media = vi.hoisted(() => ({ upload: vi.fn() }));
vi.mock("@/lib/uploadMedia", () => ({ uploadMediaFull: media.upload }));
vi.mock("@/components/NoteEditorTabs", () => ({ NoteEditorTabs: ({ markdown, onChange }: { markdown: string; onChange: (value: string) => void }) => <textarea aria-label="Advanced content" value={markdown} onChange={event => onChange(event.target.value)} /> }));

vi.mock("react-i18next", async (importOriginal) => ({
  ...await importOriginal<typeof import("react-i18next")>(),
  useTranslation: () => ({ i18n: { language: "fa" } }),
}));

vi.mock("@/components/VoiceInputButton", () => ({
  VoiceInputButton: () => null,
}));

describe("TaskDescriptionEditor", () => {
  it("renders bold and safe text colors without exposing markup, including read-only descriptions", () => {
    const { container } = render(<TaskDescriptionEditor taskId="formatted" readOnly value={'**Bold** <span style="color: red">Color</span><script>bad()</script>'} onChange={vi.fn()} onSave={vi.fn()} />);
    expect(container.querySelector("strong")?.textContent).toBe("Bold");
    expect(container.querySelector("span[style]")?.getAttribute("style")).toBe("color: red;");
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByTestId("task-description-preview").textContent).not.toContain("**");
  });

  it("saves the latest typed text when the editor loses focus", async () => {
    const onSave = vi.fn();
    let current = "";
    const onChange = vi.fn((value: string) => { current = value; });
    const { rerender } = render(
      <TaskDescriptionEditor taskId="task-1" value={current} onChange={onChange} onSave={onSave} />,
    );
    const editor = screen.getByRole("textbox", { name: "توضیحات" });
    fireEvent.focus(editor);
    fireEvent.change(editor, { target: { value: "متن جدید و کامل" } });
    current = "متن جدید و کامل";
    rerender(<TaskDescriptionEditor taskId="task-1" value={current} onChange={onChange} onSave={onSave} />);
    fireEvent.blur(screen.getByDisplayValue("متن جدید و کامل"));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("متن جدید و کامل"));
  });
  it("does not attach an upload that resolves after switching to another task", async () => {
    let finish!: (value: { name: string; kind: string; url: string }) => void;
    media.upload.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const onChange = vi.fn(); const onSave = vi.fn();
    const view = render(<TaskDescriptionEditor taskId="first" value="First" onChange={onChange} onSave={onSave} />);
    fireEvent.change(screen.getByTestId("task-description-file-input"), { target: { files: [new File(["image"], "photo.png", { type: "image/png" })] } });
    view.rerender(<TaskDescriptionEditor taskId="second" value="Second" onChange={onChange} onSave={onSave} />);
    await act(async () => finish({ name: "photo.png", kind: "image", url: "https://example.test/first" }));
    expect(onChange).not.toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });
  it("keeps the advanced editor draft open when saving fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("No durable save"));
    render(<TaskDescriptionEditor taskId="task" value="Original" onChange={vi.fn()} onSave={onSave} />);
    fireEvent.focus(screen.getByRole("textbox", { name: "توضیحات" }));
    fireEvent.click(screen.getByRole("button", { name: "ویرایشگر پیشرفته" }));
    fireEvent.change(screen.getByLabelText("Advanced content"), { target: { value: "**Unsaved rich draft**" } });
    fireEvent.click(screen.getByRole("button", { name: "ذخیره" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith("**Unsaved rich draft**"));
    expect(screen.getByLabelText("Advanced content")).toHaveValue("**Unsaved rich draft**");
  });

});
