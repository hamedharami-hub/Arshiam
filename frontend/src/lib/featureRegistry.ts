import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Blocks,
  BookOpen,
  BrainCircuit,
  Calendar,
  CalendarDays,
  CloudRain,
  Compass,
  DraftingCompass,
  Droplet,
  FilePlus,
  FileText,
  Filter,
  Gamepad2,
  HeartHandshake,
  Hourglass,
  Inbox,
  Layers,
  LayoutGrid,
  Library,
  ListPlus,
  Moon,
  Network,
  NotebookPen,
  PenLine,
  PlayCircle,
  Puzzle,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  Sparkles,
  Sprout,
  Sun,
  Timer,
  TrendingUp,
  User,
  Users,
  Wind,
} from "lucide-react";
import { isPathAllowed, type ModuleId, type ModulesState } from "./appModules";

/**
 * Single source of truth for every navigable `/app/*` feature.
 *
 * The command palette (and any future index/search surface) is generated from
 * this registry instead of a hand-maintained list, so a feature can never be
 * silently missing from global search. Only real, navigable destinations belong
 * here — redirect-only legacy aliases (`/app/habits`, `/app/abc`, `/app/kanban`,
 * …) and id-parameterised detail routes (`/app/tasks/:id`, `/app/self/test/:type`,
 * …) are intentionally excluded.
 */

export type FeatureCenter =
  | "today"
  | "library"
  | "self-care"
  | "goals-life"
  | "insights-tools"
  | "connections"
  | "account";

export type FeatureEntry = {
  /** Canonical, directly navigable route. */
  to: string;
  /** Persian display name. */
  nameFa: string;
  /** English display name. */
  nameEn: string;
  /** Persian search synonyms (space-separated). */
  keywordsFa: string;
  /** English search synonyms (space-separated). */
  keywordsEn: string;
  /** Logical grouping used to organise the feature index. */
  center: FeatureCenter;
  /** Lucide icon component. */
  icon: LucideIcon;
  /** Optional app-module owner, mirroring the allowlist consumed by `isPathAllowed`. */
  moduleKey?: ModuleId;
  /** Display order (ascending). */
  order: number;
};

/** Center metadata, in display order. */
export const FEATURE_CENTERS: { id: FeatureCenter; labelFa: string; labelEn: string }[] = [
  { id: "today", labelFa: "امروز و برنامه‌ریزی", labelEn: "Today & Planning" },
  { id: "library", labelFa: "کتابخانه و یادگیری", labelEn: "Library & Learning" },
  { id: "self-care", labelFa: "ذهن و خودمراقبتی", labelEn: "Mind & Self-care" },
  { id: "goals-life", labelFa: "اهداف و رشد", labelEn: "Goals & Growth" },
  { id: "insights-tools", labelFa: "بینش و ابزارها", labelEn: "Insights & Tools" },
  { id: "connections", labelFa: "ارتباط‌ها", labelEn: "Connections" },
  { id: "account", labelFa: "حساب و تنظیمات", labelEn: "Account & Settings" },
];

