'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { i18n, t } from '@/lib/i18n';
import {
  Keyboard,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Repeat,
  ShieldCheck,
  QrCode,
  Hospital,
  Tag,
  Share2,
  FileSpreadsheet,
  ToggleLeft,
  ToggleRight,
  Info,
  CornerDownLeft,
} from 'lucide-react';

export interface FredShortcutState {
  commandInput: string;
  repeatMode: 'standard' | 'outside' | 'deferred' | 'reg24';
  repeatAuthorized: number;
  repeatPreviouslyDispensed: number;
  isChartMode: boolean;
  isMySlExcluded: boolean;
  brandPreference: 'GS' | 'GB';
  myHrConsent: boolean;
  isOwing: boolean;
  isOwingReconciled: boolean;
}

interface FredShortcutCheatSheetProps {
  language: Language;
  state: FredShortcutState;
  onApplyCommand: (command: string) => void;
  onToggleHotKey: (keyType: 'chartMode' | 'mysl' | 'brand' | 'myhr' | 'owing' | 'reconcile') => void;
}

export const FredShortcutCheatSheet: React.FC<FredShortcutCheatSheetProps> = ({
  language,
  state,
  onApplyCommand,
  onToggleHotKey,
}) => {
  const isFa = language === 'fa';

  const shortcuts = [
    {
      category: isFa ? 'میانبرهای تکرار نسخه (Repeat Shortcuts)' : 'Repeat Command Shortcuts',
      icon: Repeat,
      color: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      items: [
        {
          syntax: '5 or 5/1',
          titleFa: 'دیسپنس استاندارد اول (Standard 1st Supply)',
          titleEn: 'Standard 1st Supply + 5 Repeats',
          descFa: '۵ بار تکرار مجاز + ۱ نوبت تحویل در تاریخ جاری',
          descEn: '5 repeats authorized, dispensing 1st supply today',
          action: () => onApplyCommand('5/1'),
          active: state.repeatMode === 'standard',
        },
        {
          syntax: '5/3',
          titleFa: 'نسخه تکرار خارجی (Outside Repeat)',
          titleEn: 'Outside Repeat (5 Auth, 3 Dispensed)',
          descFa: '۵ تکرار مجاز، ۳ نوبت قبلاً در داروخانه دیگری تحویل شده (۲ تکرار باقی‌مانده)',
          descEn: '5 authorized, 3 previously dispensed elsewhere (2 repeats remaining)',
          action: () => onApplyCommand('5/3'),
          active: state.repeatMode === 'outside',
        },
        {
          syntax: '5D or D5',
          titleFa: 'به تعویق انداختن نسخه (Defer Script)',
          titleEn: 'Defer Script (No Drug Supply Today)',
          descFa: 'صدور کوپن/فرمت تکرار مجدد بدون تحویل فیزیکی دارو در امروز',
          descEn: 'Issues repeat form/token without dispensing physical medication today',
          action: () => onApplyCommand('5D'),
          active: state.repeatMode === 'deferred',
        },
        {
          syntax: '5R or R5',
          titleFa: 'قانون Reg 24 (Regulation 24 Supply All)',
          titleEn: 'Regulation 24 (Supply All 6 Months)',
          descFa: 'تحویل یکجای تمامی ۵ تکرار (۶ ماه دارویی) برای بیماران مناطق دوردست یا مسافر و ثبت کامل در Safety Net',
          descEn: 'Dispense all repeats at once for remote/traveling patients + credit total to Safety Net',
          action: () => onApplyCommand('5R'),
          active: state.repeatMode === 'reg24',
        },
      ],
    },
    {
      category: isFa ? 'نسخه‌های بدهکار و تسویه (Owing & Reconciliation)' : 'Owing Script & Reconciliation Syntax',
      icon: Clock,
      color: 'text-rose-400',
      borderColor: 'border-rose-500/30',
      items: [
        {
          syntax: 'Owing',
          titleFa: 'ثبت نسخه بدهکار (Trigger Owing Workflow)',
          titleEn: 'Issue Owing Notice',
          descFa: 'تحویل اضطراری دارو بدون برگه نسخه + چاپ برگه رسمی برچسب بدهکار (Owing Notice)',
          descEn: 'Dispense emergency supply without paper script + print Owing Notice',
          action: () => onApplyCommand('Owing'),
          active: state.isOwing && !state.isOwingReconciled,
        },
        {
          syntax: 'Mark Off',
          titleFa: 'تسویه نسخه بدهکار / اسکن eRx',
          titleEn: 'Mark Off Owing / eRx Scan',
          descFa: 'شبیه‌سازی اسکن بارکد eScript اصلی جهت تسویه برگه بدهکار از صف سیستم',
          descEn: 'Simulate scanning eRx barcode to mark off owing script from Queue',
          action: () => onApplyCommand('Mark Off'),
          active: state.isOwingReconciled,
        },
      ],
    },
    {
      category: isFa ? 'کلیدهای میانبر سریع سیستم (Special Shortcuts)' : 'Special Command Hotkeys',
      icon: Keyboard,
      color: 'text-purple-400',
      borderColor: 'border-purple-500/30',
      items: [
        {
          syntax: 'Ctrl + Shift + C',
          titleFa: 'حالت چارت دارویی (Medication Chart Mode)',
          titleEn: 'Toggle Hospital/RACF Medication Chart',
          descFa: 'تغییر بنر بیمار به بنر بنفش بیمارستانی و تنظیم اتوماتیک تکرار روی ۰',
          descEn: 'Patient banner turns purple, repeats auto-reset to 0',
          action: () => onToggleHotKey('chartMode'),
          active: state.isChartMode,
        },
        {
          syntax: 'Ctrl + Shift + X',
          titleFa: 'استثنا/شامل در لیست فعال بیمار (MySL Toggle)',
          titleEn: 'MySL (Active Script List) Exclude/Include',
          descFa: 'مخفی‌سازی یا اشتراک‌گذاری این نسخه در لیست فعال نسخه بیمار (MySL)',
          descEn: 'Exclude or include medication from Patient\'s MySL profile',
          action: () => onToggleHotKey('mysl'),
          active: state.isMySlExcluded,
        },
        {
          syntax: 'F11 / GS / GB',
          titleFa: 'تنظیم اولویت چاپ لیبل (Brand Preference Toggle)',
          titleEn: 'Brand Selection Preference (GS vs GB)',
          descFa: 'سوئیچ بین اولویت چاپ اسم ژنریک اول (GS) یا اسم برند اول (GB) روی برچسب',
          descEn: 'Switch label printing between Generic First (GS) and Brand First (GB)',
          action: () => onToggleHotKey('brand'),
          active: state.brandPreference === 'GB',
        },
        {
          syntax: 'Alt + E',
          titleFa: 'تغییر وضعیت رضایت‌نامه پرونده سلامت (MyHR Consent)',
          titleEn: 'Toggle My Health Record Upload Consent',
          descFa: 'تغییر وضعیت ارسال اطلاعات نسخه به سامانه پرونده الکترونیک سلامت کشوری',
          descEn: 'Toggle consent status for uploading script data to My Health Record',
          action: () => onToggleHotKey('myhr'),
          active: state.myHrConsent,
        },
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {/* Cheat Sheet Header */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-teal-500/30 text-white shadow-lg space-y-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-teal-400" />
            <h3 className="font-bold text-sm text-teal-200">
              {isFa ? 'راهنما و تست‌کننده فرمان‌های حرفه‌ای Fred Dispense Syntax' : 'Fred Command Syntax Cheat Sheet & Tester'}
            </h3>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
            Real-world Fred Syntax
          </span>
        </div>

        <p className="text-xs text-slate-400">
          {isFa
            ? 'روی هر یک از فرمان‌های زیر کلیک کنید تا دستور در خط فرمان Fred وارد و اثر آن بررسی شود:'
            : 'Click any shortcut below to test command execution and inspect active status changes:'}
        </p>

        {/* Current Dynamic State Indicators Bar */}
        <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">{t(i18n.fred.repeatMode, language)}</span>
            <strong className="text-amber-300 font-bold uppercase">{state.repeatMode} ({state.repeatAuthorized}/{state.repeatPreviouslyDispensed})</strong>
          </div>

          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">{t(i18n.fred.chartMode, language)}</span>
            <strong className={state.isChartMode ? 'text-purple-400 font-bold' : 'text-slate-500'}>
              {state.isChartMode ? t(i18n.fred.activeRacf, language) : t(i18n.fred.normal, language)}
            </strong>
          </div>

          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">{t(i18n.fred.brandPrint, language)}</span>
            <strong className="text-emerald-400 font-bold">{state.brandPreference === 'GS' ? t(i18n.fred.genericGs, language) : t(i18n.fred.brandGb, language)}</strong>
          </div>

          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-slate-400">{t(i18n.fred.myHrConsent, language)}</span>
            <strong className={state.myHrConsent ? 'text-teal-400 font-bold' : 'text-rose-400'}>
              {state.myHrConsent ? t(i18n.fred.consented, language) : t(i18n.fred.optOut, language)}
            </strong>
          </div>
        </div>
      </div>

      {/* Shortcut Groups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {shortcuts.map((group, idx) => {
          const Icon = group.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl bg-slate-950 border ${group.borderColor} space-y-3 shadow-md flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                  <Icon className={`w-4 h-4 ${group.color}`} />
                  <span className="font-bold text-xs text-white">{group.category}</span>
                </div>

                <div className="space-y-2.5">
                  {group.items.map((item, i) => (
                    <div
                      key={i}
                      onClick={item.action}
                      className={`p-2.5 rounded-xl border transition cursor-pointer text-xs space-y-1 ${
                        item.active
                          ? 'bg-teal-950/80 border-teal-500 text-white shadow-sm ring-1 ring-teal-500/50'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded bg-black/60 font-mono text-[11px] font-bold text-teal-300 border border-slate-700 flex items-center gap-1">
                          <code>{item.syntax}</code>
                          <CornerDownLeft className="w-3 h-3 text-slate-500" />
                        </span>
                        {item.active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                            {t(i18n.common.active, language)}
                          </span>
                        )}
                      </div>

                      <p className="font-bold text-white text-[11px] pt-1">
                        {isFa ? item.titleFa : item.titleEn}
                      </p>
                      <p className="text-[10px] text-slate-400 leading-snug">
                        {isFa ? item.descFa : item.descEn}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
