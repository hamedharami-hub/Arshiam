'use client';

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { VisualTheme, FontSize, Language, UserProgress, LayoutMode, UserAiConfig, AiProvider, AiModelOption } from '@/types/pharmacy';
import { LeitnerCard } from '@/types/leitner';
import { User } from '@/lib/firebase';
import { getAiRequestHeaders } from '@/lib/aiClient';
import { useStudyTracker } from '@/components/study/StudyTrackerContext';
import { StudyMasteryDashboard } from '@/components/analytics/StudyMasteryDashboard';
import {
  Settings,
  X,
  Moon,
  Sun,
  BookOpen,
  RotateCcw,
  Download,
  Upload,
  LayoutGrid,
  List,
  Columns,
  User as UserIcon,
  CloudCheck,
  LogIn,
  Globe,
  Eye,
  Sparkles,
  Bot,
  Key,
  Cpu,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
  Zap,
  RefreshCw,
  Loader2,
  Trophy,
  Award,
  Flame,
  Layers,
  Smartphone,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Scale,
  Info,
  Heart,
  TrendingUp,
} from 'lucide-react';

interface SettingsModalProps {
  language: Language;
  onToggleLanguage?: () => void;
  theme: VisualTheme;
  onSetTheme: (t: VisualTheme) => void;
  fontSize: FontSize;
  onSetFontSize: (sz: FontSize) => void;
  layoutMode: LayoutMode;
  onChangeLayoutMode: (mode: LayoutMode) => void;
  onReset: () => void;
  userProgress: UserProgress;
  onImportProgress: (progress: UserProgress) => void;
  onClose: () => void;
  user?: User | null;
  isSyncing?: boolean;
  lastSyncedAt?: string | null;
  onOpenAuth?: () => void;
  onOpenLeitnerBox?: () => void;
  aiConfig: UserAiConfig;
  onSaveAiConfig: (cfg: UserAiConfig) => void;
  initialTab?: 'general' | 'ai' | 'about' | 'analytics';
  leitnerCards?: LeitnerCard[];
}

