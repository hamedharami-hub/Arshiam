import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskDescriptionEditor } from "./TaskDescriptionEditor";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "fa" } }),
}));

vi.mock("@/components/VoiceInputButton", () => ({
  VoiceInputButton: () => null,
}));

vi.mock("@/components/NoteEditorTabs", () => ({
  NoteEditorTabs: ({ markdown, onChange }: { markdown: string; onChange: (value: string) => void }) => (
    <textarea
      aria-label="ویرایشگر توضیحات"
      value={markdown}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe("TaskDescriptionEditor", () => {
  it("saves the latest typed text when the editor loses focus", async () => {
    const onSave = vi.fn();
    let current = "";
    const onChange = vi.fn((value: string) => { current = value; });
    const { rerender } = render(
      <TaskDescriptionEditor taskId="task-1" value={current} onChange={onChange} onSave={onSave} />,
    );
    const editor = screen.getByRole("textbox", { name: "متن تسک" });
    fireEvent.focus(editor);
    fireEvent.change(editor, { target: { value: "متن جدید و کامل" } });
    current = "متن جدید و کامل";
    rerender(<TaskDescriptionEditor taskId="task-1" value={current} onChange={onChange} onSave={onSave} />);
    fireEvent.blur(screen.getByDisplayValue("متن جدید و کامل"));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith("متن جدید و کامل"));
  });

  it("keeps fullscreen edits safe until the user saves or explicitly discards them", async () => {
    const onChange = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <TaskDescriptionEditor
        taskId="task-1"
        value="متن اولیه"
        onChange={onChange}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "تمام صفحه" }));
    fireEvent.change(screen.getByRole("textbox", { name: "ویرایشگر توضیحات" }), {
      target: { value: "متن تغییرکرده" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByText("تغییرات ذخیره نشده‌اند")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "ادامهٔ ویرایش" }));
    expect(screen.getByRole("textbox", { name: "ویرایشگر توضیحات" })).toHaveValue("متن تغییرکرده");

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.click(screen.getByRole("button", { name: "ذخیره و بستن" }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("متن تغییرکرده");
      expect(onSave).toHaveBeenCalledWith("متن تغییرکرده");
    });
  });

  it("keeps the fullscreen editor open when saving fails", async () => {
    const onChange = vi.fn();
    const onSave = vi.fn().mockRejectedValue(new Error("offline"));

    render(
      <TaskDescriptionEditor
        taskId="task-1"
        value="متن اولیه"
        onChange={onChange}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "تمام صفحه" }));
    fireEvent.change(screen.getByRole("textbox", { name: "ویرایشگر توضیحات" }), {
      target: { value: "متن امن" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ذخیره" }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("ذخیره‌سازی انجام نشد"));
    expect(screen.getByRole("textbox", { name: "ویرایشگر توضیحات" })).toHaveValue("متن امن");
    expect(onChange).not.toHaveBeenCalled();
  });
});
