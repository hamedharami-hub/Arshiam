'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Language } from '@/types/pharmacy';
import { LeitnerCard } from '@/types/leitner';
import {
  MindMapNode,
  MindMapLevel,
  MindMapTextDisplay,
  MindMapLineStyle,
  MindMapViewMode,
  MindMapPerspective,
  NodeCustomImage,
} from '@/types/mindmap';
import {
  computeMindMapLayout,
  MINDMAP_THEMES,
  DOMAIN_COLOR_PALETTES,
} from '@/lib/mindmapLayout';
import { MindMapCanvas } from '@/components/mindmap/MindMapCanvas';
import { BranchStudyRunnerModal } from '@/components/mindmap/BranchStudyRunnerModal';
import {
  QuestionDetailModal,
  RenameNodeModal,
  ColorPickerModal,
  BranchExportModal,
  NodeImageModal,
  ImageViewerModal,
  extractCardBilingualText,
} from '@/components/mindmap/MindMapModals';
import { MindMapSettingsModal } from '@/components/mindmap/MindMapSettingsModal';
import { getClientAiConfig, saveClientAiConfig } from '@/lib/aiConfigStorage';
import {
  Sparkles,
  Search,
  BookOpen,
  FolderTree,
  Network,
  ListTree,
  Languages,
  Layers,
  Filter,
  Check,
  X,
  Pencil,
  Palette,
  Play,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  HelpCircle,
  Flag,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle2,
  Folder,
  Stethoscope,
  Pill,
  Zap,
  Download,
  Maximize2,
  Minimize2,
  Share2,
  Settings,
  Scale,
  Building2,
  ShieldAlert,
  Calculator,
  Target,
  Home,
  ArrowRight,
  Image as ImageIcon,
} from 'lucide-react';

export interface LeitnerMindMapPanelProps {
  language: Language;
  cards: LeitnerCard[];
  onStartStudyBranch: (params: {
    title: string;
    domain?: string;
    system?: string;
    subsystem?: string;
    subClass?: string;
    microTopic?: string;
    module?: number | 'ALL';
    cardIds?: string[];
  }) => void;
  onOpenAiGenerator?: (snippetText?: string) => void;
  onAddSampleCards?: () => void;
  onDeleteCard?: (cardId: string) => void;
  onRateCard?: (cardId: string, rating: 'again' | 'hard' | 'good' | 'easy') => void;
  onUpdateCardBox?: (cardId: string, box: 1 | 2 | 3 | 4 | 5) => void;
  showLeitnerGrading?: boolean;
}

export type { MindMapNode };

// Pure recursive search helper
function findNodeAndPath(root: MindMapNode, targetId: string): { node: MindMapNode | null; path: MindMapNode[] } {
  if (root.id === targetId) return { node: root, path: [root] };
  for (const child of root.children) {
    const res = findNodeAndPath(child, targetId);
    if (res.node) {
      return { node: res.node, path: [root, ...res.path] };
    }
  }
  return { node: null, path: [] };
}

// Storage keys
const NODE_ALIASES_STORAGE_KEY = 'AU_PHARMACY_NODE_ALIASES_V2';
const NODE_COLORS_STORAGE_KEY = 'AU_PHARMACY_NODE_COLORS_V2';
const CARD_FLAGS_STORAGE_KEY = 'AU_PHARMACY_MINDMAP_FLAGS_V1';
const NODE_IMAGES_STORAGE_KEY = 'AU_PHARMACY_NODE_IMAGES_V1';

// Flags definition
export type FlagColor = 'red' | 'amber' | 'green' | 'blue' | 'purple';

export const FLAG_OPTIONS: Record<
  FlagColor,
  {
    name: { fa: string; en: string };
    badge: string;
    pill: string;
    dot: string;
    iconColor: string;
  }
> = {
  red: {
    name: { fa: 'قرمز (نیاز به توجه / ضعف)', en: 'Red (High Priority)' },
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    pill: 'bg-rose-500 text-white',
    dot: 'bg-rose-500',
    iconColor: 'text-rose-400',
  },
  amber: {
    name: { fa: 'زرد (مرور مجدد)', en: 'Amber (Review Soon)' },
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    pill: 'bg-amber-500 text-slate-950',
    dot: 'bg-amber-400',
    iconColor: 'text-amber-400',
  },
  green: {
    name: { fa: 'سبز (تسلط کامل)', en: 'Green (Mastered)' },
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    pill: 'bg-emerald-500 text-white',
    dot: 'bg-emerald-400',
    iconColor: 'text-emerald-400',
  },
  blue: {
    name: { fa: 'آبی (مرور هفتگی)', en: 'Blue (Weekly)' },
    badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    pill: 'bg-blue-500 text-white',
    dot: 'bg-blue-400',
    iconColor: 'text-blue-400',
  },
  purple: {
    name: { fa: 'بنفش (نکات تستی/طلایی)', en: 'Purple (High Yield)' },
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    pill: 'bg-purple-500 text-white',
    dot: 'bg-purple-400',
    iconColor: 'text-purple-400',
  },
};

// 6 Master Mind Map Perspectives Configuration
export const MINDMAP_PERSPECTIVES: Array<{
  id: MindMapPerspective;
  name: { fa: string; en: string };
  desc: { fa: string; en: string };
  icon: React.ElementType;
  badge: string;
  gradient: string;
}> = [
  {
    id: 'comprehensive',
    name: { fa: '🌐 درخت جامع', en: 'Master View' },
    desc: { fa: 'نمایش کل پایگاه دانش و کارت‌ها در یک ساختار یکپارچه', en: 'Full unified hierarchy across all pharmacy modules' },
    icon: Network,
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    gradient: 'from-purple-600 to-indigo-600',
  },
  {
    id: 'diseases',
    name: { fa: '🩺 بیماری‌ها (eTG)', en: 'Conditions & eTG' },
    desc: { fa: 'دسته‌بندی بیماری‌محور بر اساس پاتولوژی و سیستم‌های بدن', en: 'Disease-centric clinical condition and organ system map' },
    icon: Stethoscope,
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    gradient: 'from-cyan-600 to-blue-600',
  },
  {
    id: 'drugs',
    name: { fa: '💊 داروها (AMH)', en: 'Drug Classes & AMH' },
    desc: { fa: 'دسته‌بندی دارومحور بر اساس رده‌های فارماکولوژی و ژنریک/برند', en: 'Drug-centric pharmacotherapy and therapeutic classes' },
    icon: Pill,
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    gradient: 'from-emerald-600 to-teal-600',
  },
  {
    id: 'law',
    name: { fa: '⚖️ قوانین و مقررات', en: 'Pharmacy Law & PBS' },
    desc: { fa: 'جدول‌بندی SUSMP، قوانین S8، الزامات نسخه و کدهای PBS', en: 'Australian SUSMP scheduling, S8 narcotics, PBS & legal practice' },
    icon: Scale,
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    gradient: 'from-amber-600 to-orange-600',
  },
  {
    id: 'otc_triage',
    name: { fa: '🏪 تریاژ OTC و قفسه', en: 'OTC Triage & Shelf' },
    desc: { fa: 'شکایات بالینی WWHAM، فرآورده‌های قفسه S2/S3 و علائم هشدار', en: 'WWHAM consultation protocol, minor ailments and S3 medicines' },
    icon: Building2,
    badge: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    gradient: 'from-sky-600 to-indigo-600',
  },
  {
    id: 'safety',
    name: { fa: '🛡️ ایمنی و برچسب‌ها', en: 'Safety & CAL Labels' },
    desc: { fa: 'برچسب‌های هشدار CAL، تداخلات ماژور، پایش TDM و سالمندان', en: 'Australian CAL warning labels, drug interactions & monitoring' },
    icon: ShieldAlert,
    badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    gradient: 'from-rose-600 to-pink-600',
  },
  {
    id: 'calculations',
    name: { fa: '🧮 محاسبات بالینی', en: 'Calculations & Dosing' },
    desc: { fa: 'کلیرانس کراتینین، دوز اطفال، غلظت، ترقیق و تبدیل دوز', en: 'Creatinine clearance, paediatric dosing, dilutions & kinetics' },
    icon: Calculator,
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    gradient: 'from-indigo-600 to-violet-600',
  },
];

