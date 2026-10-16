import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { MarkdownMediaLink } from "@/components/MarkdownMediaLink";
import { normalizeNoteMarkup } from "@/lib/markdown";
import { noteLinkId, type NoteLinkScope } from "@/lib/noteLinks";
import { NoteLinkPreview } from "@/components/notes/NoteLinkPreview";
import { createContext, useContext, type ReactNode } from "react";

const NoteLinksContext = createContext<NoteLinkScope | undefined>(undefined);
function NoteMarkdownLink({ href, children }: { href?: string; children?: ReactNode }) {
  const scope = useContext(NoteLinksContext);
  const id = scope && noteLinkId(href);
  return id && scope ? <NoteLinkPreview id={id} scope={scope}>{children}</NoteLinkPreview> : <MarkdownMediaLink href={href}>{children}</MarkdownMediaLink>;
}
const components = { a: NoteMarkdownLink };

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames ?? []), "u", "mark"],
  attributes: {
    ...defaultSchema.attributes,
    ...Object.fromEntries(["span", "mark"].map(tag => [tag, [
      ...(defaultSchema.attributes?.[tag] ?? []),
      ["style", /^(?:(?:color|background-color):\s*(?:#[\da-fA-F]{3,8}|[a-zA-Z]+|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\));?\s*)+$/],
    ]])),
    ...Object.fromEntries(["p", "h1", "h2", "h3"].map(tag => [tag, [
      ...(defaultSchema.attributes?.[tag] ?? []),
      ["style", /^text-align:\s*(left|center|right|justify);?$/],
    ]])),
  },
};

/** Render supported note HTML safely alongside Markdown and media links. */
export function NoteMarkdown({ children, noteLinks }: { children: string; noteLinks?: NoteLinkScope }) {
  return <NoteLinksContext.Provider value={noteLinks}><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]} components={components}>{normalizeNoteMarkup(children)}</ReactMarkdown></NoteLinksContext.Provider>;
}
