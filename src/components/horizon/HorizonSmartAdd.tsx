import { useMemo, useRef, useState } from "react";
import { CornerDownLeft, Folder, Hash, Loader2, Sparkles, Clock, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRIORITY_META } from "@/lib/priority";
import type { FolderItem, TagItem } from "@/lib/firestoreDataService";
import { parseQuickTaskLines } from "@/lib/quickTaskParser";
import { formatDate } from "@/lib/jalali";
import { fieldsForPeriod, periodLabel, type Period, type TimeSettings } from "@/lib/timeHorizon";
import type { Inherited } from "@/lib/horizonFilters";
import type { NewTaskInput } from "@/hooks/useHorizonData";

/**
 * Smart add: offline FA/EN parser + live preview + multi-line + drop text.
 * Inherits the current bucket/period and (unambiguous) filter values.
 */
export function HorizonSmartAdd({ period, inherited, settings, folders, tags, lang, onCreate }: {
  period: Period;
  inherited: Inherited;
  settings: TimeSettings;
  folders: FolderItem[];
  tags: TagItem[];
  lang: "fa" | "en";
  onCreate: (inputs: NewTaskInput[]) => Promise<void>;
}) {
  const fa = lang === "fa";
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const parsed = useMemo(() => parseQuickTaskLines(text, settings), [text, settings]);
  const inheritedFolder = folders.find((f) => f.id === inherited.folderId);
  const inheritedTags = tags.filter((t) => inherited.tagIds?.includes(t.id));

  const submit = async () => {
    if (!parsed.length || busy) return;
    setBusy(true);
    try {
      await onCreate(parsed.map((p) => ({
        title: p.title,
        time: p.time || fieldsForPeriod(period),
        priority: p.priority || inherited.priority || "none",
        folderName: p.folder,
        folderId: p.folder ? null : inherited.folderId || null,
        tagNames: p.tags,
        tagIds: inherited.tagIds || [],
      })));
      setText("");
      ref.current?.focus();
    } finally {
      setBusy(false);
    }
  };

  const autoGrow = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  return (
    <div
      className={`rounded-2xl border bg-card p-2 transition-colors ${dragOver ? "border-primary ring-2 ring-primary/30" : "border-border/70"}`}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("text/plain")) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        const dropped = e.dataTransfer.getData("text/plain");
        setDragOver(false);
        if (!dropped) return;
        e.preventDefault();
        setText((t) => (t ? `${t}\n${dropped}` : dropped));
      }}
      data-testid="horizon-smart-add"
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          rows={1}
          value={text}
          onChange={(e) => { setText(e.target.value); autoGrow(e.target); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); }
          }}
          placeholder={fa ? "مثلاً: کار هفته بعد !بالا #تگ /فولدر  (Shift+Enter = خط جدید)" : "e.g. Call Sam tomorrow at 5pm !high #work /Office"}
          dir="auto"
          className="flex-1 resize-none bg-transparent outline-none text-sm leading-6 py-1.5 px-1 placeholder:text-muted-foreground/70 min-h-[40px]"
          data-testid="horizon-smart-add-input"
          aria-label={fa ? "افزودن تسک" : "Add task"}
        />
        <Button size="sm" className="h-10 rounded-xl gap-1 shrink-0" onClick={submit} disabled={!parsed.length || busy} data-testid="horizon-smart-add-submit">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CornerDownLeft className="w-4 h-4" />}
          {parsed.length > 1 ? (fa ? `${parsed.length} تسک` : `${parsed.length} tasks`) : fa ? "افزودن" : "Add"}
        </Button>
      </div>

      {parsed.length > 0 && (
        <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2" data-testid="horizon-smart-add-preview">
          {parsed.slice(0, 6).map((p, i) => {
            const time = p.time;
            const timeText = time
              ? time.is_exact && time.due_at
                ? formatDate(time.due_at, "EEE d MMM HH:mm", settings.calendar)
                : periodLabel({ horizon: time.horizon, start: time.period_start, end: time.period_end }, settings, lang)
              : periodLabel(period, settings, lang);
            const prio = p.priority || inherited.priority;
            const folderName = p.folder || inheritedFolder?.name;
            const tagNames = [...p.tags, ...inheritedTags.map((t) => t.name)];
            return (
              <div key={i} className="flex flex-wrap items-center gap-1.5 text-[11px]" data-testid={`horizon-preview-line-${i}`}>
                <span className="font-semibold text-foreground truncate max-w-[60%]" dir="auto">{p.title}</span>
                <Pill icon={Clock} tone={time ? "primary" : "muted"}>{timeText}{!time && (fa ? " · از بازه" : " · from view")}</Pill>
                {prio && prio !== "none" && <Pill icon={Flag} tone={p.priority ? "primary" : "muted"}>{fa ? PRIORITY_META[prio].label : PRIORITY_META[prio].labelEn}</Pill>}
                {folderName && <Pill icon={Folder} tone={p.folder ? "primary" : "muted"}>{folderName}</Pill>}
                {tagNames.map((t) => <Pill key={t} icon={Hash} tone={p.tags.includes(t) ? "primary" : "muted"}>{t}</Pill>)}
              </div>
            );
          })}
          {parsed.length > 6 && <div className="text-[11px] text-muted-foreground">+{parsed.length - 6}</div>}
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground"><Sparkles className="w-3 h-3" />{fa ? "کم‌رنگ = به ارث رسیده از بازه/فیلتر فعلی" : "Faded = inherited from current view/filter"}</div>
        </div>
      )}
    </div>
  );
}

function Pill({ icon: Icon, tone, children }: { icon: any; tone: "primary" | "muted"; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 ${tone === "primary" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
      <Icon className="w-2.5 h-2.5" />{children}
    </span>
  );
}
