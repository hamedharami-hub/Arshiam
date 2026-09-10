export function safeInternalPath(rawPath: string, fallback = "/app/today") {
  if (!rawPath.startsWith("/") || rawPath.startsWith("//") || rawPath.includes("\\")) return fallback;
  try {
    const parsed = new URL(rawPath, "https://arshnaz.local");
    if (parsed.origin !== "https://arshnaz.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
