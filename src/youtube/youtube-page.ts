/**
 * What YouTube features need to know about the page they run on
 */

import { normalizeHostname } from '../shared/utils';

const YOUTUBE_HOSTNAME = 'youtube.com';
const WATCH_PATH = '/watch';

/**
 * Whether this page is on youtube.com (YouTube navigates within the page, so this can hold
 * while the path changes from the home page to a video and back)
 */
export function isYouTubeSite(): boolean {
  return normalizeHostname(window.location.hostname) === YOUTUBE_HOSTNAME;
}

/**
 * Whether a video is open right now; checked on each use since YouTube changes the path in place
 */
export function isWatchPage(): boolean {
  return isYouTubeSite() && window.location.pathname === WATCH_PATH;
}

/**
 * The watch page's video element, or null before the player has loaded
 */
export function getWatchVideo(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>('#movie_player video');
}

/**
 * Whether a key event goes to something the user types in: search, comments, the chat or any field
 */
export function isTypingEvent(event: KeyboardEvent): boolean {
  if (event.isComposing) return true;

  // composedPath reaches into shadow roots, where event.target would stop at the host
  const target = event.composedPath()[0];
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.matches('input, textarea, select');
}
