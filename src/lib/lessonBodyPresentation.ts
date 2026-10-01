import links from './pharmacyLessonLinks.generated.json';
import { isTechnicalLessonField, normalizeLessonLabel } from './lessonTemplates';

export interface LessonDocumentLink { documentId: string; title: string; titleEn: string }
export function resolveLessonDocumentLink(id: string): LessonDocumentLink | undefined {
  if (!Object.prototype.hasOwnProperty.call(links.aliases, id)) return undefined;
  const documentId = (links.aliases as Record<string, string>)[id];
  const target = (links.documents as Record<string, Omit<LessonDocumentLink, 'documentId'>>)[documentId];
  return target ? { documentId, ...target } : undefined;
}

/** Adds presentation semantics to a clone; source strings, field order and clinical text stay intact. */
export function decorateLessonBody(root: Element, language: 'fa' | 'en', sourceTitle = ''): void {
  // Source filenames and a repeated document title are presentation metadata.
  // Preserve their DOM/text for source comparison, without repeating the heading.
  for (const header of Array.from(root.querySelectorAll('header'))) {
    for (const child of Array.from(header.children)) {
      if (/^Source:/.test(child.textContent.trim())) child.classList.add('lesson-field--technical');
      if (/^H[1-6]$/.test(child.tagName) && normalizeLessonLabel(child.textContent) === normalizeLessonLabel(sourceTitle) && !child.querySelector('a,img')) child.classList.add('lesson-duplicate-title');
    }
  }
  for (const dt of Array.from(root.querySelectorAll('dt'))) {
    const field = dt.parentElement;
    const value = field?.querySelector(':scope > dd');
    if (!field || !value) continue;
    field.classList.add('lesson-field');
    const label = normalizeLessonLabel(dt.textContent);
    if (isTechnicalLessonField(label) && !/related|مرتبط/.test(label)) field.classList.add('lesson-field--technical');
    if (/^(title|name|عنوان|نام)$/.test(label) && field.closest('li > dl')) {
      field.classList.add('lesson-record__title');
      value.setAttribute('role', 'heading');
      value.setAttribute('aria-level', '4');
    }
    if (/related.*(?:ids|items)|شناسه.*مرتبط/.test(label)) decorateRelationships(value, language);
  }
  const rootValue = root.querySelector(':scope > dd');
  if (rootValue && /related.*(?:ids|items)|شناسه.*مرتبط/.test(normalizeLessonLabel(sourceTitle)) && !root.querySelector(':scope > dt')) decorateRelationships(rootValue, language);
  for (const list of Array.from(root.querySelectorAll('ul,ol'))) {
    const items = Array.from(list.children);
    if (items.length && items.every(item => item.tagName === 'LI' && item.querySelector(':scope > dl'))) {
      list.classList.add('lesson-record-grid');
      items.forEach(item => item.classList.add('lesson-record'));
    }
  }
  for (const container of Array.from(root.querySelectorAll('div'))) {
    const children = Array.from(container.children);
    if (children.length > 1 && children.every(child => child.tagName === 'ARTICLE' || (child.tagName === 'DIV' && /\bborder\b/.test(child.className) && child.querySelector('.font-bold,.font-semibold')))) {
      container.classList.add('lesson-record-grid');
      children.forEach(child => child.classList.add('lesson-record'));
    }
  }
  for (const target of Array.from(root.querySelectorAll('[data-doc-link]'))) {
    if (target.matches('a,button')) continue;
    target.setAttribute('role', 'link');
    target.setAttribute('tabindex', '0');
  }
}

function decorateRelationships(value: Element, language: 'fa' | 'en') {
  let missing = 0;
  for (const span of Array.from(value.querySelectorAll('li > span'))) {
    if (span.children.length) continue;
    const target = resolveLessonDocumentLink(span.textContent.trim());
    span.classList.add('lesson-field--technical');
    if (!target) {
      span.parentElement.classList.add('lesson-field--technical');
      missing++;
      continue;
    }
    const link = document.createElement('a');
    link.setAttribute('data-lesson-decoration', '');
    link.className = 'lesson-related-link';
    link.textContent = language === 'fa' ? target.title : target.titleEn;
    link.setAttribute('href', `/app/knowledge?docId=${encodeURIComponent(target.documentId)}`);
    link.setAttribute('data-doc-link', target.documentId);
    span.before(link);
  }
  if (missing) {
    const notice = document.createElement('p');
    notice.setAttribute('data-lesson-decoration', '');
    notice.className = 'lesson-related-unavailable';
    notice.textContent = language === 'fa' ? `${missing} پیوند در منبع فعلی نگاشت نشده است؛ شناسه‌ها در مشخصات فنی حفظ شده‌اند.` : `${missing} source links are not mapped; their IDs are kept in technical details.`;
    value.prepend(notice);
  }
}
