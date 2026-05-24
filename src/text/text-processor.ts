/**
 * Text processing utilities for word extraction and contraction expansion
 */

import { CONTRACTIONS } from '../constants/contractions';

/**
 * Check if text is a single valid word (only letters, hyphens, and apostrophes)
 */
export function isValidSingleWord(text: string): boolean {
  return /^[a-zA-Z'-]+$/.test(text);
}

/**
 * Expand contractions in text for better IPA lookup
 * @example "don't" → "do not"
 */
export function expandContractions(text: string): string {
  let expanded = text;

  Object.keys(CONTRACTIONS).forEach(contraction => {
    const expansion = CONTRACTIONS[contraction];
    const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
    expanded = expanded.replace(regex, expansion);
  });

  return expanded;
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
