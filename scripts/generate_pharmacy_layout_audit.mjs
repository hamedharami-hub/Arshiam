/** Read-only inventory of source presentation; never certifies clinical accuracy or writes account data. */
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = process.cwd(), temp = await mkdtemp(path.join(tmpdir(), 'pharmacy-layouts-'));
const dom = new JSDOM('');
globalThis.window = dom.window; globalThis.document = dom.window.document;
try {
  const outfile = path.join(temp, 'audit.cjs');
  await build({ stdin: { contents: `export * from './src/lib/lessonCards'; export * from './src/lib/lessonTemplates'; export * from './src/lib/lessonQuiz'; export * from './src/lib/knowledgeHtmlSanitizer'; export * from './src/lib/pharmacySeedData'; export * from './src/lib/pharmacyClinicalEditorialOverrides'; export * from './src/lib/pharmacyPbsEditorialOverrides';`, resolveDir: root }, outfile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
  const api = createRequire(import.meta.url)(outfile);
  const seed = api.applyPharmacyPbsEditorialOverrides(api.applyPharmacyClinicalEditorialOverrides(api));
  const folders = new Map(seed.PHARMACY_SEED_FOLDERS.map(folder => [folder.id, folder]));
  const clean = text => String(text).replace(/\s+/g, ' ').replace(/\|/g, '\\|').replace(/`/g, "'").trim();
  const plain = html => { const node = document.createElement('div'); node.innerHTML = html; node.querySelectorAll('[data-lesson-decoration]').forEach(element => element.remove()); return node.textContent.replace(/\s+/g, ''); };
  const folderPath = id => { const seen = new Set(), names = []; while (id && !seen.has(id)) { seen.add(id); const folder = folders.get(id); if (!folder) break; names.unshift(folder.name); id = folder.parent_id; } return names.slice(1).join(' ← '); };
  const rows = [], statistics = { lessons: 0, preserved: 0, languageGroupMismatch: 0, fallback: 0, unknownLinks: 0, byTemplate: {} };
  for (const lesson of seed.PHARMACY_SEED_DOCUMENTS) {
    const languages = ['fa', 'en'].map(language => {
      const source = api.sanitizeKnowledgeHtml(language === 'fa' ? lesson.content_html : lesson.content_en || lesson.content_html);
      const cards = api.buildLessonCards(source, language, lesson.id, [language === 'fa' ? lesson.title : lesson.title_en || lesson.title]);
      const protectedSource = cards.length === 0 || plain(source) === plain(cards.map(card => card.sourceHtml).join(''));
      const rootNode = document.createElement('div'); rootNode.innerHTML = cards.map(card => card.html).join('');
      const unknown = rootNode.querySelectorAll('.lesson-related-unavailable').length;
      const template = api.getLessonTemplate(lesson.id), groups = api.TEMPLATE_GROUPS[template];
      const names = template === 'quiz' && api.parseLessonQuiz(source) ? (language === 'fa' ? 'پرسش ← گزینه‌ها ← بررسی ← توضیح' : 'Question → Choices → Check → Explanation') : cards.filter(card => card.kind !== 'metadata').map(card => `${card.title} (${groups.find(group => group.id === card.group)?.[language] ?? card.group}${card.wide ? language === 'fa' ? '؛ تمام‌عرض' : '; full width' : ''})`).join(' · ');
      return { names, groups: cards.filter(card => card.kind !== 'metadata').map(card => card.group), protectedSource, fallback: cards.length === 0, unknown };
    });
    statistics.lessons++;
    const preserved = languages.every(language => language.protectedSource);
    if (preserved) statistics.preserved++;
    const mismatch = JSON.stringify(languages[0].groups) !== JSON.stringify(languages[1].groups);
    if (mismatch) statistics.languageGroupMismatch++;
    const templateKey = api.getLessonTemplate(lesson.id);
    const counts = statistics.byTemplate[templateKey] ?? { lessons: 0, mismatches: 0 };
    counts.lessons++; if (mismatch) counts.mismatches++;
    statistics.byTemplate[templateKey] = counts;
    if (languages.some(language => language.fallback)) statistics.fallback++;
    if (languages.some(language => language.unknown)) statistics.unknownLinks++;
    const flags = [preserved ? 'متن مبدأ محفوظ' : 'نیازمند بررسی حفظ متن', ...(mismatch ? ['تطبیق گروه‌های دو زبان لازم'] : []), ...(languages.some(language => language.fallback) ? ['نمای کامل مبدأ'] : []), ...(languages.some(language => language.unknown) ? ['پیوند نگاشت‌نشده در منبع'] : [])];
    rows.push(`| ${clean(lesson.title)}<br>\`${lesson.id}\`<br>${clean(folderPath(lesson.folder_id))} | ${clean(languages[0].names)} | ${clean(languages[1].names)} | ${flags.join('؛ ')} |`);
  }
  const report = `# دفتر چیدمان واقعی درس‌های فارماسی — مرحلهٔ ۳\n\nاین گزارش با \`node scripts/generate_pharmacy_layout_audit.mjs\` از seed و اصلاحات تحریری موجود تولید می‌شود. بررسی ساختاری و کنترل تطبیق متن است؛ مشاهدهٔ دستی تمام درس‌ها، تأیید علمی، سلامت کامل لینک‌ها یا آزمایش حساب واقعی نیست. کارت‌های پرسش در نمای تمرین از قالب جدا استفاده می‌کنند. نام‌های جدول از خود منبع آمده‌اند.\n\nدرس‌ها: **${statistics.lessons}**؛ متن مبدأ محفوظ: **${statistics.preserved}**؛ تفاوت گروه/ترتیب دو زبان: **${statistics.languageGroupMismatch}**؛ نیازمند نمای کامل: **${statistics.fallback}**؛ درس دارای پیام پیوند نگاشت‌نشده: **${statistics.unknownLinks}**. تفاوت دو زبان باید بررسی شود؛ الزاماً ایراد علمی نیست. شناسهٔ مستقل از زبان و مدل دائمی کارت در مرحلهٔ ۴ است.\n\n| درس و مسیر | کارت‌ها و گروه‌ها: فارسی | کارت‌ها و گروه‌ها: انگلیسی | بازبینی باقی‌مانده |\n|---|---|---|---|\n${rows.join('\n')}\n`;
  await writeFile(path.join(root, 'docs/PHARMACY_LESSON_LAYOUT_AUDIT.fa.md'), report);
  console.log(JSON.stringify(statistics));
} finally { dom.window.close(); await rm(temp, { recursive: true, force: true }); }
