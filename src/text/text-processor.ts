/**
 * Text processing utilities for word extraction and contraction expansion
 */

import { CONTRACTIONS } from '../constants/contractions';

// Every contraction in one pass; keys are plain letters and apostrophes, so they need no escaping
const CONTRACTION_PATTERN = new RegExp(`\\b(?:${Object.keys(CONTRACTIONS).join('|')})\\b`, 'gi');

/**
 * Check if text is a single valid word (only letters, hyphens, and apostrophes)
 */
export function isValidSingleWord(text: string): boolean {
  return /^[a-zA-Z'-]+$/.test(text);
}

// Letters only Vietnamese uses: ă, đ, ơ, ư, and vowels with a dot below or a hook above
const VIETNAMESE_ONLY_LETTER = /[ăĂđĐơƠưƯẠ-ỹ]/;
// Accented vowels Vietnamese shares with other languages ("café"), so one alone isn't enough
const ACCENTED_VOWEL = /[àáâãèéêìíòóôõùúýÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚÝ]/;

/**
 * Whether text is Vietnamese: it has a letter only Vietnamese uses, or accents on at least a third
 * of its words (an English sentence that mentions a café has far fewer)
 */
export function isVietnamese(text: string): boolean {
  // Pages may hold accents as separate combining marks
  const normalized = text.normalize('NFC');
  if (VIETNAMESE_ONLY_LETTER.test(normalized)) return true;

  const words = normalized.split(/\s+/).filter(Boolean);
  const accented = words.filter(word => ACCENTED_VOWEL.test(word)).length;
  return words.length > 0 && accented * 3 >= words.length;
}

/**
 * Expand contractions in text for better IPA lookup
 * @example "don't" → "do not"
 */
export function expandContractions(text: string): string {
  return text.replace(CONTRACTION_PATTERN, match => CONTRACTIONS[match.toLowerCase()]);
}

/**
 * Extract words from text, removing punctuation and expanding contractions
 * @returns Array of cleaned words
 */
export function extractWords(text: string): string[] {
  const expandedText = expandContractions(text);

  return expandedText
    .split(/\s+/)
    .map(word => word.replace(/[^a-zA-Z'-]/g, ''))
    .filter(word => word.length > 0);
}
