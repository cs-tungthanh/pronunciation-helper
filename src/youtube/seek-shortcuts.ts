/**
 * Shortcuts that skip the YouTube video back or forward by the chosen number of seconds
 */

import { cachedSetting } from '../shared/settings-cache';
import { getYouTubeSeekSeconds } from '../shared/utils';
import { YOUTUBE_SEEK_KEYS } from '../constants/app-constants';
import { getWatchVideo, isTypingEvent, isWatchPage } from './youtube-page';
import type { YouTubeFeature } from './youtube-features';

const readSeekSeconds = cachedSetting('youtubeSeekSeconds', getYouTubeSeekSeconds);

/**
 * Which way a key event skips: -1 back, 1 forward, 0 when it isn't a seek shortcut
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
 * Move the video by some seconds, staying between its start and its end
 */
export function seekBy(video: HTMLVideoElement, seconds: number): void {
  // A live stream's duration is Infinity; the browser keeps it within what can be played
  const end = Number.isFinite(video.duration) ? video.duration : Infinity;
  video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), end);
}

function handleKeydown(event: KeyboardEvent): void {
  // After the extension reloads, this script is orphaned while a fresh copy runs; step aside
  // before stopping the event, which would keep it from the fresh copy's listener
  if (!chrome.runtime?.id) {
    seekShortcuts.stop();
    return;
  }

  const direction = getSeekDirection(event);
  if (direction === 0 || !isWatchPage() || isTypingEvent(event)) return;

  const video = getWatchVideo();
  if (!video) return;

  // Handled here, so YouTube's own key handling doesn't also act on it
  event.preventDefault();
  event.stopImmediatePropagation();

  // Read on each press, so a changed setting applies without reloading the page
  readSeekSeconds().then(seconds => seekBy(video, direction * seconds));
}

export const seekShortcuts: YouTubeFeature = {
  start() {
    // Capture on window, before YouTube's listeners on the document and the player
    window.addEventListener('keydown', handleKeydown, true);
  },
  stop() {
    window.removeEventListener('keydown', handleKeydown, true);
  }
};
