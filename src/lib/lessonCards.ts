import { normalizeLessonLabel, getLessonTemplate, TEMPLATE_GROUPS, isTechnicalLessonField, templateCardGroup } from './lessonTemplates';
import { decorateLessonBody } from './lessonBodyPresentation';
export type LessonCardKind = 'overview' | 'mechanism' | 'use' | 'safety' | 'practice' | 'reference' | 'metadata';
export type LessonCardGroup = 'understand' | 'apply' | 'safety' | 'practice' | 'reference' | 'identity' | 'symptoms' | 'counselling' | 'label' | 'rules' | 'language' | 'assessment' | 'decision' | 'comparison' | 'milestones';
export interface LessonContentCard {
  id: string;
  title: string;
  kind: LessonCardKind;
  group: LessonCardGroup;
  html: string;
  sourceHtml: string;
  wide: boolean;
  safetyProtected?: boolean;
  wholeDocument?: boolean;
  introduction?: boolean;
  sourceGroup?: LessonCardGroup;
  comparison?: { id: string; title: string };
}

export const LESSON_GROUPS: { id: LessonCardGroup; fa: string; en: string }[] = [
  { id: 'understand', fa: 'شناخت موضوع', en: 'Understand' },
  { id: 'safety', fa: 'ایمنی و هشدارها', en: 'Safety' },
  { id: 'apply', fa: 'کاربرد و جزئیات', en: 'Application' },
  { id: 'practice', fa: 'تمرین و ارتباط', en: 'Practice & connections' },
  { id: 'reference', fa: 'منابع و مشخصات', en: 'Sources & details' },
];

export function classifyLessonCard(title: string): { kind: LessonCardKind; group: LessonCardGroup } {
  if (/related.*(?:ids|items)|شناسه.*مرتبط/i.test(title)) return { kind: 'practice', group: 'practice' };
  if (isTechnicalLessonField(title)) return { kind: 'metadata', group: 'reference' };
  if (/^(شناسه|شمارهٔ مسیر|نام آیکون|نوع آیکون|رنگ برچسب|ردهٔ رنگ|شناسهٔ.*|عنوان|نام|برچسب|درس اصلی|id|.*\bid\b|icon|icon name|icon type|badge color|color class|title|name|badge|main lesson)$/i.test(title.trim())) return { kind: 'metadata', group: 'reference' };
  if (/هشدار|منع مصرف|احتیاط|عوارض|سمیت|ایمنی|ارجاع|علائم خطر|پرچم.*قرمز|safety|red flag|warning|contraindicat|precaution|caution|adverse|toxic|referral|interaction|cautionary|advisory label|cal labels|تداخل/i.test(title)) return { kind: 'safety', group: 'safety' };
  if (/منبع|منابع|بازبینی|reference|source|review evidence/i.test(title)) return { kind: 'reference', group: 'reference' };
  if (/تمرین|پرسش|گزینه|پاسخ|سناریو|مکالمه|مثال|مراحل|مسیر یادگیری|practice|question|answer|option|case|dialogue|example|step|track/i.test(title)) return { kind: 'practice', group: 'practice' };
  if (/مکانیسم|مسیر.*سلول|پاتوفیزیولوژی|mechanism|pathophysiology|pathway/i.test(title)) return { kind: 'mechanism', group: 'understand' };
  if (/مصرف|کاربرد|درمان|دوز|تداخل|نگهداری|مشاوره|مادهٔ|بسته|indication|dose|dosing|use|treatment|interaction|storage|counsel|ingredient|pack|pharmacotherap/i.test(title)) return { kind: 'use', group: 'apply' };
  return { kind: 'overview', group: 'understand' };
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(36);
}

function getTitleElement(block: Element): Element | null {
  if (/^H[1-6]$/.test(block.tagName)) return block;
  const dt = block.querySelector(':scope > dt');
  if (dt) return dt;
  const heading = block.querySelector('h2,h3,h4');
  if (heading && !heading.closest('table,blockquote,pre')) return heading;
  // Older seed pages use a styled div for a section title rather than a heading.
  return Array.from(block.querySelectorAll('div,p,span')).find(child => /font-(bold|semibold|black)/.test(child.className) && child.textContent.trim().length > 0 && child.textContent.trim().length < 180 && !child.closest('table,a,button')) ?? null;
}

