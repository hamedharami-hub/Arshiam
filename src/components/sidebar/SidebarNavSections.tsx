import React from "react";
import {
  Inbox, Calendar as CalIcon, CalendarDays, Filter, Tag, FileText,
  Target, Timer, Calendar, ChevronDown, Sparkles, LayoutGrid,
  TrendingUp, Activity, MessageCircleQuestion, Zap, ShieldAlert, BookOpen, Sun,
  ListTodo, BrainCircuit, GripVertical, User, Shield,
  BarChart3, Sprout, Wind, Compass, Users,
} from "lucide-react";
import {
  SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { NavLink } from "@/components/NavLink";
import { useTranslation } from "react-i18next";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Bilingual label maps. SECTIONS uses the Persian label as the canonical key.
export const EN_LABELS: Record<string, string> = {
  "انجام دادن": "Do",
  "رشد": "Grow",
  "ذهن": "Mind",
  "خودِ من": "Me",
  "امروز": "Today",
  "فردا": "Tomorrow",
  "۷ روز آینده": "Next 7 Days",
  "تقویم": "Calendar",
  "اهداف": "Goals",
  "عادت‌ها": "Habits",
  "نوت‌ها": "Notes",
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
  "چت سقراطی": "Socratic Chat",
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
  "سیکل پریود": "Period Cycle",
  "تمرین تنفس ۳بعدی": "3D Breathing",
  "معمار زندگی": "Life Architect",
  "صندوق ورودی": "Inbox",
  "ویجت‌ها": "Widgets",
  "باغ رشد": "Garden",
  "افراد": "Contacts",
  "کتابخانه دانش": "Knowledge Base",
};

export const FA_LABELS: Record<string, string> = {
  "Inbox": "صندوق ورودی",
  "Pomodoro": "پومودورو",
  "Smart Lists": "لیست‌های هوشمند",
  "Contacts": "افراد",
  "Knowledge Base": "کتابخانه دانش",
  "Review (SR)": "مرور (SR)",
};

export function useLabel() {
  const { i18n } = useTranslation();
  const isEn = Boolean(i18n.language?.startsWith("en"));
  return (label: string) => {
    if (isEn) return EN_LABELS[label] || label;
    return FA_LABELS[label] || label;
  };
}

export type NavItem = { url: string; icon: any; label: string };
export type Section = { id: string; title: string; icon: any; defaultOpen: boolean; items: NavItem[] };

export const SECTIONS: Section[] = [
  {
    id: "do", title: "انجام دادن", icon: ListTodo, defaultOpen: true,
    items: [
      { url: "/app/today", icon: CalIcon, label: "امروز" },
      { url: "/app/inbox", icon: Inbox, label: "صندوق ورودی" },
      { url: "/app/tomorrow", icon: Sun, label: "فردا" },
      { url: "/app/next7", icon: CalendarDays, label: "۷ روز آینده" },
      { url: "/app/calendar", icon: Calendar, label: "تقویم" },
      { url: "/app/contacts", icon: Users, label: "افراد" },
      { url: "/app/widgets", icon: LayoutGrid, label: "ویجت‌ها" },
      { url: "/app/buckets", icon: CalendarDays, label: "بازه‌های کلی" },
      { url: "/app/smart", icon: Filter, label: "Smart Lists" },
      { url: "/app/pomodoro", icon: Timer, label: "Pomodoro" },
      { url: "/app/stats", icon: BarChart3, label: "آمار و خلاصه" },
    ],
  },
  {
    id: "grow", title: "رشد", icon: TrendingUp, defaultOpen: false,
    items: [
      { url: "/app/life-architect", icon: Compass, label: "معمار زندگی" },
      { url: "/app/garden", icon: Sprout, label: "باغ رشد" },
      { url: "/app/habits", icon: Target, label: "عادت‌ها" },
      { url: "/app/notes", icon: FileText, label: "نوت‌ها" },
      { url: "/app/knowledge", icon: BookOpen, label: "کتابخانه دانش" },
      { url: "/app/review", icon: BrainCircuit, label: "مرور (SR)" },
      { url: "/app/cycle", icon: Calendar, label: "سیکل پریود" },
    ],
  },
  {
    id: "mind", title: "ذهن", icon: BrainCircuit, defaultOpen: false,
    items: [
      { url: "/app/mind", icon: BrainCircuit, label: "داشبورد ذهن" },
      { url: "/app/checkin", icon: Activity, label: "چک‌این روزانه" },
      { url: "/app/thoughts", icon: BookOpen, label: "ثبت افکار (CBT)" },
      { url: "/app/abc", icon: Zap, label: "مدل ABC" },
      { url: "/app/socratic", icon: MessageCircleQuestion, label: "چت سقراطی" },
      { url: "/app/breathing", icon: Wind, label: "تمرین تنفس ۳بعدی" },
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

export const NAV_ITEMS = SECTIONS.flatMap((section) => section.items);

export const DEFAULT_ORDER = ["__folders", "__tags", "do", "grow", "mind", "me"];
export const ORDER_KEY = "sidebar_order_v1";

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
  const SectionIcon = section.icon;
  const items =
    section.id === "me" && isAdmin
      ? [...section.items, { url: "/app/admin", icon: Shield, label: "پنل مدیریت" }]
      : section.items;

  if (collapsed) {
    return (
      <SidebarGroup key={section.id} className="p-0.5">
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  tooltip={tr(item.label)}
                  className="justify-center h-9 w-9 mx-auto rounded-xl"
                >
                  <NavLink
                    to={item.url}
                    onClick={closeOnMobile}
                    className="flex items-center justify-center w-full h-full"
                    activeClassName="bg-accent text-accent-foreground font-bold"
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="sr-only">{tr(item.label)}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <SidebarGroup>
      <Collapsible open={isOpen || collapsed} onOpenChange={onToggle}>
        {!collapsed && (
          <SidebarGroupLabel className="flex items-center justify-between pe-1 group">
            {dragHandle && (
              <button
                {...dragHandle}
                className="cursor-grab active:cursor-grabbing p-0.5 opacity-30 hover:opacity-80 transition"
                title={tr("جابجا کن")}
              >
                <GripVertical className="w-3 h-3" />
              </button>
            )}
            <CollapsibleTrigger className="flex items-center gap-2 flex-1 hover:bg-sidebar-accent/50 rounded transition">
              <SectionIcon className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{tr(section.title)}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 me-auto text-muted-foreground transition-transform ${
                  isOpen ? "" : "-rotate-90"
                }`}
              />
            </CollapsibleTrigger>
          </SidebarGroupLabel>
        )}
        <CollapsibleContent forceMount={collapsed ? true : undefined}>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      onClick={closeOnMobile}
                      className="flex items-center gap-2"
                      activeClassName="bg-accent text-accent-foreground font-medium"
                    >
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{tr(item.label)}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </Collapsible>
    </SidebarGroup>
  );
}
