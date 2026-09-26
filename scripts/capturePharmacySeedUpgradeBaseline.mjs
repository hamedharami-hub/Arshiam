import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(scriptDir, '..');
const baselineCommit = '7631423db836bb6fa792fa98b116b1e25f1fedaa';
const outputPath = path.join(repoDir, 'src/lib/pharmacySeedUpgradeBaseline.ts');
const documentIds = new Set([
  'doc-disease-nasal_congestion',
  'doc-concept-concept-project-stop',
  'doc-product-prod-sudafed-sinus-decongestant',
  'doc-scenario-clinical-s3-pseudoephedrine',
  'doc-scenario-clinical-s3-pseudoephedrine-conflict',
  'doc-m2-sec3',
  'doc-m3-sec2',
  'doc-clinical-domain-cat-1',
]);

if (fs.existsSync(outputPath)) {
  throw new Error(`Refusing to overwrite existing baseline: ${outputPath}`);
}

const source = execFileSync(
  'git',
  ['show', `${baselineCommit}:src/lib/pharmacySeedData.ts`],
  { cwd: repoDir, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
);

function readArray(name, typeName) {
  const marker = `export const ${name}: ${typeName}[] = [`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Could not find ${name} in ${baselineCommit}.`);
  const start = markerIndex + marker.length - 1;
  const end = source.indexOf('];', start);
  if (end < 0) throw new Error(`Could not parse ${name} in ${baselineCommit}.`);
  return JSON.parse(source.slice(start, end + 1));
}

const documents = readArray('PHARMACY_SEED_DOCUMENTS', 'KnowledgeDocument')
  .filter((document) => documentIds.has(document.id))
  .map(({ id, title, title_en, folder_id, content_html, content_en, tags, source_url, content_review_status }) => ({
    id, title, title_en, folder_id, content_html, content_en, tags, source_url, content_review_status,
  }));
const cards = readArray('PHARMACY_SEED_CARDS', 'LeitnerCard')
  .filter((card) => card.id === 'card-pharmacy-sample-card-s3-pseudoephedrine')
  .map(({ id, front, back, clue, document_id, folder_id }) => ({
    id, front, back, clue, document_id, folder_id,
  }));

if (documents.length !== documentIds.size || cards.length !== 1) {
  throw new Error(`Unexpected baseline coverage: ${documents.length} documents, ${cards.length} cards.`);
}

const output = `/* Exact pre-correction records captured from ARSHNAZ ${baselineCommit}.
 * The importer uses these only when a remote record still matches authored fields exactly.
 * Personal edits and Leitner review state are preserved.
 */
import type { KnowledgeDocument } from './knowledgeTypes';
import type { LeitnerCard } from './leitnerTypes';

export const PHARMACY_SEED_UPGRADE_DOCUMENT_BASELINES: Array<Pick<KnowledgeDocument,
  'id' | 'title' | 'title_en' | 'folder_id' | 'content_html' | 'content_en' | 'tags' | 'source_url' | 'content_review_status'
>> = ${JSON.stringify(documents, null, 2)};

export const PHARMACY_SEED_UPGRADE_CARD_BASELINES: Array<Pick<LeitnerCard,
  'id' | 'front' | 'back' | 'clue' | 'document_id' | 'folder_id'
>> = ${JSON.stringify(cards, null, 2)};
`;

fs.writeFileSync(outputPath, output, 'utf8');
console.log(`Captured ${documents.length} documents and ${cards.length} Leitner card baselines from ${baselineCommit}.`);
