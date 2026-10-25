/**
 * Google Translate text-to-speech URLs (the undocumented endpoint behind translate.google.com's speaker)
 */

import {
  GOOGLE_TTS_URL,
  GOOGLE_TTS_CLIENT,
  GOOGLE_TTS_MAX_CHARS,
  GOOGLE_TTS_SLOW_SPEED,
  TTS_LANG
} from '../constants/app-constants';

// Preferred places to split long text: sentence ends, then clause punctuation, then any space
const CHUNK_BOUNDARIES = [/[.!?…]["'”’)\]]*\s+/g, /[,;:]\s*/g, /\s+/g];

/**
 * Build one MP3 URL per chunk; the endpoint rejects text over GOOGLE_TTS_MAX_CHARS
 */
export function buildGoogleTtsUrls(text: string, slow: boolean): string[] {
  return splitIntoChunks(text.trim(), GOOGLE_TTS_MAX_CHARS).map(chunk => {
    const url = new URL(GOOGLE_TTS_URL);
    url.searchParams.set('ie', 'UTF-8');
    url.searchParams.set('client', GOOGLE_TTS_CLIENT);
    url.searchParams.set('tl', TTS_LANG);
    url.searchParams.set('q', chunk);
    if (slow) url.searchParams.set('ttsspeed', GOOGLE_TTS_SLOW_SPEED);
    return url.toString();
  });
}

/**
 * Split text into chunks of at most `limit` characters at the most natural boundary available
 */
function splitIntoChunks(text: string, limit: number): string[] {
  const chunks: string[] = [];
  let rest = text;

  while (rest.length > limit) {
    const cut = findCut(rest, limit);
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);

  return chunks.filter(Boolean);
}

/**
 * Index of the last boundary within `limit`, trying the strongest boundary kind first
 */
function findCut(text: string, limit: number): number {
  for (const boundary of CHUNK_BOUNDARIES) {
    let cut = 0;
    for (const match of text.matchAll(boundary)) {
      const end = (match.index ?? 0) + match[0].length;
      if (end > limit) break;
      cut = end;
    }
    if (cut > 0) return cut;
  }

  // No boundary in range (one very long word): hard cut
  return limit;
}
