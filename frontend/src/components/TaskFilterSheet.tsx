import { useEffect, useState, type ReactNode } from "react";
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
  ListFilter,
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
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
  const { T, isEn } = useBilingual();
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
              aria-pressed={active}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                active
                  ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                  : "bg-card border-border hover:bg-muted text-foreground"
              }`}
            >
              {isEn ? SORT_LABELS[k]?.en || k : SORT_LABELS[k]?.fa || k}
            </button>
          );
        })}
        <div className="flex border rounded-lg overflow-hidden ms-auto bg-card">
          <button
            type="button"
            onClick={() => onChange({ ...value, dir: "asc" })}
            aria-pressed={value.dir === "asc"}
            className={`px-2 py-1 transition-colors ${
              value.dir === "asc"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            aria-label={T("صعودی", "Ascending")}
            title={T("صعودی", "Ascending")}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChange({ ...value, dir: "desc" })}
            aria-pressed={value.dir === "desc"}
            className={`px-2 py-1 transition-colors ${
              value.dir === "desc"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted"
            }`}
            aria-label={T("نزولی", "Descending")}
            title={T("نزولی", "Descending")}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  value,
  title,
  icon,
  count = 0,
  onClear,
  clearLabel,
  children,
}: {
  value: string;
  title: string;
  icon?: ReactNode;
  count?: number;
  onClear?: () => void;
  clearLabel?: string;
  children: ReactNode;
}) {
  const { T } = useBilingual();
  return (
    <AccordionItem value={value} className="overflow-hidden rounded-xl border border-border/70 bg-card">
      <AccordionTrigger className="gap-3 px-3 py-3 text-start text-xs font-semibold hover:no-underline [&>svg]:h-4 [&>svg]:w-4">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          {icon}
          <span className="truncate">{title}</span>
        </span>
        {count > 0 && (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-[10px] text-secondary-foreground">
            {count}
          </span>
        )}
      </AccordionTrigger>
      <AccordionContent className="px-3">
        <div className="space-y-2 pb-3">
          {count > 0 && onClear && (
            <div className="flex justify-end">
              <button type="button" onClick={onClear} className="min-h-8 px-2 text-[11px] text-muted-foreground hover:text-primary">
                {clearLabel || T("پاک کردن انتخاب‌ها", "Clear selections")}
              </button>
            </div>
          )}
          {children}
        </div>
      </AccordionContent>
    </AccordionItem>
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
  const { T, isEn } = useBilingual();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = controlledOnOpenChange || setInternalOpen;

  const [folders, setFolders] = useState<{ id: string; name: string; color?: string; emoji?: string | null }[]>([]);
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
      .select("id,name,color,emoji")
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
    toast.success(isEn ? `Smart list "${name}" saved` : `لیست هوشمند «${name}» ذخیره شد`);
  };

  const deleteProfile = (id: string, name: string) => {
    const next = profiles.filter((p) => p.id !== id);
    setProfiles(next);
    toast.info(isEn ? `Profile "${name}" deleted` : `پروفایل «${name}» حذف شد`);
  };

  const isProfileActive = (profile: SmartListProfile) => {
    const sameSet = (a?: string[], b?: string[]) => {
      const left = [...(a || [])].sort();
      const right = [...(b || [])].sort();
      return left.length === right.length && left.every((value, index) => value === right[index]);
    };
    const profileFilters = profile.filters || DEFAULT_FILTERS;
    return (
      sameSet(profileFilters.folder_ids, filters.folder_ids) &&
      sameSet(profileFilters.tag_ids, filters.tag_ids) &&
      sameSet(profileFilters.goal_ids, filters.goal_ids) &&
      sameSet(profileFilters.priorities, filters.priorities) &&
      sameSet(profileFilters.time_horizons, filters.time_horizons) &&
      sameSet(profileFilters.due_windows, filters.due_windows) &&
      profileFilters.show_completed === filters.show_completed &&
      JSON.stringify(profileFilters.sort_primary || DEFAULT_FILTERS.sort_primary) === JSON.stringify(primary) &&
      JSON.stringify(profileFilters.sort_secondary || DEFAULT_FILTERS.sort_secondary) === JSON.stringify(secondary)
    );
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
            title={T("فیلتر و لیست هوشمند", "Filter & smart list")}
            aria-label={T("فیلتر و لیست هوشمند", "Filter & smart list")}
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

      <SheetContent dir={isEn ? "ltr" : "rtl"} className="w-full sm:max-w-lg overflow-y-auto space-y-5 p-4 sm:p-6">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>{T("تنظیمات و فیلترهای لیست هوشمند", "Smart list settings & filters")}</span>
          </SheetTitle>
        </SheetHeader>

        {/* 1. Saved Profiles / Smart Lists */}
        <section className="space-y-2.5 p-3 rounded-xl bg-muted/40 border border-border/60">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
              <ListFilter className="h-4 w-4 shrink-0 text-primary" />
              {T("لیست‌های هوشمند ذخیره‌شده", "Saved smart lists")}
            </span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {T("کلیک برای بارگذاری سریع", "Click to load quickly")}
            </span>
          </div>

          <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto py-0.5 sm:grid-cols-2" role="list" aria-label={T("فهرست‌های ذخیره‌شده", "Saved lists")}>
            {profiles.map((p) => {
              const displayName = p.icon && p.name.startsWith(p.icon) ? p.name.slice(p.icon.length).trim() : p.name;
              const active = isProfileActive(p);
              return (
                <div
                  key={p.id || p.name}
                  role="listitem"
                  className={`flex min-w-0 items-center gap-1 rounded-lg border px-2 py-1.5 transition-colors shadow-2xs ${active ? "border-primary bg-primary/10" : "border-border/80 bg-card hover:border-primary/50"}`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(p.filters);
                      toast.success(isEn ? `List "${p.name}" applied` : `لیست «${p.name}» اعمال شد`);
                    }}
                    aria-pressed={active}
                    className="flex min-h-8 min-w-0 flex-1 items-center gap-2 text-start text-xs font-medium hover:text-primary"
                  >
                    <span className="shrink-0">{p.icon || "📋"}</span>
                    <span className="min-w-0 flex-1 truncate">{displayName}</span>
                    {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                  </button>
                  {!p.isPreset && (
                    <button
                      type="button"
                      onClick={() => deleteProfile(p.id, p.name)}
                      className="rounded p-1 text-muted-foreground transition hover:text-destructive"
                      aria-label={T("حذف پروفایل", "Delete profile")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-1">
            <Input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder={T("نام لیست هوشمند جدید...", "New smart list name...")}
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
              <span>{T("ذخیره این فیلتر", "Save this filter")}</span>
            </Button>
          </div>
        </section>

        <Accordion type="multiple" className="space-y-2">
        {/* 2. Folders (One or multiple) */}
        <FilterGroup
          value="folders"
          title={T("فولدرها", "Folders")}
          icon={<FolderIcon className="h-4 w-4 shrink-0 text-primary" />}
          count={filters.folder_ids?.length || 0}
          onClear={() => onChange({ ...filters, folder_ids: [] })}
        >
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => toggle("folder_ids", "__none__")}
              aria-pressed={filters.folder_ids?.includes("__none__") || false}
              className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                filters.folder_ids?.includes("__none__")
                  ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                  : "bg-card border-border hover:bg-muted text-foreground"
              }`}
            >
              {T("📥 بدون فولدر (اینباکس)", "📥 No folder (Inbox)")}
            </button>
            {folders.map((f) => {
              const active = filters.folder_ids?.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggle("folder_ids", f.id)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                      : "bg-card border-border hover:bg-muted text-foreground"
                  }`}
                >
                  {f.emoji ? <span className="text-sm leading-none">{f.emoji}</span> : <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: f.color || "#e11d48" }} />}
                  <span>{f.name}</span>
                </button>
              );
            })}
          </div>
        </FilterGroup>

        {/* 3. Goals (One or multiple) */}
        {goals.length > 0 && (
          <FilterGroup
            value="goals"
            title={T("هدف‌ها", "Goals")}
            icon={<Target className="h-4 w-4 shrink-0 text-rose-500" />}
            count={filters.goal_ids?.length || 0}
            onClear={() => onChange({ ...filters, goal_ids: [] })}
          >
            <div className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto py-0.5">
              <button
                type="button"
                onClick={() => toggle("goal_ids", "__all_goals__")}
                aria-pressed={filters.goal_ids?.includes("__all_goals__") || false}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                  filters.goal_ids?.includes("__all_goals__")
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-card border-border hover:bg-muted text-foreground"
                }`}
              >
                {T("🎯 تمام کارهای دارای هدف", "🎯 All tasks with a goal")}
              </button>
              <button
                type="button"
                onClick={() => toggle("goal_ids", "__none__")}
                aria-pressed={filters.goal_ids?.includes("__none__") || false}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                  filters.goal_ids?.includes("__none__")
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-card border-border hover:bg-muted text-foreground"
                }`}
              >
                {T("⚪ بدون هدف", "⚪ No goal")}
              </button>
              {goals.map((g) => {
                const active = filters.goal_ids?.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => toggle("goal_ids", g.id)}
                    aria-pressed={active}
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
          </FilterGroup>
        )}

        {/* 4. Tags (One or multiple) */}
        {tags.length > 0 && (
          <FilterGroup
            value="tags"
            title={T("برچسب‌ها", "Tags")}
            icon={<TagIcon className="h-4 w-4 shrink-0 text-amber-500" />}
            count={filters.tag_ids?.length || 0}
            onClear={() => onChange({ ...filters, tag_ids: [] })}
          >
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto py-0.5">
              <button
                type="button"
                onClick={() => toggle("tag_ids", "__none__")}
                aria-pressed={filters.tag_ids?.includes("__none__") || false}
                className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                  filters.tag_ids?.includes("__none__")
                    ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                    : "bg-card border-border hover:bg-muted text-foreground"
                }`}
              >
                {T("⚪ بدون تگ", "⚪ No tag")}
              </button>
              {tags.map((t) => {
                const active = filters.tag_ids?.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggle("tag_ids", t.id)}
                    aria-pressed={active}
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
          </FilterGroup>
        )}

        {/* 5. Time Buckets & Horizons */}
        <FilterGroup
          value="horizons"
          title={T("بازهٔ برنامه‌ریزی", "Planning horizon")}
          icon={<Calendar className="h-4 w-4 shrink-0 text-blue-500" />}
          count={filters.time_horizons?.length || 0}
          onClear={() => onChange({ ...filters, time_horizons: [] })}
        >
          <div className="flex flex-wrap gap-1.5">
            {TIME_HORIZON_OPTIONS.map((opt) => {
              const active = filters.time_horizons?.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle("time_horizons", opt.id)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                      : "bg-card border-border hover:bg-muted text-foreground"
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{isEn ? opt.en : opt.fa}</span>
                </button>
              );
            })}
          </div>
        </FilterGroup>

        {/* 6. Due Date Windows */}
        <FilterGroup
          value="due-windows"
          title={T("محدودهٔ تاریخ", "Date range")}
          icon={<Clock className="h-4 w-4 shrink-0 text-indigo-500" />}
          count={filters.due_windows?.length || 0}
          onClear={() => onChange({ ...filters, due_windows: [] })}
        >
          <div className="flex flex-wrap gap-1.5">
            {DUE_WINDOW_OPTIONS.map((opt) => {
              const active = filters.due_windows?.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => toggle("due_windows", opt.id)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                      : "bg-card border-border hover:bg-muted text-foreground"
                  }`}
                >
                  <span>{opt.icon}</span>
                  <span>{isEn ? opt.en : opt.fa}</span>
                </button>
              );
            })}
          </div>
        </FilterGroup>

        {/* 7. Priorities */}
        <FilterGroup
          value="priorities"
          title={T("اهمیت و فوریت", "Priority and urgency")}
          icon={<Sparkles className="h-4 w-4 shrink-0 text-amber-500" />}
          count={filters.priorities?.length || 0}
          onClear={() => onChange({ ...filters, priorities: [] })}
        >
          <div className="flex flex-wrap gap-1.5">
            {[
              ["urgent", "🔥 فوری (Urgent)", "🔥 Urgent"],
              ["high", "🔴 بالا (High)", "🔴 High"],
              ["medium", "🟡 متوسط (Medium)", "🟡 Medium"],
              ["low", "🔵 پایین (Low)", "🔵 Low"],
              ["none", "⚪ بدون اولویت (None)", "⚪ No priority"],
            ].map(([v, fa, en]) => {
              const active = filters.priorities?.includes(v);
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => toggle("priorities", v)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
                    active
                      ? "bg-primary text-primary-foreground border-primary font-semibold shadow-xs"
                      : "bg-card border-border hover:bg-muted text-foreground"
                  }`}
                >
                  {isEn ? en : fa}
                </button>
              );
            })}
          </div>
        </FilterGroup>

        {/* 8. Two-Level Sort */}
        <FilterGroup
          value="sorting"
          title={T("ترتیب نمایش", "Sort order")}
          icon={<ListFilter className="h-4 w-4 shrink-0 text-primary" />}
          count={sortChanged ? 1 : 0}
        >
          <div className="space-y-3 rounded-xl bg-muted/30 p-2">
          <SortLevelPicker
            label={T("اولویت اول مرتب‌سازی", "Primary sort")}
            value={primary}
            onChange={(v) => onChange({ ...filters, sort_primary: v })}
            excludeKey={secondary.key}
          />
          <SortLevelPicker
            label={T("اولویت دوم (در صورت تساوی اولویت اول)", "Secondary sort (when the primary ties)")}
            value={secondary}
            onChange={(v) => onChange({ ...filters, sort_secondary: v })}
            excludeKey={primary.key}
          />
          </div>
        </FilterGroup>

        {/* 9. Show Completed Tasks */}
        <FilterGroup
          value="completed"
          title={T("کارهای انجام‌شده", "Completed tasks")}
          icon={<Check className="h-4 w-4 shrink-0 text-emerald-500" />}
          count={filters.show_completed ? 0 : 1}
        >
          <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-2.5">
          <span className="text-xs font-medium text-foreground">{T("نمایش کارهای تکمیل‌شده", "Show completed tasks")}</span>
          <button
            type="button"
            onClick={() => onChange({ ...filters, show_completed: !filters.show_completed })}
            aria-pressed={filters.show_completed}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium border transition-all ${
              filters.show_completed
                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {filters.show_completed ? T("نمایش روشن", "Shown") : T("مخفی (فقط باز)", "Hidden (open only)")}
          </button>
          </div>
        </FilterGroup>
        </Accordion>

        {/* Actions Footer */}
        <div className="sticky bottom-0 z-10 -mx-4 flex gap-2 border-t bg-background/95 px-4 py-2 backdrop-blur-sm sm:-mx-6 sm:px-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="flex-1 gap-1 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{T("ریست به پیش‌فرض", "Reset to default")}</span>
          </Button>
          <Button size="sm" onClick={() => setOpen(false)} className="flex-1 text-xs">
            {T("اعمال تنظیمات", "Apply settings")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
