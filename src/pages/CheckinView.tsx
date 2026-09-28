import { useEffect, useMemo, useState } from "react";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import ProfileMicroPrompt from "@/components/ProfileMicroPrompt";
import { awardDailyCheckinDrops } from "@/lib/garden";
import { getLocalDateString } from "@/lib/taskDate";
import {
  subscribeDailyCheckins,
  upsertDailyCheckin,
  type DailyCheckinItem,
} from "@/lib/firestoreDataService";
import { cacheGet } from "@/lib/offlineQueue";
import { extractTasksFromCache } from "@/features/tasks/taskCache";

import { formatDate, toPersianDigits } from "@/lib/jalali";
import {
  Smile,
  Zap,
  Target,
  Moon,
  Flame,
  Clock,
  Loader2,
  X,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";

interface SliderConfig {
  emoji: string;
  color: string;
  bg: string;
  lowAnchor: string;
  lowAnchor_en: string;
  highAnchor: string;
  highAnchor_en: string;
  timeframe: string;
  timeframe_en: string;
}

const SLIDER_CONFIGS: Record<string, SliderConfig> = {
  mood: {
    emoji: "🌸",
    color: "from-rose-500 to-pink-500",
    bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    lowAnchor: "۱ = بسیار بد",
    lowAnchor_en: "1 = Very Low",
    highAnchor: "۱۰ = بسیار خوب و عالی",
    highAnchor_en: "10 = Excellent",
    timeframe: "همین حالا",
    timeframe_en: "Right now",
  },
  energy: {
    emoji: "⚡",
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    lowAnchor: "۱ = تخلیه کامل",
    lowAnchor_en: "1 = Completely Depleted",
    highAnchor: "۱۰ = سرشار از توان و انرژی",
    highAnchor_en: "10 = Highly Energized",
    timeframe: "همین حالا",
    timeframe_en: "Right now",
  },
  focus: {
    emoji: "🎯",
    color: "from-sky-500 to-blue-500",
    bg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    lowAnchor: "۱ = حواس‌پرت و پراکنده",
    lowAnchor_en: "1 = Scattered",
    highAnchor: "۱۰ = تمرکز عمیق و متمرکز",
    highAnchor_en: "10 = Deep Focus",
    timeframe: "همین حالا",
    timeframe_en: "Right now",
  },
  sleep_quality: {
    emoji: "🌙",
    color: "from-indigo-500 to-purple-500",
    bg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    lowAnchor: "۱ = بسیار آشفته و بد",
    lowAnchor_en: "1 = Very Restless",
    highAnchor: "۱۰ = عمیق و کاملاً ترمیم‌کننده",
    highAnchor_en: "10 = Deep & Restorative",
    timeframe: "خواب اصلی اخیر",
    timeframe_en: "Recent main sleep",
  },
  stress: {
    emoji: "🔥",
    color: "from-red-500 to-rose-600",
    bg: "bg-red-500/10 text-red-600 dark:text-red-400",
    lowAnchor: "۱ = حداقل / بدون استرس",
    lowAnchor_en: "1 = Minimal / None",
    highAnchor: "۱۰ = استرس بسیار شدید",
    highAnchor_en: "10 = Extreme Stress",
    timeframe: "همین حالا",
    timeframe_en: "Right now",
  },
};

function Slider10({
  type = "mood",
  label,
  value,
  onChange,
  isEn,
  T,
}: {
  type?: "mood" | "energy" | "focus" | "sleep_quality" | "stress";
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  isEn: boolean;
  T: (fa: string, en: string) => string;
}) {
  const cfg = SLIDER_CONFIGS[type] || SLIDER_CONFIGS.mood;

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="p-3.5 rounded-2xl border border-border/60 bg-card/60 space-y-2.5 shadow-2xs hover:border-border transition-colors"
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base">{cfg.emoji}</span>
          <Label className="font-semibold text-sm cursor-pointer">{label}</Label>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-muted/40 font-normal">
            {isEn ? cfg.timeframe_en : cfg.timeframe}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-bold tabular-nums ${
              value != null ? cfg.bg : "bg-muted text-muted-foreground"
            }`}
          >
            {value != null
              ? isEn
                ? `${value} / 10`
                : `${toPersianDigits(value)} / ۱۰`
              : T("ثبت‌نشده", "Not set")}
          </span>
          {value != null && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              title={T("پاک کردن و ثبت نکردن", "Clear selection")}
              onClick={() => onChange(null)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* 1..10 Buttons */}
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
                  ? `bg-gradient-to-tr ${cfg.color} text-white shadow-md scale-105 ring-2 ring-primary/30 z-10 font-bold`
                  : isUnder
                  ? `${cfg.bg} opacity-90`
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              {isEn ? n : toPersianDigits(n)}
            </button>
          );
        })}
      </div>

      {/* Anchors description */}
      <div className="flex justify-between items-center text-[11px] text-muted-foreground px-1">
        <span>{isEn ? cfg.lowAnchor_en : cfg.lowAnchor}</span>
        <span>{isEn ? cfg.highAnchor_en : cfg.highAnchor}</span>
      </div>
    </div>
  );
}

export default function CheckinView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const today = getLocalDateString();

  // Mode: "quick" vs "full"
  const [mode, setMode] = useState<"quick" | "full">("quick");

  const [form, setForm] = useState<{
    mood: number | null;
    energy: number | null;
    focus: number | null;
    sleep_quality: number | null;
    stress: number | null;
    sleep_hours: string;
    notes: string;
  }>({
    mood: null,
    energy: null,
    focus: null,
    sleep_quality: null,
    stress: null,
    sleep_hours: "",
    notes: "",
  });

  const [history, setHistory] = useState<DailyCheckinItem[]>([]);
  const [savedTick, setSavedTick] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingCheckin, setExistingCheckin] = useState<DailyCheckinItem | null>(null);
  const [todayLoad, setTodayLoad] = useState<number | null>(null);
  const isEvening = new Date().getHours() >= 17;

  useEffect(() => {
    if (!user) return;
    let unsubCheckins: (() => void) | undefined;
    const safetyTimer = setTimeout(() => setLoading(false), 2000);

    async function init() {
      unsubCheckins = subscribeDailyCheckins(user!.id, async (items) => {
        clearTimeout(safetyTimer);
        setHistory(items);
        const todayDoc = items.find((i) => i.checkin_date === today || i.id === today);
        if (todayDoc) {
          setExistingCheckin(todayDoc);
          setForm({
            mood: todayDoc.mood,
            energy: todayDoc.energy,
            focus: todayDoc.focus,
            sleep_quality: todayDoc.sleep_quality,
            stress: todayDoc.stress,
            sleep_hours: todayDoc.sleep_hours != null ? String(todayDoc.sleep_hours) : "",
            notes: todayDoc.notes ?? "",
          });
          // If already filled out advanced fields, switch to full mode view
          if (
            todayDoc.focus != null ||
            todayDoc.stress != null ||
            todayDoc.sleep_quality != null ||
            todayDoc.sleep_hours != null
          ) {
            setMode("full");
          }
        }

        // Calculate cognitive load
        try {
          const cachedRaw = await cacheGet<unknown>(`tasks:all:${user!.id}`);
          const cachedTasks = extractTasksFromCache(cachedRaw);
          const { computeCognitiveLoad } = await import("@/lib/cognitiveLoad");
          const r = computeCognitiveLoad({
            tasks: cachedTasks.filter((t) => !t.completed),
            sleepHours: todayDoc?.sleep_hours ?? null,
            sleepQuality: todayDoc?.sleep_quality ?? null,
            stress: todayDoc?.stress ?? null,
          });
          setTodayLoad(r.load);
        } catch {
          /* ignore */
        }
        setLoading(false);
      });
    }

    init();
    return () => {
      clearTimeout(safetyTimer);
      if (unsubCheckins) unsubCheckins();
    };
  }, [user, today]);

  async function save() {
    if (!user || saving) return;
    setSaving(true);
    try {
      const payload: DailyCheckinItem = {
        id: today,
        user_id: user.id,
        checkin_date: today,
        mood: form.mood,
        energy: form.energy,
        focus: mode === "full" ? form.focus : (existingCheckin?.focus ?? form.focus),
        sleep_quality: mode === "full" ? form.sleep_quality : (existingCheckin?.sleep_quality ?? form.sleep_quality),
        stress: mode === "full" ? form.stress : (existingCheckin?.stress ?? form.stress),
        sleep_hours:
          mode === "full" && form.sleep_hours
            ? Number(form.sleep_hours)
            : (existingCheckin?.sleep_hours ?? null),
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
        created_at: existingCheckin?.created_at || new Date().toISOString(),
      };

      const ok = await upsertDailyCheckin(user.id, payload);

      if (ok) {
        awardDailyCheckinDrops(today, 20, T("ثبت چک‌این روزانه", "Daily check-in logged"));
        toast.success(T("چک‌این با موفقیت ثبت شد ✨", "Check-in successfully saved ✨"));
        setSavedTick(Date.now());
      } else {
        toast.error(T("خطا در ذخیره چک‌این", "Error saving check-in"));
      }
    } finally {
      setSaving(false);
    }
  }

  const recent30DaysTrend = useMemo(() => {
    const thirtyDaysAgo = getLocalDateString(new Date(Date.now() - 30 * 86400000));
    return history
      .filter((h) => h.checkin_date >= thirtyDaysAgo)
      .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
      .map((h) => {
        const d = new Date(h.checkin_date);
        return {
          rawDate: h.checkin_date,
          date: formatDate(d, "d MMM", "jalali"),
          mood: h.mood,
          energy: h.energy,
          focus: h.focus,
          stress: h.stress,
        };
      });
  }, [history]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">…</div>;
  }

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="max-w-3xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in"
    >
      {savedTick && <ProfileMicroPrompt trigger={`checkin-${savedTick}`} />}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1.5">{T("Check-in روزانه", "Daily Check-in")}</h1>
          <p className="text-muted-foreground text-sm">
            {T(
              "پایش آگاهانهٔ وضعیت درون بدون قضاوت؛ انتخاب مقادیر اختیاری است.",
              "Mindful self-awareness without judgment; every response is optional."
            )}
          </p>
        </div>

        {/* Quick vs Full Mode Toggle */}
        <div className="flex rounded-xl p-1 bg-muted/60 border border-border/40 text-xs">
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              mode === "quick"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {T("حالت سریع (۱۰ ثانیه)", "Quick (10s)")}
          </button>
          <button
            type="button"
            onClick={() => setMode("full")}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              mode === "full"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {T("حالت کامل", "Full Check-in")}
          </button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>{isEn ? `Today · ${today}` : `امروز · ${today}`}</span>
            </CardTitle>
            {existingCheckin && (
              <Badge variant="outline" className="text-xs text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                <CheckCircle2 className="w-3 h-3 me-1" />
                {T("قبلاً ثبت شده — در حال ویرایش", "Previously logged — Editing")}
              </Badge>
            )}
          </div>
          <CardDescription>
            {mode === "quick"
              ? T(
                  "در حالت سریع فقط خلق و انرژی پرسیده می‌شود. برای ثبت خواب و استرس به حالت کامل بروید.",
                  "Quick mode focuses on mood and energy. Switch to Full for sleep and stress."
                )
              : T(
                  "حالت کامل: خلق، انرژی، تمرکز، استرس و خواب اصلی اخیر.",
                  "Full mode: mood, energy, focus, stress, and recent main sleep."
                )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Mood (Quick & Full) */}
          <Slider10
            type="mood"
            label={T("خلق و روحیه", "Mood & State")}
            value={form.mood}
            onChange={(v) => setForm({ ...form, mood: v })}
            isEn={isEn}
            T={T}
          />

          {/* Energy (Quick & Full) */}
          <Slider10
            type="energy"
            label={T("میزان انرژی و توان", "Energy & Vitality")}
            value={form.energy}
            onChange={(v) => setForm({ ...form, energy: v })}
            isEn={isEn}
            T={T}
          />

          {/* Full Mode Additional Fields */}
          {mode === "full" && (
            <>
              {/* Focus */}
              <Slider10
                type="focus"
                label={T("میزان تمرکز و بازدهی", "Focus & Clarity")}
                value={form.focus}
                onChange={(v) => setForm({ ...form, focus: v })}
                isEn={isEn}
                T={T}
              />

              {/* Stress */}
              <Slider10
                type="stress"
                label={T("سطح استرس و فشار روانی", "Stress & Pressure Level")}
                value={form.stress}
                onChange={(v) => setForm({ ...form, stress: v })}
                isEn={isEn}
                T={T}
              />

              {/* Sleep Quality */}
              <Slider10
                type="sleep_quality"
                label={T("کیفیت خواب اصلی اخیر", "Recent Main Sleep Quality")}
                value={form.sleep_quality}
                onChange={(v) => setForm({ ...form, sleep_quality: v })}
                isEn={isEn}
                T={T}
              />

              {/* Sleep Hours */}
              <div className="p-3.5 rounded-2xl border border-border/60 bg-card/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    <Label className="font-semibold text-sm">
                      {T("ساعات خواب (خواب اصلی اخیر)", "Sleep Duration (Recent Main Sleep)")}
                    </Label>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-muted/40 font-normal">
                    {T("خواب اصلی اخیر", "Recent main sleep")}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="16"
                    value={form.sleep_hours}
                    onChange={(e) => setForm({ ...form, sleep_hours: e.target.value })}
                    className="w-32 h-10 rounded-md border bg-background px-3 text-sm font-mono"
                    placeholder={T("مثلاً 7.5", "e.g. 7.5")}
                  />
                  <span className="text-xs text-muted-foreground">{T("ساعت", "hours")}</span>
                </div>
              </div>
            </>
          )}

          {/* Evening Reflection / Note */}
          {isEvening && todayLoad != null && todayLoad >= 12 ? (
            <div className="border-s-4 border-amber-500 bg-amber-500/5 rounded-xl p-3.5 space-y-3">
              <div className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-300">
                🌙 {isEn ? `Evening Reflection — Today's cognitive load was ${todayLoad}` : `تأمل شبانه — بار شناختی امروز ${todayLoad} بود`}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{T("سخت‌ترین بخش امروز چه بود؟", "What was the hardest part of today?")}</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={T("یک نکته کوتاه بنویس...", "Write a brief note...")}
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {T("یادداشت روزانه (اختیاری)", "Daily Note (Optional)")}
              </Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={T("نکته‌ای که امروز به چشمت آمد یا می‌خواهی ثبت کنی...", "Anything that stood out today...")}
                rows={2}
              />
            </div>
          )}

          <Button onClick={save} disabled={saving} className="w-full" size="lg">
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {T("در حال ذخیره...", "Saving...")}
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                {T("ذخیره Check-in", "Save Check-in")}
              </span>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent 30 Days Trend */}
      {recent30DaysTrend.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{T("روند ۳۰ روز اخیر", "Recent 30-Day Trend")}</CardTitle>
            <CardDescription>{T("خلق، انرژی، تمرکز و استرس", "Mood, energy, focus & stress")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={recent30DaysTrend}>
                <XAxis dataKey="date" fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} />
                <YAxis domain={[0, 10]} fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={24} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "1rem",
                    background: "hsl(var(--popover) / 0.95)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid hsl(var(--border))",
                    direction: isEn ? "ltr" : "rtl",
                    fontSize: "12px",
                  }}
                  formatter={(val: number, name: string) => [
                    val != null
                      ? isEn
                        ? `${val} / 10`
                        : `${toPersianDigits(val)} / ۱۰`
                      : "—",
                    name === "mood"
                      ? isEn
                        ? "Mood 🌸"
                        : "خلق 🌸"
                      : name === "energy"
                      ? isEn
                        ? "Energy ⚡"
                        : "انرژی ⚡"
                      : name === "focus"
                      ? isEn
                        ? "Focus 🎯"
                        : "تمرکز 🎯"
                      : isEn
                      ? "Stress 🔥"
                      : "استرس 🔥",
                  ]}
                />
                <Line type="monotone" dataKey="mood" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3, fill: "#f43f5e" }} />
                <Line type="monotone" dataKey="energy" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2.5, fill: "#f59e0b" }} />
                <Line type="monotone" dataKey="focus" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} strokeDasharray="3 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
