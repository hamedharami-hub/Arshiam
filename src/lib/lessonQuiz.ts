import { isTechnicalLessonField, normalizeLessonLabel } from './lessonTemplates';

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
  const root = container.querySelector('.knowledge-card');
  const fields = root?.querySelector(':scope > dl');
  // A richer or edited question must keep its complete original presentation.
  // The compact quiz accepts only the schema whose content it actually renders.
  if (!root || !fields || container.children.length !== 1 || container.firstElementChild !== root || Array.from(root.children).some(child => child !== fields && child.tagName !== 'HEADER')) return null;
  const schema = [ ['question', 'پرسش'], ['options', 'گزینه ها'], ['correct option id', 'شناسه گزینه درست'], ['answer explanation', 'توضیح پاسخ'] ];
  const seen = new Set<number>();
  for (const field of Array.from(fields.children)) {
    const label = normalizeLessonLabel(field.querySelector(':scope > dt')?.textContent || '');
    const index = schema.findIndex(names => names.includes(label));
    if (!label || (!isTechnicalLessonField(label) && index < 0) || (index >= 0 && seen.has(index))) return null;
    if (index >= 0) seen.add(index);
  }
  if ([container, root, fields].some(element => Array.from(element.childNodes).some(node => node.nodeType === 3 && node.textContent.trim()))) return null;
  const question = fieldValue(fields, ['question', 'پرسش']);
  const optionList = fieldValue(fields, ['options', 'گزینه ها']);
  const answer = fieldValue(fields, ['correct option id', 'شناسه گزینه درست']);
  const explanation = fieldValue(fields, ['answer explanation', 'توضیح پاسخ']);
  if (!question?.textContent.trim() || !optionList || !answer || !explanation?.textContent.trim()) return null;
  for (const header of Array.from(root.children).filter(child => child.tagName === 'HEADER')) {
    const clone = header.cloneNode(true) as Element;
    const heading = clone.querySelector(':scope > h2');
    if (!heading || heading.children.length || normalizeLessonLabel(heading.textContent) !== normalizeLessonLabel(question.textContent)) return null;
    heading.remove();
    if (Array.from(clone.childNodes).some(node => node.nodeType === 3 && node.textContent.trim()) || Array.from(clone.children).some(child => child.tagName !== 'P' || child.children.length || !/^Source:/.test(child.textContent.trim()))) return null;
  }

  const records = optionList.querySelector(':scope > ul,:scope > ol');
  if (!records) return null;
  const options: LessonQuiz['options'] = [];
  for (const item of Array.from(records.children)) {
    const record = item.querySelector(':scope > dl');
    if (!record || item.children.length !== 1) return null;
    const optionLabels = Array.from(record.children).map(field => normalizeLessonLabel(field.querySelector(':scope > dt')?.textContent || ''));
    if (optionLabels.length !== 2 || optionLabels.filter(label => ['id', 'شناسه'].includes(label)).length !== 1 || optionLabels.filter(label => ['text', 'متن'].includes(label)).length !== 1) return null;
    const id = fieldValue(record, ['id', 'شناسه'])?.textContent.trim();
    const text = fieldValue(record, ['text', 'متن']);
    if (!id || !text?.textContent.trim()) return null;
    options.push({ id, html: text.innerHTML });
  }
  const correctId = answer.textContent.trim();
  if (options.length < 2 || new Set(options.map(option => option.id)).size !== options.length || !options.some(option => option.id === correctId)) return null;
  return { questionHtml: question.innerHTML, options, correctId, explanationHtml: explanation.innerHTML };
}
