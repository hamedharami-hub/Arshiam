'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { Scenario } from '@/data/otcScenarios';
import { ChatMessage, StarredPhrase } from './types';
import {
  FileText,
  Star,
  Copy,
  Trash2,
  CheckCircle2,
  Info,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';

interface ChatFeedProps {
  language: Language;
  scenario: Scenario;
  chatMessages: ChatMessage[];
  isChatExpanded: boolean;
  setIsChatExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  starredPhrases: StarredPhrase[];
  showStarredBelow: boolean;
  setShowStarredBelow: (val: boolean) => void;
  setShowStarredModal: (val: boolean) => void;
  toggleStarMessage: (msg: ChatMessage) => void;
  isMessageStarred: (text: string) => boolean;
  removeStarredPhrase: (id: string) => void;
  onCopySinglePhrase: (id: string, textEn?: string, textFa?: string) => void;
  copiedPhraseId: string | null;
  onReset: () => void;
}

export const ChatFeed: React.FC<ChatFeedProps> = ({
  language,
  scenario,
  chatMessages,
  isChatExpanded,
  setIsChatExpanded,
  starredPhrases,
  showStarredBelow,
  setShowStarredBelow,
  setShowStarredModal,
  toggleStarMessage,
  isMessageStarred,
  removeStarredPhrase,
  onCopySinglePhrase,
  copiedPhraseId,
  onReset,
}) => {
  const isFa = language === 'fa';

  return (
    <div className="space-y-3.5">
      {/* Dialogue Header & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-1 border-b app-border">
        <div>
          <h3 className="font-bold text-xs sm:text-sm app-text">
            {isFa ? 'شبیه‌ساز تعاملی گفتگوی داروساز با بیمار' : 'Pharmacist-Patient Interactive Dialogue Simulator'}
          </h3>
          <p className="text-[11px] app-muted">
            {isFa ? 'برای ستاره‌دار کردن جملات روی آن‌ها دابل‌کلیک کنید.' : 'Double-click any message bubble to star/bookmark.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Starred Phrases Button */}
          <button
            type="button"
            onClick={() => setShowStarredModal(true)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
              starredPhrases.length > 0
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25 shadow-amber-500/10'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
            title={isFa ? 'مشاهده تمام جملات ستاره‌دار' : 'View all starred phrases'}
          >
            <Star className={`w-3.5 h-3.5 ${starredPhrases.length > 0 ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
            <span>{isFa ? 'جملات ستاره‌دار' : 'Starred'}</span>
            <span className="px-1.5 py-0.5 rounded-full font-mono text-[10px] bg-black/40 text-amber-300 font-bold border border-amber-500/30">
              {starredPhrases.length}
            </span>
          </button>

          {/* Expand / Minimize Toggle */}
          <button
            type="button"
            onClick={() => setIsChatExpanded((prev) => !prev)}
            className="p-2 rounded-xl bg-slate-900 border app-border text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
            title={isChatExpanded ? (isFa ? 'کاهش ارتفاع پنجره' : 'Collapse height') : (isFa ? 'گسترش ارتفاع پنجره' : 'Expand height')}
          >
            {isChatExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Reset Dialogue */}
          <button
            type="button"
            onClick={onReset}
            className="p-2 rounded-xl bg-slate-900 border app-border text-slate-300 hover:text-white hover:border-slate-700 transition cursor-pointer"
            title={isFa ? 'شروع مجدد این سناریو' : 'Reset scenario'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Patient Chief Presentation & Main Request */}
      <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2.5 shadow-sm">
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <FileText className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-amber-300">
              {isFa ? 'خواسته و شرح اصلی مراجعه بیمار به داروخانه' : 'Patient Chief Presentation & Request'}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-400">
            {scenario.patientProfile.name} • {scenario.patientProfile.age} {isFa ? 'ساله' : 'yo'} ({scenario.patientProfile.gender})
          </div>
        </div>

        {/* Single Presentation Box in Active Language */}
        <div
          className={`p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-slate-100 leading-relaxed ${
            isFa ? 'text-right' : 'text-left font-sans'
          }`}
          dir={isFa ? 'rtl' : 'ltr'}
        >
          <p className="font-normal text-slate-100">
            {isFa ? scenario.patientProfile.presentation.fa : scenario.patientProfile.presentation.en}
          </p>
        </div>
      </div>

      {/* Minimal Checkbox: Show Starred Questions & Answers */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer select-none hover:text-white">
            <input
              type="checkbox"
              checked={showStarredBelow}
              onChange={(e) => setShowStarredBelow(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-700 accent-amber-500 cursor-pointer"
            />
            <span>{isFa ? 'نمایش پرسش و پاسخ‌های ستاره‌دار' : 'Show starred questions and answers'}</span>
            {starredPhrases.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full font-mono text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {starredPhrases.length}
              </span>
            )}
          </label>
        </div>

        {/* Collapsible Starred Items Container */}
        {showStarredBelow && (
          <div className="p-3 rounded-2xl bg-slate-900/90 border border-amber-500/30 space-y-2.5 shadow-sm">
            {starredPhrases.length === 0 ? (
              <div className="text-center py-3 text-xs text-slate-400 space-y-1">
                <p>{isFa ? 'هنوز سوال یا پاسخی ستاره‌دار نشده است.' : 'No starred questions or answers yet.'}</p>
                <p className="text-[11px] text-slate-500">
                  {isFa ? 'از پنجره پاپ‌آپ هر سوال می‌توانید با زدن ⭐ آن را ذخیره کنید.' : 'Click ⭐ inside any question popup to bookmark it here.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {starredPhrases.map((item) => {
                  const isCopied = copiedPhraseId === item.id;
                  const itemText = isFa
                    ? (item.textFa || item.secondaryText || item.textEn || item.text || '')
                    : (item.textEn || item.text || item.textFa || item.secondaryText || '');

                  return (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl bg-black/40 border border-amber-500/20 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-white/10 pb-1">
                        <span className="font-bold text-amber-300 truncate max-w-[200px]">{item.scenarioTitle}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onCopySinglePhrase(item.id, item.textEn || item.text, item.textFa || item.secondaryText)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition"
                            title={isFa ? 'کپی' : 'Copy'}
                          >
                            {isCopied ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeStarredPhrase(item.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 cursor-pointer transition"
                            title={isFa ? 'حذف ستاره' : 'Remove star'}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div
                        className={`whitespace-pre-line text-[11.5px] leading-relaxed text-slate-100 ${
                          isFa ? 'text-right' : 'text-left font-sans'
                        }`}
                        dir={isFa ? 'rtl' : 'ltr'}
                      >
                        {itemText}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spacious Dialogue Message Feed Container */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>{isFa ? 'جریان زنده مکالمه با بیمار (دابل‌کلیک روی هر پیام برای ذخیره ⭐)' : 'Live conversation flow (Double-click any message to Star ⭐)'}</span>
          </span>
          <span className="text-[10px] font-mono opacity-75">
            {chatMessages.length} {isFa ? 'پیام تبادل‌شده' : 'messages'}
          </span>
        </div>

        <div
          className={`overflow-y-auto space-y-3.5 p-3 rounded-2xl bg-slate-900/60 border app-border custom-scrollbar transition-all duration-300 ${
            isChatExpanded ? 'min-h-[580px] max-h-[750px]' : 'min-h-[440px] max-h-[560px]'
          }`}
        >
          {chatMessages.map((msg) => {
            if (msg.sender === 'system') {
              const text = isFa
                ? (msg.textFa || msg.secondaryText || msg.text || '')
                : (msg.textEn || msg.text || '');
              return (
                <div
                  key={msg.id}
                  className={`p-3 rounded-xl text-xs text-center border font-medium ${
                    msg.isRedFlagWarning
                      ? 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                      : 'bg-slate-950/70 border-slate-800 text-slate-300'
                  }`}
                >
                  <p className="font-semibold">{text}</p>
                </div>
              );
            }

            const isPharmacist = msg.sender === 'pharmacist';
            const msgText = isFa
              ? (msg.textFa || msg.secondaryText || msg.text || '')
              : (msg.textEn || msg.text || msg.textFa || '');
            const badge = isFa
              ? (msg.badgeFa || msg.frameworkBadge)
              : (msg.badgeEn || msg.frameworkBadge);
            const isStarred = isMessageStarred(msgText);

            return (
              <div
                key={msg.id}
                onDoubleClick={() => toggleStarMessage(msg)}
                className={`group flex items-start gap-2.5 transition select-none cursor-pointer ${
                  isPharmacist ? 'flex-row-reverse' : 'flex-row'
                }`}
                title={isFa ? 'دابل‌کلیک برای ستاره‌دار کردن این جمله' : 'Double-click to star this sentence'}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold shadow-md ${
                    isPharmacist
                      ? 'bg-sky-600 text-white ring-2 ring-sky-400/30'
                      : 'bg-amber-600 text-white ring-2 ring-amber-400/30'
                  }`}
                >
                  {isPharmacist ? 'Rx' : 'Pt'}
                </div>

                {/* Single Clean Compact Bubble */}
                <div
                  className={`max-w-[88%] sm:max-w-[82%] p-3 rounded-2xl text-xs space-y-1.5 shadow-md transition ${
                    isPharmacist
                      ? 'bg-sky-950/80 border border-sky-500/50 text-sky-100 rounded-tl-none'
                      : 'bg-slate-900 border border-slate-700 text-slate-100 rounded-tr-none'
                  } ${
                    isStarred ? 'ring-2 ring-amber-400/90 shadow-amber-500/10' : ''
                  }`}
                >
                  {/* Bubble Header */}
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono border-b border-white/10 pb-1">
                    <span className="font-bold flex items-center gap-1.5">
                      <span className={isPharmacist ? 'text-sky-300' : 'text-amber-300'}>
                        {isPharmacist
                          ? isFa ? 'داروساز (Rx)' : 'Pharmacist (Rx)'
                          : `${scenario.patientProfile.name} (Pt)`}
                      </span>
                      {badge && (
                        <span className="px-1.5 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10">
                          {badge}
                        </span>
                      )}
                    </span>

                    {/* Star Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStarMessage(msg);
                      }}
                      className={`p-1 rounded-lg transition shrink-0 cursor-pointer ${
                        isStarred
                          ? 'text-amber-400 bg-amber-500/20 border border-amber-500/40'
                          : 'text-slate-400 hover:text-amber-300 hover:bg-white/10 opacity-70 group-hover:opacity-100'
                      }`}
                      title={isStarred ? (isFa ? 'حذف از برگزیده‌ها' : 'Remove star') : (isFa ? 'ستاره‌دار کردن این جمله' : 'Star this phrase')}
                    >
                      <Star className={`w-3.5 h-3.5 ${isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                  </div>

                  {/* Single-Language Dialogue Text with enhanced line-height and conversational typography */}
                  <div
                    className={`text-xs sm:text-[13.5px] !leading-[1.75] text-slate-100 font-medium ${
                      isFa ? 'text-right' : 'text-left font-sans'
                    }`}
                    dir={isFa ? 'rtl' : 'ltr'}
                  >
                    {msgText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
