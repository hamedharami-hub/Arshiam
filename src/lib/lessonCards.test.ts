import { describe, expect, it } from 'vitest';
import { buildLessonCards, classifyLessonCard } from './lessonCards';
import { PHARMACY_SEED_DOCUMENTS, PHARMACY_SEED_FOLDERS, PHARMACY_SEED_CARDS } from './pharmacySeedData';
import { applyPharmacyClinicalEditorialOverrides } from './pharmacyClinicalEditorialOverrides';
import { applyPharmacyPbsEditorialOverrides } from './pharmacyPbsEditorialOverrides';
import { sanitizeKnowledgeHtml } from './knowledgeHtmlSanitizer';

const plain = (html: string) => { const root = document.createElement('div'); root.innerHTML = html; return root.textContent.replace(/\s+/g, ''); };
const seed = applyPharmacyPbsEditorialOverrides(applyPharmacyClinicalEditorialOverrides({ PHARMACY_SEED_DOCUMENTS, PHARMACY_SEED_FOLDERS, PHARMACY_SEED_CARDS }));
describe('lesson card presentation preserves the scientific source', () => {
  it.each(seed.PHARMACY_SEED_DOCUMENTS)('preserves every bilingual source block in $id', (doc) => {
      for (const language of ['fa', 'en'] as const) {
        const source = sanitizeKnowledgeHtml(language === 'fa' ? doc.content_html : doc.content_en || doc.content_html);
        const cards = buildLessonCards(source, language);
        if (!cards.length) continue; // unsupported structure uses the full original renderer
        expect(plain(cards.map(card => card.sourceHtml).join('')), doc.id).toBe(plain(source));
        expect(new Set(cards.map(card => card.id)).size, doc.id).toBe(cards.length);
        // Removing a repeated title may move it into the card header, but cannot remove body text.
        for (const card of cards) {
          const body = plain(card.html);
          const original = plain(card.sourceHtml);
          expect(body === original || original.replace(plain(card.title), '') === body, `${doc.id}: ${card.title}`).toBe(true);
        }
      }
  });
  it('does not drop loose text or unsupported definition-list structures', () => {
    expect(buildLessonCards('Important warning<div class="knowledge-card"><p>A</p><p>B</p></div>', 'en')).toEqual([]);
    expect(buildLessonCards('<div class="knowledge-card">Important warning<p>A</p><p>B</p></div>', 'en')).toEqual([]);
    expect(buildLessonCards('<div class="knowledge-card"><dl><dt>Warning</dt><dd>Important</dd></dl><p>Keep</p></div>', 'en')).toEqual([]);
  });
  it('keeps source anchors, document relationships and tables inside named cards', () => {
    const html = '<div class="knowledge-card"><section><h2 id="dose">Dosing</h2><p>5 mg <a data-doc-link="other" href="#sources">source</a></p></section><section><h2 id="sources">Sources</h2><table><tr><td>Unchanged</td></tr></table></section></div>';
    const cards = buildLessonCards(html, 'en');
    expect(cards).toHaveLength(2);
    expect(cards[0].html).toContain('id="dose"');
    expect(cards[0].html).toContain('data-doc-link="other"');
    expect(cards[1].wide).toBe(true);
    expect(cards[1].html).toContain('<table>');
  });
  it('distinguishes adverse effects from applications and technical metadata from source references', () => {
    expect(classifyLessonCard('عوارض مهم')).toEqual({ kind: 'safety', group: 'safety' });
    expect(classifyLessonCard('مکانیسم اثر')).toEqual({ kind: 'mechanism', group: 'understand' });
    expect(classifyLessonCard('ردهٔ رنگ')).toEqual({ kind: 'metadata', group: 'reference' });
    expect(classifyLessonCard('منابع')).toEqual({ kind: 'reference', group: 'reference' });
  });
});
