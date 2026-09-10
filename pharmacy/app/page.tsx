'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Language,
  VisualTheme,
  FontSize,
  DisplayMode,
  StudyMode,
  LayoutMode,
  ModuleId,
  FlagColor,
  CustomCardEdit,
  UserProgress,
  UserAiConfig,
} from '@/types/pharmacy';
import { UserStudyState } from '@/types/studyTrack';
import { getClientAiConfig, saveClientAiConfig, syncAiConfigFromCloud } from '@/lib/aiConfigStorage';
import { DEFAULT_AI_CONFIG } from '@/lib/aiService';
import { ALL_PHARMACY_CARDS } from '@/lib/pharmacy-data';
import { OTC_SCENARIOS } from '@/data/otcScenarios';
import { SHELF_PRODUCTS } from '@/data/shelf/shelfProducts';
import {
  auth,
  onAuthStateChanged,
  User,
  saveUserDataToFirestore,
  loadUserDataFromFirestore,
  saveLeitnerCardsToFirestore,
  doc,
  db,
  onSnapshot,
} from '@/lib/firebase';
import { LeitnerCard } from '@/types/leitner';
import { Network, Layers } from 'lucide-react';
import { Header } from '@/components/Header';
import { ModuleFilter } from '@/components/ModuleFilter';
import { StudyCard } from '@/components/StudyCard';
import { FlashcardView } from '@/components/FlashcardView';
import { SidebarNav } from '@/components/SidebarNav';
import { INITIAL_SAMPLE_LEITNER_CARDS } from '@/lib/sample-leitner-cards';
import { StudyTrackerProvider } from '@/components/study/StudyTrackerContext';
import { ResumeStudyBanner } from '@/components/study/ResumeStudyBanner';
import { StatsBar } from '@/components/StatsBar';
import { Footer } from '@/components/Footer';
import { FolderOpen, Bot, Sparkles } from 'lucide-react';

// Large learning modules are loaded only when a learner opens them.
const OtcTriageModule = dynamic(() => import('@/components/OtcTriageModule').then((mod) => mod.OtcTriageModule));
const ProductShelfModule = dynamic(() => import('@/components/ProductShelfModule').then((mod) => mod.ProductShelfModule));
const FredDispenseModule = dynamic(() => import('@/components/FredDispenseModule').then((mod) => mod.FredDispenseModule));
const ClinicalKnowledgeModule = dynamic(() => import('@/components/ClinicalKnowledgeModule').then((mod) => mod.ClinicalKnowledgeModule));
const LearningToolsModule = dynamic(() => import('@/components/LearningToolsModule').then((mod) => mod.LearningToolsModule));

const TextSelectionLeitnerTrigger = dynamic(
  () => import('@/components/TextSelectionLeitnerTrigger').then((mod) => mod.TextSelectionLeitnerTrigger),
  { ssr: false }
);

// Modals and Drawers loaded on-demand
const EditModal = dynamic(
  () => import('@/components/EditModal').then((mod) => mod.EditModal),
  { ssr: false }
);

const SettingsModal = dynamic(
  () => import('@/components/SettingsModal').then((mod) => mod.SettingsModal),
  { ssr: false }
);

const AuthModal = dynamic(
  () => import('@/components/AuthModal').then((mod) => mod.AuthModal),
  { ssr: false }
);

const AiLeitnerModal = dynamic(
  () => import('@/components/AiLeitnerModal').then((mod) => mod.AiLeitnerModal),
  { ssr: false }
);

const LeitnerBoxModal = dynamic(
  () => import('@/components/LeitnerBoxModal').then((mod) => mod.LeitnerBoxModal),
  { ssr: false }
);

const AiTutorDrawer = dynamic(
  () => import('@/components/AiTutorDrawer').then((mod) => mod.AiTutorDrawer),
  { ssr: false }
);

const BottomNav = dynamic(
  () => import('@/components/BottomNav').then((mod) => mod.BottomNav),
  { ssr: false }
);

const CommandPaletteModal = dynamic(
  () => import('@/components/CommandPaletteModal').then((mod) => mod.CommandPaletteModal),
  { ssr: false }
);

const PwaInstallPrompt = dynamic(
  () => import('@/components/PwaInstallPrompt').then((mod) => mod.PwaInstallPrompt),
  { ssr: false }
);

