import type { LessonCardGroup, LessonCardKind } from './lessonCards';

export type LessonTemplate = 'general' | 'clinical' | 'mechanism' | 'concept' | 'cyp' | 'medicine' | 'label' | 'storage' | 'domain' | 'scenario' | 'prescription' | 'academic' | 'pathway' | 'quiz';
export interface LessonGroupSpec { id: LessonCardGroup; fa: string; en: string }

const group = (id: LessonCardGroup, fa: string, en: string): LessonGroupSpec => ({ id, fa, en });
const identity = group('identity', 'شناخت موضوع', 'Overview');
const safety = group('safety', 'ایمنی و هشدارها', 'Safety');
const references = group('reference', 'منابع و مشخصات', 'Sources & details');
const connections = group('practice', 'تمرین و ارتباط', 'Practice & connections');
const application = group('apply', 'کاربرد و جزئیات', 'Application');
export const TEMPLATE_GROUPS: Record<LessonTemplate, LessonGroupSpec[]> = {
  general: [group('understand', 'شناخت موضوع', 'Understand'), safety, application, connections, references],
  clinical: [identity, group('symptoms', 'علائم و ارزیابی', 'Symptoms & assessment'), safety, group('apply', 'درمان و مشاوره', 'Treatment & counselling'), connections, references],
  mechanism: [identity, group('understand', 'هدف، فرایند و اثر', 'Target, process & effect'), safety, group('apply', 'اهمیت بالینی', 'Clinical relevance'), connections, references],
  concept: [identity, group('understand', 'مفهوم و مکانیسم', 'Concept & mechanism'), safety, application, connections, references],
  cyp: [identity, group('understand', 'نقش‌ها در متابولیسم', 'Metabolic roles'), safety, application, connections, references],
  medicine: [identity, group('apply', 'مصرف و کاربرد', 'Use & indications'), safety, group('counselling', 'مشاوره و نگهداری', 'Counselling & storage'), connections, references],
  label: [identity, group('label', 'متن برچسب و کاربرد', 'Label text & use'), safety, connections, references],
  storage: [identity, group('rules', 'قواعد نگهداری', 'Storage requirements'), safety, application, connections, references],
  domain: [identity, group('understand', 'حوزه‌ها و زیرشاخه‌ها', 'Domains & subtopics'), safety, application, connections, references],
  scenario: [identity, group('language', 'موقعیت و زبان بیمار', 'Context & patient language'), group('assessment', 'گفت‌وگو و ارزیابی', 'Conversation & assessment'), safety, group('decision', 'تصمیم و مشاوره', 'Decision & counselling'), connections, references],
  prescription: [identity, group('assessment', 'بررسی نسخه', 'Prescription assessment'), safety, group('decision', 'اقدام و ارتباط', 'Action & communication'), connections, references],
  academic: [identity, group('understand', 'مفهوم‌های درس', 'Lesson concepts'), group('comparison', 'مقایسه و جدول‌ها', 'Comparisons & tables'), safety, application, connections, references],
  pathway: [identity, group('milestones', 'مرحله‌های یادگیری', 'Learning milestones'), safety, connections, references],
  quiz: [identity, safety, connections, references],
};

export function getLessonTemplate(documentId?: string): LessonTemplate {
  if (!documentId) return 'general';
  const routes: [RegExp, LessonTemplate][] = [
    [/^doc-(?:core-disease|disease)-/, 'clinical'], [/^doc-mechanism-/, 'mechanism'],
    [/^doc-concept-/, 'concept'], [/^doc-cyp-/, 'cyp'], [/^doc-product-/, 'medicine'],
    [/^doc-cal-/, 'label'], [/^doc-storage-/, 'storage'], [/^doc-clinical-domain-/, 'domain'],
    [/^doc-scenario-/, 'scenario'], [/^doc-script-/, 'prescription'], [/^doc-m\d+-sec/, 'academic'],
    [/^doc-study-track-/, 'pathway'], [/^doc-practice-question-/, 'quiz'],
  ];
  return routes.find(([pattern]) => pattern.test(documentId))?.[1] ?? 'general';
}

