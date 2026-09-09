'use client';

import React from 'react';
import { ModuleId, Language } from '@/types/pharmacy';
import { PHARMACY_MODULES, ALL_PHARMACY_CARDS } from '@/lib/pharmacy-data';
import { i18n, t } from '@/lib/i18n';
import { BookOpen, Layers, CheckCircle, Flag, Award, Sparkles, FolderOpen } from 'lucide-react';

interface SidebarNavProps {
  language: Language;
  activeModule: ModuleId;
  onSelectModule: (modId: ModuleId) => void;
  reviewedCards: Record<string, boolean>;
  flags: Record<string, any>;
  deleted: string[];
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  language,
  activeModule,
  onSelectModule,
  reviewedCards,
  flags,
  deleted,
}) => {
  const isFa = language === 'fa';

  const activeCards = ALL_PHARMACY_CARDS.filter((c) => !deleted.includes(c.id));

  const getModuleStats = (modId: string) => {
    const modCards = modId === 'ALL' ? activeCards : activeCards.filter((c) => c.module === modId);
    const total = modCards.length;
    const reviewed = modCards.filter((c) => reviewedCards[c.id]).length;
    const flagged = modCards.filter((c) => flags[c.id]).length;
    const pct = total > 0 ? Math.round((reviewed / total) * 100) : 0;
    return { total, reviewed, flagged, pct };
  };

  const allStats = getModuleStats('ALL');

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-4">
      {/* Module Navigation Card */}
      <div className="app-card border app-border rounded-2xl p-3.5 space-y-3 shadow-sm">
        <div className="flex items-center justify-between border-b app-border pb-2">
          <span className="font-bold text-xs app-text flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-sky-400" />
            {t(i18n.sidebar.kapsModules, language)}
          </span>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
            {t(i18n.common.modulesCount(6), language)}
          </span>
        </div>

        {/* All Modules Button */}
        <button
          onClick={() => onSelectModule('ALL')}
          className={`w-full text-right p-2.5 rounded-xl border transition flex items-center justify-between text-xs ${
            activeModule === 'ALL'
              ? 'bg-sky-600 text-white font-bold border-sky-500 shadow-sm'
              : 'app-bg app-border app-muted hover:app-text hover:bg-black/20'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 shrink-0" />
            <span>{isFa ? 'همه ماژول‌ها (۱ تا ۶)' : 'All Modules (1-6)'}</span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-black/20">
            {allStats.total}
          </span>
        </button>

        {/* Individual Modules List */}
        <div className="space-y-1.5 pt-1">
          {PHARMACY_MODULES.map((mod) => {
            const stats = getModuleStats(mod.id);
            const isActive = activeModule === mod.id;

            return (
              <button
                key={mod.id}
                onClick={() => onSelectModule(mod.id as ModuleId)}
                className={`w-full text-right p-2.5 rounded-xl border transition flex flex-col gap-1.5 text-xs ${
                  isActive
                    ? 'bg-sky-600 text-white font-bold border-sky-500 shadow-sm'
                    : 'app-bg app-border app-muted hover:app-text hover:bg-black/20'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="truncate">{mod.name[language]}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-black/20 shrink-0">
                    {stats.total}
                  </span>
                </div>

                {/* Progress Mini Bar */}
                <div 
                  className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden flex items-center"
                  role="progressbar"
                  aria-valuenow={stats.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="bg-emerald-400 h-full transition-all duration-300"
                    style={{ width: `${stats.pct}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Website Quick Stats Box */}
      <div className="app-card border app-border rounded-2xl p-3.5 space-y-2.5 shadow-sm text-xs">
        <span className="font-bold app-text flex items-center gap-1.5 border-b app-border pb-2">
          <Award className="w-4 h-4 text-emerald-400" />
          {isFa ? 'وضعیت تسلط شما' : 'Your Mastery Status'}
        </span>

        <div className="space-y-2 pt-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="app-muted flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              {isFa ? 'مرور شده‌ها:' : 'Mastered Topics:'}
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {allStats.reviewed} / {allStats.total} ({allStats.pct}%)
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="app-muted flex items-center gap-1">
              <Flag className="w-3.5 h-3.5 text-rose-400" />
              {isFa ? 'پرچمدارها:' : 'Flagged Items:'}
            </span>
            <span className="font-mono font-bold text-rose-400">{allStats.flagged}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
