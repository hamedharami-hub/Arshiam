import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Redo2, Search, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { findTextMatches, indentHtmlSelection, selectionForLine, type TextEdit, type TextSelection } from "@/lib/miniAppsEditing";

type Translate = (fa: string, en: string) => string;
interface Props {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  t: Translate;
  jumpTo?: { line: number; column: number; requestId: number } | null;
}

/** Native textarea keeps accessible input, IME and copy/paste without a heavy editor dependency. */
export function HtmlCodeEditor({ value, onChange, onSave, t, jumpTo }: Props) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef({ values: [value], index: 0 });
  const expectedValueRef = useRef(value);
  const [, setHistoryVersion] = useState(0);
  const [viewport, setViewport] = useState({ top: 0, height: 440 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [activeMatch, setActiveMatch] = useState(-1);
  const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0 });
  const [lineInput, setLineInput] = useState("");
  const lineCount = useMemo(() => value.split("\n").length, [value]);
  const matches = useMemo(() => findTextMatches(value, query, caseSensitive), [value, query, caseSensitive]);
  const cursorLine = value.slice(0, selection.start).split("\n").length;
  const cursorColumn = selection.start === 0 ? 1 : selection.start - value.lastIndexOf("\n", selection.start - 1);
  const history = historyRef.current;
  const firstVisibleLine = Math.max(0, Math.floor(viewport.top / 24) - 4);
  const visibleLineCount = Math.min(lineCount - firstVisibleLine, Math.ceil(viewport.height / 24) + 8);

  const remember = (next: string) => {
    const stack = historyRef.current;
    if (next === stack.values[stack.index]) return;
    stack.values = [...stack.values.slice(0, stack.index + 1), next];
    let size = stack.values.reduce((sum, text) => sum + text.length, 0);
    while (stack.values.length > 2 && (stack.values.length > 50 || size > 1_200_000)) size -= stack.values.shift()!.length;
    stack.index = stack.values.length - 1;
    setHistoryVersion(version => version + 1);
  };

  useEffect(() => {
    if (value !== expectedValueRef.current) {
      const stack = historyRef.current;
      stack.values = [...stack.values.slice(0, stack.index + 1), value].slice(-50);
      stack.index = stack.values.length - 1;
      expectedValueRef.current = value;
      setHistoryVersion(version => version + 1);
    }
  }, [value]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => setViewport(current => ({ ...current, height: input.clientHeight || 440 })));
    observer.observe(input);
    return () => observer.disconnect();
  }, []);

  const select = (range: TextSelection, focus = true) => {
    const input = inputRef.current;
    if (!input) return;
    if (focus) input.focus();
    input.setSelectionRange(range.start, range.end);
    setSelection(range);
    // wrap="off" gives a deterministic line-to-scroll mapping.
    const line = input.value.slice(0, range.start).split("\n").length - 1;
    const visibleTop = input.scrollTop;
    if (line * 24 < visibleTop || line * 24 > visibleTop + input.clientHeight - 48) input.scrollTop = Math.max(0, line * 24 - 72);
    if (gutterRef.current) gutterRef.current.scrollTop = input.scrollTop;
    setViewport(current => ({ ...current, top: input.scrollTop }));
  };

  useEffect(() => {
    if (!jumpTo || !inputRef.current) return;
    const range = selectionForLine(inputRef.current.value, jumpTo.line, jumpTo.column);
    inputRef.current.focus();
    inputRef.current.setSelectionRange(range.start, range.end);
    setSelection(range);
    inputRef.current.scrollTop = Math.max(0, (jumpTo.line - 4) * 24);
    if (gutterRef.current) gutterRef.current.scrollTop = inputRef.current.scrollTop;
    setViewport(current => ({ ...current, top: inputRef.current?.scrollTop ?? 0 }));
  }, [jumpTo]);

  useEffect(() => { if (searchOpen) queryRef.current?.focus(); }, [searchOpen]);

  const commit = (edit: TextEdit) => {
    remember(edit.value);
    expectedValueRef.current = edit.value;
    onChange(edit.value);
    // React applies the controlled value before this callback runs.
    requestAnimationFrame(() => select(edit));
  };

  const moveHistory = (step: number) => {
    const stack = historyRef.current;
    const index = stack.index + step;
    if (index < 0 || index >= stack.values.length) return;
    stack.index = index;
    const next = stack.values[index];
    expectedValueRef.current = next;
    onChange(next);
    setHistoryVersion(version => version + 1);
    requestAnimationFrame(() => select({ start: Math.min(selection.start, next.length), end: Math.min(selection.start, next.length) }));
  };

  const moveMatch = (step: number) => {
    if (!matches.length) return;
    const input = inputRef.current;
    const current = matches.findIndex(match => match.start === input?.selectionStart && match.end === input?.selectionEnd);
    const index = current < 0 ? (step > 0 ? 0 : matches.length - 1) : (current + step + matches.length) % matches.length;
    setActiveMatch(index);
    select(matches[index]);
  };

  const replaceOne = () => {
    if (!matches.length) return;
    const input = inputRef.current;
    const current = matches.find(match => match.start === input?.selectionStart && match.end === input?.selectionEnd) ?? matches[Math.max(0, Math.min(activeMatch, matches.length - 1))];
    commit({ value: value.slice(0, current.start) + replacement + value.slice(current.end), start: current.start, end: current.start + replacement.length });
    setActiveMatch(-1);
  };

  const replaceAll = () => {
    if (!matches.length) return;
    let next = value;
    for (const match of [...matches].reverse()) next = next.slice(0, match.start) + replacement + next.slice(match.end);
    commit({ value: next, start: 0, end: 0 });
    setActiveMatch(-1);
  };

  return <div className="overflow-hidden rounded-xl border bg-muted/20" data-testid="html-code-editor">
    <div className="flex flex-wrap items-center gap-2 border-b p-2">
      <Button type="button" size="sm" variant="ghost" onClick={() => setSearchOpen(open => !open)} aria-expanded={searchOpen}><Search className="me-1 size-4" />{t("جست‌وجو و جایگزینی", "Find and replace")}</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => moveHistory(-1)} disabled={history.index === 0} aria-label={t("بازگشت ویرایش کد", "Undo code edit")}><Undo2 className="size-4" /></Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => moveHistory(1)} disabled={history.index >= history.values.length - 1} aria-label={t("انجام دوباره ویرایش کد", "Redo code edit")}><Redo2 className="size-4" /></Button>
      <form className="ms-auto flex items-center gap-1" onSubmit={event => {
        event.preventDefault();
        if (Number.isFinite(Number(lineInput)) && Number(lineInput) >= 1) select(selectionForLine(value, Number(lineInput)));
      }}>
        <Input type="number" min={1} max={lineCount} value={lineInput} onChange={event => setLineInput(event.target.value)} aria-label={t("شماره خط", "Line number")} placeholder={t("خط", "Line")} className="h-8 w-20" />
        <Button type="submit" size="sm" variant="outline">{t("رفتن به خط", "Go to line")}</Button>
      </form>
    </div>
    {searchOpen && <div className="space-y-2 border-b p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input ref={queryRef} value={query} onChange={event => { setQuery(event.target.value); setActiveMatch(-1); }} aria-label={t("جست‌وجو در کد", "Find in code")} placeholder={t("متن مورد جست‌وجو", "Search text")} className="min-w-40 flex-1" dir="auto" onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); moveMatch(event.shiftKey ? -1 : 1); } }} />
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={caseSensitive} onChange={event => { setCaseSensitive(event.target.checked); setActiveMatch(-1); }} />{t("حساس به بزرگی حروف", "Match case")}</label>
        <span className="text-xs text-muted-foreground" aria-live="polite">{matches.length ? `${Math.max(0, Math.min(activeMatch + 1, matches.length))} / ${matches.length}` : query ? t("نتیجه‌ای نیست", "No matches") : t("متن جست‌وجو را وارد کن", "Enter search text")}</span>
        <Button type="button" size="sm" variant="outline" disabled={!matches.length} onClick={() => moveMatch(-1)} aria-label={t("نتیجه قبلی", "Previous match")}><ChevronUp className="size-4" /></Button>
        <Button type="button" size="sm" variant="outline" disabled={!matches.length} onClick={() => moveMatch(1)} aria-label={t("نتیجه بعدی", "Next match")}><ChevronDown className="size-4" /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => { setSearchOpen(false); inputRef.current?.focus(); }} aria-label={t("بستن جست‌وجوی کد", "Close code search")}><X className="size-4" /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input value={replacement} onChange={event => setReplacement(event.target.value)} aria-label={t("متن جایگزین", "Replacement text")} placeholder={t("متن جایگزین", "Replacement text")} className="min-w-40 flex-1" dir="auto" />
        <Button type="button" size="sm" variant="outline" disabled={!matches.length} onClick={replaceOne}>{t("جایگزینی", "Replace")}</Button>
        <Button type="button" size="sm" variant="outline" disabled={!matches.length} onClick={replaceAll}>{t("جایگزینی همه", "Replace all")}</Button>
      </div>
    </div>}
    <div className="flex min-w-0" dir="ltr">
      <div ref={gutterRef} aria-hidden="true" style={{ height: viewport.height }} className="w-12 shrink-0 overflow-hidden border-e bg-muted/50 py-3 text-right font-mono text-xs leading-6 text-muted-foreground">
        <div className="relative" style={{ height: lineCount * 24 }}>
          {Array.from({ length: Math.max(0, visibleLineCount) }, (_, offset) => { const index = firstVisibleLine + offset; return <div key={index} style={{ top: index * 24 }} className={`absolute w-full px-2 ${index + 1 === cursorLine ? "bg-primary/10 font-semibold text-primary" : ""}`}>{index + 1}</div>; })}
        </div>
      </div>
      <Textarea ref={inputRef} id="mini-app-html" value={value} onChange={event => {
        const next = event.target.value;
        remember(next);
        expectedValueRef.current = next;
        onChange(next);
        setSelection({ start: event.target.selectionStart, end: event.target.selectionEnd });
      }} onSelect={event => setSelection({ start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd })}
        onScroll={event => { if (gutterRef.current) gutterRef.current.scrollTop = event.currentTarget.scrollTop; setViewport({ top: event.currentTarget.scrollTop, height: event.currentTarget.clientHeight || 440 }); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          const command = event.ctrlKey || event.metaKey;
          if (command && event.key.toLowerCase() === "s") { event.preventDefault(); onSave(); }
          else if (command && event.key.toLowerCase() === "f") { event.preventDefault(); const selected = value.slice(event.currentTarget.selectionStart, event.currentTarget.selectionEnd); if (selected && selected.length <= 100) setQuery(selected); setSearchOpen(true); }
          else if (command && event.key.toLowerCase() === "z") { event.preventDefault(); moveHistory(event.shiftKey ? 1 : -1); }
          else if (command && event.key.toLowerCase() === "y") { event.preventDefault(); moveHistory(1); }
          else if (event.key === "Tab" && !command && !event.altKey) { event.preventDefault(); commit(indentHtmlSelection(value, event.currentTarget.selectionStart, event.currentTarget.selectionEnd, event.shiftKey)); }
          else if (event.key === "Escape" && searchOpen) setSearchOpen(false);
        }} dir="ltr" wrap="off" spellCheck={false} autoCapitalize="off" autoCorrect="off"
        className="h-[440px] min-h-[360px] flex-1 resize-y rounded-none border-0 bg-transparent px-3 py-3 font-mono text-xs leading-6 shadow-none focus-visible:ring-inset" aria-label={t("ویرایش کد HTML", "Edit HTML source")} />
    </div>
    <div className="flex flex-wrap justify-between gap-2 border-t px-3 py-2 text-xs text-muted-foreground">
      <span>{t("خط", "Line")} {cursorLine}:{cursorColumn} · {lineCount} {t("خط", "lines")}</span>
      <span dir="ltr">Tab / Shift+Tab · Ctrl/⌘+F · Ctrl/⌘+S · Ctrl/⌘+Z</span>
    </div>
  </div>;
}