export const LeitnerMindMapPanel: React.FC<LeitnerMindMapPanelProps> = ({
  language,
  cards,
  onStartStudyBranch,
  onOpenAiGenerator,
  onAddSampleCards,
  onDeleteCard,
  onRateCard,
  onUpdateCardBox,
  showLeitnerGrading = false,
}) => {
  const isFa = language === 'fa';
  const containerRef = useRef<HTMLDivElement>(null);

  // 6 Perspectives state
  const [perspective, setPerspective] = useState<MindMapPerspective>('comprehensive');

  // Focal Subtree Drill-Down Root state
  const [focalNodeId, setFocalNodeId] = useState<string | null>(null);

  // View modes
  const [viewMode, setViewMode] = useState<MindMapViewMode>('interactive_canvas');
  const [textDisplayMode, setTextDisplayMode] = useState<MindMapTextDisplay>('full_detailed');
  const [lineStyle, setLineStyle] = useState<MindMapLineStyle>('smooth_bezier');
  const [isZenMode, setIsZenMode] = useState(false);
  const [cardLangMode, setCardLangMode] = useState<'fa' | 'en' | 'bilingual'>('bilingual');

  // AI Config & Selected Model for Mind Map
  const [currentAiModel, setCurrentAiModel] = useState<string>(() => {
    return getClientAiConfig().flashcardModel || 'gemini-2.5-flash';
  });

  const handleSetAiModel = useCallback((modelId: string) => {
    setCurrentAiModel(modelId);
    const existing = getClientAiConfig();
    saveClientAiConfig({ ...existing, flashcardModel: modelId });
  }, []);

  // Settings Modal State
  const [isMindMapSettingsOpen, setIsMindMapSettingsOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [filterModule, setFilterModule] = useState<number | 'ALL'>('ALL');
  const [filterBox, setFilterBox] = useState<number | 'ALL'>('ALL');
  const [selectedFlagFilters, setSelectedFlagFilters] = useState<string[]>([]);
  const [onlyDueToday, setOnlyDueToday] = useState(false);

  // Total Due Count across current cards
  const totalDueCount = useMemo(() => {
    const nowIso = new Date().toISOString();
    return cards.filter((c) => !c.nextReviewDate || c.nextReviewDate <= nowIso).length;
  }, [cards]);

  // Expanded Nodes state
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({
    root: true,
  });

  // Outliner revealed answers
  const [revealedAnswerIds, setRevealedAnswerIds] = useState<Record<string, boolean>>({});

  // Stored Card Flags
  const [cardFlags, setCardFlags] = useState<Record<string, FlagColor>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(CARD_FLAGS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Custom Node Aliases
  const [customAliases, setCustomAliases] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(NODE_ALIASES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Custom Node Colors
  const [customColors, setCustomColors] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(NODE_COLORS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Custom Node Images
  const [nodeImages, setNodeImages] = useState<Record<string, NodeCustomImage>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem(NODE_IMAGES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Modals & Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    node: MindMapNode | null;
  }>({
    isOpen: false,
    x: 0,
    y: 0,
    node: null,
  });

  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    node: MindMapNode | null;
    currentText: string;
  }>({
    isOpen: false,
    node: null,
    currentText: '',
  });

  const [colorPickerModal, setColorPickerModal] = useState<{
    isOpen: boolean;
    node: MindMapNode | null;
  }>({
    isOpen: false,
    node: null,
  });

  const [branchExportModal, setBranchExportModal] = useState<{
    isOpen: boolean;
    node: MindMapNode | null;
  }>({
    isOpen: false,
    node: null,
  });

  const [nodeImageModal, setNodeImageModal] = useState<{
    isOpen: boolean;
    node: MindMapNode | null;
  }>({
    isOpen: false,
    node: null,
  });

  const [imageViewerModal, setImageViewerModal] = useState<{
    isOpen: boolean;
    image: NodeCustomImage | null;
    title: string;
  }>({
    isOpen: false,
    image: null,
    title: '',
  });

  const [selectedQuestionCard, setSelectedQuestionCard] = useState<LeitnerCard | null>(null);

  // Sequential Branch Study Runner State
  const [branchRunnerState, setBranchRunnerState] = useState<{
    isOpen: boolean;
    node: MindMapNode | null;
    cards: LeitnerCard[];
  }>({
    isOpen: false,
    node: null,
    cards: [],
  });

  // Recent rating toast tracker
  const [ratedCardMap, setRatedCardMap] = useState<Record<string, { rating: string; timestamp: number }>>({});

  // Flag handler
  const handleSetCardFlag = useCallback((cardId: string, flag: FlagColor | null) => {
    setCardFlags((prev) => {
      const updated = { ...prev };
      if (!flag) {
        delete updated[cardId];
      } else {
        updated[cardId] = flag;
      }
      try {
        localStorage.setItem(CARD_FLAGS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save flag:', err);
      }
      return updated;
    });
  }, []);

  const handleSaveAlias = useCallback((canonicalKey: string, newTitle: string) => {
    setCustomAliases((prev) => {
      const updated = { ...prev };
      const trimmed = newTitle.trim();
      if (!trimmed) {
        delete updated[canonicalKey];
      } else {
        updated[canonicalKey] = trimmed;
      }
      try {
        localStorage.setItem(NODE_ALIASES_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save alias:', err);
      }
      return updated;
    });
    setRenameModal({ isOpen: false, node: null, currentText: '' });
  }, []);

  const handleResetAlias = useCallback((canonicalKey: string) => {
    setCustomAliases((prev) => {
      const updated = { ...prev };
      delete updated[canonicalKey];
      try {
        localStorage.setItem(NODE_ALIASES_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to reset alias:', err);
      }
      return updated;
    });
    setRenameModal({ isOpen: false, node: null, currentText: '' });
  }, []);

  const handleSaveColor = useCallback((canonicalKey: string, colorKey: string) => {
    setCustomColors((prev) => {
      const updated = { ...prev };
      if (!colorKey || colorKey === 'default') {
        delete updated[canonicalKey];
      } else {
        updated[canonicalKey] = colorKey;
      }
      try {
        localStorage.setItem(NODE_COLORS_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save color:', err);
      }
      return updated;
    });
    setColorPickerModal({ isOpen: false, node: null });
  }, []);

  const handleSaveNodeImage = useCallback((canonicalKey: string, image: NodeCustomImage | null) => {
    setNodeImages((prev) => {
      const updated = { ...prev };
      if (!image) {
        delete updated[canonicalKey];
      } else {
        updated[canonicalKey] = image;
      }
      try {
        localStorage.setItem(NODE_IMAGES_STORAGE_KEY, JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save node image:', err);
      }
      return updated;
    });
  }, []);

  const getNodeDisplayTitle = useCallback(
    (node: MindMapNode) => {
      if (node.canonicalKey && customAliases[node.canonicalKey]) {
        return customAliases[node.canonicalKey];
      }
      if (cardLangMode === 'en') {
        return node.title.en || node.title.fa;
      }
      if (cardLangMode === 'fa') {
        return node.title.fa || node.title.en;
      }
      return isFa ? node.title.fa || node.title.en : node.title.en || node.title.fa;
    },
    [isFa, customAliases, cardLangMode]
  );

  const getNodeColorTheme = useCallback(
    (node: MindMapNode) => {
      if (node.canonicalKey && customColors[node.canonicalKey]) {
        const custom = customColors[node.canonicalKey];
        if (MINDMAP_THEMES[custom]) return custom;
      }
      return node.colorTheme || 'purple';
    },
    [customColors]
  );

  // Context Menu trigger
  const handleOpenContextMenu = useCallback(
    (e: React.MouseEvent | React.TouchEvent, node: MindMapNode) => {
      e.preventDefault();
      e.stopPropagation();

      let clientX = 0;
      let clientY = 0;
      if ('clientX' in e) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      const sw = typeof window !== 'undefined' ? window.innerWidth : 1000;
      const sh = typeof window !== 'undefined' ? window.innerHeight : 800;
      const posX = clientX + 260 > sw ? Math.max(10, sw - 275) : clientX;
      const posY = clientY + 300 > sh ? Math.max(10, sh - 310) : clientY;

      setContextMenu({
        isOpen: true,
        x: posX,
        y: posY,
        node,
      });
    },
    []
  );

  // Filter Cards
  const filteredCards = useMemo(() => {
    const nowIso = new Date().toISOString();
    return cards.filter((card) => {
      if (filterModule !== 'ALL' && card.module !== filterModule) return false;
      if (filterBox !== 'ALL' && card.box !== filterBox) return false;

      // Filter by due date if "Today's Due Map" mode is enabled (Module 5 only)
      if (showLeitnerGrading && onlyDueToday) {
        const isDue = !card.nextReviewDate || card.nextReviewDate <= nowIso;
        if (!isDue) return false;
      }

      // Filter by flags (Module 6 only)
      if (!showLeitnerGrading && selectedFlagFilters.length > 0) {
        const flag = cardFlags[card.id];
        const matchFlag = flag ? selectedFlagFilters.includes(flag) : selectedFlagFilters.includes('none');
        if (!matchFlag) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const qText =
          typeof card.question === 'object' && card.question !== null
            ? `${card.question.fa || ''} ${card.question.en || ''}`.toLowerCase()
            : String(card.question || '').toLowerCase();
        const aText =
          typeof card.answer === 'object' && card.answer !== null
            ? `${card.answer.fa || ''} ${card.answer.en || ''}`.toLowerCase()
            : String(card.answer || '').toLowerCase();
        const match =
          qText.includes(q) ||
          aText.includes(q) ||
          (card.topic ? card.topic.toLowerCase().includes(q) : false) ||
          (card.category ? card.category.toLowerCase().includes(q) : false) ||
          (card.tags?.some((t) => t.toLowerCase().includes(q)) ?? false);
        if (!match) return false;
      }

      return true;
    });
  }, [cards, filterModule, filterBox, showLeitnerGrading, onlyDueToday, selectedFlagFilters, cardFlags, searchQuery]);

  // =========================================================================
  // MULTI-PERSPECTIVE KNOWLEDGE TREE BUILDER
  // =========================================================================
  const fullMindMapTree = useMemo<MindMapNode>(() => {
    let rootTitleFa = 'نقشه جامع یادگیری و فارماکوتراپی استرالیا';
    let rootTitleEn = 'Australian Pharmacy Practice Knowledge Tree';
    let rootTheme = 'purple';

    if (perspective === 'diseases') {
      rootTitleFa = '🩺 نقشه جامع بیماری‌ها و سیستم‌های بالینی (eTG)';
      rootTitleEn = 'Clinical Conditions & Organ Systems Tree (eTG)';
      rootTheme = 'cyan';
    } else if (perspective === 'drugs') {
      rootTitleFa = '💊 نقشه جامع رده‌های دارویی و فارماکوتراپی (AMH)';
      rootTitleEn = 'Pharmacotherapy & Drug Classes Tree (AMH)';
      rootTheme = 'emerald';
    } else if (perspective === 'law') {
      rootTitleFa = '⚖️ نقشه جامع قوانین، نسخه‌پیچی و مقررات استرالیا';
      rootTitleEn = 'Australian Pharmacy Law, PBS & Practice Tree';
      rootTheme = 'amber';
    } else if (perspective === 'otc_triage') {
      rootTitleFa = '🏪 نقشه جامع تریاژ OTC، بیماری‌های خفیف و قفسه داروخانه';
      rootTitleEn = 'OTC Triage, Minor Ailments & S2/S3 Shelf Tree';
      rootTheme = 'sky';
    } else if (perspective === 'safety') {
      rootTitleFa = '🛡️ نقشه جامع ایمنی بیمار، برچسب‌ها و تداخلات دارویی';
      rootTitleEn = 'Patient Safety, CAL Labels & Monitoring Tree';
      rootTheme = 'rose';
    } else if (perspective === 'calculations') {
      rootTitleFa = '🧮 نقشه جامع محاسبات داروسازی، دوزاژ و فرمولاسیون';
      rootTitleEn = 'Clinical Dosing Calculations & Kinetics Tree';
      rootTheme = 'indigo';
    }

    const rootCanonical = `ROOT_AU_${perspective.toUpperCase()}`;
    const rootNode: MindMapNode = {
      id: 'root',
      level: 0,
      canonicalKey: rootCanonical,
      title: { fa: rootTitleFa, en: rootTitleEn },
      children: [],
      cardCount: filteredCards.length,
      dueCount: 0,
      boxCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      colorTheme: rootTheme,
      customImage: nodeImages[rootCanonical],
    };

    type MicroTopicEntry = { title: { fa: string; en: string }; cards: LeitnerCard[] };
    type SubClassEntry = { title: { fa: string; en: string }; isGeneric: boolean; microTopics: Map<string, MicroTopicEntry> };
    type ConditionEntry = { title: { fa: string; en: string }; subClasses: Map<string, SubClassEntry> };
    type SystemEntry = { title: { fa: string; en: string }; conditions: Map<string, ConditionEntry> };
    type DomainEntry = { title: { fa: string; en: string }; module?: 1 | 2 | 3 | 4 | 5 | 6; systems: Map<string, SystemEntry> };

    const domainMap = new Map<string, DomainEntry>();

    filteredCards.forEach((card) => {
      let domainKey = '';
      let domainFa = '';
      let domainEn = '';

      let systemKey = '';
      let systemFa = '';
      let systemEn = '';

      let conditionKey = '';
      let conditionFa = '';
      let conditionEn = '';

      let rawScKey = '';
      let rawScFa = '';
      let rawScEn = '';

      let microKey = '';
      let microFa = '';
      let microEn = '';

      // 1. Perspective Classification Logic
      if (perspective === 'diseases') {
        domainKey = card.knowledgeTree?.system?.en || card.category || 'Clinical Systems';
        domainFa = card.knowledgeTree?.system?.fa || card.category || 'سیستم‌های بالینی و اندام‌ها';
        domainEn = card.knowledgeTree?.system?.en || card.category || 'Organ Systems & Pathology';

        systemKey = card.knowledgeTree?.subsystem?.en || card.topic || 'Disease State';
        systemFa = card.knowledgeTree?.subsystem?.fa || card.topic || 'بیماری و وضعیت بالینی';
        systemEn = card.knowledgeTree?.subsystem?.en || card.topic || 'Disease Condition';

        conditionKey = card.knowledgeTree?.subClass?.en || 'Therapeutic Protocols';
        conditionFa = card.knowledgeTree?.subClass?.fa || 'پروتکل و خطوط درمانی';
        conditionEn = card.knowledgeTree?.subClass?.en || 'Therapeutic Management';

        rawScKey = card.knowledgeTree?.microTopic?.en || 'Clinical Guidelines';
        rawScFa = card.knowledgeTree?.microTopic?.fa || 'راهنماهای بالینی eTG';
        rawScEn = card.knowledgeTree?.microTopic?.en || 'eTG Clinical Rules';

        microKey = card.tags?.[0] || 'High Yield Node';
        microFa = card.tags?.[0] || 'نکات کلیدی بیماری';
        microEn = card.tags?.[0] || 'Key Disease Pearls';
      } else if (perspective === 'drugs') {
        domainKey = card.knowledgeTree?.subClass?.en || card.category || 'Pharmacology Classes';
        domainFa = card.knowledgeTree?.subClass?.fa || card.category || 'رده‌های فارماکولوژی و درمانی';
        domainEn = card.knowledgeTree?.subClass?.en || card.category || 'Pharmacological Drug Classes';

        systemKey = card.topic || 'Drug Group';
        systemFa = card.topic || 'گروه و خانواده داروها';
        systemEn = card.topic || 'Drug Families';

        conditionKey = card.knowledgeTree?.system?.en || 'Mechanism & Spectrum';
        conditionFa = card.knowledgeTree?.system?.fa || 'مکانیزم و طیف اثر دارو';
        conditionEn = card.knowledgeTree?.system?.en || 'Mechanism of Action';

        rawScKey = card.knowledgeTree?.microTopic?.en || 'Dosing & Interactions';
        rawScFa = card.knowledgeTree?.microTopic?.fa || 'دوزاژ و تداخلات AMH';
        rawScEn = card.knowledgeTree?.microTopic?.en || 'AMH Dosage & Pearls';

        microKey = card.tags?.[0] || 'Drug Details';
        microFa = card.tags?.[0] || 'نکات فارماکوتراپی';
        microEn = card.tags?.[0] || 'Pharmacotherapy Node';
      } else if (perspective === 'law') {
        domainKey = 'Australian Pharmacy Law & Regulations';
        domainFa = 'قوانین، مقررات و نسخه‌پیچی استرالیا';
        domainEn = 'Australian Pharmacy Law & Practice';

        systemKey = card.category || 'Legal Scheduling';
        systemFa = card.category || 'جدول‌بندی SUSMP و قوانین S8/PBS';
        systemEn = card.category || 'SUSMP Scheduling & PBS Law';

        conditionKey = card.topic || 'Practice Standards';
        conditionFa = card.topic || 'استانداردهای قانونی نسخه‌پیچی';
        conditionEn = card.topic || 'Dispensing Regulations';

        rawScKey = card.knowledgeTree?.microTopic?.en || 'Legal Rules';
        rawScFa = card.knowledgeTree?.microTopic?.fa || 'ماده قانونی و الزامات';
        rawScEn = card.knowledgeTree?.microTopic?.en || 'Statutory Requirements';

        microKey = card.tags?.[0] || 'Law Concept';
        microFa = card.tags?.[0] || 'نکات آزمون بورد و قوانین';
        microEn = card.tags?.[0] || 'Forensic Pharmacy Node';
      } else if (perspective === 'otc_triage') {
        domainKey = 'Primary Care & OTC Consultation';
        domainFa = 'مراقبت‌های اولیه، تریاژ و قفسه S2/S3';
        domainEn = 'Primary Care OTC Triage & Shelf';

        systemKey = card.category || 'Clinical Complaints';
        systemFa = card.category || 'شکایات شایع WWHAM و بیماری‌های سبک';
        systemEn = card.category || 'Common Minor Ailments';

        conditionKey = card.topic || 'Triage Protocols';
        conditionFa = card.topic || 'پروتکل‌های مشاوره و ارزیابی';
        conditionEn = card.topic || 'Consultation Protocols';

        rawScKey = card.knowledgeTree?.microTopic?.en || 'S3 Products & Red Flags';
        rawScFa = card.knowledgeTree?.microTopic?.fa || 'فرآورده‌های S3 و علائم ارجاع';
        rawScEn = card.knowledgeTree?.microTopic?.en || 'S3 Medicines & Red Flags';

        microKey = card.tags?.[0] || 'OTC Pearls';
        microFa = card.tags?.[0] || 'نکات خط مقدم داروخانه';
        microEn = card.tags?.[0] || 'Community Pharmacy Node';
      } else if (perspective === 'safety') {
        domainKey = 'Patient Safety & Clinical Risk';
        domainFa = 'ایمنی بیمار، برچسب‌ها و تداخلات دارویی';
        domainEn = 'Patient Safety, CALs & Interactions';

        systemKey = card.type === 'cal_warning' ? 'CAL Labels 1-21' : card.category || 'Clinical Safety';
        systemFa = card.type === 'cal_warning' ? 'برچسب‌های هشدار دارویی (CALs)' : card.category || 'پایش ایمنی و تداخلات';
        systemEn = card.type === 'cal_warning' ? 'Cautionary Advisory Labels' : card.category || 'Safety Monitoring';

        conditionKey = card.topic || 'Monitoring & Risks';
        conditionFa = card.topic || 'پایش آزمایشگاهی TDM و تداخلات';
        conditionEn = card.topic || 'TDM & Interaction Checks';

        rawScKey = card.knowledgeTree?.microTopic?.en || 'Critical Safety Rules';
        rawScFa = card.knowledgeTree?.microTopic?.fa || 'هشدارهای حیاتی و جمعیت‌های خاص';
        rawScEn = card.knowledgeTree?.microTopic?.en || 'Special Population Warnings';

        microKey = card.tags?.[0] || 'Safety Node';
        microFa = card.tags?.[0] || 'نکات ایمنی داروها';
        microEn = card.tags?.[0] || 'Safety & Caution Node';
      } else if (perspective === 'calculations') {
        domainKey = 'Clinical Calculations & Pharmacokinetics';
        domainFa = 'محاسبات داروسازی، دوزاژ و فرمولاسیون';
        domainEn = 'Calculations & Pharmacokinetics';

        systemKey = card.category || 'Calculation Category';
        systemFa = card.category || 'انواع محاسبات بالینی و دوز';
        systemEn = card.category || 'Dosing Formula Types';

        conditionKey = card.topic || 'Formula Applications';
        conditionFa = card.topic || 'فرمول‌ها و مسائل محاسباتی';
        conditionEn = card.topic || 'Mathematical Scenarios';

        rawScKey = card.knowledgeTree?.microTopic?.en || 'Calculation Step';
        rawScFa = card.knowledgeTree?.microTopic?.fa || 'گام‌های حل و تبدیل واحدها';
        rawScEn = card.knowledgeTree?.microTopic?.en || 'Conversion & Solving Steps';

        microKey = card.tags?.[0] || 'Math Node';
        microFa = card.tags?.[0] || 'نکات محاسباتی آزمون';
        microEn = card.tags?.[0] || 'Calculation Exam Node';
      } else {
        // Standard Comprehensive View
        domainKey =
          card.knowledgeTree?.domain?.en ||
          card.knowledgeTree?.domain?.fa ||
          card.moduleName?.en ||
          `Module ${card.module}`;
        domainFa = card.knowledgeTree?.domain?.fa || card.moduleName?.fa || `ماژول ${card.module}`;
        domainEn = card.knowledgeTree?.domain?.en || card.moduleName?.en || `Module ${card.module}`;

        systemKey = card.knowledgeTree?.system?.en || card.knowledgeTree?.system?.fa || card.category || 'General Pharmacology';
        systemFa = card.knowledgeTree?.system?.fa || card.category || 'سیستم و مباحث کلان';
        systemEn = card.knowledgeTree?.system?.en || card.category || 'General Organ Systems';

        conditionKey = card.knowledgeTree?.subsystem?.en || card.knowledgeTree?.condition?.en || card.topic || 'Core Therapeutics';
        conditionFa = card.knowledgeTree?.subsystem?.fa || card.knowledgeTree?.condition?.fa || card.topic || 'رده درمانی و بیماری‌ها';
        conditionEn = card.knowledgeTree?.subsystem?.en || card.knowledgeTree?.condition?.en || card.topic || 'Therapeutics & Conditions';

        rawScKey = card.knowledgeTree?.subClass?.en || card.knowledgeTree?.drugGroup?.en || '';
        rawScFa = card.knowledgeTree?.subClass?.fa || card.knowledgeTree?.drugGroup?.fa || '';
        rawScEn = card.knowledgeTree?.subClass?.en || card.knowledgeTree?.drugGroup?.en || '';

        microKey = card.knowledgeTree?.microTopic?.en || (card.tags && card.tags.length > 0 ? card.tags[0] : 'Clinical Pearls');
        microFa = card.knowledgeTree?.microTopic?.fa || (card.tags && card.tags.length > 0 ? card.tags[0] : 'نکات کلیدی و بالینی');
        microEn = card.knowledgeTree?.microTopic?.en || (card.tags && card.tags.length > 0 ? card.tags[0] : 'Clinical Pearls');
      }

      if (!domainMap.has(domainKey)) {
        domainMap.set(domainKey, {
          title: { fa: domainFa, en: domainEn },
          module: card.module,
          systems: new Map(),
        });
      }
      const dEntry = domainMap.get(domainKey)!;

      if (!dEntry.systems.has(systemKey)) {
        dEntry.systems.set(systemKey, {
          title: { fa: systemFa, en: systemEn },
          conditions: new Map(),
        });
      }
      const sEntry = dEntry.systems.get(systemKey)!;

      if (!sEntry.conditions.has(conditionKey)) {
        sEntry.conditions.set(conditionKey, {
          title: { fa: conditionFa, en: conditionEn },
          subClasses: new Map(),
        });
      }
      const cEntry = sEntry.conditions.get(conditionKey)!;

      const isDirect = !rawScKey || rawScKey.toLowerCase().includes('pharmacology') || rawScFa.includes('فارماکولوژی');
      const scKey = isDirect ? '__DIRECT__' : rawScKey;

      if (!cEntry.subClasses.has(scKey)) {
        cEntry.subClasses.set(scKey, {
          title: { fa: isDirect ? conditionFa : rawScFa || conditionFa, en: isDirect ? conditionEn : rawScEn || conditionEn },
          isGeneric: isDirect,
          microTopics: new Map(),
        });
      }
      const scEntry = cEntry.subClasses.get(scKey)!;

      if (!scEntry.microTopics.has(microKey)) {
        scEntry.microTopics.set(microKey, {
          title: { fa: microFa, en: microEn },
          cards: [],
        });
      }
      scEntry.microTopics.get(microKey)!.cards.push(card);
    });

    let domainIdx = 0;

    domainMap.forEach((dVal, dKey) => {
      const domainColor = DOMAIN_COLOR_PALETTES[domainIdx % DOMAIN_COLOR_PALETTES.length];
      domainIdx++;

      const domainCanonical = `DOMAIN_${dKey}`;
      const domainNode: MindMapNode = {
        id: `dom-${dKey}`,
        level: 1,
        parentId: 'root',
        canonicalKey: domainCanonical,
        title: dVal.title,
        module: dVal.module,
        domainName: dKey,
        children: [],
        cardCount: 0,
        dueCount: 0,
        boxCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        colorTheme: domainColor,
        customImage: nodeImages[domainCanonical],
      };

      dVal.systems.forEach((sVal, sKey) => {
        const sysCanonical = `SYSTEM_${sKey}`;
        const sysNode: MindMapNode = {
          id: `sys-${dKey}-${sKey}`,
          level: 2,
          parentId: domainNode.id,
          canonicalKey: sysCanonical,
          title: sVal.title,
          module: dVal.module,
          domainName: dKey,
          systemName: sKey,
          children: [],
          cardCount: 0,
          dueCount: 0,
          boxCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          colorTheme: domainColor,
          customImage: nodeImages[sysCanonical],
        };

        sVal.conditions.forEach((cVal, cKey) => {
          const condCanonical = `COND_${cKey}`;
          const condNode: MindMapNode = {
            id: `cond-${dKey}-${sKey}-${cKey}`,
            level: 3,
            parentId: sysNode.id,
            canonicalKey: condCanonical,
            title: cVal.title,
            module: dVal.module,
            domainName: dKey,
            systemName: sKey,
            subsystemName: cKey,
            children: [],
            cardCount: 0,
            dueCount: 0,
            boxCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            colorTheme: domainColor,
            customImage: nodeImages[condCanonical],
          };

          cVal.subClasses.forEach((scVal, scKey) => {
            let parentContainer: MindMapNode = condNode;

            if (!scVal.isGeneric) {
              const scCanonical = `SUBCLASS_${scKey}`;
              const scNode: MindMapNode = {
                id: `sc-${dKey}-${sKey}-${cKey}-${scKey}`,
                level: 4,
                parentId: condNode.id,
                canonicalKey: scCanonical,
                title: scVal.title,
                module: dVal.module,
                domainName: dKey,
                systemName: sKey,
                subsystemName: cKey,
                subClassName: scKey,
                children: [],
                cardCount: 0,
                dueCount: 0,
                boxCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                colorTheme: domainColor,
                customImage: nodeImages[scCanonical],
              };
              condNode.children.push(scNode);
              parentContainer = scNode;
            }

            scVal.microTopics.forEach((mVal, mKey) => {
              const microCanonical = `MICRO_${mKey}`;
              const microNode: MindMapNode = {
                id: `micro-${dKey}-${sKey}-${cKey}-${scKey}-${mKey}`,
                level: 5,
                parentId: parentContainer.id,
                canonicalKey: microCanonical,
                title: mVal.title,
                module: dVal.module,
                domainName: dKey,
                systemName: sKey,
                subsystemName: cKey,
                subClassName: scKey !== '__DIRECT__' ? scKey : undefined,
                microTopicName: mKey,
                children: [],
                cardCount: 0,
                dueCount: 0,
                boxCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
                colorTheme: domainColor,
                customImage: nodeImages[microCanonical],
              };

              const nowIso = new Date().toISOString();

              mVal.cards.forEach((card) => {
                const isDue = !card.nextReviewDate || card.nextReviewDate <= nowIso;
                microNode.cardCount++;
                if (isDue) microNode.dueCount++;
                microNode.boxCounts[card.box]++;

                const qFa = typeof card.question === 'object' ? card.question.fa || card.question.en : card.question;
                const qEn = typeof card.question === 'object' ? card.question.en || card.question.fa : card.question;
                const cardCanonical = `CARD_${card.id}`;

                const qNode: MindMapNode = {
                  id: `card-${card.id}`,
                  level: 6,
                  parentId: microNode.id,
                  canonicalKey: cardCanonical,
                  title: {
                    fa: qFa || 'سوال بالینی',
                    en: qEn || 'Clinical Flashcard',
                  },
                  module: card.module,
                  domainName: dKey,
                  systemName: sKey,
                  subsystemName: cKey,
                  microTopicName: mKey,
                  card,
                  children: [],
                  cardCount: 1,
                  dueCount: isDue ? 1 : 0,
                  boxCounts: {
                    1: card.box === 1 ? 1 : 0,
                    2: card.box === 2 ? 1 : 0,
                    3: card.box === 3 ? 1 : 0,
                    4: card.box === 4 ? 1 : 0,
                    5: card.box === 5 ? 1 : 0,
                  },
                  colorTheme: domainColor,
                  customImage: nodeImages[cardCanonical],
                };
                microNode.children.push(qNode);
              });

              parentContainer.children.push(microNode);
              parentContainer.cardCount += microNode.cardCount;
              parentContainer.dueCount += microNode.dueCount;
              for (let b = 1; b <= 5; b++) {
                parentContainer.boxCounts[b as 1 | 2 | 3 | 4 | 5] += microNode.boxCounts[b as 1 | 2 | 3 | 4 | 5];
              }
            });

            if (!scVal.isGeneric && parentContainer !== condNode) {
              condNode.cardCount += parentContainer.cardCount;
              condNode.dueCount += parentContainer.dueCount;
              for (let b = 1; b <= 5; b++) {
                condNode.boxCounts[b as 1 | 2 | 3 | 4 | 5] += parentContainer.boxCounts[b as 1 | 2 | 3 | 4 | 5];
              }
            }
          });

          sysNode.children.push(condNode);
          sysNode.cardCount += condNode.cardCount;
          sysNode.dueCount += condNode.dueCount;
          for (let b = 1; b <= 5; b++) {
            sysNode.boxCounts[b as 1 | 2 | 3 | 4 | 5] += condNode.boxCounts[b as 1 | 2 | 3 | 4 | 5];
          }
        });

        domainNode.children.push(sysNode);
        domainNode.cardCount += sysNode.cardCount;
        domainNode.dueCount += sysNode.dueCount;
        for (let b = 1; b <= 5; b++) {
          domainNode.boxCounts[b as 1 | 2 | 3 | 4 | 5] += sysNode.boxCounts[b as 1 | 2 | 3 | 4 | 5];
        }
      });

      rootNode.children.push(domainNode);
      rootNode.dueCount += domainNode.dueCount;
      for (let b = 1; b <= 5; b++) {
        rootNode.boxCounts[b as 1 | 2 | 3 | 4 | 5] += domainNode.boxCounts[b as 1 | 2 | 3 | 4 | 5];
      }
    });

    return rootNode;
  }, [filteredCards, perspective, nodeImages]);

  // Compute Breadcrumb Trail and Effective Active MindMap Root Node
  const { mindMapTree, breadcrumbs } = useMemo(() => {
    if (!focalNodeId) {
      return { mindMapTree: fullMindMapTree, breadcrumbs: [] };
    }
    const searchRes = findNodeAndPath(fullMindMapTree, focalNodeId);
    if (!searchRes.node) {
      return { mindMapTree: fullMindMapTree, breadcrumbs: [] };
    }

    // Clone the focal node to become the temporary visible root
    const clonedFocalRoot: MindMapNode = {
      ...searchRes.node,
      level: 0,
      parentId: undefined,
    };

    const trail = searchRes.path.map((n) => ({
      id: n.id,
      title: n.title,
    }));

    return { mindMapTree: clonedFocalRoot, breadcrumbs: trail };
  }, [fullMindMapTree, focalNodeId]);

  // Memoized recursive card mapping for high-performance matrix and outliner rendering (prevents UI freeze)
  const nodeCardsMap = useMemo(() => {
    const map: Record<string, LeitnerCard[]> = {};
    function populate(node: MindMapNode): LeitnerCard[] {
      const list: LeitnerCard[] = [];
      if (node.level === 6 && node.card) {
        list.push(node.card);
      }
      for (const ch of node.children) {
        list.push(...populate(ch));
      }
      map[node.id] = list;
      return list;
    }
    populate(mindMapTree);
    return map;
  }, [mindMapTree]);

  // Fast O(1) Helper to collect cards under node
  const collectCardsUnderNode = useCallback((node: MindMapNode): LeitnerCard[] => {
    return nodeCardsMap[node.id] || [];
  }, [nodeCardsMap]);

  // Open Sequential Study Runner
  const handleStartStudyRunner = useCallback(
    (node: MindMapNode) => {
      const subCards = collectCardsUnderNode(node);
      setBranchRunnerState({
        isOpen: true,
        node,
        cards: subCards,
      });
    },
    [collectCardsUnderNode]
  );

  // Compute Layout (Nodes & Curved Connections)
  const layoutResult = useMemo(() => {
    return computeMindMapLayout(
      mindMapTree,
      expandedNodeIds,
      textDisplayMode,
      cardLangMode,
      lineStyle,
      true,
      viewMode
    );
  }, [mindMapTree, expandedNodeIds, textDisplayMode, cardLangMode, lineStyle, viewMode]);

  // Toggle node expand/collapse
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodeIds((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  }, []);

  const expandAll = useCallback(() => {
    const all: Record<string, boolean> = {};
    const traverse = (n: MindMapNode) => {
      all[n.id] = true;
      n.children.forEach(traverse);
    };
    traverse(mindMapTree);
    setExpandedNodeIds(all);
  }, [mindMapTree]);

  const collapseAll = useCallback(() => {
    setExpandedNodeIds({ [mindMapTree.id]: true });
  }, [mindMapTree.id]);

  // Toggle multi-color flag
  const toggleFlagFilter = (flag: string) => {
    setSelectedFlagFilters((prev) => {
      if (prev.includes(flag)) {
        return prev.filter((f) => f !== flag);
      } else {
        return [...prev, flag];
      }
    });
  };

  // Export Mind Map to JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(mindMapTree, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `AU_Pharmacy_MindMap_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // =========================================================================
  // RENDER: OUTLINER TREE VIEW (FULL TEXT DISPLAY)
  // =========================================================================
  const renderOutlinerNode = (node: MindMapNode, depth: number = 0) => {
    const isExpanded = !!expandedNodeIds[node.id];
    const hasChildren = node.children.length > 0;
    const themeKey = getNodeColorTheme(node);
    const theme = MINDMAP_THEMES[themeKey] || MINDMAP_THEMES.purple;
    const displayTitle = getNodeDisplayTitle(node);

    // Leaf Question Card
    if (node.level === 6 && node.card) {
      const card = node.card;
      const isRevealed = !!revealedAnswerIds[card.id];
      const qObj = extractCardBilingualText(
        card.question,
        (card as any).questionFa || (card as any).qFa,
        (card as any).questionEn || (card as any).qEn
      );
      const aObj = extractCardBilingualText(
        card.answer,
        (card as any).answerFa || (card as any).aFa,
        (card as any).answerEn || (card as any).aEn
      );
      const pObj = extractCardBilingualText(
        card.pearl,
        (card as any).pearlFa || (card as any).pFa,
        (card as any).pearlEn || (card as any).pEn
      );
      const flag = cardFlags[card.id];
      const flagInfo = flag ? FLAG_OPTIONS[flag] : null;

      return (
        <div
          key={node.id}
          className={`rounded-2xl border transition-all duration-200 overflow-hidden mb-3 ${
            isRevealed
              ? 'bg-slate-900 border-purple-500/60 shadow-xl ring-1 ring-purple-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
          }`}
          onContextMenu={(e) => handleOpenContextMenu(e, node)}
        >
          <div
            onClick={() => setRevealedAnswerIds((prev) => ({ ...prev, [card.id]: !prev[card.id] }))}
            className="p-3.5 sm:p-4 flex items-start justify-between gap-3 cursor-pointer select-none"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0 mt-0.5">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
              </div>

              {/* Text Display Based on Active Mind Map Language Mode */}
              <div className="space-y-1.5 flex-1 min-w-0">
                {cardLangMode === 'bilingual' ? (
                  <div className="space-y-1">
                    <div className="font-bold text-xs sm:text-sm text-slate-100 leading-relaxed break-words" dir="rtl">
                      {qObj.fa}
                    </div>
                    {qObj.en && qObj.en !== qObj.fa && (
                      <div className="font-medium text-[11px] sm:text-xs text-purple-300 leading-relaxed font-sans border-t border-slate-800/80 pt-1 break-words" dir="ltr">
                        {qObj.en}
                      </div>
                    )}
                  </div>
                ) : cardLangMode === 'fa' ? (
                  <div className="font-bold text-xs sm:text-sm text-slate-100 leading-relaxed break-words" dir="rtl">
                    {qObj.fa || qObj.en}
                  </div>
                ) : (
                  <div className="font-semibold text-xs sm:text-sm text-slate-100 leading-relaxed font-sans break-words" dir="ltr">
                    {qObj.en || qObj.fa}
                  </div>
                )}

                <div className="flex items-center flex-wrap gap-2 pt-1 text-[10px]">
                  {flagInfo && (
                    <span className={`px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 ${flagInfo.badge}`}>
                      <Flag className="w-3 h-3 fill-current" />
                      <span>{isFa ? flagInfo.name.fa : flagInfo.name.en}</span>
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold">
                    {isFa ? `جعبه ${card.box}` : `Box ${card.box}`}
                  </span>
                  <span className="text-slate-400 font-mono">#{card.topic || 'Clinical'}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedQuestionCard(card);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title={isFa ? 'مشاهده در پنجره اختصاصی' : 'Open Detail Modal'}
              >
                <Eye className="w-4 h-4 text-cyan-400" />
              </button>

              {onDeleteCard && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(isFa ? 'حذف این فلش‌کارت؟' : 'Delete card?')) onDeleteCard(card.id);
                  }}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-slate-700 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Revealed Answer */}
          {isRevealed && (
            <div className="p-4 border-t border-purple-500/20 bg-purple-950/20 space-y-3 text-xs animate-in fade-in">
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-purple-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isFa ? 'پاسخ بالینی و استدلال:' : 'Target Answer:'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 leading-relaxed">
                  {cardLangMode === 'bilingual' ? (
                    <div className="space-y-2">
                      <div dir="rtl" className="whitespace-pre-line leading-relaxed">{aObj.fa}</div>
                      {aObj.en && aObj.en !== aObj.fa && (
                        <div dir="ltr" className="font-sans whitespace-pre-line text-purple-200/90 pt-2 border-t border-slate-800 leading-relaxed">
                          {aObj.en}
                        </div>
                      )}
                    </div>
                  ) : cardLangMode === 'fa' ? (
                    <div dir="rtl" className="whitespace-pre-line leading-relaxed">{aObj.fa || aObj.en}</div>
                  ) : (
                    <div dir="ltr" className="font-sans whitespace-pre-line leading-relaxed">{aObj.en || aObj.fa}</div>
                  )}
                </div>
              </div>

              {(pObj.fa || pObj.en) && (
                <div className="p-3 rounded-xl bg-amber-950/25 border border-amber-500/30 text-amber-200 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-[11px] text-amber-400">
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isFa ? 'نکته کلیدی و مروارید بالینی (Pearl):' : 'Key Pearl:'}</span>
                  </div>
                  {cardLangMode === 'bilingual' ? (
                    <div className="space-y-1">
                      <div dir="rtl" className="text-xs leading-relaxed">{pObj.fa}</div>
                      {pObj.en && pObj.en !== pObj.fa && (
                        <div dir="ltr" className="font-sans text-[11.5px] text-amber-300/90 pt-1 border-t border-amber-500/20 leading-relaxed">{pObj.en}</div>
                      )}
                    </div>
                  ) : (
                    <div dir={cardLangMode === 'fa' ? 'rtl' : 'ltr'}>{cardLangMode === 'fa' ? pObj.fa || pObj.en : pObj.en || pObj.fa}</div>
                  )}
                </div>
              )}

              {/* LEITNER SM-2 RATING CONTROLS IN OUTLINER */}
              {showLeitnerGrading && onRateCard && (
                <div className="pt-2.5 border-t border-purple-500/30 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span className="flex items-center gap-1.5 text-purple-300">
                      <Layers className="w-3.5 h-3.5" />
                      <span>{isFa ? 'ارزیابی و ثبت مستقیم در جعبه لایتنر:' : 'Leitner Spaced Review Rating:'}</span>
                    </span>
                    {ratedCardMap[card.id] && (
                      <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/40 animate-in fade-in">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isFa ? `ثبت شد: ${ratedCardMap[card.id].rating}` : `Rated: ${ratedCardMap[card.id].rating}`}</span>
                      </span>
                    )}
                  </div>

                  {/* 4 Leitner / Anki Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRateCard(card.id, 'again');
                        setRatedCardMap((prev) => ({
                          ...prev,
                          [card.id]: { rating: isFa ? 'تکرار / جعبه ۱' : 'Again / Box 1', timestamp: Date.now() },
                        }));
                      }}
                      className="p-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 border border-rose-500/40 text-rose-200 text-center transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <span className="text-xs font-bold">{isFa ? 'تکرار (نادرست)' : 'Again'}</span>
                      <span className="text-[9px] text-rose-300/80 font-mono">{isFa ? 'جعبه ۱ (فردا)' : 'Box 1 (1d)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRateCard(card.id, 'hard');
                        setRatedCardMap((prev) => ({
                          ...prev,
                          [card.id]: { rating: isFa ? 'سخت' : 'Hard', timestamp: Date.now() },
                        }));
                      }}
                      className="p-2 rounded-xl bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-center transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <span className="text-xs font-bold">{isFa ? 'سخت (با تردید)' : 'Hard'}</span>
                      <span className="text-[9px] text-amber-300/80 font-mono">{isFa ? `جعبه ${card.box} (+۲ روز)` : `Box ${card.box} (+2d)`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRateCard(card.id, 'good');
                        setRatedCardMap((prev) => ({
                          ...prev,
                          [card.id]: { rating: isFa ? 'خوب' : 'Good', timestamp: Date.now() },
                        }));
                      }}
                      className="p-2 rounded-xl bg-blue-950/60 hover:bg-blue-900 border border-blue-500/40 text-blue-200 text-center transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <span className="text-xs font-bold">{isFa ? 'خوب (درست)' : 'Good'}</span>
                      <span className="text-[9px] text-blue-300/80 font-mono">{isFa ? `جعبه ${Math.min(5, card.box + 1)} (+۶ روز)` : `Box ${Math.min(5, card.box + 1)} (+6d)`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRateCard(card.id, 'easy');
                        setRatedCardMap((prev) => ({
                          ...prev,
                          [card.id]: { rating: isFa ? 'آسان' : 'Easy', timestamp: Date.now() },
                        }));
                      }}
                      className="p-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 text-center transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-sm active:scale-95"
                    >
                      <span className="text-xs font-bold">{isFa ? 'آسان (مسلط)' : 'Easy'}</span>
                      <span className="text-[9px] text-emerald-300/80 font-mono">{isFa ? `جعبه ${Math.min(5, card.box + 2)} (+۱۴ روز)` : `Box ${Math.min(5, card.box + 2)} (+14d)`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Branch Node
    return (
      <div key={node.id} className="space-y-2 mb-2">
        <div
          onClick={() => toggleNode(node.id)}
          onContextMenu={(e) => handleOpenContextMenu(e, node)}
          className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
            node.level === 0
              ? 'bg-purple-950/50 border-purple-500/80 shadow-lg'
              : node.level === 1
              ? `border ${theme.border} ${theme.bg} shadow-md`
              : node.level === 2
              ? 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600'
              : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
          }`}
          style={{ marginLeft: `${Math.min(depth * 16, 80)}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {hasChildren && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleNode(node.id);
                }}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 transition"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isExpanded ? 'rotate-0 text-purple-400' : '-rotate-90'
                  }`}
                />
              </button>
            )}

            <span className={`w-2.5 h-2.5 rounded-full ${theme.dot} shrink-0`} />

            <span className={`font-black text-xs sm:text-sm truncate ${theme.text}`}>
              {displayTitle}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {node.customImage && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setImageViewerModal({
                    isOpen: true,
                    image: node.customImage!,
                    title: displayTitle,
                  });
                }}
                className="p-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1 hover:bg-purple-500/40 transition"
                title={isFa ? 'مشاهده تصویر پیوست' : 'View Image'}
              >
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setBranchExportModal({
                  isOpen: true,
                  node,
                });
              }}
              className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 transition"
              title={isFa ? 'کپی مطالب شاخه برای هوش مصنوعی و اینفوگرافیک' : 'Export AI Infographic Prompt'}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            </button>

            <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-md bg-black/40 text-slate-300 border border-slate-700">
              {node.cardCount} {isFa ? 'کارت' : 'cards'}
            </span>

            {node.level > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFocalNodeId(node.id);
                }}
                className="px-2 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 text-purple-300 border border-purple-500/30 text-[10px] font-bold flex items-center gap-1 transition"
                title={isFa ? 'تمرکز و تبدیل این شاخه به ریشه مستقل' : 'Focus as Root'}
              >
                <Target className="w-3 h-3 text-purple-400" />
                <span className="hidden sm:inline">{isFa ? 'تمرکز' : 'Focus'}</span>
              </button>
            )}

            {hasChildren && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartStudyRunner(node);
                }}
                className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 border border-purple-500/30 transition"
                title={isFa ? 'مرور این شاخه' : 'Drill Branch'}
              >
                <Play className="w-3.5 h-3.5 text-purple-400" />
              </button>
            )}
          </div>
        </div>

        {/* Children Render */}
        {isExpanded && hasChildren && (
          <div className="space-y-1 pl-2 sm:pl-4 border-l border-slate-800/80">
            {node.children.map((child) => renderOutlinerNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="space-y-3.5">
      {/* 1. TOP PERSPECTIVE SELECTOR BAR (6 Master Clinical Perspectives) */}
      <div className="p-2 sm:p-3 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-bold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-purple-400" />
            <span>{isFa ? 'دیدگاه ساختار نقشه ذهنی (Perspective):' : 'Mind Map Clinical Perspective:'}</span>
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {filteredCards.length} {isFa ? 'کارت لایتنر' : 'active flashcards'}
          </span>
        </div>

        {/* Horizontal Perspective Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {MINDMAP_PERSPECTIVES.map((p) => {
            const IconComp = p.icon;
            const isActive = perspective === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPerspective(p.id);
                  setFocalNodeId(null); // Reset focal zoom when changing perspective
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isActive
                    ? `bg-linear-to-r ${p.gradient} text-white shadow-lg shadow-purple-500/25 ring-1 ring-white/30 scale-102`
                    : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
                title={isFa ? p.desc.fa : p.desc.en}
              >
                <IconComp className="w-3.5 h-3.5" />
                <span>{isFa ? p.name.fa : p.name.en}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. BREADCRUMB NAVIGATION & FOCAL NODE CONTROLS (Active when drilled down) */}
      {focalNodeId && (
        <div className="p-2.5 px-4 rounded-2xl bg-linear-to-r from-purple-950/80 via-slate-900 to-indigo-950/80 border border-purple-500/50 shadow-md flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <button
              type="button"
              onClick={() => setFocalNodeId(null)}
              className="p-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/60 text-purple-200 font-bold flex items-center gap-1 transition cursor-pointer"
              title={isFa ? 'بازگشت به کل نقشه' : 'Reset to Full Map'}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{isFa ? 'کل نقشه' : 'Full Map'}</span>
            </button>

            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.id || idx}>
                <ChevronLeft className="w-3.5 h-3.5 text-slate-500 rtl:rotate-0 ltr:rotate-180 shrink-0" />
                <button
                  type="button"
                  onClick={() => setFocalNodeId(crumb.id === 'root' ? null : crumb.id)}
                  className={`font-bold truncate max-w-[180px] sm:max-w-xs transition ${
                    idx === breadcrumbs.length - 1
                      ? 'text-cyan-300 underline underline-offset-4'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isFa ? crumb.title.fa || crumb.title.en : crumb.title.en || crumb.title.fa}
                </button>
              </React.Fragment>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setFocalNodeId(null)}
            className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            <span>{isFa ? 'خروج از تمرکز' : 'Exit Focus'}</span>
          </button>
        </div>
      )}

      {/* 3. MAIN MIND MAP VIEWS */}
      {viewMode === 'outliner_tree' ? (
        /* Outliner Tree View */
        <div className="p-3 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-inner space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ListTree className="w-4 h-4 text-purple-400" />
              <h3 className="text-xs sm:text-sm font-black text-slate-100">
                {isFa ? 'نمای درختی آوت‌لاینر (مطالعه پیوسته)' : 'Outliner Hierarchy View'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600 hover:text-white transition cursor-pointer"
              >
                {isFa ? '➕ باز کردن همه' : 'Expand All'}
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition cursor-pointer"
              >
                {isFa ? '➖ بستن همه' : 'Collapse All'}
              </button>
            </div>
          </div>
          {renderOutlinerNode(mindMapTree, 0)}
        </div>
      ) : (
        /* Interactive Canvas / Radial 360 / Vertical Tree Views */
        <MindMapCanvas
          language={language}
          layoutItems={layoutResult.items}
          layoutLinks={layoutResult.links}
          bounds={layoutResult.bounds}
          expandedNodeIds={expandedNodeIds}
          onToggleNode={toggleNode}
          onOpenContextMenu={handleOpenContextMenu}
          onSelectQuestionCard={(card) => setSelectedQuestionCard(card)}
          onStartStudyBranch={handleStartStudyRunner}
          getNodeDisplayTitle={getNodeDisplayTitle}
          cardFlags={cardFlags}
          cardLangMode={cardLangMode}
          onSetCardLangMode={(m) => setCardLangMode(m)}
          textDisplayMode={textDisplayMode}
          onSetTextDisplayMode={(m) => setTextDisplayMode(m)}
          lineStyle={lineStyle}
          onSetLineStyle={(s) => setLineStyle(s)}
          viewMode={viewMode}
          onSetViewMode={(m) => setViewMode(m)}
          isDarkTheme={true}
          onOpenSettings={() => setIsMindMapSettingsOpen(true)}
          onExpandAll={expandAll}
          onCollapseAll={collapseAll}
          onViewImage={(img, title) => setImageViewerModal({ isOpen: true, image: img, title })}
        >
          {/* Node Context Menu & Mobile Action Sheet */}
          {contextMenu.isOpen && contextMenu.node && (
            <>
              {/* Backdrop for easy dismiss on mobile and click outside */}
              <div
                className="fixed inset-0 z-[99998] bg-black/60 sm:bg-black/20 backdrop-blur-xs transition-opacity"
                onClick={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
              />

              <div
                style={
                  typeof window !== 'undefined' && window.innerWidth >= 640
                    ? {
                        position: 'fixed',
                        top: `${contextMenu.y}px`,
                        left: `${contextMenu.x}px`,
                        zIndex: 99999,
                      }
                    : {
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        zIndex: 99999,
                      }
                }
                className="w-full sm:w-72 p-3.5 sm:p-2 rounded-t-3xl sm:rounded-2xl bg-slate-900/98 sm:bg-slate-900/95 border-t sm:border border-purple-500/60 shadow-2xl backdrop-blur-xl space-y-1.5 sm:space-y-1 text-xs max-h-[85vh] sm:max-h-none overflow-y-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Mobile Drawer Pull Indicator */}
                <div className="w-10 h-1 rounded-full bg-slate-700 mx-auto mb-1 sm:hidden" />

                <div className="p-2 border-b border-slate-800 text-slate-200 font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    <span className="p-1 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
                      {contextMenu.node.customImage ? '🖼️' : '🌿'}
                    </span>
                    <span className="truncate text-xs">{getNodeDisplayTitle(contextMenu.node)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Set as Focal Root Button */}
                {contextMenu.node.level > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setFocalNodeId(contextMenu.node!.id);
                      setContextMenu((prev) => ({ ...prev, isOpen: false }));
                    }}
                    className="w-full p-2.5 sm:px-3 sm:py-2 rounded-xl hover:bg-purple-600/30 text-purple-200 text-xs font-bold flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Target className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>{isFa ? '🎯 تمرکز روی این شاخه (Focal Center)' : 'Focus Sub-branch as Root'}</span>
                  </button>
                )}

                {/* Copy Branch Content for AI & Infographics */}
                <button
                  type="button"
                  onClick={() => {
                    setBranchExportModal({
                      isOpen: true,
                      node: contextMenu.node,
                    });
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full p-2.5 sm:px-3 sm:py-2 rounded-xl hover:bg-purple-600/25 text-purple-200 text-xs font-bold flex items-center gap-2.5 transition cursor-pointer bg-purple-950/40 border border-purple-500/30"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>{isFa ? '📋 کپی مطالب شاخه (پرامپت هوش مصنوعی/اینفوگرافیک)' : 'Copy Branch (AI Infographic Prompt)'}</span>
                </button>

                {/* Attach / Edit Image */}
                <button
                  type="button"
                  onClick={() => {
                    setNodeImageModal({
                      isOpen: true,
                      node: contextMenu.node,
                    });
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full p-2.5 sm:px-3 sm:py-2 rounded-xl hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-2.5 transition cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    {contextMenu.node.customImage
                      ? (isFa ? '🖼️ ویرایش تصویر پیوست شاخه' : 'Edit Attached Image')
                      : (isFa ? '🖼️ افزودن تصویر به شاخه' : 'Attach Image to Branch')}
                  </span>
                </button>

                {/* If node has an image, offer view fullscreen */}
                {contextMenu.node.customImage && (
                  <button
                    type="button"
                    onClick={() => {
                      setImageViewerModal({
                        isOpen: true,
                        image: contextMenu.node!.customImage!,
                        title: getNodeDisplayTitle(contextMenu.node!),
                      });
                      setContextMenu((prev) => ({ ...prev, isOpen: false }));
                    }}
                    className="w-full p-2.5 sm:px-3 sm:py-2 rounded-xl hover:bg-slate-800 text-cyan-300 text-xs font-medium flex items-center gap-2.5 transition cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span>{isFa ? '🔍 مشاهده تصویر بزرگ' : 'View Full Image'}</span>
                  </button>
                )}

                {/* Study Runner Action */}
                <button
                  type="button"
                  onClick={() => {
                    handleStartStudyRunner(contextMenu.node!);
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full p-2.5 sm:px-3 sm:py-2 rounded-xl hover:bg-slate-800 text-emerald-300 text-xs font-bold flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Play className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{isFa ? 'مرور پیوسته فلش‌کارت‌ها' : 'Drill Flashcards'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRenameModal({
                      isOpen: true,
                      node: contextMenu.node,
                      currentText: getNodeDisplayTitle(contextMenu.node!),
                    });
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full p-2.5 sm:px-3 sm:py-2 rounded-xl hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Pencil className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>{isFa ? 'تغییر نام شاخه (Alias)' : 'Rename Branch Alias'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setColorPickerModal({
                      isOpen: true,
                      node: contextMenu.node,
                    });
                    setContextMenu((prev) => ({ ...prev, isOpen: false }));
                  }}
                  className="w-full p-2.5 sm:px-3 sm:py-2 rounded-xl hover:bg-slate-800 text-slate-200 text-xs font-medium flex items-center gap-2.5 transition cursor-pointer"
                >
                  <Palette className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{isFa ? 'انتخاب رنگ شاخه' : 'Change Color Palette'}</span>
                </button>
              </div>
            </>
          )}
        </MindMapCanvas>
      )}

      {/* Shared Modals */}
      {selectedQuestionCard && (
        <QuestionDetailModal
          isOpen={!!selectedQuestionCard}
          onClose={() => setSelectedQuestionCard(null)}
          card={selectedQuestionCard}
          cardImage={nodeImages[`CARD_${selectedQuestionCard.id}`]}
          onOpenImageModal={() => {
            const qFa = typeof selectedQuestionCard.question === 'object' ? selectedQuestionCard.question.fa || selectedQuestionCard.question.en : selectedQuestionCard.question;
            const qEn = typeof selectedQuestionCard.question === 'object' ? selectedQuestionCard.question.en || selectedQuestionCard.question.fa : selectedQuestionCard.question;
            const cardNode: MindMapNode = {
              id: `card-${selectedQuestionCard.id}`,
              level: 6,
              canonicalKey: `CARD_${selectedQuestionCard.id}`,
              title: {
                fa: qFa || 'سوال بالینی',
                en: qEn || 'Clinical Flashcard',
              },
              card: selectedQuestionCard,
              children: [],
              cardCount: 1,
              dueCount: 0,
              boxCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
              colorTheme: 'purple',
              customImage: nodeImages[`CARD_${selectedQuestionCard.id}`],
            };
            setNodeImageModal({ isOpen: true, node: cardNode });
          }}
          onViewImage={(img) =>
            setImageViewerModal({
              isOpen: true,
              image: img,
              title: selectedQuestionCard.topic || 'Clinical Reference',
            })
          }
          language={language}
          cardLangMode={cardLangMode}
          cardFlags={cardFlags}
          onSetCardFlag={handleSetCardFlag}
          onRateCard={onRateCard}
          showLeitnerGrading={showLeitnerGrading}
        />
      )}

      {branchRunnerState.isOpen && branchRunnerState.node && (
        <BranchStudyRunnerModal
          isOpen={branchRunnerState.isOpen}
          onClose={() => setBranchRunnerState({ isOpen: false, node: null, cards: [] })}
          node={branchRunnerState.node}
          cards={branchRunnerState.cards}
          language={language}
          cardLangMode={cardLangMode}
          cardFlags={cardFlags}
          onSetCardFlag={handleSetCardFlag}
          onRateCard={onRateCard}
          onUpdateCardBox={onUpdateCardBox}
        />
      )}

      {renameModal.isOpen && (
        <RenameNodeModal
          isOpen={renameModal.isOpen}
          onClose={() => setRenameModal({ isOpen: false, node: null, currentText: '' })}
          node={renameModal.node}
          currentText={renameModal.currentText}
          onSave={handleSaveAlias}
          onReset={handleResetAlias}
          language={language}
        />
      )}

      {colorPickerModal.isOpen && (
        <ColorPickerModal
          isOpen={colorPickerModal.isOpen}
          onClose={() => setColorPickerModal({ isOpen: false, node: null })}
          node={colorPickerModal.node}
          onSaveColor={handleSaveColor}
          language={language}
        />
      )}

      {branchExportModal.isOpen && (
        <BranchExportModal
          isOpen={branchExportModal.isOpen}
          onClose={() => setBranchExportModal({ isOpen: false, node: null })}
          node={branchExportModal.node}
          language={language}
          nodeImages={nodeImages}
          onOpenAiGenerator={onOpenAiGenerator}
        />
      )}

      {nodeImageModal.isOpen && (
        <NodeImageModal
          isOpen={nodeImageModal.isOpen}
          onClose={() => setNodeImageModal({ isOpen: false, node: null })}
          node={nodeImageModal.node}
          currentImage={nodeImageModal.node ? nodeImages[nodeImageModal.node.canonicalKey] : null}
          onSaveImage={handleSaveNodeImage}
          language={language}
        />
      )}

      {imageViewerModal.isOpen && (
        <ImageViewerModal
          isOpen={imageViewerModal.isOpen}
          onClose={() => setImageViewerModal({ isOpen: false, image: null, title: '' })}
          image={imageViewerModal.image}
          title={imageViewerModal.title}
          language={language}
        />
      )}

      <MindMapSettingsModal
        isOpen={isMindMapSettingsOpen}
        onClose={() => setIsMindMapSettingsOpen(false)}
        language={language}
        viewMode={viewMode}
        onChangeViewMode={(mode) => setViewMode(mode)}
        lineStyle={lineStyle}
        onChangeLineStyle={(style) => setLineStyle(style)}
        textDisplayMode={textDisplayMode}
        onChangeTextDisplayMode={(mode) => setTextDisplayMode(mode)}
        filterModule={filterModule}
        onChangeFilterModule={(mod) => setFilterModule(mod)}
        filterBox={filterBox}
        onChangeFilterBox={(box) => setFilterBox(box)}
        selectedFlagFilters={selectedFlagFilters as any}
        onToggleFlagFilter={(flag) => toggleFlagFilter(flag)}
        onResetFlagFilters={() => setSelectedFlagFilters([])}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onExportJson={handleExportJson}
        totalNodesCount={cards.length}
      />
    </div>
  );
};
