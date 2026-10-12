import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ open: vi.fn(), delete: vi.fn() }));
vi.mock("idb", () => ({ openDB: mocks.open }));

describe("island album deletion result", () => {
  beforeEach(() => {
    vi.resetModules(); vi.clearAllMocks();
    Object.defineProperty(window, "indexedDB", { configurable: true, value: {} });
  });
  it("returns false when storage cannot open", async () => {
    mocks.open.mockRejectedValue(new Error("unavailable"));
    const { removeFromAlbum } = await import("./islandAlbum");
    expect(await removeFromAlbum("snapshot")).toBe(false);
  });
  it("returns false for a failed delete and does not notify success", async () => {
    mocks.open.mockResolvedValue({ delete: mocks.delete });
    mocks.delete.mockRejectedValue(new Error("transaction failed"));
    const { removeFromAlbum, ALBUM_EVENT } = await import("./islandAlbum");
    const notify = vi.fn(); window.addEventListener(ALBUM_EVENT, notify);
    expect(await removeFromAlbum("snapshot")).toBe(false);
    expect(notify).not.toHaveBeenCalled();
    window.removeEventListener(ALBUM_EVENT, notify);
  });
  it("returns true only after successful deletion", async () => {
    mocks.open.mockResolvedValue({ delete: mocks.delete }); mocks.delete.mockResolvedValue(undefined);
    const { removeFromAlbum } = await import("./islandAlbum");
    expect(await removeFromAlbum("snapshot")).toBe(true);
    expect(mocks.delete).toHaveBeenCalledWith("snapshots", "snapshot");
  });
});
