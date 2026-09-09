'use client';

import React, { useState, useEffect } from 'react';
import { Language } from '@/types/pharmacy';
import { LeitnerCard } from '@/types/leitner';
import {
  Settings,
  X,
  Zap,
  Clock,
  Shuffle,
  Calendar,
  Layers,
  BookOpen,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Download,
  Upload,
  Trash2,
  Check,
  Globe,
  Sliders,
  ShieldAlert,
  Flame,
  HelpCircle,
  Brain,
  TrendingUp,
  Activity,
  Gauge,
} from 'lucide-react';
import {
  FSRSConfig,
  FSRSPresetProfile,
  DEFAULT_FSRS_CONFIG,
  FSRS_PRESETS,
} from '@/lib/fsrs';

export interface LeitnerStudySettings {
  algorithm: 'fsrs' | 'classic_leitner' | 'cram';
  cardOrder: 'due_first' | 'random' | 'hardest_first' | 'by_module';
  dailyLimit: number | 'unlimited';
  languageMode: 'bilingual' | 'en_only' | 'fa_only';
  hidePearlsUntilFlip: boolean;
  showCalLabels: boolean;
  countdownTimer: number; // 0 = off, 30, 60, 90 seconds
  enableHaptics: boolean;
  autoPlayAudio: boolean;
  fsrsConfig: FSRSConfig;
}

export const DEFAULT_LEITNER_SETTINGS: LeitnerStudySettings = {
  algorithm: 'fsrs',
  cardOrder: 'due_first',
  dailyLimit: 'unlimited',
  languageMode: 'bilingual',
  hidePearlsUntilFlip: true,
  showCalLabels: true,
  countdownTimer: 0,
  enableHaptics: true,
  autoPlayAudio: false,
  fsrsConfig: { ...DEFAULT_FSRS_CONFIG },
};

export const LEITNER_SETTINGS_STORAGE_KEY = 'pharmacy_leitner_study_settings_v2';

export function getStoredLeitnerSettings(): LeitnerStudySettings {
  if (typeof window === 'undefined') return DEFAULT_LEITNER_SETTINGS;
  try {
    const raw = localStorage.getItem(LEITNER_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_LEITNER_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_LEITNER_SETTINGS,
      ...parsed,
      fsrsConfig: {
        ...DEFAULT_FSRS_CONFIG,
        ...(parsed.fsrsConfig || {}),
      },
    };
  } catch {
    return DEFAULT_LEITNER_SETTINGS;
  }
}

export function saveStoredLeitnerSettings(settings: LeitnerStudySettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LEITNER_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save Leitner settings:', err);
  }
}

interface LeitnerStudySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  settings: LeitnerStudySettings;
  onUpdateSettings: (newSettings: LeitnerStudySettings) => void;
  onExportJson?: () => void;
  onImportJson?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearCards?: () => void;
  onLoadSamples?: () => void;
  totalCardsCount: number;
  initialTab?: 'study' | 'fsrs' | 'display' | 'advanced' | 'backup';
}

