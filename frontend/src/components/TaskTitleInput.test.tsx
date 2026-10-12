import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskTitleInput } from "./TaskTitleInput";

describe("TaskTitleInput multiline keyboard contract", () => {
  it.each([
    { key: "Enter" },
    { key: "Enter", shiftKey: true },
    { key: "Enter", ctrlKey: true },
    { key: "Enter", isComposing: true },
    { key: "Enter", keyCode: 229 },
    { key: "Escape", isComposing: true },
    { key: "Escape", keyCode: 229 },
  ])("keeps native editing/IME default without save or close: %o", key => {
    const shortcut = vi.fn(); const onKeyDown = vi.fn(); const save = vi.fn();
    render(<div onKeyDown={shortcut}><TaskTitleInput aria-label="Task title" rows={1} defaultValue="First line" onKeyDown={onKeyDown} onBlur={save} /></div>);
    const title = screen.getByRole("textbox", { name: "Task title" });
    expect(title.tagName).toBe("TEXTAREA");
    expect(fireEvent.keyDown(title, key)).toBe(true);
    expect(shortcut).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("retains multiline content, saves on blur, and leaves ordinary Escape to the caller", () => {
    const save = vi.fn(); const shortcut = vi.fn(); const change = vi.fn();
    render(<div onKeyDown={shortcut}><TaskTitleInput aria-label="Task title" rows={1} defaultValue={"First\nSecond"} onChange={change} onBlur={save} /></div>);
    const title = screen.getByRole("textbox", { name: "Task title" });
    expect(title).toHaveValue("First\nSecond");
    fireEvent.change(title, { target: { value: "First\nSecond\nThird" } });
    expect(change).toHaveBeenCalledOnce();
    fireEvent.blur(title);
    expect(save).toHaveBeenCalledOnce();
    fireEvent.keyDown(title, { key: "Escape" });
    expect(shortcut).toHaveBeenCalledOnce();
  });
});
