import { useEffect, useMemo, useState } from "react";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Plus, Droplet, Heart, Trash2, Sparkles, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import {
  type CycleProfile, type CycleLog, computePhase, predictNextPeriod,
  PHASE_META, SYMPTOM_OPTIONS, getSymptomLabel,
} from "@/lib/cycle";
import { formatDate, toPersianDigits } from "@/lib/jalali";
import { useBilingual } from "@/hooks/useBilingual";

export default function CycleView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [profiles, setProfiles] = useState<CycleProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [logs, setLogs] = useState<CycleLog[]>([]);
  const [overlayEnabled, setOverlayEnabled] = useState(false);
  const [today] = useState(new Date());
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const active = profiles.find((p) => p.id === activeId) || null;

  // Load profiles + settings
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: ps } = await firebaseStore.from("cycle_profiles").select("*").order("created_at");
      setProfiles((ps || []) as any);
      const { data: s } = await firebaseStore
        .from("user_settings").select("cycle_overlay_enabled, active_cycle_profile_id")
        .eq("user_id", user.id).maybeSingle();
      setOverlayEnabled(!!(s as any)?.cycle_overlay_enabled);
      const aid = (s as any)?.active_cycle_profile_id || (ps || [])[0]?.id || null;
      setActiveId(aid);
    })();
  }, [user]);

  // Load logs for active profile
  useEffect(() => {
    if (!activeId) { setLogs([]); return; }
    firebaseStore.from("cycle_logs").select("*").eq("profile_id", activeId)
      .order("log_date", { ascending: false })
      .then(({ data }) => setLogs((data || []) as any));
  }, [activeId]);

  const phaseToday = useMemo(() => {
    if (!active) return null;
    return computePhase(today, logs, active);
  }, [active, logs, today]);

  const nextPeriod = useMemo(() => {
    if (!active) return null;
    return predictNextPeriod(logs, active, today);
  }, [active, logs, today]);

  const todayLog = logs.find((l) => l.log_date === format(today, "yyyy-MM-dd"));
  const [pain, setPain] = useState<number>(0);
  const [mood, setMood] = useState<number>(5);
  const [energy, setEnergy] = useState<number>(5);
  const [flow, setFlow] = useState<number>(0);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setPain(todayLog?.pain ?? 0);
    setMood(todayLog?.mood ?? 5);
    setEnergy(todayLog?.energy ?? 5);
    setFlow(todayLog?.flow ?? 0);
    setSymptoms(todayLog?.symptoms ?? []);
    setNotes(todayLog?.notes ?? "");
  }, [
    todayLog?.id,
    todayLog?.pain,
    todayLog?.mood,
    todayLog?.energy,
    todayLog?.flow,
    todayLog?.symptoms,
    todayLog?.notes,
  ]);

  const createProfile = async () => {
    if (!user || !newLabel.trim()) return;
    const { data, error } = await firebaseStore.from("cycle_profiles")
      .insert({ user_id: user.id, label: newLabel.trim(), is_self: profiles.length === 0 })
      .select().single();
    if (error) return toast.error(error.message);
    setProfiles((p) => [...p, data as any]);
    setActiveId((data as any).id);
    setNewLabel(""); setCreating(false);
    toast.success(T("پروفایل ساخته شد", "Profile created successfully"));
  };

  const updateProfile = async (patch: Partial<CycleProfile>) => {
    if (!active) return;
    setProfiles((ps) => ps.map((p) => p.id === active.id ? { ...p, ...patch } as any : p));
    await firebaseStore.from("cycle_profiles").update(patch).eq("id", active.id);
  };

  const deleteProfile = async () => {
    if (!active) return;
    const confirmMsg = isEn
      ? `Delete "${active.label}"? All associated cycle logs will also be erased.`
      : `حذف «${active.label}»؟ همه‌ی لاگ‌ها هم پاک می‌شن.`;
    if (!confirm(confirmMsg)) return;
    await firebaseStore.from("cycle_profiles").delete().eq("id", active.id);
    setProfiles((ps) => ps.filter((p) => p.id !== active.id));
    setActiveId(profiles.find((p) => p.id !== active.id)?.id || null);
  };

  const setActive = async (id: string) => {
    setActiveId(id);
    if (user) {
      await firebaseStore.from("user_settings").update({ active_cycle_profile_id: id }).eq("user_id", user.id);
    }
  };

  const toggleOverlay = async (v: boolean) => {
    setOverlayEnabled(v);
    if (user) {
      await firebaseStore.from("user_settings").update({ cycle_overlay_enabled: v }).eq("user_id", user.id);
    }
  };

  const logPeriodStart = async () => {
    if (!user || !active) return;
    const ds = format(today, "yyyy-MM-dd");
    const { error } = await firebaseStore.from("cycle_logs").upsert({
      user_id: user.id, profile_id: active.id, log_date: ds, event: "period_start", flow: Math.max(flow, 2),
    }, { onConflict: "profile_id,log_date" }).select();
    if (error) return toast.error(error.message);
    const { data } = await firebaseStore.from("cycle_logs").select("*").eq("profile_id", active.id).order("log_date", { ascending: false });
    setLogs((data || []) as any);
    toast.success(T("شروع پریود ثبت شد", "Period start recorded"));
  };

  const saveTodayLog = async () => {
    if (!user || !active) return;
    const ds = format(today, "yyyy-MM-dd");
    const payload: any = {
      user_id: user.id, profile_id: active.id, log_date: ds,
      event: todayLog?.event ?? null,
      pain, mood, energy, flow, symptoms, notes,
    };
    const { error } = await firebaseStore.from("cycle_logs").upsert(payload, { onConflict: "profile_id,log_date" });
    if (error) return toast.error(error.message);
    toast.success(T("ذخیره شد", "Saved successfully"));
    const { data } = await firebaseStore.from("cycle_logs").select("*").eq("profile_id", active.id).order("log_date", { ascending: false });
    setLogs((data || []) as any);
  };

  const toggleSymptom = (s: string) => {
    setSymptoms((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]);
  };

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-500" /> {T("سیکل پریود", "Cycle Tracking")}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">{T("پیگیری چندنفره، فاز سیکل و علائم روزانه", "Multi-profile tracking, cycle phases, and daily symptoms")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs">{T("نمایش روی تقویم", "Show on Calendar")}</Label>
          <Switch checked={overlayEnabled} onCheckedChange={toggleOverlay} />
        </div>
      </div>

      {/* Profiles selector */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm">{T("پروفایل‌ها", "Profiles")}</h2>
          {!creating && (
            <Button size="sm" variant="outline" onClick={() => setCreating(true)} className="gap-1">
              <Plus className="w-3 h-3" /> {T("جدید", "New")}
            </Button>
          )}
        </div>
        {creating && (
          <div className="flex gap-2">
            <Input placeholder={T("مثلاً: خودم / همسرم", "E.g., Myself / Partner")} value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createProfile()} />
            <Button size="sm" onClick={createProfile}>{T("افزودن", "Add")}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setCreating(false); setNewLabel(""); }}>{T("لغو", "Cancel")}</Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {profiles.map((p) => (
            <button key={p.id} onClick={() => setActive(p.id)}
              className={`px-3 py-1.5 rounded-full text-xs border transition flex items-center gap-1.5 ${
                p.id === activeId ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
              }`}>
              <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
              {p.label}
              {p.is_self && <span className="text-[9px] text-muted-foreground">({T("خودم", "Myself")})</span>}
            </button>
          ))}
          {profiles.length === 0 && <p className="text-xs text-muted-foreground">{T("هنوز پروفایلی نساختی.", "No profiles created yet.")}</p>}
        </div>
      </Card>

      {active && (
        <>
          {/* Today phase summary */}
          <Card className="p-5 space-y-3" style={{
            background: `linear-gradient(135deg, ${PHASE_META[phaseToday?.phase || "unknown"].color}15, transparent)`,
            borderColor: `${PHASE_META[phaseToday?.phase || "unknown"].color}40`,
          }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">{T("امروز", "Today")}</div>
                <div className="flex items-center gap-2">
                  <Badge style={{ background: PHASE_META[phaseToday?.phase || "unknown"].color, color: "white" }}>
                    {isEn ? PHASE_META[phaseToday?.phase || "unknown"].label_en : PHASE_META[phaseToday?.phase || "unknown"].label}
                  </Badge>
                  {phaseToday?.dayOfCycle != null && (
                    <span className="text-sm">
                      {isEn ? `Day ${phaseToday.dayOfCycle} of cycle` : `روز ${toPersianDigits(phaseToday.dayOfCycle)} از سیکل`}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {isEn ? PHASE_META[phaseToday?.phase || "unknown"].description_en : PHASE_META[phaseToday?.phase || "unknown"].description}
                </p>
              </div>
              <Button size="sm" onClick={logPeriodStart} className="gap-1 bg-rose-500 hover:bg-rose-600 text-white">
                <Droplet className="w-3.5 h-3.5" /> {T("شروع پریود امروز", "Period Started Today")}
              </Button>
            </div>
            {nextPeriod && (
              <div className="text-xs text-muted-foreground flex items-center gap-1.5 pt-2 border-t">
                <CalendarRange className="w-3.5 h-3.5" />
                {T("پیش‌بینی پریود بعدی:", "Next period predicted:")}{" "}
                <strong>{formatDate(nextPeriod, isEn ? "EEEE, MMMM d" : "EEEE d MMMM", isEn ? "gregorian" : "jalali")}</strong>
                <span>
                  {isEn
                    ? `(${differenceInCalendarDays(nextPeriod, today)} days away)`
                    : `(${toPersianDigits(differenceInCalendarDays(nextPeriod, today))} روز دیگر)`}
                </span>
              </div>
            )}
          </Card>

          {/* Daily log */}
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> {T("ثبت امروز", "Log Today")}
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">{isEn ? `Flow: ${flow}/4` : `شدت خونریزی: ${toPersianDigits(flow)}/۴`}</Label>
                <Slider value={[flow]} min={0} max={4} step={1} onValueChange={([v]) => setFlow(v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isEn ? `Pain: ${pain}/10` : `درد: ${toPersianDigits(pain)}/۱۰`}</Label>
                <Slider value={[pain]} min={0} max={10} step={1} onValueChange={([v]) => setPain(v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isEn ? `Mood: ${mood}/10` : `خلق: ${toPersianDigits(mood)}/۱۰`}</Label>
                <Slider value={[mood]} min={0} max={10} step={1} onValueChange={([v]) => setMood(v)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{isEn ? `Energy: ${energy}/10` : `انرژی: ${toPersianDigits(energy)}/۱۰`}</Label>
                <Slider value={[energy]} min={0} max={10} step={1} onValueChange={([v]) => setEnergy(v)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{T("علائم", "Symptoms")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {SYMPTOM_OPTIONS.map((s) => (
                  <button key={s} onClick={() => toggleSymptom(s)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition ${
                      symptoms.includes(s) ? "bg-primary text-primary-foreground border-primary" : "hover:border-primary/50"
                    }`}>
                    {getSymptomLabel(s, isEn)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">{T("یادداشت", "Notes")}</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={T("هر چیز دیگری…", "Anything else…")} />
            </div>

            <Button onClick={saveTodayLog} className="w-full">{T("ذخیره", "Save")}</Button>
          </Card>

          {/* Profile settings */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold text-sm">{T("تنظیمات این پروفایل", "Profile Settings")}</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">{T("طول سیکل (روز)", "Cycle Length (days)")}</Label>
                <Input type="number" min={20} max={45} value={active.avg_cycle_length}
                  onChange={(e) => updateProfile({ avg_cycle_length: +e.target.value || 28 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{T("طول قاعدگی (روز)", "Period Length (days)")}</Label>
                <Input type="number" min={2} max={10} value={active.avg_period_length}
                  onChange={(e) => updateProfile({ avg_period_length: +e.target.value || 5 })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{T("فاز لوتئال (روز)", "Luteal Phase (days)")}</Label>
                <Input type="number" min={10} max={16} value={active.luteal_length}
                  onChange={(e) => updateProfile({ luteal_length: +e.target.value || 14 })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">{T("رنگ", "Color")}</Label>
              <input type="color" value={active.color}
                onChange={(e) => updateProfile({ color: e.target.value })}
                className="w-10 h-8 rounded border cursor-pointer" />
            </div>
            <Button variant="destructive" size="sm" onClick={deleteProfile} className="gap-1">
              <Trash2 className="w-3.5 h-3.5" /> {T("حذف پروفایل", "Delete Profile")}
            </Button>
          </Card>

          {/* Recent logs */}
          {logs.length > 0 && (
            <Card className="p-4 space-y-2">
              <h3 className="font-semibold text-sm">{T("تاریخچه", "History")}</h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {logs.slice(0, 30).map((l) => (
                  <div key={l.id} className="text-xs flex items-center justify-between py-1 border-b last:border-0">
                    <span>{formatDate(new Date(l.log_date + "T00:00:00"), isEn ? "d MMM yyyy" : "d MMM yyyy", isEn ? "gregorian" : "jalali")}</span>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {l.event === "period_start" && <Badge variant="outline" className="text-[9px] border-rose-400 text-rose-500">{T("شروع", "Start")}</Badge>}
                      {l.flow != null && l.flow > 0 && <span>💧{isEn ? l.flow : toPersianDigits(l.flow)}</span>}
                      {l.pain != null && l.pain > 0 && <span>😣{isEn ? l.pain : toPersianDigits(l.pain)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
