import { LeitnerCard, LeitnerCardType } from './leitner';

export type MindMapLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type MindMapPerspective =
  | 'comprehensive'   // 🌐 درخت جامع و یکپارچه
  | 'diseases'        // 🩺 ۱. بیماری‌ها و سیستم‌های بدن (eTG)
  | 'drugs'           // 💊 ۲. دسته‌های دارویی و فارماکوتراپی (AMH)
  | 'law'             // ⚖️ ۳. قوانین، نسخه‌پیچی و مقررات استرالیا
  | 'otc_triage'      // 🏪 ۴. تریاژ OTC و فرآورده‌های قفسه
  | 'safety'          // 🛡️ ۵. ایمنی، برچسب‌های هشدار و تداخلات
  | 'calculations';   // 🧮 ۶. محاسبات داروسازی و دوزاژ بالینی

export interface NodeCustomImage {
  url: string;
  caption?: string;
  addedAt?: string;
}

export interface MindMapNode {
  id: string;
  level: MindMapLevel;
  canonicalKey: string;
  parentId?: string;
  title: { fa: string; en: string };
  module?: 1 | 2 | 3 | 4 | 5 | 6;
  domainName?: string;
  systemName?: string;
  subsystemName?: string;
  subClassName?: string;
  microTopicName?: string;
  card?: LeitnerCard;
  children: MindMapNode[];
  cardCount: number;
  dueCount: number;
  boxCounts: Record<1 | 2 | 3 | 4 | 5, number>;
  colorTheme: string;
  customImage?: NodeCustomImage;
}

export type MindMapLineStyle = 'smooth_bezier' | 'orthogonal_step' | 'straight' | 'polar_radial';
export type MindMapTextDisplay = 'full_detailed' | 'compact';
export type MindMapViewMode =
  | 'interactive_canvas'
  | 'radial_circle'
  | 'vertical_tree'
  | 'outliner_tree'
  | 'matrix_grid';

export interface MindMapLayoutItem {
  node: MindMapNode;
  id: string;
  parentId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: MindMapLevel;
  isExpanded: boolean;
  hasChildren: boolean;
  colorTheme: string;
  customImage?: NodeCustomImage;
}

export interface MindMapLink {
  id: string;
  sourceId: string;
  targetId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
  isHighlighted?: boolean;
}

export interface MindMapThemeConfig {
  key: string;
  name: { fa: string; en: string };
  badge: string;
  border: string;
  text: string;
  bg: string;
  glow: string;
  dot: string;
  stroke: string;
  darkStroke: string;
  lightStroke: string;
  accent: string;
}
