/**
 * Bundled pronunciation dictionary (CMU Pronouncing Dictionary in IPA, built by scripts/build-cmudict.js),
 * with English inflection rules for -ed, -s and -ing forms it doesn't list. Runs in the background worker.
 */

import { CMUDICT_PATH } from '../constants/app-constants';

let dictionary: Promise<string> | null = null;

/**
 * Load the dictionary file once per service worker lifetime. It is searched as it is: building a
 * table of every word would cost far more time and memory each time the worker wakes
 */
function loadDictionary(): Promise<string> {
  dictionary ??= fetch(chrome.runtime.getURL(CMUDICT_PATH))
    .then((response) => {
      if (!response.ok) throw new Error(`Dictionary file HTTP ${response.status}`);
      return response.text();
    })
    .catch((error) => {
      dictionary = null; // Retry on the next lookup
      throw error;
    });
  return dictionary;
}

/**
 * Binary-search the dictionary's "word<tab>IPA" lines, which are sorted by word
 * @returns The word's IPA, or null when it isn't listed
 */
function findIpa(text: string, word: string): string | null {
  // Both always fall on the start of a line (or the end of the text)
  let low = 0;
  let high = text.length;

  while (low < high) {
    const middle = (low + high) >>> 1;
    const start = text.lastIndexOf('\n', middle - 1) + 1;
    const tab = text.indexOf('\t', start);
    const end = text.indexOf('\n', tab);
    if (tab < 0 || end < 0) return null;

    const key = text.slice(start, tab);
    if (key === word) return text.slice(tab + 1, end);
    if (key < word) {
      low = end + 1;
    } else {
      high = start;
    }
  }
  return null;
}

// Sounds that decide how an ending is pronounced (tʃ and dʒ end in ʃ and ʒ)
const VOICELESS = new Set(['p', 't', 'k', 'f', 'θ', 's', 'ʃ']);
const SIBILANTS = new Set(['s', 'z', 'ʃ', 'ʒ']);

/** -ed: /ɪd/ after t or d, /t/ after other voiceless sounds, /d/ otherwise */
function pastEnding(lastSound: string): string {
  if (lastSound === 't' || lastSound === 'd') return 'ɪd';
  return VOICELESS.has(lastSound) ? 't' : 'd';
}

/** -s: /ɪz/ after hissing sounds, /s/ after other voiceless sounds, /z/ otherwise */
function sEnding(lastSound: string): string {
  if (SIBILANTS.has(lastSound)) return 'ɪz';
  return VOICELESS.has(lastSound) ? 's' : 'z';
}

/**
 * Base words for what's left after removing -ed or -ing, most likely first.
 * A stem ending consonant-vowel-consonant ("hop") would have doubled its consonant ("hopped"),
 * so an undoubled form ("hoped") comes from the stem plus e ("hope"); so do stems ending in v,
 * or in c, g or z after a vowel ("loved", "faced", "raged"). A doubled consonant is undone last,
 * since some words end in one ("missed" is miss, "stopped" is stop).
 */
function stemsFor(stem: string): string[] {
  const withE = stem + 'e';
  const eFirst = /[^aeiou][aeiou][^aeiouwxy]$/.test(stem) || /(v|[aeiou][cgz])$/.test(stem);
  const doubled = /([^aeiou])\1$/.test(stem) ? [stem.slice(0, -1)] : [];
  return [...(eFirst ? [withE, stem] : [stem, withE]), ...doubled];
}

/**
 * Candidate base words and the ending to add, most likely first
 */
function inflectionCandidates(word: string): { base: string; ending: (lastSound: string) => string }[] {
  const ing = () => 'ɪŋ';

  if (word.endsWith('ied')) return [{ base: word.slice(0, -3) + 'y', ending: pastEnding }];
  if (word.endsWith('ed')) return stemsFor(word.slice(0, -2)).map((base) => ({ base, ending: pastEnding }));

  if (word.endsWith('ying')) {
    return [word.slice(0, -4) + 'ie', word.slice(0, -3)].map((base) => ({ base, ending: ing }));
  }
  if (word.endsWith('ing')) return stemsFor(word.slice(0, -3)).map((base) => ({ base, ending: ing }));

  if (word.endsWith("'s")) return [{ base: word.slice(0, -2), ending: sEnding }];
  if (word.endsWith('ies')) return [{ base: word.slice(0, -3) + 'y', ending: sEnding }];
  if (word.endsWith('es')) {
    // "ages" is age + s; "watches" is watch + es
    return [word.slice(0, -1), word.slice(0, -2)].map((base) => ({ base, ending: sEnding }));
  }
  if (word.endsWith('s') && !word.endsWith('ss')) return [{ base: word.slice(0, -1), ending: sEnding }];

  return [];
}

/**
 * Pronounce an inflected form from its base word ("booked" → book + /t/)
 */
function inflect(text: string, word: string): string | null {
  for (const { base, ending } of inflectionCandidates(word)) {
    const baseIpa = findIpa(text, base);
    if (!baseIpa) continue;

    const suffix = ending(baseIpa.replace(/ː$/, '').slice(-1));
    // A one-syllable base has no stress mark; an ending that adds a syllable makes it two
    const addsSyllable = /^ɪ/.test(suffix);
    const marked = addsSyllable && !/[ˈˌ]/.test(baseIpa) ? `ˈ${baseIpa}` : baseIpa;
    return marked + suffix;
  }
  return null;
}

/**
 * IPA for one word from the bundled dictionary, or worked out from its base word
 * @returns IPA between slashes, or null when the dictionary can't pronounce the word
 */
export async function lookupBundledIpa(word: string): Promise<string | null> {
  const text = await loadDictionary();
  const key = word.toLowerCase();
  const ipa = findIpa(text, key) ?? inflect(text, key);
  return ipa ? `/${ipa}/` : null;
}
