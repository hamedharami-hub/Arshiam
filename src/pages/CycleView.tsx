import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useEffect, useMemo, useState } from "react";
import { addDays, differenceInCalendarDays, format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Activity, AlertTriangle, CalendarDays, CalendarRange, Clock3, Droplet,
  Heart, NotebookPen, Plus, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_CYCLE_PROFILE,
  type CycleProfile,
  type CycleLog,
  computePhase,
  predictFertileWindow,
  predictNextPeriod,
  PHASE_META,
  SYMPTOM_OPTIONS,
  getSymptomLabel,
} from "@/lib/cycle";
import { deleteCycleProfileAndLogs, persistActiveCycleProfile } from "@/lib/cycleProfileService";
import { formatDate, toPersianDigits } from "@/lib/jalali";
import { useBilingual } from "@/hooks/useBilingual";

type ProfileNumberField = "avg_cycle_length" | "avg_period_length" | "luteal_length";
type ProfileDraft = Record<ProfileNumberField, string>;

function normalizeProfile(profile: CycleProfile): CycleProfile {
  return {
    ...DEFAULT_CYCLE_PROFILE,
    ...profile,
    avg_cycle_length: profile.avg_cycle_length || DEFAULT_CYCLE_PROFILE.avg_cycle_length,
    avg_period_length: profile.avg_period_length || DEFAULT_CYCLE_PROFILE.avg_period_length,
    luteal_length: profile.luteal_length || DEFAULT_CYCLE_PROFILE.luteal_length,
    color: profile.color || DEFAULT_CYCLE_PROFILE.color,
  };
}

const profileNumberRules: Record<ProfileNumberField, { min: number; max: number }> = {
  avg_cycle_length: { min: 20, max: 45 },
  avg_period_length: { min: 2, max: 10 },
  luteal_length: { min: 10, max: 16 },
};

