/**
 * Shortcuts to hear the current sentence of a YouTube video again, or move on to the next one.
 * They use the video's captions; without them, or when set to jump by seconds, they skip back or
 * forward by the chosen number of seconds.
 */

import { cachedSetting, liveSetting } from '../shared/settings-cache';
import { getYouTubeSeekSeconds, getYouTubeShortcutMode, getYouTubeShortcutsEnabled } from '../shared/utils';
import {
  YOUTUBE_SEEK_KEYS,
  YOUTUBE_SHORTCUT_MODES,
  SENTENCE_LEAD_MS,
  SENTENCE_RESTART_WINDOW_MS
} from '../constants/app-constants';
import { getWatchVideo, isAdShowing, isTypingEvent, isWatchPage } from './youtube-page';
import { getCurrentSentences } from './caption-tracker';
import type { CaptionSentence } from './caption-sentences';
import type { YouTubeFeature } from './youtube-features';

const readSeekSeconds = cachedSetting('youtubeSeekSeconds', getYouTubeSeekSeconds);
const readShortcutMode = cachedSetting('youtubeShortcutMode', getYouTubeShortcutMode);
const shortcutsEnabled = liveSetting('youtubeShortcutsEnabled', getYouTubeShortcutsEnabled, true);

// Times within this much count as the same moment (a seek lands near, not on, the time asked for)
const SAME_TIME_MS = 50;

/**
 * Which way a key event goes: -1 back, 1 forward, 0 when it isn't one of these shortcuts
 */
function getSeekDirection(event: KeyboardEvent): -1 | 0 | 1 {
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return 0;
  // Lowercased, so the keys still work with Caps Lock on
  const key = event.key.toLowerCase();
  if (key === YOUTUBE_SEEK_KEYS.BACK) return -1;
  if (key === YOUTUBE_SEEK_KEYS.FORWARD) return 1;
  return 0;
}

/**
 * Move the video to a time in seconds, staying between its start and its end
 */
function seekTo(video: HTMLVideoElement, seconds: number): void {
  // A live stream's duration is Infinity; the browser keeps it within what can be played
  const end = Number.isFinite(video.duration) ? video.duration : Infinity;
  video.currentTime = Math.min(Math.max(seconds, 0), end);
}

/** Where a sentence plays from, in milliseconds */
function playFrom(sentence: CaptionSentence): number {
  return Math.max(sentence.startMs - SENTENCE_LEAD_MS, 0);
}

// The last time back went to a sentence, so pressing it again soon after goes one further back
let lastBack: { sentences: CaptionSentence[]; index: number; at: number } | null = null;

/**
 * The sentence to go to: back to the start of the one being spoken (or the one before, when back
 * was just pressed), or on to the next one
 * @returns null when there's no sentence that way
 */
function findSentence(sentences: CaptionSentence[], nowMs: number, direction: -1 | 1): CaptionSentence | null {
  if (direction === 1) {
    return sentences.find(sentence => playFrom(sentence) > nowMs + SAME_TIME_MS) ?? null;
  }

  // The last sentence that has started
  let index = -1;
  sentences.forEach((sentence, i) => {
    if (playFrom(sentence) <= nowMs + SAME_TIME_MS) index = i;
  });
  if (index < 0) return null;

  const pressedAgain = lastBack?.sentences === sentences && lastBack.index === index
    && performance.now() - lastBack.at < SENTENCE_RESTART_WINDOW_MS;
  if (pressedAgain && index > 0) index--;

  lastBack = { sentences, index, at: performance.now() };
  return sentences[index];
}

async function seek(video: HTMLVideoElement, direction: -1 | 1): Promise<void> {
  // An ad plays in the same video element, on its own timeline
  const bySentence = !isAdShowing() && await readShortcutMode() === YOUTUBE_SHORTCUT_MODES.SENTENCE;
  const sentences = bySentence ? await getCurrentSentences() : null;
  const sentence = sentences && findSentence(sentences, video.currentTime * 1000, direction);

  if (sentence) {
    seekTo(video, playFrom(sentence) / 1000);
    return;
  }

  // Read on each press, so a changed setting applies without reloading the page
  const seconds = await readSeekSeconds();
  seekTo(video, video.currentTime + direction * seconds);
}

function handleKeydown(event: KeyboardEvent): void {
  // After the extension reloads, this script is orphaned while a fresh copy runs; step aside
  // before stopping the event, which would keep it from the fresh copy's listener
  if (!chrome.runtime?.id) {
    sentenceShortcuts.stop();
    return;
  }

  const direction = getSeekDirection(event);
  if (direction === 0 || !shortcutsEnabled() || !isWatchPage() || isTypingEvent(event)) return;

  const video = getWatchVideo();
  if (!video) return;

  // Handled here, so YouTube's own key handling doesn't also act on it
  event.preventDefault();
  event.stopImmediatePropagation();

  seek(video, direction);
}

export const sentenceShortcuts: YouTubeFeature = {
  start() {
    // Capture on window, before YouTube's listeners on the document and the player
    window.addEventListener('keydown', handleKeydown, true);
  },
  stop() {
    window.removeEventListener('keydown', handleKeydown, true);
  }
};
