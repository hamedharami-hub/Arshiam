import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Filter,
  Save,
  Trash2,
  ArrowUp,
  ArrowDown,
  Folder as FolderIcon,
  Tag as TagIcon,
  Target,
  Clock,
  Calendar,
  Sparkles,
  Check,
  RotateCcw,
} from "lucide-react";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getAllKanbanGoals, type GoalKanban } from "@/lib/kanbanGoals";
import {
  type SortKey,
  type SortDir,
  type SortLevel,
  type TaskFilters,
  DEFAULT_FILTERS,
  PROFILES_KEY,
  type SmartListProfile,
  useSmartListProfiles,
  SORT_KEYS,
  SORT_LABELS,
  TIME_HORIZON_OPTIONS,
  DUE_WINDOW_OPTIONS,
} from "@/lib/smartListService";

export type { SortKey, SortDir, SortLevel, TaskFilters, SmartListProfile };
export { DEFAULT_FILTERS, PROFILES_KEY };

function SortLevelPicker({
  label,
  value,
  onChange,
  excludeKey,
}: {
  label: string;
  value: SortLevel;
  onChange: (v: SortLevel) => void;
  excludeKey?: SortKey;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs text-muted-foreground font-medium">{label}</div>
      <div className="flex flex-wrap gap-1.5 items-center">
        {SORT_KEYS.filter((k) => k !== excludeKey).map((k) => {
          const active = value.key === k;
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange({ ...value, key: k })}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                active
                  ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                  : "bg-card border-border hover:bg-muted text-foreground"
              }`}
            >
              {SORT_LABELS[k]?.fa || k}
            </button>
          );
        })}
        <div className="flex border rounded-lg overflow-hidden ms-auto bg-card">
          <button
            type="button"
            onClick={() => onChange({ ...value, dir: "asc" })}
            className={`px-2 py-1 transition-colors ${
              value.dir === "asc"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            aria-label="صعودی"
            title="صعودی"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, dir: "desc" })}
            className={`px-2 py-1 transition-colors ${
              value.dir === "desc"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            aria-label="نزولی"
            title="نزولی"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function TaskFilterSheet({
  filters,
  onChange,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: {
  filters: TaskFilters;
  onChange: (f: TaskFilters) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}) {
  const { user } = useAuth();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const [folders, setFolders] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [tags, setTags] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [goals, setGoals] = useState<GoalKanban[]>([]);
  const [profiles, setProfiles] = useSmartListProfiles();
  const [profileName, setProfileName] = useState("");

  // Ensure default structures are safe
  useEffect(() => {
    if (
      !filters.sort_primary ||
      !filters.sort_secondary ||
      !filters.goal_ids ||
      !filters.time_horizons ||
      !filters.due_windows
    ) {
      onChange({
        ...DEFAULT_FILTERS,
        ...filters,
        goal_ids: filters.goal_ids || [],
        time_horizons: filters.time_horizons || [],
        due_windows: filters.due_windows || [],
        sort_primary: filters.sort_primary || DEFAULT_FILTERS.sort_primary,
        sort_secondary: filters.sort_secondary || DEFAULT_FILTERS.sort_secondary,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    firebaseStore
      .from("folders")
      .select("id,name,color")
      .order("position")
      .then(({ data }) => {
        const loadedFolders = (data || []) as any[];
        setFolders(loadedFolders);
        setGoals(getAllKanbanGoals(loadedFolders, user.id));
      });
    firebaseStore
      .from("tags")
      .select("id,name,color")
      .then(({ data }) => {
        setTags((data || []) as any);
      });
  }, [user]);

  const toggle = <K extends keyof TaskFilters>(key: K, value: string) => {
    const arr = (filters[key] as unknown as string[]) || [];
    const next = arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value];
    onChange({ ...filters, [key]: next } as TaskFilters);
  };

  const primary = filters.sort_primary || DEFAULT_FILTERS.sort_primary;
  const secondary = filters.sort_secondary || DEFAULT_FILTERS.sort_secondary;

  const sortChanged =
    primary.key !== DEFAULT_FILTERS.sort_primary.key ||
    primary.dir !== DEFAULT_FILTERS.sort_primary.dir ||
    secondary.key !== DEFAULT_FILTERS.sort_secondary.key ||
    secondary.dir !== DEFAULT_FILTERS.sort_secondary.dir;

  const activeCount =
    (filters.folder_ids?.length || 0) +
    (filters.tag_ids?.length || 0) +
    (filters.priorities?.length || 0) +
    (filters.goal_ids?.length || 0) +
    (filters.time_horizons?.length || 0) +
    (filters.due_windows?.length || 0) +
    (!filters.show_completed ? 1 : 0) +
    (sortChanged ? 1 : 0);

  const saveCurrentAsProfile = () => {
    const name = profileName.trim();
    if (!name) return;
    const newProfile: SmartListProfile = {
      id: `profile-${Date.now()}`,
      name,
      icon: "📋",
      filters: { ...filters },
      isPreset: false,
    };
    const next = [...profiles.filter((p) => p.name !== name), newProfile];
    setProfiles(next);
    setProfileName("");
    toast.success(`لیست هوشمند «${name}» ذخیره شد`);
  };

  const deleteProfile = (id: string, name: string) => {
    const next = profiles.filter((p) => p.id !== id);
    setProfiles(next);
    toast.info(`پروفایل «${name}» حذف شد`);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {trigger ? (
        <SheetTrigger asChild>{trigger}</SheetTrigger>
      ) : (
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 rounded-md relative text-muted-foreground"
            data-testid="tasks-toggle-filter"
            title="فیلتر و لیست هوشمند"
            aria-label="فیلتر و لیست هوشمند"
          >
            <Filter className="w-4 h-4" />
            {activeCount > 0 && (
              <Badge
                variant="secondary"
                className="absolute -top-1 -end-1 h-4 min-w-4 px-1 text-[9px] leading-none flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold"
              >
                {activeCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
      )}

      <SheetContent dir="rtl" className="w-full sm:max-w-lg overflow-y-auto space-y-5 p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>تنظیمات و فیلترهای لیست هوشمند</span>
          </SheetTitle>
        </SheetHeader>

        {/* 1. Saved Profiles / Smart Lists */}
        <section className="space-y-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">
              لیست‌های هوشمند ذخیره‌شده
            </span>
            <span className="text-[10px] text-muted-foreground">
              کلیک برای بارگذاری سریع
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto py-0.5">
            {profiles.map((p) => (
              <div
                key={p.id || p.name}
                className="flex items-center gap-1 border border-border/80 rounded-lg px-2 py-1 bg-card hover:border-primary/50 transition-colors shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => {
                    onChange(p.filters);
                    toast.success(`لیست «${p.name}» اعمال شد`);
                  }}
                  className="text-xs font-medium hover:text-primary flex items-center gap-1.5"
                >
                  <span>{p.icon || "📋"}</span>
                  <span>{p.name}</span>
                </button>
                {!p.isPreset && (
                  <button
                    type="button"
                    onClick={() => deleteProfile(p.id, p.name)}
                    className="p-1 text-muted-foreground hover:text-destructive rounded transition"
                    aria-label="حذف پروفایل"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <Input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="نام لیست هوشمند جدید..."
              className="h-8 text-xs bg-background"
            />
            <Button
              size="sm"
              variant="secondary"
              disabled={!profileName.trim()}
              onClick={saveCurrentAsProfile}
              className="h-8 gap-1 shrink-0 text-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>ذخیره این فیلتر</span>
            </Button>
          </div>
        </section>

        {/* 2. Folders (One or multiple) */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <FolderIcon className="w-3.5 h-3.5 text-primary" />
              <span>فولدرها (یک یا چند فولدر)</span>
            </span>
            {(filters.folder_ids?.length || 0) > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, folder_ids: [] })}
                className="text-[11px] text-muted-foreground hover:text-primary transition"
              >
                پاک کردن انتخاب‌ها
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => toggle("folder_ids", "__none__")}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                filters.folder_ids?.includes("__none__")
                  ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                  : "bg-card border-border hover:bg-muted text-foreground"
              }`}
            >
              📥 بدون فولدر (اینباکس)
            </button>
            {folders.map((f) => {
              const active = filters.folder_ids?.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggle("folder_ids", f.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                      : "bg-card border-border hover:bg-muted text-foreground"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: f.color || "#e11d48" }}
                  />
                  <span>{f.name}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 3. Goals (One or multiple) */}
        {goals.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Target className="w-3.5 h-3.5 text-rose-500" />
                <span>اهداف کانبان (یک یا چند هدف)</span>
              </span>
              {(filters.goal_ids?.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, goal_ids: [] })}
                  className="text-[11px] text-muted-foreground hover:text-primary transition"
                >
                  پاک کردن انتخاب‌ها
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto py-0.5">
              <button
                type="button"
                onClick={() => toggle("goal_ids", "__all_goals__")}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                  filters.goal_ids?.includes("__all_goals__")
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-card border-border hover:bg-muted text-foreground"
                }`}
              >
                🎯 تمام کارهای دارای هدف
              </button>
              <button
                type="button"
                onClick={() => toggle("goal_ids", "__none__")}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                  filters.goal_ids?.includes("__none__")
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-card border-border hover:bg-muted text-foreground"
                }`}
              >
                ⚪ بدون هدف
              </button>
              {goals.map((g) => {
                const active = filters.goal_ids?.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggle("goal_ids", g.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                        : "bg-card border-border hover:bg-muted text-foreground"
                    }`}
                  >
                    <span>{g.icon || "🎯"}</span>
                    <span className="truncate max-w-[140px]">{g.title}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. Tags (One or multiple) */}
        {tags.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <TagIcon className="w-3.5 h-3.5 text-amber-500" />
                <span>تگ‌ها (یک یا چند تگ)</span>
              </span>
              {(filters.tag_ids?.length || 0) > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, tag_ids: [] })}
                  className="text-[11px] text-muted-foreground hover:text-primary transition"
                >
                  پاک کردن انتخاب‌ها
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto py-0.5">
              <button
                type="button"
                onClick={() => toggle("tag_ids", "__none__")}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                  filters.tag_ids?.includes("__none__")
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-card border-border hover:bg-muted text-foreground"
                }`}
              >
                ⚪ بدون تگ
              </button>
              {tags.map((t) => {
                const active = filters.tag_ids?.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle("tag_ids", t.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-all ${
                      active
                        ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                        : "bg-card border-border hover:bg-muted text-foreground"
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: t.color || "#f59e0b" }}
                    />
                    <span>#{t.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* 5. Time Buckets & Horizons */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <Calendar className="w-3.5 h-3.5 text-blue-500" />
              <span>بازه‌های زمانی و تایم‌باکت‌ها (Time Buckets)</span>
            </span>
            {(filters.time_horizons?.length || 0) > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, time_horizons: [] })}
                className="text-[11px] text-muted-foreground hover:text-primary transition"
              >
                پاک کردن
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TIME_HORIZON_OPTIONS.map((opt) => {
              const active = filters.time_horizons?.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle("time_horizons", opt.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                      : "bg-card border-border hover:bg-muted text-foreground"
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.fa}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 6. Due Date Windows */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>محدودهٔ تاریخ (Date windows)</span>
            </span>
            {(filters.due_windows?.length || 0) > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, due_windows: [] })}
                className="text-[11px] text-muted-foreground hover:text-primary transition"
              >
                پاک کردن
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {DUE_WINDOW_OPTIONS.map((opt) => {
              const active = filters.due_windows?.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle("due_windows", opt.id)}
                  className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                      : "bg-card border-border hover:bg-muted text-foreground"
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{opt.fa}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 7. Priorities */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-foreground">فیلتر اولویت و فوریت</span>
            {(filters.priorities?.length || 0) > 0 && (
              <button
                type="button"
                onClick={() => onChange({ ...filters, priorities: [] })}
                className="text-[11px] text-muted-foreground hover:text-primary transition"
              >
                پاک کردن
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              ["urgent", "🔥 فوری (Urgent)"],
              ["high", "🔴 بالا (High)"],
              ["medium", "🟡 متوسط (Medium)"],
              ["low", "🔵 پایین (Low)"],
              ["none", "⚪ بدون اولویت (None)"],
            ].map(([v, l]) => {
              const active = filters.priorities?.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggle("priorities", v)}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                      : "bg-card border-border hover:bg-muted text-foreground"
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </section>

        {/* 8. Two-Level Sort */}
        <section className="space-y-3 border border-border/70 rounded-xl p-3 bg-muted/30">
          <div className="text-xs font-semibold text-foreground">
            مرتب‌سازی دوگانه هوشمند (Sort Levels)
          </div>
          <SortLevelPicker
            label="اولویت اول مرتب‌سازی"
            value={primary}
            onChange={(v) => onChange({ ...filters, sort_primary: v })}
            excludeKey={secondary.key}
          />
          <SortLevelPicker
            label="اولویت دوم (در صورت تساوی اولویت اول)"
            value={secondary}
            onChange={(v) => onChange({ ...filters, sort_secondary: v })}
            excludeKey={primary.key}
          />
        </section>

        {/* 9. Show Completed Tasks */}
        <section className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border/60">
          <span className="text-xs font-medium text-foreground">نمایش تسک‌های تکمیل‌شده</span>
          <button
            type="button"
            onClick={() => onChange({ ...filters, show_completed: !filters.show_completed })}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-all ${
              filters.show_completed
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {filters.show_completed ? "نمایش روشن" : "مخفی (فقط باز)"}
          </button>
        </section>

        {/* Actions Footer */}
        <div className="flex gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="flex-1 gap-1 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>ریست به پیش‌فرض</span>
          </Button>
          <Button size="sm" onClick={() => setOpen(false)} className="flex-1 text-xs">
            اعمال تنظیمات
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
