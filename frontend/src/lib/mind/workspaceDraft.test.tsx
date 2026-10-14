import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useWorkspaceDraft, workspaceDraftKey } from "./workspaceDraft";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe("Mind workspace checked retention", () => {
  it.each([{}, { text: null, mood: null, energy: null }])("preserves malformed home fields without exposing them to the editor", value => {
    const key = workspaceDraftKey("a", "home");
    const raw = JSON.stringify({ version: 1, owner: "a", slot: "home", updatedAt: 1, value });
    localStorage.setItem(key, raw);
    const hook = renderHook(() => useWorkspaceDraft("a", "home", { text: "", mood: null, energy: null }));
    expect(hook.result.current.value.text).toBe("");
    expect(hook.result.current.durable).toBe(false);
    expect(hook.result.current.conflict).toBe(true);
    expect(localStorage.getItem(key)).toBe(raw);
  });
  it("does not silently replace corrupt retained data on the first edit", () => {
    localStorage.setItem(workspaceDraftKey("a", "x"), "corrupt original");
    const hook = renderHook(() => useWorkspaceDraft("a", "x", { text: "" }));
    expect(hook.result.current.conflict).toBe(true);
    act(() => { expect(hook.result.current.setValue({ text: "new" })).toBe(false); });
    expect(localStorage.getItem(workspaceDraftKey("a", "x"))).toBe("corrupt original");
    act(() => { expect(hook.result.current.keepLocal()).toBe(true); });
    expect(Object.keys(localStorage).some(key => key.startsWith("arshiam:mind:recovery:v1:a:") && localStorage.getItem(key)?.includes("corrupt original"))).toBe(true);
  });
  it("temporary edits never change the previously retained copy", () => {
    const hook = renderHook(() => useWorkspaceDraft("a", "x", { text: "" }));
    act(() => { hook.result.current.setValue({ text: "stored" }); });
    const baseline = localStorage.getItem(workspaceDraftKey("a", "x"));
    act(() => { hook.result.current.setTemporary(true); });
    act(() => { expect(hook.result.current.setValue({ text: "temporary" })).toBe(false); });
    expect(hook.result.current.value.text).toBe("temporary");
    expect(hook.result.current.durable).toBe(false);
    expect(localStorage.getItem(workspaceDraftKey("a", "x"))).toBe(baseline);
    act(() => { expect(hook.result.current.setTemporary(false)).toBe(true); });
    expect(hook.result.current.durable).toBe(true);
    expect(localStorage.getItem(workspaceDraftKey("a", "x"))).toContain("temporary");
  });
  it("an unmounted editor cannot publish a stale draft into an A→B→A session", () => {
    const hook = renderHook(() => useWorkspaceDraft("a", "x", { text: "" }));
    const stale = hook.result.current.setValue;
    hook.unmount();
    expect(stale({ text: "late" })).toBe(false);
    expect(localStorage.getItem(workspaceDraftKey("a", "x"))).toBeNull();
  });
  it("retains a complete form and restores it without changing another owner", () => {
    const first = renderHook(() => useWorkspaceDraft("a", "fixture", { text: "", evidence: [""] }));
    act(() => { expect(first.result.current.setValue({ text: "private", evidence: ["one", "two"] })).toBe(true); });
    expect(first.result.current.durable).toBe(true);
    first.unmount();
    const restored = renderHook(() => useWorkspaceDraft("a", "fixture", { text: "", evidence: [""] }));
    expect(restored.result.current.value).toEqual({ text: "private", evidence: ["one", "two"] });
    const other = renderHook(() => useWorkspaceDraft("b", "fixture", { text: "", evidence: [""] }));
    expect(other.result.current.value.text).toBe("");
  });
  it("retains failed writes in memory but never calls them durable", () => {
    const hook = renderHook(() => useWorkspaceDraft("a", "worry", { text: "" }));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    act(() => { expect(hook.result.current.setValue({ text: "keep me" })).toBe(false); });
    expect(hook.result.current.value.text).toBe("keep me");
    expect(hook.result.current.durable).toBe(false);
  });
  it("preserves both working and remote revisions until an explicit decision", () => {
    const a = renderHook(() => useWorkspaceDraft("a", "x", { text: "" }));
    act(() => { a.result.current.setValue({ text: "first" }); });
    const b = renderHook(() => useWorkspaceDraft("a", "x", { text: "" }));
    act(() => { b.result.current.setValue({ text: "remote" }); });
    expect(a.result.current.conflict).toBe(true);
    expect(a.result.current.value.text).toBe("first");
    act(() => { expect(a.result.current.setValue({ text: "local" })).toBe(false); });
    expect(b.result.current.value.text).toBe("remote");
    act(() => a.result.current.acceptRemote());
    expect(a.result.current.value.text).toBe("remote");
  });
  it("requires explicit keep-local before overwriting or clearing a conflict", () => {
    const a = renderHook(() => useWorkspaceDraft("a", "x", { text: "" }));
    act(() => { a.result.current.setValue({ text: "first" }); });
    const b = renderHook(() => useWorkspaceDraft("a", "x", { text: "" }));
    act(() => { b.result.current.setValue({ text: "remote" }); });
    act(() => { expect(a.result.current.clear()).toBe(false); });
    act(() => { expect(a.result.current.keepLocal()).toBe(true); });
    expect(a.result.current.durable).toBe(true);
    act(() => { expect(a.result.current.clear()).toBe(true); });
    expect(localStorage.getItem(workspaceDraftKey("a", "x"))).toBeNull();
  });
  it("ignores a stored envelope belonging to another owner", () => {
    localStorage.setItem(workspaceDraftKey("a", "x"), JSON.stringify({ version: 1, owner: "b", slot: "x", updatedAt: 1, value: { text: "foreign" } }));
    const hook = renderHook(() => useWorkspaceDraft("a", "x", { text: "" }));
    expect(hook.result.current.value.text).toBe("");
    expect(hook.result.current.durable).toBe(false);
  });
  it("does not share drafts across tools or guest and authenticated owners", () => {
    const hook = renderHook(() => useWorkspaceDraft(undefined, "x", { text: "" }));
    act(() => { hook.result.current.setValue({ text: "guest" }); });
    const other = renderHook(() => useWorkspaceDraft("a", "x", { text: "" }));
    expect(other.result.current.value.text).toBe("");
    expect(workspaceDraftKey("a", "x")).not.toBe(workspaceDraftKey("a", "y"));
  });
});
