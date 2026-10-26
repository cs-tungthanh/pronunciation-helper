/**
 * IPA lookup (runs in the background service worker): the bundled dictionary first,
 * then the online dictionary API for words it can't pronounce
 */

import { DICTIONARY_API_BASE_URL, IPA_CACHE_SIZE } from '../constants/app-constants';
import { PromiseCache } from '../shared/promise-cache';
import { lookupBundledIpa } from './cmudict';
import { extractWords } from '../text/text-processor';

const ipaCache = new PromiseCache<string | null>(IPA_CACHE_SIZE);

/**
 * Fetch IPA phonetic transcription for a single word
 * @returns null when the dictionary has no IPA for the word
 * @throws Error on network or server failure, so the miss is not cached
 */
async function fetchIPA(word: string): Promise<string | null> {
  const response = await fetch(`${DICTIONARY_API_BASE_URL}/${encodeURIComponent(word)}`, { credentials: 'omit' });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Dictionary HTTP ${response.status}`);

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const entry = data[0];

  // Try phonetic at root level first
  if (entry.phonetic) return entry.phonetic;

  // Try phonetics array
  if (entry.phonetics && Array.isArray(entry.phonetics)) {
    for (const phonetic of entry.phonetics) {
      if (phonetic.text) return phonetic.text;
    }
  }

  return null;
}

/**
 * IPA for one word; failures read as "no IPA"
 */
async function getIPA(word: string): Promise<string | null> {
  const key = word.toLowerCase();

  try {
    const bundled = await lookupBundledIpa(key);
    if (bundled) return bundled;
  } catch (error) {
    console.error('[Dictionary] Failed to load the bundled dictionary:', error);
  }

  try {
    return await ipaCache.get(key, () => fetchIPA(key));
  } catch (error) {
    console.error('[Dictionary API] Failed to fetch IPA:', error);
    return null;
  }
}

/**
 * Look up IPA for one word as shown in the text; contractions are expanded ("it's" → "it is")
 */
export async function lookupWordIpa(word: string): Promise<string | null> {
  const parts = extractWords(word.replace(/’/g, "'"));
  const ipas = await Promise.all(parts.map(getIPA));
  if (ipas.every(ipa => !ipa)) return null;

  // Keep the parts aligned so a missing piece is visible rather than silently dropped
  return ipas.map((ipa, i) => ipa || parts[i]).join(' ');
}
