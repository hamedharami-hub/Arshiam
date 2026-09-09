'use client';

import React, { useState, useEffect } from 'react';
import { PharmacyCard, FlagColor, Language, CustomCardEdit, ChatMessage } from '@/types/pharmacy';
import { getClientAiConfig } from '@/lib/aiConfigStorage';
import { getAiRequestHeaders } from '@/lib/aiClient';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { useStudyTrackerContext } from './study/StudyTrackerContext';
import { StudyStatusBadge } from './study/StudyStatusBadge';
import {
  Lightbulb,
  Flag,
  Edit2,
  Trash2,
  Table as TableIcon,
  Image as ImageIcon,
  Bot,
  CheckCircle,
  Zap,
  Send,
  Loader2,
  BookmarkCheck,
  BookmarkPlus,
  Sparkles,
  User,
  X,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  FileText,
  Copy,
  Check,
} from 'lucide-react';

interface StudyCardProps {
  item: PharmacyCard;
  language: Language;
  flag: FlagColor;
  customEdit?: CustomCardEdit;
  isReviewed: boolean;
  savedNotes?: string[];
  onToggleReview: (id: string) => void;
  onSetFlag: (id: string, color?: FlagColor) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveNote?: (cardId: string, noteText: string) => void;
  onDeleteNote?: (cardId: string, noteIndex: number) => void;
  layoutMode?: 'window-grid' | 'list' | 'split';
  onOpenAiLeitner?: (text: string, module: 1 | 2 | 4, category?: string, topic?: string) => void;
}

