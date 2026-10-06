import { webcrypto } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { descriptionNoteId, moveDescriptionToNote } from "./taskDescriptionConversion";
import type { TaskNote } from "./taskTypes";

beforeEach(() => vi.stubGlobal("crypto", webcrypto));
const note = { id: "note", user_id: "u", task_id: "t", title: "Title", content: "**Formatted** ![image](https://example.test/a.png)" } as TaskNote;
const base = () => ({ userId: "u", taskId: "t", title: note.title!, content: note.content!, isCurrent: () => true, create: vi.fn().mockResolvedValue(note), clear: vi.fn().mockResolvedValue(undefined), onCreated: vi.fn() });

describe("description conversion", () => {
  it("uses a stable account and content scoped id for retries after clearing fails", async () => {
    const options = base();
    options.clear.mockRejectedValueOnce(new Error("offline storage failed"));
    await expect(moveDescriptionToNote(options)).rejects.toThrow("offline storage failed");
    await expect(moveDescriptionToNote(options)).resolves.toBe(true);
    expect(options.create.mock.calls[0][0]).toEqual(options.create.mock.calls[1][0]);
    expect(options.create.mock.calls[0][0].content).toBe(note.content);
    expect(await descriptionNoteId("other", "t", "Title", note.content!)).not.toBe(options.create.mock.calls[0][0].id);
  });
  it("keeps the source until durable note creation finishes", async () => {
    const options = base();
    let finish!: (note: TaskNote) => void;
    options.create.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const moving = moveDescriptionToNote(options);
    await vi.waitFor(() => expect(options.create).toHaveBeenCalled());
    expect(options.clear).not.toHaveBeenCalled();
    finish(note);
    await moving;
    expect(options.clear).toHaveBeenCalledOnce();
  });
  it("never clears on failed creation or on account/task switch", async () => {
    const options = base();
    options.create.mockRejectedValueOnce(new Error("no durable save"));
    await expect(moveDescriptionToNote(options)).rejects.toThrow("no durable save");
    expect(options.clear).not.toHaveBeenCalled();
    let current = true;
    options.isCurrent = () => current;
    options.create.mockImplementation(async () => { current = false; return note; });
    expect(await moveDescriptionToNote(options)).toBe(false);
    expect(options.clear).not.toHaveBeenCalled();
    expect(options.onCreated).not.toHaveBeenCalled();
  });
});
