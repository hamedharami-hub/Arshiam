import { useEffect, useState } from "react";
import { Plus, Flame, Trash2, Target, StickyNote, Trophy, Check, Sparkles } from "lucide-react";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/EmptyState";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { format, subDays, isSameDay, startOfWeek, differenceInDays, parseISO } from "date-fns";
import { getCalendarSystem, formatDate, toPersianDigits, jalaliDayOfWeek, WEEKDAY_SHORT_FA, type CalendarSystem } from "@/lib/jalali";
import { toast } from "sonner";
import { useTapGestures } from "@/lib/useTapGestures";
import { haptic } from "@/lib/haptics";
import { awardWaterDrops } from "@/lib/garden";
import MiniGardenCard from "@/components/garden/MiniGardenCard";

type Habit = {
  id: string;
  name: string;
  icon: string;
  color: string;
  frequency: "daily" | "weekly";
  target_per_week: number;
};
type Log = { habit_id: string; log_date: string; note?: string | null };

export default function HabitsView() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [target, setTarget] = useState<number>(7);
  const [system, setSystem] = useState<CalendarSystem>(getCalendarSystem());
  const [view, setView] = useState<"week" | "month">("week");

  const load = async () => {
    if (!user) return;
    // 1. Primary: load from Firebase Firestore
    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const [hSnap, lSnap] = await Promise.all([
        getDocs(collection(db, "users", user.id, "habits")),
        getDocs(collection(db, "users", user.id, "habit_logs")),
      ]);
      if (!hSnap.empty) {
        const hItems: any[] = [];
        hSnap.forEach((doc) => hItems.push({ id: doc.id, ...doc.data() }));
        setHabits(hItems);
      }
      if (!lSnap.empty) {
        const lItems: any[] = [];
        lSnap.forEach((doc) => lItems.push({ id: doc.id, ...doc.data() }));
        setLogs(lItems);
      }
    } catch {}

    // 2. Secondary fallback: check firebaseStore
    try {
      const [h, l] = await Promise.all([
        firebaseStore.from("habits").select("*"),
        firebaseStore.from("habit_logs").select("habit_id, log_date, note").gte("log_date", format(subDays(new Date(), 60), "yyyy-MM-dd")),
      ]);
      if (h.data && h.data.length > 0) setHabits(h.data as any);
      if (l.data && l.data.length > 0) setLogs(l.data as any);
    } catch {}
  };
  useEffect(() => { load(); }, [user]);

  const add = async () => {
    if (!name.trim() || !user) return;
    const habitId = crypto.randomUUID();
    const newHabit = {
      id: habitId,
      user_id: user.id,
      name,
      frequency,
      target_per_week: frequency === "daily" ? 7 : Math.max(1, Math.min(7, target)),
      created_at: new Date().toISOString(),
    };
    try {
      const { upsertHabit } = await import("@/lib/firestoreDataService");
      await upsertHabit(user.id, newHabit as any);
    } catch {}
    try {
      await firebaseStore.from("habits").insert(newHabit as any);
    } catch {}
    setName("");
    load();
  };

  const toggle = async (habit_id: string, date: Date) => {
    if (!user) return;
    const d = format(date, "yyyy-MM-dd");
    const exists = logs.find((l) => l.habit_id === habit_id && l.log_date === d);
    try {
      const { doc, setDoc, deleteDoc } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const logDocId = `${habit_id}_${d}`;
      const logRef = doc(db, "users", user.id, "habit_logs", logDocId);
      if (exists) {
        await deleteDoc(logRef);
      } else {
        await setDoc(logRef, { habit_id, user_id: user.id, log_date: d, created_at: new Date().toISOString() });
        awardWaterDrops(15, "ثبت موفق عادت روزانه");
      }
    } catch {}
    try {
      if (exists) {
        await firebaseStore.from("habit_logs").delete().eq("habit_id", habit_id).eq("log_date", d);
      } else {
        await firebaseStore.from("habit_logs").insert({ habit_id, user_id: user.id, log_date: d });
      }
    } catch {}
    load();
  };

  const days = Array.from({ length: view === "week" ? 7 : 30 }, (_, i) => subDays(new Date(), (view === "week" ? 6 : 29) - i));

  // Streak that respects frequency:
  // - daily: consecutive days
  // - weekly: consecutive weeks where target met
  const streak = (h: Habit) => {
    if (h.frequency === "weekly") {
      let s = 0;
      for (let w = 0; w < 52; w++) {
        const wkStart = startOfWeek(subDays(new Date(), w * 7), { weekStartsOn: 6 });
        const count = logs.filter((l) => {
          if (l.habit_id !== h.id) return false;
          const ld = new Date(l.log_date);
          const diff = (ld.getTime() - wkStart.getTime()) / (1000 * 60 * 60 * 24);
          return diff >= 0 && diff < 7;
        }).length;
        if (count >= (h.target_per_week || 1)) s++;
        else if (w > 0) break;
        else break;
      }
      return s;
    }
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (logs.find((l) => l.habit_id === h.id && l.log_date === d)) s++;
      else if (i > 0) break;
      else break;
    }
    return s;
  };

  const weekProgress = (h: Habit) => {
    const wkStart = startOfWeek(new Date(), { weekStartsOn: 6 });
    const count = logs.filter((l) => {
      if (l.habit_id !== h.id) return false;
      const ld = new Date(l.log_date);
      const diff = (ld.getTime() - wkStart.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff < 7;
    }).length;
    return { count, target: h.target_per_week || 7 };
  };

  const bestStreak = (h: Habit) => {
    const rows = logs.filter((l) => l.habit_id === h.id);
    const met = new Set<string>();
    if (h.frequency === "weekly") {
      const counts = new Map<string, number>();
      rows.forEach((l) => {
        const wk = format(startOfWeek(parseISO(l.log_date), { weekStartsOn: 6 }), "yyyy-MM-dd");
        counts.set(wk, (counts.get(wk) || 0) + 1);
      });
      counts.forEach((c, wk) => {
        if (c >= (h.target_per_week || 1)) met.add(wk);
      });
    } else {
      rows.forEach((l) => met.add(l.log_date));
    }
    const intervals = Array.from(met).sort();
    if (intervals.length === 0) return 0;
    let best = 1;
    let cur = 1;
    for (let i = 1; i < intervals.length; i++) {
      const prev = parseISO(intervals[i - 1]);
      const curr = parseISO(intervals[i]);
      const step = h.frequency === "weekly" ? differenceInDays(curr, prev) / 7 : differenceInDays(curr, prev);
      if (step === 1) {
        cur++;
        best = Math.max(best, cur);
      } else {
        cur = 1;
      }
    }
    return best;
  };

  // Note dialog state for long-press on a day
  const [noteDialog, setNoteDialog] = useState<{ habit_id: string; date: Date; note: string } | null>(null);
  const openNote = (habit_id: string, date: Date) => {
    const d = format(date, "yyyy-MM-dd");
    const existing = logs.find((l) => l.habit_id === habit_id && l.log_date === d);
    setNoteDialog({ habit_id, date, note: existing?.note || "" });
  };
  const saveNote = async () => {
    if (!noteDialog || !user) return;
    const d = format(noteDialog.date, "yyyy-MM-dd");
    const { habit_id, note } = noteDialog;
    const exists = logs.find((l) => l.habit_id === habit_id && l.log_date === d);
    if (exists) {
      await firebaseStore.from("habit_logs").update({ note }).eq("habit_id", habit_id).eq("log_date", d);
    } else {
      await firebaseStore.from("habit_logs").insert({ habit_id, user_id: user.id, log_date: d, note });
    }
    setNoteDialog(null);
    haptic("success");
    toast.success("یادداشت ذخیره شد");
    load();
  };

  return (
    <div dir="rtl" className="max-w-5xl mx-auto p-4 md:p-8 space-y-6 pb-20 animate-fade-in">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">عادت‌ها</h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">پیگیری روزانه، بدون فشار.</p>
        </div>
        <div className="flex rounded-lg bg-muted p-0.5">
          <button
            type="button"
            onClick={() => setView("week")}
            className={`px-2.5 py-1 text-xs rounded-md transition ${view === "week" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >هفته</button>
          <button
            type="button"
            onClick={() => setView("month")}
            className={`px-2.5 py-1 text-xs rounded-md transition ${view === "month" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >ماه</button>
        </div>
      </div>

      {/* Mind Garden Mini Widget */}
      <MiniGardenCard />
      <Card className="p-4 space-y-3 bg-card/60 border-border/60">
        <Input placeholder="عادت جدید..." value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()} className="bg-background/50" />
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg bg-muted p-0.5">
            <button
              type="button"
              onClick={() => { setFrequency("daily"); setTarget(7); }}
              className={`px-3 py-1.5 text-xs rounded-md transition ${frequency === "daily" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >روزانه</button>
            <button
              type="button"
              onClick={() => { setFrequency("weekly"); setTarget(3); }}
              className={`px-3 py-1.5 text-xs rounded-md transition ${frequency === "weekly" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >هفتگی</button>
          </div>
          {frequency === "weekly" && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="w-3 h-3" />
              <span>هدف:</span>
              <Input
                type="number"
                min={1}
                max={7}
                value={target}
                onChange={(e) => setTarget(Number(e.target.value) || 1)}
                className="h-7 w-16 text-xs bg-background/50"
              />
              <span>روز/هفته</span>
            </div>
          )}
          <Button onClick={add} size="sm" className="ms-auto"><Plus className="w-4 h-4" /></Button>
        </div>
      </Card>

      <div className="space-y-4">
        {habits.map((h) => {
          const todayLog = logs.find((l) => l.habit_id === h.id && isSameDay(new Date(l.log_date), new Date()));
          const isTodayDone = !!todayLog;

          return (
            <div key={h.id} className="rounded-2xl border border-border/60 bg-card/60 p-4.5 shadow-2xs hover:shadow-xs hover:border-border transition-all duration-200">
              <div className="flex items-center justify-between mb-3.5 gap-3">
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="grid place-items-center h-11 w-11 rounded-2xl bg-primary/10 text-primary text-xl shrink-0 shadow-2xs">
                    {h.icon || "🌱"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base text-foreground truncate">{h.name}</h3>
                      {s > 0 && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 animate-pulse">
                          <Flame className="w-3.5 h-3.5 fill-amber-500" />
                          <span>{toPersianDigits(s)} {streakUnit}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      {best > 0 && (
                        <span className="flex items-center gap-1 font-medium">
                          <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                          <span>بهترین: {toPersianDigits(best)}</span>
                        </span>
                      )}
                      <span className="text-border/80">•</span>
                      <span className="font-medium">
                        {met ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> هدف هفتگی تأمین‌شد
                          </span>
                        ) : (
                          `${toPersianDigits(wp.count)} از ${toPersianDigits(wp.target)} روز هفته`
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Quick toggle today button */}
                  <button
                    type="button"
                    onClick={() => toggle(h.id, new Date())}
                    className={`h-9 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 active:scale-90 ${
                      isTodayDone
                        ? "bg-emerald-500 text-white shadow-xs"
                        : "bg-muted/80 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    <Check className={`w-3.5 h-3.5 ${isTodayDone ? "stroke-[2.5]" : ""}`} />
                    <span>{isTodayDone ? "انجام شد" : "امروز"}</span>
                  </button>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-xl"
                    onClick={async () => {
                      await firebaseStore.from("habits").delete().eq("id", h.id);
                      load();
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full bg-muted/80 rounded-full mb-3.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (wp.count / wp.target) * 100)}%` }}
                />
              </div>

              {/* Day cells grid */}
              <div className={view === "week" ? "flex gap-1.5 justify-between" : "grid grid-cols-7 gap-1"}>
                {days.map((d) => {
                  const log = logs.find((l) => l.habit_id === h.id && isSameDay(new Date(l.log_date), d));
                  const done = !!log;
                  const hasNote = !!log?.note;
                  return (
                    <DayCell
                      key={d.toISOString()}
                      date={d}
                      system={system}
                      done={done}
                      hasNote={hasNote}
                      compact={view === "month"}
                      onTap={() => toggle(h.id, d)}
                      onLongPress={() => openNote(h.id, d)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
        {habits.length === 0 && (
          <EmptyState
            icon={Target}
            title="هنوز عادتی ثبت نکردی"
            description="عادت‌های کوچک و روزمره، نتایج بزرگ در زندگی می‌سازند. اولین عادتت رو بساز و زنجیره پیوستگی‌ات رو آغاز کن!"
            action={{
              label: "افزودن اولین عادت",
              icon: Plus,
              onClick: () => setOpen(true),
            }}
            className="my-4"
          />
        )}
      </div>

      <Dialog open={!!noteDialog} onOpenChange={(v) => !v && setNoteDialog(null)}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              یادداشت {noteDialog && format(noteDialog.date, "yyyy/MM/dd")}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="چه احساسی داشتی؟ چه چیزی را یاد گرفتی؟"
            value={noteDialog?.note || ""}
            onChange={(e) => setNoteDialog((s) => s ? { ...s, note: e.target.value } : s)}
            className="min-h-[120px]"
            dir="auto"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteDialog(null)}>انصراف</Button>
            <Button onClick={saveNote}>ذخیره</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DayCell({
  date,
  system,
  done,
  hasNote,
  compact,
  onTap,
  onLongPress,
}: {
  date: Date;
  system: CalendarSystem;
  done: boolean;
  hasNote: boolean;
  compact?: boolean;
  onTap: () => void;
  onLongPress: () => void;
}) {
  const { handlers } = useTapGestures({
    onSingleTap: onTap,
    onLongPress,
  });
  const isTouch = typeof window !== "undefined" && "ontouchstart" in window;
  return (
    <button
      {...(isTouch ? handlers : {})}
      onClick={isTouch ? undefined : onTap}
      onContextMenu={(e) => { e.preventDefault(); onLongPress(); }}
      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-150 select-none border active:scale-85 ${
        compact ? "text-[10px] p-0.5" : "flex-1 text-xs py-1"
      } ${
        done
          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-2xs"
          : "bg-muted/40 border-border/40 text-muted-foreground hover:border-primary/40 hover:bg-accent/30"
      }`}
    >
      {!compact && (
        <span className="text-[10px] text-muted-foreground/80 mb-0.5">
          {system === "jalali" ? WEEKDAY_SHORT_FA[jalaliDayOfWeek(date)] : format(date, "EEE")[0]}
        </span>
      )}
      <span className="font-bold tabular-nums">{system === "jalali" ? formatDate(date, "d", "jalali") : format(date, "d")}</span>
      {done && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
      )}
      {hasNote && (
        <StickyNote className={`${compact ? "w-2 h-2" : "w-2.5 h-2.5"} absolute top-1 end-1 text-primary opacity-80`} />
      )}
    </button>
  );
}
