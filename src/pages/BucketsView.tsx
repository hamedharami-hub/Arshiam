import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  ALL_BUCKET_KINDS,
  SUB_DAY_BUCKET_KINDS,
  MULTI_DAY_BUCKET_KINDS,
  type BucketKind,
  getEnabledBuckets,
  currentAnchor,
  bucketLabel,
  kindLabel,
  isSubDayBucket,
  doesTaskMatchBucketScope,
  getBucketFilterSettings,
  saveBucketFilterSettings,
} from "@/lib/timeBuckets";
import { getCalendarSystem, setCalendarSystem, type CalendarSystem } from "@/lib/jalali";
import {
  Clock,
  CalendarRange,
  ListTodo,
  Sun,
  Sparkles,
  Layers,
  Filter,
  Sunrise,
  Sunset,
  Moon,
  CalendarDays,
  Calendar,
  Layers2,
  CheckCircle2,
} from "lucide-react";
import { haptic } from "@/lib/haptics";
import { useBilingual } from "@/hooks/useBilingual";
import { persistTask } from "@/lib/firestoreDataService";
import { toast } from "sonner";
import type { Task } from "@/lib/taskTypes";

const KIND_ICONS: Record<BucketKind, any> = {
  morning: Sunrise,
  noon: Sun,
  afternoon: Sunset,
  night: Moon,
  day: CalendarDays,
  week: CalendarRange,
  month: Calendar,
  quarter: Sparkles,
  year: Calendar,
};

