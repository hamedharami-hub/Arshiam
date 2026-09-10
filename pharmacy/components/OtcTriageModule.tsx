'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { OTC_SCENARIOS, Scenario, WwhamQuestion, DialogueOption, ConversationMode } from '@/data/otcScenarios';
import { DiseaseInfo, DISEASES_REGISTRY, findDiseaseGuide } from '@/data/diseasesRegistry';
import {
  OtcTriageModuleProps,
  ChatMessage,
  StarredPhrase,
  getScenarioMode,
  ModeSelectorBar,
  TriageStepDeck,
} from './triage';
import { haptic } from '@/lib/haptics';
import { Flag } from 'lucide-react';
import { useStudyTrackerContext } from './study/StudyTrackerContext';

const DiseaseDetailModal = dynamic(
  () => import('./DiseaseDetailModal').then((mod) => mod.DiseaseDetailModal),
  { ssr: false }
);

const WwhamQuestionModal = dynamic(
  () => import('./triage').then((mod) => mod.WwhamQuestionModal),
  { ssr: false }
);

const RedFlagsModal = dynamic(
  () => import('./triage').then((mod) => mod.RedFlagsModal),
  { ssr: false }
);

const ReferralLetterModal = dynamic(
  () => import('./triage').then((mod) => mod.ReferralLetterModal),
  { ssr: false }
);

const StarredPhrasesModal = dynamic(
  () => import('./triage').then((mod) => mod.StarredPhrasesModal),
  { ssr: false }
);

