import { useEffect, useState } from "react";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import ProfileMicroPrompt from "@/components/ProfileMicroPrompt";
import { awardWaterDrops } from "@/lib/garden";
import {
  subscribeDailyCheckins,
  getDailyCheckin,
  upsertDailyCheckin,
  type DailyCheckinItem,
} from "@/lib/firestoreDataService";
import { cacheGet } from "@/lib/offlineQueue";
import type { Task } from "@/lib/taskTypes";

import { formatDate, toPersianDigits } from "@/lib/jalali";
import { Smile, Zap, Target, Moon, AlertTriangle, Sparkles, Heart } from "lucide-react";

const SLIDER_CONFIGS: Record<string, { emoji: string; color: string; bg: string }> = {
  mood: { emoji: "🌸", color: "from-rose-500 to-pink-500", bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  energy: { emoji: "⚡", color: "from-amber-500 to-orange-500", bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  focus: { emoji: "🎯", color: "from-sky-500 to-blue-500", bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400" },
  sleep_quality: { emoji: "🌙", color: "from-indigo-500 to-purple-500", bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" },
  stress: { emoji: "🔥", color: "from-red-500 to-rose-600", bg: "bg-red-500/10 text-red-600 dark:text-red-400" },
};

function Slider10({
  type = "mood",
  label,
  value,
  onChange,
}: {
  type?: "mood" | "energy" | "focus" | "sleep_quality" | "stress";
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const cfg = SLIDER_CONFIGS[type] || SLIDER_CONFIGS.mood;

  return (
    <div dir="rtl" className="p-3.5 rounded-2xl border border-border/50 bg-card/60 space-y-3 shadow-2xs hover:border-border transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.emoji}</span>
          <Label className="font-semibold text-sm cursor-pointer">{label}</Label>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-bold tabular-nums ${value ? cfg.bg : "bg-muted text-muted-foreground"}`}>
          {value ? `${toPersianDigits(value)} / ۱۰` : "— / ۱۰"}
        </span>
      </div>

      <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const isSelected = value === n;
          const isUnder = value != null && n <= value;

          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`h-10 rounded-xl text-xs font-semibold tabular-nums transition-all duration-200 active:scale-90 flex flex-col items-center justify-center ${
                isSelected
                  ? `bg-gradient-to-tr ${cfg.color} text-white shadow-md scale-105 ring-2 ring-primary/30 z-10`
                  : isUnder
                  ? `${cfg.bg} opacity-90`
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {toPersianDigits(n)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CheckinView() {
  const { user } = useAuth();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<any>({ mood: null, energy: null, focus: null, sleep_quality: null, stress: null, sleep_hours: "", notes: "" });
  const [history, setHistory] = useState<DailyCheckinItem[]>([]);
  const [savedTick, setSavedTick] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayLoad, setTodayLoad] = useState<number | null>(null);
  const isEvening = new Date().getHours() >= 17;

  useEffect(() => {
    if (!user) return;
    let unsubCheckins: (() => void) | undefined;

    async function init() {
      // 1. Listen to checkins from Firestore
      unsubCheckins = subscribeDailyCheckins(user!.id, async (items) => {
        setHistory(items);
        const todayDoc = items.find((i) => i.checkin_date === today || i.id === today);
        if (todayDoc) {
          setForm({
            mood: todayDoc.mood,
            energy: todayDoc.energy,
            focus: todayDoc.focus,
            sleep_quality: todayDoc.sleep_quality,
            stress: todayDoc.stress,
            sleep_hours: todayDoc.sleep_hours ?? "",
            notes: todayDoc.notes ?? "",
          });
        }

        // Calculate cognitive load
        const cachedTasks = (await cacheGet<Task[]>(`tasks:all:${user!.id}`)) || [];
        const { computeCognitiveLoad } = await import("@/lib/cognitiveLoad");
        const r = computeCognitiveLoad({
          tasks: cachedTasks.filter((t) => !t.completed),
          sleepHours: todayDoc?.sleep_hours ?? null,
          sleepQuality: todayDoc?.sleep_quality ?? null,
          stress: todayDoc?.stress ?? null,
        });
        setTodayLoad(r.load);
        setLoading(false);
      });
    }

    init();
    return () => {
      if (unsubCheckins) unsubCheckins();
    };
  }, [user, today]);

  async function save() {
    if (!user) return;
    const payload: DailyCheckinItem = {
      id: today,
      user_id: user.id,
      checkin_date: today,
      mood: form.mood,
      energy: form.energy,
      focus: form.focus,
      sleep_quality: form.sleep_quality,
      stress: form.stress,
      sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
      notes: form.notes || null,
    };

    // Save to Firestore primary store
    const ok = await upsertDailyCheckin(user.id, payload);
    
    // Also try to mirror to firebaseStore in background
    firebaseStore
      .from("daily_checkins")
      .upsert(payload as any, { onConflict: "user_id,checkin_date" })
      .catch(() => {});

    if (ok) {
      awardWaterDrops(20, "ثبت چک‌این روزانه");
      toast.success("ثبت شد ✨");
      setSavedTick(Date.now());
    } else {
      toast.error("خطا در ذخیره چک‌این");
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">…</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      {savedTick && <ProfileMicroPrompt trigger={`checkin-${savedTick}`} />}
      <div>
        <h1 className="text-3xl font-bold mb-2">Check-in روزانه</h1>
        <p className="text-muted-foreground text-sm">ثبت کوتاه روزانه برای الگویابی بلندمدت.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">امروز · {today}</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <Slider10 type="mood" label="خلق و روحیه" value={form.mood} onChange={(v) => setForm({ ...form, mood: v })} />
          <Slider10 type="energy" label="میزان انرژی و توان" value={form.energy} onChange={(v) => setForm({ ...form, energy: v })} />
          <Slider10 type="focus" label="میزان تمرکز و بازدهی" value={form.focus} onChange={(v) => setForm({ ...form, focus: v })} />
          <Slider10 type="sleep_quality" label="کیفیت خواب دیشب" value={form.sleep_quality} onChange={(v) => setForm({ ...form, sleep_quality: v })} />
          <Slider10 type="stress" label="سطح استرس و اضطراب" value={form.stress} onChange={(v) => setForm({ ...form, stress: v })} />
          <div className="space-y-2">
            <Label>ساعات خواب</Label>
            <input
              type="number" step="0.5" min="0" max="14"
              value={form.sleep_hours}
              onChange={(e) => setForm({ ...form, sleep_hours: e.target.value })}
              className="w-32 h-10 rounded-md border bg-background px-3 text-sm"
              placeholder="مثلاً 7.5"
            />
          </div>
          {/* A2 — Dynamic evening reflection: appears in evening + when load was high */}
          {isEvening && todayLoad != null && todayLoad >= 12 && (
            <div className="border-s-4 border-amber-500 bg-amber-500/5 rounded-md p-3 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2">
                🌙 تأمل شبانه — بار شناختی امروز <span className="tabular-nums">{todayLoad}</span> بود
              </div>
              <div className="space-y-2">
                <Label className="text-xs">سخت‌ترین بخش امروز چه بود؟</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="یک نکته کوتاه بنویس..."
                  rows={2}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                💡 با ثبت این تأمل، الگوی بار شناختی هفته بعد دقیق‌تر می‌شود.
              </p>
            </div>
          )}
          {(!isEvening || todayLoad == null || todayLoad < 12) && (
            <div className="space-y-2">
              <Label>یادداشت کوتاه</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="چه چیزی امروز قابل توجه بود؟" rows={3} />
            </div>
          )}
          <Button onClick={save} className="w-full">ذخیره</Button>
        </CardContent>
      </Card>

      {history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">روند ۳۰ روز اخیر</CardTitle>
            <CardDescription>خلق، انرژی، تمرکز</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={history.map((h) => {
                  const d = new Date(h.checkin_date);
                  return {
                    rawDate: h.checkin_date,
                    date: formatDate(d, "d MMM", "jalali"),
                    mood: h.mood,
                    energy: h.energy,
                    focus: h.focus,
                  };
                })}
              >
                <XAxis dataKey="date" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis domain={[0, 10]} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    borderRadius: "1rem",
                    background: "hsl(var(--popover) / 0.95)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid hsl(var(--border))",
                    direction: "rtl",
                    fontSize: "12px",
                  }}
                  formatter={(val: number, name: string) => [
                    `${toPersianDigits(val)} / ۱۰`,
                    name === "mood" ? "خلق 🌸" : name === "energy" ? "انرژی ⚡" : "تمرکز 🎯",
                  ]}
                />
                <Line type="monotone" dataKey="mood" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3, fill: "#f43f5e" }} />
                <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3, fill: "#f59e0b" }} />
                <Line type="monotone" dataKey="focus" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 3, fill: "#0ea5e9" }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