export function normalizeLessonLabel(value: string): string {
  return value.toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u200f\u200e]/g, ' ').replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
}

/** Exact field labels only; a clinical sentence mentioning an ID is not technical metadata. */
export function isTechnicalLessonField(label: string): boolean {
  if (/related|مرتبط/.test(normalizeLessonLabel(label))) return false;
  return /^(id|.* id|class code|track number|primary module|icon(?: name| type)?|badge color|color class|شناسه(?: .*)?|شماره مسیر|درس اصلی|نام آیکون|نوع آیکون|رنگ برچسب|رده رنگ|کد رده)$/.test(normalizeLessonLabel(label));
}

export function templateCardGroup(template: LessonTemplate, title: string, kind: LessonCardKind, fallback: LessonCardGroup): LessonCardGroup {
  if (template === 'general' || kind === 'metadata' || kind === 'reference' || kind === 'safety') return fallback;
  const label = normalizeLessonLabel(title);
  if (/related|linked|مرتبط|پیوند|فرآورده.*قفسه/.test(label)) return 'practice';
  if (template === 'mechanism' && /^pharmacological class\b/.test(label)) return 'identity';
  if (template === 'cyp' && /^(hepatic metabolic pathway|مسیر متابولیسم)/.test(label)) return 'identity';
  if (template === 'clinical' && /symptom|pathophysiology|diagnos|assessment|علائم|نشانه|پاتوفیزیولوژی|تشخیص|ارزیابی/.test(label)) return 'symptoms';
  if (template === 'mechanism' && /target|cellular|action|effect|mechanism|هدف|محل اثر|سلول|اثر|عملکرد|مکانیسم/.test(label)) return 'understand';
  if (template === 'mechanism' && /clinical relevance|اهمیت بالینی|ارتباط بالینی/.test(label)) return 'apply';
  if (template === 'cyp' && /inhibitor|inducer|substrate|مهارکننده|القاکننده|سوبسترا/.test(label)) return 'understand';
  if (template === 'medicine' && /counsel|storage|مشاوره|نگهداری/.test(label)) return 'counselling';
  if (template === 'label' && /label text|متن.*برچسب/.test(label)) return 'label';
  if (template === 'storage' && /schedule|storage|law|نگهداری|قانون/.test(label)) return 'rules';
  if (template === 'domain' && /subcategor|زیرشاخه|زیرگروه|زیردسته/.test(label)) return 'understand';
  if (template === 'scenario') {
    if (/assessment|question|interrogation|ارزیابی|سوال|سؤال|پرسش/.test(label)) return 'assessment';
    if (/counsel|decision|recommend|outcome|plan|مشاوره|تصمیم|توصیه|نتیجه|برنامه/.test(label)) return 'decision';
    if (/presentation|context|terms|language|مراجعه|موقعیت|اصطلاح|زبان|شرح حال/.test(label)) return 'language';
  }
  if (template === 'prescription' && /assess|check|version|prescription|بررسی|نسخه/.test(label)) return 'assessment';
  if (template === 'prescription' && /action|communication|اقدام|ارتباط/.test(label)) return 'decision';
  if (template === 'academic' && /table|comparison|جدول|مقایسه/.test(label)) return 'comparison';
  if (template === 'academic' && kind === 'mechanism') return 'understand';
  if (template === 'pathway' && /milestone|مرحله|مراحل/.test(label)) return 'milestones';
  if (fallback === 'understand') return template === 'concept' ? 'understand' : 'identity';
  if (TEMPLATE_GROUPS[template].some(group => group.id === fallback)) return fallback;
  return template === 'scenario' || template === 'prescription' ? 'decision' : template === 'label' ? 'label' : 'identity';
}
