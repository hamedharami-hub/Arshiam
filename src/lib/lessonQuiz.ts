import { normalizeLessonLabel } from './lessonTemplates';

export interface LessonQuiz {
  questionHtml: string;
  options: { id: string; html: string }[];
  correctId: string;
  explanationHtml: string;
}

function fieldValue(root: Element, names: string[]): Element | undefined {
  return Array.from(root.children).find(field => names.includes(normalizeLessonLabel(field.querySelector(':scope > dt')?.textContent || '')))?.querySelector(':scope > dd') ?? undefined;
}

/** Grade only source questions with unambiguous options and an existing answer key. */
export function parseLessonQuiz(safeHtml: string): LessonQuiz | null {
  if (typeof document === 'undefined') return null;
  const container = document.createElement('div'); container.innerHTML = safeHtml;
  const fields = container.querySelector('.knowledge-card > dl');
  if (!fields) return null;
  const question = fieldValue(fields, ['question', 'پرسش']);
  const optionList = fieldValue(fields, ['options', 'گزینه ها']);
  const answer = fieldValue(fields, ['correct option id', 'شناسه گزینه درست']);
  const explanation = fieldValue(fields, ['answer explanation', 'توضیح پاسخ']);
  if (!question?.textContent.trim() || !optionList || !answer || !explanation?.textContent.trim()) return null;
  const records = optionList.querySelector(':scope > ul,:scope > ol');
  if (!records) return null;
  const options: LessonQuiz['options'] = [];
  for (const item of Array.from(records.children)) {
    const record = item.querySelector(':scope > dl');
    if (!record) return null;
    const id = fieldValue(record, ['id', 'شناسه'])?.textContent.trim();
    const text = fieldValue(record, ['text', 'متن']);
    if (!id || !text?.textContent.trim()) return null;
    options.push({ id, html: text.innerHTML });
  }
  const correctId = answer.textContent.trim();
  if (options.length < 2 || new Set(options.map(option => option.id)).size !== options.length || !options.some(option => option.id === correctId)) return null;
  return { questionHtml: question.innerHTML, options, correctId, explanationHtml: explanation.innerHTML };
}
