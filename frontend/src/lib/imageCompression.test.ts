import { afterEach, describe, expect, it, vi } from "vitest";
import { compressImage } from "./imageCompression";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("local photo optimization", () => {
  it("reduces a large portrait and retains its aspect ratio and closes the decoder", async () => {
    const close = vi.fn(); const drawImage = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 4000, height: 6000, close }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(callback => callback(new Blob([new Uint8Array(500)], { type: "image/webp" })));
    const input = new File([new Uint8Array(3 * 1024 * 1024)], "portrait.jpg", { type: "image/jpeg" });
    const result = await compressImage(input, { maxDimension: 1024 });
    expect(result.size).toBe(500);
    expect(result.name).toBe("portrait.webp");
    expect(drawImage.mock.calls[0].slice(1)).toEqual([0, 0, 683, 1024]);
    expect(close).toHaveBeenCalledOnce();
  });

  it("also optimizes photos smaller than two megabytes", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 800, height: 600, close: vi.fn() }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(callback => callback(new Blob(["small"], { type: "image/webp" })));
    expect((await compressImage(new File([new Uint8Array(1000)], "small.png", { type: "image/png" }))).size).toBe(5);
  });

  it("does not enlarge small optimized photos or destroy animated GIFs", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 80, height: 60, close: vi.fn() }));
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(callback => callback(new Blob([new Uint8Array(200)], { type: "image/webp" })));
    const small = new File(["optimized"], "small.webp", { type: "image/webp" });
    expect(await compressImage(small)).toBe(small);
    const gif = new File(["animated"], "animation.gif", { type: "image/gif" });
    expect(await compressImage(gif)).toBe(gif);
  });
});
