export interface TextSelection { start: number; end: number }
export interface TextEdit extends TextSelection { value: string }
export type TextMatch = TextSelection;

export function findTextMatches(value: string, query: string, caseSensitive = false): TextMatch[] {
  if (!query) return [];
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(escaped, caseSensitive ? "gu" : "giu");
  return Array.from(value.matchAll(pattern), match => ({ start: match.index!, end: match.index! + match[0].length }));
}

export function indentHtmlSelection(value: string, start: number, end: number, outdent = false): TextEdit {
  start = Math.max(0, Math.min(value.length, start));
  end = Math.max(start, Math.min(value.length, end));
  if (!outdent && start === end) return { value: value.slice(0, start) + "  " + value.slice(end), start: start + 2, end: end + 2 };
  const first = start === 0 ? 0 : value.lastIndexOf("\n", start - 1) + 1;
  const last = end > start && value[end - 1] === "\n" ? end - 1 : end;
  const changes: { from: number; to: number; insert: string }[] = [];
  let position = first;
  while (position <= last) {
    if (outdent) {
      const prefix = value.slice(position).match(/^(?:\t| {1,2})/)?.[0] ?? "";
      if (prefix) changes.push({ from: position, to: position + prefix.length, insert: "" });
    } else changes.push({ from: position, to: position, insert: "  " });
    const next = value.indexOf("\n", position);
    if (next < 0) break;
    position = next + 1;
  }
  const mapPosition = (cursor: number) => {
    let delta = 0;
    for (const change of changes) {
      if (cursor < change.from) break;
      if (cursor < change.to) return change.from + delta;
      delta += change.insert.length - (change.to - change.from);
    }
    return cursor + delta;
  };
  let edited = value;
  for (const change of [...changes].reverse()) edited = edited.slice(0, change.from) + change.insert + edited.slice(change.to);
  return { value: edited, start: mapPosition(start), end: mapPosition(end) };
}

export function selectionForLine(value: string, line: number, column = 1): TextSelection {
  const lines = value.split("\n");
  const index = Math.min(lines.length - 1, Math.max(0, Math.trunc(line || 1) - 1));
  let offset = 0;
  for (let i = 0; i < index; i++) offset += lines[i].length + 1;
  const start = offset + Math.min(lines[index].length, Math.max(0, Math.trunc(column || 1) - 1));
  return { start, end: start };
}

/** The policy/bridge adds lines. Only map locations that belong to this exact source. */
export function previewLocationToSource(preview: string, source: string, line: number, column: number): { line: number; column: number } | null {
  if (!source || !preview.endsWith(source) || !Number.isSafeInteger(line) || line < 1) return null;
  const prefix = preview.slice(0, preview.length - source.length);
  const offset = prefix.split("\n").length - 1;
  const sourceLine = line - offset;
  if (sourceLine < 1 || sourceLine > source.split("\n").length) return null;
  return { line: sourceLine, column: Number.isSafeInteger(column) && column > 0 ? column : 1 };
}
