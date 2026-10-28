/**
 * The captions of the video being watched, as timed sentences
 *
 * YouTube only answers caption requests that carry a token its player makes, so Sayly can't ask
 * for captions itself. Instead it notes the caption requests the player makes when captions are
 * turned on, and fetches the same address again (it's the same origin, so the page's cookies go too).
 */

import { PromiseCache } from '../shared/promise-cache';
import { LOG_PREFIX } from '../constants/messages';
import { CAPTION_CACHE_SIZE } from '../constants/app-constants';
import { CaptionSentence, Json3Captions, parseCaptionSentences } from './caption-sentences';
import { getWatchVideoId } from './youtube-page';
import type { YouTubeFeature } from './youtube-features';

const TIMEDTEXT_PATH = '/api/timedtext';

// The latest caption address per video; a later one wins, so switching caption language follows along
const captionUrls = new Map<string, string>();
const sentenceCache = new PromiseCache<CaptionSentence[]>(CAPTION_CACHE_SIZE);
let observer: PerformanceObserver | null = null;

/**
 * Remember a caption request's address under its video (ads have captions too, under their own video)
 */
function noteRequest(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  if (parsed.pathname !== TIMEDTEXT_PATH) return;

  const videoId = parsed.searchParams.get('v');
  if (!videoId) return;

  // Ask for the format that's parsed here, whatever the player asked for
  parsed.searchParams.set('fmt', 'json3');
  captionUrls.set(videoId, parsed.toString());
}

async function loadSentences(url: string): Promise<CaptionSentence[]> {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error(`Caption request failed: ${response.status}`);
  // An empty answer means YouTube refused the request
  const text = await response.text();
  if (!text) throw new Error('Caption request returned nothing');
  return parseCaptionSentences(JSON.parse(text) as Json3Captions);
}

/**
 * Whether the player has fetched captions for the video open now, so sentences can be read
 */
export function hasCurrentCaptions(): boolean {
  const videoId = getWatchVideoId();
  return Boolean(videoId && captionUrls.has(videoId));
}

/**
 * Sentences of the video open now, or null when its captions haven't been shown yet or can't be read
 */
export async function getCurrentSentences(): Promise<CaptionSentence[] | null> {
  const videoId = getWatchVideoId();
  const url = videoId ? captionUrls.get(videoId) : undefined;
  if (!url) return null;

  try {
    const sentences = await sentenceCache.get(url, () => loadSentences(url));
    return sentences.length > 0 ? sentences : null;
  } catch (error) {
    console.debug(`${LOG_PREFIX} Couldn't read captions:`, error);
    return null;
  }
}

export const captionTracker: YouTubeFeature = {
  start() {
    if (observer) return;
    // Observed rather than read from the timeline, which stops recording once its buffer fills
    observer = new PerformanceObserver(list => {
      list.getEntries().forEach(entry => noteRequest(entry.name));
    });
    // buffered: also report the requests made before Sayly started
    observer.observe({ type: 'resource', buffered: true });
  },
  stop() {
    observer?.disconnect();
    observer = null;
  }
};
