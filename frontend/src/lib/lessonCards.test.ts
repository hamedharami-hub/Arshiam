import { getLessonTemplate, TEMPLATE_GROUPS } from './lessonTemplates';
import { describe, expect, it } from 'vitest';
import { buildLessonCards, classifyLessonCard } from './lessonCards';
import { sanitizeKnowledgeHtml } from './knowledgeHtmlSanitizer';

const plain = (html: string) => { const root = document.createElement('div'); root.innerHTML = html; root.querySelectorAll('[data-lesson-decoration]').forEach(node => node.remove()); return root.textContent.replace(/\s+/g, ''); };
describe('lesson card presentation preserves the scientific source', () => {
  it('assigns unique card IDs even when source IDs repeat or collide with a title hash', () => {
    const first = '<section><h2>Overview</h2><p>A</p></section>';
    const hashId = buildLessonCards(`<div class="knowledge-card">${first}<p>B</p></div>`, 'en')[0].id.slice(5);
    const source = `<div class="knowledge-card">${first}<section id="${hashId}"><h2>Use</h2><p>B</p></section><section id="${hashId}"><h2>Warning</h2><p>C</p></section></div>`;
    const cards = buildLessonCards(source, 'en');
    expect(new Set(cards.map(card => card.id)).size).toBe(3);
    expect(plain(cards.map(card => card.sourceHtml).join(''))).toBe(plain(source));
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
  it('keeps one legal rule intact but gives separate topics to a multi-topic legal lesson', () => {
    const single = '<div class="knowledge-card"><h2>Storage rule</h2><p>Keep this rule and its exception together.</p></div>';
    expect(buildLessonCards(single, 'en', 'doc-storage-test')[0].wholeDocument).toBe(true);
    const multiple = '<div class="knowledge-card"><h2>Storage</h2><p>Storage instruction.</p><h2>Recording</h2><p>Recording instruction.</p></div>';
    const cards = buildLessonCards(multiple, 'en', 'doc-storage-test');
    expect(cards.map(card => card.title)).toEqual(['Storage', 'Recording']);
    expect(cards.every(card => !card.wholeDocument)).toBe(true);
    expect(plain(cards[0].sourceHtml)).toBe('StorageStorageinstruction.');
  });
  it('keeps an assessment question and its answer with their heading and comparison columns together', () => {
    const source = '<div class="knowledge-card"><h2>Assessment</h2><p>Question for this case?</p><p>This case answer.</p><h2>Management</h2><div class="grid"><section><h3>A</h3><p>One</p></section><section><h3>B</h3><p>Two</p></section></div></div>';
    const cards = buildLessonCards(source, 'en');
    expect(cards.map(card => card.title)).toEqual(['Assessment', 'Management']);
    expect(cards[0].html).toContain('This case answer.');
    expect(cards[1].html).toContain('One'); expect(cards[1].html).toContain('Two');
    expect(cards[1].html).not.toContain('This case answer.');
  });

});
