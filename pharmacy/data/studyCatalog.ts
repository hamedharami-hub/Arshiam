import { ALL_PHARMACY_CARDS } from '@/lib/pharmacy-data';
import { OTC_SCENARIOS } from '@/data/otcScenarios';
import { SHELF_PRODUCTS } from '@/data/shelf/shelfProducts';
import { StudyCatalogItem, MainStudyModuleId } from '@/types/studyTrack';

const moduleNumber = (moduleId: string): MainStudyModuleId => Number(moduleId.replace('mod', '')) as MainStudyModuleId;

export const STUDY_CATALOG: StudyCatalogItem[] = [
  ...ALL_PHARMACY_CARDS.map((card) => ({
    id: card.id,
    type: 'topic' as const,
    moduleId: moduleNumber(card.module),
    title: card.title,
    category: card.category,
  })),
  ...OTC_SCENARIOS.map((scenario) => ({
    id: `otc:${scenario.id}`,
    type: 'otc-scenario' as const,
    moduleId: 1 as const,
    title: scenario.title,
    category: { fa: 'تریاژ OTC', en: 'OTC Triage' },
  })),
  ...SHELF_PRODUCTS.map((product) => ({
    id: `shelf:${product.id}`,
    type: 'shelf-product' as const,
    moduleId: 2 as const,
    title: { fa: product.brandName, en: product.brandName },
    category: { fa: 'قفسه داروها', en: 'Product Shelf' },
  })),
];

export const STUDY_CATALOG_BY_ID = new Map(STUDY_CATALOG.map((item) => [item.id, item]));

export function getCatalogStats(state: {
  viewedMap: Record<string, boolean>;
  completedMap: Record<string, boolean>;
  flagMap: Record<string, string>;
}) {
  return [1, 2, 3, 4, 5, 6].map((moduleId) => {
    const items = STUDY_CATALOG.filter((item) => item.moduleId === moduleId);
    const completed = items.filter((item) => state.completedMap[item.id]).length;
    const viewed = items.filter((item) => state.viewedMap[item.id]).length;
    const flagged = items.filter((item) => state.flagMap[item.id]).length;
    return {
      moduleId,
      total: items.length,
      completed,
      viewed,
      flagged,
      completionPct: items.length ? Math.round((completed / items.length) * 100) : 0,
    };
  });
}
