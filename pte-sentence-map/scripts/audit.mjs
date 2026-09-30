import fs from 'node:fs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const cards = read('public/data/cards.json').cards;
const questions = read('public/data/questions.json').questions;
const recommendations = read('public/data/recommendations.json').recommendations;
const app = fs.readFileSync('public/app.js', 'utf8');
const html = fs.readFileSync('public/index.html', 'utf8');
const subtopics = [...app.matchAll(/'([A-Z]{3}-\d{2})':/g)].map(match => match[1]);
const validSpecific = new Set(subtopics);
const validMain = new Set(subtopics.map(code => code.slice(0, 3)));
const cardIds = new Set(cards.map(card => card.id));
const questionIds = new Set(questions.map(question => question.id));
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const duplicates = values => values.filter((value, index) => values.indexOf(value) !== index);

check(!duplicates(cards.map(card => card.id)).length, 'Duplicate sentence IDs');
check(!duplicates(questions.map(question => question.id)).length, 'Duplicate question IDs');
check(!duplicates(recommendations.map(group => group.question_id)).length, 'Duplicate recommendation groups');
check(recommendations.length === questions.length, 'Every question must have one recommendation group');
check(!questions.some(question => /^page \d+ of \d+$/i.test(question.prompt_text)), 'Page markers must not be questions');
check(!questions.some(question => /Page \d+ of \d+|APEUni PTE Priority Materials|Practice PTE with AI scoring/i.test(question.prompt_text)), 'PDF headers leaked into questions');
check(!questions.some(question => /\b(?:and|or|the|foreign)$/i.test(question.prompt_text)), 'Likely truncated question text');
check(cards.length === 210, 'Unexpected sentence-card count');
check(questions.length === 396, 'Unexpected PTE-question count');

for (const card of cards) {
  check(typeof card.text === 'string' && card.text.trim().length > 20, `Incomplete sentence: ${card.id}`);
  check(/[.!?]$/.test(card.text.trim()), `Sentence lacks ending punctuation: ${card.id}`);
  check(['P1', 'P2', 'P3'].includes(card.memorisation_priority), `Invalid priority: ${card.id}`);
  check(card.topic_links.every(code => validSpecific.has(code) || validMain.has(code)), `Invalid sentence topic: ${card.id}`);
}

const recommendationByQuestion = new Map(recommendations.map(group => [group.question_id, group]));
const resultSets = new Map(subtopics.map(code => [code, new Set()]));
for (const card of cards) for (const code of card.topic_links) if (resultSets.has(code)) resultSets.get(code).add(card.id);

for (const question of questions) {
  const questionTopics = [question.primary_topic, ...(question.secondary_topics || [])];
  check(questionTopics.every(code => validSpecific.has(code)), `Invalid question topic: ${question.id}`);
  const group = recommendationByQuestion.get(question.id);
  check(Boolean(group), `Missing recommendations: ${question.id}`);
  if (!group) continue;
  check(group.recommended_sentence_ids.length > 0, `Empty recommendations: ${question.id}`);
  check(!duplicates(group.recommended_sentence_ids.map(item => item.card_id)).length, `Duplicate recommendation: ${question.id}`);
  for (const item of group.recommended_sentence_ids) {
    check(cardIds.has(item.card_id), `Unknown recommended card: ${question.id}/${item.card_id}`);
    check(item.shared_topics.every(code => questionTopics.includes(code)), `Incorrect shared topic: ${question.id}/${item.card_id}`);
    for (const code of item.shared_topics) resultSets.get(code)?.add(item.card_id);
  }
}

for (const group of recommendations) check(questionIds.has(group.question_id), `Unknown recommendation question: ${group.question_id}`);
for (const [code, ids] of resultSets) check(ids.size > 0, `Empty visible subtopic: ${code}`);

const signatures = new Map();
for (const [code, ids] of resultSets) {
  const signature = [...ids].sort().join('|');
  if (signatures.has(signature)) failures.push(`Identical subtopic results: ${signatures.get(signature)} and ${code}`);
  signatures.set(signature, code);
}

const normalizedTexts = cards.map(card => card.text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim());
check(!duplicates(normalizedTexts).length, 'Duplicate sentence text');
const referencedIds = [...app.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
for (const id of referencedIds) check(html.includes(`id="${id}"`), `Missing HTML control: ${id}`);

const summary = {
  cards: cards.length,
  questions: questions.length,
  recommendation_groups: recommendations.length,
  subtopics: subtopics.length,
  nonempty_subtopics: [...resultSets.values()].filter(set => set.size).length,
  failures,
};
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exit(1);
