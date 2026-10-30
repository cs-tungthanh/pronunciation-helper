/**
 * Turn YouTube's caption data into timed sentences
 *
 * Caption lines are cut wherever the screen runs out of room, not at sentence ends, so the
 * lines' words are joined and split again at sentence punctuation and at pauses, and at the next
 * line once a sentence runs long. Captions with hardly any punctuation are split at every line.
 */

import { CAPTION_SENTENCE_GAP_MS, CAPTION_SENTENCE_MAX_MS } from '../constants/app-constants';

/** A word and when it's spoken, in milliseconds from the start of the video */
export interface CaptionWordTiming {
  startMs: number;
  endMs: number;
  text: string;
}

/** A sentence and when it's spoken, in milliseconds from the start of the video */
export interface CaptionSentence {
  startMs: number;
  endMs: number;
  text: string;
  words: CaptionWordTiming[];
}

/** The parts of YouTube's json3 caption format that are read here */
export interface Json3Captions {
  events?: Array<{
    tStartMs?: number;
    dDurationMs?: number;
    segs?: Array<{ utf8?: string; tOffsetMs?: number }>;
  }>;
}

interface TimedWord extends CaptionWordTiming {
  // First word of a caption line
  startsLine: boolean;
}

// Captions with fewer sentence ends than one per this many words count as unpunctuated
const UNPUNCTUATED_WORDS_PER_END = 25;

// A word ending a sentence: . ? ! optionally followed by closing quotes or brackets. A trailing
// "..." or "…" is left out: in captions it mostly marks a pause inside a sentence.
const SENTENCE_END = /(?<![.…])[.?!]["'”’)\]]*$/;

/**
 * The words of the captions, each with when it's spoken. Auto-generated captions time each
 * word; manual ones only time each line, so a line's words are spread across its duration.
 */
function getTimedWords(captions: Json3Captions): TimedWord[] {
  const words: TimedWord[] = [];

  for (const event of captions.events ?? []) {
    if (!event.segs || event.tStartMs === undefined) continue;
    const eventStart = event.tStartMs;
    const eventEnd = eventStart + (event.dDurationMs ?? 0);
    let startsLine = true;

    event.segs.forEach((seg, index) => {
      const segWords = (seg.utf8 ?? '').split(/\s+/).filter(Boolean);
      if (segWords.length === 0) return;

      const segStart = eventStart + (seg.tOffsetMs ?? 0);
      const nextOffset = event.segs![index + 1]?.tOffsetMs;
      const segEnd = Math.max(segStart, nextOffset !== undefined ? eventStart + nextOffset : eventEnd);
      const step = (segEnd - segStart) / segWords.length;

      segWords.forEach((text, i) => {
        words.push({ startMs: segStart + i * step, endMs: segStart + (i + 1) * step, text, startsLine });
        startsLine = false;
      });
    });
  }

  return words.sort((a, b) => a.startMs - b.startMs);
}

/**
 * Split captions into sentences, in the order they're spoken
 */
export function parseCaptionSentences(captions: Json3Captions): CaptionSentence[] {
  const words = getTimedWords(captions);
  const endCount = words.filter(word => SENTENCE_END.test(word.text)).length;
  const punctuated = endCount * UNPUNCTUATED_WORDS_PER_END >= words.length;

  const sentences: CaptionSentence[] = [];
  let current: TimedWord[] = [];

  const finish = () => {
    if (current.length > 0) {
      sentences.push({
        startMs: current[0].startMs,
        endMs: current[current.length - 1].endMs,
        text: current.map(word => word.text).join(' '),
        words: current.map(({ startMs, endMs, text }) => ({ startMs, endMs, text }))
      });
    }
    current = [];
  };

  for (const word of words) {
    const previous = current[current.length - 1];
    if (previous) {
      const paused = word.startMs - previous.endMs > CAPTION_SENTENCE_GAP_MS;
      const tooLong = word.startMs - current[0].startMs > CAPTION_SENTENCE_MAX_MS;
      if (paused || (word.startsLine && (tooLong || !punctuated))) finish();
    }

    current.push(word);
    if (SENTENCE_END.test(word.text)) finish();
  }
  finish();

  return sentences;
}
