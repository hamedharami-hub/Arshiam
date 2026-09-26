import { describe, expect, it } from 'vitest';
import { renderSourceValue } from '../../scripts/pharmacySeedRenderer.mjs';
import { sanitizeKnowledgeHtml } from './knowledgeHtmlSanitizer';
import { PHARMACY_SEED_DOCUMENTS } from './pharmacySeedData';

const labels = { redFlags: ['علائم هشدار', 'Red flags'], title: ['عنوان', 'Title'] };

describe('pharmacy seed localized rendering', () => {
  it('selects the requested locale from bilingual array fields', () => {
    const html = renderSourceValue({ redFlags: { fa: ['فارسی'], en: ['English red flag'] } }, 'en', labels);

    expect(html).toContain('English red flag');
    expect(html).not.toContain('فارسی');
    expect(html).not.toContain('<dt>fa</dt>');
    expect(html).not.toContain('<dt>en</dt>');
  });

  it('shows an explicit, correctly directed fallback when the selected locale is missing', () => {
    const html = renderSourceValue({ redFlags: { fa: ['هشدار فارسی'] } }, 'en', labels);

    expect(html).toContain('English translation is unavailable');
    expect(html).toContain('lang="fa" dir="rtl"');
    expect(html).toContain('هشدار فارسی');
    expect(html).not.toContain('<dt>fa</dt>');
  });

  it('marks a lone opposite-language suffixed field as a fallback', () => {
    const html = renderSourceValue({ titleFa: 'عنوان فارسی' }, 'en', labels);

    expect(html).toContain('English translation is unavailable');
    expect(html).toContain('lang="fa" dir="rtl"');
    expect(html).toContain('عنوان فارسی');
    expect(html).toContain('<dt class="font-semibold text-foreground mb-1">Title</dt>');
  });

  it('retains explicit fallback language and direction through the app HTML sanitizer', () => {
    const html = renderSourceValue({ summary: { fa: 'متن فارسی' } }, 'en', labels);
    const sanitized = sanitizeKnowledgeHtml(html);

    expect(sanitized).toContain('lang="fa" dir="rtl"');
    expect(sanitized).toContain('English translation is unavailable');
    expect(sanitized).toContain('متن فارسی');
  });

  it('uses the opposite field when the preferred paired field is empty, without duplicating either', () => {
    const html = renderSourceValue({ titleFa: 'متن فارسی', titleEn: '' }, 'en', labels);

    expect(html).toContain('English translation is unavailable');
    expect(html).toContain('متن فارسی');
    expect(html.match(/متن فارسی/g)).toHaveLength(1);
  });

  it('escapes source strings while retaining intentionally mixed-language arrays', () => {
    const html = renderSourceValue({ title: '<script>alert("x")</script>', synonyms: ['سینونیم', 'synonym'] }, 'en', labels);

    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('سینونیم');
    expect(html).toContain('synonym');
  });

  it('keeps the imported clinical disease documents language-pure in their selected locale', () => {
    const diseaseDocs = PHARMACY_SEED_DOCUMENTS.filter((doc) => doc.id.startsWith('doc-core-disease-'));

    expect(diseaseDocs).toHaveLength(15);
    expect(diseaseDocs.every((doc) => !/<dt[^>]*>(?:fa|en)<\/dt>/.test(doc.content_en))).toBe(true);

    const asthma = diseaseDocs.find((doc) => doc.id === 'doc-core-disease-dis-asthma');
    expect(asthma?.content_en).toContain('Inability to complete sentences in one breath');
    expect(asthma?.content_en).not.toContain('استفاده از عضلات فرعی تنفس');
    expect(asthma?.content_html).toContain('استفاده از عضلات فرعی تنفس');
  });

  it('uses human-readable bilingual field labels instead of exposing source keys', () => {
    const asthma = PHARMACY_SEED_DOCUMENTS.find((doc) => doc.id === 'doc-core-disease-dis-asthma');

    expect(asthma?.content_html).toContain('شناسهٔ دسته‌بندی');
    expect(asthma?.content_en).toContain('Category ID');
    expect(asthma?.content_html).toContain('مقدار و روش مصرف');
    expect(asthma?.content_en).toContain('Dose and directions');
  });
});
