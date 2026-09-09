'use client';

import React, { useState, useEffect } from 'react';
import { PharmacyCard, Language } from '@/types/pharmacy';
import { RotateCw, ChevronLeft, ChevronRight, Zap, CheckCircle2, Shuffle, Bot } from 'lucide-react';
import { useStudyTrackerContext } from './study/StudyTrackerContext';
import { StudyStatusBadge } from './study/StudyStatusBadge';
import { formatBidiText } from '@/lib/bidiFormatter';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

interface FlashcardViewProps {
  cards: PharmacyCard[];
  language: Language;
  onToggleReview: (id: string) => void;
  reviewedCards: Record<string, boolean>;
  onAskAi: (prompt: string) => void;
}

export const FlashcardView: React.FC<FlashcardViewProps> = ({
  cards,
  language,
  onToggleReview,
  reviewedCards,
  onAskAi,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const isFa = language === 'fa';
  const { markItemViewed, toggleItemCompleted, isViewed, isCompleted } = useStudyTrackerContext();

  const currentCard = cards && cards.length > 0 ? (cards[currentIndex] || cards[0]) : null;
  const isMastered = currentCard ? (!!reviewedCards[currentCard.id] || isCompleted(currentCard.id)) : false;

  // Automatically record viewed progress when current flashcard changes
  useEffect(() => {
    if (!currentCard) return;
    markItemViewed(
      4,
      currentCard.id,
      {
        fa: currentCard.title?.fa || currentCard.title?.en || 'کارت داروسازی',
        en: currentCard.title?.en || currentCard.title?.fa || 'Pharmacy Card',
      },
      {
        fa: typeof currentCard.category === 'object' ? (currentCard.category?.fa || currentCard.category?.en || 'ماژول ۴') : String(currentCard.category || 'ماژول ۴'),
        en: typeof currentCard.category === 'object' ? (currentCard.category?.en || currentCard.category?.fa || 'Module 4') : String(currentCard.category || 'Module 4'),
      },
      {
        tabId: 'flashcards',
        moduleId: currentCard.module,
      }
    );
  }, [currentCard, markItemViewed]);

  if (!cards || cards.length === 0 || !currentCard) {
    return (
      <div className="p-8 text-center app-card border app-border rounded-2xl app-muted">
        <p>{isFa ? 'هیچ کارت مروری یافت نشد.' : 'No flashcards available.'}</p>
      </div>
    );
  }

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const randomIndex = Math.floor(Math.random() * cards.length);
    setCurrentIndex(randomIndex);
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between text-xs app-muted px-1">
        <span>
          {isFa ? 'کارت شماره' : 'Card'} {currentIndex + 1} {isFa ? 'از' : 'of'} {cards.length}
        </span>

        <button
          onClick={handleShuffle}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg app-bg border app-border hover:app-text transition"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>{isFa ? 'کارت تصادفی' : 'Shuffle'}</span>
        </button>
      </div>

      {/* Flip Card Container */}
      <div
        onClick={() => setIsFlipped(!isFlipped)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFlipped(!isFlipped); } }}
        className="cursor-pointer perspective-1000 min-h-[260px] sm:min-h-[300px] flex flex-col justify-between app-card border app-border rounded-3xl p-5 sm:p-6 shadow-xl relative transition-all duration-300 hover:border-sky-500/50"
      >
        {!isFlipped ? (
          /* FRONT SIDE */
          <div className="flex flex-col justify-between h-full space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {typeof currentCard.category === 'object' && currentCard.category
                  ? (isFa ? (currentCard.category.fa || currentCard.category.en) : (currentCard.category.en || currentCard.category.fa))
                  : String(currentCard.category || '')}
              </span>
              <div className="flex items-center gap-2">
                <StudyStatusBadge
                  language={language}
                  viewed={isViewed(currentCard.id)}
                  completed={isCompleted(currentCard.id)}
                  size="sm"
                  onToggleComplete={(e) => {
                    e.stopPropagation();
                    toggleItemCompleted(
                      4,
                      currentCard.id,
                      {
                        fa: currentCard.title?.fa || currentCard.title?.en || 'کارت داروسازی',
                        en: currentCard.title?.en || currentCard.title?.fa || 'Pharmacy Card',
                      },
                      {
                        fa: typeof currentCard.category === 'object' ? (currentCard.category?.fa || currentCard.category?.en || 'ماژول ۴') : String(currentCard.category || 'ماژول ۴'),
                        en: typeof currentCard.category === 'object' ? (currentCard.category?.en || currentCard.category?.fa || 'Module 4') : String(currentCard.category || 'Module 4'),
                      }
                    );
                    onToggleReview(currentCard.id);
                  }}
                />
                <span className="text-[10px] app-muted flex items-center gap-1">
                  <RotateCw className="w-3 h-3" />
                  {isFa ? 'برای مشاهده پاسخ کلیک کنید' : 'Click to flip'}
                </span>
              </div>
            </div>

            <div className="my-auto text-center space-y-3">
              <h3 className="text-base sm:text-lg font-bold app-text leading-snug [unicode-bidi:isolate]" dir={isFa ? 'rtl' : 'ltr'}>
                {formatBidiText(
                  typeof currentCard.title === 'object' && currentCard.title
                    ? (isFa ? (currentCard.title.fa || currentCard.title.en) : (currentCard.title.en || currentCard.title.fa))
                    : String(currentCard.title || ''),
                  isFa
                )}
              </h3>
              <p className="text-xs app-muted">
                {isFa
                  ? 'این موضوع شامل چه قوانین، نکات کلیدی و الزامات اجرایی در استرالیا است؟'
                  : 'What are the key legal and clinical considerations for this topic?'}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t app-border text-[11px] app-muted">
              <span>{isFa ? 'ماژول: ' + currentCard.module : 'Module: ' + currentCard.module}</span>
              <span className="text-sky-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" />
                {isFa ? 'مشاهده نکته سریع' : 'Reveal Action Pearl'}
              </span>
            </div>
          </div>
        ) : (
          /* BACK SIDE */
          <div className="flex flex-col justify-between h-full space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b app-border pb-2">
              <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {isFa ? 'نکته کلیدی و پاسخ' : 'Action Pearl & Summary'}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFlipped(false);
                }}
                className="text-[10px] app-muted hover:app-text flex items-center gap-1"
              >
                <RotateCw className="w-3 h-3" />
                {isFa ? 'چرخش کارت' : 'Flip back'}
              </button>
            </div>

            <div className="space-y-3 my-auto">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed font-medium [unicode-bidi:isolate]" dir={isFa ? 'rtl' : 'ltr'}>
                {formatBidiText(
                  typeof currentCard.actionPearl === 'object' && currentCard.actionPearl
                    ? (isFa ? (currentCard.actionPearl.fa || currentCard.actionPearl.en) : (currentCard.actionPearl.en || currentCard.actionPearl.fa))
                    : String(currentCard.actionPearl || ''),
                  isFa
                )}
              </div>

              <div
                className="text-xs app-text space-y-2 max-h-48 overflow-y-auto pr-1"
                dangerouslySetInnerHTML={{
                  __html: sanitizeHtml(typeof currentCard.detailsHtml === 'object' && currentCard.detailsHtml
                    ? (isFa ? (currentCard.detailsHtml.fa || currentCard.detailsHtml.en) : (currentCard.detailsHtml.en || currentCard.detailsHtml.fa))
                    : String(currentCard.detailsHtml || '')),
                }}
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t app-border">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const cardTitle = typeof currentCard.title === 'object' && currentCard.title
                    ? (isFa ? (currentCard.title.fa || currentCard.title.en) : (currentCard.title.en || currentCard.title.fa))
                    : String(currentCard.title || '');
                  onAskAi(
                    isFa
                      ? `استاد، لطفاً در مورد این کارت توضیح بیشتر و ۲ تست تشخیصی ارائه کن:\n${cardTitle}`
                      : `Explain this topic in depth:\n${cardTitle}`
                  );
                }}
                className="px-2.5 py-1 rounded-lg bg-purple-600/20 text-purple-300 text-xs hover:bg-purple-600/30 transition flex items-center gap-1"
              >
                <Bot className="w-3.5 h-3.5" />
                <span>{isFa ? 'توضیح کامل هوش مصنوعی' : 'Ask AI Tutor'}</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleItemCompleted(
                    4,
                    currentCard.id,
                    {
                      fa: currentCard.title?.fa || currentCard.title?.en || 'کارت داروسازی',
                      en: currentCard.title?.en || currentCard.title?.fa || 'Pharmacy Card',
                    },
                    {
                      fa: typeof currentCard.category === 'object' ? (currentCard.category?.fa || currentCard.category?.en || 'ماژول ۴') : String(currentCard.category || 'ماژول ۴'),
                      en: typeof currentCard.category === 'object' ? (currentCard.category?.en || currentCard.category?.fa || 'Module 4') : String(currentCard.category || 'Module 4'),
                    }
                  );
                  onToggleReview(currentCard.id);
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                  isMastered
                    ? 'bg-emerald-500 text-white'
                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isMastered ? (isFa ? 'مسلط شدم' : 'Mastered') : isFa ? 'علامت به عنوان مسلط' : 'Mark as Mastered'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={handlePrev}
          className="flex-1 py-2.5 rounded-xl border app-border app-card hover:bg-slate-800 app-text text-xs font-bold transition flex items-center justify-center gap-1.5"
        >
          {isFa ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          <span>{isFa ? 'کارت قبلی' : 'Previous'}</span>
        </button>

        <button
          onClick={handleNext}
          className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-600/20"
        >
          <span>{isFa ? 'کارت بعدی' : 'Next Card'}</span>
          {isFa ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