const emptySubscribe = () => () => {};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  language,
  onToggleLanguage,
  theme,
  onSetTheme,
  fontSize,
  onSetFontSize,
  layoutMode,
  onChangeLayoutMode,
  onReset,
  userProgress,
  onImportProgress,
  onClose,
  user,
  isSyncing,
  lastSyncedAt,
  onOpenAuth,
  onOpenLeitnerBox,
  aiConfig,
  onSaveAiConfig,
  initialTab,
  leitnerCards,
}) => {
  const isFa = language === 'fa';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Today's Study Activity Tracker
  const tracker = useStudyTracker();
  const completedMap = tracker?.studyState?.completedMap || {};
  const viewedMap = tracker?.studyState?.viewedMap || {};
  const totalCompleted = Object.values(completedMap).filter(Boolean).length;
  const totalViewed = Object.values(viewedMap).filter(Boolean).length;
  const totalActions = totalCompleted + totalViewed;

  const scenarioActions = Object.keys(completedMap).filter((k) => k.startsWith('scenario-') || k.startsWith('triage-')).length;
  const drugActions = Object.keys(completedMap).filter((k) => k.startsWith('drug-') || k.startsWith('prod-')).length;
  const dispenseActions = Object.keys(completedMap).filter((k) => k.startsWith('fred-') || k.startsWith('rx-')).length;
  const leitnerActions = Object.keys(completedMap).filter((k) => k.startsWith('leitner-') || k.startsWith('card-')).length;

  // Local state for settings modal tabs
  const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'about' | 'analytics'>(initialTab || 'general');
  const [prevInitialTab, setPrevInitialTab] = useState(initialTab);
  if (initialTab !== prevInitialTab) {
    setPrevInitialTab(initialTab);
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }
  const [localAiConfig, setLocalAiConfig] = useState<UserAiConfig>(aiConfig);
  const [showAddCustomModel, setShowAddCustomModel] = useState(false);
  const [customModelForm, setCustomModelForm] = useState<{
    id: string;
    name: string;
    provider: AiProvider;
    descFa: string;
    descEn: string;
    badge: string;
  }>({
    id: '',
    name: '',
    provider: 'gemini',
    descFa: '',
    descEn: '',
    badge: 'Custom',
  });
  const [isSavedBanner, setIsSavedBanner] = useState(false);
  const [isFetchingLiveModels, setIsFetchingLiveModels] = useState(false);
  const [fetchStatusMessage, setFetchStatusMessage] = useState<{ text: string; success: boolean; details?: any } | null>(null);
  
  // Test connection state
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; elapsedMs?: number } | null>(null);

  const handleTestConnection = async (testProvider: AiProvider, testModel: string) => {
    setIsTestingModel(true);
    setTestResult(null);
    try {
      let apiKey = localAiConfig.geminiApiKey;
      if (testProvider === 'groq') apiKey = localAiConfig.groqApiKey;
      if (testProvider === 'xai') apiKey = localAiConfig.xaiApiKey || '';

      const res = await fetch('/api/ai/test', {
        method: 'POST',
        headers: await getAiRequestHeaders(),
        body: JSON.stringify({
          provider: testProvider,
          model: testModel,
          apiKey,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTestResult({
          success: true,
          message: isFa
            ? `✅ اتصال موفق (${data.elapsedMs}ms): "${data.responseText}"`
            : `✅ Connection Successful (${data.elapsedMs}ms): "${data.responseText}"`,
          elapsedMs: data.elapsedMs,
        });
      } else {
        setTestResult({
          success: false,
          message: isFa
            ? `❌ خطا در اتصال (${data.elapsedMs || 0}ms): ${data.error}`
            : `❌ Connection Failed (${data.elapsedMs || 0}ms): ${data.error}`,
          elapsedMs: data.elapsedMs,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: isFa
          ? `❌ خطای شبکه: ${err?.message || 'نامشخص'}`
          : `❌ Network Error: ${err?.message || 'Unknown'}`,
      });
    } finally {
      setIsTestingModel(false);
    }
  };

  const handleSyncLiveModels = async () => {
    setIsFetchingLiveModels(true);
    setFetchStatusMessage(null);
    try {
      const response = await fetch('/api/ai/models', {
        method: 'POST',
        headers: await getAiRequestHeaders(),
        body: JSON.stringify({
          geminiApiKey: localAiConfig.geminiApiKey,
          groqApiKey: localAiConfig.groqApiKey,
          xaiApiKey: localAiConfig.xaiApiKey,
        }),
      });

      const data = await response.json();
      if (data.success && Array.isArray(data.models) && data.models.length > 0) {
        // Merge with existing user-defined custom models
        const mergedMap = new Map<string, AiModelOption>();
        for (const m of data.models) {
          mergedMap.set(m.id, m);
        }
        for (const m of localAiConfig.customModels) {
          if (!mergedMap.has(m.id)) {
            mergedMap.set(m.id, m);
          }
        }
        const updatedModels = Array.from(mergedMap.values());
        
        let newFlashcardModel = localAiConfig.flashcardModel;
        if (!updatedModels.some((m) => m.id === newFlashcardModel)) {
          newFlashcardModel = updatedModels[0]?.id || '';
        }
        let newTutorModel = localAiConfig.tutorModel;
        if (!updatedModels.some((m) => m.id === newTutorModel)) {
          newTutorModel = updatedModels[0]?.id || '';
        }

        const updatedConfig: UserAiConfig = {
          ...localAiConfig,
          flashcardModel: newFlashcardModel,
          tutorModel: newTutorModel,
          customModels: updatedModels,
        };
        setLocalAiConfig(updatedConfig);
        onSaveAiConfig(updatedConfig);

        setFetchStatusMessage({
          success: true,
          text: isFa
            ? `✅ به‌روزرسانی موفق! ${updatedModels.length} مدل آنلاین از ارائه‌دهنده‌ها دریافت شد.`
            : `✅ Successfully synced! ${updatedModels.length} live models discovered.`,
          details: data.providerStatus,
        });
      } else {
        setFetchStatusMessage({
          success: false,
          text: isFa
            ? '⚠️ مدلی از کلیدهای واردشده یافت نشد. لطفاً کلید API را بررسی فرمایید.'
            : '⚠️ No models returned. Please check your API keys.',
        });
      }
    } catch (err: any) {
      setFetchStatusMessage({
        success: false,
        text: isFa
          ? `❌ خطا در برقراری ارتباط: ${err?.message || 'نامشخص'}`
          : `❌ Connection error: ${err?.message || 'Unknown'}`,
      });
    } finally {
      setIsFetchingLiveModels(false);
      setTimeout(() => {
        setFetchStatusMessage(null);
      }, 10000);
    }
  };

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(userProgress, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `pharmacy_study_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          onImportProgress(parsed);
          alert(isFa ? 'اطلاعات با موفقیت بازگردانی شد.' : 'Study data successfully imported.');
        }
      } catch (err) {
        alert(isFa ? 'فایل واردشده نامعتبر است.' : 'Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveAiSettings = () => {
    onSaveAiConfig(localAiConfig);
    setIsSavedBanner(true);
    setTimeout(() => setIsSavedBanner(false), 3000);
  };

  const handleAddCustomModel = () => {
    if (!customModelForm.id.trim() || !customModelForm.name.trim()) {
      alert(isFa ? 'شناسه و نام مدل الزامی است.' : 'Model ID and Name are required.');
      return;
    }

    const newModel: AiModelOption = {
      id: customModelForm.id.trim(),
      name: customModelForm.name.trim(),
      provider: customModelForm.provider,
      description: {
        fa: customModelForm.descFa.trim() || customModelForm.name.trim(),
        en: customModelForm.descEn.trim() || customModelForm.name.trim(),
      },
      badge: customModelForm.badge.trim() || 'Custom',
    };

    const updatedModels = [...(localAiConfig.customModels || []), newModel];
    const updatedConfig: UserAiConfig = {
      ...localAiConfig,
      customModels: updatedModels,
      flashcardModel: localAiConfig.flashcardModel || newModel.id,
      tutorModel: localAiConfig.tutorModel || newModel.id,
    };
    setLocalAiConfig(updatedConfig);
    onSaveAiConfig(updatedConfig);
    setShowAddCustomModel(false);
    setCustomModelForm({
      id: '',
      name: '',
      provider: 'gemini',
      descFa: '',
      descEn: '',
      badge: 'Custom',
    });
  };

  const handleDeleteModel = (modelId: string) => {
    const updatedModels = (localAiConfig.customModels || []).filter((m) => m.id !== modelId);
    const updatedConfig: UserAiConfig = {
      ...localAiConfig,
      customModels: updatedModels,
      flashcardModel:
        localAiConfig.flashcardModel === modelId
          ? updatedModels[0]?.id || ''
          : localAiConfig.flashcardModel,
      tutorModel:
        localAiConfig.tutorModel === modelId
          ? updatedModels[0]?.id || ''
          : localAiConfig.tutorModel,
    };
    setLocalAiConfig(updatedConfig);
    onSaveAiConfig(updatedConfig);
  };

  const handleClearAllModels = () => {
    const updatedConfig: UserAiConfig = {
      ...localAiConfig,
      customModels: [],
      flashcardModel: '',
      tutorModel: '',
    };
    setLocalAiConfig(updatedConfig);
    onSaveAiConfig(updatedConfig);
  };

  const allModels = localAiConfig.customModels || [];

  if (!isMounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="app-card border app-border p-4 sm:p-5 rounded-3xl max-w-xl sm:max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header with Navigation Tabs */}
        <div className="flex items-center justify-between border-b app-border pb-3">
          <div className="flex items-center gap-1 bg-black/30 p-1 rounded-2xl border app-border flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'general'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'app-muted hover:app-text'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{isFa ? 'عمومی' : 'General'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'app-muted hover:app-text'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isFa ? 'آمار و تسلط' : 'Mastery & Stats'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ai')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'app-muted hover:app-text'
              }`}
            >
              <Bot className="w-3.5 h-3.5 text-amber-300" />
              <span>{isFa ? 'هوش مصنوعی' : 'AI Engine'}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'app-muted hover:app-text'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isFa ? 'درباره' : 'About'}</span>
            </button>
          </div>

          <button onClick={onClose} className="app-muted hover:app-text p-1.5 rounded-lg hover:bg-black/20 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* AI Saved Alert Banner */}
        {isSavedBanner && (
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{isFa ? 'تنظیمات هوش مصنوعی با موفقیت ذخیره شد.' : 'AI Configuration successfully saved.'}</span>
          </div>
        )}

        {/* TAB 1: AI & API CONFIGURATION */}
        {activeTab === 'ai' && (
          <div className="space-y-4">
            
            {/* Header info badge */}
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-950/40 via-indigo-950/40 to-sky-950/30 border border-purple-500/30 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {isFa ? 'مدیریت موتورهای هوش مصنوعی (Google Gemini, Groq & xAI Grok)' : 'Multi-LLM AI Engine Management'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
                  Gemini / Groq / Grok
                </span>
              </div>
              <p className="text-[11px] text-purple-300/80 leading-relaxed">
                {isFa
                  ? 'پشتیبانی کامل از جدیدترین مدل‌های هوش مصنوعی جهان (Google Gemini 2.5، Groq LPU Llama 3.3 / DeepSeek R1 و xAI Grok). تمام مدل‌ها با قابلیت تست زنده و سوئیچ آنی در دسترس هستند.'
                  : 'Full multi-provider support for Google Gemini, Groq Cloud LPUs, and xAI Grok with live health check and instant testing.'}
              </p>
            </div>

            {/* Provider Selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold app-muted block flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-sky-400" />
                <span>{isFa ? 'ارائه‌دهنده پیش‌فرض هوش مصنوعی:' : 'Default AI Provider:'}</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {/* Google Gemini */}
                <button
                  type="button"
                  onClick={() =>
                    setLocalAiConfig({ ...localAiConfig, preferredProvider: 'gemini' })
                  }
                  className={`p-2.5 rounded-2xl border text-start transition flex flex-col gap-1 cursor-pointer ${
                    localAiConfig.preferredProvider === 'gemini'
                      ? 'bg-sky-600/20 border-sky-500 text-sky-200 ring-1 ring-sky-500 shadow-md shadow-sky-950/40'
                      : 'bg-black/20 border-slate-800 app-text hover:bg-black/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      Google Gemini
                    </span>
                    {localAiConfig.preferredProvider === 'gemini' && (
                      <Check className="w-3.5 h-3.5 text-sky-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isFa ? 'مدل‌های ۲.۵ Flash & Pro' : 'Gemini 2.5 Flash / Pro'}
                  </span>
                </button>

                {/* Groq Cloud */}
                <button
                  type="button"
                  onClick={() =>
                    setLocalAiConfig({ ...localAiConfig, preferredProvider: 'groq' })
                  }
                  className={`p-2.5 rounded-2xl border text-start transition flex flex-col gap-1 cursor-pointer ${
                    localAiConfig.preferredProvider === 'groq'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-200 ring-1 ring-amber-500 shadow-md shadow-amber-950/40'
                      : 'bg-black/20 border-slate-800 app-text hover:bg-black/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      Groq LPU (Speed)
                    </span>
                    {localAiConfig.preferredProvider === 'groq' && (
                      <Check className="w-3.5 h-3.5 text-amber-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isFa ? 'Llama 3.3 & DeepSeek R1' : 'Ultra-fast LPU engine'}
                  </span>
                </button>

                {/* xAI Grok */}
                <button
                  type="button"
                  onClick={() =>
                    setLocalAiConfig({ ...localAiConfig, preferredProvider: 'xai' })
                  }
                  className={`p-2.5 rounded-2xl border text-start transition flex flex-col gap-1 cursor-pointer ${
                    localAiConfig.preferredProvider === 'xai'
                      ? 'bg-purple-600/20 border-purple-500 text-purple-200 ring-1 ring-purple-500 shadow-md shadow-purple-950/40'
                      : 'bg-black/20 border-slate-800 app-text hover:bg-black/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1">
                      <Bot className="w-3.5 h-3.5 text-purple-300" />
                      xAI Grok
                    </span>
                    {localAiConfig.preferredProvider === 'xai' && (
                      <Check className="w-3.5 h-3.5 text-purple-400" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {isFa ? 'مدل رسمی Grok 2' : 'xAI Grok 2 Reasoning'}
                  </span>
                </button>
              </div>
            </div>

            {/* API Keys Configuration */}
            <div className="space-y-3 p-3 rounded-2xl bg-black/25 border app-border">
              <label className="text-[11px] font-bold app-text block flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                <span>{isFa ? 'کلیدهای اختصاصی API (Custom API Keys):' : 'Custom API Keys:'}</span>
              </label>

              {/* Gemini API Key */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] app-muted">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                    <span>Google Gemini API Key:</span>
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>{isFa ? 'دریافت کلید رایگان گوگل' : 'Get Gemini Key'}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={localAiConfig.geminiApiKey}
                  onChange={(e) =>
                    setLocalAiConfig({ ...localAiConfig, geminiApiKey: e.target.value })
                  }
                  placeholder="AIzaSy... (اختیاری - در صورت خالی بودن از سرور استفاده می‌شود)"
                  className="w-full text-xs p-2.5 rounded-xl bg-black/40 border border-slate-700/80 text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Groq API Key */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] app-muted">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span>Groq Cloud API Key:</span>
                  </span>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>{isFa ? 'دریافت کلید رایگان Groq' : 'Get Groq Key'}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={localAiConfig.groqApiKey}
                  onChange={(e) =>
                    setLocalAiConfig({ ...localAiConfig, groqApiKey: e.target.value })
                  }
                  placeholder="gsk_... (ویژه مدل‌های فوق سریع Groq)"
                  className="w-full text-xs p-2.5 rounded-xl bg-black/40 border border-slate-700/80 text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* xAI Grok Key */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] app-muted">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                    <span>xAI Grok API Key:</span>
                  </span>
                  <a
                    href="https://console.x.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:underline flex items-center gap-0.5"
                  >
                    <span>{isFa ? 'دریافت کلید xAI Grok' : 'Get xAI Key'}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                <input
                  type="password"
                  value={localAiConfig.xaiApiKey || ''}
                  onChange={(e) =>
                    setLocalAiConfig({ ...localAiConfig, xaiApiKey: e.target.value })
                  }
                  placeholder="xai-... (ویژه مدل‌های رسمی xAI Grok)"
                  className="w-full text-xs p-2.5 rounded-xl bg-black/40 border border-slate-700/80 text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Model Roles Assignment */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold app-muted block">
                {isFa ? 'تخصیص مدل هوش مصنوعی به بخش‌های برنامه:' : 'Assign AI Models to Tasks:'}
              </label>

              {/* Flashcard Generator Model */}
              <div className="p-3 rounded-2xl bg-black/20 border app-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold app-text flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    {isFa ? 'مدل ساخت هوشمند فلش‌کارت لایتنر:' : 'Flashcard Generation Model:'}
                  </span>
                  {localAiConfig.flashcardModel && (
                    <button
                      type="button"
                      onClick={() => {
                        const matched = allModels.find((m) => m.id === localAiConfig.flashcardModel);
                        handleTestConnection(matched?.provider || localAiConfig.preferredProvider, localAiConfig.flashcardModel);
                      }}
                      disabled={isTestingModel}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                    >
                      {isTestingModel ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Zap className="w-3 h-3 text-amber-300" />
                      )}
                      <span>{isFa ? 'تست آنلاین' : 'Test Model'}</span>
                    </button>
                  )}
                </div>

                {allModels.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={localAiConfig.flashcardModel}
                      onChange={(e) => {
                        const newModel = e.target.value;
                        const matched = allModels.find((m) => m.id === newModel);
                        const updatedConfig: UserAiConfig = {
                          ...localAiConfig,
                          flashcardModel: newModel,
                          preferredProvider: matched?.provider || localAiConfig.preferredProvider,
                        };
                        setLocalAiConfig(updatedConfig);
                        onSaveAiConfig(updatedConfig);
                      }}
                      className="w-full text-xs p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-purple-500 cursor-pointer font-sans"
                    >
                      <option value="">{isFa ? '-- انتخاب از مدل‌های آنلاین --' : '-- Select from live models --'}</option>
                      {allModels.map((m) => (
                        <option key={`fc-${m.id}`} value={m.id}>
                          [{m.provider.toUpperCase()}] {m.name} {m.badge ? `(${m.badge})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5 text-[10.5px]">
                      <span className="text-slate-400 shrink-0">{isFa ? 'یا نام دستی:' : 'Or manual:'}</span>
                      <input
                        type="text"
                        value={localAiConfig.flashcardModel}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updatedConfig = { ...localAiConfig, flashcardModel: val };
                          setLocalAiConfig(updatedConfig);
                          onSaveAiConfig(updatedConfig);
                        }}
                        placeholder="e.g. gemini-2.5-flash, llama-3.3-70b-versatile"
                        className="w-full text-xs p-1.5 rounded-lg bg-black/40 border border-slate-700 text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={localAiConfig.flashcardModel}
                      onChange={(e) => {
                        const updatedConfig = { ...localAiConfig, flashcardModel: e.target.value };
                        setLocalAiConfig(updatedConfig);
                        onSaveAiConfig(updatedConfig);
                      }}
                      placeholder={isFa ? 'شناسه مدل را بنویسید یا دکمه به‌روزرسانی مدل‌ها را بزنید...' : 'Enter model ID or click sync live models...'}
                      className="w-full text-xs p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-purple-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">
                      {isFa
                        ? '💡 برای دریافت لیست خودکار مدل‌های متصل به کلیدتان، دکمه «به‌روزرسانی آنلاین» در پایین را بزنید.'
                        : '💡 Enter your API key and click "Fetch & Sync Live Models" below to populate available models automatically.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Tutor & Chat Model */}
              <div className="p-3 rounded-2xl bg-black/20 border app-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold app-text flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-sky-400" />
                    {isFa ? 'مدل دستیار بالینی و حل تست (AI Tutor):' : 'Clinical Tutor & Case Q&A Model:'}
                  </span>
                  {localAiConfig.tutorModel && (
                    <button
                      type="button"
                      onClick={() => {
                        const matched = allModels.find((m) => m.id === localAiConfig.tutorModel);
                        handleTestConnection(matched?.provider || localAiConfig.preferredProvider, localAiConfig.tutorModel);
                      }}
                      disabled={isTestingModel}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/40 flex items-center gap-1 transition cursor-pointer disabled:opacity-50"
                    >
                      {isTestingModel ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Zap className="w-3 h-3 text-sky-300" />
                      )}
                      <span>{isFa ? 'تست آنلاین' : 'Test Model'}</span>
                    </button>
                  )}
                </div>

                {allModels.length > 0 ? (
                  <div className="space-y-1.5">
                    <select
                      value={localAiConfig.tutorModel}
                      onChange={(e) => {
                        const newModel = e.target.value;
                        const matched = allModels.find((m) => m.id === newModel);
                        const updatedConfig: UserAiConfig = {
                          ...localAiConfig,
                          tutorModel: newModel,
                          preferredProvider: matched?.provider || localAiConfig.preferredProvider,
                        };
                        setLocalAiConfig(updatedConfig);
                        onSaveAiConfig(updatedConfig);
                      }}
                      className="w-full text-xs p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 cursor-pointer font-sans"
                    >
                      <option value="">{isFa ? '-- انتخاب از مدل‌های آنلاین --' : '-- Select from live models --'}</option>
                      {allModels.map((m) => (
                        <option key={`tut-${m.id}`} value={m.id}>
                          [{m.provider.toUpperCase()}] {m.name} {m.badge ? `(${m.badge})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5 text-[10.5px]">
                      <span className="text-slate-400 shrink-0">{isFa ? 'یا نام دستی:' : 'Or manual:'}</span>
                      <input
                        type="text"
                        value={localAiConfig.tutorModel}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updatedConfig = { ...localAiConfig, tutorModel: val };
                          setLocalAiConfig(updatedConfig);
                          onSaveAiConfig(updatedConfig);
                        }}
                        placeholder="e.g. gemini-2.5-flash, deepseek-r1-distill-llama-70b"
                        className="w-full text-xs p-1.5 rounded-lg bg-black/40 border border-slate-700 text-slate-100 font-mono"
                      />
                    </div>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={localAiConfig.tutorModel}
                    onChange={(e) => {
                      const updatedConfig = { ...localAiConfig, tutorModel: e.target.value };
                      setLocalAiConfig(updatedConfig);
                      onSaveAiConfig(updatedConfig);
                    }}
                    placeholder={isFa ? 'شناسه مدل دستیار را بنویسید...' : 'Enter tutor model ID...'}
                    className="w-full text-xs p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                  />
                )}
              </div>

              {/* Test Result Toast */}
              {testResult && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 animate-fadeIn border ${
                    testResult.success
                      ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <span className="text-[11px] leading-relaxed">{testResult.message}</span>
                  <button
                    type="button"
                    onClick={() => setTestResult(null)}
                    className="text-slate-400 hover:text-white shrink-0 p-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Model Registry List & Custom Models */}
            <div className="space-y-2.5 pt-2 border-t app-border">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-[11px] font-bold app-muted flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isFa ? 'فهرست مدل‌های بارگذاری‌شده:' : 'Loaded Models Registry:'}</span>
                </label>
                <div className="flex items-center gap-2">
                  {allModels.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllModels}
                      className="text-[10px] text-rose-400 hover:text-rose-300 transition underline cursor-pointer"
                    >
                      {isFa ? 'پاک‌سازی همه مدل‌ها' : 'Clear All Models'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAddCustomModel(!showAddCustomModel)}
                    className="text-[10px] px-2 py-1 rounded-lg bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 border border-purple-500/40 flex items-center gap-1 font-bold cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{isFa ? 'افزودن دستی مدل' : 'Add Model'}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Live Model Sync Action Banner */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-sky-950/40 via-purple-950/30 to-slate-900/60 border border-sky-500/30 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      <Zap className="w-4 h-4 text-sky-400 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                        <span>{isFa ? 'استعلام آنلاین و همگام‌سازی آخرین مدل‌ها' : 'Live Cloud Model Discovery & Sync'}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                          Live Sync
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-400 leading-relaxed mt-0.5">
                        {isFa
                          ? 'با فشردن این دکمه، آخرین مدل‌های فعال مستقیماً بر اساس کلید اختصاصی شما از سرورها استعلام و فهرست می‌شوند.'
                          : 'Discover and load active models directly from live provider APIs (Google, Groq & xAI).'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncLiveModels}
                    disabled={isFetchingLiveModels}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30 transition cursor-pointer disabled:opacity-50"
                  >
                    {isFetchingLiveModels ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{isFa ? 'در حال استعلام و دریافت از سرورها...' : 'Querying Live Provider APIs...'}</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>{isFa ? 'به‌روزرسانی آنلاین آخرین مدل‌های فعال (Sync Live Models)' : 'Fetch & Sync Latest Live Models'}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Status Message */}
                {fetchStatusMessage && (
                  <div
                    className={`p-2.5 rounded-xl text-xs space-y-1.5 animate-fadeIn border ${
                      fetchStatusMessage.success
                        ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                        : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
                    }`}
                  >
                    <div className="font-bold">{fetchStatusMessage.text}</div>
                    {fetchStatusMessage.details && (
                      <div className="text-[10px] grid grid-cols-1 gap-1 text-slate-300 pt-1 border-t border-slate-700/50 font-mono">
                        <div>Gemini: {fetchStatusMessage.details.gemini?.message}</div>
                        <div>Groq: {fetchStatusMessage.details.groq?.message}</div>
                        <div>xAI Grok: {fetchStatusMessage.details.xai?.message}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Add Custom Model Form */}
              {showAddCustomModel && (
                <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/40 space-y-2.5 animate-fadeIn text-xs">
                  <div className="font-bold text-purple-200 text-xs">
                    {isFa ? 'افزودن مدل هوش مصنوعی دلخواه:' : 'Add Custom Model:'}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] app-muted block mb-0.5">Model ID / Identifier:</span>
                      <input
                        type="text"
                        placeholder="e.g. gemini-2.5-flash, grok-2"
                        value={customModelForm.id}
                        onChange={(e) =>
                          setCustomModelForm({ ...customModelForm, id: e.target.value })
                        }
                        className="w-full p-1.5 rounded-lg bg-black/40 border border-slate-700 text-slate-100 font-mono text-[11px]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] app-muted block mb-0.5">Display Name:</span>
                      <input
                        type="text"
                        placeholder="e.g. Gemini 2.5 Flash Ultra"
                        value={customModelForm.name}
                        onChange={(e) =>
                          setCustomModelForm({ ...customModelForm, name: e.target.value })
                        }
                        className="w-full p-1.5 rounded-lg bg-black/40 border border-slate-700 text-slate-100 text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] app-muted block mb-0.5">Provider:</span>
                      <select
                        value={customModelForm.provider}
                        onChange={(e) =>
                          setCustomModelForm({
                            ...customModelForm,
                            provider: e.target.value as AiProvider,
                          })
                        }
                        className="w-full p-1.5 rounded-lg bg-black/40 border border-slate-700 text-slate-100 text-[11px]"
                      >
                        <option value="gemini">Google Gemini</option>
                        <option value="groq">Groq LPU</option>
                        <option value="xai">xAI Grok</option>
                      </select>
                    </div>
                    <div>
                      <span className="text-[10px] app-muted block mb-0.5">Badge / Tag:</span>
                      <input
                        type="text"
                        placeholder="e.g. Fast, Pro, Custom"
                        value={customModelForm.badge}
                        onChange={(e) =>
                          setCustomModelForm({ ...customModelForm, badge: e.target.value })
                        }
                        className="w-full p-1.5 rounded-lg bg-black/40 border border-slate-700 text-slate-100 text-[11px]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddCustomModel(false)}
                      className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-white text-xs cursor-pointer"
                    >
                      {isFa ? 'انصراف' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCustomModel}
                      className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{isFa ? 'ثبت و افزودن' : 'Add Model'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Models List */}
              {allModels.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                  {allModels.map((m) => (
                    <div
                      key={m.id}
                      className="p-2 rounded-xl bg-black/20 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold app-text text-[11.5px] truncate">{m.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold ${
                              m.provider === 'gemini'
                                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                                : m.provider === 'groq'
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {m.provider}
                          </span>
                          {m.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {m.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] app-muted truncate">
                          {isFa ? m.description?.fa : m.description?.en}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleTestConnection(m.provider, m.id)}
                          disabled={isTestingModel}
                          className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition cursor-pointer"
                          title={isFa ? 'تست اتصال این مدل' : 'Test this model'}
                        >
                          <Zap className="w-2.5 h-2.5 text-amber-400" />
                          <span>{isFa ? 'تست' : 'Test'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteModel(m.id)}
                          className="text-rose-400 hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/20 transition cursor-pointer shrink-0"
                          title={isFa ? 'حذف مدل' : 'Delete model'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-black/20 border border-dashed border-slate-800 text-center space-y-1">
                  <p className="text-xs text-slate-400">
                    {isFa ? 'هیچ مدلی ذخیره نشده است.' : 'No models registered yet.'}
                  </p>
                  <p className="text-[10.5px] text-slate-500">
                    {isFa
                      ? 'برای بارگذاری خودکار مدل‌ها بر اساس کلیدتان دکمه «به‌روزرسانی آنلاین» بالا را بزنید.'
                      : 'Click "Fetch & Sync Latest Live Models" above to query your active keys.'}
                  </p>
                </div>
              )}
            </div>

            {/* Save AI Config Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveAiSettings}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-bold text-xs transition shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{isFa ? 'ذخیره تنظیمات هوش مصنوعی' : 'Save AI Configuration'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: GENERAL SETTINGS */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            
            {/* TODAY'S STUDY ACTIVITY & PROGRESS CARD */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/35 via-slate-900 to-indigo-950/35 border border-amber-500/30 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-300 text-xs sm:text-sm">
                  <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>{isFa ? 'پیشرفت و فعالیت امروز شما' : "Today's Study Activity"}</span>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <span>{totalCompleted} {isFa ? 'مبحث مسلط' : 'Mastered'}</span>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded-xl bg-black/40 border border-slate-800 flex flex-col gap-0.5">
                  <span className="text-slate-400 text-[10px]">{isFa ? 'تریاژ:' : 'Triage:'}</span>
                  <span className="font-mono font-bold text-emerald-400 text-xs">{scenarioActions}</span>
                </div>

                <div className="p-2 rounded-xl bg-black/40 border border-slate-800 flex flex-col gap-0.5">
                  <span className="text-slate-400 text-[10px]">{isFa ? 'قفسه داروها:' : 'Shelf Drugs:'}</span>
                  <span className="font-mono font-bold text-sky-400 text-xs">{drugActions}</span>
                </div>

                <div className="p-2 rounded-xl bg-black/40 border border-slate-800 flex flex-col gap-0.5">
                  <span className="text-slate-400 text-[10px]">{isFa ? 'نسخه Fred:' : 'Fred Scripts:'}</span>
                  <span className="font-mono font-bold text-teal-400 text-xs">{dispenseActions}</span>
                </div>

                <div className="p-2 rounded-xl bg-black/40 border border-slate-800 flex flex-col gap-0.5">
                  <span className="text-slate-400 text-[10px]">{isFa ? 'کارت لایتنر:' : 'Leitner:'}</span>
                  <span className="font-mono font-bold text-purple-400 text-xs">{leitnerActions}</span>
                </div>
              </div>

              {onOpenLeitnerBox && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLeitnerBox();
                  }}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 transition cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  <span>{isFa ? 'مشاهده جعبه و کارت‌های لایتنر' : 'Open Leitner Box'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('analytics')}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <TrendingUp className="w-4 h-4 text-emerald-200" />
                <span>{isFa ? 'مشاهده نمودارهای تحلیلی تسلط و روند آزمون' : 'View Study Mastery & Quiz Trend Analytics'}</span>
              </button>
            </div>

            {/* User Account & Cloud Sync Section */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold app-muted flex items-center justify-between">
                <span>{isFa ? 'حساب کاربری و همگام‌سازی ابری:' : 'User Account & Cloud Sync:'}</span>
                {user && (
                  <span className="text-[10px] text-emerald-400 font-mono font-bold flex items-center gap-1">
                    <CloudCheck className="w-3 h-3" />
                    <span>{isFa ? 'متصل' : 'Connected'}</span>
                  </span>
                )}
              </label>

              {user ? (
                <div className="p-3 rounded-2xl bg-black/30 border app-border space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    {user.photoURL ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.photoURL}
                        alt="User Profile"
                        className="w-9 h-9 rounded-full border border-sky-400/40 object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-sm border border-sky-500/30 shrink-0">
                        {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold app-text text-xs truncate">
                        {user.displayName || user.email || (isFa ? 'کاربر فارماکولوژی' : 'User')}
                      </h4>
                      <p className="text-[10px] app-muted truncate">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t app-border">
                    <span className="text-[10px] text-slate-400">
                      {isSyncing
                        ? isFa
                          ? 'در حال ذخیره...'
                          : 'Syncing...'
                        : lastSyncedAt
                        ? (isFa ? 'آخرین ذخیره: ' : 'Last sync: ') +
                          new Date(lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : isFa
                        ? 'ذخیره شده در ابر'
                        : 'Synced to cloud'}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenAuth?.();
                      }}
                      className="px-2.5 py-1 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 font-bold text-[11px] border border-sky-500/30 transition flex items-center gap-1 cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>{isFa ? 'مدیریت حساب' : 'Manage'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-black/30 border app-border space-y-2 text-center">
                  <p className="text-[11px] app-muted leading-relaxed">
                    {isFa
                      ? 'برای همگام‌سازی دائمی داده‌ها و دسترسی در تمام دستگاه‌ها وارد حساب شوید.'
                      : 'Sign in to sync your data across all devices.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAuth?.();
                    }}
                    className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-md shadow-purple-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>{isFa ? 'ورود / ایجاد حساب کاربری' : 'Sign In / Register'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Language Selection */}
            {onToggleLanguage && (
              <div className="space-y-2">
                <label className="text-[11px] font-bold app-muted block">
                  {isFa ? 'زبان برنامه:' : 'Application Language:'}
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (language !== 'fa') onToggleLanguage();
                    }}
                    className={`p-2 rounded-xl border app-border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      language === 'fa'
                        ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                        : 'bg-black/10 hover:bg-black/20 app-text'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>فارسی</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (language !== 'en') onToggleLanguage();
                    }}
                    className={`p-2 rounded-xl border app-border font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
                      language === 'en'
                        ? 'bg-sky-600 text-white border-sky-500 shadow-md'
                        : 'bg-black/10 hover:bg-black/20 app-text'
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>English</span>
                  </button>
                </div>
              </div>
            )}

            {/* Layout Mode Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold app-muted block">
                {isFa ? 'حالت نمایش کارت‌ها (ویژه ماژول ۴):' : 'Display Mode (Module 4):'}
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => onChangeLayoutMode('window-grid')}
                  className={`p-2 border app-border rounded-xl flex flex-col items-center gap-1 transition cursor-pointer ${
                    layoutMode === 'window-grid'
                      ? 'bg-sky-600 text-white font-bold border-sky-500'
                      : 'bg-black/10 hover:bg-black/20 app-text'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>{isFa ? 'شبکه‌ای' : 'Grid'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLayoutMode('list')}
                  className={`p-2 border app-border rounded-xl flex flex-col items-center gap-1 transition cursor-pointer ${
                    layoutMode === 'list'
                      ? 'bg-sky-600 text-white font-bold border-sky-500'
                      : 'bg-black/10 hover:bg-black/20 app-text'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span>{isFa ? 'لیستی' : 'List'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLayoutMode('split')}
                  className={`p-2 border app-border rounded-xl flex flex-col items-center gap-1 transition cursor-pointer ${
                    layoutMode === 'split'
                      ? 'bg-sky-600 text-white font-bold border-sky-500'
                      : 'bg-black/10 hover:bg-black/20 app-text'
                  }`}
                >
                  <Columns className="w-4 h-4" />
                  <span>{isFa ? 'اسپلیت' : 'Split'}</span>
                </button>
              </div>
            </div>

            {/* Mobile Status Bar & Screen Experience */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold app-muted flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isFa ? 'حالت نمایش صفحه و نوار اعلان (Status Bar):' : 'Display & Mobile Status Bar:'}</span>
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
                      if (document.exitFullscreen) document.exitFullscreen();
                      else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-start flex items-center justify-between transition cursor-pointer ${
                    typeof document !== 'undefined' && !document.fullscreenElement && !(document as any).webkitFullscreenElement
                      ? 'bg-sky-600/20 border-sky-500 text-sky-300 ring-1 ring-sky-500'
                      : 'bg-black/10 app-text border app-border hover:bg-black/20'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      {isFa ? 'بلور شیشه‌ای همرنگ تم' : 'Glassmorphic Top Bar'}
                    </span>
                    <span className="text-[10px] app-muted">
                      {isFa ? 'کشیدگی تا زیر سلفی با افکت شیشه‌ای محو' : 'Edge-to-edge frosted glass under notch'}
                    </span>
                  </div>
                  {typeof document !== 'undefined' && !document.fullscreenElement && !(document as any).webkitFullscreenElement && (
                    <Check className="w-4 h-4 text-sky-400 shrink-0" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
                      if (document.documentElement.requestFullscreen) {
                        document.documentElement.requestFullscreen();
                      } else if ((document.documentElement as any).webkitRequestFullscreen) {
                        (document.documentElement as any).webkitRequestFullscreen();
                      }
                    }
                  }}
                  className={`p-2.5 rounded-xl border text-start flex items-center justify-between transition cursor-pointer ${
                    typeof document !== 'undefined' && (!!document.fullscreenElement || !!(document as any).webkitFullscreenElement)
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300 ring-1 ring-amber-500'
                      : 'bg-black/10 app-text border app-border hover:bg-black/20'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                      {isFa ? 'تمام‌صفحه غوطه‌وری کامل' : 'Immersive Fullscreen'}
                    </span>
                    <span className="text-[10px] app-muted">
                      {isFa ? 'مخفی‌سازی کامل نوار وضعیت و ابزارها' : 'Hide notification bar for distraction-free study'}
                    </span>
                  </div>
                  {typeof document !== 'undefined' && (!!document.fullscreenElement || !!(document as any).webkitFullscreenElement) && (
                    <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                </button>
              </div>
            </div>

            {/* Font Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold app-muted block">
                  {isFa ? 'اندازه قلم و متون برنامه:' : 'Font Size & Scale:'}
                </label>
                <span className="text-[10px] font-mono text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                  {fontSize === 'sm' ? '13.5px (Small)' : fontSize === 'md' ? '15.5px (Standard)' : fontSize === 'lg' ? '18px (Large)' : '21px (X-Large)'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                {([
                  { id: 'sm' as FontSize, label: { fa: 'کوچک', en: 'Small' }, preview: 'text-xs', size: '13.5px' },
                  { id: 'md' as FontSize, label: { fa: 'متوسط', en: 'Medium' }, preview: 'text-sm', size: '15.5px' },
                  { id: 'lg' as FontSize, label: { fa: 'بزرگ', en: 'Large' }, preview: 'text-base font-bold', size: '18px' },
                  { id: 'xl' as FontSize, label: { fa: 'خیلی بزرگ', en: 'X-Large' }, preview: 'text-lg font-black', size: '21px' },
                ]).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSetFontSize(item.id)}
                    className={`py-2 px-1 border app-border rounded-xl flex flex-col items-center gap-1 transition cursor-pointer ${
                      fontSize === item.id
                        ? 'bg-sky-600 text-white font-bold border-sky-500 shadow-md shadow-sky-950/20 ring-1 ring-white/20'
                        : 'bg-black/10 hover:bg-black/20 app-text'
                    }`}
                  >
                    <span className={item.preview}>A</span>
                    <span className="text-[10px] truncate">{isFa ? item.label.fa : item.label.en}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Picker — 4 Themes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold app-muted flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isFa ? 'انتخاب تم و حالت مطالعه:' : 'Visual Theme & Reading Mode:'}</span>
                </label>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  {isFa ? 'WCAG AA' : 'Eye-Care'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[11px]">

                {/* ☀️ تم روز — Day */}
                <button
                  type="button"
                  onClick={() => onSetTheme('day')}
                  className={`relative overflow-hidden rounded-2xl border-2 transition-all cursor-pointer group ${
                    theme === 'day'
                      ? 'border-blue-500 shadow-lg shadow-blue-500/20 scale-[1.02]'
                      : 'border-gray-200 hover:border-blue-300 hover:scale-[1.01]'
                  }`}
                  style={{ background: '#F9FAFB' }}
                >
                  {/* Preview area */}
                  <div className="p-3 space-y-1.5">
                    {/* Mock header */}
                    <div className="h-2.5 w-full rounded" style={{ background: 'linear-gradient(to right, #2563EB, #4F46E5)', opacity: 0.9 }} />
                    {/* Mock card */}
                    <div className="rounded-lg p-2 space-y-1" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgb(0 0 0 / 0.07)' }}>
                      <div className="h-1.5 rounded-full w-3/4" style={{ background: '#111827' }} />
                      <div className="h-1 rounded-full w-full opacity-50" style={{ background: '#6B7280' }} />
                      <div className="h-1 rounded-full w-2/3 opacity-40" style={{ background: '#6B7280' }} />
                    </div>
                    {/* Mock second card */}
                    <div className="rounded-lg p-1.5 space-y-0.5" style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
                      <div className="h-1 rounded-full w-1/2" style={{ background: '#111827' }} />
                      <div className="h-1 rounded-full w-full opacity-40" style={{ background: '#9CA3AF' }} />
                    </div>
                  </div>
                  {/* Label */}
                  <div className="px-3 pb-2.5 flex flex-col gap-0.5" style={{ color: '#111827' }}>
                    <div className="flex items-center gap-1.5">
                      <Sun className="w-3.5 h-3.5" style={{ color: '#2563EB' }} />
                      <span className="font-bold text-[12px]">{isFa ? 'تم روز' : 'Day'}</span>
                      {theme === 'day' && (
                        <span className="mr-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#2563EB', color: '#fff' }}>
                          {isFa ? 'فعال' : 'Active'}
                        </span>
                      )}
                    </div>
                    <span className="text-[9.5px]" style={{ color: '#6B7280' }}>{isFa ? 'روشن مدرن · کنتراست بالا' : 'Modern Light · High Contrast'}</span>
                  </div>
                </button>

                {/* 🌑 تم شب — Night */}
                <button
                  type="button"
                  onClick={() => onSetTheme('night')}
                  className={`relative overflow-hidden rounded-2xl border-2 transition-all cursor-pointer group ${
                    theme === 'night'
                      ? 'border-sky-400 shadow-lg shadow-sky-400/20 scale-[1.02]'
                      : 'border-zinc-700 hover:border-sky-600 hover:scale-[1.01]'
                  }`}
                  style={{ background: '#09090B' }}
                >
                  <div className="p-3 space-y-1.5">
                    <div className="h-2.5 w-full rounded" style={{ background: 'linear-gradient(to right, #0F766E, #0369A1)', opacity: 0.9 }} />
                    <div className="rounded-lg p-2 space-y-1" style={{ background: '#18181B', border: '1px solid #3F3F46', boxShadow: '0 1px 3px rgb(0 0 0 / 0.45)' }}>
                      <div className="h-1.5 rounded-full w-3/4" style={{ background: '#FAFAFA' }} />
                      <div className="h-1 rounded-full w-full opacity-50" style={{ background: '#A1A1AA' }} />
                      <div className="h-1 rounded-full w-2/3 opacity-35" style={{ background: '#A1A1AA' }} />
                    </div>
                    <div className="rounded-lg p-1.5 space-y-0.5" style={{ background: '#18181B', border: '1px solid #3F3F46' }}>
                      <div className="h-1 rounded-full w-1/2" style={{ background: '#FAFAFA' }} />
                      <div className="h-1 rounded-full w-full opacity-40" style={{ background: '#71717A' }} />
                    </div>
                  </div>
                  <div className="px-3 pb-2.5 flex flex-col gap-0.5" style={{ color: '#FAFAFA' }}>
                    <div className="flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5" style={{ color: '#38BDF8' }} />
                      <span className="font-bold text-[12px]">{isFa ? 'تم شب' : 'Night'}</span>
                      {theme === 'night' && (
                        <span className="mr-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#38BDF8', color: '#09090B' }}>
                          {isFa ? 'فعال' : 'Active'}
                        </span>
                      )}
                    </div>
                    <span className="text-[9.5px]" style={{ color: '#71717A' }}>{isFa ? 'تاریک OLED · ضد خستگی' : 'OLED Dark · Easy on Eyes'}</span>
                  </div>
                </button>

                {/* 📖 کتابخوان روز — Reader Day */}
                <button
                  type="button"
                  onClick={() => onSetTheme('reader-day')}
                  className={`relative overflow-hidden rounded-2xl border-2 transition-all cursor-pointer group ${
                    theme === 'reader-day'
                      ? 'border-amber-600 shadow-lg shadow-amber-600/20 scale-[1.02]'
                      : 'border-amber-200 hover:border-amber-500 hover:scale-[1.01]'
                  }`}
                  style={{ background: '#F5ECD8' }}
                >
                  <div className="p-3 space-y-1.5">
                    <div className="h-2.5 w-full rounded" style={{ background: '#8B4513', opacity: 0.85 }} />
                    <div className="rounded-lg p-2 space-y-1" style={{ background: '#FDF9F2', border: '1px solid #D4C5A9', boxShadow: '0 1px 3px rgb(60 30 10 / 0.08)' }}>
                      <div className="h-1.5 rounded-full w-3/4" style={{ background: '#2D1B0E', fontFamily: 'Georgia, serif' }} />
                      <div className="h-1 rounded-full w-full opacity-60" style={{ background: '#7A5C40' }} />
                      <div className="h-1 rounded-full w-full opacity-50" style={{ background: '#7A5C40' }} />
                      <div className="h-1 rounded-full w-4/5 opacity-45" style={{ background: '#7A5C40' }} />
                    </div>
                    <div className="rounded-lg p-1.5 space-y-0.5" style={{ background: '#FDF9F2', border: '1px solid #D4C5A9' }}>
                      <div className="h-1 rounded-full w-1/2" style={{ background: '#2D1B0E' }} />
                      <div className="h-1 rounded-full w-full opacity-45" style={{ background: '#9E7D5F' }} />
                    </div>
                  </div>
                  <div className="px-3 pb-2.5 flex flex-col gap-0.5" style={{ color: '#2D1B0E' }}>
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" style={{ color: '#8B4513' }} />
                      <span className="font-bold text-[12px]" style={{ fontFamily: 'Georgia, serif' }}>{isFa ? 'کتابخوان روز' : 'Reader Day'}</span>
                      {theme === 'reader-day' && (
                        <span className="mr-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#8B4513', color: '#FDF9F2' }}>
                          {isFa ? 'فعال' : 'Active'}
                        </span>
                      )}
                    </div>
                    <span className="text-[9.5px]" style={{ color: '#7A5C40' }}>{isFa ? 'کاغذ عاجی گرم · سریف' : 'Warm Ivory · Serif Font'}</span>
                  </div>
                </button>

                {/* 🌙 کتابخوان شب — Reader Night */}
                <button
                  type="button"
                  onClick={() => onSetTheme('reader-night')}
                  className={`relative overflow-hidden rounded-2xl border-2 transition-all cursor-pointer group ${
                    theme === 'reader-night'
                      ? 'border-amber-700 shadow-lg shadow-amber-700/20 scale-[1.02]'
                      : 'border-amber-900/40 hover:border-amber-700 hover:scale-[1.01]'
                  }`}
                  style={{ background: '#1A1008' }}
                >
                  <div className="p-3 space-y-1.5">
                    <div className="h-2.5 w-full rounded" style={{ background: '#3D2812', opacity: 0.9 }} />
                    <div className="rounded-lg p-2 space-y-1" style={{ background: '#231508', border: '1px solid #3D2812', boxShadow: '0 1px 3px rgb(0 0 0 / 0.5)' }}>
                      <div className="h-1.5 rounded-full w-3/4" style={{ background: '#EDD9B5' }} />
                      <div className="h-1 rounded-full w-full opacity-60" style={{ background: '#A07850' }} />
                      <div className="h-1 rounded-full w-full opacity-50" style={{ background: '#A07850' }} />
                      <div className="h-1 rounded-full w-4/5 opacity-45" style={{ background: '#A07850' }} />
                    </div>
                    <div className="rounded-lg p-1.5 space-y-0.5" style={{ background: '#231508', border: '1px solid #3D2812' }}>
                      <div className="h-1 rounded-full w-1/2" style={{ background: '#EDD9B5' }} />
                      <div className="h-1 rounded-full w-full opacity-45" style={{ background: '#7A5A38' }} />
                    </div>
                  </div>
                  <div className="px-3 pb-2.5 flex flex-col gap-0.5" style={{ color: '#EDD9B5' }}>
                    <div className="flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5" style={{ color: '#D4996C' }} />
                      <span className="font-bold text-[12px]" style={{ fontFamily: 'Georgia, serif' }}>{isFa ? 'کتابخوان شب' : 'Reader Night'}</span>
                      {theme === 'reader-night' && (
                        <span className="mr-auto text-[9px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#D4996C', color: '#1A1008' }}>
                          {isFa ? 'فعال' : 'Active'}
                        </span>
                      )}
                    </div>
                    <span className="text-[9.5px]" style={{ color: '#7A5A38' }}>{isFa ? 'گرم تیره · ضد نور آبی' : 'Dark Amber · Anti-Blue Light'}</span>
                  </div>
                </button>

              </div>

              {/* Reading mode info badge */}
              {(theme === 'reader-day' || theme === 'reader-night') && (
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-[10.5px]">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: theme === 'reader-day' ? '#8B4513' : '#D4996C' }} />
                  <span style={{ color: theme === 'reader-day' ? '#7A5C40' : '#A07850' }}>
                    {isFa
                      ? 'حالت کتابخوان فعال: فونت Serif · تایپوگرافی بهینه برای مطالعه طولانی'
                      : 'Reader mode: Serif font · Optimized typography for long reading sessions'}
                  </span>
                </div>
              )}
            </div>

            {/* Data Backup & Restore */}
            <div className="pt-2 border-t app-border space-y-2">
              <label className="text-[11px] font-bold app-muted block">
                {isFa ? 'پشتیبان‌گیری و بازگردانی یادداشت‌ها:' : 'Backup & Restore:'}
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleExportData}
                  className="p-2 rounded-xl bg-black/20 border app-border app-text hover:bg-black/30 transition flex items-center justify-center gap-1.5 font-medium cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isFa ? 'خروجی JSON' : 'Export JSON'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl bg-black/20 border app-border app-text hover:bg-black/30 transition flex items-center justify-center gap-1.5 font-medium cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{isFa ? 'ورودی JSON' : 'Import JSON'}</span>
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportData}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>

            {/* PWA & Offline App Status */}
            <div className="pt-2 border-t app-border space-y-2">
              <label className="text-[11px] font-bold app-muted block flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                <span>{isFa ? 'نصب اپلیکیشن روی دستگاه و کارکرد آفلاین:' : 'App Installation & Offline Mode:'}</span>
              </label>

              <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900/60 border border-purple-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="font-bold text-slate-200">
                      {isFa ? 'قابلیت اجرای ۱۰۰٪ آفلاین (PWA)' : '100% Offline Ready'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    Active
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-300/80 leading-relaxed">
                  {isFa
                    ? 'تمام کارت‌ها، سناریوهای تریاژ، دیسپنس و لایتنر در حافظه کش محلی مرورگر ذخیره شده و بدون اینترنت اجرا می‌شوند.'
                    : 'All modules, flashcards and Leitner data are cached locally for full offline capability.'}
                </p>
              </div>
            </div>

            {/* Reset Button */}
            <div className="pt-2 border-t app-border">
              <button
                type="button"
                onClick={onReset}
                className="w-full py-2 bg-rose-600/20 border border-rose-500/40 text-rose-400 hover:bg-rose-600/30 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isFa ? 'بازنشانی کامل ذخیره‌ها' : 'Reset All Progress'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: ABOUT APP & OFFICIAL AUSTRALIAN REFERENCES */}
        {activeTab === 'about' && (
          <div className="space-y-4 text-xs">
            {/* App Identification Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-950/40 via-indigo-950/40 to-slate-900/60 border border-sky-500/30 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-sky-600/20 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm app-text truncate">
                    {isFa ? 'شبیه‌ساز جامع داروخانه استرالیا' : 'AU Pharmacy Study & Practice Simulator'}
                  </h3>
                  <p className="text-[11px] app-muted truncate">
                    {isFa ? 'پلتفرم جامع یادگیری و کارآموزی داروسازی' : 'Comprehensive Pharmacy Learning Suite'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  {isFa ? 'به‌روز برای ۲۰۲۶' : 'Updated for 2026'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 font-mono font-bold text-[10px] border border-sky-500/30">
                  v4.5 PWA Native
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 font-mono font-bold text-[10px] border border-purple-500/30 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  AI Clinical Engines
                </span>
              </div>

              <p className="text-[11px] text-slate-300/90 leading-relaxed border-t border-sky-500/20 pt-2">
                {isFa
                  ? 'این سامانه به عنوان یک پلتفرم جامع آموزشی و تصمیم‌گیری بالینی، شامل پروتکل‌های تریاژ سرپایی WWHAM، قفسه مجازی داروهای S2/S3، شبیه‌ساز نرم‌افزار نسخه‌پیچی Fred Dispense، فارماکولوژی بالینی و جعبه لایتنر هوشمند همراه با هوش مصنوعی طراحی شده است.'
                  : 'Designed as an interactive Australian pharmacy clinical decision support and registration exam simulation platform aligned with PBA, APF, and Therapeutic Guidelines.'}
              </p>
            </div>

            {/* Official Australian Clinical & Regulatory Links */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold app-muted block flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-sky-400" />
                <span>{isFa ? 'سازمان‌ها و مراجع رسمی داروسازی استرالیا:' : 'Official Australian Regulatory Guidelines:'}</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  {
                    nameFa: 'بورد داروسازی استرالیا (PBA)',
                    nameEn: 'Pharmacy Board of Australia (PBA)',
                    url: 'https://www.pharmacyboard.gov.au',
                    desc: isFa ? 'استانداردهای ثبت‌نام و ارزیابی صلاحیت' : 'Registration & Competency Standards',
                  },
                  {
                    nameFa: 'انجمن داروسازان استرالیا (PSA)',
                    nameEn: 'Pharmaceutical Society of Australia',
                    url: 'https://www.psa.org.au',
                    desc: isFa ? 'دستورالعمل‌های حرفه‌ای و تریاژ سرپایی' : 'Professional Practice Guidelines',
                  },
                  {
                    nameFa: 'سامانه یارانه دارویی استرالیا (PBS)',
                    nameEn: 'Pharmaceutical Benefits Scheme (PBS)',
                    url: 'https://www.pbs.gov.au',
                    desc: isFa ? 'قوانین Safety Net، اقلام و کدهای استحقاق' : 'Medicine Schedule & Safety Net Rules',
                  },
                  {
                    nameFa: 'اداره کالاهای درمانی استرالیا (TGA)',
                    nameEn: 'Therapeutic Goods Administration',
                    url: 'https://www.tga.gov.au',
                    desc: isFa ? 'قوانین برچسب‌گذاری و زمان‌بندی سموم (SUSMP)' : 'Poisons Standard (SUSMP) & Safety Alerts',
                  },
                  {
                    nameFa: 'انجمن داروسازان بیمارستانی (SHPA)',
                    nameEn: 'Advanced Pharmacy Australia (SHPA)',
                    url: 'https://www.shpa.org.au',
                    desc: isFa ? 'پروتکل‌های داروسازی بالینی و بیمارستانی' : 'Hospital Clinical Guidelines',
                  },
                  {
                    nameFa: 'کتابچه داروهای استرالیا (AMH)',
                    nameEn: 'Australian Medicines Handbook (AMH)',
                    url: 'https://shop.amh.net.au',
                    desc: isFa ? 'مرجع دوز، تداخلات و هشدارهای بالینی' : 'National Comparative Drug Guide',
                  },
                ].map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-xl border app-border app-bg hover:bg-slate-800 transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-bold text-slate-200 group-hover:text-sky-400 transition truncate">
                        {isFa ? item.nameFa : item.nameEn}
                      </div>
                      <div className="text-[10px] app-muted truncate">{item.desc}</div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 transition shrink-0" />
                  </a>
                ))}
              </div>
            </div>

            {/* Clinical & Legal Disclaimer */}
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Info className="w-4 h-4 shrink-0" />
                <span>{isFa ? 'سلب مسئولیت بالینی و حقوقی' : 'Clinical & Legal Disclaimer'}</span>
              </div>
              <p className="text-[10.5px] text-slate-300/90 leading-relaxed">
                {isFa
                  ? 'محتوا و سناریوهای این نرم‌افزار صرفاً جنبه آموزشی دارند. برای هرگونه تصمیم‌گیری دارویی و درمانی بالینی روی بیماران واقعی، به آخرین نسخه‌های رسمی Australian Medicines Handbook، Therapeutic Guidelines و استانداردهای ایالتی استرالیا مراجعه شود.'
                  : 'All scenarios, protocols, and flashcards are educational. Always refer to current editions of the AMH and official state poisons legislation for clinical practice.'}
              </p>
            </div>

            {/* Copyright & Support */}
            <div className="pt-2 border-t app-border flex items-center justify-between text-[10.5px] app-muted">
              <span>© {new Date().getFullYear()} Australian Pharmacy Practice Simulator</span>
              <span className="flex items-center gap-1 text-slate-400">
                <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                {isFa ? 'برای داروسازان آینده استرالیا' : 'For Future Australian Pharmacists'}
              </span>
            </div>
          </div>
        )}

        {/* TAB 4: STUDY MASTERY & QUIZ HISTORY DASHBOARD (RECHARTS) */}
        {activeTab === 'analytics' && (
          <StudyMasteryDashboard
            language={language}
            userProgress={userProgress}
            leitnerCards={leitnerCards}
            onOpenLeitnerBox={() => {
              onClose();
              onOpenLeitnerBox?.();
            }}
          />
        )}
      </div>
    </div>,
    document.body
  );
};
