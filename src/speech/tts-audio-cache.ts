/**
 * Google TTS audio kept for a while, so playing a word again doesn't download it again (Google sends
 * it as no-store). Kept in session storage: it outlives the background worker's idle shutdowns and
 * the offscreen document's, and is cleared when the browser closes.
 */

import { TTS_AUDIO_CACHE_TTL_MS, TTS_AUDIO_CACHE_SIZE } from '../constants/app-constants';

const KEY_PREFIX = 'tts-audio:';
// When each cached entry was saved, by key, so saving doesn't have to read every stored audio
const INDEX_KEY = 'tts-audio-index';

interface CachedAudio {
  dataUrl: string;
  savedAt: number;
}

// Downloads in flight, shared by requests for the same URL (a press of play and a quick replay)
const inFlight = new Map<string, Promise<string>>();
// Saves run one at a time, since each reads the index and writes it back
let saving: Promise<void> = Promise.resolve();

/**
 * The MP3 at a Google TTS URL as a data URL, from the cache while it is fresh
 */
export function getTtsAudio(url: string): Promise<string> {
  let pending = inFlight.get(url);
  if (!pending) {
    pending = loadTtsAudio(url).finally(() => inFlight.delete(url));
    inFlight.set(url, pending);
  }
  return pending;
}

/**
 * The cached MP3 for a Google TTS URL, or null when it isn't cached (or is still downloading)
 */
export async function getCachedTtsAudio(url: string): Promise<string | null> {
  const key = KEY_PREFIX + url;
  const { [key]: cached } = await chrome.storage.session.get(key);
  return isFresh(cached, Date.now()) ? (cached as CachedAudio).dataUrl : null;
}

async function loadTtsAudio(url: string): Promise<string> {
  const cached = await getCachedTtsAudio(url);
  if (cached) return cached;

  const dataUrl = await downloadAudio(url);
  // Playing doesn't depend on the cache, so a failed save (e.g. storage full) is ignored
  await saveAudio(KEY_PREFIX + url, dataUrl).catch(() => {});
  return dataUrl;
}

function isFresh(entry: unknown, now: number): boolean {
  return typeof (entry as CachedAudio | undefined)?.savedAt === 'number' &&
    now - (entry as CachedAudio).savedAt < TTS_AUDIO_CACHE_TTL_MS;
}

async function downloadAudio(url: string): Promise<string> {
  const response = await fetch(url, { credentials: 'omit' });
  if (!response.ok) throw new Error(`Google TTS HTTP ${response.status}`);

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0) throw new Error('Google TTS returned no audio');

  // In slices: spreading a large array into fromCharCode overflows the stack
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return `data:audio/mpeg;base64,${btoa(binary)}`;
}

/**
 * Save audio, first dropping expired entries and the oldest ones beyond the size limit. When session
 * storage is full anyway (long text is large audio), drop the older half of the rest and try again
 */
function saveAudio(key: string, dataUrl: string): Promise<void> {
  const save = saving.then(() => writeAudio(key, dataUrl));
  saving = save.catch(() => {});
  return save;
}

async function writeAudio(key: string, dataUrl: string): Promise<void> {
  const now = Date.now();
  const { [INDEX_KEY]: stored } = await chrome.storage.session.get(INDEX_KEY);
  const index: Record<string, number> = stored ?? {};

  // Newest first
  const keys = Object.keys(index)
    .filter(storedKey => storedKey !== key)
    .sort((a, b) => index[b] - index[a]);
  const kept = keys.filter(
    (storedKey, i) => i < TTS_AUDIO_CACHE_SIZE - 1 && now - index[storedKey] < TTS_AUDIO_CACHE_TTL_MS
  );
  const stale = keys.filter(storedKey => !kept.includes(storedKey));
  if (stale.length > 0) await chrome.storage.session.remove(stale);

  for (;;) {
    const nextIndex = Object.fromEntries([...kept.map(storedKey => [storedKey, index[storedKey]]), [key, now]]);
    try {
      await chrome.storage.session.set({
        [key]: { dataUrl, savedAt: now } satisfies CachedAudio,
        [INDEX_KEY]: nextIndex
      });
      return;
    } catch (error) {
      // Nothing left to drop: this audio alone doesn't fit
      if (kept.length === 0) throw error;
      await chrome.storage.session.remove(kept.splice(Math.floor(kept.length / 2)));
    }
  }
}
