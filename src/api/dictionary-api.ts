/**
 * Dictionary API client for fetching IPA phonetic transcriptions
 */

import { DICTIONARY_API_BASE_URL } from '../constants/app-constants';

export interface IpaResult {
  word: string;
  ipa: string | null;
}

/**
 * Fetch IPA phonetic transcription for a single word
 */
export async function fetchIPA(word: string): Promise<string | null> {
  try {
    const response = await fetch(`${DICTIONARY_API_BASE_URL}/${encodeURIComponent(word.toLowerCase())}`);
    if (!response.ok) return null;

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
  } catch (error) {
    console.error('[Dictionary API] Failed to fetch IPA:', error);
    return null;
  }
}

/**
 * Fetch IPA for multiple words in parallel
 * Automatically deduplicates words (case-insensitive)
 */
export async function fetchIPABatch(words: string[]): Promise<IpaResult[]> {
  // Deduplicate words while preserving first occurrence case
  const uniqueWords = new Map<string, string>();
  words.forEach(word => {
    const lowerWord = word.toLowerCase();
    if (!uniqueWords.has(lowerWord)) {
      uniqueWords.set(lowerWord, word);
    }
  });

  // Fetch IPA in parallel
  const ipaPromises = Array.from(uniqueWords.entries()).map(async ([lowerWord, displayWord]) => ({
    word: displayWord,
    ipa: await fetchIPA(lowerWord)
  }));

  return Promise.all(ipaPromises);
}
