import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Sparkles, Share2, Loader2, Bold, Italic, Underline, Languages, Wand2, ListTree, FileText, Quote } from "lucide-react";
import { toast } from "sonner";
import { callAI, getAILanguage } from "@/lib/ai";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

/**
 * Floating selection toolbar that appears whenever the user selects text inside
 * any element marked with `data-rich-selection`. Provides app-specific actions
 * (Copy, AI inline edit, Share) instead of relying on the browser/Android system menu.
 *
 * Note: Browsers/Android cannot fully prevent the native context menu from
 * appearing on long-press selection in WebView. This toolbar is positioned with
 * a high z-index and large hit area so it's always reachable.
 */

type Pos = { top: number; left: number; width: number };

const AI_ACTIONS: { key: string; label: string; icon: any }[] = [
  { key: "improve",      label: "✨ Improve writing",        icon: Wand2 },
  { key: "fix_grammar",  label: "✏️ Fix grammar & spelling", icon: Wand2 },
  { key: "summarize",    label: "📝 Summarize",              icon: FileText },
  { key: "expand",       label: "📖 Expand",                 icon: FileText },
  { key: "to_list",      label: "• Turn into list",          icon: ListTree },
  { key: "translate_fa", label: "🇮🇷 Translate to فارسی",     icon: Languages },
  { key: "translate_en", label: "🇬🇧 Translate to English",   icon: Languages },
  { key: "tone_formal",  label: "👔 More formal",            icon: Quote },
  { key: "tone_casual",  label: "😊 More casual",            icon: Quote },
  { key: "explain",      label: "💡 Explain this",           icon: Sparkles },
];

function getSelectionRect(): { rect: DOMRect; container: Element } | null {
  // 1) Native window selection (contenteditable, regular text)
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (text.length === 0) return null;
    const node = range.commonAncestorContainer;
    const el = (node.nodeType === 1 ? node : node.parentElement) as Element | null;
    if (!el || el.closest(".tiptap")) return null;
    const container = el.closest("[data-rich-selection]");
    if (!container) return null;
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return { rect, container };
  }
  // 2) Textarea / input selection
  const ae = document.activeElement as HTMLElement | null;
  if (ae && (ae.tagName === "TEXTAREA" || (ae.tagName === "INPUT" && (ae as HTMLInputElement).type === "text"))) {
    const ta = ae as HTMLTextAreaElement | HTMLInputElement;
    const container = ta.closest("[data-rich-selection]");
    if (!container) return null;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    if (end - start <= 0) return null;
    return { rect: ta.getBoundingClientRect(), container };
  }
  return null;
}

type SelectionTarget = { field: HTMLTextAreaElement | HTMLInputElement; start: number; end: number; text: string } | { range: Range; text: string };

function captureSelection(): SelectionTarget | null {
  const active = document.activeElement as HTMLTextAreaElement | HTMLInputElement | null;
  if (active && (active.tagName === "TEXTAREA" || active.tagName === "INPUT")) {
    const start = active.selectionStart ?? 0;
    const end = active.selectionEnd ?? 0;
    if (end > start) return { field: active, start, end, text: active.value.slice(start, end) };
  }
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed && selection.rangeCount) return { range: selection.getRangeAt(0).cloneRange(), text: selection.toString() };
  return null;
}

function replaceSelectedText(target: SelectionTarget, newText: string): boolean {
  if ("field" in target) {
    const { field, start, end, text } = target;
    if (!field.isConnected || field.disabled || field.readOnly || field.value.slice(start, end) !== text) return false;
    const next = field.value.slice(0, start) + newText + field.value.slice(end);
    const proto = field.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(field, next);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.focus({ preventScroll: true });
    field.setSelectionRange(start, start + newText.length);
    return true;
  }
  const element = target.range.commonAncestorContainer.nodeType === 1 ? target.range.commonAncestorContainer as Element : target.range.commonAncestorContainer.parentElement;
  if (!element?.isConnected || !element.closest('[contenteditable="true"]') || target.range.toString() !== target.text) return false;
  const selection = window.getSelection();
  selection?.removeAllRanges(); selection?.addRange(target.range);
  return document.execCommand("insertText", false, newText);
}

function wrapSelection(target: SelectionTarget, prefix: string, suffix = prefix) {
  if ("field" in target) return replaceSelectedText(target, prefix + target.text + suffix);
  const element = target.range.commonAncestorContainer.parentElement;
  if (!element?.isConnected || !element.closest('[contenteditable="true"]')) return false;
  const selection = window.getSelection();
  selection?.removeAllRanges(); selection?.addRange(target.range);
  return document.execCommand(prefix === "**" ? "bold" : prefix === "*" ? "italic" : "underline", false);
}