export default function BucketsView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { T, isEn, lang } = useBilingual();
  const [params, setParams] = useSearchParams();

  // Persistent settings
  const [settings, setSettings] = useState(() => getBucketFilterSettings());
  const [calendar, setCalendar] = useState<CalendarSystem>(getCalendarSystem());

  const enabled = getEnabledBuckets();

  // Determine active category and kind from URL params or persistent settings
  const paramKind = params.get("kind") as BucketKind | null;
  const initialCategory = paramKind
    ? isSubDayBucket(paramKind)
      ? "sub_day"
      : "multi_day"
    : settings.activeCategory;

  const [category, setCategory] = useState<"multi_day" | "sub_day">(initialCategory);

  const initialKind: BucketKind =
    paramKind && ALL_BUCKET_KINDS.includes(paramKind)
      ? paramKind
      : category === "sub_day"
      ? "morning"
      : "week";

  const [kind, setKind] = useState<BucketKind>(initialKind);
  const [rawTasks, setRawTasks] = useState<Task[] | null>(null);

  const anchor = currentAnchor(kind, calendar);

  // Sync URL query param ?kind=...
  useEffect(() => {
    setParams(
      (p) => {
        p.set("kind", kind);
        return p;
      },
      { replace: true }
    );
  }, [kind, setParams]);

  // Update persistent category when category changes
  const handleCategoryChange = (newCat: "multi_day" | "sub_day") => {
    haptic("light");
    setCategory(newCat);
    const fallbackKind: BucketKind = newCat === "sub_day" ? "morning" : "week";
    setKind(fallbackKind);
    const updated = saveBucketFilterSettings({ activeCategory: newCat });
    setSettings(updated);
  };

  // Toggle hierarchical inclusion setting (persisted)
  const handleToggleHierarchical = (checked: boolean) => {
    haptic("light");
    const updated = saveBucketFilterSettings({ hierarchical: checked });
    setSettings(updated);
  };

  // Toggle strict kind filter in multi-filter mode
  const handleToggleStrictKind = (k: BucketKind) => {
    haptic("light");
    const exists = settings.strictKinds.includes(k);
    const nextStrict = exists
      ? settings.strictKinds.filter((item) => item !== k)
      : [...settings.strictKinds, k];

    const updated = saveBucketFilterSettings({ strictKinds: nextStrict });
    setSettings(updated);
  };

  // Clear strict filters
  const handleClearStrictFilters = () => {
    haptic("light");
    const updated = saveBucketFilterSettings({ strictKinds: [] });
    setSettings(updated);
  };

  // Load all user tasks
  const loadTasks = async () => {
    if (!user) return;
    try {
      const { data, error } = await firebaseStore
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", false)
        .order("priority", { ascending: true })
        .limit(1000);

      if (!error && data) {
        setRawTasks(data as Task[]);
      } else {
        setRawTasks([]);
      }
    } catch {
      setRawTasks([]);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [user]);

  // Toggle calendar system
  const toggleCal = () => {
    haptic("light");
    const next = calendar === "jalali" ? "gregorian" : "jalali";
    setCalendarSystem(next);
    setCalendar(next);
  };

  // Handle task complete toggle
  const handleToggleTask = async (task: Task) => {
    haptic("medium");
    if (!user) return;
    const nextCompleted = !task.completed;

    setRawTasks((prev) =>
      prev ? prev.filter((t) => t.id !== task.id) : []
    );

    await persistTask(user.id, { id: task.id, completed: nextCompleted });
    toast.success(
      nextCompleted
        ? T("تسک با موفقیت تکمیل شد", "Task completed")
        : T("تسک به حالت انجام‌نشده بازگشت", "Task reopened")
    );
  };

  // Filter tasks based on the user's bucket and inclusion preferences
  const matchedTasks = useMemo(() => {
    if (!rawTasks) return null;

    return rawTasks
      .map((t) => {
        const matchResult = doesTaskMatchBucketScope(t, {
          scopeKind: kind,
          calendar,
          anchor,
          hierarchical: settings.hierarchical,
          selectedBucketKinds: settings.strictKinds,
        });
        return { task: t, matchResult };
      })
      .filter((item) => item.matchResult.matches);
  }, [rawTasks, kind, calendar, anchor, settings.hierarchical, settings.strictKinds]);

  const activeKindsList =
    category === "sub_day"
      ? SUB_DAY_BUCKET_KINDS.filter((k) => enabled.includes(k))
      : MULTI_DAY_BUCKET_KINDS.filter((k) => enabled.includes(k));

  const CurrentKindIcon = KIND_ICONS[kind] || CalendarRange;

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="max-w-3xl mx-auto p-4 md:p-8 space-y-5 pb-24 page-enter font-sans"
    >
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-card border border-border shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black flex items-center gap-2 text-foreground">
            <CalendarRange className="w-6 h-6 text-primary" />
            <span>{T("دسته‌بندی و بازه‌های زمانی (Buckets)", "Time Buckets")}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {T(
              "برنامه‌ریزی بر اساس افق‌های زمانی و بازه‌های درون‌روزی در کنار تسک‌های دقیق",
              "Plan by fuzzy temporal horizons and sub-day tags alongside exact-dated tasks"
            )}
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={toggleCal}
          className="text-xs gap-1.5 self-start sm:self-auto rounded-xl"
        >
          <Sun className="w-3.5 h-3.5 text-amber-500" />
          <span>{calendar === "jalali" ? T("گاه‌شمار شمسی", "Jalali") : T("گاه‌شمار میلادی", "Gregorian")}</span>
        </Button>
      </header>

      {/* Primary Category Switcher: Over 1 Day vs Under 1 Day */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-muted/50 border border-border text-xs sm:text-sm">
        <button
          type="button"
          onClick={() => handleCategoryChange("multi_day")}
          className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            category === "multi_day"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarRange className="w-4 h-4" />
          <span>{T("دوره‌های زمانی بالای یک روز", "Multi-day Horizons (> 1 Day)")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleCategoryChange("sub_day")}
          className={`py-2 px-3 rounded-xl font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            category === "sub_day"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{T("دوره‌های زمانی زیر یک روز", "Sub-day Windows (< 1 Day)")}</span>
        </button>
      </div>

      {/* Bucket Kinds Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {activeKindsList.map((k) => {
          const Icon = KIND_ICONS[k] || CalendarRange;
          const isActive = kind === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                haptic("light");
                setKind(k);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                isActive
                  ? "bg-primary/15 border-primary/30 text-primary font-bold shadow-2xs"
                  : "bg-card border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/40"
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{kindLabel(k, lang)}</span>
            </button>
          );
        })}
      </div>

      {/* Filter Mode & Inclusion Settings Card */}
      <div className="p-3.5 rounded-2xl bg-card border border-border shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Layers2 className="w-4 h-4 text-primary" />
              <span>{T("شمول سلسله‌مراتبی و تسک‌های زمان‌دار", "Hierarchical Inclusion & Exact Tasks")}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {settings.hierarchical
                ? T(
                    "تسک‌های دارای تاریخ دقیق + بازه‌های خردترِ زیرمجموعه در کنار هم نمایش داده می‌شوند.",
                    "Exact-dated tasks + nested smaller buckets appear together in this view."
                  )
                : T(
                    "فقط تسک‌هایی که صریحاً این باکت را دارند نمایش داده می‌شوند (فیلتر اختصاصی).",
                    "Only tasks explicitly tagged with this bucket are displayed (Strict Filter)."
                  )}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Label htmlFor="hierarchical-switch" className="text-xs font-medium cursor-pointer">
              {settings.hierarchical ? T("روشن", "Active") : T("خاموش", "Strict")}
            </Label>
            <Switch
              id="hierarchical-switch"
              checked={settings.hierarchical}
              onCheckedChange={handleToggleHierarchical}
            />
          </div>
        </div>

        {/* Multi-filter Chips if Strict Filter is Active */}
        {!settings.hierarchical && (
          <div className="pt-2 border-t border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                {T("فیلترهای اختصاصی باکت‌ها (چندانتخابی):", "Strict Bucket Filters (Multi-select):")}
              </span>
              {settings.strictKinds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearStrictFilters}
                  className="text-[11px] text-primary hover:underline cursor-pointer"
                >
                  {T("پاک‌کردن فیلترها", "Clear Filters")}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {ALL_BUCKET_KINDS.map((k) => {
                const isSelected = settings.strictKinds.includes(k);
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => handleToggleStrictKind(k)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {kindLabel(k, lang)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Main Task List Card */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm md:text-base flex items-center gap-2 font-bold text-foreground">
              <CurrentKindIcon className="w-4 h-4 text-primary" />
              <span>{bucketLabel(kind, calendar, anchor, lang)}</span>
            </CardTitle>

            <span className="text-xs px-2.5 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground font-semibold">
              {matchedTasks ? T(`${matchedTasks.length} تسک`, `${matchedTasks.length} tasks`) : "..."}
            </span>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {matchedTasks === null ? (
            <div className="space-y-2.5">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </div>
          ) : matchedTasks.length === 0 ? (
            <div className="text-center py-10 px-4 border border-dashed rounded-2xl bg-muted/10 space-y-2">
              <p className="text-xs text-muted-foreground">
                {T(
                  "هیچ تسکی در این بازهٔ زمانی وجود ندارد. می‌توانید از داخل صفحهٔ تسک‌ها بازهٔ زمانی را مشخص کنید.",
                  "No tasks found for this time bucket. You can assign a time bucket inside any task."
                )}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate("/app/tasks")}
                className="text-xs rounded-xl"
              >
                {T("مشاهده همهٔ تسک‌ها", "Go to Tasks")}
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {matchedTasks.map(({ task: t, matchResult }) => {
                const isSub = t.bucket_kind ? isSubDayBucket(t.bucket_kind) : false;

                return (
                  <li
                    key={t.id}
                    className="group flex items-center gap-3 p-3 rounded-2xl border border-border/70 hover:border-primary/40 bg-card hover:bg-accent/20 transition shadow-2xs"
                  >
                    <Checkbox
                      checked={t.completed}
                      onCheckedChange={() => handleToggleTask(t)}
                      className="rounded-md transition-transform duration-200 active:scale-75 data-[state=checked]:scale-110"
                    />

                    <div
                      onClick={() => {
                        haptic("light");
                        navigate(`/app/tasks/${t.id}`);
                      }}
                      className="flex-1 min-w-0 cursor-pointer text-start space-y-1"
                    >
                      <div className="text-sm font-semibold text-foreground break-words line-clamp-2 group-hover:text-primary transition">
                        {t.title}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-[10px]">
                        {/* Match Reason & Badges */}
                        {matchResult.matchReason === "exact_due_date" && t.due_date && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium border border-primary/20">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{T("زمان دقیق", "Exact Date")}</span>
                          </span>
                        )}

                        {matchResult.matchReason === "direct_bucket" && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium border ${
                              isSub
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25"
                                : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25"
                            }`}
                          >
                            <CalendarRange className="w-2.5 h-2.5" />
                            <span>{kindLabel(t.bucket_kind as BucketKind, lang)}</span>
                          </span>
                        )}

                        {matchResult.matchReason === "nested_bucket" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 font-medium">
                            <Layers className="w-2.5 h-2.5" />
                            <span>
                              {T(
                                `زیرمجموعه: ${kindLabel(t.bucket_kind as BucketKind, lang)}`,
                                `Nested: ${kindLabel(t.bucket_kind as BucketKind, lang)}`
                              )}
                            </span>
                          </span>
                        )}

                        {/* Priority Badge */}
                        {t.priority && t.priority !== "medium" && (
                          <span className="text-muted-foreground opacity-80 font-medium">
                            {t.priority === "urgent"
                              ? T("فوری", "Urgent")
                              : t.priority === "high"
                              ? T("مهم", "High")
                              : T("کم", "Low")}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
