'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { Check, ChevronDown, Layers } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { MatrixTopic } from './MatrixSectionSelector';

export interface MatrixTopicsAccordionProps {
  topics: MatrixTopic[];
  selectedTopicId: string;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelectTopicId: (id: string) => void;
  language: Language;
}

export const MatrixTopicsAccordion: React.FC<MatrixTopicsAccordionProps> = ({
  topics,
  selectedTopicId,
  isOpen,
  onToggleOpen,
  onSelectTopicId,
  language,
}) => {
  const isFa = language === 'fa';
  const activeTopic = topics.find((topic) => topic.id === selectedTopicId) || topics[0];

  return (
    <div className="space-y-3">
      <div className="app-card border app-border rounded-2xl overflow-hidden shadow-sm transition-all">
        <button
          type="button"
          onClick={onToggleOpen}
          className="w-full p-3 sm:p-3.5 app-bg hover:bg-black/5 dark:hover:bg-slate-900 flex items-center justify-between gap-3 text-start cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-black app-text truncate">
                {activeTopic ? (isFa ? activeTopic.titleFa : activeTopic.titleEn) : isFa ? 'زیرفصلی یافت نشد' : 'No topics found'}
              </h4>
              <p className="text-[10px] app-muted truncate opacity-80 mt-0.5" dir="ltr">
                {activeTopic?.titleEn || ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-2 py-1 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 text-[11px] font-bold flex items-center gap-1 transition">
              <span>{isOpen ? (isFa ? 'بستن' : 'Close') : (isFa ? 'تغییر زیرفصل' : 'Change Topic')}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-sky-500' : ''}`} />
            </div>
          </div>
        </button>

        {isOpen && (
          <div className="p-3 sm:p-4 border-t app-border bg-black/5 dark:bg-slate-950/40 animate-fadeIn space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {topics.map((topic) => {
                const isSelected = topic.id === selectedTopicId;

                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => {
                      haptic.light();
                      onSelectTopicId(topic.id);
                      onToggleOpen();
                    }}
                    className={`p-2.5 rounded-xl text-start transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white border-2 border-sky-400 shadow-xs font-bold'
                        : 'app-bg app-border app-muted hover:app-text hover:bg-black/10 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-black/10 dark:bg-slate-800 text-sky-500'}`}>
                      {isSelected ? <Check className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs leading-snug truncate">{isFa ? topic.titleFa : topic.titleEn}</div>
                      <div className="text-[10px] opacity-75 truncate" dir="ltr">
                        {topic.titleEn}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
