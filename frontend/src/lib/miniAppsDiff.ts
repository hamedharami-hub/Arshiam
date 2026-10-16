export interface HtmlDiffLine { kind: "same" | "added" | "removed"; text: string; beforeLine: number | null; afterLine: number | null }
export interface HtmlDiff { lines: HtmlDiffLine[]; added: number; removed: number; blockComparison: boolean }

/** Exact text projection with bounded LCS work; large changes use prefix/suffix blocks. */
export function diffHtmlLines(before: string, after: string): HtmlDiff {
  const a = before.split("\n");
  const b = after.split("\n");
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  let suffix = 0;
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - suffix - 1] === b[b.length - suffix - 1]) suffix++;
  const left = a.slice(prefix, a.length - suffix);
  const right = b.slice(prefix, b.length - suffix);
  const blockComparison = left.length * right.length > 160_000 || left.length + right.length > 2_000;
  const result: { kind: HtmlDiffLine["kind"]; text: string }[] = a.slice(0, prefix).map(text => ({ kind: "same", text }));
  if (blockComparison) {
    for (const text of left) result.push({ kind: "removed", text });
    for (const text of right) result.push({ kind: "added", text });
  } else {
    const width = right.length + 1;
    const lengths = new Uint32Array((left.length + 1) * width);
    for (let i = left.length - 1; i >= 0; i--) for (let j = right.length - 1; j >= 0; j--) {
      lengths[i * width + j] = left[i] === right[j] ? lengths[(i + 1) * width + j + 1] + 1 : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
    }
    let i = 0;
    let j = 0;
    while (i < left.length || j < right.length) {
      if (i < left.length && j < right.length && left[i] === right[j]) { result.push({ kind: "same", text: left[i++] }); j++; }
      else if (i < left.length && (j >= right.length || lengths[(i + 1) * width + j] >= lengths[i * width + j + 1])) result.push({ kind: "removed", text: left[i++] });
      else result.push({ kind: "added", text: right[j++] });
    }
  }
  for (const text of suffix ? a.slice(a.length - suffix) : []) result.push({ kind: "same", text });
  let beforeLine = 0;
  let afterLine = 0;
  let added = 0;
  let removed = 0;
  const lines = result.map(line => {
    if (line.kind !== "added") beforeLine++;
    if (line.kind !== "removed") afterLine++;
    if (line.kind === "added") added++;
    if (line.kind === "removed") removed++;
    return { ...line, beforeLine: line.kind === "added" ? null : beforeLine, afterLine: line.kind === "removed" ? null : afterLine };
  });
  return { lines, added, removed, blockComparison };
}