export const FEATURES: FeatureEntry[] = [
  // ── Today & Planning ──────────────────────────────────────────────────────
  {
    to: "/app/today",
    nameFa: "امروز",
    nameEn: "Today",
    keywordsFa: "امروز کارهای امروز داشبورد عادت عادت‌ها",
    keywordsEn: "today dashboard habits habit",
    center: "today",
    icon: CalendarDays,
    order: 10,
  },
  {
    to: "/app/inbox",
    nameFa: "اینباکس",
    nameEn: "Inbox",
    keywordsFa: "اینباکس ورودی صندوق ورودی",
    keywordsEn: "inbox capture",
    center: "today",
    icon: Inbox,
    order: 20,
  },
  {
    to: "/app/tomorrow",
    nameFa: "فردا",
    nameEn: "Tomorrow",
    keywordsFa: "فردا",
    keywordsEn: "tomorrow",
    center: "today",
    icon: Sun,
    order: 30,
  },
  {
    to: "/app/next7",
    nameFa: "هفت روز آینده",
    nameEn: "Next 7 Days",
    keywordsFa: "هفت روز آینده هفته",
    keywordsEn: "next 7 days week upcoming",
    center: "today",
    icon: CalendarDays,
    order: 40,
  },
  {
    to: "/app/smart",
    nameFa: "لیست‌های هوشمند",
    nameEn: "Smart Lists",
    keywordsFa: "لیست هوشمند فیلتر",
    keywordsEn: "smart lists filter",
    center: "today",
    icon: Filter,
    order: 50,
  },
  {
    to: "/app/calendar",
    nameFa: "تقویم",
    nameEn: "Calendar",
    keywordsFa: "تقویم برنامه",
    keywordsEn: "calendar schedule",
    center: "today",
    icon: Calendar,
    order: 60,
  },
  {
    to: "/app/planning",
    nameFa: "برنامه‌ریزی",
    nameEn: "Planning",
    keywordsFa: "برنامه‌ریزی برنامه روز هفته ماه",
    keywordsEn: "planning plan day week month",
    center: "today",
    icon: Hourglass,
    order: 70,
  },
  {
    to: "/app/pomodoro",
    nameFa: "پومودورو",
    nameEn: "Pomodoro",
    keywordsFa: "پومودورو تمرکز زمان‌سنج",
    keywordsEn: "pomodoro focus timer",
    center: "today",
    icon: Timer,
    order: 80,
  },

  // ── Library & Learning ────────────────────────────────────────────────────
  {
    to: "/app/notes",
    nameFa: "نوت‌ها",
    nameEn: "Notes",
    keywordsFa: "نوت یادداشت‌ها یادداشت",
    keywordsEn: "notes note",
    center: "library",
    icon: FileText,
    order: 110,
  },
  {
    to: "/app/diary",
    nameFa: "دفتر روزانه",
    nameEn: "Daily Diary",
    keywordsFa: "دفتر روزانه دفتر خاطرات خاطرات روزانه ژورنال",
    keywordsEn: "diary journal daily log",
    center: "library",
    icon: BookOpen,
    order: 120,
  },
  {
    to: "/app/knowledge",
    nameFa: "کتابخانه دانش",
    nameEn: "Knowledge Base",
    keywordsFa: "کتابخانه دانش مطالعه یادگیری",
    keywordsEn: "knowledge base study learn library",
    center: "library",
    icon: Library,
    moduleKey: "study",
    order: 130,
  },
  {
    to: "/app/knowledge-mindmap",
    nameFa: "نقشه ذهنی دانش",
    nameEn: "Knowledge Mind Map",
    keywordsFa: "نقشه ذهنی دانش نقشه مایندمپ",
    keywordsEn: "knowledge mind map mindmap graph",
    center: "library",
    icon: Network,
    moduleKey: "study",
    order: 140,
  },
  {
    to: "/app/interactive-study",
    nameFa: "استودیوی مطالعه تعاملی",
    nameEn: "Interactive Study Studio",
    keywordsFa: "استودیوی مطالعه تعاملی مطالعه تمرین",
    keywordsEn: "interactive study studio learning",
    center: "library",
    icon: Gamepad2,
    moduleKey: "study",
    order: 150,
  },
  {
    to: "/app/continue",
    nameFa: "ادامهٔ یادگیری",
    nameEn: "Continue Learning",
    keywordsFa: "ادامه یادگیری ادامهٔ یادگیری",
    keywordsEn: "continue learning resume",
    center: "library",
    icon: PlayCircle,
    moduleKey: "study",
    order: 160,
  },
  {
    to: "/app/recall",
    nameFa: "مرور (SR)",
    nameEn: "Review (SR)",
    keywordsFa: "مرور تکرار فاصله‌دار فلش‌کارت",
    keywordsEn: "recall review spaced repetition flashcards sr",
    center: "library",
    icon: Layers,
    order: 170,
  },

  // ── Mind & Self-care ──────────────────────────────────────────────────────
  {
    to: "/app/mind",
    nameFa: "داشبورد ذهن",
    nameEn: "Mind Dashboard",
    keywordsFa: "ذهن داشبورد ذهن",
    keywordsEn: "mind dashboard",
    center: "self-care",
    icon: BrainCircuit,
    moduleKey: "mind",
    order: 210,
  },
  {
    to: "/app/checkin",
    nameFa: "چک‌این روزانه",
    nameEn: "Daily Check-in",
    keywordsFa: "چک‌این روزانه حال امروز خلق حال",
    keywordsEn: "checkin check-in mood daily",
    center: "self-care",
    icon: Activity,
    moduleKey: "mind",
    order: 220,
  },
  {
    to: "/app/thoughts",
    nameFa: "ثبت افکار CBT",
    nameEn: "CBT Thoughts",
    keywordsFa: "افکار ثبت افکار سی‌بی‌تی بررسی فکر ای‌بی‌سی abc",
    keywordsEn: "thoughts cbt thought record abc model think it through",
    center: "self-care",
    icon: NotebookPen,
    moduleKey: "mind",
    order: 230,
  },
  {
    to: "/app/mind/trends",
    nameFa: "روند و سنجش‌ها",
    nameEn: "Trends & Check-ups",
    keywordsFa: "روند سنجش پرسشنامه بینش",
    keywordsEn: "trends check-ups questionnaires insights",
    center: "self-care",
    icon: TrendingUp,
    moduleKey: "mind",
    order: 240,
  },
  {
    // The browse route is parameterised (`/app/mind/needs/:cat`); `problem` is the
    // first category and acts as the canonical landing into the needs library.
    to: "/app/mind/needs/problem",
    nameFa: "کتابخانه نیازها",
    nameEn: "Needs Library",
    keywordsFa: "نیاز نیازها کتابخانه نیازها حل مسئله",
    keywordsEn: "needs library browse",
    center: "self-care",
    icon: Puzzle,
    moduleKey: "mind",
    order: 250,
  },
  {
    to: "/app/mind/my-needs",
    nameFa: "نیازهای من",
    nameEn: "My Needs",
    keywordsFa: "نیازهای من نیازها",
    keywordsEn: "my needs",
    center: "self-care",
    icon: HeartHandshake,
    moduleKey: "mind",
    order: 260,
  },
  {
    to: "/app/calm",
    nameFa: "آرام‌شدن",
    nameEn: "Calm Down",
    keywordsFa: "آرام‌شدن آرامش صدای آرام",
    keywordsEn: "calm down relax",
    center: "self-care",
    icon: Wind,
    moduleKey: "mind",
    order: 270,
  },
  {
    to: "/app/breathing",
    nameFa: "تمرین تنفس",
    nameEn: "Breathing Exercise",
    keywordsFa: "تنفس تمرین تنفس مدیتیشن",
    keywordsEn: "breathing breath meditation",
    center: "self-care",
    icon: Wind,
    moduleKey: "mind",
    order: 280,
  },
  {
    to: "/app/sleep",
    nameFa: "خواب و آرامش",
    nameEn: "Sleep & Relaxation",
    keywordsFa: "خواب آرامش صدای خواب",
    keywordsEn: "sleep sounds relaxation",
    center: "self-care",
    icon: Moon,
    moduleKey: "mind",
    order: 290,
  },
  {
    to: "/app/worry",
    nameFa: "مدیریت نگرانی",
    nameEn: "Worry Management",
    keywordsFa: "نگرانی مدیریت نگرانی نگران دلشوره",
    keywordsEn: "worry anxiety anxious worry tree",
    center: "self-care",
    icon: CloudRain,
    moduleKey: "mind",
    order: 300,
  },
  {
    to: "/app/crisis",
    nameFa: "پشتیبانی بحران و اضطراری (SOS)",
    nameEn: "Crisis Support & Emergency (SOS)",
    keywordsFa: "بحران اضطراری کمک اورژانس خودکشی سوز",
    keywordsEn: "crisis sos help emergency support",
    center: "self-care",
    icon: ShieldAlert,
    order: 310,
  },
  {
    to: "/app/cycle",
    nameFa: "سیکل پریود",
    nameEn: "Period Cycle",
    keywordsFa: "سیکل پریود چرخه قاعدگی",
    keywordsEn: "cycle period menstrual",
    center: "self-care",
    icon: Droplet,
    order: 320,
  },

  // ── Goals & Growth ────────────────────────────────────────────────────────
  {
    to: "/app/garden",
    nameFa: "باغ رشد",
    nameEn: "Garden",
    keywordsFa: "باغ رشد باغبانی",
    keywordsEn: "garden growth",
    center: "goals-life",
    icon: Sprout,
    order: 410,
  },
  {
    to: "/app/values",
    nameFa: "ارزش‌ها و اهداف",
    nameEn: "Values & Goals",
    keywordsFa: "ارزشها اهداف ارزش هدف ارزشها و اهداف معنا",
    keywordsEn: "values goals purpose meaning",
    center: "goals-life",
    icon: Compass,
    order: 420,
  },
  {
    to: "/app/life-architect",
    nameFa: "معمار زندگی",
    nameEn: "Life Architect",
    keywordsFa: "معمار زندگی برنامه ریزی هدف اهداف",
    keywordsEn: "life architect design system",
    center: "goals-life",
    icon: DraftingCompass,
    order: 430,
  },
  {
    to: "/app/self",
    nameFa: "خودشناسی",
    nameEn: "Self-Knowledge",
    keywordsFa: "خودشناسی شخصیت آزمون",
    keywordsEn: "self knowledge personality assessment",
    center: "goals-life",
    icon: Sparkles,
    order: 440,
  },
  {
    to: "/app/about-me",
    nameFa: "درباره من",
    nameEn: "About Me",
    keywordsFa: "درباره من پروفایل",
    keywordsEn: "about me profile",
    center: "goals-life",
    icon: User,
    order: 450,
  },

  // ── Insights & Tools ──────────────────────────────────────────────────────
  {
    to: "/app/stats",
    nameFa: "آمار و عملکرد",
    nameEn: "Stats & Summary",
    keywordsFa: "آمار خلاصه عملکرد گزارش",
    keywordsEn: "stats summary statistics report",
    center: "insights-tools",
    icon: BarChart3,
    order: 510,
  },
  {
    to: "/app/tools",
    nameFa: "کتابخانه ابزار",
    nameEn: "Tools Library",
    keywordsFa: "کتابخانه ابزار ابزار مخزن کد مینی اپ",
    keywordsEn: "tools toolbox code vault mini apps library",
    center: "insights-tools",
    icon: Blocks,
    order: 520,
  },
  {
    to: "/app/widgets",
    nameFa: "ویجت‌ها",
    nameEn: "Widgets",
    keywordsFa: "ویجت ویجتها ابزارک",
    keywordsEn: "widgets",
    center: "insights-tools",
    icon: LayoutGrid,
    order: 530,
  },
  {
    to: "/app/rewrite-article",
    nameFa: "بازنویسی مقاله",
    nameEn: "Article Rewrite",
    keywordsFa: "بازنویسی مقاله بازنویسی متن",
    keywordsEn: "rewrite article text",
    center: "insights-tools",
    icon: PenLine,
    order: 540,
  },

  // ── Connections ───────────────────────────────────────────────────────────
  {
    to: "/app/contacts",
    nameFa: "افراد",
    nameEn: "Contacts",
    keywordsFa: "افراد مخاطبین مخاطب",
    keywordsEn: "contacts people",
    center: "connections",
    icon: Users,
    order: 610,
  },
  {
    to: "/app/shared",
    nameFa: "اشتراک‌شده با من",
    nameEn: "Shared with Me",
    keywordsFa: "اشتراک اشتراک‌گذاری اشتراک‌شده",
    keywordsEn: "shared with me sharing",
    center: "connections",
    icon: Share2,
    order: 620,
  },

  // ── Account & Settings ────────────────────────────────────────────────────
  {
    to: "/app/settings",
    nameFa: "تنظیمات و پشتیبان‌گیری",
    nameEn: "Settings & Backup",
    keywordsFa: "تنظیمات بکاپ پشتیبان‌گیری همگام‌سازی",
    keywordsEn: "settings backup sync firestore firebaseStore",
    center: "account",
    icon: Settings,
    order: 710,
  },
  {
    to: "/app/admin",
    nameFa: "پنل مدیریت",
    nameEn: "Admin Panel",
    keywordsFa: "مدیریت پنل مدیریت ادمین",
    keywordsEn: "admin panel management",
    center: "account",
    icon: Shield,
    order: 720,
  },
  {
    to: "/app/new/task",
    nameFa: "تسک جدید",
    nameEn: "New Task",
    keywordsFa: "تسک جدید ایجاد تسک افزودن تسک",
    keywordsEn: "new task add task create",
    center: "account",
    icon: ListPlus,
    order: 730,
  },
  {
    to: "/app/new/note",
    nameFa: "نوت جدید",
    nameEn: "New Note",
    keywordsFa: "نوت جدید ایجاد نوت یادداشت جدید",
    keywordsEn: "new note add note create",
    center: "account",
    icon: FilePlus,
    order: 740,
  },
];

/** Display label for a feature in the active language. */
export function getFeatureLabel(feature: FeatureEntry, isEn: boolean): string {
  return isEn ? feature.nameEn : feature.nameFa;
}

/** Full search haystack (both languages) for a feature. */
export function featureSearchText(feature: FeatureEntry): string {
  return [feature.nameFa, feature.nameEn, feature.keywordsFa, feature.keywordsEn, feature.to].join(" ");
}

/** Look up a single feature by its canonical route. */
export function findFeature(to: string): FeatureEntry | undefined {
  return FEATURES.find((feature) => feature.to === to);
}

/** Curated navigation keeps its own order/grouping, but not duplicate metadata. */
export function getFeatureNavigation(to: string) {
  const feature = findFeature(to);
  if (!feature) throw new Error(`Unregistered navigation feature: ${to}`);
  return { url: feature.to, label: feature.nameFa, icon: feature.icon };
}

/** Delegate module access to the existing route policy; admin remains role-gated. */
export function isFeatureAvailable(feature: FeatureEntry, modules: ModulesState, isAdmin = modules.isAdmin): boolean {
  return (feature.to !== "/app/admin" || isAdmin) && isPathAllowed(feature.to, modules);
}
