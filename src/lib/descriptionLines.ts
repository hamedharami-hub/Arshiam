/** One entered line becomes one item; visual line wraps are not separators. */
export function descriptionLines(source: string): string[] {
  return source.split(/\r?\n/)
    .map((line) => line.trim()
      .replace(/^(?:[-*+]\s+|\d+[.)]\s+)(?:\[[ xX]\]\s*)?/, "")
      .trim())
    .filter(Boolean);
}
