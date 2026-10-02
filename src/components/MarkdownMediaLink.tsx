import type { ReactNode } from "react";

export function MarkdownMediaLink({ href, children }: { href?: string; children?: ReactNode }) {
  const mediaUrl = href && /^https:\/\//i.test(href) ? href : null;
  if (mediaUrl && children === "audio") return <audio controls src={mediaUrl} className="my-2 w-full" />;
  if (mediaUrl && children === "video") return <video controls src={mediaUrl} className="my-2 max-h-[65vh] w-full rounded-xl" />;
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}
