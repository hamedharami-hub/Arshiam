import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskDescriptionEditor } from "./TaskDescriptionEditor";

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
});
