'use client';

import React, { useState } from 'react';
import { DISEASE_CATEGORIES, DISEASES_REGISTRY, DiseaseInfo } from '@/data/diseasesRegistry';
import { Language } from '@/types/pharmacy';
import { useIsMobile } from '@/hooks/use-mobile';
import { useStudyTrackerContext } from './study/StudyTrackerContext';
import { StudyStatusBadge } from './study/StudyStatusBadge';
import { DiseaseCategorySelector } from './shelf/DiseaseCategorySelector';
import { ArrowRight, Search, Sparkles, Stethoscope } from 'lucide-react';

interface DiseaseCategoryExplorerProps {
  language: Language;
  onSelectDisease: (disease: DiseaseInfo) => void;
  titleOverride?: string;
  subtitleOverride?: string;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  onNavigateToModule?: (moduleNumber: 1 | 2 | 3 | 4 | 5 | 6, contextId?: string) => void;
  onOpenAiLeitner?: (text: string, module: 1 | 2 | 4, category?: string, topic?: string) => void;
}

export const DiseaseCategoryExplorer: React.FC<DiseaseCategoryExplorerProps> = ({
  language,
  onSelectDisease,
  titleOverride,
  subtitleOverride,
  searchQuery: controlledSearchQuery,
  onSearchQueryChange,
}) => {
  const isFa = language === 'fa';
  const isMobile = useIsMobile();
  const { markItemViewed, toggleItemCompleted, isViewed, isCompleted } = useStudyTrackerContext();
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');
  const [internalSearchQuery, setInternalSearchQuery] = useState('');
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;

  const activeCategory =
    selectedCategoryId === 'ALL'
      ? { id: 'ALL', name: { fa: 'همه دسته‌بندی‌ها', en: 'All Categories' } }
      : DISEASE_CATEGORIES.find((category) => category.id === selectedCategoryId) || DISEASE_CATEGORIES[0];

  const updateSearchQuery = (query: string) => {
    if (onSearchQueryChange) onSearchQueryChange(query);
    else setInternalSearchQuery(query);
    if (query.trim()) setIsBrowseOpen(true);
  };

  const filteredDiseases = DISEASES_REGISTRY.filter((disease) => {
    if (selectedCategoryId !== 'ALL' && disease.categoryId !== selectedCategoryId) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      disease.name.fa.toLowerCase().includes(query) ||
      disease.name.en.toLowerCase().includes(query) ||
      disease.overview.fa.toLowerCase().includes(query) ||
      disease.overview.en.toLowerCase().includes(query) ||
      disease.synonyms.join(' ').toLowerCase().includes(query)
    );
  });

  const cardTitle = titleOverride || (isFa ? 'دسته‌بندی بالینی بیماری‌ها' : 'Clinical Disease Categories');

  return (
    <div className="space-y-4 animate-fadeIn">
      {!(isBrowseOpen || searchQuery.trim()) ? (
        <div
          className={
            isMobile
              ? 'app-card border border-teal-500/40 rounded-2xl p-4 space-y-4 shadow-lg bg-linear-to-b from-teal-950/20 to-transparent animate-fadeIn'
              : 'app-card border border-teal-500/40 rounded-3xl p-5 space-y-4 shadow-xl bg-linear-to-b from-teal-950/25 via-slate-900/30 to-transparent animate-fadeIn'
          }
        >
          <div className="border-b app-border pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div>
                <h3 className={isMobile ? 'text-xs sm:text-sm font-black app-text' : 'text-base font-black app-text'}>
                  {cardTitle}
                </h3>
              </div>
            </div>
          </div>

          <DiseaseCategorySelector
            selectedCategoryId={selectedCategoryId}
            onSelectCategory={setSelectedCategoryId}
            language={language}
          />

          <button
            type="button"
            onClick={() => setIsBrowseOpen(true)}
            className={
              isMobile
                ? 'w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-950/40 cursor-pointer transition active:scale-98'
                : 'w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 via-sky-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-teal-950/50 cursor-pointer transition hover:scale-[1.005] active:scale-99'
            }
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>{isFa ? '✨ مشاهده و مطالعه کارت‌های بیماری' : '✨ View & Study Disease Cards'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-fadeIn">
          <div className="app-card border app-border rounded-2xl p-3.5 flex items-center justify-between gap-4 shadow-sm bg-linear-to-r from-slate-900/60 to-transparent">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shrink-0">
                <Stethoscope className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black app-text truncate">
                    {isFa ? activeCategory.name.fa : activeCategory.name.en}
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 font-mono font-bold">
                    {filteredDiseases.length} {isFa ? 'بیماری' : 'conditions'}
                  </span>
                </div>
                <p className="text-xs app-muted mt-0.5" dir="ltr">
                  {activeCategory.name.en}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsBrowseOpen(false);
                  updateSearchQuery('');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Search className="w-4 h-4" />
                <span>{isFa ? 'تغییر دسته و جستجو' : 'Change Topic'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold app-text">
                  {isFa
                    ? `لیست بیماری‌های این سرفصل (${filteredDiseases.length} مورد)`
                    : `Diseases in this topic (${filteredDiseases.length} conditions)`}
                </h3>
              </div>
            </div>

            <div className="space-y-3">
              {filteredDiseases.length > 0 ? (
                filteredDiseases.map((disease) => {
                  const category =
                    DISEASE_CATEGORIES.find((candidate) => candidate.id === disease.categoryId) || DISEASE_CATEGORIES[0];
                  const viewed = isViewed(disease.id);
                  const completed = isCompleted(disease.id);
                  const openDisease = () => {
                    markItemViewed(
                      4,
                      disease.id,
                      { fa: disease.name.fa || disease.name.en, en: disease.name.en || disease.name.fa },
                      { fa: category.name.fa || category.name.en, en: category.name.en || category.name.fa },
                      { tabId: 'diseases', categoryId: disease.categoryId }
                    );
                    onSelectDisease(disease);
                  };

                  return (
                    <div
                      key={disease.id}
                      onClick={openDisease}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openDisease();
                        }
                      }}
                      className={`group app-card border rounded-2xl p-3 sm:p-4 transition-all duration-200 bg-slate-900/90 text-white cursor-pointer shadow-sm hover:shadow-md app-border hover:border-sky-500/40 ${
                        completed ? 'border-emerald-500/40 ring-1 ring-emerald-500/20' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1 text-left" dir="ltr">
                          <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-sky-300 transition leading-snug">
                            {disease.name.en}
                          </h3>
                          <p className="text-xs sm:text-sm app-text text-right" dir="rtl">
                            {disease.name.fa}
                          </p>
                          <span className="inline-flex text-[10px] px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30 font-mono">
                            {category.name[language] || category.name.en}
                          </span>
                        </div>
                        <StudyStatusBadge
                          language={language}
                          viewed={viewed}
                          completed={completed}
                          size="sm"
                          onToggleComplete={(event) => {
                            event.stopPropagation();
                            toggleItemCompleted(
                              4,
                              disease.id,
                              { fa: disease.name.fa || disease.name.en, en: disease.name.en || disease.name.fa },
                              { fa: category.name.fa || category.name.en, en: category.name.en || category.name.fa }
                            );
                          }}
                        />
                      </div>
                      <p className="text-[11px] app-muted line-clamp-2 leading-relaxed mt-2">
                        {disease.overview[language] || disease.overview.en}
                      </p>
                      <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between text-xs mt-3">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-[11px]">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isFa ? 'مطالعه ۳ فازی بیماری' : 'Study Condition'}</span>
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition" />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-8 text-center text-xs app-muted bg-slate-950/20 rounded-2xl border app-border">
                  {isFa ? 'هیچ بیماری مطابق با عبارت جستجو یافت نشد.' : 'No matching diseases found.'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