export const OtcTriageModule: React.FC<OtcTriageModuleProps> = ({
  language,
  onNavigateToFred,
  onNavigateToModule,
  onOpenAiLeitner,
}) => {
  const isFa = language === 'fa';
  const { markItemViewed, setItemCompleted, getItemFlag, setItemFlag } = useStudyTrackerContext();

  // Mode and scenario state
  const [selectedConversationMode, setSelectedConversationMode] = useState<ConversationMode | 'ALL'>('MODE_B_SLANG');
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(OTC_SCENARIOS[0].id);
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [scenarioSearchTerm, setScenarioSearchTerm] = useState('');
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);

  // Current active scenario
  const scenario = useMemo(() => {
    return OTC_SCENARIOS.find((s) => s.id === selectedScenarioId) || OTC_SCENARIOS[0];
  }, [selectedScenarioId]);
  const scenarioStudyId = `otc:${scenario.id}`;

  useEffect(() => {
    markItemViewed(1, scenarioStudyId, scenario.title, { fa: 'تریاژ OTC', en: 'OTC Triage' }, { mode: getScenarioMode(scenario) });
  }, [markItemViewed, scenario, scenarioStudyId]);

  // Triage state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    {
      id: `init-pt-${OTC_SCENARIOS[0].id}`,
      sender: 'patient',
      textEn: OTC_SCENARIOS[0].patientProfile.presentation.en,
      textFa: OTC_SCENARIOS[0].patientProfile.presentation.fa,
      badgeEn: 'Chief Presentation',
      badgeFa: 'شرح اصلی مراجعه',
    },
  ]);
  const [askedQuestions, setAskedQuestions] = useState<Record<string, boolean>>({});
  const [askedRedFlagChecks, setAskedRedFlagChecks] = useState<Record<string, boolean>>({});
  const [selectedDialogueId, setSelectedDialogueId] = useState<string | null>(null);
  const [showOutcome, setShowOutcome] = useState(false);
  const [activeFrameworkTab, setActiveFrameworkTab] = useState<'wwham' | 'redflags' | 'decision'>('wwham');

  // Modals & UI controls
  const [activeWwhamQuestion, setActiveWwhamQuestion] = useState<WwhamQuestion | null>(null);
  const [showRedFlagsModal, setShowRedFlagsModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [selectedDisease, setSelectedDisease] = useState<DiseaseInfo | null>(null);
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  // Starred phrases state & persistence (loaded on mount to prevent SSR hydration mismatch)
  const [starredPhrases, setStarredPhrases] = useState<StarredPhrase[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('otc_triage_starred_phrases');
      if (saved) {
        const parsed = JSON.parse(saved);
        const timer = setTimeout(() => {
          setStarredPhrases(parsed);
        }, 0);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);
  const [showStarredModal, setShowStarredModal] = useState(false);
  const [showStarredBelow, setShowStarredBelow] = useState(false);
  const [starredSearchTerm, setStarredSearchTerm] = useState('');
  const [copiedPhraseId, setCopiedPhraseId] = useState<string | null>(null);

  // Editable GP referral practitioner information
  const [pharmacistName, setPharmacistName] = useState('Pharmacist on Duty, BPharm MPS');
  const [ahpraRegNumber, setAhpraRegNumber] = useState('PHA0001234567');
  const [pharmacyName, setPharmacyName] = useState('Community Care Pharmacy (Sydney, NSW)');
  const [isCopied, setIsCopied] = useState(false);

  // Save starred phrases to localStorage
  const saveStarredPhrases = (newPhrases: StarredPhrase[]) => {
    setStarredPhrases(newPhrases);
    try {
      localStorage.setItem('otc_triage_starred_phrases', JSON.stringify(newPhrases));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Scenario counts per mode
  const { modeACount, modeBCount, modeCCount } = useMemo(() => {
    let a = 0;
    let b = 0;
    let c = 0;
    OTC_SCENARIOS.forEach((s) => {
      const m = getScenarioMode(s);
      if (m === 'MODE_A_ADMIN') a++;
      else if (m === 'MODE_C_CONFLICT') c++;
      else b++;
    });
    return { modeACount: a, modeBCount: b, modeCCount: c };
  }, []);

  // Filtered scenarios for active mode
  const filteredScenarios = useMemo(() => {
    let list = OTC_SCENARIOS;
    if (selectedConversationMode !== 'ALL') {
      list = list.filter((s) => getScenarioMode(s) === selectedConversationMode);
    }
    if (scenarioSearchTerm.trim()) {
      const term = scenarioSearchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.en.toLowerCase().includes(term) ||
          s.title.fa.toLowerCase().includes(term) ||
          s.patientProfile.presentation.en.toLowerCase().includes(term) ||
          s.patientProfile.presentation.fa.toLowerCase().includes(term) ||
          s.category.en.toLowerCase().includes(term)
      );
    }
    return list;
  }, [selectedConversationMode, scenarioSearchTerm]);

  // Linked handbook disease
  const linkedHandbookDisease = useMemo(() => {
    return findDiseaseGuide(scenario);
  }, [scenario]);

  const resetScenarioState = (targetScenario: Scenario) => {
    setAskedQuestions({});
    setAskedRedFlagChecks({});
    setSelectedDialogueId(null);
    setShowOutcome(false);
    setActiveFrameworkTab('wwham');
    setActiveWwhamQuestion(null);
    setShowRedFlagsModal(false);

    setChatMessages([
      {
        id: `init-pt-${Date.now()}`,
        sender: 'patient',
        textEn: targetScenario.patientProfile.presentation.en,
        textFa: targetScenario.patientProfile.presentation.fa,
        badgeEn: 'Chief Presentation',
        badgeFa: 'شرح اصلی مراجعه',
      },
    ]);
  };

  const handleSelectScenario = (id: string) => {
    setSelectedScenarioId(id);
    const target = OTC_SCENARIOS.find((s) => s.id === id) || OTC_SCENARIOS[0];
    markItemViewed(1, `otc:${target.id}`, target.title, { fa: 'تریاژ OTC', en: 'OTC Triage' }, { mode: getScenarioMode(target) });
    resetScenarioState(target);
  };

  // Switch mode handler
  const handleSelectMode = (mode: ConversationMode | 'ALL') => {
    setSelectedConversationMode(mode);
    const firstInMode = OTC_SCENARIOS.find((s) => (mode === 'ALL' ? true : getScenarioMode(s) === mode));
    if (firstInMode) {
      setSelectedScenarioId(firstInMode.id);
      resetScenarioState(firstInMode);
    }
  };

  // Reset current scenario
  const handleReset = () => {
    setAskedQuestions({});
    setAskedRedFlagChecks({});
    setSelectedDialogueId(null);
    setShowOutcome(false);
    setActiveFrameworkTab('wwham');
    setActiveWwhamQuestion(null);
    setShowRedFlagsModal(false);

    setChatMessages([
      {
        id: `reset-pt-${Date.now()}`,
        sender: 'patient',
        textEn: scenario.patientProfile.presentation.en,
        textFa: scenario.patientProfile.presentation.fa,
        badgeEn: 'Chief Presentation',
        badgeFa: 'شرح اصلی مراجعه',
      },
    ]);
  };

  // Starred phrase toggle and check helpers
  const isMessageStarred = (text: string) => {
    if (!text) return false;
    return starredPhrases.some(
      (p) =>
        (p.textEn && p.textEn === text) ||
        (p.textFa && p.textFa === text) ||
        (p.text && p.text === text) ||
        (p.secondaryText && p.secondaryText === text)
    );
  };

  const isQnaStarred = (qEn: string) => {
    return starredPhrases.some((p) => p.textEn?.includes(qEn) || p.text?.includes(qEn));
  };

  const toggleStarMessage = (msg: ChatMessage) => {
    const textEn = msg.textEn || msg.text || '';
    const textFa = msg.textFa || msg.secondaryText || '';
    const existing = starredPhrases.find(
      (p) =>
        (textEn && p.textEn === textEn) ||
        (textFa && p.textFa === textFa) ||
        (msg.text && p.text === msg.text)
    );

    if (existing) {
      saveStarredPhrases(starredPhrases.filter((p) => p.id !== existing.id));
    } else {
      const newPhrase: StarredPhrase = {
        id: `starred-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        textEn,
        textFa,
        text: textEn,
        secondaryText: textFa,
        sender: msg.sender,
        scenarioId: scenario.id,
        scenarioTitle: scenario.title[language] || scenario.title.en,
        timestamp: Date.now(),
      };
      saveStarredPhrases([newPhrase, ...starredPhrases]);
    }
  };

  const toggleStarQna = (
    qEn: string,
    qFa: string,
    aEn: string,
    aFa: string,
    categoryTitle: string
  ) => {
    const combinedEn = `Q: ${qEn}\nA: ${aEn}`;
    const combinedFa = `پرسش: ${qFa}\nپاسخ: ${aFa}`;
    const existing = starredPhrases.find((p) => p.textEn === combinedEn || p.text === combinedEn);

    if (existing) {
      saveStarredPhrases(starredPhrases.filter((p) => p.id !== existing.id));
    } else {
      const newPhrase: StarredPhrase = {
        id: `starred-qna-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        textEn: combinedEn,
        textFa: combinedFa,
        text: combinedEn,
        secondaryText: combinedFa,
        sender: 'pharmacist',
        scenarioId: scenario.id,
        scenarioTitle: `${scenario.title[language] || scenario.title.en} (${categoryTitle})`,
        timestamp: Date.now(),
      };
      saveStarredPhrases([newPhrase, ...starredPhrases]);
    }
  };

  const toggleStarRedFlags = () => {
    const flagsEn = scenario.redFlags.map((f, i) => `${i + 1}. ${f.en}`).join('\n');
    const flagsFa = scenario.redFlags.map((f, i) => `${i + 1}. ${f.fa}`).join('\n');
    const titleEn = `[Red Flags Check] ${scenario.title.en}:\n${flagsEn}`;
    const titleFa = `[بررسی پرچم‌های قرمز] ${scenario.title.fa}:\n${flagsFa}`;

    const existing = starredPhrases.find((p) => p.textEn === titleEn || p.text === titleEn);
    if (existing) {
      saveStarredPhrases(starredPhrases.filter((p) => p.id !== existing.id));
    } else {
      const newPhrase: StarredPhrase = {
        id: `starred-rf-${Date.now()}`,
        textEn: titleEn,
        textFa: titleFa,
        text: titleEn,
        secondaryText: titleFa,
        sender: 'pharmacist',
        scenarioId: scenario.id,
        scenarioTitle: `${scenario.title[language] || scenario.title.en} (Red Flags)`,
        timestamp: Date.now(),
      };
      saveStarredPhrases([newPhrase, ...starredPhrases]);
    }
  };

  const removeStarredPhrase = (id: string) => {
    saveStarredPhrases(starredPhrases.filter((p) => p.id !== id));
  };

  const clearAllStarredPhrases = () => {
    saveStarredPhrases([]);
  };

  const handleCopySinglePhrase = async (id: string, textEn?: string, textFa?: string) => {
    const textToCopy = isFa ? (textFa || textEn || '') : (textEn || textFa || '');
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedPhraseId(id);
      setTimeout(() => setCopiedPhraseId(null), 2000);
    } catch {
      // Fallback
    }
  };

  // WWHAM Question click
  const handleAskWwhamQuestion = (q: WwhamQuestion) => {
    haptic.light();
    setActiveWwhamQuestion(q);
    if (!askedQuestions[q.key]) {
      setAskedQuestions((prev) => ({ ...prev, [q.key]: true }));

      const qMsg: ChatMessage = {
        id: `rx-wwham-${q.key}-${Date.now()}`,
        sender: 'pharmacist',
        textEn: q.question.en,
        textFa: q.question.fa,
        badgeEn: `WWHAM (${q.key})`,
        badgeFa: `WWHAM (${q.key})`,
      };

      const aMsg: ChatMessage = {
        id: `pt-wwham-${q.key}-${Date.now() + 1}`,
        sender: 'patient',
        textEn: q.answer.en,
        textFa: q.answer.fa,
        badgeEn: `${q.key} Response`,
        badgeFa: `پاسخ ${q.key}`,
      };

      setChatMessages((prev) => [...prev, qMsg, aMsg]);
    }
  };

  // Red Flags Check click
  const handleCheckRedFlags = () => {
    haptic.warning();
    setShowRedFlagsModal(true);
    if (!askedRedFlagChecks['rf-check']) {
      setAskedRedFlagChecks((prev) => ({ ...prev, 'rf-check': true }));

      const rfMsg: ChatMessage = {
        id: `rx-rf-${Date.now()}`,
        sender: 'pharmacist',
        textEn: 'Are there any severe symptoms like chest pain, shortness of breath, or intense radiating pain?',
        textFa: 'آیا علائم هشداردهنده‌ای مانند درد قفسه سینه، تنگی نفس یا درد شدید انتشار‌یابنده دارید؟',
        badgeEn: 'Red Flags Screen',
        badgeFa: 'غربالگری پرچم‌های قرمز',
      };

      const ptResp: ChatMessage = {
        id: `pt-rf-${Date.now() + 1}`,
        sender: 'patient',
        textEn: scenario.patientProfile.presentation.en,
        textFa: scenario.patientProfile.presentation.fa,
        badgeEn: 'Safety Profile',
        badgeFa: 'وضعیت ایمنی بیمار',
      };

      setChatMessages((prev) => [...prev, rfMsg, ptResp]);
    }
  };

  // Pharmacist Decision selection
  const handleSelectDialogueOption = (opt: DialogueOption) => {
    if (opt.isCorrectAdvice) {
      haptic.success();
    } else {
      haptic.warning();
    }
    setSelectedDialogueId(opt.id);
    setShowOutcome(true);
    if (opt.isCorrectAdvice) {
      setItemCompleted(1, scenarioStudyId, true, scenario.title, { fa: 'تریاژ OTC', en: 'OTC Triage' });
    }

    const optMsg: ChatMessage = {
      id: `rx-decision-${opt.id}-${Date.now()}`,
      sender: 'pharmacist',
      textEn: opt.text.en,
      textFa: opt.text.fa,
      badgeEn: opt.isCorrectAdvice ? 'Recommended Action' : 'Inappropriate Action',
      badgeFa: opt.isCorrectAdvice ? 'اقدام توصیه شده' : 'اقدام نامناسب',
    };

    // Filter out previous rx-decision messages so user changing answer cleanly replaces the bubble
    setChatMessages((prev) => [...prev.filter((m) => !m.id.startsWith('rx-decision-')), optMsg]);
  };

  // Generate official GP Referral Letter text
  const generateLetterText = () => {
    const today = new Date().toLocaleDateString('en-AU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const flagsList = scenario.redFlags.map((f) => `  * ${f.en}`).join('\n');
    const medsList = scenario.patientProfile.currentMedications?.map((m) => `  * ${m}`).join('\n') || '  * None reported';
    const medHist = scenario.patientProfile.medicalHistory?.map((h) => `  * ${h}`).join('\n') || '  * None reported';
    const allergies = scenario.patientProfile.allergies?.join(', ') || 'NKDA (No Known Drug Allergies)';

    return `================================================================================
           COMMUNITY PHARMACY CLINICAL REFERRAL NOTE
             (Pharmaceutical Society of Australia Standards)
================================================================================

Date: ${today}

TO: General Practitioner / Medical Officer
RE: Urgent / Non-Urgent Medical Review & Management

PATIENT DETAILS:
  * Full Name: ${scenario.patientProfile.name}
  * Age / Gender: ${scenario.patientProfile.age} years old (${scenario.patientProfile.gender})
  * Allergies: ${allergies}

REASON FOR REFERRAL & PRIMARY PRESENTATION:
  * Presenting Condition: ${scenario.title.en}
  * Patient Presentation:
    "${scenario.patientProfile.presentation.en}"

IDENTIFIED CLINICAL RED FLAGS / CONCERNS:
${flagsList}

CURRENT MEDICATION REGIMEN:
${medsList}

RELEVANT MEDICAL HISTORY:
${medHist}

PHARMACIST'S CLINICAL ASSESSMENT & INTERIM RECOMMENDATIONS:
${scenario.clinicalOutcome.recommendation.en}

GUIDELINE RATIONALE:
${scenario.clinicalOutcome.explanation.en}

--------------------------------------------------------------------------------
REFERRING PHARMACIST:
  * Practitioner Name: ${pharmacistName}
  * AHPRA Registration: ${ahpraRegNumber}
  * Practice Site: ${pharmacyName}
================================================================================`;
  };

  const handleCopyLetter = async () => {
    try {
      await navigator.clipboard.writeText(generateLetterText());
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handlePrintLetter = () => {
    window.print();
  };

  const wwhamCount = Object.keys(askedQuestions).length;
  const allWwhamAsked = wwhamCount >= 4;
  const selectedOption = scenario.dialogueOptions.find((o) => o.id === selectedDialogueId) || null;
  const browseOpen = isBrowseOpen && !scenarioSearchTerm.trim();

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* 1. Mode Selector Bar & Scenario Switcher */}
      <div className="space-y-2">
      <ModeSelectorBar
        language={language}
        selectedConversationMode={selectedConversationMode}
        onSelectMode={handleSelectMode}
        selectedScenarioId={selectedScenarioId}
        onSelectScenario={handleSelectScenario}
        scenario={scenario}
        filteredScenarios={filteredScenarios}
        scenarioSearchTerm={scenarioSearchTerm}
        setScenarioSearchTerm={setScenarioSearchTerm}
        isAccordionOpen={isAccordionOpen}
        setIsAccordionOpen={setIsAccordionOpen}
        isBrowseOpen={isBrowseOpen}
        setIsBrowseOpen={setIsBrowseOpen}
        modeACount={modeACount}
        modeBCount={modeBCount}
        modeCCount={modeCCount}
      />
      <div className="flex items-center justify-between gap-2 px-1 text-[11px]">
        <span className="app-muted">{isFa ? 'وضعیت سناریو' : 'Scenario status'}</span>
        <button
          type="button"
          onClick={() => {
            const colors = [null, 'red', 'yellow', 'green', 'blue'] as const;
            const current = getItemFlag(scenarioStudyId);
            const next = colors[(colors.indexOf(current) + 1) % colors.length];
            setItemFlag(scenarioStudyId, next);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border app-border app-bg hover:app-text transition"
          title={isFa ? 'تغییر فلگ سناریو' : 'Cycle scenario flag'}
        >
          <Flag className="w-3.5 h-3.5" />
          <span>{getItemFlag(scenarioStudyId) || (isFa ? 'بدون فلگ' : 'No flag')}</span>
        </button>
      </div>
      </div>

      {browseOpen && (
        <TriageStepDeck
          language={language}
          scenario={scenario}
          linkedHandbookDisease={linkedHandbookDisease}
          onOpenDiseaseModal={setSelectedDisease}
          activeFrameworkTab={activeFrameworkTab}
          setActiveFrameworkTab={setActiveFrameworkTab}
          wwhamCount={wwhamCount}
          askedQuestions={askedQuestions}
          isQnaStarred={isQnaStarred}
          onAskWwhamQuestion={handleAskWwhamQuestion}
          askedRedFlagChecks={askedRedFlagChecks}
          onCheckRedFlags={handleCheckRedFlags}
          allWwhamAsked={allWwhamAsked}
          selectedDialogueId={selectedDialogueId}
          selectedOption={selectedOption}
          onSelectDialogueOption={handleSelectDialogueOption}
          chatMessages={chatMessages}
          isChatExpanded={isChatExpanded}
          setIsChatExpanded={setIsChatExpanded}
          starredPhrases={starredPhrases}
          showStarredBelow={showStarredBelow}
          setShowStarredBelow={setShowStarredBelow}
          setShowStarredModal={setShowStarredModal}
          toggleStarMessage={toggleStarMessage}
          isMessageStarred={isMessageStarred}
          removeStarredPhrase={removeStarredPhrase}
          onCopySinglePhrase={handleCopySinglePhrase}
          copiedPhraseId={copiedPhraseId}
          onReset={handleReset}
          showOutcome={showOutcome}
          onOpenReferralModal={() => setShowReferralModal(true)}
          onNavigateToFred={onNavigateToFred}
          onNavigateToModule={onNavigateToModule}
          onOpenAiLeitner={onOpenAiLeitner}
        />
      )}

      {/* GP Referral Letter Modal */}
      <ReferralLetterModal
        language={language}
        showReferralModal={showReferralModal}
        onClose={() => setShowReferralModal(false)}
        pharmacistName={pharmacistName}
        setPharmacistName={setPharmacistName}
        ahpraRegNumber={ahpraRegNumber}
        setAhpraRegNumber={setAhpraRegNumber}
        pharmacyName={pharmacyName}
        setPharmacyName={setPharmacyName}
        generateLetterText={generateLetterText}
        onPrintLetter={handlePrintLetter}
        onCopyLetter={handleCopyLetter}
        isCopied={isCopied}
      />

      {/* Starred Phrases Modal */}
      <StarredPhrasesModal
        language={language}
        showStarredModal={showStarredModal}
        onClose={() => setShowStarredModal(false)}
        starredPhrases={starredPhrases}
        starredSearchTerm={starredSearchTerm}
        setStarredSearchTerm={setStarredSearchTerm}
        clearAllStarredPhrases={clearAllStarredPhrases}
        onCopySinglePhrase={handleCopySinglePhrase}
        removeStarredPhrase={removeStarredPhrase}
        copiedPhraseId={copiedPhraseId}
      />

      {/* WWHAM Single Question & Answer Popup Modal */}
      <WwhamQuestionModal
        language={language}
        scenario={scenario}
        activeWwhamQuestion={activeWwhamQuestion}
        onClose={() => setActiveWwhamQuestion(null)}
        isQnaStarred={isQnaStarred}
        onToggleStarQna={toggleStarQna}
      />

      {/* Red Flags Screening Popup Modal */}
      <RedFlagsModal
        language={language}
        scenario={scenario}
        showRedFlagsModal={showRedFlagsModal}
        onClose={() => setShowRedFlagsModal(false)}
        isQnaStarred={isQnaStarred}
        onToggleStarRedFlags={toggleStarRedFlags}
      />

      {/* Disease Detail Pop-up Modal */}
      {selectedDisease && (
        <DiseaseDetailModal
          disease={selectedDisease}
          language={language}
          onClose={() => setSelectedDisease(null)}
          onNavigateToModule={(modNum, scId) => {
            if (modNum === 3 && onNavigateToFred) {
              onNavigateToFred(scId);
            }
          }}
        />
      )}
    </div>
  );
};
