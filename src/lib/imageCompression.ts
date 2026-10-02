export const DEFAULT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Optimize still photos locally; retain animation and never upload a larger replacement. */
export async function compressImage(file: File, options: { maxDimension?: number; maxBytes?: number } = {}): Promise<File> {
  const mime = file.type || ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" } as Record<string, string>)[file.name.split(".").pop()?.toLowerCase() ?? ""] || "";
  if (!mime.startsWith("image/")) return file;
  const maxBytes = options.maxBytes ?? DEFAULT_IMAGE_MAX_BYTES;
  if (!file.size || file.size > 50 * 1024 * 1024) throw new Error("Choose an image up to 50 MB / عکس حداکثر ۵۰ مگابایت انتخاب کنید");
  if (mime === "image/gif") {
    if (file.size > maxBytes) throw new Error("This animated image is too large / حجم تصویر متحرک زیاد است");
    return file;
  }
  let source: ImageBitmap | HTMLImageElement | undefined;
  let objectUrl: string | undefined;
  try {
    if (typeof createImageBitmap === "function") source = await createImageBitmap(file);
    else {
      objectUrl = URL.createObjectURL(file);
      const image = new Image(); image.src = objectUrl;
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Image decode failed")); });
      source = image;
    }
    const width = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
    const height = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
    if (!width || !height) throw new Error("Empty image");
    let scale = Math.min(1, (options.maxDimension ?? 2560) / Math.max(width, height));
    const canvas = document.createElement("canvas");
    for (let attempt = 0; attempt < 6; attempt++) {
      canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
      const context = canvas.getContext("2d"); if (!context) throw new Error("Image optimization unavailable");
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image encoding failed")), "image/webp", attempt === 0 ? 0.86 : 0.78));
      if (blob.size <= maxBytes) {
        if (file.size <= maxBytes && blob.size >= file.size && scale === 1) return file;
        const extension = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
        return new File([blob], `${file.name.replace(/\.[^.]*$/, "")}.${extension}`, { type: blob.type, lastModified: file.lastModified });
      }
      scale *= 0.75;
    }
    throw new Error("Could not reduce the image below 2 MB / فشرده‌سازی عکس کافی نبود");
  } catch (error) {
    // Formats a browser cannot decode can still be stored if already within the limit.
    if (file.size <= maxBytes) return file;
    throw error;
  } finally {
    if (source && "close" in source) source.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}
