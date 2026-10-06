import { describe, expect, it } from 'vitest';
import { parseLessonQuiz } from './lessonQuiz';
import { sanitizeKnowledgeHtml } from './knowledgeHtmlSanitizer';
const source = '<article class="knowledge-card"><dl><div><dt>Question</dt><dd>Which option?</dd></div><div><dt>Options</dt><dd><ul>' + ['a','b','c','d'].map(id => `<li><dl><div><dt>ID</dt><dd>${id}</dd></div><div><dt>Text</dt><dd>Option ${id}</dd></div></dl></li>`).join('') + '</ul></dd></div><div><dt>Correct option ID</dt><dd><span>b</span></dd></div><div><dt>Answer explanation</dt><dd>Source explanation</dd></div></dl></article>';
const questions = [{ id: 'user-question', content_html: source, content_en: source }];
describe('source-backed Knowledge quizzes', () => {
  it.each(questions)('uses the actual bilingual question and answer key for $id', doc => {
    for (const source of [doc.content_html, doc.content_en]) {
      const quiz = parseLessonQuiz(sanitizeKnowledgeHtml(source));
      expect(quiz).not.toBeNull();
      expect(quiz.options).toHaveLength(4);
      expect(quiz.options.some(option => option.id === quiz.correctId)).toBe(true);
      expect(quiz.explanationHtml).toBeTruthy();
    }
  });
  it('rejects an incomplete or ambiguous answer key instead of inventing grading', () => {
    expect(parseLessonQuiz('<article class="knowledge-card"><dl><div><dt>Question</dt><dd>Unknown</dd></div></dl></article>')).toBeNull();
    const source = questions[0].content_en.replace(/(<dt[^>]*>Correct option ID<\/dt><dd[^>]*><span>)[^<]+/, '$1unknown');
    expect(parseLessonQuiz(source)).toBeNull();
  });
  it('retains the original presentation for extra clinical fields or duplicate question fields', () => {
    const source = questions[0].content_en;
    const warning = '<div><dt>Safety</dt><dd>Essential extra warning</dd></div>';
    expect(parseLessonQuiz(source.replace('</dl>', warning + '</dl>'))).toBeNull();
    expect(parseLessonQuiz(source.replace('</dl>', '<div><dt>Question</dt><dd>Another question</dd></div></dl>'))).toBeNull();
    expect(parseLessonQuiz(source + '<p>Additional clinical context</p>')).toBeNull();
  });
});
