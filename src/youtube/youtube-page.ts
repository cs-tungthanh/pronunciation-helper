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
 * The id of the video open now (the v= in the address), or null off a watch page
 */
export function getWatchVideoId(): string | null {
  return isWatchPage() ? new URLSearchParams(window.location.search).get('v') : null;
}

/**
 * The watch page's video element, or null before the player has loaded
 */
export function getWatchVideo(): HTMLVideoElement | null {
  return document.querySelector<HTMLVideoElement>('#movie_player video');
}

/**
 * Whether an ad is playing in the player instead of the video
 */
export function isAdShowing(): boolean {
  return Boolean(document.querySelector('#movie_player.ad-showing'));
}

/**
 * The player's CC button, when this video has captions to turn on
 */
export function getCaptionsButton(): HTMLElement | null {
  const button = document.querySelector<HTMLElement>('#movie_player .ytp-subtitles-button');
  if (!button || button.getAttribute('aria-disabled') === 'true') return null;
  // The player hides the button for videos without captions
  return getComputedStyle(button).display === 'none' ? null : button;
}

/**
 * Whether the player's captions (CC) are on
 */
export function isCaptionsOn(): boolean {
  return getCaptionsButton()?.getAttribute('aria-pressed') === 'true';
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
