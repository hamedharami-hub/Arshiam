import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ArrowRight, Compass, Plus, Save, Target, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";

// 10 life domains commonly used in ACT Values clarification.
const DOMAINS = [
  { key: "family", label: "خانواده", icon: "👨‍👩‍👧" },
  { key: "intimate", label: "روابط صمیمی", icon: "❤️" },
  { key: "friendship", label: "دوستی و اجتماع", icon: "🤝" },
  { key: "career", label: "کار و حرفه", icon: "💼" },
  { key: "education", label: "یادگیری و رشد", icon: "📚" },
  { key: "leisure", label: "تفریح و سرگرمی", icon: "🎨" },
  { key: "health", label: "سلامت و بدن", icon: "💪" },
  { key: "spiritual", label: "معنویت/معنا", icon: "🌌" },
  { key: "citizenship", label: "شهروندی/جامعه", icon: "🌱" },
  { key: "self", label: "خود و رشد فردی", icon: "🪞" },
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
  today: { label: "امروز", days: 0 },
  week: { label: "این هفته", days: 7 },
  month: { label: "این ماه", days: 30 },
  year: { label: "امسال", days: 365 },
};

export default function ValuesGoalsView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<Record<string, DomainState>>({});
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState({ domain: DOMAINS[0].key, text: "", horizon: "week" as Goal["horizon"] });

  useEffect(() => {
    if (!user) return;
    try {
      const raw = localStorage.getItem(STORAGE(user.id));
      if (raw) setState(JSON.parse(raw));
      const g = localStorage.getItem(GOALS_STORAGE(user.id));
      if (g) setGoals(JSON.parse(g));
    } catch {}
  }, [user]);

  function persist(next: Record<string, DomainState>) {
    setState(next);
    if (user) localStorage.setItem(STORAGE(user.id), JSON.stringify(next));
  }

  function persistGoals(next: Goal[]) {
    setGoals(next);
    if (user) localStorage.setItem(GOALS_STORAGE(user.id), JSON.stringify(next));
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
    setNewGoal({ ...newGoal, text: "" });
    toast.success("هدف افزوده شد");
  }

  async function goalToTask(g: Goal) {
    if (!user) return;
    const days = HORIZONS[g.horizon].days;
    const due = days === 0 ? null : new Date(Date.now() + days * 86400000).toISOString();
    const domainLabel = DOMAINS.find((d) => d.key === g.domain)?.label || "";
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: g.text,
      description: `هدف ارزش‌محور · ${domainLabel}`,
      due_date: due,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("به Task تبدیل شد");
      navigate("/app/today");
    }
  }

  function removeGoal(id: string) {
    persistGoals(goals.filter((g) => g.id !== id));
  }

  return (
    <div dir="rtl" className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/mind")}>
        <ArrowRight className="w-4 h-4 ms-1" /> Mind
      </Button>

      <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-md">
        <div className="flex items-center gap-2 text-xs opacity-80 mb-2">
          <Compass className="w-4 h-4" /> ACT — Values & Goals
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">ارزش‌ها و اهداف معنادار</h1>
        <p className="text-sm opacity-90 leading-7 max-w-2xl">
          ارزش‌ها جهت زندگی‌اند، نه مقصد. در هر حوزه: اهمیت آن برای تو چقدر است و عمل تو چقدر با آن همسوست؟
          شکاف بزرگ = جای شروع.
        </p>
      </div>

      <div className="grid gap-3">
        {DOMAINS.map((d) => {
          const s = state[d.key] || { importance: 5, consistency: 5, value: "" };
          const gap = s.importance - s.consistency;
          const isOpen = editing === d.key;
          return (
            <Card key={d.key} className={gap >= 4 ? "border-amber-500/40" : ""}>
              <CardContent className="p-4 space-y-3">
                <button onClick={() => setEditing(isOpen ? null : d.key)} className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{d.icon}</span>
                    <div className="text-start">
                      <div className="font-semibold">{d.label}</div>
                      {s.value && <div className="text-xs text-muted-foreground line-clamp-1">{s.value}</div>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">اهمیت {s.importance}</Badge>
                    <Badge variant="outline">عمل {s.consistency}</Badge>
                    {gap > 0 && (
                      <Badge style={{ background: gap >= 4 ? "hsl(20 90% 55%)" : "hsl(40 90% 55%)", color: "white" }}>
                        شکاف {gap}
                      </Badge>
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div className="space-y-4 pt-2 border-t">
                    <div className="space-y-2">
                      <Label className="text-xs">این حوزه چقدر برای تو مهم است؟ ({s.importance}/10)</Label>
                      <Slider value={[s.importance]} max={10} step={1} onValueChange={(v) => update(d.key, { importance: v[0] })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">عمل تو در ۳۰ روز اخیر چقدر همسو بوده؟ ({s.consistency}/10)</Label>
                      <Slider value={[s.consistency]} max={10} step={1} onValueChange={(v) => update(d.key, { consistency: v[0] })} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">ارزش هسته‌ای: «در این حوزه می‌خواهم چه نوع آدمی باشم؟»</Label>
                      <Textarea rows={2} value={s.value} onChange={(e) => update(d.key, { value: e.target.value })}
                        placeholder="مثال: یک شنونده صبور و حاضر برای خانواده‌ام" />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => { setNewGoal({ ...newGoal, domain: d.key }); document.getElementById("new-goal")?.scrollIntoView({ behavior: "smooth" }); }}>
                      <Target className="w-3.5 h-3.5 ms-1" /> ساخت هدف برای این حوزه
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
              <Heart className="w-4 h-4 text-amber-600" /> سه حوزه با بزرگ‌ترین شکاف
            </CardTitle>
            <CardDescription>اینها بیشترین پتانسیل برای رشد را دارند</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {ranked.filter((r) => r.gap >= 3).slice(0, 3).map((r) => (
              <div key={r.key} className="flex items-center justify-between p-2 rounded-lg bg-background">
                <span className="text-sm flex items-center gap-2"><span>{r.icon}</span> {r.label}</span>
                <Badge variant="outline">شکاف {r.gap}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Goals */}
      <Card id="new-goal">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-primary" /> هدف معنادار</CardTitle>
          <CardDescription>یک قدم کوچک، عملی، در راستای ارزش</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-2">
            <select
              className="w-full p-2 rounded-md border bg-background text-sm"
              value={newGoal.domain}
              onChange={(e) => setNewGoal({ ...newGoal, domain: e.target.value })}
            >
              {DOMAINS.map((d) => <option key={d.key} value={d.key}>{d.icon} {d.label}</option>)}
            </select>
            <select
              className="w-full p-2 rounded-md border bg-background text-sm"
              value={newGoal.horizon}
              onChange={(e) => setNewGoal({ ...newGoal, horizon: e.target.value as Goal["horizon"] })}
            >
              {Object.entries(HORIZONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <Input value={newGoal.text} onChange={(e) => setNewGoal({ ...newGoal, text: e.target.value })}
            placeholder="مثلاً: ۱۵ دقیقه با مادرم تلفنی صحبت کنم" />
          <Button onClick={addGoal} disabled={!newGoal.text.trim()}><Plus className="w-4 h-4 ms-1" /> افزودن هدف</Button>
        </CardContent>
      </Card>

      {goals.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">اهداف فعال ({goals.length})</h3>
          {goals.map((g) => {
            const d = DOMAINS.find((x) => x.key === g.domain);
            return (
              <Card key={g.id}>
                <CardContent className="p-3 flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{g.text}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <span>{d?.icon} {d?.label}</span>
                      <span>·</span>
                      <span>{HORIZONS[g.horizon].label}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => goalToTask(g)}>
                    <Save className="w-3.5 h-3.5 ms-1" /> Task
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
