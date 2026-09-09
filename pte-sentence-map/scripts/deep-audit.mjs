import fs from 'node:fs';

const read = name => JSON.parse(fs.readFileSync(new URL(`../public/data/${name}`, import.meta.url)));
const cards = read('cards.json').cards;
const questions = read('questions.json').questions;
const recommendations = read('recommendations.json').recommendations;
const bank = read('engine-bank.json');
const waves = ['wave1-variants.json', 'wave2-variants.json', 'wave3-variants.json'].map(read);
const variants = waves.flatMap(wave => wave.variants);
const scenarios = { ...waves[0].scenario_packs, ...waves[1].additional_scenario_packs };
const mainTopics = ['EDU','TEC','ENV','HEA','SOC','WOR','GOV','CUL','URB','SCI','XOV'];
const subTopics = ['EDU-01','EDU-02','EDU-03','EDU-04','EDU-05','EDU-06','EDU-07','TEC-01','TEC-02','TEC-03','TEC-04','TEC-05','ENV-01','ENV-02','ENV-03','ENV-04','ENV-05','HEA-01','HEA-02','HEA-03','HEA-04','SOC-01','SOC-02','SOC-03','SOC-04','SOC-05','WOR-01','WOR-02','WOR-03','WOR-04','GOV-01','GOV-02','GOV-03','GOV-04','CUL-01','CUL-02','CUL-03','CUL-04','URB-01','URB-02','URB-03','SCI-01','SCI-02','XOV-01','XOV-02','XOV-03'];
const validTopics = new Set([...mainTopics, ...subTopics]);
const failures = [];
const fail = (name, values) => { if (values.length) failures.push({ name, values }); };
const duplicates = values => values.filter((value, index) => values.indexOf(value) !== index);

const cardIds = cards.map(card => card.id);
const questionIds = questions.map(question => question.id);
const engineIds = bank.engines.map(engine => engine.id);
const variantIds = variants.map(variant => variant.variant_id);
fail('duplicate_card_ids', duplicates(cardIds));
fail('duplicate_question_ids', duplicates(questionIds));
fail('duplicate_engine_ids', duplicates(engineIds));
fail('duplicate_variant_ids', duplicates(variantIds));
fail('invalid_card_topic_links', cards.filter(card => card.topic_links.some(topic => !validTopics.has(topic))).map(card => card.id));
fail('missing_recommendation_card', recommendations.flatMap(group => group.recommended_sentence_ids.filter(item => !cardIds.includes(item.card_id)).map(item => `${group.question_id}:${item.card_id}`)));
fail('missing_recommendation_question', recommendations.filter(group => !questionIds.includes(group.question_id)).map(group => group.question_id));
fail('variant_unknown_engine', variants.filter(variant => !engineIds.includes(variant.engine_id)).map(variant => variant.variant_id));
fail('variant_missing_scenario', variants.flatMap(variant => variant.scenario_packs.filter(id => !scenarios[id]).map(id => `${variant.variant_id}:${id}`)));
fail('scenario_unknown_topic', Object.entries(scenarios).flatMap(([id, scenario]) => scenario.topics.filter(topic => !validTopics.has(topic)).map(topic => `${id}:${topic}`)));
fail('engine_slot_mismatch', bank.engines.flatMap(engine => variants.filter(variant => variant.engine_id === engine.id).flatMap(variant => Object.keys(variant.slots).filter(slot => !engine.slots.includes(slot)).map(slot => `${variant.variant_id}:${slot}`))));
fail('slot_value_not_in_completed_sentence', variants.flatMap(variant => Object.values(variant.slots).filter(value => !variant.completed_sentence.toLowerCase().includes(value.toLowerCase())).map(value => `${variant.variant_id}:${value}`)));
const appSource = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const functionNames = [...appSource.matchAll(/^function\s+(\w+)\s*\(/gm)].map(match => match[1]);
fail('duplicate_app_functions', duplicates(functionNames));

console.log(JSON.stringify({ cards: cards.length, questions: questions.length, recommendations: recommendations.length, engines: bank.engines.length, variants: variants.length, scenario_packs: Object.keys(scenarios).length, failures }, null, 2));
if (failures.length) process.exit(1);
