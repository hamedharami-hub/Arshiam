import type { LessonContentCard } from './lessonCards';
import { type LessonTemplate, normalizeLessonLabel } from './lessonTemplates';

/** Combine only recognised fields of the same source record. A heading from
 * another document is never used, and unknown sections remain independent. */
export function lessonNavigation(cards: LessonContentCard[], template?: LessonTemplate) {
  const labels = new Map(cards.map(card => [normalizeLessonLabel(card.title), card]));
  const rules = [
    ['overview', 'related names and keywords'], ['نمای کلی', 'نام ها و کلیدواژه های مرتبط'],
    ['treatment', 'medicines', 'non pharmacological advice'], ['درمان', 'داروها', 'مراقبت غیردارویی'],
    ['instructions counselling', 'clinical notes'], ['دستورالعمل و مشاوره', 'نکات بالینی'],
    ['description', 'subtitle', 'learning focus'], ['توضیح', 'زیرعنوان', 'هدف یادگیری'],
  ];
  const primary = new Map<string, LessonContentCard>();
  const comparisons = new Map<string, LessonContentCard>();
  for (const card of cards) if (card.comparison) {
    const first = comparisons.get(card.comparison.id) || card;
    comparisons.set(card.comparison.id, first); primary.set(card.id, first);
  }
  // An enzyme identifier with an empty description belongs to its comparison.
  if (template === 'cyp' && cards[0]?.group === 'identity' && cards[1]?.comparison) {
    const root = document.createElement('div'); root.innerHTML = cards[0].sourceHtml;
    if (Array.from(root.querySelectorAll('p')).every(p => !p.textContent.trim()) && !root.querySelector('ul,ol,table,img')) primary.set(cards[0].id, cards[1]);
  }

  for (const [head, ...support] of rules) {
    const topic = labels.get(head);
    if (!topic) continue;
    for (const label of [head, ...support]) {
      const card = labels.get(label);
      // Only definition-list fields share a record; similarly worded narrative
      // lesson headings do not imply a parent/child relationship.
      if (card && /^<div\b[^>]*>\s*<dt\b/i.test(card.sourceHtml)) primary.set(card.id, topic);
    }
  }
  const sections = new Map<string, { id: string; title: string; cards: LessonContentCard[]; layout: string }>();
  for (const card of cards) {
    const topic = primary.get(card.id) || card;
    const section = sections.get(topic.id) || { id: topic.id, title: topic.comparison?.title || topic.title, cards: [], layout: 'grid' };
    section.cards.push(card); sections.set(topic.id, section);
  }
  return [...sections.values()];
}
