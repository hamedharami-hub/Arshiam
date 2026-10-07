import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import { MarkdownMediaLink } from "@/components/MarkdownMediaLink";
import { normalizeNoteMarkup } from "@/lib/markdown";

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
export function NoteMarkdown({ children }: { children: string }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]} components={{ a: MarkdownMediaLink }}>{normalizeNoteMarkup(children)}</ReactMarkdown>;
}
