import { describe, it, expect } from 'vitest';
import { buildLessonCards } from './lessonCards';
import { lessonNavigation } from './lessonNavigation';
describe('navigation relationships in actual source records', () => {
  it('keeps medicines in their treatment topic and unrelated warnings separate', () => {
    const fields = ['Treatment', 'Medicines', 'Red flags'].map(label => `<div><dt>${label}</dt><dd>${label} source value</dd></div>`).join('');
    const sections = lessonNavigation(buildLessonCards(`<div class="knowledge-card"><dl>${fields}</dl></div>`, 'en'));
    expect(sections.map(section => section.title)).toEqual(['Treatment', 'Red flags']);
    expect(sections[0].cards.map(card => card.title)).toEqual(['Treatment', 'Medicines']);
    expect(sections[1].cards).toHaveLength(1);
  });
  it('does not infer relationships between similarly named freeform headings', () => {
    const html = '<div class="knowledge-card"><section><h2>Treatment</h2><p>A</p></section><section><h2>Medicines</h2><p>B</p></section></div>';
    expect(lessonNavigation(buildLessonCards(html, 'en')).map(section => section.title)).toEqual(['Treatment', 'Medicines']);
  });
  it('keeps named enzyme roles together and does not create an empty identifier tab', () => {
    const source = '<div class="knowledge-card"><section><h3>Hepatic Metabolic Pathway</h3><strong>CYP3A4</strong><p></p></section><div class="grid"><section><h3>Inhibitors</h3><p>A</p></section><section><h3>Inducers</h3><p>B</p></section><section><h3>Substrates</h3><p>C</p></section></div></div>';
    const cards = buildLessonCards(source, 'en', 'doc-cyp-example');
    const sections = lessonNavigation(cards, 'cyp');
    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Inhibitors · Inducers · Substrates');
    expect(sections[0].cards.map(card => card.title)).toEqual(['Hepatic Metabolic Pathway', 'Inhibitors', 'Inducers', 'Substrates']);
    expect(cards[0].wide).toBe(true);
    expect(cards.slice(1).every(card => card.safetyProtected)).toBe(true);
  });

});
