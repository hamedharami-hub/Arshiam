import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => Object.assign(vi.fn(), { info: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });

describe("high-impact application recovery", () => {
  it("ignores routine changes including their notifications", async () => {
    const history = await import("./undoStack");
    history.pushUndo({ label: "routine edit", undo: vi.fn() });
    expect(history.canUndo()).toBe(false);
    expect(toast).not.toHaveBeenCalled();
  });
  it.each(["delete", "bulk", "replace"] as const)("keeps %s recovery", async importance => {
    const history = await import("./undoStack");
    const undo = vi.fn();
    history.pushUndo({ label: importance, importance, undo });
    await history.undoLast();
    expect(undo).toHaveBeenCalledOnce();
    expect(history.canUndo()).toBe(false);
  });
  it("an older toast restores its own operation rather than the latest", async () => {
    const history = await import("./undoStack");
    const first = vi.fn(), second = vi.fn();
    history.pushUndo({ label: "first", importance: "delete", undo: first });
    const action = toast.mock.calls[0][1].action.onClick;
    history.pushUndo({ label: "second", importance: "delete", undo: second });
    await action();
    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
    await history.undoLast();
    expect(second).toHaveBeenCalledOnce();
  });
  it("keeps failed recovery retryable and serializes simultaneous requests", async () => {
    const history = await import("./undoStack");
    let reject!: (reason: Error) => void;
    const undo = vi.fn(() => new Promise<void>((_resolve, fail) => { reject = fail; }));
    history.pushUndo({ label: "delete", importance: "delete", undo });
    const pending = history.undoLast();
    await history.undoLast();
    reject(new Error("retry"));
    await pending;
    expect(undo).toHaveBeenCalledOnce();
    expect(history.canUndo()).toBe(true);
  });
  it("preserves native editor shortcuts and does not consume empty history", async () => {
    const history = await import("./undoStack");
    const remove = history.installUndoShortcuts();
    const empty = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, cancelable: true, bubbles: true });
    window.dispatchEvent(empty);
    expect(empty.defaultPrevented).toBe(false);
    history.pushUndo({ label: "delete", importance: "delete", undo: vi.fn() });
    const input = document.createElement("textarea"); document.body.append(input);
    const edit = new KeyboardEvent("keydown", { key: "z", ctrlKey: true, cancelable: true, bubbles: true });
    input.dispatchEvent(edit);
    expect(edit.defaultPrevented).toBe(false);
    input.remove(); remove();
  });
});