export function SelectionActionToolbar() {
  const [pos, setPos] = useState<Pos | null>(null);
  const [canFormat, setCanFormat] = useState(false);
  const [busy, setBusy] = useState(false);
  const targetRef = useRef<SelectionTarget | null>(null);
  const [portal, setPortal] = useState<Element>(document.body);
  const busyRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const info = getSelectionRect();
        if (!info) {
          setPos(null);
          if (!busyRef.current) targetRef.current = null;
          return;
        }
        const active = document.activeElement as HTMLTextAreaElement | null;
        const anchor = window.getSelection()?.anchorNode?.parentElement;
        setCanFormat(Boolean(anchor?.closest('[contenteditable="true"]')) || Boolean(active?.tagName === "TEXTAREA" && !active.readOnly && !active.disabled));
        const r = info.rect;
        targetRef.current = captureSelection();
        setPortal(info.container.closest('[role="dialog"]') ?? document.body);
        const top = Math.max(8, r.top - 52);
        const left = Math.min(window.innerWidth - 148, Math.max(148, r.left + r.width / 2));
        setPos({ top, left, width: r.width });
      });
    };
    document.addEventListener("selectionchange", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!pos) return null;

  const doCopy = async () => {
    const text = targetRef.current?.text ?? "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch { toast.error("Copy failed"); }
  };

  const doShare = async () => {
    const text = targetRef.current?.text ?? "";
    if (!text) return;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }
    } catch { /* user cancelled */ }
  };

  const runAI = async (action: string) => {
    const target = targetRef.current;
    const text = target?.text ?? "";
    if (!target || !text.trim() || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const tid = toast.loading("AI is thinking...");
    try {
      const r = await callAI("inline_edit", text, undefined, action, getAILanguage());
      const out = (r.text || "").trim();
      if (!out) throw new Error("Empty result");
      if (action === "explain") {
        // Just show the explanation, don't replace
        toast.success("AI", { id: tid, description: out.slice(0, 400), duration: 8000 });
      } else {
        if (!replaceSelectedText(target, out)) throw new Error("Selected text changed; select it again");
        toast.success("Applied ✨", { id: tid });
      }
    } catch (e: any) {
      toast.error(e.message || "AI error", { id: tid });
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const modalRect = portal !== document.body ? portal.getBoundingClientRect() : null;
  return createPortal(
    <div
      style={{ position: modalRect ? "absolute" : "fixed", top: pos.top - (modalRect?.top ?? 0) + (modalRect ? portal.scrollTop : 0), left: pos.left - (modalRect?.left ?? 0) + (modalRect ? portal.scrollLeft : 0), transform: "translateX(-50%)" }}
      className="fixed z-[2147483646] flex items-center gap-1 rounded-md border bg-popover shadow-md px-1.5 py-1 animate-in fade-in slide-in-from-bottom-2"
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      {canFormat && <><button className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent" title="Bold" onClick={() => { if (targetRef.current) wrapSelection(targetRef.current, "**"); }}><Bold className="w-4 h-4" /></button>
      <button className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent" title="Italic" onClick={() => { if (targetRef.current) wrapSelection(targetRef.current, "*"); }}><Italic className="w-4 h-4" /></button>
      <button className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent" title="Underline" onClick={() => { if (targetRef.current) wrapSelection(targetRef.current, "<u>", "</u>"); }}><Underline className="w-4 h-4" /></button>
      <div className="w-px h-5 bg-border mx-0.5" /></>}
      <button className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent" title="Copy" onClick={doCopy}><Copy className="w-4 h-4" /></button>
      <button className="h-8 w-8 grid place-items-center rounded-md hover:bg-accent" title="Share" onClick={doShare}><Share2 className="w-4 h-4" /></button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-8 px-2 grid place-items-center rounded-md bg-primary text-primary-foreground hover:opacity-90 gap-1 inline-flex" title="AI">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="text-xs font-semibold">AI</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-80 overflow-y-auto z-[2147483647]">
          <DropdownMenuLabel>AI on selection</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {AI_ACTIONS.map((a) => (
            <DropdownMenuItem key={a.key} onClick={() => runAI(a.key)}>
              <a.icon className="w-3.5 h-3.5 me-2 opacity-70" />
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>,
    portal
  );
}
