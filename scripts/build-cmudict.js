#!/usr/bin/env node

/**
 * Build the bundled pronunciation dictionary from the CMU Pronouncing Dictionary.
 *
 * Downloads cmudict.dict at a pinned commit, converts each word's ARPAbet to IPA in the
 * style of learner dictionaries (American English), and writes:
 *   src/data/cmudict-ipa.txt   one "word<TAB>ipa" line per word, first pronunciation only
 *   src/data/CMUDICT-LICENSE   the dictionary's license, which must ship with it
 *
 * Usage: node scripts/build-cmudict.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Bump to update the dictionary: https://github.com/cmusphinx/cmudict/commits/master
const CMUDICT_COMMIT = '74790861f652b15e4ac49015a90074ad62a27690';
const SOURCE_URL = `https://raw.githubusercontent.com/cmusphinx/cmudict/${CMUDICT_COMMIT}`;

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'src', 'data');

// Vowels: [unstressed, stressed]; reduced vowels and length marks follow learner dictionaries
const VOWELS = {
  AA: ['ɑː', 'ɑː'],
  AE: ['æ', 'æ'],
  AH: ['ə', 'ʌ'],
  AO: ['ɔː', 'ɔː'],
  AW: ['aʊ', 'aʊ'],
  AY: ['aɪ', 'aɪ'],
  EH: ['e', 'e'],
  ER: ['ɚ', 'ɝː'],
  EY: ['eɪ', 'eɪ'],
  IH: ['ɪ', 'ɪ'],
  IY: ['i', 'iː'],
  OW: ['oʊ', 'oʊ'],
  OY: ['ɔɪ', 'ɔɪ'],
  UH: ['ʊ', 'ʊ'],
  UW: ['u', 'uː'],
};

const CONSONANTS = {
  B: 'b', CH: 'tʃ', D: 'd', DH: 'ð', F: 'f', G: 'ɡ', HH: 'h', JH: 'dʒ', K: 'k', L: 'l',
  M: 'm', N: 'n', NG: 'ŋ', P: 'p', R: 'r', S: 's', SH: 'ʃ', T: 't', TH: 'θ', V: 'v',
  W: 'w', Y: 'j', Z: 'z', ZH: 'ʒ',
};

// Consonant clusters that can start an English syllable; a stress mark goes before the longest one
const ONSETS = new Set([
  ...Object.keys(CONSONANTS).filter((c) => c !== 'NG'),
  'P L', 'P R', 'P Y', 'B L', 'B R', 'B Y', 'T R', 'T W', 'T Y', 'D R', 'D W', 'D Y',
  'K L', 'K R', 'K W', 'K Y', 'G L', 'G R', 'G W', 'G Y', 'F L', 'F R', 'F Y', 'V Y',
  'TH R', 'TH W', 'SH R', 'HH Y', 'HH W', 'M Y', 'N Y', 'L Y',
  'S L', 'S M', 'S N', 'S P', 'S T', 'S K', 'S W', 'S F',
  'S P L', 'S P R', 'S P Y', 'S T R', 'S T Y', 'S K L', 'S K R', 'S K W', 'S K Y',
]);

/**
 * Convert one ARPAbet pronunciation ("B UH1 K T") to IPA ("bʊkt")
 */
function toIpa(arpabet) {
  const phones = arpabet.split(' ').map((phone) => {
    const match = phone.match(/^([A-Z]+)([012])?$/);
    if (!match) throw new Error(`Unknown phone: ${phone}`);
    const [, base, stress] = match;
    return { base, stress: stress === undefined ? null : Number(stress) };
  });

  const ipa = phones.map(({ base, stress }) => {
    if (stress !== null) return VOWELS[base][stress === 0 ? 0 : 1];
    if (!(base in CONSONANTS)) throw new Error(`Unknown phone: ${base}`);
    return CONSONANTS[base];
  });

  // Mark stress only in words of more than one syllable, as dictionaries do
  const nuclei = phones.flatMap((phone, i) => (phone.stress !== null ? [i] : []));
  if (nuclei.length < 2) return ipa.join('');

  const marks = new Map();
  nuclei.forEach((nucleus, n) => {
    const { stress } = phones[nucleus];
    if (stress === 0) return;

    // The syllable starts after the previous vowel, at the longest consonant cluster that can begin one
    let start = n === 0 ? 0 : nuclei[n - 1] + 1;
    if (n > 0) {
      while (start < nucleus && !ONSETS.has(phones.slice(start, nucleus).map((p) => p.base).join(' '))) {
        start++;
      }
    }
    marks.set(start, stress === 1 ? 'ˈ' : 'ˌ');
  });

  return ipa.map((symbol, i) => (marks.get(i) ?? '') + symbol).join('');
}

async function download(file) {
  const response = await fetch(`${SOURCE_URL}/${file}`);
  if (!response.ok) throw new Error(`Downloading ${file} failed: HTTP ${response.status}`);
  return response.text();
}

const [dict, license] = await Promise.all([download('cmudict.dict'), download('LICENSE')]);

const lines = [];
for (const line of dict.split('\n')) {
  // "word PHONES # comment"; alternate pronunciations are "word(2) ..."
  const [entry] = line.split(' #');
  const match = entry.trim().match(/^([a-z'][a-z'.-]*) (.+)$/);
  if (!match) continue;
  const [, word, arpabet] = match;
  lines.push(`${word}\t${toIpa(arpabet)}`);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'cmudict-ipa.txt'), lines.join('\n') + '\n');
fs.writeFileSync(
  path.join(OUT_DIR, 'CMUDICT-LICENSE'),
  `CMU Pronouncing Dictionary, commit ${CMUDICT_COMMIT}\n` +
    'https://github.com/cmusphinx/cmudict\n' +
    'Converted to IPA by scripts/build-cmudict.js\n\n' +
    license,
);

console.log(`Wrote ${lines.length} words to src/data/cmudict-ipa.txt`);
