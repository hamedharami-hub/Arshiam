import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  ArrowRight,
  ArrowLeft,
  Compass,
  Plus,
  Save,
  Target,
  Heart,
  Trash2,
  HelpCircle,
  X,
  Info,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useBilingual } from "@/hooks/useBilingual";
import { createTaskFromMind } from "@/lib/taskFromMind";
import {
  subscribeMindValues,
  saveMindValues,
  subscribeMindGoals,
  upsertMindGoal,
  deleteMindGoal,
  type MindGoalItem,
} from "@/lib/firestoreDataService";

// 10 life domains commonly used in ACT Values clarification.
const DOMAINS = [
  { key: "family", label: "خانواده", label_en: "Family", icon: "👨‍👩‍👧" },
  { key: "intimate", label: "روابط عاطفی و صمیمی", label_en: "Intimate Relationships", icon: "❤️" },
  { key: "friendship", label: "دوستی و اجتماع", label_en: "Friendship & Community", icon: "🤝" },
  { key: "career", label: "کار و حرفه", label_en: "Work & Career", icon: "💼" },
  { key: "education", label: "یادگیری و رشد فردی", label_en: "Learning & Growth", icon: "📚" },
  { key: "leisure", label: "تفریح، ذوق و استراحت", label_en: "Leisure & Play", icon: "🎨" },
  { key: "health", label: "سلامت، ورزش و بدن", label_en: "Health & Fitness", icon: "💪" },
  { key: "spiritual", label: "معنویت، معنا و آرامش", label_en: "Spirituality & Meaning", icon: "🌌" },
  { key: "citizenship", label: "مسئولیت اجتماعی و محیط‌زیست", label_en: "Citizenship & Society", icon: "🌱" },
  { key: "self", label: "خودمراقبتی و صلح درونی", label_en: "Self & Personal Care", icon: "🪞" },
];

interface DomainState {
  importance: number | null; // null = unspecified, NOT default 5!
  consistency: number | null; // null = unspecified, NOT default 5! (Alignment over the past week)
  value: string; // free text: what matters here
  constraints?: string; // optional: constraints of time, energy, resources
}

interface Goal {
  id: string;
  domain: string;
  text: string;
  horizon: "today" | "week" | "month" | "year";
  created_at: string;
}

const STORAGE = (uid: string) => `mind_values_${uid}`;
const GOALS_STORAGE = (uid: string) => `mind_goals_${uid}`;

const HORIZONS = {
  today: { label: "امروز", label_en: "Today", days: 0 },
  week: { label: "این هفته", label_en: "This Week", days: 7 },
  month: { label: "این ماه", label_en: "This Month", days: 30 },
  year: { label: "امسال", label_en: "This Year", days: 365 },
};

