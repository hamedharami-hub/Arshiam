import { useMemo, useState } from "react";
import { CloudRain, Frown, Laugh, Meh, Search, Smile, Paperclip, Images } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useBilingual } from "@/hooks/useBilingual";
import { DIARY_MOODS, diaryMonthKey, plainTextOf, resolveBackground, type DiaryEntry, type DiaryMood } from "@/lib/diary";

export const MOOD_ICON: Record<DiaryMood, typeof Smile> = { great: Laugh, good: Smile, okay: Meh, low: Frown, bad: CloudRain };

type Props = {
  entries: DiaryEntry[];
  selectedId?: string | null;
  onSelect: (entry: DiaryEntry) => void;
};

export function DiaryEntryList({ entries, selectedId, onSelect }: Props) {
  const { T, isEn } = useBilingual();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle
      ? entries.filter((entry) => `${entry.title} ${plainTextOf(entry.content)}`.toLowerCase().includes(needle))
      : entries;
    const map = new Map<string, DiaryEntry[]>();
    for (const entry of filtered) {
      const key = diaryMonthKey(entry.diary_date || entry.updated_at.slice(0, 10), isEn);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return Array.from(map.entries());
  }, [entries, query, isEn]);

  return (
    <div className="flex h-full flex-col" data-testid="diary-entry-list">
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" aria-hidden="true" />
        <Input data-testid="diary-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={T("جستجو در خاطره‌ها…", "Search entries…")} className="h-9 bg-background/70 ps-9 text-sm" />
      </div>
      {groups.length === 0 && (
        <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground" data-testid="diary-empty-list">
          {query ? T("چیزی پیدا نشد", "Nothing found") : T("هنوز خاطره‌ای ثبت نشده. اولین صفحهٔ دفترت را بنویس.", "No entries yet. Write the first page of your journal.")}
        </p>
      )}
      <div className="space-y-4 overflow-y-auto pe-1">
        {groups.map(([month, items]) => (
          <section key={month}>
            <h3 className="mb-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{month}</h3>
            <ul className="space-y-1">
              {items.map((entry) => {
                const background = resolveBackground(entry);
                const mood = DIARY_MOODS.find((item) => item.id === entry.diary_mood);
                const MoodIcon = entry.diary_mood ? MOOD_ICON[entry.diary_mood] : null;
                const active = entry.id === selectedId;
                const day = new Date(`${entry.diary_date}T12:00:00`);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      data-testid={`diary-entry-${entry.id}`}
                      onClick={() => onSelect(entry)}
                      className={`group flex w-full items-stretch gap-3 overflow-hidden rounded-xl border text-start transition-all hover:-translate-y-px hover:shadow-md ${active ? "border-primary bg-primary/10 shadow-sm" : "border-border/60 bg-card/70"}`}
                    >
                      <span className="relative w-14 shrink-0 overflow-hidden">
                        {background.src ? <img src={background.src} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" /> : <span className={`absolute inset-0 ${background.tint}`} />}
                        <span className="absolute inset-0 bg-black/35" />
                        <span className="relative flex h-full flex-col items-center justify-center text-white">
                          <span className="text-lg font-bold leading-none">{Number.isNaN(day.getTime()) ? "–" : day.toLocaleDateString(isEn ? "en-GB" : "fa-IR", { day: "numeric" })}</span>
                          <span className="text-[10px] opacity-90">{Number.isNaN(day.getTime()) ? "" : day.toLocaleDateString(isEn ? "en-GB" : "fa-IR", { weekday: "short" })}</span>
                        </span>
                      </span>
                      <span className="min-w-0 flex-1 py-2 pe-2">
                        <span className="flex items-center gap-1.5">
                          {MoodIcon && <MoodIcon className={`h-3.5 w-3.5 shrink-0 ${mood?.color ?? ""}`} aria-label={mood ? (isEn ? mood.en : mood.fa) : undefined} />}
                          <span className="truncate text-sm font-semibold">{entry.title || T("بدون عنوان", "Untitled")}</span>
                        </span>
                        <span className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">{plainTextOf(entry.content) || T("بدون متن", "No text")}</span>
                        <span className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          {(entry.diary_attachments?.length ?? 0) > 0 && <span className="inline-flex items-center gap-0.5"><Paperclip className="h-3 w-3" />{entry.diary_attachments!.length}</span>}
                          {(entry.diary_google_photos?.length ?? 0) > 0 && <span className="inline-flex items-center gap-0.5"><Images className="h-3 w-3" />{entry.diary_google_photos!.length}</span>}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
