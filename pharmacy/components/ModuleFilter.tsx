'use client';

import React, { useState } from 'react';
import { ModuleId, DisplayMode, FlagColor, Language } from '@/types/pharmacy';
import { PHARMACY_MODULES } from '@/lib/pharmacy-data';
import { Search, SlidersHorizontal, ChevronDown, ChevronUp, Flag, Filter, X } from 'lucide-react';

interface ModuleFilterProps {
  language: Language;
  activeModule: ModuleId;
  onSelectModule: (modId: ModuleId) => void;
  displayMode?: DisplayMode;
  onChangeDisplayMode?: (mode: DisplayMode) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  flagFilter: FlagColor | 'ALL';
  onSelectFlagFilter: (flag: FlagColor | 'ALL') => void;
}

export const ModuleFilter: React.FC<ModuleFilterProps> = ({
  language,
  activeModule,
  onSelectModule,
  searchQuery,
  onSearchChange,
  categories,
  activeCategory,
  onSelectCategory,
  flagFilter,
  onSelectFlagFilter,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isFa = language === 'fa';

  const activeModuleObj = PHARMACY_MODULES.find((m) => m.id === activeModule);
  const activeModuleName =
    activeModule === 'software'
      ? isFa
        ? 'نرم‌افزار (Fred Dispense)'
        : 'Software (Fred Dispense)'
      : activeModule === 'ALL'
      ? isFa
        ? 'همه ماژول‌ها (۱ تا ۶)'
        : 'All Modules (1-6)'
      : activeModuleObj
      ? activeModuleObj.name[language]
      : activeModule;

  return (
    <div className="app-card border app-border rounded-2xl shadow-sm overflow-hidden transition-all duration-300">
      {/* Curtain Drawer Header / Summary Bar */}
      <div className="p-3 bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Search Bar - Always Accessible */}
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={
              isFa
                ? 'جستجوی سرتاسری در سرفصل‌ها، داروها، قوانین...'
                : 'Search topics, drugs, laws...'
            }
            aria-label={isFa ? 'جستجوی سرتاسری' : 'Search topics, drugs, laws'}
            className="w-full app-bg border app-border text-xs app-text rounded-xl py-2 px-3 pe-9 focus:outline-none focus:border-sky-500 transition"
          />
          <Search className="w-4 h-4 absolute end-3 top-2.5 app-muted pointer-events-none" />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute start-3 top-2.5 app-muted hover:app-text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Curtain Toggle & Active Module Indicator */}
        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center gap-1.5 max-w-[200px] sm:max-w-xs truncate">
            <Filter className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{activeModuleName}</span>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`px-3 py-1.5 rounded-xl border transition text-xs font-bold flex items-center gap-1.5 whitespace-nowrap ${
              isOpen
                ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                : 'bg-black/30 border-app-border app-muted hover:app-text hover:bg-black/50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>
              {isFa
                ? isOpen
                  ? 'بستن پرده فیلترها'
                  : 'انتخاب ماژول و فیلتر'
                : isOpen
                ? 'Close Filters'
                : 'Module & Filter Curtain'}
            </span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expandable Curtain Body */}
      {isOpen && (
        <div className="p-3.5 border-t app-border bg-black/10 space-y-3.5 animate-fadeIn">
          {/* 1. Module Chips */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold app-muted flex items-center justify-between">
              <span>{isFa ? 'انتخاب ماژول آموزشی:' : 'Select Learning Module:'}</span>
              <span className="text-[10px] opacity-70 font-mono">
                {isFa ? 'مباحث آموزشی' : 'Learning content'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-1 no-scrollbar">
              <button
                onClick={() => onSelectModule('ALL')}
                className={`px-3 py-1.5 rounded-xl font-bold transition whitespace-nowrap ${
                  activeModule === 'ALL'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'app-bg app-muted hover:app-text border app-border'
                }`}
              >
                {isFa ? 'همه ماژول‌ها (۱-۶)' : 'All Modules (1-6)'}
              </button>

              {PHARMACY_MODULES.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => onSelectModule(mod.id as ModuleId)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition whitespace-nowrap ${
                    activeModule === mod.id
                      ? 'bg-sky-600 text-white font-bold shadow-sm'
                      : 'app-bg app-muted hover:app-text border app-border'
                  }`}
                >
                  {mod.name[language]}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Sub-categories & Flag Filter Controls */}
          <div className="pt-2 border-t border-dashed app-border flex flex-col md:flex-row md:items-center justify-between gap-3 text-[11px]">
            {/* Sub-categories */}
            <div className="space-y-1 flex-1 min-w-0">
              <span className="text-[10px] font-bold app-muted block">
                {isFa ? 'دسته‌بندی‌های موضوعی این ماژول:' : 'Sub-categories:'}
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                <button
                  onClick={() => onSelectCategory('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition whitespace-nowrap ${
                    activeCategory === 'ALL'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'app-bg app-muted border app-border hover:app-text'
                  }`}
                >
                  {isFa ? 'همه دسته‌ها' : 'All Topics'}
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => onSelectCategory(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition whitespace-nowrap ${
                      activeCategory === cat
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'app-bg app-muted border app-border hover:app-text'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Flag Colors Filter */}
            <div className="space-y-1 shrink-0">
              <span className="text-[10px] font-bold app-muted block">
                {isFa ? 'فیلتر نشان‌دارها (پرچم):' : 'Flag Filter:'}
              </span>
              <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border app-border">
                <button
                  onClick={() => onSelectFlagFilter('ALL')}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                    flagFilter === 'ALL' ? 'bg-sky-600 text-white' : 'app-muted hover:app-text'
                  }`}
                  aria-label={isFa ? 'همه نشان‌دارها' : 'All flags'}
                >
                  {isFa ? 'همه' : 'All'}
                </button>
                <button
                  onClick={() => onSelectFlagFilter('red')}
                  className={`w-4 h-4 rounded-full bg-rose-500 border transition ${
                    flagFilter === 'red' ? 'ring-2 ring-white scale-110' : 'border-white/20 hover:scale-110'
                  }`}
                  title="Red Flag"
                  aria-label="Filter by red flag"
                />
                <button
                  onClick={() => onSelectFlagFilter('yellow')}
                  className={`w-4 h-4 rounded-full bg-amber-400 border transition ${
                    flagFilter === 'yellow' ? 'ring-2 ring-white scale-110' : 'border-white/20 hover:scale-110'
                  }`}
                  title="Yellow Flag"
                  aria-label="Filter by yellow flag"
                />
                <button
                  onClick={() => onSelectFlagFilter('green')}
                  className={`w-4 h-4 rounded-full bg-emerald-500 border transition ${
                    flagFilter === 'green' ? 'ring-2 ring-white scale-110' : 'border-white/20 hover:scale-110'
                  }`}
                  title="Green Flag"
                  aria-label="Filter by green flag"
                />
                <button
                  onClick={() => onSelectFlagFilter('blue')}
                  className={`w-4 h-4 rounded-full bg-sky-400 border transition ${
                    flagFilter === 'blue' ? 'ring-2 ring-white scale-110' : 'border-white/20 hover:scale-110'
                  }`}
                  title="Blue Flag"
                  aria-label="Filter by blue flag"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
