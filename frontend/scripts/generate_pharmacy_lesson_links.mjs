/** Reproducible links to existing source documents only; ambiguous aliases are omitted. */
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
const root = process.cwd();
const temp = await mkdtemp(path.join(tmpdir(), 'pharmacy-links-'));
try {
  const outfile = path.join(temp, 'seed.cjs');
  await build({ stdin: { contents: "export { PHARMACY_SEED_DOCUMENTS as documents } from './src/lib/pharmacySeedData';", resolveDir: root }, outfile, bundle: true, platform: 'node', format: 'cjs', logLevel: 'silent' });
  const { documents } = createRequire(import.meta.url)(outfile);
  const aliases = new Map();
  const canonical = {};
  for (const doc of documents) {
    const target = { documentId: doc.id, title: doc.title, titleEn: doc.title_en || doc.title };
    canonical[doc.id] = target;
    const dom = new JSDOM(doc.content_en || doc.content_html);
    const first = dom.window.document.querySelector('.knowledge-card > dl > div');
    const label = first?.querySelector(':scope > dt')?.textContent.trim();
    const explicit = /^(ID|Class code|شناسه|کد رده)$/i.test(label || '') ? first.querySelector(':scope > dd')?.textContent.trim() : null;
    const inferred = doc.id.replace(/^doc-(?:core-disease|disease|mechanism|concept|product|scenario|clinical-domain|practice-question|study-track|cal|storage|cyp)-/, '');
    for (const alias of new Set([explicit, inferred].filter(Boolean))) {
      const prior = aliases.get(alias);
      aliases.set(alias, prior === undefined || prior?.documentId === target.documentId ? target : null);
    }
    dom.window.close();
  }
  const links = { ...Object.fromEntries([...aliases].filter(([, target]) => target).map(([alias, target]) => [alias, target.documentId])), ...Object.fromEntries(Object.keys(canonical).map(id => [id, id])) };
  const sorted = Object.fromEntries(Object.entries(links).sort(([a], [b]) => a.localeCompare(b)));
  await writeFile(path.join(root, 'src/lib/pharmacyLessonLinks.generated.json'), JSON.stringify({ aliases: sorted, documents: Object.fromEntries(Object.entries(canonical).map(([id, target]) => [id, { title: target.title, titleEn: target.titleEn }])) }) + '\n');
  console.log(`Generated ${Object.keys(sorted).length} verified aliases for ${documents.length} documents.`);
} finally { await rm(temp, { recursive: true, force: true }); }