export default function ValuesGoalsView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { T, isEn } = useBilingual();
  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  const [state, setState] = useState<Record<string, DomainState>>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editingDomain, setEditingDomain] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState({
    domain: DOMAINS[0].key,
    text: "",
    horizon: "week" as Goal["horizon"],
  });

  useEffect(() => {
    if (!user) {
      setState({});
      setGoals([]);
      return;
    }

    // 1. Load from local cache
    try {
      const raw = localStorage.getItem(STORAGE(user.id));
      if (raw) setState(JSON.parse(raw));
      const g = localStorage.getItem(GOALS_STORAGE(user.id));
      if (g) setGoals(JSON.parse(g));
    } catch {}

    // 2. Subscribe to Firestore Values
    const unsubValues = subscribeMindValues(user.id, (cloudValues) => {
      if (cloudValues && Object.keys(cloudValues).length > 0) {
        setState(cloudValues);
        try {
          localStorage.setItem(STORAGE(user.id), JSON.stringify(cloudValues));
        } catch {}
      }
    });

    // 3. Subscribe to Firestore Goals
    const unsubGoals = subscribeMindGoals(user.id, (cloudGoals) => {
      if (cloudGoals && cloudGoals.length > 0) {
        setGoals(cloudGoals as Goal[]);
        try {
          localStorage.setItem(GOALS_STORAGE(user.id), JSON.stringify(cloudGoals));
        } catch {}
      }
    });

    return () => {
      unsubValues();
      unsubGoals();
    };
  }, [user]);

  function persist(next: Record<string, DomainState>) {
    setState(next);
    if (user) {
      try {
        localStorage.setItem(STORAGE(user.id), JSON.stringify(next));
      } catch {}
      saveMindValues(user.id, next);
    }
  }

  function update(key: string, patch: Partial<DomainState>) {
    const cur = state[key] || { importance: null, consistency: null, value: "", constraints: "" };
    persist({ ...state, [key]: { ...cur, ...patch } });
  }

  // Reflection Areas: where both importance & consistency are rated and importance > consistency
  const reflectionAreas = DOMAINS.map((d) => {
    const s = state[d.key];
    const hasScores = s && s.importance != null && s.consistency != null;
    const gap = hasScores ? s.importance! - s.consistency! : null;
    return {
      ...d,
      state: s,
      hasScores,
      gap,
    };
  })
    .filter((d) => d.hasScores && d.gap !== null && d.gap > 0)
    .sort((a, b) => (b.gap ?? 0) - (a.gap ?? 0));

  async function addGoal() {
    if (!user || !newGoal.text.trim()) {
      toast.error(T("متن هدف را بنویس", "Please enter goal text"));
      return;
    }
    const item: Goal = {
      id: `goal_${Date.now()}`,
      domain: newGoal.domain,
      text: newGoal.text.trim(),
      horizon: newGoal.horizon,
      created_at: new Date().toISOString(),
    };
    const next = [...goals, item];
    setGoals(next);
    if (user) {
      try {
        localStorage.setItem(GOALS_STORAGE(user.id), JSON.stringify(next));
      } catch {}
      await upsertMindGoal(user.id, item);
    }
    setNewGoal({ domain: DOMAINS[0].key, text: "", horizon: "week" });
    toast.success(T("هدف ثبت شد ✨", "Goal saved ✨"));
  }

  async function removeGoal(id: string) {
    const next = goals.filter((g) => g.id !== id);
    setGoals(next);
    if (user) {
      try {
        localStorage.setItem(GOALS_STORAGE(user.id), JSON.stringify(next));
      } catch {}
      await deleteMindGoal(user.id, id);
    }
    toast.success(T("هدف حذف شد", "Goal removed"));
  }

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in"
    >
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/mind")}>
        <BackIcon className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> {T("ذهن", "Mind")}
      </Button>

      {/* Header Banner */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-md">
        <div className="flex items-center gap-2 text-xs opacity-85 mb-1.5">
          <Compass className="w-4 h-4" />
          {T("قطب‌نمای ارزش‌ها و اهداف (ACT)", "Values & Goals Compass (ACT)")}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {T("شفاف‌سازی ارزش‌ها در ۱۰ حوزه زندگی", "Clarifying Core Values in 10 Life Domains")}
        </h1>
        <p className="text-sm opacity-90 leading-7">
          {T(
            "ارزش، جهت حرکت و کیفیت رفتار است (مثل قطب‌نما)؛ در حالی که هدف یا تسک، اقدامی مشخص و ملموس است (مثل مقصد). در این صفحه جهت را روشن کن و گام‌های همسو بردار.",
            "Values are ongoing directions of living (like a compass); goals are specific destinations. Clarify your direction here and take aligned steps."
          )}
        </p>
      </div>

      {/* Distinction Note */}
      <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground flex items-start gap-2.5">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-foreground">
            {T("تفکیک ارزش و اقدام: ", "Distinction between Value & Goal: ")}
          </strong>
          {T(
            "ارزش‌ها پاسخ به «می‌خواهم چطور زندگی کنم؟» هستند و پایانی ندارند. نمرات اهمیت و همسویی بدون ورود شما «نامشخص» در نظر گرفته می‌شوند.",
            "Values are answers to 'How do I want to show up in life?' and are never finished. Unanswered ratings remain 'Unspecified'."
          )}
        </div>
      </div>

      {/* Areas for Reflection */}
      {reflectionAreas.length > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <Compass className="w-4 h-4" />
              {T("زمینه‌هایی برای تأمل (شکاف اهمیت و همسویی)", "Areas for Reflection (Importance vs Aligned Actions)")}
            </CardTitle>
            <CardDescription>
              {T(
                "در این حوزه‌ها، اهمیت بالاتری نسبت به میزان همسویی رفتار در هفته گذشته گزارش داده‌اید. اولویت‌بندی نهایی با شماست:",
                "In these domains, reported importance is higher than behavioral alignment over the past week. You decide where to focus:"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {reflectionAreas.slice(0, 3).map((d) => (
              <div
                key={d.key}
                className="p-3 rounded-xl bg-background border border-amber-500/20 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-base">{d.icon}</span>
                  <span>{isEn ? d.label_en : d.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">
                    {isEn
                      ? `Importance: ${d.state?.importance}/10 | Alignment (past week): ${d.state?.consistency}/10`
                      : `اهمیت: ${toPersianDigits(d.state?.importance)}/۱۰ | همسویی (هفته قبل): ${toPersianDigits(d.state?.consistency)}/۱۰`}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setEditingDomain(d.key)}
                  >
                    {T("تأمل و ویرایش", "Reflect & Edit")}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 10 Domains Grid */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold">
          {T("۱۰ حوزه زندگی برای شفاف‌سازی ارزش‌ها", "10 Life Domains")}
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {DOMAINS.map((d) => {
            const s = state[d.key];
            const isEditing = editingDomain === d.key;

            return (
              <Card
                key={d.key}
                className={`transition-all ${
                  isEditing ? "border-primary ring-1 ring-primary/30 sm:col-span-2" : "hover:border-primary/40"
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <span className="text-lg">{d.icon}</span>
                      <span>{isEn ? d.label_en : d.label}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setEditingDomain(isEditing ? null : d.key)}
                    >
                      {isEditing ? T("بستن", "Close") : T("ویرایش / ثبت", "Edit / Rate")}
                    </Button>
                  </div>

                  {s?.value && (
                    <p className="text-xs text-muted-foreground italic leading-relaxed">
                      «{s.value}»
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                    <span>
                      {isEn ? "Importance: " : "اهمیت: "}
                      <strong className="text-foreground">
                        {s?.importance != null
                          ? isEn
                            ? `${s.importance}/10`
                            : `${toPersianDigits(s.importance)}/۱۰`
                          : T("نامشخص", "Unspecified")}
                      </strong>
                    </span>
                    <span>
                      {isEn ? "Alignment (past week): " : "همسویی (هفته گذشته): "}
                      <strong className="text-foreground">
                        {s?.consistency != null
                          ? isEn
                            ? `${s.consistency}/10`
                            : `${toPersianDigits(s.consistency)}/۱۰`
                          : T("نامشخص", "Unspecified")}
                      </strong>
                    </span>
                  </div>

                  {/* Expanded Edit Form */}
                  {isEditing && (
                    <div className="pt-3 border-t border-border/60 space-y-3.5 animate-fade-in">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">
                          {T("این حوزه برای تو چه معنایی دارد و چه ارزشی مدنظر داری؟", "What matters most to you in this domain?")}
                        </Label>
                        <Textarea
                          rows={2}
                          value={s?.value || ""}
                          onChange={(e) => update(d.key, { value: e.target.value })}
                          placeholder={T("ارزش اصلی مدنظر من در این حوزه...", "My core value here...")}
                        />
                      </div>

                      {/* Importance Slider (starts at null) */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <Label className="text-muted-foreground">
                            {T("میزان اهمیت برای تو (۰ تا ۱۰):", "Importance to you (0-10):")}
                          </Label>
                          <span className="font-mono font-bold">
                            {s?.importance != null ? `${s.importance} / 10` : T("نامشخص", "Unspecified")}
                          </span>
                        </div>
                        <Slider
                          value={[s?.importance ?? 0]}
                          max={10}
                          step={1}
                          onValueChange={(v) => update(d.key, { importance: v[0] })}
                        />
                      </div>

                      {/* Consistency Slider (Alignment past week, starts at null) */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <Label className="text-muted-foreground">
                            {T("میزان همسویی رفتارها با این ارزش در هفته گذشته (۰ تا ۱۰):", "Behavioral alignment over the past week (0-10):")}
                          </Label>
                          <span className="font-mono font-bold">
                            {s?.consistency != null ? `${s.consistency} / 10` : T("نامشخص", "Unspecified")}
                          </span>
                        </div>
                        <Slider
                          value={[s?.consistency ?? 0]}
                          max={10}
                          step={1}
                          onValueChange={(v) => update(d.key, { consistency: v[0] })}
                        />
                      </div>

                      {/* Constraints note */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {T("محدودیت‌های زمان، انرژی یا منابع در این حوزه (اختیاری):", "Constraints: time, energy, or resources (optional):")}
                        </Label>
                        <Input
                          value={s?.constraints || ""}
                          onChange={(e) => update(d.key, { constraints: e.target.value })}
                          placeholder={T("مثلاً: کمبود وقت به خاطر شیفت کاری...", "e.g. Limited time due to work shifts...")}
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            setEditingDomain(null);
                            toast.success(T("ذخیره شد", "Saved"));
                          }}
                        >
                          {T("تکمیل و بستن", "Done")}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Goals Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            {T("اهداف جهت‌بخش منتهی به اقدام", "Actionable Directional Goals")}
          </CardTitle>
          <CardDescription>
            {T("هدف، اقدامی مشخص و ملموس در راستای ارزش‌های بالاست:", "A goal is a concrete, actionable milestone aligned with your values:")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={newGoal.domain}
              onChange={(e) => setNewGoal({ ...newGoal, domain: e.target.value })}
              className="h-10 rounded-md border bg-background px-3 text-xs"
            >
              {DOMAINS.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.icon} {isEn ? d.label_en : d.label}
                </option>
              ))}
            </select>

            <select
              value={newGoal.horizon}
              onChange={(e) => setNewGoal({ ...newGoal, horizon: e.target.value as any })}
              className="h-10 rounded-md border bg-background px-3 text-xs"
            >
              {Object.entries(HORIZONS).map(([k, v]) => (
                <option key={k} value={k}>
                  {isEn ? v.label_en : v.label}
                </option>
              ))}
            </select>

            <Input
              value={newGoal.text}
              onChange={(e) => setNewGoal({ ...newGoal, text: e.target.value })}
              placeholder={T("عنوان هدف مشخص...", "Actionable goal description...")}
              className="flex-1 text-xs"
            />

            <Button onClick={addGoal} size="sm" className="shrink-0">
              <Plus className="w-3.5 h-3.5 ms-1" />
              {T("افزودن هدف", "Add Goal")}
            </Button>
          </div>

          <div className="space-y-2 divide-y divide-border/40">
            {goals.map((g) => {
              const dom = DOMAINS.find((d) => d.key === g.domain);
              const hor = HORIZONS[g.horizon];
              return (
                <div
                  key={g.id}
                  className="pt-2 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span>{dom?.icon || "🎯"}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {isEn ? hor?.label_en : hor?.label}
                    </Badge>
                    <span className="font-medium text-foreground">{g.text}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={() => removeGoal(g.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
