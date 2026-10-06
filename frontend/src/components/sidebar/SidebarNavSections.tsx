import React, { createContext, useContext, useEffect, useState } from "react";
import { isPathAllowed, useModules, type ModulesState } from "@/lib/appModules";
import {
  Moon, Inbox, Calendar as CalIcon, CalendarDays, Filter, Tag, FileText,
  Target, Timer, Calendar, ChevronDown, Sparkles, LayoutGrid,
  TrendingUp, Activity, Heart, HeartPulse, ShieldAlert, BookOpen, Sun,
  ListTodo, BrainCircuit, GripVertical, User, Shield,
  BarChart3, Sprout, Wind, Compass, Users, Gamepad2, Columns3, Hourglass, PlayCircle,
} from "lucide-react";
import { toPersianDigits } from "@/lib/persianDigits";
import {
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { isAndroid } from "@/lib/nativeExperience";

// Bilingual label maps. SECTIONS uses the Persian label as the canonical key.
export const EN_LABELS: Record<string, string> = {
  "انجام دادن": "Do",
  "انجام": "Do",
  "کانبان": "Kanban",
  "لیست‌های هوشمند": "Smart Lists",
  "رشد": "Grow",
  "ذهن": "Mind",
  "خواب و آرامش": "Sleep & Relaxation",
  "خودِ من": "Me",
  "امروز": "Today",
  "فردا": "Tomorrow",
  "۷ روز آینده": "Next 7 Days",
  "تقویم": "Calendar",
  "اهداف": "Goals",
  "عادت‌ها": "Habits",
  "نوت‌ها": "Notes",
  "خاطرات روزانه": "Daily Diary",
  "مرور (SR)": "Review (SR)",
  "خودشناسی": "Self-Knowledge",
  "داشبورد ذهن": "Mind Dashboard",
  "بینش هفتگی": "Weekly Insights",
  "بازنگری هفتگی": "Weekly Review",
  "Check-in روزانه": "Daily Check-in",
  "چک‌این روزانه": "Daily Check-in",
  "ژورنال تصمیم": "Decision Journal",
  "ثبت افکار (CBT)": "Thought Records (CBT)",
  "مدل ABC": "ABC Model",
  "بررسی فکر": "Think it through",
  "حال امروز": "Today's mood",
  "آرام‌شدن": "Calm down",
  "ارزش‌ها و اهداف": "Values & Goals",
  "سلامت": "Health",
  "درباره من": "About Me",
  "تنظیمات": "Settings",
  "پنل مدیریت": "Admin Panel",
  "جابجا کن": "Drag",
  "فولدرها": "Folders",
  "تگ‌ها": "Tags",
  "اشتراک‌ها": "Shared with me",
  "Pomodoro": "Pomodoro",
  "Smart Lists": "Smart Lists",
  "آمار و خلاصه": "Stats & Summary",
  "بازه‌های کلی": "Time Buckets",
  "برنامه‌ریزی": "Planning",
  "سیکل پریود": "Period Cycle",
  "تمرین تنفس ۳بعدی": "3D Breathing",
  "معمار زندگی": "Life Architect",
  "صندوق ورودی": "Inbox",
  "ویجت‌ها": "Widgets",
  "باغ رشد": "Garden",
  "افراد": "Contacts",
  "کتابخانه دانش": "Knowledge Base",
  "استودیوی مطالعه تعاملی": "Interactive Study Studio",
  "ادامهٔ یادگیری": "Continue learning",
  "پشتیبانی بحران (SOS)": "Crisis support (SOS)",
  "فهرست محصولات دارویی": "Pharmacy Products",
  "تمرین سناریوهای دارویی": "Pharmacy Scenario Practice",
  "تمرین نسخه FRED": "FRED Practice",
  "ماتریس CYP و تداخل": "CYP Matrix & Interactions",
  "دانش": "Knowledge",
  "فارماسی": "Pharmacy",
  "مرور": "Review",
  "باز کردن": "Expand",
  "جمع کردن": "Collapse",
};

export const FA_LABELS: Record<string, string> = {
  "Inbox": "صندوق ورودی",
  "Pomodoro": "پومودورو",
  "Smart Lists": "لیست‌های هوشمند",
  "Contacts": "افراد",
  "Knowledge Base": "کتابخانه دانش",
  "Review (SR)": "مرور (SR)",
  "Pharmacy Products": "فهرست محصولات دارویی",
  "Pharmacy Scenario Practice": "تمرین سناریوهای دارویی",
  "FRED Practice": "تمرین نسخه FRED",
  "CYP Matrix & Interactions": "ماتریس CYP و تداخل",
};

export function useLabel() {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  return (label: string) => {
    if (isEn) return EN_LABELS[label] || label;
    return FA_LABELS[label] || label;
  };
}

export type NavItem = { url?: string; icon: any; label: string; children?: NavItem[] };
export type Section = { id: string; title: string; icon: any; defaultOpen: boolean; items: NavItem[] };

export const SECTIONS: Section[] = [
  {
    id: "do", title: "انجام", icon: ListTodo, defaultOpen: false,
    items: [
      { url: "/app/tomorrow", icon: Sun, label: "فردا" },
      { url: "/app/next7", icon: CalendarDays, label: "۷ روز آینده" },
      { url: "/app/diary", icon: BookOpen, label: "خاطرات روزانه" },
      { url: "/app/contacts", icon: Users, label: "افراد" },
      { url: "/app/widgets", icon: LayoutGrid, label: "ویجت‌ها" },
      { url: "/app/kanban", icon: Columns3, label: "کانبان" },
      { url: "/app/pomodoro", icon: Timer, label: "Pomodoro" },
      { url: "/app/stats", icon: BarChart3, label: "آمار و خلاصه" },
    ],
  },
  {
    id: "grow", title: "رشد", icon: TrendingUp, defaultOpen: false,
    items: [
      { url: "/app/values", icon: Heart, label: "ارزش‌ها و اهداف" },
      { url: "/app/life-architect", icon: Compass, label: "معمار زندگی" },
      { url: "/app/garden", icon: Sprout, label: "باغ رشد" },
      { url: "/app/notes", icon: FileText, label: "نوت‌ها" },
      {
        icon: BookOpen,
        label: "دانش",
        children: [
          { url: "/app/knowledge", icon: BookOpen, label: "کتابخانه دانش" },
          { url: "/app/interactive-study", icon: Gamepad2, label: "استودیوی مطالعه تعاملی" },
          { url: "/app/continue", icon: PlayCircle, label: "ادامهٔ یادگیری" },
        ],
      },
    ],
  },
  {
    id: "health", title: "سلامت", icon: HeartPulse, defaultOpen: false,
    items: [
      { url: "/app/cycle", icon: Calendar, label: "سیکل پریود" },
    ],
  },
  {
    id: "mind", title: "ذهن", icon: BrainCircuit, defaultOpen: false,
    items: [
      { url: "/app/mind", icon: BrainCircuit, label: "داشبورد ذهن" },
      { url: "/app/checkin", icon: Activity, label: "حال امروز" },
      { url: "/app/thoughts", icon: BookOpen, label: "بررسی فکر" },
      { url: "/app/calm", icon: Wind, label: "آرام‌شدن" },
      { url: "/app/crisis", icon: ShieldAlert, label: "پشتیبانی بحران (SOS)" },
    ],
  },
  {
    id: "me", title: "خودِ من", icon: User, defaultOpen: false,
    items: [
      { url: "/app/about-me", icon: User, label: "درباره من" },
      { url: "/app/self", icon: Sparkles, label: "خودشناسی" },
    ],
  },
];

// Always-visible top navigation (TickTick order), rendered above folders.
export const PRIMARY_ITEMS: NavItem[] = [
  { url: "/app/today", icon: CalIcon, label: "امروز" },
  { url: "/app/inbox", icon: Inbox, label: "صندوق ورودی" },
  { url: "/app/calendar", icon: Calendar, label: "تقویم" },
  { url: "/app/planning", icon: Hourglass, label: "برنامه‌ریزی" },
];
export const SMART_ITEM: NavItem = { url: "/app/smart", icon: Filter, label: "Smart Lists" };

// Task counts keyed by route (e.g. "/app/today") or "folder:<id>".
export const SidebarCountsContext = createContext<Record<string, number>>({});

export function NavCount({ countKey }: { countKey?: string }) {
  const counts = useContext(SidebarCountsContext);
  const n = countKey ? counts[countKey] : 0;
  if (!n) return null;
  return <span className="ms-auto shrink-0 ps-2 text-[11px] tabular-nums text-muted-foreground">{toPersianDigits(n)}</span>;
}

function filterNavByModules(items: NavItem[], modules: ModulesState): NavItem[] {
  return items.flatMap((item) => {
    if (item.url) return isPathAllowed(item.url, modules) ? [item] : [];
    const children = filterNavByModules(item.children || [], modules);
    return children.length ? [{ ...item, children }] : [];
  });
}

function flattenNavigableItems(items: NavItem[]): NavItem[] {
  return items.flatMap((item) => [
    ...(item.url ? [item] : []),
    ...flattenNavigableItems(item.children || []),
  ]);
}

export const NAV_ITEMS = [...PRIMARY_ITEMS, SMART_ITEM, ...SECTIONS.flatMap((section) => flattenNavigableItems(section.items))];

function getFirstNavUrl(item: NavItem): string | undefined {
  if (item.url) return item.url;
  for (const child of item.children || []) {
    const childUrl = getFirstNavUrl(child);
    if (childUrl) return childUrl;
  }
  return undefined;
}

function isNavItemActive(item: NavItem, pathname: string): boolean {
  const matchesPath = item.url && (pathname === item.url || pathname.startsWith(`${item.url}/`));
  return Boolean(matchesPath || item.children?.some((child) => isNavItemActive(child, pathname)));
}

interface SidebarNavTreeItemProps {
  item: NavItem;
  collapsed: boolean;
  tr: (label: string) => string;
  closeOnMobile: () => void;
}

export const NAV_ITEM_CLASS = "h-10 rounded-md px-2 text-start text-[13px] font-normal text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent/70 [&_svg]:text-muted-foreground";
export const NAV_ITEM_ACTIVE_CLASS = "bg-sidebar-accent text-foreground font-medium [&_svg]:text-primary";
export const SECTION_HEADER_CLASS = "group/section flex h-10 items-center justify-between gap-1 rounded-md px-0.5 text-muted-foreground";
export const SECTION_TRIGGER_CLASS = "flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground";
export const SECTION_ICON_WRAP_CLASS = "grid h-4 w-4 shrink-0 place-items-center text-muted-foreground";
export const SECTION_CHEVRON_CLASS = "h-3.5 w-3.5 shrink-0 text-muted-foreground";

export function SidebarNavTreeItem({ item, collapsed, tr, closeOnMobile }: SidebarNavTreeItemProps) {
  const location = useLocation();
  const children = item.children || [];
  const hasChildren = children.length > 0;
  const activeBranch = isNavItemActive(item, location.pathname);
  const [isOpen, setIsOpen] = useState(activeBranch);

  useEffect(() => {
    if (activeBranch) setIsOpen(true);
  }, [activeBranch]);

  if (collapsed) {
    const targetUrl = getFirstNavUrl(item);
    if (!targetUrl) return null;
    const Icon = item.icon;
    return (
      <SidebarMenuItem key={item.label}>
        <SidebarMenuButton asChild tooltip={tr(item.label)} className="justify-center h-9 w-9 mx-auto rounded-xl">
          <NavLink
            to={targetUrl}
            onClick={closeOnMobile}
            className="flex items-center justify-center w-full h-full"
            activeClassName="bg-accent text-accent-foreground font-bold"
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="sr-only">{tr(item.label)}</span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  if (!hasChildren) {
    if (!item.url) return null;
    const Icon = item.icon;
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild className={NAV_ITEM_CLASS}>
          <NavLink
            to={item.url}
            title={tr(item.label)}
            onClick={closeOnMobile}
            className={`flex items-center gap-2.5 ${activeBranch ? NAV_ITEM_ACTIVE_CLASS : ""}`}
            activeClassName={NAV_ITEM_ACTIVE_CLASS}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-start">{tr(item.label)}</span>
            <NavCount countKey={item.url} />
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const Icon = item.icon;
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem key={item.url || item.label}>
        <div className="relative flex w-full items-center">
          {item.url ? (
            <SidebarMenuButton asChild className={NAV_ITEM_CLASS}>
              <NavLink
                to={item.url}
                title={tr(item.label)}
                onClick={closeOnMobile}
                className={`flex items-center gap-2.5 pe-8 ${activeBranch ? NAV_ITEM_ACTIVE_CLASS : ""}`}
                activeClassName={NAV_ITEM_ACTIVE_CLASS}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-start">{tr(item.label)}</span>
              </NavLink>
            </SidebarMenuButton>
          ) : (
            <CollapsibleTrigger asChild>
              <SidebarMenuButton
                type="button"
                aria-expanded={isOpen}
                className={`${NAV_ITEM_CLASS} flex items-center gap-2.5 pe-8 ${activeBranch ? NAV_ITEM_ACTIVE_CLASS : ""}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-start">{tr(item.label)}</span>
              </SidebarMenuButton>
            </CollapsibleTrigger>
          )}
          {item.url && (
            <CollapsibleTrigger asChild>
              <button
                type="button"
                aria-label={tr(isOpen ? "جمع کردن" : "باز کردن") + " " + tr(item.label)}
                title={tr(isOpen ? "جمع کردن" : "باز کردن")}
                className="absolute end-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              </button>
            </CollapsibleTrigger>
          )}
        </div>
        <CollapsibleContent>
          <SidebarMenu className="min-w-0 max-w-full ps-4">
            {children.map((child) => (
              <SidebarNavTreeItem key={child.url || child.label} item={child} collapsed={false} tr={tr} closeOnMobile={closeOnMobile} />
            ))}
          </SidebarMenu>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export const DEFAULT_ORDER = ["__folders", "__tags", "__smart", "do", "grow", "mind", "me"];
export const ORDER_KEY = "sidebar_order_v2";

export function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(ORDER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const merged = [...parsed.filter((x) => DEFAULT_ORDER.includes(x))];
        DEFAULT_ORDER.forEach((id) => { if (!merged.includes(id)) merged.push(id); });
        return merged;
      }
    }
  } catch { void 0; }
  return DEFAULT_ORDER;
}

export function resetSidebarOrder() {
  try { localStorage.removeItem(ORDER_KEY); } catch { void 0; }
}

export function SortableBlock({ id, children }: { id: string; children: (handleProps: any) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {children(listeners)}
    </div>
  );
}

export interface SidebarSectionCollapsibleProps {
  section: Section;
  dragHandle: any;
  collapsed: boolean;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  isAdmin: boolean;
  tr: (label: string) => string;
  closeOnMobile: () => void;
}

export function SidebarSectionCollapsible({
  section,
  dragHandle,
  collapsed,
  isOpen,
  onToggle,
  isAdmin,
  tr,
  closeOnMobile,
}: SidebarSectionCollapsibleProps) {
  const sectionItems =
    section.id === "me" && isAdmin
      ? [...section.items, { url: "/app/admin", icon: Shield, label: "پنل مدیریت" }]
      : section.items;
  const modules = useModules();
  const items = filterNavByModules(sectionItems.filter((item) => item.url !== "/app/widgets" || isAndroid()), modules);
  if (items.length === 0) return null;

  if (collapsed) {
    return (
      <SidebarGroup key={section.id} className="p-0.5">
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarNavTreeItem key={item.url || item.label} item={item} collapsed tr={tr} closeOnMobile={closeOnMobile} />
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup className="py-0.5">
      <Collapsible open={isOpen || collapsed} onOpenChange={onToggle}>
        {!collapsed && (
          <SidebarGroupLabel className={SECTION_HEADER_CLASS} data-testid={`sidebar-section-${section.id}`}>
            {dragHandle && (
              <button
                {...dragHandle}
                className="cursor-grab active:cursor-grabbing grid h-8 w-8 shrink-0 place-items-center rounded-md opacity-40 hover:opacity-100 group-hover/section:opacity-100 transition touch-none"
                title={tr("جابجا کن")}
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
            )}
            <CollapsibleTrigger className={SECTION_TRIGGER_CLASS}>
              <span className="min-w-0 flex-1 truncate text-start">{tr(section.title)}</span>
              <ChevronDown className={`${SECTION_CHEVRON_CLASS} ${isOpen ? "" : "-rotate-90"}`} />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
        )}
        <CollapsibleContent forceMount={collapsed ? true : undefined}>
          <SidebarGroupContent>
            <SidebarMenu className="gap-px">
              {items.map((item) => (
                <SidebarNavTreeItem key={item.url || item.label} item={item} collapsed={false} tr={tr} closeOnMobile={closeOnMobile} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
