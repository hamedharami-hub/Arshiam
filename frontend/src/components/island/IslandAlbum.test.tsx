import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ list: vi.fn(), remove: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en, isEn: true }) }));
vi.mock("@/lib/islandAlbum", () => ({ ALBUM_EVENT: "album-test", listAlbum: mocks.list, removeFromAlbum: mocks.remove }));
vi.mock("@/lib/islandSnapshot", () => ({ downloadBlob: vi.fn(), shareBlob: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error } }));
import { IslandAlbum } from "./IslandAlbum";

describe("IslandAlbum deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => "blob:test"); URL.revokeObjectURL = vi.fn();
    mocks.list.mockResolvedValue([{ id: "snapshot", createdAt: "2026-10-12", level: 2, buildings: 3, image: new Blob(), thumb: new Blob() }]);
  });
  const openDeletion = async () => {
    render(<IslandAlbum onCapture={vi.fn()} capturing={false} />);
    fireEvent.click(await screen.findByTestId("island-album-item-0"));
    fireEvent.click(screen.getByTestId("island-album-delete"));
  };
  it("requires confirmation and cancellation keeps the snapshot", async () => {
    await openDeletion();
    expect(mocks.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByTestId("island-album-viewer")).toBeVisible();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it.each(["false", "reject"])("keeps the viewer and offers retry for %s failure without success", async (mode) => {
    if (mode === "false") mocks.remove.mockResolvedValue(false);
    else mocks.remove.mockRejectedValue(new Error("failed"));
    await openDeletion();
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.success).not.toHaveBeenCalled();
    expect(screen.getByTestId("island-album-viewer")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm delete" })).toBeEnabled();
    mocks.remove.mockResolvedValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Confirm delete" }));
    await waitFor(() => expect(mocks.success).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId("island-album-viewer")).not.toBeInTheDocument();
  });
});
