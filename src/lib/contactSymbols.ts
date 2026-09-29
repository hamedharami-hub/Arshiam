import React from "react";
import {
  User,
  Users,
  Briefcase,
  Building2,
  Stethoscope,
  GraduationCap,
  Heart,
  Star,
  Crown,
  Sparkles,
  Coffee,
  Store,
  Shield,
  Phone,
  Mail,
  Home,
  Laptop,
  Code,
  PenTool,
  Smile,
  Gift,
  Bookmark,
  Flame,
  Compass,
  type LucideIcon,
} from "lucide-react";
import type { ContactAvatarShape } from "./contactTypes";

export interface ContactSymbolDef {
  id: string;
  labelFa: string;
  labelEn: string;
  category: "role" | "personal" | "communication" | "other";
  icon: LucideIcon;
}

export interface ContactShapeDef {
  id: ContactAvatarShape;
  labelFa: string;
  labelEn: string;
  className: string;
}

export interface ContactColorDef {
  id: string;
  labelFa: string;
  labelEn: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
}

export const CONTACT_SHAPES: ContactShapeDef[] = [
  {
    id: "circle",
    labelFa: "دایره",
    labelEn: "Circle",
    className: "rounded-full",
  },
  {
    id: "rounded",
    labelFa: "گوشه‌گرد",
    labelEn: "Rounded",
    className: "rounded-2xl",
  },
  {
    id: "square",
    labelFa: "مربع",
    labelEn: "Square",
    className: "rounded-md",
  },
  {
    id: "hexagon",
    labelFa: "شش‌ضلعی",
    labelEn: "Hexagon",
    className: "[clip-path:polygon(50%_0%,100%_25%,100%_75%,50%_100%,0%_75%,0%_25%)]",
  },
  {
    id: "diamond",
    labelFa: "لوزی",
    labelEn: "Diamond",
    className: "[clip-path:polygon(50%_0%,100%_50%,50%_100%,0%_50%)]",
  },
];

export const CONTACT_COLORS: ContactColorDef[] = [
  {
    id: "primary",
    labelFa: "پیش‌فرض",
    labelEn: "Default",
    bgClass: "bg-primary/10",
    textClass: "text-primary",
    borderClass: "border-primary/25",
    dotClass: "bg-primary",
  },
  {
    id: "blue",
    labelFa: "آبی",
    labelEn: "Blue",
    bgClass: "bg-blue-500/15",
    textClass: "text-blue-600 dark:text-blue-400",
    borderClass: "border-blue-500/30",
    dotClass: "bg-blue-500",
  },
  {
    id: "emerald",
    labelFa: "سبز / زمردی",
    labelEn: "Emerald",
    bgClass: "bg-emerald-500/15",
    textClass: "text-emerald-600 dark:text-emerald-400",
    borderClass: "border-emerald-500/30",
    dotClass: "bg-emerald-500",
  },
  {
    id: "purple",
    labelFa: "بنفش",
    labelEn: "Purple",
    bgClass: "bg-purple-500/15",
    textClass: "text-purple-600 dark:text-purple-400",
    borderClass: "border-purple-500/30",
    dotClass: "bg-purple-500",
  },
  {
    id: "amber",
    labelFa: "کهربایی / طلایی",
    labelEn: "Amber",
    bgClass: "bg-amber-500/15",
    textClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500/30",
    dotClass: "bg-amber-500",
  },
  {
    id: "rose",
    labelFa: "سرخ / رز",
    labelEn: "Rose",
    bgClass: "bg-rose-500/15",
    textClass: "text-rose-600 dark:text-rose-400",
    borderClass: "border-rose-500/30",
    dotClass: "bg-rose-500",
  },
  {
    id: "cyan",
    labelFa: "فیروزه‌ای",
    labelEn: "Cyan",
    bgClass: "bg-cyan-500/15",
    textClass: "text-cyan-600 dark:text-cyan-400",
    borderClass: "border-cyan-500/30",
    dotClass: "bg-cyan-500",
  },
  {
    id: "indigo",
    labelFa: "نیلی",
    labelEn: "Indigo",
    bgClass: "bg-indigo-500/15",
    textClass: "text-indigo-600 dark:text-indigo-400",
    borderClass: "border-indigo-500/30",
    dotClass: "bg-indigo-500",
  },
  {
    id: "slate",
    labelFa: "خاکستری مدرن",
    labelEn: "Slate",
    bgClass: "bg-slate-500/15",
    textClass: "text-slate-600 dark:text-slate-400",
    borderClass: "border-slate-500/30",
    dotClass: "bg-slate-500",
  },
];