export const LeitnerStudySettingsModal: React.FC<LeitnerStudySettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  settings,
  onUpdateSettings,
  onExportJson,
  onImportJson,
  onClearCards,
  onLoadSamples,
  totalCardsCount,
  initialTab,
}) => {
  const isFa = language === 'fa';
  const [activeTab, setActiveTab] = useState<'study' | 'fsrs' | 'display' | 'advanced' | 'backup'>(initialTab || 'study');
  const [localSettings, setLocalSettings] = useState<LeitnerStudySettings>(settings);

  const [prevSettings, setPrevSettings] = useState<LeitnerStudySettings>(settings);
  if (settings !== prevSettings) {
    setPrevSettings(settings);
    setLocalSettings(settings);
  }

  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab && initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    setActiveTab(initialTab);
  }

  if (!isOpen) return null;

  const handleChange = <K extends keyof LeitnerStudySettings>(key: K, value: LeitnerStudySettings[K]) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onUpdateSettings(updated);
    saveStoredLeitnerSettings(updated);
  };

  const handleFsrsConfigChange = <K extends keyof FSRSConfig>(key: K, value: FSRSConfig[K]) => {
    const updatedFsrs: FSRSConfig = {
      ...localSettings.fsrsConfig,
      [key]: value,
      presetProfile: key === 'presetProfile' ? (value as FSRSPresetProfile) : 'custom',
    };
    handleChange('fsrsConfig', updatedFsrs);
  };

  const handleApplyPreset = (profile: FSRSPresetProfile) => {
    const preset = FSRS_PRESETS[profile] || DEFAULT_FSRS_CONFIG;
    handleChange('fsrsConfig', { ...preset });
  };

  const handleResetFsrs = () => {
    handleChange('fsrsConfig', { ...DEFAULT_FSRS_CONFIG });
  };

  const currentRetentionPercent = Math.round((localSettings.fsrsConfig?.requestRetention || 0.90) * 100);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="app-card border app-border rounded-3xl w-full max-w-2xl h-[780px] max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
        dir={isFa ? 'rtl' : 'ltr'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b app-border flex items-center justify-between gap-3 bg-slate-900/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/40 flex items-center justify-center shadow-inner">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-black app-text">
              {isFa ? 'تنظیمات مطالعه لایتنر و الگوریتم FSRS' : 'Leitner & FSRS Settings'}
            </h3>
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
        <div className="flex border-b app-border app-bg p-1.5 gap-1 overflow-x-auto no-scrollbar text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('study')}
            className={`flex-1 min-w-[90px] py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'study'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'app-muted hover:app-text hover:bg-black/5 dark:hover:bg-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isFa ? 'الگوریتم و صف' : 'Algorithm & Queue'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fsrs')}
            className={`flex-1 min-w-[100px] py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'fsrs'
                ? 'bg-purple-600 text-white shadow-sm ring-1 ring-purple-400/40'
                : 'app-muted hover:app-text hover:bg-black/5 dark:hover:bg-slate-800'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>{isFa ? 'تنظیمات FSRS 🧠' : 'FSRS Parameters 🧠'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('display')}
            className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'display'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'app-muted hover:app-text hover:bg-black/5 dark:hover:bg-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{isFa ? 'زبان و نمایش' : 'Display'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'advanced'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'app-muted hover:app-text hover:bg-black/5 dark:hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{isFa ? 'تایمر و بازخورد' : 'Timer'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`flex-1 min-w-[85px] py-2 px-2.5 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'app-muted hover:app-text hover:bg-black/5 dark:hover:bg-slate-800'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isFa ? 'مدیریت داده‌ها' : 'Backup'}</span>
          </button>
        </div>

        {/* Modal Body with fixed flex-1 scrolling */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* TAB 1: ALGORITHM & QUEUE */}
          {activeTab === 'study' && (
            <div className="space-y-4">
              {/* Algorithm Choice */}
              <div className="space-y-2">
                <label className="font-bold app-text flex items-center gap-1.5 text-sm">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>{isFa ? 'موتور محاسباتی و زمان‌بندی مرور:' : 'Spaced Repetition Algorithm:'}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    {
                      id: 'fsrs',
                      title: isFa ? 'هوشمند FSRS v5' : 'FSRS v5 Smart',
                      desc: isFa ? 'محاسبه پایداری حافظه (پیش‌فرض Anki)' : 'Memory Stability & Difficulty',
                    },
                    {
                      id: 'classic_leitner',
                      title: isFa ? 'جعبه لایتنر سنتی' : 'Classic Leitner',
                      desc: isFa ? '۵ جعبه استاندارد (۱، ۳، ۷، ۱۴، ۳۰ روز)' : '5 Fixed Interval Boxes',
                    },
                    {
                      id: 'cram',
                      title: isFa ? 'آزمون فشرده (Cram)' : 'Cramming Mode',
                      desc: isFa ? 'مرور سریع همه کارت‌ها بدون تغییر موعد' : 'Review all cards freely',
                    },
                  ].map((algo) => (
                    <button
                      key={algo.id}
                      type="button"
                      onClick={() => handleChange('algorithm', algo.id as any)}
                      className={`p-3 rounded-2xl border text-start transition cursor-pointer flex flex-col justify-between gap-1 ${
                        localSettings.algorithm === algo.id
                          ? 'border-purple-500 bg-purple-600/15 ring-1 ring-purple-500/30'
                          : 'app-bg app-border hover:border-slate-400/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold app-text">{algo.title}</span>
                        {localSettings.algorithm === algo.id && <Check className="w-3.5 h-3.5 text-purple-400" />}
                      </div>
                      <span className="text-[10.5px] app-muted">{algo.desc}</span>
                    </button>
                  ))}
                </div>

                {/* Direct Entry to FSRS Fine Tuning */}
                {localSettings.algorithm === 'fsrs' && (
                  <div className="p-3.5 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 shrink-0">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-purple-200">
                          {isFa ? 'پیکربندی هوشمند الگوریتم FSRS فعال است' : 'FSRS v5 Smart Engine Active'}
                        </div>
                        <div className="text-[11px] text-purple-300/80 font-mono mt-0.5">
                          {isFa
                            ? `نرخ بازیابی هدف: ${currentRetentionPercent}% • سقف فاصله: ${localSettings.fsrsConfig?.maximumInterval || 365} روز`
                            : `Target Retention: ${currentRetentionPercent}% • Max Interval: ${localSettings.fsrsConfig?.maximumInterval || 365}d`}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('fsrs')}
                      className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-sm"
                    >
                      <Gauge className="w-3.5 h-3.5 text-amber-300" />
                      <span>{isFa ? 'تنظیم دقیق پارامترهای FSRS ⚙️' : 'Fine-Tune FSRS Parameters ⚙️'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Card Ordering */}
              <div className="space-y-2 pt-2 border-t app-border">
                <label className="font-bold app-text flex items-center gap-1.5 text-sm">
                  <Shuffle className="w-4 h-4 text-cyan-400" />
                  <span>{isFa ? 'ترتیب نمایش کارت‌ها در صف مطالعه:' : 'Card Queue Ordering:'}</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'due_first', label: isFa ? 'کارت‌های موعددار اول' : 'Due Date First' },
                    { id: 'random', label: isFa ? 'تصادفی و شافل (Shuffle)' : 'Random Shuffle' },
                    { id: 'hardest_first', label: isFa ? 'سخت‌ترین مفاهیم اول' : 'Hardest / Lowest Box First' },
                    { id: 'by_module', label: isFa ? 'بر اساس دسته‌بندی و درخت دانش' : 'Grouped by Knowledge Tree' },
                  ].map((ord) => (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => handleChange('cardOrder', ord.id as any)}
                      className={`p-2.5 rounded-xl border text-start transition cursor-pointer flex items-center justify-between ${
                        localSettings.cardOrder === ord.id
                          ? 'border-cyan-500 bg-cyan-600/15 text-cyan-200'
                          : 'app-bg app-border app-muted hover:app-text'
                      }`}
                    >
                      <span className="font-bold">{ord.label}</span>
                      {localSettings.cardOrder === ord.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Daily Limit */}
              <div className="space-y-2 pt-2 border-t app-border">
                <label className="font-bold app-text flex items-center gap-1.5 text-sm">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>{isFa ? 'محدودیت تعداد کارت در هر جلسه مرور:' : 'Daily / Session Review Limit:'}</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 10, label: isFa ? '۱۰ کارت' : '10 Cards' },
                    { id: 20, label: isFa ? '۲۰ کارت' : '20 Cards' },
                    { id: 30, label: isFa ? '۳۰ کارت' : '30 Cards' },
                    { id: 50, label: isFa ? '۵۰ کارت' : '50 Cards' },
                    { id: 'unlimited', label: isFa ? 'همه کارت‌های موعددار (نامحدود)' : 'All Due (Unlimited)' },
                  ].map((lim) => (
                    <button
                      key={String(lim.id)}
                      type="button"
                      onClick={() => handleChange('dailyLimit', lim.id as any)}
                      className={`px-3 py-1.5 rounded-xl border font-bold transition cursor-pointer ${
                        localSettings.dailyLimit === lim.id
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'app-bg app-border app-muted hover:app-text'
                      }`}
                    >
                      {lim.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FSRS ADVANCED CONFIGURATION */}
          {activeTab === 'fsrs' && (
            <div className="space-y-5 animate-fadeIn">
              {/* FSRS Header & Scientific Overview */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/40 space-y-2 shadow-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300">
                      <Brain className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white flex items-center gap-2">
                        <span>{isFa ? 'پیکربندی دقیق الگوریتم FSRS v5' : 'FSRS v5 Algorithm Fine-Tuning'}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-400/40">
                          v5.0
                        </span>
                      </h4>
                      <p className="text-[11px] text-purple-200/80">
                        {isFa
                          ? 'الگوریتم مدرن پایداری حافظه (S)، سختی آیتم (D) و احتمال یادآوری (R)'
                          : 'Modern Memory Science: Stability (S), Difficulty (D) & Retrievability (R)'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetFsrs}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition flex items-center gap-1 border border-slate-700 cursor-pointer"
                    title={isFa ? 'بازنشانی تمام مقادیر FSRS به تنظیمات استاندارد' : 'Reset FSRS to defaults'}
                  >
                    <RotateCcw className="w-3 h-3 text-amber-400" />
                    <span>{isFa ? 'بازنشانی پیش‌فرض' : 'Reset Defaults'}</span>
                  </button>
                </div>
              </div>

              {/* 1. Presets Selector */}
              <div className="space-y-2">
                <label className="font-bold app-text flex items-center gap-1.5 text-xs sm:text-sm">
                  <Sliders className="w-4 h-4 text-purple-400" />
                  <span>{isFa ? 'پروفایل‌های آماده و استراتژی مطالعه:' : 'FSRS Strategy Profiles:'}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    {
                      id: 'standard' as FSRSPresetProfile,
                      title: isFa ? '🎓 استاندارد داروسازی (پیش‌فرض)' : '🎓 Pharmacy Standard',
                      desc: isFa ? 'نرخ ۹۰٪ • تعادل ایده‌آل بین حجم مرور و تثبیت' : '90% Retention • Ideal study balance',
                      ret: 90,
                      max: 365,
                    },
                    {
                      id: 'kaps_mastery' as FSRSPresetProfile,
                      title: isFa ? '🚀 تسلط پیشرفته' : '🚀 Advanced mastery',
                      desc: isFa ? 'نرخ ۹۳٪ • مرور مکررتر و دقت بالا برای امتحانات' : '93% Retention • Strict intervals for exams',
                      ret: 93,
                      max: 180,
                    },
                    {
                      id: 'rapid_cram' as FSRSPresetProfile,
                      title: isFa ? '⚡ مرور فشرده و سریع' : '⚡ Rapid Cramming',
                      desc: isFa ? 'نرخ ۸۵٪ • مناسب جمع‌بندی سریع با حجم مرور کمتر' : '85% Retention • Fast pace review',
                      ret: 85,
                      max: 60,
                    },
                    {
                      id: 'custom' as FSRSPresetProfile,
                      title: isFa ? '🛠️ شخصی‌سازی دستی (Custom)' : '🛠️ Custom Tuning',
                      desc: isFa ? 'تنظیم دستی تک‌تک متغیرها و ضرایب' : 'Manual parameters adjustment',
                      ret: currentRetentionPercent,
                      max: localSettings.fsrsConfig?.maximumInterval || 365,
                    },
                  ].map((preset) => {
                    const isSelected = (localSettings.fsrsConfig?.presetProfile || 'standard') === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleApplyPreset(preset.id)}
                        className={`p-3 rounded-2xl border text-start transition cursor-pointer flex flex-col justify-between gap-1.5 ${
                          isSelected
                            ? 'border-purple-500 bg-purple-600/15 ring-1 ring-purple-500/30'
                            : 'app-bg app-border hover:border-slate-400/50 opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold app-text">{preset.title}</span>
                          {isSelected && <Check className="w-4 h-4 text-purple-400 stroke-[3]" />}
                        </div>
                        <span className="text-[10.5px] app-muted">{preset.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Target Desired Retention Slider */}
              <div className="space-y-2 pt-2 border-t app-border">
                <div className="flex items-center justify-between gap-2">
                  <label className="font-bold app-text flex items-center gap-1.5 text-xs sm:text-sm">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>{isFa ? 'نرخ هدف یادآوری (Desired Retention):' : 'Desired Retention Rate:'}</span>
                  </label>
                  <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {currentRetentionPercent}%
                  </span>
                </div>

                <div className="space-y-1.5">
                  <input
                    type="range"
                    min="75"
                    max="97"
                    step="1"
                    value={currentRetentionPercent}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) / 100;
                      handleFsrsConfigChange('requestRetention', val);
                    }}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>75% ({isFa ? 'مرور کمتر' : 'Less reviews'})</span>
                    <span className="text-emerald-400 font-bold">90% ({isFa ? 'استاندارد طلایی' : 'Optimal'})</span>
                    <span>97% ({isFa ? 'تسلط حداکثری' : 'Max recall'})</span>
                  </div>
                </div>

                <p className="text-[11px] app-muted leading-relaxed">
                  {currentRetentionPercent >= 93
                    ? isFa
                      ? '🎯 نرخ بالا (۹۳٪+): فواصل مرور کوتاه‌تر و اطمینان بیشتر از تثبیت دانسته‌ها را فراهم می‌کند.'
                      : 'High retention (93%+): shorter intervals and stronger recall reinforcement.'
                    : currentRetentionPercent <= 85
                    ? isFa
                      ? '⚡ نرخ کمتر (۸۵٪): فواصل مرور طولانی‌تر شده و تعداد کارت‌های روزانه کمتر می‌شود.'
                      : 'Lower Retention (85%): Longer intervals and reduced daily study workload.'
                    : isFa
                    ? '✨ نرخ بهینه (۹۰٪): نقطه تعادل استاندارد بین حداقل زمان مطالعه روزانه و حداکثر پایداری حافظه بلندمدت.'
                    : 'Optimal (90%): Golden standard balancing daily workload and long-term memory retention.'}
                </p>
              </div>

              {/* 3. Maximum Interval */}
              <div className="space-y-2 pt-2 border-t app-border">
                <label className="font-bold app-text flex items-center gap-1.5 text-xs sm:text-sm">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <span>{isFa ? 'حداکثر فاصله زمانی مرور (Maximum Interval):' : 'Maximum Review Interval:'}</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {[
                    { days: 30, label: isFa ? '۳۰ روز' : '30d' },
                    { days: 60, label: isFa ? '۶۰ روز' : '60d' },
                    { days: 90, label: isFa ? '۹۰ روز' : '90d' },
                    { days: 180, label: isFa ? '۱۸۰ روز' : '180d' },
                    { days: 365, label: isFa ? '۱ سال' : '1 yr' },
                    { days: 36500, label: isFa ? 'نامحدود' : 'Unlimited' },
                  ].map((item) => (
                    <button
                      key={item.days}
                      type="button"
                      onClick={() => handleFsrsConfigChange('maximumInterval', item.days)}
                      className={`py-2 px-2 rounded-xl border text-center font-mono font-bold text-xs transition cursor-pointer ${
                        localSettings.fsrsConfig?.maximumInterval === item.days
                          ? 'bg-cyan-600 text-white border-cyan-500 shadow-sm'
                          : 'app-bg app-border app-muted hover:app-text hover:border-slate-400/50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. Rating Multipliers (Easy Bonus & Hard Penalty) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t app-border">
                {/* Easy Bonus */}
                <div className="p-3 rounded-2xl app-bg border app-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold app-text flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-sky-400" />
                      <span>{isFa ? 'پاداش کارت آسان (Easy):' : 'Easy Bonus:'}</span>
                    </span>
                    <span className="font-mono font-bold text-sky-400">
                      {localSettings.fsrsConfig?.easyBonusMultiplier?.toFixed(2) || '1.35'}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="1.8"
                    step="0.05"
                    value={localSettings.fsrsConfig?.easyBonusMultiplier || 1.35}
                    onChange={(e) => handleFsrsConfigChange('easyBonusMultiplier', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                  <p className="text-[10px] app-muted">
                    {isFa ? 'ضریب افزایش پایداری هنگام زدن دکمه آسان' : 'Stability multiplier on Easy rating'}
                  </p>
                </div>

                {/* Hard Penalty */}
                <div className="p-3 rounded-2xl app-bg border app-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold app-text flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isFa ? 'جریمه کارت سخت (Hard):' : 'Hard Penalty:'}</span>
                    </span>
                    <span className="font-mono font-bold text-amber-400">
                      {localSettings.fsrsConfig?.hardPenaltyMultiplier?.toFixed(2) || '0.85'}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.05"
                    value={localSettings.fsrsConfig?.hardPenaltyMultiplier || 0.85}
                    onChange={(e) => handleFsrsConfigChange('hardPenaltyMultiplier', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <p className="text-[10px] app-muted">
                    {isFa ? 'ضریب کنترل پایداری هنگام زدن دکمه سخت' : 'Stability dampener on Hard rating'}
                  </p>
                </div>
              </div>

              {/* 5. Live Interval Simulator Box */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between text-slate-300 font-sans font-bold">
                  <span className="flex items-center gap-1.5 text-xs text-purple-300">
                    <Activity className="w-3.5 h-3.5 text-purple-400" />
                    <span>{isFa ? 'نمونه خروجی فواصل FSRS برای کارت پایداری ۳ روز:' : 'Sample FSRS Interval Projections (S=3d):'}</span>
                  </span>
                  <span className="text-[10px] text-slate-500">R: {currentRetentionPercent}%</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  <div className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-300">
                    <div className="font-bold text-[10px] font-sans">{isFa ? 'تکرار (Again)' : 'Again'}</div>
                    <div className="text-xs font-bold font-mono">10m</div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
                    <div className="font-bold text-[10px] font-sans">{isFa ? 'سخت (Hard)' : 'Hard'}</div>
                    <div className="text-xs font-bold font-mono">
                      {Math.max(1, Math.round(2 * (localSettings.fsrsConfig?.hardPenaltyMultiplier || 0.85)))}d
                    </div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                    <div className="font-bold text-[10px] font-sans">{isFa ? 'خوب (Good)' : 'Good'}</div>
                    <div className="text-xs font-bold font-mono">
                      {Math.round(3 * (0.90 / (localSettings.fsrsConfig?.requestRetention || 0.90)))}d
                    </div>
                  </div>
                  <div className="p-1.5 rounded-lg bg-sky-950/40 border border-sky-500/30 text-sky-300">
                    <div className="font-bold text-[10px] font-sans">{isFa ? 'آسان (Easy)' : 'Easy'}</div>
                    <div className="text-xs font-bold font-mono">
                      {Math.round(7 * (localSettings.fsrsConfig?.easyBonusMultiplier || 1.35))}d
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISPLAY & LANGUAGE */}
          {activeTab === 'display' && (
            <div className="space-y-4">
              {/* Language Mode */}
              <div className="space-y-2">
                <label className="font-bold app-text flex items-center gap-1.5 text-sm">
                  <Globe className="w-4 h-4 text-indigo-400" />
                  <span>{isFa ? 'زبان نمایش سوال و پاسخ کارت‌ها:' : 'Card Language Mode:'}</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'bilingual', label: isFa ? 'دوزبانه کامل (Fa + En)' : 'Bilingual (Both)', desc: isFa ? 'فارسی و انگلیسی با هم' : 'Both languages shown' },
                    { id: 'en_only', label: isFa ? 'فقط انگلیسی تخصصی' : 'English Only', desc: isFa ? 'تمرکز بر انگلیسی تخصصی داروسازی' : 'Medical English focus' },
                    { id: 'fa_only', label: isFa ? 'فقط فارسی' : 'Farsi Only', desc: isFa ? 'تمرکز کامل روی متن فارسی' : 'Farsi translation focus' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => handleChange('languageMode', lang.id as any)}
                      className={`p-3 rounded-2xl border text-start transition cursor-pointer flex flex-col justify-between gap-1 ${
                        localSettings.languageMode === lang.id
                          ? 'border-indigo-500 bg-indigo-600/15 text-indigo-200 ring-1 ring-indigo-500/30'
                          : 'app-bg app-border app-muted hover:app-text'
                      }`}
                    >
                      <span className="font-bold">{lang.label}</span>
                      <span className="text-[10px] app-muted">{lang.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2 border-t app-border">
                <label
                  className="flex items-center justify-between p-3 rounded-2xl app-bg border app-border cursor-pointer hover:border-slate-400/50 transition"
                  onClick={() => handleChange('hidePearlsUntilFlip', !localSettings.hidePearlsUntilFlip)}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold app-text flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isFa ? 'پنهان‌سازی نکته طلایی تا زمان مشاهده پاسخ' : 'Hide Pearls Until Card Flipped'}</span>
                    </span>
                    <p className="text-[11px] app-muted">
                      {isFa ? 'جلوگیری از لو رفتن پاسخ پیش از حدس زدن' : 'Prevent spoiling the answer before guessing'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.hidePearlsUntilFlip}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                  />
                </label>

                <label
                  className="flex items-center justify-between p-3 rounded-2xl app-bg border app-border cursor-pointer hover:border-slate-400/50 transition"
                  onClick={() => handleChange('showCalLabels', !localSettings.showCalLabels)}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold app-text flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                      <span>{isFa ? 'نمایش برچسب‌های احتیاطی استرالیا (CAL Labels)' : 'Show Australian CAL Labels'}</span>
                    </span>
                    <p className="text-[11px] app-muted">
                      {isFa ? 'نمایش برچسب‌های رسمی تحویل دارو (Label 1, 2, 12...)' : 'Show official pharmacy auxiliary labels'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.showCalLabels}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: TIMER & AUDIO */}
          {activeTab === 'advanced' && (
            <div className="space-y-4">
              {/* Countdown Timer */}
              <div className="space-y-2">
                <label className="font-bold app-text flex items-center gap-1.5 text-sm">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>{isFa ? 'تایمر معکوس تفکر و پاسخ (شبیه‌ساز آزمون):' : 'Thinking Countdown Timer:'}</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 0, label: isFa ? 'بدون تایمر (آزاد)' : 'Off (Unlimited)' },
                    { id: 30, label: isFa ? '۳۰ ثانیه' : '30 Seconds' },
                    { id: 60, label: isFa ? '۶۰ ثانیه' : '60 Seconds' },
                    { id: 90, label: isFa ? '۹۰ ثانیه' : '90 Seconds' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleChange('countdownTimer', t.id)}
                      className={`p-2.5 rounded-xl border font-bold transition cursor-pointer text-center ${
                        localSettings.countdownTimer === t.id
                          ? 'bg-amber-600 text-white border-amber-500'
                          : 'app-bg app-border app-muted hover:app-text'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Haptics */}
              <div className="space-y-3 pt-2 border-t app-border">
                <label
                  className="flex items-center justify-between p-3 rounded-2xl app-bg border app-border cursor-pointer hover:border-slate-400/50 transition"
                  onClick={() => handleChange('enableHaptics', !localSettings.enableHaptics)}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold app-text flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-purple-400" />
                      <span>{isFa ? 'لرزش و بازخورد حسی هنگام رتبه‌بندی کارت (Haptic)' : 'Haptic Feedback on Rating'}</span>
                    </span>
                    <p className="text-[11px] app-muted">
                      {isFa ? 'لرزش ملایم در دستگاه‌های لمسی و موبایل' : 'Gentle vibration on rating cards'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={localSettings.enableHaptics}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-purple-600 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* TAB 4: BACKUP & DATA MANAGEMENT */}
          {activeTab === 'backup' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-2xl app-bg border app-border flex items-center justify-between">
                <div>
                  <span className="font-bold app-text text-sm">
                    {isFa ? 'تعداد کل کارت‌های موجود در حافظه:' : 'Total Cards in Library:'}
                  </span>
                  <p className="text-xs app-muted">
                    {isFa ? `${totalCardsCount} فلش‌کارت ثبت شده` : `${totalCardsCount} cards stored`}
                  </p>
                </div>
                {onLoadSamples && (
                  <button
                    type="button"
                    onClick={onLoadSamples}
                    className="px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/40 hover:bg-purple-600 hover:text-white font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isFa ? 'بارگذاری نمونه‌های جامع' : 'Load Sample Cards'}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {onExportJson && (
                  <button
                    type="button"
                    onClick={onExportJson}
                    className="p-3 rounded-2xl app-bg hover:bg-black/5 dark:hover:bg-slate-800 border app-border app-text font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>{isFa ? 'دانلود فایل پشتیبان (JSON)' : 'Export Backup JSON'}</span>
                  </button>
                )}

                {onImportJson && (
                  <label className="p-3 rounded-2xl app-bg hover:bg-black/5 dark:hover:bg-slate-800 border app-border app-text font-bold transition flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span>{isFa ? 'بارگذاری فایل کارت‌ها (JSON)' : 'Import Backup JSON'}</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={onImportJson}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {onClearCards && (
                <div className="pt-2 border-t app-border">
                  <button
                    type="button"
                    onClick={onClearCards}
                    className="w-full p-2.5 rounded-xl bg-rose-600/10 hover:bg-rose-600/25 text-rose-400 border border-rose-500/30 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isFa ? 'پاکسازی کامل همه کارت‌های لایتنر' : 'Clear All Leitner Cards'}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t app-border flex items-center justify-between bg-slate-900/40">
          <button
            type="button"
            onClick={() => {
              setLocalSettings(DEFAULT_LEITNER_SETTINGS);
              onUpdateSettings(DEFAULT_LEITNER_SETTINGS);
              saveStoredLeitnerSettings(DEFAULT_LEITNER_SETTINGS);
            }}
            className="px-3 py-1.5 rounded-xl app-bg border app-border text-xs app-muted hover:app-text transition cursor-pointer"
          >
            {isFa ? 'بازنشانی پیش‌فرض' : 'Reset Defaults'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
          >
            {isFa ? 'تأیید و ذخیره' : 'Save & Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
