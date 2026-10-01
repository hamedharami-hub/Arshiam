export type LessonCardKind = 'overview' | 'mechanism' | 'use' | 'safety' | 'practice' | 'reference' | 'metadata';
export type LessonCardGroup = 'understand' | 'apply' | 'safety' | 'practice' | 'reference';
export interface LessonContentCard {
  id: string;
  title: string;
  kind: LessonCardKind;
  group: LessonCardGroup;
  html: string;
  sourceHtml: string;
  wide: boolean;
}

export const LESSON_GROUPS: { id: LessonCardGroup; fa: string; en: string }[] = [
  { id: 'understand', fa: 'شناخت موضوع', en: 'Understand' },
  { id: 'safety', fa: 'ایمنی و هشدارها', en: 'Safety' },
  { id: 'apply', fa: 'کاربرد و جزئیات', en: 'Application' },
  { id: 'practice', fa: 'تمرین و ارتباط', en: 'Practice & connections' },
  { id: 'reference', fa: 'منابع و مشخصات', en: 'Sources & details' },
];

export function classifyLessonCard(title: string): { kind: LessonCardKind; group: LessonCardGroup } {
  if (/^(شناسه|شمارهٔ مسیر|نام آیکون|نوع آیکون|رنگ برچسب|ردهٔ رنگ|شناسهٔ.*|عنوان|نام|نام ردهٔ دارویی|زیرعنوان|برچسب|درس اصلی|id|.*\bid\b|icon|icon name|icon type|badge color|color class|title|name|subtitle|badge|main lesson)$/i.test(title.trim())) return { kind: 'metadata', group: 'reference' };
  if (/هشدار|منع مصرف|احتیاط|عوارض|سمیت|ارجاع|red flag|warning|contraindicat|precaution|adverse|toxicity|referral/i.test(title)) return { kind: 'safety', group: 'safety' };
  if (/منبع|منابع|بازبینی|reference|source|review evidence/i.test(title)) return { kind: 'reference', group: 'reference' };
  if (/تمرین|پرسش|گزینه|پاسخ|سناریو|مکالمه|مثال|مراحل|مسیر یادگیری|practice|question|answer|option|case|dialogue|example|step|track/i.test(title)) return { kind: 'practice', group: 'practice' };
  if (/مکانیسم|مسیر.*سلول|پاتوفیزیولوژی|mechanism|pathophysiology|pathway/i.test(title)) return { kind: 'mechanism', group: 'understand' };
  if (/مصرف|کاربرد|درمان|دوز|تداخل|نگهداری|مشاوره|مادهٔ|بسته|indication|dose|dosing|use|treatment|interaction|storage|counsel|ingredient|pack/i.test(title)) return { kind: 'use', group: 'apply' };
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
export function buildLessonCards(safeHtml: string, language: 'fa' | 'en'): LessonContentCard[] {
  if (typeof document === 'undefined') return [];
  const container = document.createElement('div');
  container.innerHTML = safeHtml;
  const root = container.querySelector('.knowledge-card');
  if (!root || container.children.length !== 1 || container.firstElementChild !== root) return [];
  if (Array.from(container.childNodes).some(node => node.nodeType === 3 && node.textContent.trim())) return [];
  // Unsupported loose text must remain in the original renderer, never disappear in extraction.
  if (Array.from(root.childNodes).some(node => node.nodeType === 3 && node.textContent.trim())) return [];
  const blocks: Element[] = [];
  for (const block of Array.from(root.children)) {
    if (block.tagName === 'DL') {
      if (Array.from(block.childNodes).some(node => node.nodeType === 3 && node.textContent.trim())) return [];
      if (!Array.from(block.children).every(child => child.querySelector(':scope > dt') && child.querySelector(':scope > dd'))) return [];
      blocks.push(...Array.from(block.children));
    }
    else blocks.push(block);
  }
  if (blocks.filter(block => block.textContent.trim() || block.querySelector('img,table,video,audio')).length < 2) return [];
  const occurrences = new Map<string, number>();
  const usedIds = new Set<string>();
  return blocks.filter(block => block.textContent.trim() || block.querySelector('img,table,video,audio')).map((block, index) => {
    const titleElement = getTitleElement(block);
    const tableTitle = block.querySelector('th')?.textContent.trim();
    const title = titleElement?.textContent.trim() || (tableTitle
      ? (language === 'fa' ? `جدول: ${tableTitle}` : `Table: ${tableTitle}`)
      : language === 'fa' ? `مطالعهٔ بخش ${index + 1}` : `Reading ${index + 1}`);
    const { kind, group } = block.tagName === 'HEADER' && /\bSource:/i.test(block.textContent)
      ? { kind: 'metadata' as const, group: 'reference' as const }
      : classifyLessonCard(title);
    const sourceHtml = block.outerHTML;
    const clone = block.cloneNode(true) as Element;
    const cloneTitle = getTitleElement(clone);
    // Keep links/IDs and rich title content in the body when removing it would lose an anchor.
    if (cloneTitle && cloneTitle !== clone && !cloneTitle.id && !cloneTitle.querySelector('a,img,[id],[data-doc-link]')) cloneTitle.remove();
    // Only the outer frame is replaced. Nested scientific emphasis and data attributes stay intact.
    clone.removeAttribute('class');
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
      title, kind, group, sourceHtml, html: clone.outerHTML,
      wide: kind === 'safety' || !!block.querySelector('table,pre') || block.textContent.length > 1600,
    };
  });
}
