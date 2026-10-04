import { describe, expect, it } from 'vitest';
import { getLessonTemplate, isTechnicalLessonField, templateCardGroup } from './lessonTemplates';
import { buildLessonCards } from './lessonCards';
import { decorateLessonBody, resolveLessonDocumentLink } from './lessonBodyPresentation';

describe('lesson-specific presentation', () => {
  it('selects only known Pharmacy templates and preserves the generic reader', () => {
    expect(getLessonTemplate('doc-core-disease-dis-asthma')).toBe('clinical');
    expect(getLessonTemplate('doc-mechanism-mech-example')).toBe('mechanism');
    expect(getLessonTemplate('doc-study-track-track1')).toBe('pathway');
    expect(getLessonTemplate('personal-note')).toBe('general');
  });
  it('distinguishes exact technical fields from clinical content and relationships', () => {
    expect(isTechnicalLessonField('شناسهٔ درس')).toBe(true);
    expect(isTechnicalLessonField('Class code')).toBe(true);
    expect(isTechnicalLessonField('Related concept IDs')).toBe(false);
    expect(isTechnicalLessonField('شناسهٔ مطالب مرتبط')).toBe(false);
    expect(isTechnicalLessonField('Adverse effects')).toBe(false);
  });
  it('uses a source-specific group without losing cards to an unavailable group', () => {
    expect(templateCardGroup('clinical', 'Key Diagnostic Symptoms', 'overview', 'understand')).toBe('symptoms');
    expect(templateCardGroup('mechanism', 'Target site', 'overview', 'understand')).toBe('understand');
    expect(templateCardGroup('scenario', 'Counselling', 'use', 'apply')).toBe('decision');
    expect(templateCardGroup('pathway', 'Milestones', 'practice', 'practice')).toBe('milestones');
  });
  it('extracts separately named CYP roles while preserving the whole source', () => {
    const html = '<div class="knowledge-card"><section><h3>CYP</h3><p>Source</p></section><div class="grid"><section><h3>Inhibitors</h3><p>A</p></section><section><h3>Inducers</h3><p>B</p></section><section><h3>Substrates</h3><p>C</p></section></div></div>';
    const cards = buildLessonCards(html, 'en', 'doc-cyp-example');
    expect(cards.map(card => card.title)).toEqual(['CYP', 'Inhibitors', 'Inducers', 'Substrates']);
    expect(cards.slice(1).every(card => card.group === 'understand')).toBe(true);
  });
  it('resolves existing document aliases but never guesses missing scenario IDs', () => {
    expect(resolveLessonDocumentLink('concept-hypokalemia')?.documentId).toBe('doc-concept-concept-hypokalemia');
    expect(resolveLessonDocumentLink('scen_resp_cough_01')).toBeUndefined();
    expect(resolveLessonDocumentLink('__proto__')).toBeUndefined();
  });
  it('adds only verified relationships and one notice for unmapped source IDs', () => {
    const root = document.createElement('div');
    root.innerHTML = '<dd><ul><li><span>concept-hypokalemia</span></li><li><span>scen_resp_cough_01</span></li><li><span>missing-id</span></li></ul></dd>';
    decorateLessonBody(root, 'en', 'Related concept IDs');
    expect(root.querySelectorAll('a')).toHaveLength(1);
    expect(root.querySelector('a')?.getAttribute('data-doc-link')).toBe('doc-concept-concept-hypokalemia');
    expect(root.querySelectorAll('.lesson-related-unavailable')).toHaveLength(1);
    expect(root.querySelector('.lesson-related-unavailable')?.textContent).toContain('2 source links');
    root.querySelectorAll('[data-lesson-decoration]').forEach(element => element.remove());
    expect(root.textContent).toBe('concept-hypokalemiascen_resp_cough_01missing-id');
  });
  it('collapses only a class name already visible in the outer title', () => {
    const html = '<div class="knowledge-card"><dl><div><dt>Class name</dt><dd>Example class</dd></div><div><dt>Target site</dt><dd>Original target</dd></div></dl></div>';
    expect(buildLessonCards(html, 'en', 'doc-mechanism-mech-example', ['Example class'])[0].kind).toBe('metadata');
    expect(buildLessonCards(html, 'en', 'doc-mechanism-mech-example', ['Other title'])[0].kind).not.toBe('metadata');
  });
});
