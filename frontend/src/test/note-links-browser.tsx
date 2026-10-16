// Browser QA fixture: production editors/link components, synthetic in-memory data.
// Serve with the isolated QA auth adapter; this is not an application route.
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { NoteEditorTabs } from "@/components/NoteEditorTabs";
import { NoteBacklinks } from "@/components/notes/NoteBacklinks";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNoteLinks } from "@/hooks/useNoteLinks";
import { noteLinkMarkdown } from "@/lib/noteLinks";
import { NoteLinkIndex } from "@/lib/noteLinkIndex";
import i18n from "@/i18n";
import "../index.css";

const params = new URLSearchParams(location.search);
const count = Math.min(10_000, Math.max(10, Number(params.get("count")) || 1000));
const lang = params.get("lang") === "fa" ? "fa" : "en";
document.documentElement.dir = lang === "fa" ? "rtl" : "ltr";
document.documentElement.classList.toggle("dark", params.get("theme") === "dark");
await i18n.changeLanguage(lang);
const initial = Array.from({ length: count }, (_, i) => ({
  id: `qa-${i}`, user_id: "qa-owner", title: `یادداشت ${i} · Note ${i}`,
  content: "متن نمونه برای بررسی پیوندها و سرعت ویرایشگر. ".repeat(35) + "\n\n" + Array.from({ length: 5 }, (_, j) => noteLinkMarkdown({ id: `qa-${(i + j + 1) % count}`, title: `Reference ${j + 1}` })).join("\n\n"),
}));
const start = performance.now();

export function Fixture() {
  const [notes, setNotes] = useState(initial);
  const [id, setId] = useState("qa-0");
  const [mode, setMode] = useState<"visual" | "markdown" | "preview">("visual");
  const linked = useNoteLinks("qa-owner", notes);
  const selected = notes.find(note => note.id === id)!;
  useEffect(() => {
    if (!linked.indexing && !document.body.dataset.indexMs) {
      document.body.dataset.indexMs = String(performance.now() - start);
      document.body.dataset.ready = "true";
    }
  }, [linked.indexing]);
  return <TooltipProvider><main className="max-w-4xl mx-auto p-3" dir={lang === "fa" ? "rtl" : "ltr"}>
    <h1 data-testid="qa-title">{selected.title}</h1>
    <NoteEditorTabs key={id} noteId={id} markdown={selected.content} mode={mode} onModeChange={setMode}
      onChange={content => setNotes(current => current.map(note => note.id === id ? { ...note, content } : note))}
      noteLinks={{ ownerId: "qa-owner", notes: linked.notes, status: "synced", onOpen: setId }} />
    <NoteBacklinks targetId={id} scope={{ ownerId: "qa-owner", notes: linked.notes, status: "synced", onOpen: setId }} entries={linked.index.backlinks(id)} indexing={linked.indexing} />
    <button data-testid="qa-incremental" onClick={() => {
      const index = new NoteLinkIndex("qa-owner");
      for (const note of notes) index.update(note);
      const now = performance.now();
      for (const note of notes) index.update({ ...note, title: note.title + " renamed" });
      document.body.dataset.incrementalMs = String(performance.now() - now);
    }}>Measure unchanged-content update</button>
  </main></TooltipProvider>;
}
createRoot(document.getElementById("root")!).render(<Fixture />);