export default function CycleView() {
  const { user } = useAuth();
  const userId = user?.id;
  const { T, isEn } = useBilingual();
  const [profiles, setProfiles] = useState<CycleProfile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [logs, setLogs] = useState<CycleLog[]>([]);
  const [overlayEnabled, setOverlayEnabled] = useState(true);
  const [today] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [profileDraft, setProfileDraft] = useState<ProfileDraft>({
    avg_cycle_length: String(DEFAULT_CYCLE_PROFILE.avg_cycle_length),
    avg_period_length: String(DEFAULT_CYCLE_PROFILE.avg_period_length),
    luteal_length: String(DEFAULT_CYCLE_PROFILE.luteal_length),
  });

  const active = profiles.find((profile) => profile.id === activeId) || null;
  const todayKey = format(today, "yyyy-MM-dd");

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setProfiles([]);
      setActiveId(null);
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    void (async () => {
      const [{ data: rows, error: profilesError }, { data: settings, error: settingsError }] = await Promise.all([
        firebaseStore.from("cycle_profiles").select("*").order("created_at"),
        firebaseStore.from("user_settings")
          .select("cycle_overlay_enabled, active_cycle_profile_id")
          .eq("user_id", userId).maybeSingle(),
      ]);
      if (cancelled) return;

      if (profilesError) toast.error(profilesError.message);
      if (settingsError) toast.error(settingsError.message);
      const loaded = ((rows || []) as CycleProfile[]).map(normalizeProfile);
      setProfiles(loaded);
      setOverlayEnabled((settings as { cycle_overlay_enabled?: boolean } | null)?.cycle_overlay_enabled !== false);

      const savedId = (settings as { active_cycle_profile_id?: string | null } | null)?.active_cycle_profile_id || null;
      const selectedId = loaded.some((profile) => profile.id === savedId) ? savedId : loaded[0]?.id || null;
      setActiveId(selectedId);
      if (selectedId !== savedId) {
        const { error } = await persistActiveCycleProfile(userId, selectedId);
        if (!cancelled && error) toast.error(T("انتخاب پیش‌فرض ذخیره نشد", "Could not save the default profile selection"));
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [userId, T]);

  useEffect(() => {
    let cancelled = false;
    if (!userId || !activeId) {
      setLogs([]);
      return;
    }
    void firebaseStore.from("cycle_logs").select("*").eq("profile_id", activeId)
      .order("log_date", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error(error.message);
        setLogs((data || []) as CycleLog[]);
      });
    return () => { cancelled = true; };
  }, [activeId, userId]);

  useEffect(() => {
    if (!active) return;
    setProfileDraft({
      avg_cycle_length: String(active.avg_cycle_length),
      avg_period_length: String(active.avg_period_length),
      luteal_length: String(active.luteal_length),
    });
  }, [activeId, active]);

  const phaseToday = useMemo(() => active ? computePhase(today, logs, active) : null, [active, logs, today]);
  const nextPeriod = useMemo(() => active ? predictNextPeriod(logs, active, today) : null, [active, logs, today]);
  const fertileWindow = useMemo(() => active ? predictFertileWindow(logs, active, today) : null, [active, logs, today]);
  const todayLog = logs.find((log) => log.log_date === todayKey);

  const [pain, setPain] = useState(0);
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [flow, setFlow] = useState(0);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setPain(todayLog?.pain ?? 0);
    setMood(todayLog?.mood ?? 5);
    setEnergy(todayLog?.energy ?? 5);
    setFlow(todayLog?.flow ?? 0);
    setSymptoms(todayLog?.symptoms ?? []);
    setNotes(todayLog?.notes ?? "");
  }, [activeId, todayLog?.id, todayLog?.pain, todayLog?.mood, todayLog?.energy, todayLog?.flow, todayLog?.symptoms, todayLog?.notes]);

  const refreshLogs = async (profileId: string) => {
    const { data, error } = await firebaseStore.from("cycle_logs").select("*")
      .eq("profile_id", profileId).order("log_date", { ascending: false });
    if (error) toast.error(error.message);
    else setLogs((data || []) as CycleLog[]);
  };

  const createProfile = async () => {
    if (!user || !newLabel.trim()) return;
    const { data, error } = await firebaseStore.from("cycle_profiles")
      .insert({
        ...DEFAULT_CYCLE_PROFILE,
        user_id: user.id,
        label: newLabel.trim(),
        is_self: profiles.length === 0,
      })
      .select().single();
    if (error || !data) return toast.error(error?.message || T("پروفایل ساخته نشد", "Could not create profile"));

    const created = normalizeProfile(data as CycleProfile);
    setProfiles((current) => [...current, created]);
    setActiveId(created.id);
    setNewLabel("");
    setCreating(false);
    const { error: settingsError } = await persistActiveCycleProfile(user.id, created.id);
    if (settingsError) toast.error(T("پروفایل ساخته شد، اما انتخاب آن ذخیره نشد", "Profile created, but its selection could not be saved"));
    else toast.success(T("پروفایل ساخته شد", "Profile created"));
  };

  const setActive = async (id: string) => {
    if (!user || id === activeId) return;
    const previousId = activeId;
    setActiveId(id);
    const { error } = await persistActiveCycleProfile(user.id, id);
    if (error) {
      setActiveId(previousId);
      toast.error(T("انتخاب پروفایل ذخیره نشد", "Could not save profile selection"));
    }
  };

  const updateProfile = async (patch: Partial<CycleProfile>) => {
    if (!active) return false;
    const previous = active;
    setProfiles((current) => current.map((profile) => profile.id === active.id ? { ...profile, ...patch } : profile));
    const { error } = await firebaseStore.from("cycle_profiles").update(patch).eq("id", active.id);
    if (error) {
      setProfiles((current) => current.map((profile) => profile.id === previous.id ? previous : profile));
      toast.error(error.message);
      return false;
    }
    return true;
  };

  const commitProfileNumber = async (field: ProfileNumberField) => {
    if (!active) return;
    const value = Number(profileDraft[field]);
    const { min, max } = profileNumberRules[field];
    if (!profileDraft[field].trim() || !Number.isInteger(value) || value < min || value > max) {
      setProfileDraft((current) => ({ ...current, [field]: String(active[field]) }));
      toast.error(T(`مقدار باید عددی بین ${toPersianDigits(min)} و ${toPersianDigits(max)} باشد.`, `Enter a whole number from ${min} to ${max}.`));
      return;
    }
    if (value === active[field]) return;
    const saved = await updateProfile({ [field]: value });
    if (saved) setProfileDraft((current) => ({ ...current, [field]: String(value) }));
  };

  const deleteProfile = async () => {
    if (!active || !user) return;
    const confirmMsg = isEn
      ? `Delete “${active.label}”? All associated cycle logs will also be permanently deleted.`
      : `پروفایل «${active.label}» حذف شود؟ همهٔ ثبت‌های سیکل وابسته نیز برای همیشه پاک می‌شوند.`;
    if (!confirm(confirmMsg)) return;

    const { error } = await deleteCycleProfileAndLogs(active.id);
    if (error) return toast.error(T("حذف کامل نشد؛ پروفایل باقی مانده است. ثبت‌ها را بررسی و دوباره تلاش کنید.", "Deletion did not complete; the profile remains. Review its logs and retry."));

    const remaining = profiles.filter((profile) => profile.id !== active.id);
    const nextId = remaining[0]?.id || null;
    setProfiles(remaining);
    setActiveId(nextId);
    setLogs([]);
    const { error: settingsError } = await persistActiveCycleProfile(user.id, nextId);
    if (settingsError) toast.error(T("پروفایل حذف شد، اما انتخاب جدید ذخیره نشد.", "Profile deleted, but the new selection could not be saved."));
    else toast.success(T("پروفایل و ثبت‌های وابسته حذف شدند", "Profile and associated logs deleted"));
  };

  const toggleOverlay = async (enabled: boolean) => {
    if (!user) return;
    const previous = overlayEnabled;
    setOverlayEnabled(enabled);
    const { error } = await firebaseStore.from("user_settings")
      .upsert({ user_id: user.id, cycle_overlay_enabled: enabled }, { onConflict: "user_id" });
    if (error) {
      setOverlayEnabled(previous);
      toast.error(error.message);
    }
  };

  const logPeriodStart = async () => {
    if (!user || !active) return;
    const { error } = await firebaseStore.from("cycle_logs").upsert({
      user_id: user.id,
      profile_id: active.id,
      log_date: todayKey,
      event: "period_start",
      flow: Math.max(flow, 2),
    }, { onConflict: "profile_id,log_date" }).select();
    if (error) return toast.error(error.message);
    await refreshLogs(active.id);
    toast.success(T("شروع پریود امروز ثبت شد", "Period start recorded for today"));
  };

  const saveTodayLog = async () => {
    if (!user || !active) return;
    const { error } = await firebaseStore.from("cycle_logs").upsert({
      user_id: user.id,
      profile_id: active.id,
      log_date: todayKey,
      event: todayLog?.event ?? null,
      pain,
      mood,
      energy,
      flow,
      symptoms,
      notes,
    }, { onConflict: "profile_id,log_date" });
    if (error) return toast.error(error.message);
    await refreshLogs(active.id);
    toast.success(T("ثبت امروز ذخیره شد", "Today's log saved"));
  };

  const toggleSymptom = (symptom: string) => {
    setSymptoms((current) => current.includes(symptom)
      ? current.filter((item) => item !== symptom)
      : [...current, symptom]);
  };

  const calendar = isEn ? "gregorian" : "jalali";
  const phase = phaseToday?.phase || "unknown";
  const phaseMeta = PHASE_META[phase];
  const fertileDays = fertileWindow
    ? Array.from({ length: 6 }, (_, index) => addDays(fertileWindow.start, index))
    : [];

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--xl space-y-5 pb-10">
      <Card className="relative overflow-hidden border-rose-200/70 bg-gradient-to-br from-rose-50 via-white to-pink-100/70 p-5 shadow-sm dark:border-rose-900/60 dark:from-rose-950/50 dark:via-card dark:to-pink-950/30 md:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -end-8 -top-12 h-44 w-44 rounded-full bg-rose-300/20 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white/70 px-2.5 py-1 text-[10px] font-medium tracking-wide text-rose-700 dark:border-rose-800 dark:bg-background/50 dark:text-rose-200">
              <Activity className="h-3.5 w-3.5" /> {T("سلامت و ثبت روزانه", "WELLNESS · DAILY TRACKING")}
            </div>
            <HeaderTitlePortal title={T("پیگیری چرخه", "Cycle Tracking")} />
            <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
              {T("الگوهای بدنت را ثبت کن و برآوردهای تقویمی را با احتیاط دنبال کن.", "Record your patterns and use calendar estimates with care.")}
            </p>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-white/80 bg-white/70 px-4 py-3 shadow-sm dark:border-border dark:bg-background/60 sm:min-w-56">
            <div>
              <Label className="text-sm font-medium">{T("نمایش روی تقویم", "Show on calendar")}</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">{T("نمایش نشانه‌های چرخه", "Show cycle markers")}</p>
            </div>
            <Switch checked={overlayEnabled} onCheckedChange={toggleOverlay} aria-label={T("نمایش روی تقویم", "Show on calendar")} />
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">{T("پروفایل‌ها", "Profiles")}</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">{T("اطلاعات و ثبت‌ها برای هر پروفایل جدا نگه داشته می‌شود.", "Each profile keeps its own settings and logs.")}</p>
          </div>
          {!creating && (
            <Button size="sm" variant="outline" onClick={() => setCreating(true)} className="gap-1.5 rounded-full">
              <Plus className="h-4 w-4" /> {T("پروفایل جدید", "Add profile")}
            </Button>
          )}
        </div>

        {creating && (
          <form className="flex flex-col gap-2 rounded-xl border border-dashed p-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); void createProfile(); }}>
            <Input autoFocus aria-label={T("نام پروفایل", "Profile name")} placeholder={T("مثلاً: خودم", "E.g. Me")} value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)} />
            <Button type="submit" disabled={!newLabel.trim()} size="sm">{T("افزودن", "Add")}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setCreating(false); setNewLabel(""); }}>{T("لغو", "Cancel")}</Button>
          </form>
        )}

        {loading ? (
          <div className="h-11 animate-pulse rounded-lg bg-muted" aria-label={T("در حال بارگذاری پروفایل‌ها", "Loading profiles")} />
        ) : profiles.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label={T("انتخاب پروفایل", "Select profile")}>
            {profiles.map((profile) => (
              <button key={profile.id} type="button" onClick={() => void setActive(profile.id)} aria-pressed={profile.id === activeId}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${profile.id === activeId
                  ? "border-rose-400 bg-rose-100/80 text-rose-950 shadow-sm dark:border-rose-700 dark:bg-rose-950/50 dark:text-rose-100"
                  : "border-border bg-background hover:border-rose-300 hover:bg-rose-50/60 dark:hover:bg-rose-950/20"}`}>
                <span className="h-2.5 w-2.5 rounded-full ring-2 ring-background" style={{ backgroundColor: profile.color }} />
                <span>{profile.label}</span>
                {profile.is_self && <span className="text-[10px] text-muted-foreground">({T("خودم", "Me")})</span>}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900 dark:bg-rose-950/20 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">{T("برای شروع، یک پروفایل بساز. تنظیمات پایه به‌صورت مشخص روی ۲۸ روز، ۵ روز و ۱۴ روز قرار می‌گیرند.", "Create a profile to begin. The visible starting defaults are a 28-day cycle, 5-day period, and 14-day luteal phase.")}</p>
            {!creating && <Button size="sm" onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" />{T("ساخت پروفایل", "Create profile")}</Button>}
          </div>
        )}
      </Card>

      {!loading && !active && profiles.length === 0 && (
        <Card className="flex flex-col items-center gap-3 border-dashed p-8 text-center">
          <div className="rounded-full bg-rose-100 p-3 text-rose-600 dark:bg-rose-950 dark:text-rose-300"><Heart className="h-6 w-6" /></div>
          <h2 className="font-semibold">{T("هنوز پروفایلی برای نمایش نیست", "Nothing to track yet")}</h2>
          <p className="max-w-md text-sm text-muted-foreground">{T("بعد از ساخت پروفایل و ثبت شروع پریود، برآوردهای چرخه و فرم ثبت روزانه در دسترس خواهند بود.", "Create a profile and record a period start to see cycle estimates and the daily log.")}</p>
          <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="h-4 w-4" />{T("ساخت اولین پروفایل", "Create your first profile")}</Button>
        </Card>
      )}

      {active && (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <Card className="overflow-hidden border-rose-200/70 p-0 dark:border-rose-900/60">
              <div className="p-5 md:p-6" style={{ background: `linear-gradient(135deg, ${phaseMeta.color}18, transparent 78%)` }}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">{T("برآورد امروز", "TODAY · ESTIMATE")}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge style={{ backgroundColor: phaseMeta.color, color: "white" }} className="border-0 px-3 py-1">
                        {isEn ? phaseMeta.label_en : phaseMeta.label}
                      </Badge>
                      {phaseToday?.dayOfCycle != null && <span className="text-sm font-medium">{isEn ? `Day ${phaseToday.dayOfCycle} of cycle` : `روز ${toPersianDigits(phaseToday.dayOfCycle)} از چرخه`}</span>}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{isEn ? phaseMeta.description_en : phaseMeta.description}</p>
                  </div>
                  <Button size="sm" onClick={() => void logPeriodStart()} className="gap-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700">
                    <Droplet className="h-4 w-4" /> {T("ثبت شروع پریود امروز", "Log period start today")}
                  </Button>
                </div>
                <div className="mt-4 flex items-start gap-2 rounded-lg border border-border/60 bg-background/60 p-3 text-xs leading-5 text-muted-foreground">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  {T("فاز چرخه بر پایهٔ تاریخ‌های ثبت‌شده و طول متوسط محاسبه می‌شود؛ نشانهٔ پزشکی یا اندازه‌گیری واقعی تخمک‌گذاری نیست.", "Cycle phase is estimated from logged dates and average length; it is not a medical finding or a measurement of ovulation.")}
                </div>
              </div>
              {!phaseToday?.dayOfCycle && (
                <div className="border-t px-5 py-3 text-sm text-muted-foreground">{T("با ثبت یک شروع پریود، برآوردها فعال می‌شوند.", "Log a period start to enable estimates.")}</div>
              )}
            </Card>

            <Card className="space-y-4 p-5 md:p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-violet-100 p-2.5 text-violet-700 dark:bg-violet-950 dark:text-violet-200"><CalendarRange className="h-5 w-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">{T("برآورد بعدی", "NEXT ESTIMATE")}</p>
                  <h2 className="mt-1 font-semibold">{T("شروع احتمالی پریود", "Estimated next period")}</h2>
                  {nextPeriod ? (
                    <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <strong className="text-lg">{formatDate(nextPeriod, isEn ? "EEEE, MMMM d" : "EEEE d MMMM", calendar)}</strong>
                      <span className="text-xs text-muted-foreground">{isEn ? `${differenceInCalendarDays(nextPeriod, today)} days from today` : `${toPersianDigits(differenceInCalendarDays(nextPeriod, today))} روز تا امروز`}</span>
                    </div>
                  ) : <p className="mt-2 text-sm text-muted-foreground">{T("برای ساخت این برآورد، شروع پریود را ثبت کن.", "Log a period start to create this estimate.")}</p>}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{T("پنجرهٔ باروری تخمینی", "Estimated fertile window")}</h3>
                  {fertileWindow && <Badge variant="outline" className="border-emerald-300 text-emerald-800 dark:text-emerald-200">{T("۶ روز تخمینی", "6 estimated days")}</Badge>}
                </div>
                {fertileWindow ? (
                  <>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(fertileWindow.start, isEn ? "MMM d" : "d MMMM", calendar)} – {formatDate(fertileWindow.end, isEn ? "MMM d" : "d MMMM", calendar)}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                      {fertileDays.map((day, index) => (
                        <div key={day.toISOString()} className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-1.5 py-2 text-center dark:border-emerald-900 dark:bg-emerald-950/30">
                          <span className="block text-[10px] text-muted-foreground">{isEn ? `Day ${index + 1}` : `روز ${toPersianDigits(index + 1)}`}</span>
                          <strong className="mt-0.5 block text-xs">{formatDate(day, isEn ? "MMM d" : "d MMM", calendar)}</strong>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <p className="mt-2 text-sm text-muted-foreground">{T("با ثبت شروع پریود، این بازهٔ تقویمی نمایش داده می‌شود.", "Log a period start to see this calendar estimate.")}</p>}
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{T("این فقط برآورد تقویمی و دارای عدم‌قطعیت است؛ برای پیشگیری از بارداری به آن تکیه نکنید.", "This is an uncertain calendar-only estimate; do not rely on it for contraception.")}</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="space-y-5 p-4 md:p-6">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary"><NotebookPen className="h-4 w-4" /></div>
              <div>
                <h2 className="font-semibold">{T("ثبت وضعیت امروز", "Today's check-in")}</h2>
                <p className="text-xs text-muted-foreground">{T("برای پروفایل", "For")} {active.label}</p>
              </div>
            </div>

            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs">{isEn ? `Flow · ${flow}/4` : `شدت خونریزی · ${toPersianDigits(flow)}/۴`}</Label>
                <Slider aria-label={T("شدت خونریزی", "Flow intensity")} value={[flow]} min={0} max={4} step={1} onValueChange={([value]) => setFlow(value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{isEn ? `Pain · ${pain}/10` : `درد · ${toPersianDigits(pain)}/۱۰`}</Label>
                <Slider aria-label={T("درد", "Pain")} value={[pain]} min={0} max={10} step={1} onValueChange={([value]) => setPain(value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{isEn ? `Mood · ${mood}/10` : `خلق · ${toPersianDigits(mood)}/۱۰`}</Label>
                <Slider aria-label={T("خلق", "Mood")} value={[mood]} min={0} max={10} step={1} onValueChange={([value]) => setMood(value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{isEn ? `Energy · ${energy}/10` : `انرژی · ${toPersianDigits(energy)}/۱۰`}</Label>
                <Slider aria-label={T("انرژی", "Energy")} value={[energy]} min={0} max={10} step={1} onValueChange={([value]) => setEnergy(value)} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{T("علائم", "Symptoms")}</Label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOM_OPTIONS.map((symptom) => {
                  const selected = symptoms.includes(symptom);
                  return (
                    <button key={symptom} type="button" aria-pressed={selected} onClick={() => toggleSymptom(symptom)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50 hover:bg-primary/5"}`}>
                      {getSymptomLabel(symptom, isEn)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cycle-notes" className="text-xs">{T("یادداشت", "Notes")}</Label>
              <Input id="cycle-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={T("هر چیزی که می‌خواهی به خاطر بسپاری…", "Anything you want to remember…")} />
            </div>
            <Button onClick={() => void saveTodayLog()} className="w-full">{T("ذخیرهٔ ثبت امروز", "Save today's check-in")}</Button>
          </Card>

          <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
            <Card className="space-y-4 p-4 md:p-5">
              <div>
                <h2 className="font-semibold">{T("تنظیمات پروفایل", "Profile settings")}</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{T("طول‌های معمول خودت را تنظیم کن؛ این اعداد برآورد را تغییر می‌دهند.", "Set your usual lengths; these values affect estimates.")}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {([
                  ["avg_cycle_length", T("طول چرخه", "Cycle length"), T("روز", "days"), 20, 45],
                  ["avg_period_length", T("طول پریود", "Period length"), T("روز", "days"), 2, 10],
                  ["luteal_length", T("فاز لوتئال", "Luteal phase"), T("روز", "days"), 10, 16],
                ] as const).map(([field, label, unit, min, max]) => (
                  <div key={field} className="space-y-1.5">
                    <Label htmlFor={`cycle-${field}`} className="text-xs">{label}</Label>
                    <div className="relative">
                      <Input id={`cycle-${field}`} type="number" inputMode="numeric" min={min} max={max} step={1}
                        value={profileDraft[field]} onChange={(event) => setProfileDraft((current) => ({ ...current, [field]: event.target.value }))}
                        onBlur={() => void commitProfileNumber(field)} className="pe-12" />
                      <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-[10px] text-muted-foreground">{unit}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{isEn ? `${min}–${max}` : `${toPersianDigits(min)} تا ${toPersianDigits(max)}`}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2.5">
                <Label htmlFor="cycle-profile-color" className="text-sm">{T("رنگ پروفایل", "Profile color")}</Label>
                <input id="cycle-profile-color" type="color" value={active.color || DEFAULT_CYCLE_PROFILE.color}
                  onChange={(event) => void updateProfile({ color: event.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-md border bg-background p-1" />
              </div>
              <Button variant="destructive" size="sm" onClick={() => void deleteProfile()} className="gap-1.5">
                <Trash2 className="h-4 w-4" /> {T("حذف پروفایل و ثبت‌های آن", "Delete profile and its logs")}
              </Button>
            </Card>

            <Card className="space-y-3 p-4 md:p-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{T("ثبت‌های اخیر", "Recent logs")}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">{T("۳۰ ثبت اخیر برای این پروفایل", "Latest 30 entries for this profile")}</p>
                </div>
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
              </div>
              {logs.length > 0 ? (
                <div className="max-h-72 space-y-1 overflow-y-auto pe-1">
                  {logs.slice(0, 30).map((log) => (
                    <div key={log.id} className="flex items-center justify-between gap-3 border-b py-2.5 last:border-0">
                      <span className="text-sm">{formatDate(new Date(`${log.log_date}T00:00:00`), "d MMM yyyy", calendar)}</span>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {log.event === "period_start" && <Badge variant="outline" className="border-rose-300 text-rose-700 dark:text-rose-200">{T("شروع پریود", "Period start")}</Badge>}
                        {log.flow != null && log.flow > 0 && <span>{T("شدت", "Flow")} {isEn ? log.flow : toPersianDigits(log.flow)}{isEn ? "/4" : "/۴"}</span>}
                        {log.pain != null && log.pain > 0 && <span>{T("درد", "Pain")} {isEn ? log.pain : toPersianDigits(log.pain)}{isEn ? "/10" : "/۱۰"}</span>}
                        {log.symptoms?.length ? <span>{isEn ? `${log.symptoms.length} symptoms` : `${toPersianDigits(log.symptoms.length)} علامت`}</span> : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">{T("هنوز ثبتی برای این پروفایل وجود ندارد. ثبت روزانه یا شروع پریود را اضافه کن.", "No entries for this profile yet. Add a daily check-in or log a period start.")}</div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
