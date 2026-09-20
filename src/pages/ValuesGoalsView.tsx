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
import { ArrowRight, ArrowLeft, Compass, Plus, Save, Target, Heart, Trash2 } from "lucide-react";
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
  { key: "intimate", label: "روابط صمیمی", label_en: "Intimate Relationships", icon: "❤️" },
  { key: "friendship", label: "دوستی و اجتماع", label_en: "Friendship & Community", icon: "🤝" },
  { key: "career", label: "کار و حرفه", label_en: "Work & Career", icon: "💼" },
  { key: "education", label: "یادگیری و رشد", label_en: "Learning & Growth", icon: "📚" },
  { key: "leisure", label: "تفریح و سرگرمی", label_en: "Leisure & Play", icon: "🎨" },
  { key: "health", label: "سلامت و بدن", label_en: "Health & Fitness", icon: "💪" },
  { key: "spiritual", label: "معنویت/معنا", label_en: "Spirituality & Meaning", icon: "🌌" },
  { key: "citizenship", label: "شهروندی/جامعه", label_en: "Citizenship & Society", icon: "🌱" },
  { key: "self", label: "خود و رشد فردی", label_en: "Self & Personal Care", icon: "🪞" },
];

interface DomainState {
  importance: number; // 0..10
  consistency: number; // 0..10 — how aligned my actions are
  value: string; // free text — what matters here
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
  const [editing, setEditing] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState({ domain: DOMAINS[0].key, text: "", horizon: "week" as Goal["horizon"] });