export const StudyCard: React.FC<StudyCardProps> = ({
  item,
  language,
  flag,
  customEdit,
  isReviewed,
  savedNotes = [],
  onToggleReview,
  onSetFlag,
  onEdit,
  onDelete,
  onSaveNote,
  onDeleteNote,
  onOpenAiLeitner,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const [showFlagPicker, setShowFlagPicker] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [savedFeedbackIndex, setSavedFeedbackIndex] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const isFa = language === 'fa';

  const { markItemViewed, toggleItemCompleted, isViewed, isCompleted } = useStudyTrackerContext();
  const viewed = isViewed(item.id);
  const completed = isCompleted(item.id) || isReviewed;

  const title = customEdit?.title || item.title[language];
  const pearl = customEdit?.pearl || item.actionPearl[language];
  const details = customEdit?.summary || item.detailsHtml[language];

  // When user expands the card, automatically register as viewed in Module 4
  useEffect(() => {
    if (isOpen) {
      markItemViewed(
        4,
        item.id,
        { fa: item.title.fa || item.title.en, en: item.title.en || item.title.fa },
        { fa: item.category.fa || item.category.en, en: item.category.en || item.category.fa },
        { moduleId: item.module }
      );
    }
  }, [isOpen, item.id, item.title, item.category, item.module, markItemViewed]);

  const getFlagBg = (col: FlagColor) => {
    switch (col) {
      case 'red':
        return 'bg-rose-500';
      case 'yellow':
        return 'bg-amber-400';
      case 'green':
        return 'bg-emerald-500';
      case 'blue':
        return 'bg-sky-400';
      default:
        return null;
    }
  };

  const handleCopyContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    const plainText = details.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const fullText = `${title}\n\n${isFa ? 'نکته کلیدی:' : 'Key Pearl:'} ${pearl}\n\n${isFa ? 'شرح:' : 'Details:'} ${plainText}`;
    navigator.clipboard.writeText(fullText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSendAiQuery = async (queryText?: string) => {
    const textToSend = queryText || aiInput;
    if (!textToSend.trim() || isAiLoading) return;

    const generateUniqueId = (prefix: string) => `${prefix}-${Math.random().toString(36).substring(2, 9)}`;

    const userMsg: ChatMessage = {
      id: generateUniqueId('u'),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!queryText) setAiInput('');
    setIsAiLoading(true);

    const detailsPlainText = details.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    try {
      const aiCfg = getClientAiConfig();
      const activeModel = aiCfg.tutorModel || 'gemini-3.7-flash';
      const activeProvider =
        activeModel.startsWith('llama') ||
        activeModel.startsWith('deepseek') ||
        activeModel.startsWith('qwen') ||
        activeModel.startsWith('mixtral')
          ? 'groq'
          : (aiCfg.preferredProvider || 'gemini');
      const customKey = activeProvider === 'groq' ? aiCfg.groqApiKey : aiCfg.geminiApiKey;

      const res = await fetch('/api/gemini/tutor', {
        method: 'POST',
        headers: await getAiRequestHeaders(),
        body: JSON.stringify({
          prompt: textToSend,
          language,
          provider: activeProvider,
          model: activeModel,
          apiKey: customKey || undefined,
          temperature: aiCfg.temperature ?? 0.3,
          cardContext: isFa
            ? `عنوان سرفصل: ${title}\nنکته کلیدی: ${pearl}\nجزئیات و متن: ${detailsPlainText}`
            : `Topic: ${title}\nKey Pearl: ${pearl}\nDetails: ${detailsPlainText}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate response');

      const aiMsg: ChatMessage = {
        id: generateUniqueId('ai'),
        sender: 'ai',
        text: data.text || (isFa ? 'پاسخی دریافت نشد.' : 'No response received.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: generateUniqueId('err'),
        sender: 'ai',
        text: isFa ? `خطا در دریافت پاسخ: ${err.message}` : `Error: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveNoteToCard = (msgText: string, msgId: string) => {
    if (onSaveNote) {
      onSaveNote(item.id, msgText);
      setSavedFeedbackIndex(msgId);
      setTimeout(() => setSavedFeedbackIndex(null), 2000);
    }
  };

  const cardQuickPrompts = isFa
    ? [
        `این سرفصل (${title}) را به زبان ساده‌تر توضیح بده`,
        `نکات کلیدی برای مشاوره بیمار از این مطلب چیست؟`,
        `۲ سوال تمرینی چهارگزینه‌ای همراه با پاسخ از این مبحث طراحی کن`,
      ]
    : [
        `Explain ${title} in plain clinical terms`,
        `What are key exam and counseling points for this topic?`,
        `Generate 2 practice questions based on this content`,
      ];

  const handleSelectFlag = (col: FlagColor) => {
    onSetFlag(item.id, col);
    setShowFlagPicker(false);
  };

  return (
    <div
      className={`app-card border rounded-2xl overflow-hidden transition-all duration-300 shadow-md hover:shadow-xl ${
        isReviewed ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : 'app-border'
      }`}
    >
      {/* Modern Unified Card Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="p-3.5 sm:p-4 flex flex-col gap-2.5 cursor-pointer app-card-hover select-none transition-colors"
      >
        {/* Top Meta Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-[9.5px] font-bold px-2 py-0.5 rounded-lg truncate ${
                ({
                  sky: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
                  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                  teal: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
                  rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
                  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
                  emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                  indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
                } as Record<string, string>)[item.categoryColor] || 'bg-slate-500/15 text-slate-400 border-slate-500/30'
              } border`}
            >
              {item.category[language]}
            </span>

            <span className="text-[10px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-900/60 border border-slate-800">
              {item.id}
            </span>

            {flag && <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getFlagBg(flag)}`} />}

            {savedNotes.length > 0 && (
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold flex items-center gap-1 border border-purple-500/30">
                <BookmarkCheck className="w-3 h-3 text-purple-400" />
                {savedNotes.length} {isFa ? 'نکته AI' : 'notes'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StudyStatusBadge
              language={language}
              viewed={viewed}
              completed={completed}
              size="sm"
              onToggleComplete={(e) => {
                e.stopPropagation();
                toggleItemCompleted(
                  4,
                  item.id,
                  { fa: item.title.fa || item.title.en, en: item.title.en || item.title.fa },
                  { fa: item.category.fa || item.category.en, en: item.category.en || item.category.fa }
                );
                onToggleReview(item.id);
              }}
            />

            <button
              type="button"
              onClick={handleCopyContent}
              className="p-1 hover:text-white transition rounded hover:bg-slate-800 text-slate-400"
              title={isFa ? 'کپی متن سرفصل' : 'Copy Content'}
              aria-label={isFa ? 'کپی متن' : 'Copy'}
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <div className="text-slate-400">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        </div>

        {/* Title & Action Pearl Summary */}
        <div className="space-y-1">
          <h3 className="text-xs sm:text-sm font-bold app-text leading-snug break-words">
            {title}
          </h3>
          {!isOpen && (
            <p className="text-[11px] app-muted flex items-start gap-1.5 leading-relaxed">
              <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{pearl}</span>
            </p>
          )}
        </div>
      </div>

      {/* 3. Expanded Window Card Details & Tabs */}
      {isOpen && (
        <div className="border-t app-border p-3.5 bg-black/10 space-y-4 animate-fadeIn">
          {/* Key Action Pearl Box */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-medium flex items-start gap-2.5 shadow-inner">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="block text-amber-400 mb-0.5">
                {isFa ? 'نکته کلیدی اجرایی (Action Pearl):' : 'Key Action Pearl:'}
              </strong>
              {pearl}
            </div>
          </div>

          {/* HTML Details Content */}
          <div
            className="app-text leading-relaxed text-xs space-y-2 overflow-x-auto pt-1"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(details) }}
          />

          {/* Window Footer Toolbar */}
          <div className="pt-3 border-t border-dashed app-border relative flex items-center justify-between gap-2 flex-wrap text-xs">
            {/* Left Info Badge */}
            <span className="text-[10px] app-muted font-mono flex items-center gap-1">
              <span>{isFa ? 'کد ماژول:' : 'Module:'} {item.module}</span>
            </span>

            {/* Right Action Controls */}
            <div className="flex items-center gap-2">
              {/* AI Leitner Spaced Repetition Card Maker */}
              {onOpenAiLeitner && (
                <button
                  onClick={() => {
                    const titleText = typeof item.title === 'object' && item.title
                      ? (isFa ? (item.title.fa || item.title.en) : (item.title.en || item.title.fa))
                      : String(item.title || '');
                    const categoryText = typeof item.category === 'object' && item.category
                      ? (isFa ? (item.category.fa || item.category.en) : (item.category.en || item.category.fa))
                      : String(item.category || '');
                    const pearlText = typeof item.actionPearl === 'object' && item.actionPearl
                      ? (isFa ? (item.actionPearl.fa || item.actionPearl.en) : (item.actionPearl.en || item.actionPearl.fa))
                      : String(item.actionPearl || '');
                    const detailsText = typeof item.detailsHtml === 'object' && item.detailsHtml
                      ? (isFa ? (item.detailsHtml.fa || item.detailsHtml.en) : (item.detailsHtml.en || item.detailsHtml.fa))
                      : String(item.detailsHtml || '');

                    const cardSnippet = `Topic: ${titleText}\nCategory: ${categoryText}\nAction Pearl: ${pearlText}\nClinical Details:\n${detailsText}`;
                    onOpenAiLeitner(
                      cardSnippet,
                      4,
                      categoryText || 'Clinical Bank',
                      titleText || 'Clinical Topic'
                    );
                  }}
                  className="p-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/35 border border-purple-500/40 text-purple-300 hover:text-white transition flex items-center justify-center gap-1 cursor-pointer"
                  title={isFa ? '✨ ساخت کارت لایتنر هوشمند با هوش مصنوعی' : '✨ Generate AI Leitner Card'}
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                </button>
              )}

              {/* Add Image & Table Button */}
              <button
                onClick={() => onEdit(item.id)}
                className="p-2 rounded-xl bg-black/20 border app-border app-muted hover:text-emerald-400 hover:bg-black/40 transition flex items-center justify-center gap-1 cursor-pointer"
                title={isFa ? 'افزودن عکس و جدول' : 'Add Image & Table'}
              >
                <TableIcon className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>

          {/* Saved AI Notes Section */}
          {savedNotes.length > 0 && (
            <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-300">
                <span className="flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  {isFa ? 'نکات و تحلیل‌های ذخیره‌شده هوش مصنوعی در این سرفصل:' : 'Saved AI Notes for this Topic:'}
                </span>
                <span className="text-[10px] font-mono opacity-80 px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300">
                  {savedNotes.length} {isFa ? 'مورد' : 'notes'}
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {savedNotes.map((noteText, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-black/30 border app-border text-xs leading-relaxed app-text flex items-start justify-between gap-2.5"
                  >
                    <div className="whitespace-pre-wrap flex-1 leading-normal">{noteText}</div>
                    {onDeleteNote && (
                      <button
                        onClick={() => onDeleteNote(item.id, idx)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                        title={isFa ? 'حذف این نکته' : 'Delete note'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Embedded AI Chat Box */}
          {showAiChat && (
            <div className="p-3.5 rounded-2xl app-card border border-purple-500/30 space-y-3 animate-fadeIn shadow-2xl">
              {/* Quick Prompts for this card */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold app-muted flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  {isFa ? 'سوالات پیشنهادی برای این سرفصل:' : 'Suggested questions:'}
                </span>
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1 no-scrollbar">
                  {cardQuickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendAiQuery(qp)}
                      disabled={isAiLoading}
                      className="px-2.5 py-1 rounded-xl border app-border bg-black/30 app-text hover:border-purple-500 hover:text-purple-700 dark:hover:text-purple-300 whitespace-nowrap transition text-[11px]"
                    >
                      {qp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat History Messages */}
              {chatMessages.length > 0 && (
                <div className="space-y-2.5 max-h-72 overflow-y-auto p-2.5 bg-black/20 rounded-xl border app-border">
                  {chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'ai' && (
                        <div className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-3 h-3" />
                        </div>
                      )}

                      <div
                        className={`max-w-[88%] rounded-xl p-2.5 text-xs leading-relaxed ${
                          msg.sender === 'user'
                            ? 'bg-sky-600 text-white font-medium rounded-se-none'
                            : 'bg-black/30 border app-border app-text rounded-ss-none space-y-2'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.text}</div>

                        {msg.sender === 'ai' && (
                          <div className="pt-2 border-t border-dashed app-border flex items-center justify-between gap-2 text-[10px]">
                            <span className="opacity-60 font-mono">{msg.timestamp}</span>

                            <button
                              onClick={() => handleSaveNoteToCard(msg.text, msg.id)}
                              className={`px-2 py-1 rounded-lg transition flex items-center gap-1 font-bold ${
                                savedFeedbackIndex === msg.id
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-purple-600 hover:bg-purple-500 text-white'
                              }`}
                            >
                              {savedFeedbackIndex === msg.id ? (
                                <>
                                  <CheckCircle className="w-3 h-3" />
                                  <span>{isFa ? 'ذخیره شد' : 'Saved!'}</span>
                                </>
                              ) : (
                                <>
                                  <BookmarkPlus className="w-3 h-3" />
                                  <span>{isFa ? 'ذخیره در این سرفصل' : 'Save Note to Card'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {msg.sender === 'user' && (
                        <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                          <User className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {isAiLoading && (
                <div className="flex items-center gap-2 text-xs text-purple-600 dark:text-purple-400 p-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isFa ? 'هوش مصنوعی در حال تحلیل متن این سرفصل است...' : 'AI is analyzing this topic...'}</span>
                </div>
              )}

              {/* Question Input Box */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendAiQuery()}
                  placeholder={
                    isFa
                      ? 'سوال خود را درباره این سرفصل بنویسید...'
                      : 'Ask any question about this card...'
                  }
                  className="flex-1 bg-black/20 border app-border rounded-xl px-3 py-2 text-xs app-text focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => handleSendAiQuery()}
                  disabled={!aiInput.trim() || isAiLoading}
                  className="px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center gap-1 shrink-0 shadow-md"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isFa ? 'ارسال' : 'Send'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