/** Presentation adapter only: keeps source blocks intact; never writes or rewrites a document. */
export function buildLessonCards(safeHtml: string, language: 'fa' | 'en', documentId?: string, visibleTitles: (string | undefined)[] = []): LessonContentCard[] {
  if (typeof document === 'undefined') return [];
  const container = document.createElement('div');
  container.innerHTML = safeHtml;
  const root = container.querySelector('.knowledge-card');
  if (!root || container.children.length !== 1 || container.firstElementChild !== root) return [];
  if (Array.from(container.childNodes).some(node => node.nodeType === 3 && node.textContent.trim())) return [];
  // Unsupported loose text must remain in the original renderer, never disappear in extraction.
  if (Array.from(root.childNodes).some(node => node.nodeType === 3 && node.textContent.trim())) return [];
  const template = getLessonTemplate(documentId);
  const whole = (): LessonContentCard[] => {
    const title = visibleTitles[language === 'fa' ? 0 : 1] || visibleTitles[0] || getTitleElement(root)?.textContent.trim() || (language === 'fa' ? 'مطلب' : 'Lesson');
    const clone = root.cloneNode(true) as Element;
    decorateLessonBody(clone, language, title);
    for (const element of Array.from(clone.querySelectorAll('h1,h2,h3,div,span'))) {
      if (!element.children.length && !element.id && !element.hasAttribute('data-doc-link') &&
        visibleTitles.some(visible => visible && normalizeLessonLabel(visible) === normalizeLessonLabel(element.textContent)) &&
        (/^H[1-6]$/.test(element.tagName) || /font-(bold|semibold|black)/.test(element.className))) element.classList.add('lesson-duplicate-title');
    }
    return [{ id: `card-whole-${documentId || hashText(safeHtml)}`, title, kind: 'overview', group: TEMPLATE_GROUPS[template][0].id, sourceHtml: safeHtml, html: clone.outerHTML, wide: true, wholeDocument: true,
      safetyProtected: Array.from(root.querySelectorAll('h2,h3,h4,dt,strong,.font-bold,.font-semibold,.font-black')).some(element => classifyLessonCard(element.textContent).kind === 'safety') || template === 'label' }];
  };
  // Identify authored topics, not nested record labels or table column names.
  const headingLevel = root.querySelector('h2:not(header h2)') ? 'h2' : 'h3';
  const topicHeadings = Array.from(root.querySelectorAll(headingLevel)).filter(heading => !heading.closest('header,dl,table,blockquote,pre') && !(template === 'cyp' && heading.closest('.grid')));
  const fields = Array.from(root.querySelectorAll(':scope > dl > div > dt')).map(field => normalizeLessonLabel(field.textContent));
  const mechanismRecord = fields.some(field => /^(action classification|action type|cellular effect|نوع اثر|طبقه بندی اثر|اثر سلولی)$/.test(field));
  const simpleMonograph = template === 'medicine' && !fields.length && root.children.length >= 3 && root.children.length <= 5 &&
    /therapeutic indications|موارد مصرف/.test(root.children[1].textContent.toLowerCase()) &&
    /counsel|مشاوره/.test(root.lastElementChild.textContent.toLowerCase());
  const atomic = ['label', 'storage', 'concept', 'prescription'].includes(template);
  const academicContext = template === 'academic' && root.children.length === 3 &&
    /^(module|ماژول)\s*[۱-۶1-6]/i.test(root.firstElementChild.textContent.trim()) &&
    /pearl|نکته.*کلیدی|نکته.*اجرایی/.test(root.children[1].textContent.toLowerCase());
  // A single law/label/record remains whole, regardless of its length. Multiple
  // explicit topic headings always take precedence, including short legal lessons.
  // Academic pearl + body/table is one context, not three unrelated navigation tabs.
  if (topicHeadings.length < 2 && (atomic || mechanismRecord || simpleMonograph || academicContext)) return whole();

  // Nested authored headings are sliced by the range-based section renderer,
  // rather than naming an entire multi-topic body after its first heading.
  if (Array.from(root.children).some(child => topicHeadings.filter(heading => child.contains(heading)).length > 1)) return [];

  const blocks: Element[] = [];
  const comparisons = new WeakMap<Element, { id: string; title: string }>();
  let headingSection: Element | null = null;
  for (const block of Array.from(root.children)) {
    const roles = Array.from(block.children);
    if (template === 'cyp' && block.classList.contains('grid') && roles.length > 1 && roles.every(role => getTitleElement(role))) {
      const title = roles.map(role => getTitleElement(role).textContent.trim()).join(' · ');
      const comparison = { id: `comparison-${hashText(title)}`, title };
      roles.forEach(role => { comparisons.set(role, comparison); blocks.push(role); });
      continue;
    }
    if (block.tagName.toLowerCase() === headingLevel) {
      headingSection = document.createElement('section');
      headingSection.append(block.cloneNode(true)); blocks.push(headingSection); continue;
    }
    if (headingSection) { headingSection.append(block.cloneNode(true)); continue; }
    if (block.tagName === 'DL') {
      if (Array.from(block.childNodes).some(node => node.nodeType === 3 && node.textContent.trim())) return [];
      if (!Array.from(block.children).every(child => child.querySelector(':scope > dt') && child.querySelector(':scope > dd'))) return [];
      blocks.push(...Array.from(block.children));
    }
    else blocks.push(block);
  }
  // Untitled prose is supporting context. Keep it with its preceding topic;
  // an unrecognised leading structure stays whole rather than inventing a title.
  for (let index = 0; index < blocks.length; index++) {
    if (getTitleElement(blocks[index]) || blocks[index].querySelector('table')) continue;
    if (index === 0) return whole();
    const section = document.createElement('section');
    section.append(blocks[index - 1].cloneNode(true), blocks[index].cloneNode(true));
    blocks.splice(index - 1, 2, section); index--;
  }
  if (blocks.filter(block => block.textContent.trim() || block.querySelector('img,table,video,audio')).length < 2) return whole();
  const occurrences = new Map<string, number>();
  const usedIds = new Set<string>();
  return blocks.filter(block => block.textContent.trim() || block.querySelector('img,table,video,audio')).map((block, index) => {
    const titleElement = getTitleElement(block);
    const tableTitle = block.querySelector('th')?.textContent.trim();
    const gridTitles = block.classList.contains('grid') ? Array.from(block.children).map(child => getTitleElement(child)?.textContent.trim()).filter(Boolean) : [];
    const title = (gridTitles.length > 1 ? gridTitles.join(' · ') : titleElement?.textContent.trim()) || (tableTitle
      ? (language === 'fa' ? `جدول: ${tableTitle}` : `Table: ${tableTitle}`)
      : language === 'fa' ? `مطالعهٔ بخش ${index + 1}` : `Reading ${index + 1}`);
    let { kind, group: defaultGroup } = block.tagName === 'HEADER' && /\bSource:/i.test(block.textContent)
      ? { kind: 'metadata' as const, group: 'reference' as const }
      : classifyLessonCard(title);
    if (template === 'academic' && tableTitle && !titleElement && kind !== 'safety') { kind = 'overview'; defaultGroup = 'comparison'; }
    // Known academic introductions contain only a module label and the exact visible lesson title.
    // Custom/richer introductions stay in the reading flow.
    const introChildren = Array.from(block.children);
    if (template === 'academic' && index === 0 && !Array.from(block.childNodes).some(node => node.nodeType === 3 && node.textContent.trim()) && introChildren.length === 2 && introChildren.every(child => child.children.length === 0) && /^(module|ماژول)\s+[1-6]/i.test(introChildren[0].textContent.trim()) && visibleTitles.some(visible => visible && normalizeLessonLabel(visible) === normalizeLessonLabel(introChildren[1].textContent))) {
      kind = 'metadata'; defaultGroup = 'reference';
    }
    const value = block.querySelector(':scope > dd');
    if (/^(class name|نام رده دارویی)$/.test(normalizeLessonLabel(title)) && value && visibleTitles.some(visible => visible && normalizeLessonLabel(visible) === normalizeLessonLabel(value.textContent))) {
      kind = 'metadata'; defaultGroup = 'reference';
    }
    const group = templateCardGroup(template, title, kind, defaultGroup);
    const safetyProtected = kind === 'safety' || Array.from(block.querySelectorAll('dt,h2,h3,h4,strong,.font-bold,.font-semibold,.font-black')).some(element => classifyLessonCard(element.textContent.trim()).kind === 'safety');
    const sourceHtml = block.outerHTML;
    const clone = block.cloneNode(true) as Element;
    const cloneTitle = getTitleElement(clone);
    // Keep links/IDs and rich title content in the body when removing it would lose an anchor.
    if (gridTitles.length < 2 && cloneTitle && cloneTitle !== clone && !cloneTitle.id && !cloneTitle.querySelector('a,img,[id],[data-doc-link]')) cloneTitle.remove();
    // Only the outer frame is replaced. Nested scientific emphasis and data attributes stay intact.
    const sourceGrid = clone.classList.contains('grid');
    clone.removeAttribute('class');
    if (sourceGrid) clone.classList.add('lesson-record-grid');
    if (template !== 'general') decorateLessonBody(clone, language, title);
    const hash = hashText(title);
    const ordinal = occurrences.get(hash) ?? 0;
    occurrences.set(hash, ordinal + 1);
    const baseId = `card-${block.id || `${hash}${ordinal ? `-${ordinal}` : ''}`}`;
    let id = baseId;
    let suffix = 1;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);
    return {
      id,
      title, kind, group, comparison: comparisons.get(block), safetyProtected: safetyProtected || comparisons.has(block), sourceHtml, html: clone.outerHTML,
      wide: (template === 'cyp' && group === 'identity') || kind === 'safety' || !!block.querySelector('table,pre') || block.textContent.length > 1600,
    };
  });
}