export const CONTACT_SYMBOLS: ContactSymbolDef[] = [
  // Roles & Work
  { id: "user", labelFa: "شخص عمومی", labelEn: "Person", category: "role", icon: User },
  { id: "briefcase", labelFa: "کاری / همکار", labelEn: "Work / Colleague", category: "role", icon: Briefcase },
  { id: "building", labelFa: "شرکت / سازمان", labelEn: "Company", category: "role", icon: Building2 },
  { id: "stethoscope", labelFa: "پزشک / درمان", labelEn: "Doctor / Healthcare", category: "role", icon: Stethoscope },
  { id: "graduation-cap", labelFa: "استاد / دانشجو", labelEn: "Academic", category: "role", icon: GraduationCap },
  { id: "store", labelFa: "فروشگاه / تأمین‌کننده", labelEn: "Store / Supplier", category: "role", icon: Store },
  { id: "laptop", labelFa: "فنی / مهندسی", labelEn: "Tech / Engineering", category: "role", icon: Laptop },
  { id: "code", labelFa: "برنامه‌نویس", labelEn: "Developer", category: "role", icon: Code },
  { id: "pen-tool", labelFa: "طراحی / هنر", labelEn: "Design / Creative", category: "role", icon: PenTool },

  // Personal & Relationships
  { id: "heart", labelFa: "صمیمی / خانواده", labelEn: "Family / Close", category: "personal", icon: Heart },
  { id: "star", labelFa: "ویژه / مهم", labelEn: "Star / Important", category: "personal", icon: Star },
  { id: "crown", labelFa: "مدیر / مشتری ویژه", labelEn: "VIP / Executive", category: "personal", icon: Crown },
  { id: "users", labelFa: "تیم / گروه", labelEn: "Team / Group", category: "personal", icon: Users },
  { id: "smile", labelFa: "دوستانه", labelEn: "Friend", category: "personal", icon: Smile },
  { id: "coffee", labelFa: "کافه / گفتگو", labelEn: "Coffee", category: "personal", icon: Coffee },
  { id: "sparkles", labelFa: "الهام‌بخش / ایده", labelEn: "Sparkles", category: "personal", icon: Sparkles },
  { id: "gift", labelFa: "مناسبت / هدیه", labelEn: "Gift", category: "personal", icon: Gift },

  // Communication & Utils
  { id: "phone", labelFa: "تماس تلفنی", labelEn: "Phone", category: "communication", icon: Phone },
  { id: "mail", labelFa: "مکاتبات رسمی", labelEn: "Mail", category: "communication", icon: Mail },
  { id: "shield", labelFa: "حقوقی / امنیتی", labelEn: "Legal / Security", category: "other", icon: Shield },
  { id: "home", labelFa: "منزل / اقامتگاه", labelEn: "Home", category: "other", icon: Home },
  { id: "bookmark", labelFa: "نشان‌شده", labelEn: "Bookmarked", category: "other", icon: Bookmark },
  { id: "flame", labelFa: "فوری / بااولویت", labelEn: "Priority / Hot", category: "other", icon: Flame },
  { id: "compass", labelFa: "مشاور / راهنما", labelEn: "Mentor / Guide", category: "other", icon: Compass },
];

export const POPULAR_EMOJIS = [
  "⭐️", "💼", "👨‍⚕️", "👩‍⚕️", "🏢", "🎓", "❤️", "🤝", "🚀", "💡", "⚡️", "👑", "🎯", "🩺", "🛒", "☕️", "📞", "🔑",
];

const symbolMap = new Map<string, ContactSymbolDef>();
for (const s of CONTACT_SYMBOLS) {
  symbolMap.set(s.id, s);
}

const shapeMap = new Map<string, ContactShapeDef>();
for (const sh of CONTACT_SHAPES) {
  shapeMap.set(sh.id, sh);
}

const colorMap = new Map<string, ContactColorDef>();
for (const c of CONTACT_COLORS) {
  colorMap.set(c.id, c);
}

export function getContactSymbol(iconKey?: string): ContactSymbolDef | undefined {
  if (!iconKey) return undefined;
  return symbolMap.get(iconKey);
}

export function getContactShape(shapeKey?: string): ContactShapeDef {
  if (!shapeKey) return CONTACT_SHAPES[0]; // default circle
  return shapeMap.get(shapeKey) || CONTACT_SHAPES[0];
}

export function getContactColor(colorKey?: string): ContactColorDef {
  if (!colorKey) return CONTACT_COLORS[0]; // default primary
  return colorMap.get(colorKey) || CONTACT_COLORS[0];
}