const STORAGE_KEY = 'AU_PHARMACY_STUDY_STATE_V4';
const LEITNER_STORAGE_KEY = 'AU_PHARMACY_LEITNER_CARDS_V1';

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const [language, setLanguage] = useState<Language>('fa');
  const [theme, setTheme] = useState<VisualTheme>('day');
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('both');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('window-grid');

  // Start with the compact triage module. Other teaching datasets are fetched
  // only when their module is selected, which reduces the first mobile load.
  const [activeMainModule, setActiveMainModule] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [leitnerInitialTab, setLeitnerInitialTab] = useState<'leitner' | 'mindmap'>('leitner');
  const [activeMode, setActiveMode] = useState<StudyMode>('accordion');
  const [activeModule, setActiveModule] = useState<ModuleId>('ALL');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [flagFilter, setFlagFilter] = useState<FlagColor | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [shelfTargetContext, setShelfTargetContext] = useState<string | null>(null);

  // Sync module query parameter on mount without hydration mismatch
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const modParam = params.get('module');
      if (modParam) {
        const modNum = parseInt(modParam, 10);
        if (modNum >= 1 && modNum <= 6) {
          const timer = setTimeout(() => {
            setActiveMainModule(modNum as 1 | 2 | 3 | 4 | 5 | 6);
          }, 0);
          return () => clearTimeout(timer);
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  const handleNavigateToModule = useCallback(
    (modNum: 1 | 2 | 3 | 4 | 5 | 6, contextId?: string) => {
      if (modNum === 2 && contextId) {
        setShelfTargetContext(contextId);
      }
      setActiveMainModule(modNum);
    },
    []
  );

  // User Progress State
  const [flags, setFlags] = useState<Record<string, FlagColor>>({});
  const [deleted, setDeleted] = useState<string[]>([]);
  const [customEdits, setCustomEdits] = useState<Record<string, CustomCardEdit>>({});
  const [reviewedCards, setReviewedCards] = useState<Record<string, boolean>>({});
  const [quizScores, setQuizScores] = useState<Record<string, { total: number; correct: number }>>({
    main: { total: 0, correct: 0 },
  });
  const [savedNotes, setSavedNotes] = useState<Record<string, string[]>>({});

  // Modal States
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'ai' | 'about' | 'analytics'>('general');
  const [aiConfig, setAiConfig] = useState<UserAiConfig>(DEFAULT_AI_CONFIG);

  // Load AI configuration on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAiConfig(getClientAiConfig());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenAnalytics = () => {
    setSettingsInitialTab('analytics');
    setIsSettingsOpen(true);
  };

  const handleOpenSettings = (tab: 'general' | 'ai' | 'about' | 'analytics' = 'general') => {
    setSettingsInitialTab(tab);
    setIsSettingsOpen(true);
  };

  // Leitner Spaced Repetition Box State
  const [leitnerCards, setLeitnerCards] = useState<LeitnerCard[]>([]);
  const [isLeitnerBoxOpen, setIsLeitnerBoxOpen] = useState(false);
  const [isAiLeitnerModalOpen, setIsAiLeitnerModalOpen] = useState(false);
  const [aiLeitnerParams, setAiLeitnerParams] = useState<{
    text: string;
    module: 1 | 2 | 3 | 4;
    category?: string;
    topic?: string;
    initialTab?: 'ai' | 'manual';
  }>({
    text: '',
    module: 1,
    initialTab: 'ai',
  });

  // AI Clinical Tutor Drawer State
  const [isAiTutorOpen, setIsAiTutorOpen] = useState(false);
  const [aiTutorPrompt, setAiTutorPrompt] = useState('');

  // Command Palette State (Ctrl+K)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // User Account & Cloud Sync States
  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isInitialCloudLoad, setIsInitialCloudLoad] = useState(false);
  const [initialCloudStudyState, setInitialCloudStudyState] = useState<UserStudyState | null>(null);

  // 1. Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setIsInitialCloudLoad(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Load Cloud Data when user logs in or on initial auth load
  useEffect(() => {
    if (!user) return;

    // Study state subscription
    const userDocRef = doc(db, 'users', user.uid, 'data', 'studyState');

    // Sync AI API Keys and configuration from Cloud
    syncAiConfigFromCloud(user.uid).then((cloudAiCfg) => {
      if (cloudAiCfg) {
        setAiConfig(cloudAiCfg);
      }
    });

    const unsubscribeStudy = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data();
          if (cloudData) {
            if (cloudData.studyTracker) setInitialCloudStudyState(cloudData.studyTracker as UserStudyState);
            if (cloudData.language) setLanguage(cloudData.language as Language);
            if (cloudData.theme) setTheme(cloudData.theme as VisualTheme);
            if (cloudData.fontSize) setFontSize(cloudData.fontSize as FontSize);
            if (cloudData.displayMode) setDisplayMode(cloudData.displayMode as DisplayMode);
            if (cloudData.layoutMode) setLayoutMode(cloudData.layoutMode as LayoutMode);
            if (cloudData.flags) setFlags(cloudData.flags);
            if (cloudData.deleted) setDeleted(cloudData.deleted);
            if (cloudData.customEdits) setCustomEdits(cloudData.customEdits);
            if (cloudData.reviewedCards) setReviewedCards(cloudData.reviewedCards);
            if (cloudData.quizScores) setQuizScores(cloudData.quizScores);
            if (cloudData.savedNotes) setSavedNotes(cloudData.savedNotes);
            if (cloudData.updatedAt) setLastSyncedAt(cloudData.updatedAt);
          }
        } else {
          // New cloud user: initial push of current local state to cloud
          saveUserDataToFirestore(user.uid, {
            language,
            theme,
            fontSize,
            displayMode,
            layoutMode,
            flags,
            deleted,
            customEdits,
            reviewedCards,
            quizScores,
            savedNotes,
          }).catch(console.error);
        }
        setIsInitialCloudLoad(false);
      },
      (err) => {
        console.error('Firestore snapshot error:', err);
        setIsInitialCloudLoad(false);
      }
    );

    // Leitner cards cloud subscription
    const leitnerDocRef = doc(db, 'users', user.uid, 'data', 'leitnerData');
    const unsubscribeLeitner = onSnapshot(
      leitnerDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.cards && Array.isArray(data.cards)) {
            setLeitnerCards(data.cards);
            try {
              localStorage.setItem(LEITNER_STORAGE_KEY, JSON.stringify(data.cards));
            } catch (e) {
              console.error('Failed to cache leitner cards', e);
            }
          }
        } else {
          setLeitnerCards((prev) => {
            if (prev.length > 0) {
              saveLeitnerCardsToFirestore(user.uid, prev).catch(console.error);
            }
            return prev;
          });
        }
      },
      (err) => {
        console.error('Firestore leitner snapshot error:', err);
      }
    );

    return () => {
      unsubscribeStudy();
      unsubscribeLeitner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 3. Auto Sync to Firestore on state changes when logged in
  useEffect(() => {
    if (!isMounted || !user || isInitialCloudLoad) return;

    const timer = setTimeout(async () => {
      try {
        setIsSyncing(true);
        const dataToSave = {
          language,
          theme,
          fontSize,
          displayMode,
          layoutMode,
          flags,
          deleted,
          customEdits,
          reviewedCards,
          quizScores,
          savedNotes,
        };
        await saveUserDataToFirestore(user.uid, dataToSave);
        setLastSyncedAt(new Date().toISOString());
      } catch (e) {
        console.error('Failed to sync to cloud:', e);
      } finally {
        setIsSyncing(false);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    isMounted,
    user,
    isInitialCloudLoad,
    language,
    theme,
    fontSize,
    displayMode,
    layoutMode,
    flags,
    deleted,
    customEdits,
    reviewedCards,
    quizScores,
    savedNotes,
  ]);

  // Load state from localStorage on mount (prevents SSR hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (parsed.language && typeof parsed.language === 'string') setLanguage(parsed.language);
        if (parsed.theme && typeof parsed.theme === 'string') {
          // Migrate legacy theme names to new 4-theme system
          const themeMap: Record<string, VisualTheme> = {
            'light': 'day',
            'dark': 'night',
            'sepia': 'reader-day',
            'ereader': 'reader-day',
            'reading-day': 'reader-day',
            'reading-night': 'reader-night',
            // New names pass through unchanged
            'day': 'day',
            'night': 'night',
            'reader-day': 'reader-day',
            'reader-night': 'reader-night',
          };
          setTheme(themeMap[parsed.theme] || 'day');
        }
        if (parsed.fontSize && typeof parsed.fontSize === 'string') setFontSize(parsed.fontSize);
        if (parsed.displayMode && typeof parsed.displayMode === 'string') setDisplayMode(parsed.displayMode);
        if (parsed.layoutMode && typeof parsed.layoutMode === 'string') setLayoutMode(parsed.layoutMode);
        if (parsed.flags && typeof parsed.flags === 'object' && !Array.isArray(parsed.flags)) setFlags(parsed.flags);
        if (parsed.deleted && Array.isArray(parsed.deleted)) setDeleted(parsed.deleted);
        if (parsed.customEdits && typeof parsed.customEdits === 'object' && !Array.isArray(parsed.customEdits)) setCustomEdits(parsed.customEdits);
        if (parsed.reviewedCards && typeof parsed.reviewedCards === 'object' && !Array.isArray(parsed.reviewedCards)) setReviewedCards(parsed.reviewedCards);
        if (parsed.quizScores && typeof parsed.quizScores === 'object' && !Array.isArray(parsed.quizScores)) setQuizScores(parsed.quizScores);
        if (parsed.savedNotes && typeof parsed.savedNotes === 'object' && !Array.isArray(parsed.savedNotes)) setSavedNotes(parsed.savedNotes);
      }

      const savedLeitner = localStorage.getItem(LEITNER_STORAGE_KEY);
      if (savedLeitner) {
        const parsedLeitner = JSON.parse(savedLeitner);
        if (Array.isArray(parsedLeitner) && parsedLeitner.length > 0) {
          setLeitnerCards(parsedLeitner);
        } else {
          setLeitnerCards(INITIAL_SAMPLE_LEITNER_CARDS);
        }
      } else {
        setLeitnerCards(INITIAL_SAMPLE_LEITNER_CARDS);
      }
    } catch (e) {
      console.error('Failed to load local storage state:', e);
    } finally {
      setIsMounted(true);
    }
  }, []);

  // Sync theme & font size to DOM & LocalStorage after mount
  useEffect(() => {
    if (!isMounted) return;

    // 1. Sync visual theme
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-sepia', 'theme-reading-day', 'theme-reading-night', 'theme-ereader', 'theme-day', 'theme-night', 'theme-reader-day', 'theme-reader-night');
    document.body.classList.add(`theme-${theme}`);

    // 2. Sync dynamic font sizing to root HTML and body
    document.documentElement.classList.remove('font-size-sm', 'font-size-md', 'font-size-lg', 'font-size-xl');
    document.documentElement.classList.add(`font-size-${fontSize}`);

    const fontMap: Record<FontSize, string> = { sm: '13.5px', md: '15.5px', lg: '18px', xl: '21px' };
    const activeSize = fontMap[fontSize] || '15.5px';
    document.documentElement.style.fontSize = activeSize;
    document.documentElement.style.setProperty('--font-scale', activeSize);
    document.body.style.fontSize = activeSize;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;

    // 3. Dynamic Mobile Status Bar & Browser Chrome Color Integration
    const themeColorMap: Record<VisualTheme, { color: string; appleStyle: string }> = {
      'day': { color: '#F9FAFB', appleStyle: 'default' },
      'night': { color: '#09090B', appleStyle: 'black-translucent' },
      'reader-day': { color: '#F5ECD8', appleStyle: 'default' },
      'reader-night': { color: '#1A1008', appleStyle: 'black-translucent' },
    };

    const currentThemeInfo = themeColorMap[theme] || themeColorMap['night'];

    // Update or create <meta name="theme-color">
    let metaThemeColor = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement;
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = currentThemeInfo.color;

    // Update or create <meta name="msapplication-navbutton-color">
    let metaMsNav = document.querySelector('meta[name="msapplication-navbutton-color"]') as HTMLMetaElement;
    if (!metaMsNav) {
      metaMsNav = document.createElement('meta');
      metaMsNav.name = 'msapplication-navbutton-color';
      document.head.appendChild(metaMsNav);
    }
    metaMsNav.content = currentThemeInfo.color;

    // Update or create <meta name="apple-mobile-web-app-status-bar-style">
    let metaAppleStatus = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]') as HTMLMetaElement;
    if (!metaAppleStatus) {
      metaAppleStatus = document.createElement('meta');
      metaAppleStatus.name = 'apple-mobile-web-app-status-bar-style';
      document.head.appendChild(metaAppleStatus);
    }
    metaAppleStatus.content = currentThemeInfo.appleStyle;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          language,
          theme,
          fontSize,
          displayMode,
          layoutMode,
          flags,
          deleted,
          customEdits,
          reviewedCards,
          quizScores,
          savedNotes,
        })
      );
    } catch (e) {
      console.error('Failed to save local storage state:', e);
    }
  }, [
    isMounted,
    language,
    theme,
    fontSize,
    displayMode,
    layoutMode,
    flags,
    deleted,
    customEdits,
    reviewedCards,
    quizScores,
    savedNotes,
  ]);

  // Handler functions
  const handleToggleLanguage = () => {
    setLanguage((prev) => (prev === 'fa' ? 'en' : 'fa'));
  };

  const handleSetFlag = (id: string, color?: FlagColor) => {
    setFlags((prev) => {
      const updated = { ...prev };
      if (color !== undefined) {
        if (color) {
          updated[id] = color;
        } else {
          delete updated[id];
        }
      } else {
        const colors: FlagColor[] = [null, 'red', 'yellow', 'green', 'blue'];
        const current = prev[id] || null;
        const nextIndex = (colors.indexOf(current) + 1) % colors.length;
        if (colors[nextIndex]) {
          updated[id] = colors[nextIndex];
        } else {
          delete updated[id];
        }
      }
      return updated;
    });
  };

  const handleToggleReview = (id: string) => {
    setReviewedCards((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleDeleteCard = (id: string) => {
    if (confirm(language === 'fa' ? 'آیا از حذف این کارت اطمینان دارید؟' : 'Delete this card?')) {
      setDeleted((prev) => [...prev, id]);
    }
  };

  const handleSaveCardEdit = (id: string, edit: CustomCardEdit) => {
    setCustomEdits((prev) => ({
      ...prev,
      [id]: edit,
    }));
  };

  const handleSaveNote = (cardId: string, noteText: string) => {
    setSavedNotes((prev) => {
      const existing = prev[cardId] || [];
      if (existing.includes(noteText)) return prev;
      return { ...prev, [cardId]: [...existing, noteText] };
    });
  };

  const handleDeleteNote = (cardId: string, index: number) => {
    setSavedNotes((prev) => {
      const existing = prev[cardId] || [];
      const updated = existing.filter((_, i) => i !== index);
      return { ...prev, [cardId]: updated };
    });
  };

  const handleResetAll = () => {
    if (
      confirm(
        language === 'fa'
          ? 'آیا تمام ویرایش‌ها و تنظیمات به حالت اولیه بازگردد؟'
          : 'Reset all custom edits and progress?'
      )
    ) {
      localStorage.removeItem(STORAGE_KEY);
      setFlags({});
      setDeleted([]);
      setCustomEdits({});
      setReviewedCards({});
      setQuizScores({ main: { total: 0, correct: 0 } });
      setSavedNotes({});
      setTheme('day');
      setFontSize('md');
      setLayoutMode('window-grid');
      setLanguage('fa');
      setIsSettingsOpen(false);
    }
  };

  const handleImportProgress = (imported: UserProgress) => {
    if (imported.flags) setFlags(imported.flags);
    if (imported.deleted) setDeleted(imported.deleted);
    if (imported.customEdits) setCustomEdits(imported.customEdits);
    if (imported.reviewedCards) setReviewedCards(imported.reviewedCards);
    if (imported.quizScores) setQuizScores(imported.quizScores);
    if (imported.savedNotes) setSavedNotes(imported.savedNotes);
    setIsSettingsOpen(false);
  };

  // Leitner Spaced Repetition Box Handlers
  const handleOpenAiLeitner = useCallback((
    text: string,
    defaultModule?: 1 | 2 | 3 | 4,
    category?: string,
    topic?: string,
    initialTab: 'ai' | 'manual' = 'ai'
  ) => {
    setAiLeitnerParams({
      text: text || '',
      module: defaultModule || (activeMainModule <= 4 ? (activeMainModule as 1 | 2 | 3 | 4) : 4),
      category,
      topic,
      initialTab,
    });
    setIsAiLeitnerModalOpen(true);
  }, [activeMainModule]);

  const handleResumeStudy = useCallback((item: any) => {
    if (item.moduleId) {
      setActiveMainModule(item.moduleId as 1 | 2 | 3 | 4 | 5 | 6);
    }
  }, []);

  const handleSelectClinicalModule = useCallback((m: ModuleId) => {
    setActiveModule(m);
    setActiveCategory('ALL');
  }, []);

  const handleSaveLeitnerCards = (newCards: LeitnerCard[]) => {
    setLeitnerCards(newCards);
    try {
      localStorage.setItem(LEITNER_STORAGE_KEY, JSON.stringify(newCards));
    } catch (e) {
      console.error('Failed to save Leitner cards to localStorage', e);
    }
    if (user) {
      saveLeitnerCardsToFirestore(user.uid, newCards).catch(console.error);
    }
  };

  const handleAddCardsToLeitner = (incomingCards: LeitnerCard[]) => {
    const existingIds = new Set(leitnerCards.map((c) => c.id));
    const dedupedIncoming = incomingCards.filter((c) => !existingIds.has(c.id));
    const updated = [...dedupedIncoming, ...leitnerCards];
    handleSaveLeitnerCards(updated);
  };

  const handleDeleteLeitnerCard = (cardId: string) => {
    const targetCard = leitnerCards.find((c) => c.id === cardId);
    const cardQ = targetCard
      ? language === 'fa'
        ? targetCard.question.fa || targetCard.question.en
        : targetCard.question.en || targetCard.question.fa
      : '';
    const preview = cardQ.length > 80 ? cardQ.slice(0, 80) + '...' : cardQ;
    const confirmMsg =
      language === 'fa'
        ? `آیا از حذف این کارت از لایتنر و نقشه مفهومی اطمینان دارید؟\n\n"${preview}"`
        : `Are you sure you want to delete this card from Leitner & Mind Map?\n\n"${preview}"`;

    if (window.confirm(confirmMsg)) {
      const updated = leitnerCards.filter((c) => c.id !== cardId);
      handleSaveLeitnerCards(updated);
    }
  };

  // Compute Leitner Due Count
  const nowIso = new Date().toISOString();
  const leitnerDueCount = leitnerCards.filter((c) => !c.nextReviewDate || c.nextReviewDate <= nowIso).length;

  // Filter cards
  const activeModuleCards = useMemo(() => {
    return ALL_PHARMACY_CARDS.filter((item) => {
      if (deleted.includes(item.id)) return false;
      if (activeModule !== 'ALL' && item.module !== activeModule) return false;
      if (activeCategory !== 'ALL' && item.category[language] !== activeCategory) return false;
      if (flagFilter !== 'ALL' && flags[item.id] !== flagFilter) return false;

      if (activeMode === 'flagged') {
        if (!flags[item.id]) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const title = (customEdits[item.id]?.title || item.title[language]).toLowerCase();
        const pearl = (customEdits[item.id]?.pearl || item.actionPearl[language]).toLowerCase();
        const details = (customEdits[item.id]?.summary || item.detailsHtml[language]).toLowerCase();
        return title.includes(q) || pearl.includes(q) || details.includes(q);
      }

      return true;
    });
  }, [deleted, activeModule, language, activeCategory, flagFilter, flags, activeMode, searchQuery, customEdits]);

  // Extract available sub-categories for active module
  const availableCategories = useMemo(() => {
    return Array.from(
      new Set(
        ALL_PHARMACY_CARDS.filter((i) => activeModule === 'ALL' || i.module === activeModule).map(
          (i) => i.category[language]
        )
      )
    );
  }, [activeModule, language]);

  const editingCard = ALL_PHARMACY_CARDS.find((c) => c.id === editingCardId) || null;
  const flaggedCount = Object.keys(flags).length;
  const reviewedCount = Object.values(reviewedCards).filter(Boolean).length;
  const quizMasteryPct = quizScores.main && quizScores.main.total > 0
    ? Math.round((quizScores.main.correct / quizScores.main.total) * 100)
    : 0;

  return (
    <StudyTrackerProvider user={user} userUid={user?.uid} initialCloudState={initialCloudStudyState}>
      <div className="min-h-screen flex flex-col justify-between w-full max-w-full overflow-x-clip">
        {/* Notch / Status Bar Glass Shield for Mobile PWA */}
        <div className="app-notch-glass-shield" aria-hidden="true" />

        {/* 1. Real Website Navigation Header ("حالت ویندوز") */}
      <Header
        language={language}
        onToggleLanguage={handleToggleLanguage}
        theme={theme}
        onSetTheme={setTheme}
        fontSize={fontSize}
        onSetFontSize={setFontSize}
        activeMode={activeMode}
        onSelectMode={setActiveMode}
        layoutMode={layoutMode}
        onChangeLayoutMode={setLayoutMode}
        onOpenSettings={() => handleOpenSettings('general')}
        onOpenAnalytics={handleOpenAnalytics}
        flaggedCount={flaggedCount}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
        activeMainModule={activeMainModule}
        onSelectMainModule={setActiveMainModule}
        onOpenLeitnerBox={() => {
          setLeitnerInitialTab('leitner');
          setActiveMainModule(5);
        }}
        onOpenMindMap={() => {
          setLeitnerInitialTab('mindmap');
          setActiveMainModule(5);
        }}
        onOpenAiTutor={() => {
          setAiTutorPrompt('');
          setIsAiTutorOpen(true);
        }}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        leitnerDueCount={isMounted ? leitnerDueCount : 0}
        leitnerTotalCount={isMounted ? leitnerCards.length : 0}
      />

      {/* 2. Main Container - Optimized for wider screen columns, responsive breathing room and full-width utilization */}
      <main className="flex-grow max-w-[1700px] w-full mx-auto px-1.5 sm:px-2.5 md:px-3 lg:px-4 py-2 sm:py-3 pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:pb-6 space-y-3 sm:space-y-3.5 min-w-0">
        {/* Universal Interactive Resume Study Banner */}
        <ResumeStudyBanner
          language={language}
          currentModuleId={activeMainModule}
          onResume={handleResumeStudy}
        />

        {/* Real-time Study & Quiz Summary Bar with Quick Analytics Access */}
        <StatsBar
          language={language}
          totalCards={ALL_PHARMACY_CARDS.length + OTC_SCENARIOS.length + SHELF_PRODUCTS.length}
          reviewedCount={reviewedCount}
          flaggedCount={flaggedCount}
          quizScorePct={quizMasteryPct}
          onOpenAnalytics={handleOpenAnalytics}
        />

        {/* Dynamic Main Module View Router */}
        {activeMainModule === 1 && (
          <OtcTriageModule
            language={language}
            onNavigateToModule={handleNavigateToModule}
            onNavigateToFred={() => setActiveMainModule(3)}
            onOpenAiLeitner={handleOpenAiLeitner}
          />
        )}

        {activeMainModule === 2 && (
          <ProductShelfModule
            language={language}
            targetContext={shelfTargetContext}
            onClearTargetContext={() => setShelfTargetContext(null)}
            onNavigateToModule={handleNavigateToModule}
            onOpenAiLeitner={handleOpenAiLeitner}
          />
        )}

        {activeMainModule === 3 && (
          <FredDispenseModule
            language={language}
            onNavigateToModule={handleNavigateToModule}
          />
        )}

        {activeMainModule === 4 && (
          <ClinicalKnowledgeModule
            language={language}
            activeModule={activeModule}
            onSelectModule={handleSelectClinicalModule}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            flagFilter={flagFilter}
            onSelectFlagFilter={setFlagFilter}
            activeMode={activeMode}
            flags={flags}
            deleted={deleted}
            customEdits={customEdits}
            reviewedCards={reviewedCards}
            savedNotes={savedNotes}
            onToggleReview={handleToggleReview}
            onSetFlag={handleSetFlag}
            onEditCard={setEditingCardId}
            onDeleteCard={handleDeleteCard}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            layoutMode={layoutMode}
            onNavigateToModule={handleNavigateToModule}
            onOpenAiLeitner={handleOpenAiLeitner}
          />
        )}

        {activeMainModule === 5 && (
          <LearningToolsModule
            language={language}
            cards={leitnerCards}
            initialTab={leitnerInitialTab}
            onUpdateCards={handleSaveLeitnerCards}
            onOpenAiLeitner={handleOpenAiLeitner}
          />
        )}

        {activeMainModule === 6 && (
          <ClinicalKnowledgeModule
            language={language}
            activeModule="mod6"
            onSelectModule={handleSelectClinicalModule}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
            flagFilter={flagFilter}
            onSelectFlagFilter={setFlagFilter}
            activeMode={activeMode}
            flags={flags}
            deleted={deleted}
            customEdits={customEdits}
            reviewedCards={reviewedCards}
            savedNotes={savedNotes}
            onToggleReview={handleToggleReview}
            onSetFlag={handleSetFlag}
            onEditCard={setEditingCardId}
            onDeleteCard={handleDeleteCard}
            onSaveNote={handleSaveNote}
            onDeleteNote={handleDeleteNote}
            layoutMode={layoutMode}
            onNavigateToModule={handleNavigateToModule}
            onOpenAiLeitner={handleOpenAiLeitner}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Fixed for Ergonomic Touch) */}
      <BottomNav
        language={language}
        activeModule={activeMainModule}
        onSelectModule={setActiveMainModule}
        leitnerDueCount={isMounted ? leitnerDueCount : 0}
        onOpenAiTutor={() => {
          setAiTutorPrompt('');
          setIsAiTutorOpen(true);
        }}
      />
      <Footer language={language} />

      {/* Text Selection Floating Trigger for Spaced Repetition Leitner */}
      <TextSelectionLeitnerTrigger
        language={language}
        onOpenLeitnerModal={handleOpenAiLeitner}
      />

      {/* AI Clinical Tutor Drawer */}
      <AiTutorDrawer
        key={isAiTutorOpen ? `tutor-${aiTutorPrompt}` : 'closed'}
        isOpen={isAiTutorOpen}
        onClose={() => setIsAiTutorOpen(false)}
        language={language}
        aiConfig={aiConfig}
        initialPrompt={aiTutorPrompt}
        onOpenAiLeitner={(text, mod, cat, top) => {
          setIsAiTutorOpen(false);
          handleOpenAiLeitner(text, mod, cat, top);
        }}
      />

      {/* AI Leitner Card Generation Modal */}
      <AiLeitnerModal
        isOpen={isAiLeitnerModalOpen}
        onClose={() => setIsAiLeitnerModalOpen(false)}
        language={language}
        initialText={aiLeitnerParams.text}
        initialModule={aiLeitnerParams.module}
        initialCategory={aiLeitnerParams.category}
        initialTopic={aiLeitnerParams.topic}
        initialTab={aiLeitnerParams.initialTab}
        userId={user?.uid}
        onAddCardsToLeitner={handleAddCardsToLeitner}
        onOpenLeitnerBox={() => {
          setIsAiLeitnerModalOpen(false);
          setActiveMainModule(5);
        }}
      />

      {/* Leitner Box Spaced Repetition Review & Tree Manager Modal */}
      <LeitnerBoxModal
        isOpen={isLeitnerBoxOpen}
        onClose={() => setIsLeitnerBoxOpen(false)}
        language={language}
        cards={leitnerCards}
        onUpdateCards={handleSaveLeitnerCards}
        onOpenCreateModal={() => {
          setIsLeitnerBoxOpen(false);
          handleOpenAiLeitner('', activeMainModule !== 3 ? (activeMainModule as 1 | 2 | 4) : 1);
        }}
      />

      {/* Edit Modal */}
      {editingCardId && (
        <EditModal
          card={editingCard}
          language={language}
          customEdit={customEdits[editingCardId]}
          onSave={handleSaveCardEdit}
          onClose={() => setEditingCardId(null)}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          language={language}
          onToggleLanguage={handleToggleLanguage}
          theme={theme}
          onSetTheme={setTheme}
          fontSize={fontSize}
          onSetFontSize={setFontSize}
          layoutMode={layoutMode}
          onChangeLayoutMode={setLayoutMode}
          onReset={handleResetAll}
          userProgress={{
            flags,
            deleted,
            customEdits,
            reviewedCards,
            quizScores,
            savedNotes,
          }}
          onImportProgress={handleImportProgress}
          onClose={() => {
            setIsSettingsOpen(false);
            setSettingsInitialTab('general');
          }}
          user={user}
          isSyncing={isSyncing}
          lastSyncedAt={lastSyncedAt}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenLeitnerBox={() => {
            setLeitnerInitialTab('leitner');
            setActiveMainModule(5);
          }}
          aiConfig={aiConfig}
          onSaveAiConfig={(newCfg) => {
            setAiConfig(newCfg);
            saveClientAiConfig(newCfg, user?.uid);
          }}
          initialTab={settingsInitialTab}
          leitnerCards={leitnerCards}
        />
      )}

      {/* Account / Auth Modal */}
      {isAuthOpen && (
        <AuthModal
          user={user}
          language={language}
          isSyncing={isSyncing}
          lastSyncedAt={lastSyncedAt}
          onClose={() => setIsAuthOpen(false)}
          onRefreshCloudData={async () => {
            if (user) {
              const data = await loadUserDataFromFirestore(user.uid);
              if (data) {
                if (data.language) setLanguage(data.language as Language);
                if (data.theme) setTheme(data.theme as VisualTheme);
                if (data.fontSize) setFontSize(data.fontSize as FontSize);
                if (data.displayMode) setDisplayMode(data.displayMode as DisplayMode);
                if (data.layoutMode) setLayoutMode(data.layoutMode as LayoutMode);
                if (data.flags) setFlags(data.flags);
                if (data.deleted) setDeleted(data.deleted);
                if (data.customEdits) setCustomEdits(data.customEdits);
                if (data.reviewedCards) setReviewedCards(data.reviewedCards);
                if (data.quizScores) setQuizScores(data.quizScores);
                if (data.savedNotes) setSavedNotes(data.savedNotes);
                if (data.updatedAt) setLastSyncedAt(data.updatedAt);
              }
            }
          }}
        />
      )}

      {/* Global Command Palette Quick Search (Ctrl+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        language={language}
        onSelectModule={setActiveMainModule}
        onOpenAiTutor={(prompt) => {
          setAiTutorPrompt(prompt || '');
          setIsAiTutorOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* PWA Offline Manager & Install Prompt for Android & Windows */}
      <PwaInstallPrompt language={language} />
      </div>
    </StudyTrackerProvider>
  );
}
