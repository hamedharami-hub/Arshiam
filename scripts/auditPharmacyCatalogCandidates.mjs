import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pharmacyDir = process.env.PHARMACY_SOURCE_DIR || path.resolve(scriptDir, '../../pharmacy');
const catalogPath = path.resolve(scriptDir, '../src/lib/pharmacyProductCatalogData.ts');
const fields = new Set(['brandName', 'genericName', 'medicineName', 'drugName', 'medicationName', 'productName']);
const aliasFields = new Set(['equivalentBrands']);
const sourceRoots = ['data', 'lib', 'src/data'];

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(fullPath);
    return entry.isFile() && /\.tsx?$/.test(entry.name) ? [fullPath] : [];
  });
}

function valuesIn(filePath) {
  const source = ts.createSourceFile(filePath, fs.readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);
  const values = [];
  function visit(node) {
    if (ts.isPropertyAssignment(node)) {
      const field = node.name.getText(source).replace(/^['"]|['"]$/g, '');
      if (fields.has(field) && ts.isStringLiteralLike(node.initializer)) {
        const name = node.initializer.text.trim();
        if (name) {
          values.push({ name, field, file: path.relative(pharmacyDir, filePath).replaceAll('\\', '/'), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
        }
      }
      if (aliasFields.has(field) && ts.isArrayLiteralExpression(node.initializer)) {
        for (const item of node.initializer.elements) {
          if (!ts.isStringLiteralLike(item) || !item.text.trim()) continue;
          values.push({ name: item.text.trim(), field, file: path.relative(pharmacyDir, filePath).replaceAll('\\', '/'), line: source.getLineAndCharacterOfPosition(item.getStart(source)).line + 1 });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return values;
}

function normalized(name) {
  return name.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

if (!fs.existsSync(path.join(pharmacyDir, 'data/shelf/shelfProducts.ts'))) {
  throw new Error(`Pharmacy source not found: ${pharmacyDir}`);
}
const catalogNames = new Set(valuesIn(catalogPath).map((entry) => normalized(entry.name)));
const mentions = sourceRoots.flatMap((root) => collectFiles(path.join(pharmacyDir, root))).flatMap(valuesIn);
const candidates = new Map();
for (const mention of mentions) {
  const key = normalized(mention.name);
  if (!key || catalogNames.has(key)) continue;
  const existing = candidates.get(key);
  if (existing) existing.sources.push({ file: mention.file, line: mention.line, field: mention.field });
  else candidates.set(key, { name: mention.name, sources: [{ file: mention.file, line: mention.line, field: mention.field }] });
}

const report = {
  source: pharmacyDir,
  catalogNameCount: catalogNames.size,
  structuredMentionsScanned: mentions.length,
  unmatchedCandidateCount: candidates.size,
  // Candidates are evidence to review, not verified medicines or monographs.
  candidates: [...candidates.values()].sort((a, b) => a.name.localeCompare(b.name, 'en')),
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