  useEffect(() => {
    if (!user) {
      setState({});
      setGoals([]);
      return;
    }

    // 1. Load from local cache immediately
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
        try { localStorage.setItem(STORAGE(user.id), JSON.stringify(cloudValues)); } catch {}
      } else {
        // Cloud is empty, check if we should migrate local data
        try {
          const raw = localStorage.getItem(STORAGE(user.id));
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Object.keys(parsed).length > 0) {
              saveMindValues(user.id, parsed);
            }
          }
        } catch {}
      }
    });

    // 3. Subscribe to Firestore Goals
    const unsubGoals = subscribeMindGoals(user.id, (cloudGoals) => {
      if (cloudGoals && cloudGoals.length > 0) {
        setGoals(cloudGoals as Goal[]);
        try { localStorage.setItem(GOALS_STORAGE(user.id), JSON.stringify(cloudGoals)); } catch {}
      } else {
        // Cloud is empty, check if we should migrate local goals
        try {
          const raw = localStorage.getItem(GOALS_STORAGE(user.id));
          if (raw) {
            const parsed: Goal[] = JSON.parse(raw);
            if (parsed.length > 0) {
              parsed.forEach((item) => upsertMindGoal(user.id, item));
            }
          }
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
      try { localStorage.setItem(STORAGE(user.id), JSON.stringify(next)); } catch {}
      saveMindValues(user.id, next);
    }
  }

  function persistGoals(next: Goal[]) {
    setGoals(next);
    if (user) {
      try { localStorage.setItem(GOALS_STORAGE(user.id), JSON.stringify(next)); } catch {}
    }
  }

  function update(key: string, patch: Partial<DomainState>) {
    const cur = state[key] || { importance: 5, consistency: 5, value: "" };
    persist({ ...state, [key]: { ...cur, ...patch } });
  }

  // Gap = importance - consistency (positive = under-living this value)
  const ranked = DOMAINS
    .map((d) => {
      const s = state[d.key] || { importance: 0, consistency: 0, value: "" };
      return { ...d, ...s, gap: s.importance - s.consistency };
    })
    .sort((a, b) => b.gap - a.gap);

  async function addGoal() {
    if (!newGoal.text.trim() || !user) return;
    const goal: Goal = {
      id: crypto.randomUUID(),
      domain: newGoal.domain,
      text: newGoal.text.trim(),
      horizon: newGoal.horizon,
      created_at: new Date().toISOString(),
    };
    persistGoals([goal, ...goals]);
    upsertMindGoal(user.id, goal);
    setNewGoal({ ...newGoal, text: "" });
    toast.success(T("هدف افزوده شد", "Goal added"));
  }

  async function goalToTask(g: Goal) {
    if (!user) return;
    const days = HORIZONS[g.horizon].days;
    const dObj = DOMAINS.find((d) => d.key === g.domain);
    const domainLabel = (isEn ? dObj?.label_en : dObj?.label) || "";

    const res = await createTaskFromMind({
      user_id: user.id,
      title: g.text,
      description: isEn ? `Value-aligned goal · ${domainLabel}` : `هدف ارزش‌محور · ${domainLabel}`,
      due_in_days: days, // 0 for today ensures it gets today's date
      source_type: "values_goal",
      source_id: g.id,
      priority: "medium",
    });

    if (res.ok) {
      toast.success(T("به Task تبدیل شد", "Converted to Task"));
      navigate("/app/today");
    } else {
      toast.error(res.error || T("خطا در تبدیل هدف به تسک", "Error converting goal to task"));
    }
  }

  function removeGoal(id: string) {
    persistGoals(goals.filter((g) => g.id !== id));
    if (user) deleteMindGoal(user.id, id);
  }

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/mind")}>
        <BackIcon className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> Mind
      </Button>

      <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-md">
        <div className="flex items-center gap-2 text-xs opacity-80 mb-2">
          <Compass className="w-4 h-4" /> ACT — Values & Goals
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{T("ارزش‌ها و اهداف معنادار", "Meaningful Values & Goals")}</h1>
        <p className="text-sm opacity-90 leading-7 max-w-2xl">
          {T(
            "ارزش‌ها جهت زندگی‌اند، نه مقصد. در هر حوزه: اهمیت آن برای تو چقدر است و عمل تو چقدر با آن همسوست؟ شکاف بزرگ = جای شروع.",
            "Values are life directions, not destinations. In each area: how important is it to you, and how aligned are your actions? A large gap = where to start."
          )}
        </p>
      </div>

      <div className="grid gap-3">
        {DOMAINS.map((d) => {
          const s = state[d.key] || { importance: 5, consistency: 5, value: "" };
          const gap = s.importance - s.consistency;
          const isOpen = editing === d.key;
          const label = isEn ? d.label_en : d.label;
          return (
            <Card key={d.key} className={gap >= 4 ? "border-amber-500/40" : ""}>
              <CardContent className="p-4 space-y-3">
                <button onClick={() => setEditing(isOpen ? null : d.key)} className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{d.icon}</span>
                    <div className="text-start">
                      <div className="font-semibold">{label}</div>
                      {s.value && <div className="text-xs text-muted-foreground line-clamp-1">{s.value}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">{T(`اهمیت ${s.importance}`, `Importance ${s.importance}`)}</Badge>
                    <Badge variant="outline">{T(`عمل ${s.consistency}`, `Action ${s.consistency}`)}</Badge>
                    {gap > 0 && (
                      <Badge style={{ background: gap >= 4 ? "hsl(20 90% 55%)" : "hsl(40 90% 55%)", color: "white" }}>
                        {T(`شکاف ${gap}`, `Gap ${gap}`)}
                      </Badge>
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div className="space-y-4 pt-2 border-t">
                    <div className="space-y-2">
                      <Label className="text-xs">
                        {T(`این حوزه چقدر برای تو مهم است؟ (${s.importance}/10)`, `How important is this domain to you? (${s.importance}/10)`)}
                      </Label>
                      <Slider value={[s.importance]} max={10} step={1} onValueChange={(v) => update(d.key, { importance: v[0] })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">
                        {T(`عمل تو در ۳۰ روز اخیر چقدر همسو بوده؟ (${s.consistency}/10)`, `How aligned was your action in the last 30 days? (${s.consistency}/10)`)}
                      </Label>
                      <Slider value={[s.consistency]} max={10} step={1} onValueChange={(v) => update(d.key, { consistency: v[0] })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">
                        {T("ارزش هسته‌ای: «در این حوزه می‌خواهم چه نوع آدمی باشم؟»", "Core Value: 'What kind of person do I want to be in this domain?'")}
                      </Label>
                      <Textarea
                        rows={2}
                        value={s.value}
                        onChange={(e) => update(d.key, { value: e.target.value })}
                        placeholder={T("مثال: یک شنونده صبور و حاضر برای خانواده‌ام", "e.g., A patient and present listener for my family")}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setNewGoal({ ...newGoal, domain: d.key });
                        document.getElementById("new-goal")?.scrollIntoView({ behavior: "smooth" });
                      }}
                    >
                      <Target className={`w-3.5 h-3.5 ${isEn ? "me-1" : "ms-1"}`} /> {T("ساخت هدف برای این حوزه", "Create goal for this domain")}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {ranked.some((r) => r.gap >= 3) && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="w-4 h-4 text-amber-600" /> {T("سه حوزه با بزرگ‌ترین شکاف", "Three Domains with the Largest Gap")}
            </CardTitle>
            <CardDescription>{T("اینها بیشترین پتانسیل برای رشد را دارند", "These have the highest potential for growth")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ranked.filter((r) => r.gap >= 3).slice(0, 3).map((r) => (
              <div key={r.key} className="flex items-center justify-between p-2 rounded-lg bg-background">
                <span className="text-sm flex items-center gap-2">
                  <span>{r.icon}</span> {isEn ? r.label_en : r.label}
                </span>
                <Badge variant="outline">{T(`شکاف ${r.gap}`, `Gap ${r.gap}`)}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Goals */}
      <Card id="new-goal">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" /> {T("هدف معنادار", "Meaningful Goal")}
          </CardTitle>
          <CardDescription>{T("یک قدم کوچک، عملی، در راستای ارزش", "A small, actionable step in line with your values")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <select
              className="w-full p-2 rounded-md border bg-background text-sm"
              value={newGoal.domain}
              onChange={(e) => setNewGoal({ ...newGoal, domain: e.target.value })}
            >
              {DOMAINS.map((d) => <option key={d.key} value={d.key}>{d.icon} {isEn ? d.label_en : d.label}</option>)}
            </select>
            <select
              className="w-full p-2 rounded-md border bg-background text-sm"
              value={newGoal.horizon}
              onChange={(e) => setNewGoal({ ...newGoal, horizon: e.target.value as Goal["horizon"] })}
            >
              {Object.entries(HORIZONS).map(([k, v]) => (
                <option key={k} value={k}>{isEn ? v.label_en : v.label}</option>
              ))}
            </select>
          </div>
          <Input
            value={newGoal.text}
            onChange={(e) => setNewGoal({ ...newGoal, text: e.target.value })}
            placeholder={T("مثلاً: ۱۵ دقیقه با مادرم تلفنی صحبت کنم", "e.g., Call my mother for 15 minutes")}
          />
          <Button onClick={addGoal} disabled={!newGoal.text.trim()}>
            <Plus className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> {T("افزودن هدف", "Add Goal")}
          </Button>
        </CardContent>
      </Card>

      {goals.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">{T(`اهداف فعال (${goals.length})`, `Active Goals (${goals.length})`)}</h3>
          {goals.map((g) => {
            const d = DOMAINS.find((x) => x.key === g.domain);
            const dLabel = isEn ? d?.label_en : d?.label;
            const hLabel = isEn ? HORIZONS[g.horizon].label_en : HORIZONS[g.horizon].label;
            return (
              <Card key={g.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{g.text}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <span>{d?.icon} {dLabel}</span>
                      <span>·</span>
                      <span>{hLabel}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => goalToTask(g)}>
                    <Save className={`w-3.5 h-3.5 ${isEn ? "me-1" : "ms-1"}`} /> Task
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => removeGoal(g.id)}>
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
