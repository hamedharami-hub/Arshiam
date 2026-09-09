'use client';

import React, { useState } from 'react';
import { Language } from '@/types/pharmacy';
import {
  MindMapViewMode,
  MindMapLineStyle,
  MindMapTextDisplay,
} from '@/types/mindmap';
import { FlagColor, FLAG_OPTIONS } from '@/components/LeitnerMindMapPanel';
import {
  Settings,
  X,
  Network,
  ListTree,
  BookOpen,
  Layers,
  Sparkles,
  Sliders,
  Filter,
  Flag,
  FolderTree,
  Check,
  Download,
  FolderOpen,
  Folder,
  RotateCcw,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

interface MindMapSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  // Current values
  viewMode: MindMapViewMode;
  onChangeViewMode: (mode: MindMapViewMode) => void;
  lineStyle: MindMapLineStyle;
  onChangeLineStyle: (style: MindMapLineStyle) => void;
  textDisplayMode: MindMapTextDisplay;
  onChangeTextDisplayMode: (mode: MindMapTextDisplay) => void;
  filterModule: number | 'ALL';
  onChangeFilterModule: (mod: number | 'ALL') => void;
  filterBox: number | 'ALL';
  onChangeFilterBox: (box: number | 'ALL') => void;
  selectedFlagFilters: FlagColor[];
  onToggleFlagFilter: (flag: FlagColor) => void;
  onResetFlagFilters: () => void;
  // Quick Actions
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  onExportJson?: () => void;
  totalNodesCount?: number;
}

