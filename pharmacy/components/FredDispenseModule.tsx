'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Language } from '@/types/pharmacy';
import {
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  ShieldAlert,
  Zap,
  RotateCcw,
  CheckSquare,
  Eye,
  Columns,
  Hospital,
  DollarSign,
  Keyboard,
  Printer,
  Check,
  CornerDownLeft,
  Command,
  Scan,
  Tag,
  Share2,
  Archive,
  Lock,
  Box,
  Layers,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { ScriptVisualizerPanel } from '@/components/ScriptVisualizerPanel';
import { FredShortcutCheatSheet, FredShortcutState } from '@/components/FredShortcutCheatSheet';
import { useStudyTrackerContext } from '@/components/study/StudyTrackerContext';
import { EmptyState, ModuleHeaderBar, ModuleSearchField, StageSelectorCard } from '@/components/ui';
import { haptic } from '@/lib/haptics';

// Dynamically import heavy modals & sub-panels
const PbsSafetyNetCalculatorPanel = dynamic(
  () => import('@/components/PbsSafetyNetCalculatorPanel').then((mod) => mod.PbsSafetyNetCalculatorPanel),
  { ssr: false }
);

const PharmacistFinalCheckModal = dynamic(
  () => import('@/components/PharmacistFinalCheckModal').then((mod) => mod.PharmacistFinalCheckModal),
  { ssr: false }
);

const DispensingDeskLabelingPanel = dynamic(
  () => import('@/components/DispensingDeskLabelingPanel').then((mod) => mod.DispensingDeskLabelingPanel),
  { ssr: false }
);

const DocumentRetentionSortingPanel = dynamic(
  () => import('@/components/DocumentRetentionSortingPanel').then((mod) => mod.DocumentRetentionSortingPanel),
  { ssr: false }
);

const OdtDosingLogPanel = dynamic(
  () => import('@/components/OdtDosingLogPanel').then((mod) => mod.OdtDosingLogPanel),
  { ssr: false }
);

const PbsClaimingArchivePanel = dynamic(
  () => import('@/components/PbsClaimingArchivePanel').then((mod) => mod.PbsClaimingArchivePanel),
  { ssr: false }
);

const ProjectStopModal = dynamic(
  () => import('@/components/shelf/ProjectStopModal').then((mod) => mod.ProjectStopModal),
  { ssr: false }
);

const SafeScriptAlertModal = dynamic(
  () => import('@/components/shelf/SafeScriptAlertModal').then((mod) => mod.SafeScriptAlertModal),
  { ssr: false }
);

interface ScriptScenario {
  id: string;
  type: 'eScript' | 'Paper' | 'Reg24' | 'Chart';
  scriptType: string;
  patientName: string;
  patientDob: string;
  medicareNumber: string;
  prescriberName: string;
  prescriberNumber: string;
  prescribedDrug: string;
  pbsCode: string;
  aFlagGenericSubstitute: string;
  schedule: 'S4' | 'S8';
  scriptDate: string; // ISO format or string
  quantity: number;
  repeats: number;
  directions: string;
  isExpiredS8?: boolean;
}

const SCRIPT_SCENARIOS: ScriptScenario[] = [
  {
    id: 'script-1',
    type: 'eScript',
    scriptType: 'typeC',
    patientName: 'David Miller',
    patientDob: '14/08/1968',
    medicareNumber: '2983 10928 1',
    prescriberName: 'Dr. Sarah Smith (Provider: 2938471A)',
    prescriberNumber: '2938471A',
    prescribedDrug: 'Lipitor 20mg Tablets',
    pbsCode: '2018H',
    aFlagGenericSubstitute: 'Atorvastatin 20mg (A-Flag Brand Substitute)',
    schedule: 'S4',
    scriptDate: '01/08/2026',
    quantity: 30,
    repeats: 5,
    directions: 'Take ONE tablet daily at bedtime.',
  },
  {
    id: 'script-2',
    type: 'Paper',
    scriptType: 'typeA',
    patientName: 'David Miller',
    patientDob: '14/08/1968',
    medicareNumber: '2983 10928 1',
    prescriberName: 'Dr. Sarah Jenkins (Provider: 2938471A)',
    prescriberNumber: '2938471A',
    prescribedDrug: 'Atorvastatin 20mg Tablets (Std Duplicate Paper)',
    pbsCode: '2018H',
    aFlagGenericSubstitute: 'Atorvastatin 20mg (A-Flag Brand Substitute)',
    schedule: 'S4',
    scriptDate: '01/08/2026',
    quantity: 30,
    repeats: 5,
    directions: 'Take ONE tablet daily at bedtime.',
  },
  {
    id: 'script-repeat',
    type: 'Paper',
    scriptType: 'typeRepeat',
    patientName: 'David Miller',
    patientDob: '14/08/1968',
    medicareNumber: '2983 10928 1',
    prescriberName: 'Dr. Sarah Smith (Provider: 2938471A)',
    prescriberNumber: '2938471A',
    prescribedDrug: 'Rosuvastatin 10mg Tablets (Yellow Repeat Form PB 24)',
    pbsCode: '8214K',
    aFlagGenericSubstitute: 'Rosuvastatin 10mg (A-Flag Brand Substitute)',
    schedule: 'S4',
    scriptDate: '10/08/2026',
    quantity: 30,
    repeats: 4,
    directions: 'Take ONE tablet daily at bedtime (4 of 5 Repeats Remaining).',
  },
  {
    id: 'script-3',
    type: 'Paper',
    scriptType: 'typeB',
    patientName: 'Robert Vance',
    patientDob: '05/03/1980',
    medicareNumber: '3019 44821 1',
    prescriberName: 'Dr. Helen Davis',
    prescriberNumber: '8837192C',
    prescribedDrug: 'OxyContin 10mg Tablets (S8 Controlled Drug)',
    pbsCode: '3192K',
    aFlagGenericSubstitute: 'Oxycodone SR 10mg',
    schedule: 'S8',
    scriptDate: '01/01/2026', // Dated >6 months ago!
    quantity: 28,
    repeats: 0,
    directions: 'Take ONE tablet every 12 hours.',
    isExpiredS8: true,
  },
  {
    id: 'script-4',
    type: 'Chart',
    scriptType: 'typeD',
    patientName: "Margaret O'Connor (RACF)",
    patientDob: '22/11/1952',
    medicareNumber: '4092 88123 2',
    prescriberName: 'Dr. James Wilson (RACF Visiting GP)',
    prescriberNumber: '1029382B',
    prescribedDrug: 'Coversyl Plus 5mg/1.25mg (RACF Chart)',
    pbsCode: '8291F',
    aFlagGenericSubstitute: 'Perindopril / Indapamide 5mg/1.25mg',
    schedule: 'S4',
    scriptDate: '10/08/2026',
    quantity: 30,
    repeats: 5,
    directions: 'Take ONE tablet daily in the morning for hypertension.',
  },
  {
    id: 'script-5',
    type: 'Paper',
    scriptType: 'typeE',
    patientName: 'Mark Taylor (NSW OTP)',
    patientDob: '24/11/1985',
    medicareNumber: '5012 99821 1',
    prescriberName: 'Dr. Alan Vance (NSW Health OTP Specialist)',
    prescriberNumber: '9928102S',
    prescribedDrug: 'Methadone Liquid 5mg/mL (NSW ODT S8 Form)',
    pbsCode: '1820X',
    aFlagGenericSubstitute: 'Methadone Oral Liquid 5mg/mL',
    schedule: 'S8',
    scriptDate: '10/08/2026',
    quantity: 1,
    repeats: 0,
    directions: 'Supervised 60mg Mon-Fri, 2 Takeaway bottles Sat-Sun.',
  },
];

type FredViewMode =
  | 'terminal'
  | 'visualizer'
  | 'safetynet'
  | 'shortcuts'
  | 'labelingDesk'
  | 'retentionDesk'
  | 'odtDosing'
  | 'pbsArchive'
  | 'dual'
  | null;

const VISUALIZER_TAB_TO_SCENARIO: Record<string, string> = {
  pb82: 'script-2',
  repeat_pb24: 'script-repeat',
  escript: 'script-1',
  s8_nsw: 'script-3',
  odt_racf: 'script-5',
};

const SCENARIO_TO_VISUALIZER_TAB: Record<string, string> = {
  'script-1': 'escript',
  'script-2': 'pb82',
  'script-repeat': 'repeat_pb24',
  'script-3': 's8_nsw',
  'script-4': 'handwritten',
  'script-5': 'odt_racf',
};

interface FredStepOption {
  id: FredViewMode;
  stepNumber: string;
  labelFa: string;
  labelEn: string;
  icon: React.ElementType;
  activeClasses: string;
  iconColor: string;
}

const FRED_STEP_OPTIONS: FredStepOption[] = [
  {
    id: 'visualizer',
    stepNumber: '1',
    labelFa: 'گام ۱: بررسی نسخه',
    labelEn: 'Step 1: Visualizer',
    icon: Eye,
    activeClasses: 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20',
    iconColor: 'text-indigo-300',
  },
  {
    id: 'terminal',
    stepNumber: '2',
    labelFa: 'گام ۲: ترمینال Fred',
    labelEn: 'Step 2: Terminal',
    icon: Monitor,
    activeClasses: 'bg-teal-600 text-white border-teal-500 shadow-teal-600/20',
    iconColor: 'text-teal-300',
  },
  {
    id: 'shortcuts',
    stepNumber: '3',
    labelFa: 'گام ۳: شورت‌کات‌ها',
    labelEn: 'Step 3: Shortcuts',
    icon: Keyboard,
    activeClasses: 'bg-amber-600 text-white border-amber-500 shadow-amber-600/20',
    iconColor: 'text-amber-300',
  },
  {
    id: 'safetynet',
    stepNumber: '4',
    labelFa: 'گام ۴: Safety Net',
    labelEn: 'Step 4: Safety Net',
    icon: DollarSign,
    activeClasses: 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/20',
    iconColor: 'text-emerald-300',
  },
  {
    id: 'labelingDesk',
    stepNumber: '5',
    labelFa: 'گام ۵: برچسب‌گذاری',
    labelEn: 'Step 5: Labeling',
    icon: Tag,
    activeClasses: 'bg-teal-600 text-white border-teal-500 shadow-teal-600/20',
    iconColor: 'text-teal-300',
  },
  {
    id: 'retentionDesk',
    stepNumber: '6',
    labelFa: 'گام ۶: بایگانی اسناد',
    labelEn: 'Step 6: Retention',
    icon: Archive,
    activeClasses: 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20',
    iconColor: 'text-indigo-300',
  },
  {
    id: 'odtDosing',
    stepNumber: '7',
    labelFa: 'گام ۷: ثبت دوز ODT',
    labelEn: 'Step 7: ODT Dosing',
    icon: Lock,
    activeClasses: 'bg-rose-600 text-white border-rose-500 shadow-rose-600/20',
    iconColor: 'text-rose-300',
  },
  {
    id: 'pbsArchive',
    stepNumber: '8',
    labelFa: 'گام ۸: ادعای PBS & POS',
    labelEn: 'Step 8: PBS & POS',
    icon: Box,
    activeClasses: 'bg-purple-600 text-white border-purple-500 shadow-purple-600/20',
    iconColor: 'text-purple-300',
  },
  {
    id: 'dual',
    stepNumber: 'ALL',
    labelFa: 'نمای کامل زنجیره نسخه پیچی (Dual Pipeline)',
    labelEn: 'Full Dispense Pipeline',
    icon: Columns,
    activeClasses: 'bg-teal-600 text-white border-teal-500 shadow-teal-600/20',
    iconColor: 'text-teal-300',
  },
];

interface FredDispenseModuleProps {
  language: Language;
  onNavigateToModule?: (moduleNumber: 1 | 2 | 3 | 4 | 5 | 6, contextId?: string) => void;
}

export const FredDispenseModule: React.FC<FredDispenseModuleProps> = ({
  language,
}) => {
  const isFa = language === 'fa';
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('script-1');
  const [viewMode, setViewMode] = useState<FredViewMode>(null);
  const [isStepAccordionOpen, setIsStepAccordionOpen] = useState(true);
  const [stepSearchTerm, setStepSearchTerm] = useState('');

  // Fred Screen Inputs
  const [enteredPbsCode, setEnteredPbsCode] = useState('');
  const [selectedShortcut, setSelectedShortcut] = useState<'5/1' | '5D' | '5R'>('5/1');
  const [isGenericSubstituted, setIsGenericSubstituted] = useState(false);

  // SUB-PHASE 5.3: Advanced Command Syntax & Shortcut Shortcuts State
  const [commandInput, setCommandInput] = useState<string>('5/1');
  const [repeatMode, setRepeatMode] = useState<'standard' | 'outside' | 'deferred' | 'reg24'>('standard');
  const [repeatAuthorized, setRepeatAuthorized] = useState<number>(5);
  const [repeatPreviouslyDispensed, setRepeatPreviouslyDispensed] = useState<number>(0);
  const [isChartMode, setIsChartMode] = useState<boolean>(false);
  const [isMySlExcluded, setIsMySlExcluded] = useState<boolean>(false);
  const [brandPreference, setBrandPreference] = useState<'GS' | 'GB'>('GS');
  const [myHrConsent, setMyHrConsent] = useState<boolean>(true);
  const [isOwing, setIsOwing] = useState<boolean>(false);
  const [isOwingReconciled, setIsOwingReconciled] = useState<boolean>(false);
  const [erxBarcode, setErxBarcode] = useState<string>('');

  const [isHandoutOpen, setIsHandoutOpen] = useState(false);
  const [isFinalCheckModalOpen, setIsFinalCheckModalOpen] = useState(false);
  const [verifiedName, setVerifiedName] = useState(false);
  const [verifiedDob, setVerifiedDob] = useState(false);
  const [dispenseSuccess, setDispenseSuccess] = useState<boolean | null>(null);
  const [dispenseError, setDispenseError] = useState<string | null>(null);

  // Project STOP (S3 Pseudoephedrine) State
  const [isProjectStopOpen, setIsProjectStopOpen] = useState(false);
  const [psPatientName, setPsPatientName] = useState('Sarah Jenkins');
  const [psIdType, setPsIdType] = useState<'Driver License' | 'Passport' | 'Proof of Age'>('Driver License');
  const [psPatientId, setPsPatientId] = useState('DL-9824017');
  const [psCounselingCompleted, setPsCounselingCompleted] = useState(false);
  const [psIsApproved, setPsIsApproved] = useState<boolean | null>(null);
  const [psApprovalCode, setPsApprovalCode] = useState<string>('');
  const [isSafeScriptModalOpen, setIsSafeScriptModalOpen] = useState(false);

  const scenario = SCRIPT_SCENARIOS.find((s) => s.id === selectedScenarioId) || SCRIPT_SCENARIOS[0];

  const safeScriptDetails = useMemo(() => {
    if (scenario.schedule !== 'S8') return undefined;
    return {
      drugName: scenario.prescribedDrug,
      brandName: 'OxyContin',
      schedule: 'S8' as const,
      patientName: scenario.patientName,
      patientDob: scenario.patientDob,
      prescriberName: scenario.prescriberName,
      alertLevel: 'RED' as const,
      omedDose: 120,
      dispenseHistory: [
        { date: '01/01/2026', drug: 'OxyContin 10mg CR (Qty: 28)', quantity: 28, prescriber: 'Dr. Helen Davis', pharmacy: 'Sydney Community Pharmacy' },
        { date: '15/12/2025', drug: 'Endone 5mg (Qty: 20)', quantity: 20, prescriber: 'Dr. Mark Taylor', pharmacy: 'Chemist Warehouse Bondi' },
        { date: '28/11/2025', drug: 'Normison 10mg (Temazepam) (Qty: 25)', quantity: 25, prescriber: 'Dr. John Watson', pharmacy: 'Priceline Pharmacy Manly' },
      ],
      reasons: {
        fa: [
          'نسخه بیش از ۶ ماه از تاریخ نگارش گذشته و فاقد اعتبار قانونی تحویل است.',
          'شاخص معادل مورفین روزانه (OMED) بیمار ۱۲۰mg/day است (فراتر از آستانه هشدار قرمز ۱۰۰mg/day).',
          'مصرف همزمان اوپیوئید و بنزودیازپین در ۹۰ روز گذشته ثبت شده است.',
        ],
        en: [
          'Prescription date exceeds legal 6-month validity for S8 medicines.',
          'Calculated Oral Morphine Equivalent Dose (OMED) is 120mg/day (exceeds 100mg/day high-risk threshold).',
          'Concurrent supply of opioid and benzodiazepine in the previous 90-day window.',
        ],
      },
      pharmacistActionRequired: {
        fa: 'داروساز طبق مقررات سموم استرالیا موظف است با پزشک تماس گرفته و استعلام ضرورت بالینی را اخذ کند و سپس نتیجه را در دفتر ثبت نماید.',
        en: 'Pharmacist is legally required to consult the prescriber before supply. If verified, record clinical notes in dispensary system.',
      },
    };
  }, [scenario]);

  const handleVerifyProjectStop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!psCounselingCompleted) {
      alert(isFa ? 'لطفاً قبل از ارسال استعلام، مشاوره داروساز با بیمار را تایید کنید.' : 'Please confirm therapeutic pharmacist counseling before submitting.');
      return;
    }
    const cleanId = psPatientId.trim().toUpperCase();
    if (cleanId.includes('BLOCK') || cleanId.includes('ALERT') || cleanId === 'DL-0000000') {
      setPsIsApproved(false);
      setPsApprovalCode('');
    } else {
      setPsIsApproved(true);
      const code = `PS-AU-${Math.floor(100000 + Math.random() * 900000)}`;
      setPsApprovalCode(code);
    }
  };
  const activeVisualizerTab = SCENARIO_TO_VISUALIZER_TAB[scenario.id];
  const activeStep = FRED_STEP_OPTIONS.find((step) => step.id === viewMode);
  const normalizedStepSearchTerm = stepSearchTerm.trim().toLowerCase();
  const filteredStepOptions = normalizedStepSearchTerm
    ? FRED_STEP_OPTIONS.filter(
        (step) =>
          step.labelFa.toLowerCase().includes(normalizedStepSearchTerm) ||
          step.labelEn.toLowerCase().includes(normalizedStepSearchTerm)
      )
    : FRED_STEP_OPTIONS;
  const isStepBrowseOpen = isStepAccordionOpen || Boolean(normalizedStepSearchTerm);

  const {
    markItemViewed,
    setItemCompleted,
  } = useStudyTrackerContext();

  // Automatically record viewed progress for currently active scenario
  useEffect(() => {
    // Merely rendering the default Fred panel is not a study interaction.
    // Wait until the user opens a workflow step before creating resume history.
    if (!viewMode) return;

    markItemViewed(
      3,
      scenario.id,
      {
        fa: `سناریو نسخه: ${scenario.patientName} (${scenario.prescribedDrug})`,
        en: `Script Scenario: ${scenario.patientName} (${scenario.prescribedDrug})`,
      },
      {
        fa: `پردازش نسخه [${scenario.type} - ${scenario.schedule}]`,
        en: `Script Dispensing [${scenario.type} - ${scenario.schedule}]`,
      },
      {
        tabId: viewMode || undefined,
      }
    );
  }, [scenario.id, scenario.patientName, scenario.prescribedDrug, scenario.type, scenario.schedule, viewMode, markItemViewed]);

  // Shortcut state object for cheat sheet component
  const shortcutState: FredShortcutState = {
    commandInput,
    repeatMode,
    repeatAuthorized,
    repeatPreviouslyDispensed,
    isChartMode,
    isMySlExcluded,
    brandPreference,
    myHrConsent,
    isOwing,
    isOwingReconciled,
  };

  // Keyboard Event Listener for Hotkeys (F10, Ctrl+Shift+C, Ctrl+Shift+X, F11, Alt+E)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F10 -> Pharmacist Final Check Audit Screen
      if (e.key === 'F10') {
        e.preventDefault();
        setIsFinalCheckModalOpen(true);
      }
      // Ctrl + Shift + C -> Chart Mode Toggle
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        setIsChartMode((prev) => {
          const next = !prev;
          if (next) {
            setRepeatAuthorized(0);
            setRepeatPreviouslyDispensed(0);
          } else {
            setRepeatAuthorized(5);
          }
          return next;
        });
      }
      // Ctrl + Shift + X -> MySL Exclude Toggle
      if (e.ctrlKey && e.shiftKey && (e.key === 'X' || e.key === 'x')) {
        e.preventDefault();
        setIsMySlExcluded((prev) => !prev);
      }
      // F11 -> Brand Toggle (GS / GB)
      if (e.key === 'F11') {
        e.preventDefault();
        setBrandPreference((prev) => (prev === 'GS' ? 'GB' : 'GS'));
      }
      // Alt + E -> MyHR Consent Toggle
      if (e.altKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        setMyHrConsent((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectScenario = (scId: string) => {
    setSelectedScenarioId(scId);
    setEnteredPbsCode('');
    setSelectedShortcut('5/1');
    setCommandInput('5/1');
    setRepeatMode('standard');
    setRepeatAuthorized(5);
    setRepeatPreviouslyDispensed(0);
    setIsGenericSubstituted(false);
    setIsHandoutOpen(false);
    setVerifiedName(false);
    setVerifiedDob(false);
    setDispenseSuccess(null);
    setDispenseError(null);
    setIsOwing(false);
    setIsOwingReconciled(false);

    // If RACF Chart scenario selected, auto-enable chart mode
    if (scId === 'script-4') {
      setIsChartMode(true);
      setRepeatAuthorized(0);
    } else {
      setIsChartMode(false);
    }
  };

  const handleApplyCommand = (cmdRaw: string) => {
    const cmd = cmdRaw.trim();
    if (!cmd) return;

    setCommandInput(cmd);
    const upper = cmd.toUpperCase();

    // 1. Repeat Syntax Evaluation
    if (upper === '5' || upper === '5/1' || upper === '1') {
      setRepeatMode('standard');
      setRepeatAuthorized(5);
      setRepeatPreviouslyDispensed(0);
      setSelectedShortcut('5/1');
    } else if (upper === '5/3' || upper === '3') {
      setRepeatMode('outside');
      setRepeatAuthorized(5);
      setRepeatPreviouslyDispensed(3);
    } else if (upper === '5D' || upper === 'D5' || upper === 'DEFER') {
      setRepeatMode('deferred');
      setRepeatAuthorized(5);
      setRepeatPreviouslyDispensed(0);
      setSelectedShortcut('5D');
    } else if (upper === '5R' || upper === 'R5' || upper === 'REG24' || upper === 'REG 24') {
      setRepeatMode('reg24');
      setRepeatAuthorized(5);
      setRepeatPreviouslyDispensed(0);
      setSelectedShortcut('5R');
    }
    // 2. Owing Workflow Evaluation
    else if (upper === 'OWING' || upper === 'OW') {
      setIsOwing(true);
      setIsOwingReconciled(false);
    } else if (upper.includes('MARK OFF') || upper.includes('MARKOFF') || upper.startsWith('ERX')) {
      setIsOwing(true);
      setIsOwingReconciled(true);
    }
    // 3. Special Shortcuts Evaluation
    else if (upper === 'GS') {
      setBrandPreference('GS');
    } else if (upper === 'GB') {
      setBrandPreference('GB');
    } else if (upper === 'CHART') {
      const next = !isChartMode;
      setIsChartMode(next);
      if (next) {
        setRepeatAuthorized(0);
        setRepeatPreviouslyDispensed(0);
      }
    } else if (upper === 'MYSL') {
      setIsMySlExcluded(!isMySlExcluded);
    } else if (upper === 'MYHR') {
      setMyHrConsent(!myHrConsent);
    }
  };

  const handleToggleHotKey = (keyType: 'chartMode' | 'mysl' | 'brand' | 'myhr' | 'owing' | 'reconcile') => {
    switch (keyType) {
      case 'chartMode':
        setIsChartMode((prev) => {
          const next = !prev;
          if (next) {
            setRepeatAuthorized(0);
            setRepeatPreviouslyDispensed(0);
          } else {
            setRepeatAuthorized(5);
          }
          return next;
        });
        break;
      case 'mysl':
        setIsMySlExcluded((prev) => !prev);
        break;
      case 'brand':
        setBrandPreference((prev) => (prev === 'GS' ? 'GB' : 'GS'));
        break;
      case 'myhr':
        setMyHrConsent((prev) => !prev);
        break;
      case 'owing':
        setIsOwing(true);
        setIsOwingReconciled(false);
        break;
      case 'reconcile':
        setIsOwing(true);
        setIsOwingReconciled(true);
        break;
    }
  };

  const handleExecuteShortcut = (shortcut: '5/1' | '5D' | '5R') => {
    setSelectedShortcut(shortcut);
    handleApplyCommand(shortcut);
  };

  const handleProcessDispense = () => {
    // S8 SafeScript RTPM mandatory check
    if (scenario.schedule === 'S8') {
      setIsSafeScriptModalOpen(true);
      return;
    }

    // Launch Pharmacist Final Check Audit Modal
    setIsFinalCheckModalOpen(true);
  };

  const handleFinalHandoutConfirm = () => {
    if (verifiedName && verifiedDob) {
      setDispenseSuccess(true);
      setIsHandoutOpen(false);
      setItemCompleted(
        3,
        scenario.id,
        true,
        {
          fa: `سناریو نسخه: ${scenario.patientName} (${scenario.prescribedDrug})`,
          en: `Script Scenario: ${scenario.patientName} (${scenario.prescribedDrug})`,
        },
        {
          fa: `پردازش نسخه [${scenario.type} - ${scenario.schedule}]`,
          en: `Script Dispensing [${scenario.type} - ${scenario.schedule}]`,
        }
      );
    } else {
      alert(isFa ? 'لطفاً هر دو شناسه (نام کامل و تاریخ تولد) را قبل از تحویل نهایی تایید کنید!' : 'Please check both 2-identifiers before final supply!');
    }
  };

  return (
    <div className="space-y-5">
      <ModuleHeaderBar
        icon={Layers}
        title={{ fa: 'زنجیره نسخه‌پیچی Fred', en: 'Fred Dispensing Pipeline' }}
        subtitle={{ fa: 'فرآیند کامل دریافت، بررسی و تحویل نسخه', en: 'Complete prescription intake, review and supply workflow' }}
        accent="teal"
        language={language}
        actions={
          <div className="flex items-center gap-2">
            {scenario.schedule === 'S8' && (
              <button
                type="button"
                onClick={() => setIsSafeScriptModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer animate-pulse"
                title={isFa ? 'بررسی مانیتورینگ SafeScript RTPM' : 'Review SafeScript RTPM'}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>SafeScript RTPM</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsProjectStopOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              title={isFa ? 'استعلام هویت خریدار سودوافدرین و قوانین S3' : 'Project STOP Pseudoephedrine verification'}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Project STOP (S3)</span>
            </button>
          </div>
        }
      />

      {!viewMode && (
        <>
          <ModuleSearchField
            value={stepSearchTerm}
            onChange={setStepSearchTerm}
            language={language}
            placeholder={{
              fa: 'جستجوی گام نسخه‌پیچی...',
              en: 'Search dispensing steps...',
            }}
          />
          <StageSelectorCard
            icon={Layers}
            title={{ fa: 'انتخاب گام زنجیره نسخه‌پیچی', en: 'Select Dispensing Pipeline Step' }}
            subtitleEn="Choose a step to begin the dispensing workflow"
            count={filteredStepOptions.length}
            changeLabel={{ fa: 'تغییر گام', en: 'Change Step' }}
            isOpen={isStepBrowseOpen}
            onToggle={() => setIsStepAccordionOpen((prev) => !prev)}
            language={language}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredStepOptions.map((step) => {
                const isSelected = viewMode === step.id;
                const Icon = step.icon;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => {
                      haptic.light();
                      setViewMode(step.id);
                      setIsStepAccordionOpen(false);
                    }}
                    className={`group text-start p-2.5 sm:p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5 select-none ${
                      isSelected
                        ? `${step.activeClasses} font-bold shadow-sm ring-1 ring-teal-500/40 scale-[1.01]`
                        : 'app-border hover:border-slate-400/40 bg-black/10 dark:bg-slate-900/60 hover:bg-black/20 dark:hover:bg-slate-800/80 opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isSelected ? 'bg-white/15' : 'bg-black/10 dark:bg-slate-800'}`}>
                        <Icon className={`w-4 h-4 ${isSelected ? step.iconColor : 'text-slate-400 group-hover:text-slate-200'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold leading-tight truncate">
                          {isFa ? step.labelFa : step.labelEn}
                        </p>
                        {isFa && (
                          <p className="text-[10px] opacity-75 truncate mt-0.5 font-sans" dir="ltr">
                            {step.labelEn}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-black/30 text-slate-200">
                        {step.stepNumber}
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-teal-500 text-white flex items-center justify-center shadow-xs">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </StageSelectorCard>
        </>
      )}

      {viewMode && activeStep && (
        <ModuleHeaderBar
          icon={Layers}
          title={{ fa: activeStep.labelFa, en: activeStep.labelEn }}
          badge={
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-500 font-mono font-bold">
              {activeStep.stepNumber}
            </span>
          }
          actions={
            <button
              type="button"
              onClick={() => {
                setViewMode(null);
                setIsStepAccordionOpen(true);
              }}
              className="px-3 py-1.5 rounded-full app-border border app-muted hover:opacity-70 text-xs font-bold transition cursor-pointer"
            >
              {isFa ? 'تغییر گام' : 'Change Step'}
            </button>
          }
          language={language}
        />
      )}

      {viewMode ? (
        <>
          {/* STEP 1: Script Visualizer Panel Section (Rendered in 'visualizer' or 'dual' view) */}
          {(viewMode === 'visualizer' || viewMode === 'dual') && (
            <div className="space-y-2">
              {viewMode === 'dual' && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-xs font-bold text-indigo-300">
                  <span className="flex items-center gap-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-indigo-900 text-indigo-100 border border-indigo-700">STEP 01</span>
                    {isFa ? 'گام اول: دریافت و ارزیابی قانونی تصویر نسخه (Script Intake & Visualizer)' : 'Step 1: Script Intake & Visualizer'}
                  </span>
                  <span className="text-[10px] text-indigo-400 font-normal">{isFa ? 'چک کردن تاریخ، پزشک، مدیکر و قوانین S4/S8' : 'Verify prescription validity'}</span>
                </div>
              )}
              <ScriptVisualizerPanel
                language={language}
                activeScriptType={activeVisualizerTab}
                onSelectScriptType={(type) => {
                  const scenarioId = VISUALIZER_TAB_TO_SCENARIO[type];
                  if (scenarioId) {
                    handleSelectScenario(scenarioId);
                  }
                }}
              />
            </div>
          )}

          {/* STEP 2: Fred Dispense Plus Screen Mockup (Rendered in 'terminal' or 'dual' view) */}
          {(viewMode === 'terminal' || viewMode === 'dual') && (
            <div className="space-y-2">
              {viewMode === 'dual' && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-teal-950/80 border border-teal-500/30 text-xs font-bold text-teal-300">
                  <span className="flex items-center gap-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-teal-900 text-teal-100 border border-teal-700">STEP 02</span>
                    {isFa ? 'گام دوم: ورود داده‌ها به ترمینال فرِد (Fred Dispense Plus Main Terminal)' : 'Step 2: Fred Dispense Plus Main Terminal'}
                  </span>
                  <span className="text-[10px] text-teal-400 font-normal">{isFa ? 'وارد کردن کد PBS، جایگزین ژنریک A-Flag و مقدار' : 'PBS item code & substitution'}</span>
                </div>
              )}
              <div className="app-card border-2 border-teal-500/40 rounded-2xl overflow-hidden shadow-2xl bg-slate-950 text-white font-sans space-y-0">
                {/* Fred Title Bar */}
                <div className="bg-teal-900 border-b border-teal-700 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-400 animate-pulse" />
                    <span className="font-bold text-teal-200">FRED DISPENSE PLUS v2.8 - COMMUNITY PHARMACY TERMINAL</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <button
                      onClick={() => setIsFinalCheckModalOpen(true)}
                      className="px-2.5 py-1 rounded bg-teal-800 hover:bg-teal-700 text-teal-100 border border-teal-600 transition flex items-center gap-1 font-bold shadow"
                    >
                      <span>Final Check [F10]</span>
                    </button>
                    <span className="text-teal-300 hidden sm:inline">Station #01 | Pharmacist ID: PHAR-9812</span>
                  </div>
                </div>

                <div className="p-4 sm:p-6 space-y-5">
                  {/* 1. INTERACTIVE FRED COMMAND LINE INPUT BAR */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-teal-500/40 space-y-2 shadow-inner">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-teal-300 font-mono flex items-center gap-1.5 uppercase">
                        <Command className="w-4 h-4 text-teal-400" />
                        {isFa ? 'خط فرمان اصلی فرِد (Fred Command Line Input):' : 'Fred Command Line Input:'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Press Enter or click Execute</span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={commandInput}
                          onChange={(e) => setCommandInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleApplyCommand(commandInput);
                          }}
                          placeholder="Type command syntax (e.g. 5/1, 5/3, 5D, 5R, Owing, Mark Off, GS, GB)..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-teal-500/60 text-teal-200 font-mono font-bold text-sm focus:outline-none focus:border-teal-400 shadow-inner"
                        />
                        <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-mono">
                          Fred CLI
                        </span>
                      </div>

                      <button
                        onClick={() => handleApplyCommand(commandInput)}
                        className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition text-xs flex items-center justify-center gap-1.5 shadow-md shrink-0"
                      >
                        <CornerDownLeft className="w-4 h-4" />
                        <span>{isFa ? 'اجرای فرمان' : 'Execute Command'}</span>
                      </button>
                    </div>

                    {/* Quick Command Suggestion Tags */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar text-[11px] font-mono">
                      <span className="text-slate-400 text-[10px] shrink-0">{isFa ? 'پیشنهاد سریع:' : 'Quick Syntax:'}</span>
                      {['5/1', '5/3', '5D', '5R', 'Owing', 'Mark Off', 'GS', 'GB', 'CHART', 'MYSL', 'MYHR'].map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleApplyCommand(tag)}
                          className="px-2 py-0.5 rounded bg-slate-950 hover:bg-teal-900 border border-slate-800 hover:border-teal-600 text-teal-300 transition text-[10px] font-bold shrink-0"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Active System Hotkey Badges Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    {/* Brand Selection Toggle (F11) */}
                    <button
                      onClick={() => handleToggleHotKey('brand')}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 flex items-center justify-between transition text-left"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">Brand Priority [F11]:</span>
                        <strong className="text-teal-300 font-bold">
                          {brandPreference === 'GS' ? 'GS (Generic First)' : 'GB (Brand First)'}
                        </strong>
                      </div>
                      <Tag className="w-4 h-4 text-teal-400" />
                    </button>

                    {/* MySL Active Script List Toggle (Ctrl+Shift+X) */}
                    <button
                      onClick={() => handleToggleHotKey('mysl')}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 flex items-center justify-between transition text-left"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">MySL Script List [Ctrl+Shift+X]:</span>
                        <strong className={isMySlExcluded ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                          {isMySlExcluded ? 'Excluded' : 'Included'}
                        </strong>
                      </div>
                      <Share2 className="w-4 h-4 text-indigo-400" />
                    </button>

                    {/* MyHR Consent Toggle (Alt+E) */}
                    <button
                      onClick={() => handleToggleHotKey('myhr')}
                      className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/50 flex items-center justify-between transition text-left"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">MyHR Upload [Alt+E]:</span>
                        <strong className={myHrConsent ? 'text-teal-400 font-bold' : 'text-rose-400 font-bold'}>
                          {myHrConsent ? 'Consented' : 'Opted Out'}
                        </strong>
                      </div>
                      <ShieldAlert className="w-4 h-4 text-teal-400" />
                    </button>

                    {/* Chart Mode Indicator (Ctrl+Shift+C) */}
                    <button
                      onClick={() => handleToggleHotKey('chartMode')}
                      className={`p-2.5 rounded-xl border flex items-center justify-between transition text-left ${
                        isChartMode
                          ? 'bg-purple-950/80 border-purple-500 text-purple-200'
                          : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-slate-400 block">Chart Mode [Ctrl+Shift+C]:</span>
                        <strong className={isChartMode ? 'text-purple-300 font-bold' : 'text-slate-400'}>
                          {isChartMode ? 'Active (RACF)' : 'Standard Script'}
                        </strong>
                      </div>
                      <Hospital className={`w-4 h-4 ${isChartMode ? 'text-purple-400 animate-pulse' : 'text-slate-500'}`} />
                    </button>
                  </div>

                  {/* OWING SCRIPT WORKFLOW BANNER (If Owing is triggered) */}
                  {isOwing && (
                    <div className="p-4 rounded-xl bg-rose-950/80 border-2 border-rose-500/60 text-white space-y-3 text-xs animate-in fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-500/30 pb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5 text-rose-400 shrink-0" />
                          <div>
                            <span className="font-bold text-sm text-rose-300 block">
                              {isFa ? 'فرآیند نسخه بدهکار فعال شد! (Owing Script Active)' : 'Owing Script Workflow Active'}
                            </span>
                            <p className="text-slate-300 text-[11px]">
                              {isFa
                                ? 'دارو تحویل داده شد. برگه بدهکار صادر شده و منتظر دریافت اصل نسخه از پزشک می‌باشد.'
                                : 'Emergency supply dispensed. Paper script pending receipt from prescriber.'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => alert(isFa ? 'برگه بدهکار (Owing Notice) جهت الصاق به برچسب دارو چاپ شد.' : 'Owing Notice printed successfully!')}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition flex items-center gap-1.5 shrink-0 shadow"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{isFa ? 'چاپ برچسب بدهکار (Print Owing Notice)' : 'Print Owing Notice'}</span>
                        </button>
                      </div>

                      {/* Mark Off / eRx Reconciliation Input */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                        <span className="text-slate-300 text-[11px] font-bold">
                          {isFa ? 'تسویه و خروج از بدهکاری (Reconciliation / Mark Off):' : 'Reconcile Owing via eRx Barcode Scan:'}
                        </span>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="text"
                            value={erxBarcode}
                            onChange={(e) => setErxBarcode(e.target.value)}
                            placeholder="Scan eRx Barcode (e.g. ERX98124)"
                            className="px-3 py-1 bg-black border border-rose-400/50 rounded-lg text-rose-300 font-mono text-xs w-full sm:w-48"
                          />
                          <button
                            onClick={() => handleApplyCommand('Mark Off')}
                            className={`px-3 py-1.5 rounded-lg font-bold transition text-xs shrink-0 flex items-center gap-1 ${
                              isOwingReconciled
                                ? 'bg-emerald-600 text-white border border-emerald-400'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                            }`}
                          >
                            <Scan className="w-3.5 h-3.5" />
                            <span>{isOwingReconciled ? (isFa ? 'تسویه شد ✅' : 'Reconciled ✅') : (isFa ? 'اسکن بارکد و تسویه' : 'Mark Off Owing')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Top Patient & Prescriber Banner (Turns PURPLE in Medication Chart Mode) */}
                  <div
                    className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-3.5 rounded-xl border text-xs transition-all ${
                      isChartMode
                        ? 'bg-purple-950/90 border-purple-500/60 text-purple-100 shadow-lg shadow-purple-900/30'
                        : 'bg-slate-900/90 border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase font-mono ${isChartMode ? 'text-purple-300' : 'text-teal-400'}`}>
                        {isChartMode ? 'RACF / HOSPITAL MEDICATION CHART PATIENT' : 'PATIENT DEMOGRAPHICS'}
                      </span>
                      <p className="font-bold text-sm text-white">{scenario.patientName}</p>
                      <p className={isChartMode ? 'text-purple-200' : 'text-slate-400'}>
                        DOB: <span className="text-white font-mono">{scenario.patientDob}</span> | Medicare: <span className="text-white font-mono">{scenario.medicareNumber}</span>
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className={`text-[10px] font-bold uppercase font-mono ${isChartMode ? 'text-purple-300' : 'text-teal-400'}`}>
                        PRESCRIBER & CHART VALIDITY
                      </span>
                      <p className="font-bold text-sm text-white">{scenario.prescriberName}</p>
                      <p className={isChartMode ? 'text-purple-200' : 'text-slate-400'}>
                        Script Date: <span className={`font-mono font-bold ${scenario.isExpiredS8 ? 'text-rose-400' : 'text-emerald-400'}`}>{scenario.scriptDate}</span>
                      </p>
                    </div>
                  </div>

                  {/* Script Processing Form */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left Inputs */}
                    <div className="lg:col-span-2 space-y-4 text-xs">
                      {/* Prescribed Item & A-Flag Substitute */}
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-300">{isFa ? 'داروی تجویز شده روی نسخه:' : 'Prescribed Medication:'}</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                            Schedule {scenario.schedule}
                          </span>
                        </div>
                        <p className="font-bold text-base text-teal-300 font-mono">{scenario.prescribedDrug}</p>

                        {/* A-Flag Generic Substitution Toggle */}
                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">{isFa ? 'جایگزینی برند ژنریک (A-Flag Brand Substitution):' : 'A-Flag Generic Substitution:'}</span>
                          <button
                            onClick={() => setIsGenericSubstituted(!isGenericSubstituted)}
                            className={`px-3 py-1 rounded-lg font-bold transition border ${
                              isGenericSubstituted
                                ? 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                            }`}
                          >
                            {isGenericSubstituted ? `✅ ${scenario.aFlagGenericSubstitute}` : isFa ? 'فعال‌سازی جایگزین ژنریک' : 'Enable Substitution'}
                          </button>
                        </div>
                      </div>

                      {/* PBS Code & Fred Shortcut Keyboard Controls */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">{isFa ? 'کد PBS (PBS Code):' : 'PBS Item Code:'}</label>
                          <div className="relative">
                            <input
                              type="text"
                              value={enteredPbsCode}
                              onChange={(e) => setEnteredPbsCode(e.target.value.toUpperCase())}
                              placeholder={`e.g. ${scenario.pbsCode}`}
                              className="w-full px-3 py-2 rounded-xl bg-black border border-teal-600/50 text-teal-300 font-mono font-bold text-sm focus:outline-none focus:border-teal-400"
                            />
                            <button
                              onClick={() => setEnteredPbsCode(scenario.pbsCode)}
                              className="absolute right-2 top-2 text-[10px] px-1.5 py-0.5 rounded bg-teal-900 text-teal-200 border border-teal-700 hover:bg-teal-800"
                            >
                              Auto
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-slate-400 font-semibold mb-1">{isFa ? 'میانبرهای شبیه‌ساز Fred Shortcuts:' : 'Fred Shortcut Rules:'}</label>
                          <div className="grid grid-cols-3 gap-1">
                            <button
                              onClick={() => handleExecuteShortcut('5/1')}
                              className={`py-2 rounded-lg font-mono font-bold text-xs border transition ${
                                repeatMode === 'standard'
                                  ? 'bg-teal-600 text-white border-teal-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              5/1 (Std)
                            </button>
                            <button
                              onClick={() => handleExecuteShortcut('5D')}
                              className={`py-2 rounded-lg font-mono font-bold text-xs border transition ${
                                repeatMode === 'deferred'
                                  ? 'bg-amber-600 text-white border-amber-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              5D (Defer)
                            </button>
                            <button
                              onClick={() => handleExecuteShortcut('5R')}
                              className={`py-2 rounded-lg font-mono font-bold text-xs border transition ${
                                repeatMode === 'reg24'
                                  ? 'bg-purple-600 text-white border-purple-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              5R (Reg24)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Directions & Instructions */}
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">{isFa ? 'دستور مصرف روی لیبل (Directions):' : 'Directions on CAL Label:'}</label>
                        <input
                          type="text"
                          readOnly
                          value={scenario.directions}
                          className="w-full px-3 py-2 rounded-xl bg-black border border-slate-800 text-white font-mono text-xs"
                        />
                      </div>
                    </div>

                    {/* Right Summary Box & Action */}
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-4 text-xs">
                      <div className="space-y-3">
                        <span className="font-bold text-teal-400 text-xs font-mono uppercase">DISPENSE PREVIEW</span>

                        <div className="space-y-1.5 text-slate-300">
                          <div className="flex justify-between">
                            <span>{isFa ? 'تعداد تجویز شده:' : 'Prescribed Qty:'}</span>
                            <span className="font-mono text-white font-bold">{scenario.quantity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>{isFa ? 'تعداد تکرارهای مجاز:' : 'Repeats Allowed:'}</span>
                            <span className="font-mono text-white font-bold">
                              {isChartMode ? '0 (Medication Chart)' : repeatAuthorized}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>{isFa ? 'حالت دیسپنس:' : 'Dispense Mode:'}</span>
                            <span className="font-mono text-amber-300 font-bold uppercase">
                              {repeatMode === 'standard' && 'Standard 1st Supply (5/1)'}
                              {repeatMode === 'outside' && 'Outside Repeat (5/3)'}
                              {repeatMode === 'deferred' && 'Deferred Supply (5D)'}
                              {repeatMode === 'reg24' && 'Reg 24 Full Supply (5R)'}
                            </span>
                          </div>
                        </div>

                        {scenario.isExpiredS8 && (
                          <div className="p-2.5 rounded-lg bg-rose-950/80 border border-rose-500/50 text-rose-200 text-[11px] space-y-1">
                            <p className="font-bold text-rose-400 flex items-center gap-1">
                              <ShieldAlert className="w-3.5 h-3.5" />
                              {isFa ? 'هشدار خطای قانونی انقضای S8!' : 'S8 Legal Expiry Violation!'}
                            </p>
                            <p>{isFa ? 'نسخه‌های S8 طبق قانون ایالتی پس از ۶ ماه فاقد اعتبار تحویل هستند.' : 'S8 prescriptions legally expire 6 months after the date of writing.'}</p>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={handleProcessDispense}
                        className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30 text-sm"
                      >
                        <Zap className="w-4 h-4" />
                        <span>{isFa ? 'پردازش نسخه و بررسی تحویل نهایی' : 'Process Dispense & Verify Handout'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Fred Command Shortcut Cheat Sheet Panel (Rendered in 'shortcuts' or 'dual' view) */}
          {(viewMode === 'shortcuts' || viewMode === 'dual') && (
            <div className="space-y-2">
              {viewMode === 'dual' && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/30 text-xs font-bold text-amber-300">
                  <span className="flex items-center gap-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-amber-900 text-amber-100 border border-amber-700">STEP 03</span>
                    {isFa ? 'گام سوم: راهنما و قوانین کلیدهای میانبر فرِد (Fred Shortcuts & Syntax)' : 'Step 3: Fred Shortcuts & Syntax'}
                  </span>
                  <span className="text-[10px] text-amber-400 font-normal">{isFa ? 'قوانین 5/1، 5D، 5R و کلیدهای میانبر' : 'CLI shortcut syntax'}</span>
                </div>
              )}
              <FredShortcutCheatSheet
                language={language}
                state={shortcutState}
                onApplyCommand={handleApplyCommand}
                onToggleHotKey={handleToggleHotKey}
              />
            </div>
          )}

          {/* STEP 4: PBS Pricing & Safety Net Calculator Engine (Rendered in 'safetynet' or 'dual' view) */}
          {(viewMode === 'safetynet' || viewMode === 'dual') && (
            <div className="space-y-2">
              {viewMode === 'dual' && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/30 text-xs font-bold text-emerald-300">
                  <span className="flex items-center gap-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-emerald-900 text-emerald-100 border border-emerald-700">STEP 04</span>
                    {isFa ? 'گام چهارم: محاسبه قیمت، پرداختی بیمار و سقف آستانه Safety Net' : 'Step 4: PBS Pricing & Safety Net Accumulator'}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-normal">{isFa ? 'محاسبه فرانشیز $31.60 و $7.70' : 'Co-payment calculation'}</span>
                </div>
              )}
              <PbsSafetyNetCalculatorPanel
                language={language}
              />
            </div>
          )}

          {/* STEP 5: Interactive Dispensing & Labeling Desk Panel (Rendered in 'labelingDesk' or 'dual' view) */}
          {(viewMode === 'labelingDesk' || viewMode === 'dual') && (
            <div className="space-y-2">
              {viewMode === 'dual' && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-teal-950/80 border border-teal-500/30 text-xs font-bold text-teal-300">
                  <span className="flex items-center gap-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-teal-900 text-teal-100 border border-teal-700">STEP 05</span>
                    {isFa ? 'گام پنجم: میز برچسب‌گذاری، چاپ لیبل اصلی دارو و Store Copy نسخه' : 'Step 5: Dispensing Labeling & Store Copy Desk'}
                  </span>
                  <span className="text-[10px] text-teal-400 font-normal">{isFa ? 'الصاق لیبل به قوطی دارو و پشت نسخه' : 'Affix Main Label to bottle & Store Copy to script back'}</span>
                </div>
              )}
              <DispensingDeskLabelingPanel
                key={scenario.id}
                language={language}
                scenario={scenario}
                isGenericSubstituted={isGenericSubstituted}
              />
            </div>
          )}

          {/* STEP 6: PB24 Stapling & Document Retention Sorting Desk (Rendered in 'retentionDesk' or 'dual' view) */}
          {(viewMode === 'retentionDesk' || viewMode === 'dual') && (
            <div className="space-y-2">
              {viewMode === 'dual' && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-indigo-950/80 border border-indigo-500/30 text-xs font-bold text-indigo-300">
                  <span className="flex items-center gap-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-indigo-900 text-indigo-100 border border-indigo-700">STEP 06</span>
                    {isFa ? 'گام ششم: منگنه برگه تکرار PB24 و بایگانی زونکن اسناد ۱۲ ماهه' : 'Step 6: Document Retention & PB24 Stapling Desk'}
                  </span>
                  <span className="text-[10px] text-indigo-400 font-normal">{isFa ? 'منگنه PB24 به اصل نسخه و بایگانی' : 'Staple repeat & file in trays'}</span>
                </div>
              )}
              <DocumentRetentionSortingPanel
                language={language}
                scenario={scenario}
                isGenericSubstituted={isGenericSubstituted}
              />
            </div>
          )}

          {/* STEP 7: NSW ODT Daily Dosing Log & S8 Register Desk (Rendered in 'odtDosing' or 'dual' view) */}
          {(viewMode === 'odtDosing' || viewMode === 'dual') && (
            <div className="space-y-2">
              {viewMode === 'dual' && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-rose-950/80 border border-rose-500/30 text-xs font-bold text-rose-300">
                  <span className="flex items-center gap-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-rose-900 text-rose-100 border border-rose-700">STEP 07</span>
                    {isFa ? 'گام هفتم: دفترچه ثبت داروهای تحت کنترل S8 و ثبت دوز روزانه ODT' : 'Step 7: S8 Safe Register & NSW ODT Dosing Desk'}
                  </span>
                  <span className="text-[10px] text-rose-400 font-normal">{isFa ? 'ثبت دوز روزانه، خط قرمز و گاوصندوق S8' : 'Daily log & double strikethrough'}</span>
                </div>
              )}
              <OdtDosingLogPanel
                language={language}
                scenario={scenario}
                isGenericSubstituted={isGenericSubstituted}
              />
            </div>
          )}

          {/* STEP 8: PBS Monthly Claiming Bins, Confidential Shredding & 5-Point POS Release Desk (Rendered in 'pbsArchive' or 'dual' view) */}
          {(viewMode === 'pbsArchive' || viewMode === 'dual') && (
            <div className="space-y-2">
              {viewMode === 'dual' && (
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-purple-950/80 border border-purple-500/30 text-xs font-bold text-purple-300">
                  <span className="flex items-center gap-2 font-mono">
                    <span className="px-2 py-0.5 rounded bg-purple-900 text-purple-100 border border-purple-700">STEP 08</span>
                    {isFa ? 'گام هشتم: دسته بندی ادعای PBS، امحای PII و تحویل نهایی به صندوق (POS Release)' : 'Step 8: PBS Claim Bins, PII Shredding & POS Release'}
                  </span>
                  <span className="text-[10px] text-purple-400 font-normal">{isFa ? 'تفکیک صندوق ادعا، سطل امحا و تحویل نهایی' : 'File claim duplicates & POS dispatch'}</span>
                </div>
              )}
              <PbsClaimingArchivePanel
                language={language}
                scenario={scenario}
                isGenericSubstituted={isGenericSubstituted}
              />
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon={Monitor}
          title={{ fa: 'هیچ مرحله‌ای انتخاب نشده است', en: 'No Dispensing Step Selected' }}
          description={{
            fa: 'برای شروع و مشاهده جزئیات، لطفاً از منوی بالای صفحه یکی از گام‌های نسخه‌پیچی (بررسی نسخه، ترمینال Fred، شورت‌کات‌ها، برچسب‌گذاری و...) را انتخاب نمایید.',
            en: 'Please choose one of the dispensing pipeline steps from the menu above to begin workflow and view its interface.',
          }}
          language={language}
        />
      )}

      {/* Pharmacist Final Check Audit Screen (F10 Hotkey) */}
      {isFinalCheckModalOpen && (
        <PharmacistFinalCheckModal
          language={language}
          scenario={scenario}
          isGenericSubstituted={isGenericSubstituted}
          repeatMode={repeatMode}
          brandPreference={brandPreference}
          onClose={() => setIsFinalCheckModalOpen(false)}
          onOpenLabelingDesk={() => setViewMode('labelingDesk')}
          onOpenRetentionDesk={() => setViewMode('retentionDesk')}
          onOpenOdtDosingDesk={() => setViewMode('odtDosing')}
          onOpenPbsArchiveDesk={() => setViewMode('pbsArchive')}
          onCompleteHandout={() => {
            setIsFinalCheckModalOpen(false);
            setDispenseSuccess(true);
            setItemCompleted(
              3,
              scenario.id,
              true,
              {
                fa: `سناریو نسخه: ${scenario.patientName} (${scenario.prescribedDrug})`,
                en: `Script Scenario: ${scenario.patientName} (${scenario.prescribedDrug})`,
              },
              {
                fa: `پردازش نسخه [${scenario.type} - ${scenario.schedule}]`,
                en: `Script Dispensing [${scenario.type} - ${scenario.schedule}]`,
              }
            );
          }}
        />
      )}

      {/* Handout Verification Modal (2 Identifiers check) */}
      {isHandoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="app-card border border-teal-500/40 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl bg-slate-900 text-white">
            <div className="flex items-center justify-between border-b border-teal-500/30 pb-3">
              <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                <UserCheck className="w-5 h-5 shrink-0" />
                <span>{isFa ? 'تایید ۲ شناسه تحویل دارو (2-Identifier Check)' : 'Handout Verification (2 Identifiers)'}</span>
              </div>
              <button
                onClick={() => setIsHandoutOpen(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {isFa
                ? 'به منظور جلوگیری از خطای تحویل داروی اشتباه، داروساز موظف است قبل از تحویل نهایی حداقل ۲ شناسه بیمار را با نسخه و بسته مطابقت دهد.'
                : 'Pharmacists must confirm at least 2 patient identifiers before completing handout to prevent wrong-patient dispensing.'}
            </p>

            <div className="space-y-3 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-black/40 border border-slate-700 cursor-pointer hover:border-teal-500">
                <input
                  type="checkbox"
                  checked={verifiedName}
                  onChange={(e) => setVerifiedName(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="font-bold text-slate-200">
                  {isFa ? `تایید نام و نام خانوادگی کامل: (${scenario.patientName})` : `Confirm Full Patient Name: (${scenario.patientName})`}
                </span>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-black/40 border border-slate-700 cursor-pointer hover:border-teal-500">
                <input
                  type="checkbox"
                  checked={verifiedDob}
                  onChange={(e) => setVerifiedDob(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <span className="font-bold text-slate-200">
                  {isFa ? `تایید تاریخ تولد یا آدرس: (${scenario.patientDob})` : `Confirm Date of Birth / Address: (${scenario.patientDob})`}
                </span>
              </label>

              <button
                onClick={handleFinalHandoutConfirm}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-teal-600/30"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isFa ? 'تکمیل دیسپنس و تحویل نهایی دارو' : 'Complete Supply & Handout'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success / Error Outcome Alert */}
      {dispenseSuccess === true && (
        <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-emerald-300">{isFa ? 'تکمیل دیسپنس با موفقیت انجام شد!' : 'Dispense Completed Successfully!'}</p>
              <p>{isFa ? 'تمامی الزامات قانونی، کد PBS، شورت‌کات و ۲ شناسه هویت بیمار تایید گردیدند.' : 'PBS code, shortcuts, and 2-identifier patient verification completed.'}</p>
            </div>
          </div>
        </div>
      )}

      {dispenseSuccess === false && (
        <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="font-bold text-rose-300">{isFa ? 'خطای قانونی: عدم امکان تحویل نسخه!' : 'Legal Expiry Violation Notice!'}</p>
              <p>{dispenseError || (isFa ? 'این نسخه مربوط به داروی S8 است که بیش از ۶ ماه از تاریخ نگارش آن گذشته و اعتبار قانونی تحویل ندارد.' : 'This S8 prescription is over 6 months old and is legally void for supply.')}</p>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT STOP VERIFICATION MODAL */}
      <ProjectStopModal
        isOpen={isProjectStopOpen}
        activeProduct={null}
        language={language}
        patientName={psPatientName}
        setPatientName={setPsPatientName}
        idType={psIdType}
        setIdType={setPsIdType}
        patientId={psPatientId}
        setPatientId={setPsPatientId}
        counselingCompleted={psCounselingCompleted}
        setCounselingCompleted={setPsCounselingCompleted}
        isApproved={psIsApproved}
        approvalCode={psApprovalCode}
        onVerify={handleVerifyProjectStop}
        onClose={() => setIsProjectStopOpen(false)}
      />

      {/* SAFESCRIPT RTPM SIMULATOR MODAL */}
      <SafeScriptAlertModal
        isOpen={isSafeScriptModalOpen}
        onClose={() => setIsSafeScriptModalOpen(false)}
        drugDetails={safeScriptDetails}
        language={language}
        onConfirmDispense={() => {
          if (scenario.isExpiredS8) {
            setDispenseSuccess(false);
            setDispenseError(
              isFa
                ? 'این نسخه مربوط به داروی S8 است که بیش از ۶ ماه از تاریخ نگارش آن گذشته و اعتبار قانونی تحویل در استرالیا ندارد.'
                : 'This S8 prescription is over 6 months old and is legally void for supply under Australian scheduling rules.'
            );
          } else {
            setIsFinalCheckModalOpen(true);
          }
        }}
      />
    </div>
  );
};
