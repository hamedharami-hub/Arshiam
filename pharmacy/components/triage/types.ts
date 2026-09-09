import React from 'react';
import { Language } from '@/types/pharmacy';
import { Scenario, ConversationMode } from '@/data/otcScenarios';

export interface OtcTriageModuleProps {
  language: Language;
  onNavigateToFred?: (scenarioId?: string) => void;
  onNavigateToModule?: (moduleNumber: 1 | 2 | 3 | 4 | 5 | 6, contextId?: string) => void;
  onOpenAiLeitner?: (text: string, module: 1 | 2 | 4, category?: string, topic?: string) => void;
}

export interface ChatMessage {
  id: string;
  sender: 'patient' | 'pharmacist' | 'system';
  textEn?: string;
  textFa?: string;
  text?: string;
  secondaryText?: string;
  badgeEn?: string;
  badgeFa?: string;
  frameworkBadge?: string;
  isRedFlagWarning?: boolean;
}

export interface StarredPhrase {
  id: string;
  textEn?: string;
  textFa?: string;
  text?: string;
  secondaryText?: string;
  sender: 'patient' | 'pharmacist' | 'system';
  scenarioId: string;
  scenarioTitle: string;
  timestamp: number;
}

export interface ConversationModeConfig {
  id: ConversationMode;
  titleFa: string;
  titleEn: string;
  shortFa: string;
  shortEn: string;
  descFa: string;
  descEn: string;
  icon: string;
  badgeColor: string;
  activeColor: string;
  inactiveColor: string;
}

export const getScenarioMode = (sc: Scenario): ConversationMode => {
  if (sc.mode) return sc.mode;
  if (sc.id.startsWith('admin-')) return 'MODE_A_ADMIN';
  if (
    sc.id === 's3-pseudoephedrine' ||
    sc.id === 'emergency-supply' ||
    sc.id.includes('conflict') ||
    sc.id === 'nsaids-triple-whammy'
  ) {
    return 'MODE_C_CONFLICT';
  }
  return 'MODE_B_SLANG';
};

export const CONVERSATION_MODES: ConversationModeConfig[] = [
  {
    id: 'MODE_A_ADMIN',
    titleFa: 'حالت ۱: مکالمات روتین و اداری داروخانه (Mode A: Daily Operational & Admin)',
    titleEn: 'Mode A: Daily Operational & Admin Queries',
    shortFa: 'مکالمات روتین و اداری',
    shortEn: 'Operational & Admin Queries',
    descFa: 'استعلام نسخ الکترونیک گم‌شده در MySL، تحویل دارو توسط اعضای خانواده، رفع ابهام فرانشیز مدیکر و سقف Safety Net، فاکتور رسمی بیمه تکمیلی و صدور گواهی استعلاجی',
    descEn: 'Lost eScript MySL Lookup, 3rd Party Family Pickup, Medicare Co-payment & Safety Net, Private Health Tax Invoices & Leave Certificates',
    icon: '📋',
    badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
    activeColor: 'bg-gradient-to-r from-amber-600 to-amber-700 text-white border-amber-400 shadow-lg shadow-amber-600/30 ring-1 ring-amber-400',
    inactiveColor: 'bg-black/30 hover:bg-amber-950/30 text-amber-200/80 border-amber-500/20 hover:border-amber-500/40',
  },
  {
    id: 'MODE_B_SLANG',
    titleFa: 'حالت ۲: تریاژ OTC و اصطلاحات عامیانه استرالیایی (Mode B: Everyday OTC & Aussie Slang)',
    titleEn: 'Mode B: Everyday OTC & Aussie Slang',
    shortFa: 'درخواست‌های عامیانه و OTC',
    shortEn: 'Everyday OTC & Aussie Slang',
    descFa: 'سرفه‌های خخلط‌دار مزمن، تب یونجه و آلرژی فصلی، تبخال، آبله‌مرغان، سوختگی باربیکیو، قطره چشم چسبنده (Chlorsig) و برفک واژینال',
    descEn: 'Productive Cough, Hayfever, Cold Sores, Chickenpox, Barbecue Burns, Sticky Eye (Chlorsig) & Vaginal Thrush',
    icon: '💬',
    badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    activeColor: 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-400 shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400',
    inactiveColor: 'bg-black/30 hover:bg-emerald-950/30 text-emerald-200/80 border-emerald-500/20 hover:border-emerald-500/40',
  },
  {
    id: 'MODE_C_CONFLICT',
    titleFa: 'حالت ۳: سناریوهای چالش‌برانگیز و تعارض (Mode C: Challenging & Conflict Scenarios)',
    titleEn: 'Mode C: Challenging & Conflict Scenarios',
    shortFa: 'مدیریت تعارض و درخواست‌های خاص',
    shortEn: 'Challenging & Conflict Scenarios',
    descFa: 'درخواست سودوافدرین و ثبت سامانه Project Stop، تحویل اضطراری داروی S4 بدون نسخه، تداخل خطرساز Triple Whammy و کنترل تعارض',
    descEn: 'Pseudoephedrine S3 Project Stop, S4 Emergency Supply, Triple Whammy NSAID Risk & Conflict De-escalation',
    icon: '⚡',
    badgeColor: 'border-purple-500/40 text-purple-300 bg-purple-500/10',
    activeColor: 'bg-gradient-to-r from-purple-600 to-pink-700 text-white border-purple-400 shadow-lg shadow-purple-600/30 ring-1 ring-purple-400',
    inactiveColor: 'bg-black/30 hover:bg-purple-950/30 text-purple-200/80 border-purple-500/20 hover:border-purple-500/40',
  },
];
