import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useEffect, useMemo, useRef, useState } from "react";
import { useWorkspaceDraft } from "@/lib/mind/workspaceDraft";
import { useRecoverableExit } from "@/hooks/useRecoverableExit";
import { useLocalDay } from "@/lib/mind/useLocalDay";
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
import { Link } from "react-router-dom";
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
  ArrowRight,
  ArrowLeft,
  Wind,
  BookOpen,
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
               className="h-10 w-10 text-muted-foreground hover:text-foreground"
               aria-label={T(`پاک کردن ${label}`, `Clear ${label}`)}
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
               aria-label={`${label}: ${n} / 10`}
               aria-pressed={isSelected}
              onClick={() => onChange(n)}
                className={`h-10 rounded-xl text-xs font-semibold tabular-nums transition-[color,background-color,transform] duration-200 motion-reduce:transition-none motion-reduce:transform-none active:scale-90 flex flex-col items-center justify-center ${
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
  return <CheckinAccount key={user?.id || "guest"} ownerId={user?.id} />;
}

function CheckinAccount({ ownerId }: { ownerId?: string }) {
  const today = useLocalDay();
  const { T } = useBilingual();
  const [editorDay, setEditorDay] = useState(today);
  const atRisk = useRef(false);
  useEffect(() => { if (today !== editorDay && !atRisk.current) setEditorDay(today); }, [today, editorDay]);
  return <>
    {today !== editorDay && <aside role="alert" className="page-shell space-y-2 text-sm">
      <p>{T("روز عوض شده، اما ویرایش حفظ‌نشدهٔ دیروز باز مانده است. پیش از تعویض فرم متن را کپی کن.", "The day changed, but yesterday's unretained edits are still open. Copy your text before switching forms.")}</p>
      <Button variant="outline" onClick={() => { if (!atRisk.current || window.confirm(T("ویرایش حفظ‌نشده را کنار بگذاریم و فرم امروز را باز کنیم؟", "Discard unretained edits and open today's form?"))) { atRisk.current = false; setEditorDay(today); } }}>{T("بازکردن فرم امروز", "Open today's form")}</Button>
    </aside>}
    <CheckinEditor key={editorDay} ownerId={ownerId} today={editorDay} reportRisk={value => { atRisk.current = value; }} />
  </>;
}

const EMPTY_FORM = { mood: null as number | null, energy: null as number | null,
  focus: null as number | null, sleep_quality: null as number | null, stress: null as number | null,
  sleep_hours: "", notes: "" };
type CheckinForm = typeof EMPTY_FORM;
function recordForm(record: DailyCheckinItem): CheckinForm {
  return { mood: record.mood ?? null, energy: record.energy ?? null, focus: record.focus ?? null,
    sleep_quality: record.sleep_quality ?? null, stress: record.stress ?? null,
    sleep_hours: record.sleep_hours != null ? String(record.sleep_hours) : "", notes: record.notes ?? "" };
}

function CheckinEditor({ ownerId, today, reportRisk }: { ownerId: string | undefined; today: string; reportRisk: (value: boolean) => void }) {
  const { T, isEn } = useBilingual();
  const draft = useWorkspaceDraft(ownerId, `checkin:${today}`, {
    form: EMPTY_FORM, mode: "quick" as "quick" | "full", dirty: false, base: JSON.stringify(EMPTY_FORM),
  });
  const { form, mode } = draft.value;
  useEffect(() => { reportRisk(draft.value.dirty && !draft.durable); }, [draft.value.dirty, draft.durable, reportRisk]);
  const current = useRef(draft.value);
  current.current = draft.value;
  const localConflict = useRef(draft.conflict);
  localConflict.current = draft.conflict;
  const revision = useRef(0);
  const alive = useRef(true);
  const saveLock = useRef(false);
  const pending = useRef<string | null>(null);
  const [remoteConflict, setRemoteConflict] = useState(false);
  const remoteConflictRef = useRef(remoteConflict);
  remoteConflictRef.current = remoteConflict;
  const [loadUnavailable, setLoadUnavailable] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const setForm = (next: CheckinForm) => {
    revision.current += 1;
    current.current = { ...current.current, form: next, dirty: true };
    draft.setValue(current.current);
    setPostCheckinInsight(null);
  };
  const setMode = (next: "quick" | "full") => {
    current.current = { ...current.current, mode: next };
    draft.setValue(current.current);
  };
  useRecoverableExit(() => current.current.dirty && !draft.durable,
    T("پیش‌نویس روی دستگاه حفظ نشده؛ پیش از خروج متن را کپی کن. خارج می‌شوی؟", "Your draft is not retained on this device. Copy it before leaving. Leave anyway?"));

  const [history, setHistory] = useState<DailyCheckinItem[]>([]);
  const [savedTick, setSavedTick] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingCheckin, setExistingCheckin] = useState<DailyCheckinItem | null>(null);
  const [todayLoad, setTodayLoad] = useState<number | null>(null);
  const [postCheckinInsight, setPostCheckinInsight] = useState<{
    title: string;
    desc: string;
    actionLabel?: string;
    actionLink?: string;
    tone: "calm" | "alert" | "boost";
    icon: any;
  } | null>(null);
  const isEvening = new Date().getHours() >= 17;

  useEffect(() => {
    if (!ownerId) { setLoading(false); return; }
    let active = true;
    let snapshotRevision = 0;
    let unsubCheckins: (() => void) | undefined;
    setLoadUnavailable(false);
    const safetyTimer = setTimeout(() => { if (active) { setLoading(false); setLoadUnavailable(true); } }, 2000);

    async function init() {
      unsubCheckins = subscribeDailyCheckins(ownerId!, async (items, source) => {
        if (!active) return;
        const snapshot = ++snapshotRevision;
        clearTimeout(safetyTimer);
        setLoadUnavailable(false);
        setFromCache(source?.fromCache ?? false);
        setHistory(items);
        const todayDoc = items.find((i) => i.checkin_date === today || i.id === today);
        setExistingCheckin(todayDoc ?? null);
        const nextForm = todayDoc ? recordForm(todayDoc) : EMPTY_FORM;
        const signature = JSON.stringify(nextForm);
        if (current.current.dirty || saveLock.current || localConflict.current) {
          if (signature !== current.current.base && signature !== pending.current) {
            remoteConflictRef.current = true;
            setRemoteConflict(true);
          }
        } else {
          const next = { form: nextForm, mode: todayDoc && (todayDoc.focus != null || todayDoc.stress != null || todayDoc.sleep_quality != null || todayDoc.sleep_hours != null) ? "full" as const : current.current.mode,
            dirty: false, base: signature };
          current.current = next;
          draft.setValue(next);
        }

        // Calculate cognitive load
        try {
          const cachedRaw = await cacheGet<unknown>(`tasks:all:${ownerId}`);
          const cachedTasks = extractTasksFromCache(cachedRaw);
          const { computeCognitiveLoad } = await import("@/lib/cognitiveLoad");
          const { isTodayCommitment } = await import("@/lib/taskSchedule");
          const now = new Date();
          const r = computeCognitiveLoad({
            tasks: cachedTasks.filter((t) => isTodayCommitment(t, now)),
            sleepHours: todayDoc?.sleep_hours ?? null,
            sleepQuality: todayDoc?.sleep_quality ?? null,
            stress: todayDoc?.stress ?? null,
          });
          if (active && snapshot === snapshotRevision) setTodayLoad(r.load);
        } catch {
          /* ignore */
        }
        if (active) setLoading(false);
      }, () => { if (active) { clearTimeout(safetyTimer); setLoading(false); setLoadUnavailable(true); } });
    }

    init();
    return () => {
      active = false;
      clearTimeout(safetyTimer);
      if (unsubCheckins) unsubCheckins();
    };
  }, [ownerId, today, retry]);

  async function save() {
    if (!ownerId || saveLock.current || remoteConflict || draft.conflict || loadUnavailable) return;
    if (getLocalDateString() !== today) { toast.error(T("روز عوض شده؛ فرم امروز را دوباره باز کن.", "The day changed; reopen today's form.")); return; }
    if (form.sleep_hours !== "" && (!Number.isFinite(Number(form.sleep_hours)) || Number(form.sleep_hours) < 0 || Number(form.sleep_hours) > 16)) {
      toast.error(T("ساعات خواب باید بین صفر و ۱۶ باشد.", "Sleep duration must be between 0 and 16 hours.")); return;
    }
    saveLock.current = true;
    const savedRevision = revision.current;
    setSaving(true);
    try {
      const payload: DailyCheckinItem = {
        id: today,
        user_id: ownerId,
        checkin_date: today,
        mood: form.mood,
        energy: form.energy,
        focus: form.focus,
        sleep_quality: form.sleep_quality,
        stress: form.stress,
        sleep_hours: form.sleep_hours !== "" ? Number(form.sleep_hours) : null,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
        created_at: existingCheckin?.created_at || new Date().toISOString(),
      };

      pending.current = JSON.stringify(recordForm(payload));
      const ok = await upsertDailyCheckin(ownerId, payload, { expected: existingCheckin ? { updatedAt: existingCheckin.updated_at } : null });
      if (!alive.current) return;

      if (ok) {
        const next = { ...current.current, base: pending.current!, dirty: revision.current !== savedRevision || remoteConflictRef.current };
        current.current = next;
        draft.setValue(next);
        if (!remoteConflictRef.current) setExistingCheckin(payload);
        if (remoteConflictRef.current) {
          toast.success(T("نوشتن این نسخه تأیید شد، اما ثبت دیگری تغییر کرده؛ تعارض را بررسی کن.", "This write was confirmed, but another account entry changed. Review the conflict."));
          return;
        }
        if (revision.current !== savedRevision) {
          toast.success(T("نسخهٔ قبلی ذخیره شد؛ ویرایش جدید هنوز ذخیره نشده است.", "The earlier version was saved; your newer edits are still pending."));
          return;
        }
        awardDailyCheckinDrops(today, 20, T("ثبت چک‌این روزانه", "Daily check-in logged"));
        toast.success(T("چک‌این با موفقیت ثبت شد ✨", "Check-in successfully saved ✨"));
        setSavedTick(Date.now());

        // Instant tailored feedback based on scores
        const m = payload.mood;
        const e = payload.energy;
        const s = payload.stress;
        if (s != null && s >= 7) {
          setPostCheckinInsight({
            title: T("استرس بالایی گزارش کردی — یک تمرین اختیاری", "You Reported High Stress — An Optional Practice"),
            desc: T(
              "تنفس آرام ممکن است به بعضی افراد کمک کند؛ اثر آن برای همه یکسان نیست. اگر ناراحت یا دچار سرگیجه شدی، توقف کن و عادی نفس بکش.",
              "Gentle paced breathing may help some people; effects vary. Stop and breathe normally if you feel uncomfortable or dizzy."
            ),
            actionLabel: T("شروع تنفس ریتمیک ۳بعدی", "Start 3D Breathing"),
            actionLink: "/app/breathing",
            tone: "alert",
            icon: Wind,
          });
        } else if (m != null && m <= 4) {
          setPostCheckinInsight({
            title: T("خلق پایین یا احساس سنگینی — مهربانی با خود", "Low Mood — Self-Compassion & Reframe"),
            desc: T(
              "اگر دوست داری، یک فکر را بدون قضاوت بررسی کن. نمرهٔ خلق به‌تنهایی نشان نمی‌دهد فکرت نادرست یا بزرگ‌نمایی‌شده است.",
              "If you like, explore one thought without judgment. A mood score alone does not show that your thought is wrong or exaggerated."
            ),
            actionLabel: T("ثبت و بازسازی فکر (CBT)", "Log & Reframe Thought"),
            actionLink: "/app/thoughts",
            tone: "calm",
            icon: BookOpen,
          });
        } else if (e != null && e <= 3) {
          setPostCheckinInsight({
            title: T("انرژی رو به اتمام — ورود به ریتم بازیابی (Recovery)", "Depleted Energy — Switch to Recovery Mode"),
            desc: T(
              "انرژی کمی گزارش کردی. اگر با شرایطت سازگار است، استراحت یا سبک‌تر کردن برنامه را بررسی کن؛ این نمره علت خستگی را تعیین نمی‌کند.",
              "You reported low energy. Consider rest or a lighter plan if it fits your circumstances; this score does not establish the cause of fatigue."
            ),
            actionLabel: T("مشاهده برنامه امروز (Today)", "View Today's Tasks"),
            actionLink: "/app/today",
            tone: "calm",
            icon: Moon,
          });
        } else if (m != null && e != null && m >= 8 && e >= 8) {
          setPostCheckinInsight({
            title: T("انرژی و نشاط عالی — پنجره طلایی تمرکز عمیق (Deep Work)", "Peak Vitality — Golden Deep Work Window"),
            desc: T(
              "خلق و انرژی بالایی گزارش کردی. اگر دوست داری و شرایط مناسب است، یک کار مهم انتخاب کن؛ نمره‌ها زمان مناسب کار را به‌تنهایی تعیین نمی‌کنند.",
              "You reported high mood and energy. If you want and circumstances allow, choose one important task; scores alone do not determine the right time to work."
            ),
            actionLabel: T("پیشبرد اهداف اصلی در Today", "Tackle Key Goals in Today"),
            actionLink: "/app/today",
            tone: "boost",
            icon: Zap,
          });
        } else {
          setPostCheckinInsight({
            title: T("چک‌این ثبت شد — بدون قضاوت", "Check-in Saved — Without Judgment"),
            desc: T(
              "مقادیر بی‌پاسخ نامشخص می‌مانند. این ثبت به‌تنهایی وضعیت روانی یا جسمی تو را تعیین نمی‌کند؛ با ریتمی راحت پیش برو.",
              "Unanswered values remain unknown. This entry alone does not establish your mental or physical state; proceed at a comfortable pace."
            ),
            actionLabel: T("مشاهده ابزارهای ذهن", "Explore Mind Tools"),
            actionLink: "/app/mind",
            tone: "calm",
            icon: Smile,
          });
        }
      } else {
        toast.error(T("خطا در ذخیره چک‌این", "Error saving check-in"));
      }
    } catch {
      if (alive.current) toast.error(T("خطا در ذخیره چک‌این؛ پیش‌نویس حفظ شد.", "Check-in could not be saved; your draft was kept."));
    } finally {
      saveLock.current = false;
      pending.current = null;
      if (alive.current) setSaving(false);
    }
  }

  const recent30DaysTrend = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 29);
    const thirtyDaysAgo = getLocalDateString(start);
    return history
      .filter((h) => h.checkin_date >= thirtyDaysAgo && h.checkin_date <= today)
      .sort((a, b) => a.checkin_date.localeCompare(b.checkin_date))
      .map((h) => {
        const d = new Date(`${h.checkin_date}T12:00:00`);
        return {
          rawDate: h.checkin_date,
          date: formatDate(d, "d MMM", isEn ? "gregorian" : "jalali"),
          mood: h.mood,
          energy: h.energy,
          focus: h.focus,
          stress: h.stress,
        };
      });
  }, [history, today, isEn]);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">…</div>;
  }

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="page-shell page-shell--narrow space-y-6 animate-fade-in"
    >
      {savedTick && <ProfileMicroPrompt trigger={`checkin-${savedTick}`} />}

      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <HeaderTitlePortal title={T("Check-in روزانه", "Daily Check-in")} />
          {fromCache && <p role="status" className="text-xs text-muted-foreground">{T("نسخهٔ دستگاه؛ آخرین ثبت سرور تأیید نشده است. ذخیره فقط در صورت تغییرنکردن همان نسخه پذیرفته می‌شود.", "Device-cached version; the latest server entry is unconfirmed. Saving is accepted only if that version has not changed.")}</p>}
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
        <div className="p-4 space-y-2 text-sm" role="status">
          <p>{T("آخرین ثبت امروز جای ثبت قبلی همان روز را می‌گیرد؛ نمره‌ها مربوط به همین حالا هستند، نه میانگین روز.", "Today's latest entry replaces the earlier entry for the same day. Scores describe right now, not a daily average.")}</p>
          {current.current.dirty && <p>{draft.durable ? T("پیش‌نویس روی این دستگاه حفظ شد؛ هنوز در حساب ذخیره نشده.", "Draft retained on this device; not yet saved to your account.") : T("پیش‌نویس روی دستگاه حفظ نشده؛ متن را پیش از خروج کپی کن.", "Draft not retained on this device; copy your text before leaving.")}</p>}
          {loadUnavailable && <><p>{T("دریافت ثبت‌های قبلی تأیید نشد؛ برای جلوگیری از بازنویسی، دوباره تلاش کن.", "Previous entries could not be confirmed. Retry before saving to avoid overwriting them.")}</p><Button variant="outline" onClick={() => setRetry(v => v + 1)}>{T("تلاش دوباره", "Retry")}</Button></>}
          {draft.conflict && <><p>{T("نسخهٔ دیگری از پیش‌نویس وجود دارد؛ هر دو را پیش از انتخاب بررسی کن.", "Another draft version exists. Review/copy your current version before choosing.")}</p><Button variant="outline" onClick={() => { revision.current += 1; draft.acceptRemote(); }}>{T("پذیرش پیش‌نویس دیگر", "Use other draft")}</Button><Button variant="outline" onClick={draft.keepLocal}>{T("حفظ پیش‌نویس من", "Keep my draft")}</Button></>}
          {remoteConflict && <><p>{T("ثبت حساب تغییر کرده؛ ویرایش تو حفظ شد. برای جایگزینی آگاهانه انتخاب کن.", "The account entry changed; your edits were kept. Choose explicitly before replacing it.")}</p><Button variant="outline" disabled={saving} onClick={() => { revision.current += 1; const nextForm = existingCheckin ? recordForm(existingCheckin) : EMPTY_FORM; const next = { ...current.current, form: nextForm, dirty: false, base: JSON.stringify(nextForm) }; current.current = next; draft.setValue(next); setRemoteConflict(false); }}>{T("پذیرش ثبت حساب", "Use account entry")}</Button><Button variant="outline" disabled={saving} onClick={() => { const next = { ...current.current, base: JSON.stringify(existingCheckin ? recordForm(existingCheckin) : EMPTY_FORM) }; current.current = next; draft.setValue(next); setRemoteConflict(false); }}>{T("حفظ ویرایش من برای ذخیره", "Keep my edits to save")}</Button></>}
        </div>
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
                    aria-label={T("ساعات خواب (خواب اصلی اخیر)", "Sleep Duration (Recent Main Sleep)")}
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
                🌙 {isEn ? `Evening Reflection — estimated load of today's tasks: ${todayLoad} (rough guide)` : `تأمل شبانه — برآورد تقریبی بار کارهای امروز: ${todayLoad}`}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="checkin-notes" className="text-xs">{T("سخت‌ترین بخش امروز چه بود؟", "What was the hardest part of today?")}</Label>
                <Textarea
                  id="checkin-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder={T("یک نکته کوتاه بنویس...", "Write a brief note...")}
                  rows={2}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="checkin-notes" className="text-xs text-muted-foreground">
                {T("یادداشت روزانه (اختیاری)", "Daily Note (Optional)")}
              </Label>
              <Textarea
                id="checkin-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder={T("نکته‌ای که امروز به چشمت آمد یا می‌خواهی ثبت کنی...", "Anything that stood out today...")}
                rows={2}
              />
            </div>
          )}

          <Button onClick={save} disabled={saving || !ownerId || remoteConflict || draft.conflict || loadUnavailable} className="w-full" size="lg">
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

          {postCheckinInsight && (
            <div
              className={`p-4 rounded-2xl border transition-all animate-in fade-in-50 duration-300 space-y-2.5 ${
                postCheckinInsight.tone === "alert"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100"
                  : postCheckinInsight.tone === "boost"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-100"
                  : "bg-primary/10 border-primary/30 text-foreground"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                <postCheckinInsight.icon className="w-4 h-4 shrink-0 text-primary" />
                <span>{postCheckinInsight.title}</span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {postCheckinInsight.desc}
              </p>
              {postCheckinInsight.actionLink && (
                <div className="pt-1">
                  <Link
                    to={postCheckinInsight.actionLink}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    <span>{postCheckinInsight.actionLabel}</span>
                    {isEn ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  </Link>
                </div>
              )}
            </div>
          )}
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
                <YAxis domain={[1, 10]} fontSize={10} stroke="hsl(var(--muted-foreground))" tickLine={false} axisLine={false} width={24} />
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
            <details className="mt-4">
              <summary className="min-h-11 cursor-pointer text-sm font-medium">{T("جدول نمره‌ها (۱ تا ۱۰)", "Score table (1–10)")}</summary>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-start">
                  <caption className="text-start py-2 text-muted-foreground">{T("آخرین ثبت هر روز؛ خط تیره یعنی بدون پاسخ، نه صفر.", "Latest entry for each day; a dash means unanswered, not zero.")}</caption>
                  <thead><tr>{[T("تاریخ", "Date"), T("خلق", "Mood"), T("انرژی", "Energy"), T("تمرکز", "Focus"), T("استرس", "Stress")].map(label => <th key={label} scope="col" className="p-2 text-start">{label}</th>)}</tr></thead>
                  <tbody>{recent30DaysTrend.map(row => <tr key={row.rawDate} className="border-t"><th scope="row" className="p-2 text-start font-normal">{row.rawDate}</th>{[row.mood, row.energy, row.focus, row.stress].map((score, index) => <td key={index} className="p-2">{score == null ? "—" : isEn ? score : toPersianDigits(score)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </details>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
