import { marked } from "marked";
import { normalizeNoteMarkup } from "./markdown";

export type LinkableNote = {
  id: string; user_id?: string; title: string; content: string; updated_at?: string;
  kind?: string; task_id?: string | null; folder_id?: string | null;
};
export type NoteLinksStatus = "loading" | "cache" | "synced";
export type NoteLinkScope = {
  ownerId: string;
  notes: readonly LinkableNote[];
  status: NoteLinksStatus;
  folders?: ReadonlyMap<string, { name: string }>;
  onOpen: (id: string, referringTo?: string) => void;
};
export type NoteLinkOccurrence = { targetId: string; snippet: string; ordinal: number };

export function isLinkableNote(note: LinkableNote, ownerId: string): boolean {
  return !!ownerId && validNoteId(note.id) && (!note.user_id || note.user_id === ownerId)
    && (!note.kind || note.kind === "note") && !note.task_id;
}

function validNoteId(id: string): boolean {
  return !!id && id.length <= 512 && !/[\s/\\]/u.test(id) && !Array.from(id).some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) && id !== "." && id !== "..";
}

export function noteLinkUrl(id: string): string {
  if (!validNoteId(id)) throw new Error("Invalid note ID");
  return `/app/notes?select=${encodeURIComponent(id)}`;
}

/** Recognize only our relative route, never a lookalike external URL. */
export function noteLinkId(href: string | undefined): string | null {
  if (!href?.startsWith("/app/notes?")) return null;
  try {
    const url = new URL(href, "https://notes.invalid");
    if (url.pathname !== "/app/notes" || url.hash || Array.from(url.searchParams).length !== 1) return null;
    const id = url.searchParams.get("select");
    return id && validNoteId(id) ? id : null;
  } catch { return null; }
}

export function noteLinkMarkdown(note: Pick<LinkableNote, "id" | "title">, label?: string): string {
  const text = (label || note.title || "Untitled").replace(/[\r\n]+/g, " ").replace(/([\\`*_[\]<>])/g, "\\$1");
  return `[${text}](${noteLinkUrl(note.id)})`;
}

export function normalizeNoteSearch(text: string): string {
  return text.normalize("NFKC").toLocaleLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u200c\u200d\s]+/g, " ").trim();
}

/** Inert template parsing: no DOM insertion, execution or resource loading. */
export function extractNoteLinks(content: string): NoteLinkOccurrence[] {
  if (!content.includes("/app/notes?")) return [];
  const template = document.createElement("template");
  template.innerHTML = marked.parse(normalizeNoteMarkup(content), { async: false }) as string;
  template.content.querySelectorAll("pre,code,script,style,iframe,template").forEach(node => node.remove());
  const links: NoteLinkOccurrence[] = [];
  template.content.querySelectorAll("a[href]").forEach(anchor => {
    const targetId = noteLinkId(anchor.getAttribute("href") ?? undefined);
    if (!targetId) return;
    const block = anchor.closest("p,li,td,th,blockquote,h1,h2,h3,h4,h5,h6") || anchor;
    const text = (block.textContent || "").replace(/\s+/g, " ").trim();
    const label = (anchor.textContent || "").trim();
    const start = Math.max(0, text.indexOf(label) - 70);
    links.push({ targetId, snippet: text.slice(start, start + 220), ordinal: links.length });
  });
  return links;
}

/** `[[` is a shortcut, not a second stored link format. Code/link contexts stay literal. */
export function canTriggerNoteLink(markdown: string, cursor: number): boolean {
  const before = markdown.slice(0, cursor);
  if (!before.endsWith("[[") || /\\\[\[$/.test(before)) return false;
  const tokens = marked.lexer(before);
  const last = tokens[tokens.length - 1];
  if (!last || last.type === "code" || last.type === "html") return false;
  const line = before.slice(before.lastIndexOf("\n") + 1);
  if ((line.match(/(?<!\\)`/g) || []).length % 2) return false;
  if (/^[^\]\n]*\]\([^\n)]*\)/.test(markdown.slice(cursor)) && /\[[^\]\n]*$/.test(before)) return false;
  return !/(?:\]\([^)]*|https?:\/\/\S*)\[\[$/.test(line);
}