export const MindMapSettingsModal: React.FC<MindMapSettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  viewMode,
  onChangeViewMode,
  lineStyle,
  onChangeLineStyle,
  textDisplayMode,
  onChangeTextDisplayMode,
  filterModule,
  onChangeFilterModule,
  filterBox,
  onChangeFilterBox,
  selectedFlagFilters,
  onToggleFlagFilter,
  onResetFlagFilters,
  onExpandAll,
  onCollapseAll,
  onExportJson,
  totalNodesCount,
}) => {
  const isFa = language === 'fa';
  const [activeTab, setActiveTab] = useState<'layout' | 'style' | 'filters' | 'tools'>('layout');

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="app-card border app-border rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        dir={isFa ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b app-border flex items-center justify-between gap-3 bg-slate-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center shadow-inner shrink-0">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black app-text">
                {isFa ? 'تنظیمات نقشه ذهنی' : 'Mind Map Settings'}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl app-bg hover:bg-black/10 dark:hover:bg-slate-800 app-text border app-border transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b app-border app-bg p-1.5 gap-1 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('layout')}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'layout'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'app-muted hover:app-text hover:bg-black/5 dark:hover:bg-slate-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{isFa ? 'چیدمان و ساختار' : 'Layout & Views'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('style')}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'style'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'app-muted hover:app-text hover:bg-black/5 dark:hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{isFa ? 'خطوط و متن' : 'Lines & Display'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('filters')}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'filters'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'app-muted hover:app-text hover:bg-black/5 dark:hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{isFa ? 'فیلترها و پرچم‌ها' : 'Filters & Flags'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tools')}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'tools'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'app-muted hover:app-text hover:bg-black/5 dark:hover:bg-slate-800'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>{isFa ? 'عملیات و ابزارها' : 'Actions & Tools'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs">
          {/* TAB 1: LAYOUT & VIEWS */}
          {activeTab === 'layout' && (
            <div className="space-y-3">
              <label className="font-bold app-text flex items-center gap-1.5 text-sm">
                <Network className="w-4 h-4 text-purple-400" />
                <span>{isFa ? 'نوع چیدمان و ساختار بصری نقشه ذهنی:' : 'Select Mind Map Structure Format:'}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    id: 'interactive_canvas' as MindMapViewMode,
                    title: isFa ? '🌐 گراف افقی تعاملی (Horizontal Flow)' : '🌐 Horizontal Canvas',
                    desc: isFa ? 'چیدمان استاندارد و مدرن شاخه‌ای با زوم نامحدود' : 'Standard horizontal branching layout',
                  },
                  {
                    id: 'radial_circle' as MindMapViewMode,
                    title: isFa ? '🌀 نقشه شعاعی دایره‌ای ۳۶۰° (Radial Polar)' : '🌀 360° Radial Map',
                    desc: isFa ? 'شاخه‌بندی از مرکز به صورت قطبی و دایره‌ای ۳۶۰ درجه' : 'Circular radial branches radiating from center',
                  },
                  {
                    id: 'vertical_tree' as MindMapViewMode,
                    title: isFa ? '🏛️ ساختار سازمانی عمودی (Org Chart)' : '🏛️ Vertical Org Chart',
                    desc: isFa ? 'نمودار سازمانی از بالا به پایین با ریشه در سربرگ' : 'Top-down organizational hierarchy',
                  },
                  {
                    id: 'outliner_tree' as MindMapViewMode,
                    title: isFa ? '📋 ساختار درختی فهرست‌وار (Outliner)' : '📋 Outliner Tree',
                    desc: isFa ? 'لیست درختی آکاردئونی همراه با قابلیت آزمون مستقیم' : 'Accordion outline list with direct quiz',
                  },
                  {
                    id: 'matrix_grid' as MindMapViewMode,
                    title: isFa ? '📊 ماتریس شبکه‌ای مفاهیم (Matrix Grid)' : '📊 Knowledge Matrix Grid',
                    desc: isFa ? 'دسته‌بندی چندستونی سیستم‌های فیزیولوژی و داروها' : 'Multi-column organ systems & cards grid',
                  },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onChangeViewMode(item.id)}
                    className={`p-3 rounded-2xl border text-start transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                      viewMode === item.id
                        ? 'border-purple-500 bg-purple-600/15 ring-1 ring-purple-500/30'
                        : 'app-bg app-border hover:border-slate-400/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold app-text">{item.title}</span>
                      {viewMode === item.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                    </div>
                    <span className="text-[10.5px] app-muted">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: STYLE & LINES */}
          {activeTab === 'style' && (
            <div className="space-y-4">
              {/* Connection Line Style */}
              <div className="space-y-2">
                <label className="font-bold app-text flex items-center gap-1.5 text-sm">
                  <Sliders className="w-4 h-4 text-sky-400" />
                  <span>{isFa ? 'استایل خطوط اتصال بین شاخه‌ها (روی بوم):' : 'Line Connector Style:'}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'smooth_bezier' as MindMapLineStyle, label: isFa ? '〰️ منحنی نرم (Bezier)' : 'Smooth Bezier' },
                    { id: 'orthogonal_step' as MindMapLineStyle, label: isFa ? '📐 پله‌ای (Step)' : 'Orthogonal Step' },
                    { id: 'straight' as MindMapLineStyle, label: isFa ? '📏 مستقیم (Straight)' : 'Straight Line' },
                    { id: 'polar_radial' as MindMapLineStyle, label: isFa ? '🌀 قطبی شعاعی (Polar)' : 'Polar Curves' },
                  ].map((ls) => (
                    <button
                      key={ls.id}
                      type="button"
                      onClick={() => onChangeLineStyle(ls.id)}
                      className={`p-2.5 rounded-xl border text-start transition cursor-pointer flex items-center justify-between ${
                        lineStyle === ls.id
                          ? 'border-sky-500 bg-sky-600/15 text-sky-200'
                          : 'app-bg app-border app-muted hover:app-text'
                      }`}
                    >
                      <span className="font-bold">{ls.label}</span>
                      {lineStyle === ls.id && <Check className="w-3.5 h-3.5 text-sky-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Display Mode */}
              <div className="space-y-2 pt-2 border-t app-border">
                <label className="font-bold app-text flex items-center gap-1.5 text-sm">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>{isFa ? 'حالت نمایش متن سوالات در نودها:' : 'Text Display Detail:'}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      id: 'full_detailed' as MindMapTextDisplay,
                      title: isFa ? '📄 متن کامل و تفصیلی' : 'Full Detailed Text',
                      desc: isFa ? 'متن بدون بریدگی برای مطالعه دقیق' : 'Uncut full clinical scenario',
                    },
                    {
                      id: 'compact' as MindMapTextDisplay,
                      title: isFa ? '✂️ حالت فشرده و خلاصه' : 'Compact Summary',
                      desc: isFa ? 'نودهای جمع‌وجورتر برای دید کلان' : 'Shortened previews for birds-eye view',
                    },
                  ].map((tm) => (
                    <button
                      key={tm.id}
                      type="button"
                      onClick={() => onChangeTextDisplayMode(tm.id)}
                      className={`p-3 rounded-2xl border text-start transition cursor-pointer flex flex-col justify-between gap-1 ${
                        textDisplayMode === tm.id
                          ? 'border-indigo-500 bg-indigo-600/15 text-indigo-200 ring-1 ring-indigo-500/30'
                          : 'app-bg app-border app-muted hover:app-text'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold">{tm.title}</span>
                        {textDisplayMode === tm.id && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </div>
                      <span className="text-[10px] app-muted">{tm.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FILTERS & FLAGS */}
          {activeTab === 'filters' && (
            <div className="space-y-4">
              {/* Module Filter */}
              <div className="space-y-2">
                <label className="font-bold app-text flex items-center gap-1.5 text-sm">
                  <FolderTree className="w-4 h-4 text-indigo-400" />
                  <span>{isFa ? 'فیلتر بر اساس ماژول درخت دانش:' : 'Filter by Knowledge Module:'}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangeFilterModule('ALL')}
                    className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      filterModule === 'ALL'
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'app-bg app-border app-muted hover:app-text'
                    }`}
                  >
                    🌐 {isFa ? 'همه ماژول‌ها' : 'All Modules'}
                  </button>
                  {[
                    { id: 1, label: isFa ? 'ماژول ۱: تریاژ OTC' : 'Module 1: OTC' },
                    { id: 2, label: isFa ? 'ماژول ۲: قفسه دارو' : 'Module 2: Shelf' },
                    { id: 3, label: isFa ? 'ماژول ۳: نسخه‌پیچی' : 'Module 3: Dispense' },
                    { id: 4, label: isFa ? 'ماژول ۴: فارماکولوژی' : 'Module 4: Clinical' },
                    { id: 5, label: isFa ? 'ماژول ۵: لایتنر' : 'Module 5: Leitner' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onChangeFilterModule(m.id)}
                      className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer truncate ${
                        filterModule === m.id
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'app-bg app-border app-muted hover:app-text'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Box Filter */}
              <div className="space-y-2 pt-2 border-t app-border">
                <label className="font-bold app-text flex items-center gap-1.5 text-sm">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <span>{isFa ? 'فیلتر بر اساس جعبه لایتنر:' : 'Filter by Leitner Box:'}</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onChangeFilterBox('ALL')}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      filterBox === 'ALL'
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'app-bg app-border app-muted hover:app-text'
                    }`}
                  >
                    📦 {isFa ? 'همه جعبه‌ها' : 'All Boxes'}
                  </button>
                  {[1, 2, 3, 4, 5].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => onChangeFilterBox(b)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        filterBox === b
                          ? 'bg-purple-600 text-white border-purple-500'
                          : 'app-bg app-border app-muted hover:app-text'
                      }`}
                    >
                      {isFa ? `جعبه ${b}` : `Box ${b}`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Flag Filters */}
              <div className="space-y-2 pt-2 border-t app-border">
                <div className="flex items-center justify-between">
                  <label className="font-bold app-text flex items-center gap-1.5 text-sm">
                    <Flag className="w-4 h-4 text-amber-400" />
                    <span>{isFa ? 'فیلتر رنگ پرچم‌های نشانه‌گذاری:' : 'Filter by Flag Color:'}</span>
                  </label>
                  {selectedFlagFilters.length > 0 && (
                    <button
                      type="button"
                      onClick={onResetFlagFilters}
                      className="text-purple-600 dark:text-purple-300 text-xs font-bold cursor-pointer"
                    >
                      {isFa ? 'نمایش همه' : 'Show All'}
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(Object.keys(FLAG_OPTIONS) as FlagColor[]).map((fKey) => {
                    const opt = FLAG_OPTIONS[fKey];
                    const isSelected = selectedFlagFilters.includes(fKey);
                    return (
                      <button
                        key={fKey}
                        type="button"
                        onClick={() => onToggleFlagFilter(fKey)}
                        className={`p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition border cursor-pointer ${
                          isSelected
                            ? `${opt.badge} ring-1 ring-white/20`
                            : 'app-bg app-text app-border hover:bg-black/5 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${opt.dot}`} />
                          <span>{isFa ? opt.name.fa : opt.name.en}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACTIONS & TOOLS */}
          {activeTab === 'tools' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onExpandAll && (
                  <button
                    type="button"
                    onClick={onExpandAll}
                    className="p-3 rounded-2xl app-bg hover:bg-black/5 dark:hover:bg-slate-800 border app-border app-text font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-emerald-400" />
                    <span>{isFa ? '➕ باز کردن تمام شاخه‌ها' : 'Expand All Branches'}</span>
                  </button>
                )}

                {onCollapseAll && (
                  <button
                    type="button"
                    onClick={onCollapseAll}
                    className="p-3 rounded-2xl app-bg hover:bg-black/5 dark:hover:bg-slate-800 border app-border app-text font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Folder className="w-4 h-4 text-amber-400" />
                    <span>{isFa ? '➖ بستن تمام شاخه‌ها' : 'Collapse All Branches'}</span>
                  </button>
                )}
              </div>

              {onExportJson && (
                <div className="pt-2 border-t app-border">
                  <button
                    type="button"
                    onClick={onExportJson}
                    className="w-full p-3 rounded-2xl app-bg hover:bg-black/5 dark:hover:bg-slate-800 border app-border app-text font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-purple-400" />
                    <span>{isFa ? 'دانلود خروجی ساختار نقشه ذهنی (JSON)' : 'Export Mind Map Structure (JSON)'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t app-border flex items-center justify-between bg-slate-900/40">
          <div className="text-[11px] app-muted">
            {isFa
              ? `نوع چیدمان: ${viewMode === 'interactive_canvas' ? 'گراف افقی' : viewMode === 'radial_circle' ? 'شعاعی ۳۶۰°' : viewMode === 'vertical_tree' ? 'سازمانی عمودی' : viewMode === 'outliner_tree' ? 'درختی متنی' : 'ماتریس'}`
              : `Active Layout: ${viewMode === 'interactive_canvas' ? 'Horizontal Canvas' : viewMode === 'radial_circle' ? '360° Radial Map' : viewMode === 'vertical_tree' ? 'Org Chart' : viewMode === 'outliner_tree' ? 'Outliner Tree' : 'Matrix Grid'}`}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            {isFa ? 'بستن و اعمال' : 'Apply & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
