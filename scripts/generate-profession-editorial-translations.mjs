import fs from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const sourcePath = new URL('lib/profession-editorial-content.js', ROOT);
const catalogPath = new URL('lib/profession-catalog.js', ROOT);
const outputPath = new URL('lib/profession-editorial-translations.generated.js', ROOT);
const targets = ['en', 'ar', 'am', 'ru'];
const separator = '\n[[[HIROSEP9F3A]]] \n';

async function loadHebrewContent() {
  let source = await fs.readFile(sourcePath, 'utf8');
  source = source.replace(/export const /g, 'const ').replace(/export function /g, 'function ');
  const catalogSource = await fs.readFile(catalogPath, 'utf8');
  const slugs = [...catalogSource.matchAll(/slug: '([^']+)'/g)].map((match) => match[1]);
  source += `\nresult = Object.fromEntries(${JSON.stringify(slugs)}.map((slug) => [slug, getHebrewProfessionEditorial(slug)]));`;
  const context = {};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.result;
}

function makeBatches(strings, maxCharacters = 3200) {
  const batches = [];
  let current = [];
  let length = 0;
  for (const value of strings) {
    const nextLength = length + value.length + separator.length;
    if (current.length && nextLength > maxCharacters) {
      batches.push(current);
      current = [];
      length = 0;
    }
    current.push(value);
    length += value.length + separator.length;
  }
  if (current.length) batches.push(current);
  return batches;
}

async function requestTranslation(text, target, source = 'he', attempt = 0) {
  const body = new URLSearchParams({ client: 'gtx', sl: source, tl: target, dt: 't', q: text });
  const response = await fetch('https://translate.googleapis.com/translate_a/single', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body,
  });
  if (response.status === 429 && attempt < 5) {
    await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
    return requestTranslation(text, target, source, attempt + 1);
  }
  if (!response.ok) throw new Error(`Translation request failed (${response.status})`);
  const payload = await response.json();
  return (payload[0] || []).map((part) => part[0] || '').join('');
}

async function translateBatch(batch, target, source = 'he') {
  const translated = await requestTranslation(batch.join(separator), target, source);
  const parts = translated.split(/\n?\[\[\[HIROSEP9F3A\]\]\]\s*\n?/);
  if (parts.length === batch.length) return parts.map((part) => part.trim());
  return Promise.all(batch.map((value) => requestTranslation(value, target, source)));
}

function correctEnglishTerminology(value) {
  return value
    .replace(/depreciation circuit breaker/gi, 'residual-current device (RCD)')
    .replace(/depreciation switch/gi, 'residual-current device (RCD)')
    .replace(/lift the charger/gi, 'reset the RCD')
    .replace(/lift the depreciation/gi, 'reset the RCD')
    .replace(/the fuse jumps/gi, 'the RCD trips')
    .replace(/the depreciation jumps/gi, 'the RCD trips')
    .replace(/bypass the depreciation/gi, 'bypass the RCD')
    .replace(/ignore the depreciation/gi, 'bypass the RCD');
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

const hebrew = await loadHebrewContent();
const uniqueStrings = [...new Set(Object.values(hebrew).flatMap(({ services, questions }) => [
  ...services,
  ...questions.flat(),
]))];
const localized = {};
const englishBatches = await mapWithConcurrency(makeBatches(uniqueStrings), 1, (batch) => translateBatch(batch, 'en'));
const englishDictionary = new Map(uniqueStrings.map((value, index) => [
  value,
  correctEnglishTerminology(englishBatches.flat()[index]),
]));

function buildLocale(dictionary) {
  return Object.fromEntries(Object.entries(hebrew).map(([slug, content]) => [slug, {
    services: content.services.map((value) => dictionary.get(value)),
    questions: content.questions.map(([question, answer]) => [dictionary.get(question), dictionary.get(answer)]),
  }]));
}

localized.en = buildLocale(englishDictionary);
process.stdout.write(`Translated en: ${Object.keys(localized.en).length} professions\n`);

const uniqueEnglish = uniqueStrings.map((value) => englishDictionary.get(value));
for (const target of targets.filter((locale) => locale !== 'en')) {
  const translatedBatches = await mapWithConcurrency(makeBatches(uniqueEnglish), 1, (batch) => translateBatch(batch, target, 'en'));
  const targetDictionary = new Map(uniqueStrings.map((value, index) => [value, translatedBatches.flat()[index]]));
  localized[target] = buildLocale(targetDictionary);
  process.stdout.write(`Translated ${target}: ${Object.keys(localized[target]).length} professions\n`);
}

const output = `// Generated from profession-editorial-content.js. Run the translation generator after Hebrew editorial changes.\nexport const PROFESSION_EDITORIAL_TRANSLATIONS = ${JSON.stringify(localized, null, 2)};\n`;
await fs.writeFile(outputPath, output);
process.stdout.write(`Wrote ${outputPath.pathname}\n`);
